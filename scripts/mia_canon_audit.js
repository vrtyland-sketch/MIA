"use strict";

const fs = require("fs");
const path = require("path");
const http = require("http");
const { spawnSync } = require("child_process");
const OBSWebSocket = require("obs-websocket-js").default;
const { loadCatalog } = require("./MIA_MEDIA_CATALOG");
const { applyCatalogToObs } = require("./media_apply_obs");
const { requestObsHands, requestRestart } = require("./mia_admin_client");
const { triggerExternalRestart } = require("./MIA_SELF_RESTART");

const ROOT = path.resolve(__dirname, "..");

function loadLocalEnv() {
  const envPath = path.join(ROOT, ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!Object.prototype.hasOwnProperty.call(process.env, key)) {
      process.env[key] = val;
    }
  }
}

function check(name, ok, detail = "", fix = "") {
  return { name, ok: Boolean(ok), detail, fix: fix || undefined };
}

function fetchJson(url, timeoutMs = 8000) {
  return new Promise((resolve) => {
    const req = http.get(url, { timeout: timeoutMs }, (res) => {
      let body = "";
      res.on("data", (c) => (body += c));
      res.on("end", () => {
        try {
          resolve({ ok: res.statusCode === 200, data: JSON.parse(body) });
        } catch {
          resolve({ ok: false, error: "invalid_json" });
        }
      });
    });
    req.on("error", (err) => resolve({ ok: false, error: err.message }));
    req.on("timeout", () => {
      req.destroy();
      resolve({ ok: false, error: "timeout" });
    });
  });
}

async function auditObsVoice() {
  const obs = new OBSWebSocket();
  const password = process.env.OBS_WS_PASSWORD || "";
  try {
    await obs.connect(process.env.OBS_WS_URL || "ws://127.0.0.1:4455", password ? { password } : undefined);
    const settings = await obs.call("GetInputSettings", { inputName: "MIA_VOICE" });
    const mute = await obs.call("GetInputMute", { inputName: "MIA_VOICE" });
    const mon = await obs.call("GetInputAudioMonitorType", { inputName: "MIA_VOICE" });
    const vcam = await obs.call("GetVirtualCamStatus");
    await obs.disconnect();

    const reroute = settings?.inputSettings?.reroute_audio === true;
    const monitor = mon?.monitorType || "unknown";
    const monitorOk =
      monitor === "OBS_MONITORING_TYPE_MONITOR_AND_OUTPUT" ||
      monitor === "OBS_MONITORING_TYPE_MONITOR_ONLY";

    return [
      check("obs_voice_source", true, "MIA_VOICE existuje"),
      check(
        "obs_voice_reroute",
        reroute,
        reroute ? "Control audio via OBS = ON" : "Control audio via OBS = OFF",
        "OBS → MIA_VOICE → Properties → Control audio via OBS = ON"
      ),
      check(
        "obs_voice_monitor",
        monitorOk,
        `monitor=${monitor}`,
        "Nastav MIA_OBS_VOICE_MONITOR=and_output v .env a npm run obs:ensure-voice"
      ),
      check(
        "obs_voice_unmuted",
        mute?.inputMuted !== true,
        mute?.inputMuted ? "MIA_VOICE je ztlumená" : "MIA_VOICE není mute",
        "OBS mixer → MIA_VOICE → odklikni mute"
      ),
      check(
        "obs_virtual_camera",
        vcam?.outputActive === true,
        vcam?.outputActive ? "Virtual Camera ON" : "Virtual Camera OFF",
        "npm run obs:prepare-tiktok"
      ),
      check(
        "tiktok_audio_path",
        true,
        "TikTok Virtual Camera neposílá zvuk z OBS — pro diváky: VB-Cable nebo mikrofon z OBS monitoru",
        "TikTok Studio → mikrofon = VB-Audio Cable Output; OBS → Monitoring Device = VB-Cable Input"
      )
    ];
  } catch (err) {
    return [check("obs_websocket", false, err.message, "Spusť OBS + WebSocket port 4455")];
  }
}

async function auditMediaPaths() {
  const catalog = loadCatalog();
  const missing = [];
  for (const assign of catalog?.obsAssignments || []) {
    if (!assign.abs || !fs.existsSync(assign.abs)) {
      missing.push(assign.obsSource);
    }
  }
  return [
    check(
      "media_catalog",
      (catalog?.obsAssignments?.length || 0) >= 31,
      `${catalog?.obsAssignments?.length || 0}/31 OBS slotů`
    ),
    check(
      "media_files_on_disk",
      missing.length === 0,
      missing.length ? `chybí: ${missing.join(", ")}` : "všechny soubory existují",
      missing.length ? "npm run media:scan && npm run media:apply-obs" : undefined
    )
  ];
}

async function main() {
  loadLocalEnv();
  const port = process.env.PORT || 3000;
  const base = `http://127.0.0.1:${port}`;
  const checks = [];

  const health = await fetchJson(`${base}/health`, 12000);
  checks.push(
    check("mia_server", health.ok, health.ok ? `port ${port}` : health.error || "offline", "npm run restart")
  );

  const diagnose = await fetchJson(`${base}/diagnose`, 20000);
  if (diagnose.ok) {
    const d = diagnose.data || {};
    checks.push(check("obs_connected", d.obsConnected === true, d.obsHealth?.status || ""));
    checks.push(
      check(
        "tts_engine",
        d.tts?.enabled === true,
        d.tts?.enabled ? `edge ${d.tts?.edgeVoice || ""}` : "TTS vypnuto"
      )
    );
    checks.push(
      check(
        "video_engine",
        (d.video?.stats?.failed || 0) === 0,
        `started ${d.video?.stats?.started || 0}, failed ${d.video?.stats?.failed || 0}`
      )
    );
    checks.push(
      check(
        "video_tiers",
        Object.values(d.video?.tierSources || {}).every((arr) => (arr?.length || 0) >= 3),
        "T1-T4 sloty nakonfigurované"
      )
    );
    checks.push(
      check(
        "layout_locked",
        true,
        process.env.MIA_OBS_LAYOUT_LOCKED !== "false"
          ? "MIA nemění OBS pozice (layout locked)"
          : "layout unlocked — MIA může měnit OBS"
      )
    );
  }

  checks.push(...(await auditMediaPaths()));
  checks.push(...(await auditObsVoice()));

  const fixMode = process.argv.includes("--fix");
  const fixLog = [];
  if (fixMode) {
    const mediaFail = checks.some((c) => c.name === "media_files_on_disk" && !c.ok);
    if (mediaFail) {
      try {
        const media = await applyCatalogToObs();
        fixLog.push({ step: "media_apply_obs", applied: media.applied?.length || 0 });
        if ((media.applied || []).length > 0 && health.ok) {
          await requestRestart(port, "audit_canon_fix");
          fixLog.push({ step: "restart_api", ok: true });
        } else if ((media.applied || []).length > 0) {
          triggerExternalRestart("audit_canon_fix", { delayMs: 1200 });
          fixLog.push({ step: "restart_external", ok: true });
        }
      } catch (err) {
        fixLog.push({ step: "media_apply_obs", ok: false, error: err.message });
      }
    }

    if (health.ok) {
      const hands = await requestObsHands(port, { reason: "audit_canon_fix" });
      fixLog.push({ step: "obs_hands_api", ok: hands.ok, data: hands.data });
    }
  }

  const preflight = spawnSync("node", ["scripts/run_preflight_tests.js", "--full"], {
    cwd: ROOT,
    encoding: "utf8",
    shell: process.platform === "win32"
  });
  let preflightDetail = "selhaly — viz npm run test:preflight";
  if (preflight.status === 0 && preflight.stdout) {
    try {
      const parsed = JSON.parse(preflight.stdout);
      preflightDetail = `${parsed.passed || 0}/${parsed.total || 0} OK`;
    } catch (_err) {
      preflightDetail = "OK";
    }
  }
  const spam = spawnSync("node", ["tests/spam_session_contract.js"], {
    cwd: ROOT,
    encoding: "utf8",
    shell: process.platform === "win32"
  });

  checks.push(
    check(
      "preflight_tests",
      preflight.status === 0,
      preflight.status === 0 ? preflightDetail : preflightDetail
    )
  );
  checks.push(
    check(
      "spam_contract",
      spam.status === 0,
      spam.status === 0 ? "OK" : "spam test fail — npm run test:spam"
    )
  );

  const failed = checks.filter((c) => !c.ok);
  const report = {
    ok: failed.length === 0,
    generatedAt: new Date().toISOString(),
    canon: "docs/KANON_MIA_ALIGNMENT.md",
    passed: checks.filter((c) => c.ok).length,
    failed: failed.length,
    checks,
    actions: [
      "npm run restart",
      "npm run obs:stream-ready -- --fix --wait",
      "npm run obs:verify-stream-ready -- --fix",
      "npm run obs:ensure-voice",
      "npm run obs:prepare-tiktok",
      "npm run media:apply-obs",
      "http://127.0.0.1:3000/tts/test",
      "http://127.0.0.1:3000/video/test?tier=T1"
    ]
  };

  if (fixLog.length) {
    report.fixesApplied = fixLog;
  }

  console.log(JSON.stringify(report, null, 2));
  process.exitCode = report.ok ? 0 : 1;
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err?.message || err);
    process.exitCode = 1;
  });
}

module.exports = { main };
