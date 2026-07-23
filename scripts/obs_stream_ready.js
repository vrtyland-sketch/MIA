"use strict";

/**
 * Jedním příkazem před TikTok live: MIA % připravenosti + OBS verify.
 * Usage:
 *   npm run obs:stream-ready
 *   npm run obs:stream-ready -- --fix
 *   npm run obs:stream-ready -- --fix --wait
 */

const http = require("http");
const { loadLocalEnv, pingHealth, runObsVerifyStreamReady } = require("./obs_verify_stream_ready");

function fetchMiaJson(port, path, timeoutMs = 10000) {
  return new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:${port}${path}`, { timeout: timeoutMs }, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        try {
          resolve({
            ok: res.statusCode === 200,
            status: res.statusCode,
            data: body ? JSON.parse(body) : null
          });
        } catch (_err) {
          resolve({ ok: false, status: res.statusCode, data: null });
        }
      });
    });
    req.on("error", (err) => resolve({ ok: false, error: err.message, data: null }));
    req.on("timeout", () => {
      req.destroy();
      resolve({ ok: false, reason: "timeout", data: null });
    });
  });
}

function summarizeStartup(startup) {
  if (!startup) {
    return {
      online: false,
      readinessPercent: 0,
      streamReady: false,
      streamReadyLabel: "MIA offline",
      summary: null
    };
  }
  return {
    online: startup.online !== false,
    readinessPercent: startup.readinessPercent ?? 0,
    streamReady: startup.streamReady === true,
    streamReadyLabel: startup.streamReadyLabel || "",
    summary: startup.summary || null,
    warnings: startup.warnings || []
  };
}

function summarizeVision(visionPayload) {
  if (!visionPayload?.vision) {
    return {
      enabled: false,
      running: false,
      ok: true,
      label: "vypnuto"
    };
  }
  const v = visionPayload.vision;
  const enabled = v.enabled === true;
  const running = v.running === true;
  const ok = !enabled || running;
  return {
    enabled,
    running,
    ok,
    layoutMode: visionPayload.layoutMode || v.lastMode || "idle",
    platform: v.lastPlatform || "tiktok",
    previewUrl: v.previewUrl || v.lastScreenshot?.publicUrl || "",
    appliedCount: v.appliedCount || 0,
    label: !enabled
      ? "vypnuto"
      : running
        ? `${visionPayload.layoutMode || v.lastMode} · ${v.lastPlatform}`
        : "nezapnuto — restart MIA"
  };
}

function buildHeadline(mia, obsReport, visionSummary) {
  const obsSummary = obsReport?.summary?.browserOverlays || "?/?";
  const bodySummary = obsReport?.summary?.graphicsBody || "";
  const obsState = obsReport?.ok ? "OBS OK" : "OBS chybí";
  const visionState = visionSummary?.enabled
    ? visionSummary.running
      ? `Vision ${visionSummary.layoutMode}`
      : "Vision OFF"
    : "";
  if (!mia.online) {
    const offlineParts = [`MIA offline · ${obsState} · browser ${obsSummary}`];
    if (bodySummary) offlineParts.push(`body ${bodySummary}`);
    return offlineParts.join(" · ");
  }
  const parts = [
    `${mia.readinessPercent}%`,
    mia.streamReadyLabel,
    obsState,
    `browser ${obsSummary}`
  ];
  if (bodySummary) parts.push(`body ${bodySummary}`);
  if (visionState) parts.push(visionState);
  return parts.join(" · ");
}

function formatHumanReport(report) {
  const lines = [
    "",
    "=== MIA GO-LIVE ===",
    report.ok ? "STAV: PŘIPRAVENO" : "STAV: NENÍ PŘIPRAVENO",
    report.headline || "",
    ""
  ];

  if (report.mia) {
    lines.push(`MIA: ${report.mia.readinessPercent}% — ${report.mia.streamReadyLabel}`);
  }

  const obsSummary = report.obs?.summary;
  if (obsSummary) {
    const bodyPart = obsSummary.graphicsBody ? ` · body ${obsSummary.graphicsBody}` : "";
    lines.push(
      `OBS: ${obsSummary.passed}/${obsSummary.passed + obsSummary.failed} kontrol · browser ${obsSummary.browserOverlays}${bodyPart}`
    );
  }

  if (report.vision) {
    lines.push(
      `Vision: ${report.vision.label}${report.vision.previewUrl ? ` · ${report.vision.previewUrl}` : ""}`
    );
  }

  const failed = (report.obs?.checks || []).filter((row) => !row.ok);
  if (failed.length) {
    lines.push("");
    lines.push("Chybí / opravit:");
    for (const row of failed.slice(0, 8)) {
      lines.push(`  • ${row.label}${row.detail ? ` — ${row.detail}` : ""}`);
    }
    if (failed.length > 8) {
      lines.push(`  … +${failed.length - 8} dalších`);
    }
  }

  if ((report.fixes || []).length) {
    lines.push("");
    lines.push("Doporučené příkazy:");
    for (const fix of report.fixes) {
      lines.push(`  ${fix}`);
    }
  }

  if (report.tiktokAudio?.steps?.length) {
    lines.push("");
    lines.push("TikTok audio:");
    for (const step of report.tiktokAudio.steps) {
      lines.push(`  • ${step}`);
    }
  }

  lines.push("");
  return lines.join("\n");
}

async function runObsStreamReady(options = {}) {
  const argv = options.argv || process.argv;
  const fix = options.fix ?? argv.includes("--fix");
  const wait = options.wait ?? argv.includes("--wait");

  loadLocalEnv();
  const port = Number(process.env.PORT || 3000);

  let miaPing = await pingHealth(port);
  let startupPayload = null;
  if (miaPing.ok) {
    const startupRes = await fetchMiaJson(port, "/startup/check");
    if (startupRes.ok && startupRes.data) {
      startupPayload = startupRes.data;
    }
  }

  const mia = summarizeStartup(startupPayload);
  if (!miaPing.ok) {
    mia.online = false;
    mia.streamReady = false;
    mia.streamReadyLabel = "MIA offline — npm run restart";
  }

  let visionPayload = null;
  if (miaPing.ok) {
    const visionRes = await fetchMiaJson(port, "/mia/vision");
    if (visionRes.ok && visionRes.data) {
      visionPayload = visionRes.data;
    }
  }
  const vision = summarizeVision(visionPayload);

  const obsResult = await runObsVerifyStreamReady({ fix, wait, port, env: process.env });
  const obsReport = obsResult.report || { ok: false, reason: obsResult.reason };

  const ok = Boolean(obsReport.ok && mia.streamReady && vision.ok);
  const report = {
    ok,
    headline: buildHeadline(mia, obsReport, vision),
    mia,
    vision,
    obs: obsReport,
    tiktokAudio: obsReport.tiktokAudio,
    fixes: [
      ...new Set([
        ...(obsReport.fixes || []),
        ...(mia.online ? [] : ["npm run restart"]),
        ...(vision.ok ? [] : ["npm run restart", "zkontroluj MIA_OBS_VISION=on"])
      ])
    ],
    finishedAt: new Date().toISOString()
  };

  if (obsResult.fixesApplied) {
    report.fixesApplied = obsResult.fixesApplied;
  }
  if (obsResult.afterFix !== undefined) {
    report.afterFix = obsResult.afterFix;
  }
  if (obsResult.afterFixHint) {
    report.afterFixHint = obsResult.afterFixHint;
  }
  if (obsResult.waitingMs) {
    report.waitingMs = obsResult.waitingMs;
  }

  return { ok, report, exitCode: ok ? 0 : 1 };
}

async function main() {
  const human = process.argv.includes("--human");
  const { ok, report } = await runObsStreamReady();
  if (human) {
    console.log(formatHumanReport(report));
  } else {
    console.log(JSON.stringify(report, null, 2));
  }
  process.exitCode = ok ? 0 : 1;
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err?.message || err);
    process.exitCode = 1;
  });
}

module.exports = {
  runObsStreamReady,
  fetchMiaJson,
  summarizeStartup,
  summarizeVision,
  buildHeadline,
  formatHumanReport
};
