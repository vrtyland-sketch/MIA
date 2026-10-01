"use strict";

/**
 * STREAM_VALIDATION_02 — FINAL GATE
 * Observe-only monitor for TikFinity webhook + runtime stability.
 *
 *   node scripts/stream_validation_02_final_gate.js
 *   node scripts/stream_validation_02_final_gate.js --duration=900 --interval=10
 *
 * Operator during session:
 *   1. OBS + TikTok LIVE Studio running
 *   2. TikFinity connected to live room, webhook http://127.0.0.1:3000/ingest
 *   3. Send ≥1 real/test COMMENT via TikFinity
 *   4. Confirm MIA reacts (overlay/TTS) if RAM allows
 */

const fs = require("fs");
const http = require("http");
const path = require("path");
const { execSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "docs", "STREAM_VALIDATION_02_FINAL_GATE.jsonl");
const DURATION_MS = Number(
  (process.argv.find((a) => a.startsWith("--duration=")) || "").split("=")[1] || 900
) * 1000;
const INTERVAL_MS = Number(
  (process.argv.find((a) => a.startsWith("--interval=")) || "").split("=")[1] || 10
) * 1000;
const HEALTH_TIMEOUT_MS = Number(
  (process.argv.find((a) => a.startsWith("--health-timeout=")) || "").split("=")[1] || 8
) * 1000;

const CONTROL_MARKERS = ["INGEST_GATE test comment"];

function today() {
  return new Date().toISOString().slice(0, 10);
}

function append(row) {
  fs.appendFileSync(OUT, `${JSON.stringify(row)}\n`, "utf8");
}

function getSystemRam() {
  try {
    const out = execSync(
      'powershell -NoProfile -Command "$o=Get-CimInstance Win32_OperatingSystem; Write-Output ([math]::Round($o.FreePhysicalMemory/1024,1)); Write-Output ([math]::Round($o.TotalVisibleMemorySize/1024,1))"',
      { encoding: "utf8", timeout: 15000 }
    );
    const [free, total] = out.trim().split(/\r?\n/).map((s) => Number(s.trim()));
    return { FreeMB: free, TotalMB: total };
  } catch {
    return { FreeMB: null, TotalMB: null };
  }
}

function fetchHealth(timeoutMs = HEALTH_TIMEOUT_MS) {
  return new Promise((resolve) => {
    const t0 = Date.now();
    const req = http.get("http://127.0.0.1:3000/health", { timeout: timeoutMs }, (res) => {
      let body = "";
      res.on("data", (c) => (body += c));
      res.on("end", () => {
        try {
          resolve({
            latencyMs: Date.now() - t0,
            status: res.statusCode,
            data: JSON.parse(body)
          });
        } catch (err) {
          resolve({ latencyMs: Date.now() - t0, status: res.statusCode, error: err.message });
        }
      });
    });
    req.on("error", (err) => resolve({ latencyMs: Date.now() - t0, error: err.message }));
    req.on("timeout", () => {
      req.destroy();
      resolve({ latencyMs: Date.now() - t0, error: "timeout" });
    });
  });
}

function readIngestLines(day) {
  const logPath = path.join(ROOT, "logs", `ingest-${day}.jsonl`);
  if (!fs.existsSync(logPath)) return { path: logPath, lines: [] };
  const lines = fs.readFileSync(logPath, "utf8").trim().split(/\r?\n/).filter(Boolean);
  return {
    path: logPath,
    lines: lines.map((l) => {
      try {
        return JSON.parse(l);
      } catch {
        return null;
      }
    }).filter(Boolean)
  };
}

function isControlIngest(entry) {
  const msg = String(entry?.message || "");
  return CONTROL_MARKERS.some((m) => msg.includes(m));
}

function isLiveTikfinityIngest(entry, sessionStartIso) {
  if (!entry || entry.platform !== "tiktok") return false;
  if (isControlIngest(entry)) return false;
  if (sessionStartIso && entry.ts && entry.ts <= sessionStartIso) return false;
  return entry.eventType === "COMMENT" || entry.eventType === "GIFT";
}

function scanMiaEventsSince(day, sessionStartMs) {
  const logPath = path.join(ROOT, "logs", `mia-events-${day}.jsonl`);
  const out = {
    ttsSpeak: 0,
    decision: 0,
    ingestComment: 0,
    watchdogStale: null,
    obsDownTicks: 0
  };
  if (!fs.existsSync(logPath)) return out;
  try {
    const content = fs.readFileSync(logPath, "utf8");
    for (const line of content.split(/\r?\n/).filter(Boolean)) {
      try {
        const o = JSON.parse(line);
        const ts = typeof o.ts === "number" ? o.ts : Date.parse(o.ts || o.atIso || 0);
        if (Number.isFinite(ts) && ts < sessionStartMs) continue;
        if (o.stage === "tts_speak") out.ttsSpeak++;
        if (o.stage === "decision" || o.stage === "runtime_decision") out.decision++;
        if (o.eventType === "COMMENT" || o.stage === "ingest_comment") out.ingestComment++;
        if (o.stage === "stream_watchdog_health") {
          out.watchdogStale = o.ingestStale;
          if (o.obsConnected === false) out.obsDownTicks++;
        }
      } catch {
        /* ignore */
      }
    }
  } catch {
    /* ignore */
  }
  return out;
}

function listWatchdogFiles() {
  const wd = path.join(
    process.env.APPDATA || "",
    "TikTok LIVE Studio",
    "watch_dog"
  );
  if (!wd || !fs.existsSync(wd)) return [];
  try {
    return fs
      .readdirSync(wd)
      .map((name) => {
        const full = path.join(wd, name);
        const st = fs.statSync(full);
        return { name, mtime: st.mtime.toISOString(), size: st.size };
      })
      .filter((f) => f.size > 0);
  } catch {
    return [];
  }
}

async function sample(tick, sessionStartIso, sessionStartMs, baselineIngestCount) {
  const day = today();
  const ram = getSystemRam();
  const health = await fetchHealth();
  const ingest = readIngestLines(day);
  const liveIngest = ingest.lines.filter((e) => isLiveTikfinityIngest(e, sessionStartIso));
  const events = scanMiaEventsSince(day, sessionStartMs);
  const wdFiles = listWatchdogFiles();

  return {
    ts: new Date().toISOString(),
    tick,
    ramFreeMb: ram.FreeMB,
    ramTotalMb: ram.TotalMB,
    health: {
      ok: health.data?.ok,
      latencyMs: health.latencyMs,
      error: health.error,
      obsConnected: health.data?.obsConnected,
      lastIngest: health.data?.lastIngest || null
    },
    ingest: {
      path: ingest.path,
      totalCount: ingest.lines.length,
      newSinceStart: ingest.lines.length - baselineIngestCount,
      liveCount: liveIngest.length,
      liveLast: liveIngest[liveIngest.length - 1] || null
    },
    miaEvents: events,
    tiktokWatchdogFiles: wdFiles
  };
}

function lastIngestIsLive(li) {
  if (!li) return false;
  const msg = String(li.message || "");
  if (CONTROL_MARKERS.some((m) => msg.includes(m))) return false;
  return li.eventType === "COMMENT" || li.eventType === "GIFT";
}

function buildVerdict(stats) {
  const gateA =
    stats.liveIngestSeen ||
    (stats.lastLiveIngest && lastIngestIsLive(stats.lastLiveIngest));

  const gateB =
    stats.healthTimeouts === 0 &&
    stats.obsDisconnects === 0 &&
    stats.maxHealthLatencyMs < HEALTH_TIMEOUT_MS;

  const gateBPlus =
    gateB &&
    stats.ttsSpeak >= 1 &&
    stats.decisionOrPipeline >= 1;

  let verdict = "FAIL";
  if (gateA && gateB) verdict = gateBPlus ? "PASS" : "PARTIAL_PASS";
  else if (gateA && !gateB) verdict = "FAIL_B_STABILITY";
  else if (!gateA && gateB) verdict = "FAIL_A_TIKFINITY";

  return {
    verdict,
    gateA_tikfinity: gateA ? "PASS" : "FAIL",
    gateB_stability: gateB ? "PASS" : "FAIL",
    gateB_pipeline: gateBPlus ? "PASS" : "NOT_PROVEN",
    failLayer:
      verdict === "PASS" || verdict === "PARTIAL_PASS"
        ? null
        : !gateA
          ? "A_TIKFINITY_WEBHOOK"
          : "B_RUNTIME_STABILITY"
  };
}

async function main() {
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  const sessionStartIso = new Date().toISOString();
  const sessionStartMs = Date.now();
  const day = today();
  const baselineIngest = readIngestLines(day);

  append({
    kind: "SESSION_START",
    ts: sessionStartIso,
    protocol: "STREAM_VALIDATION_02_FINAL_GATE",
    durationMs: DURATION_MS,
    intervalMs: INTERVAL_MS,
    healthTimeoutMs: HEALTH_TIMEOUT_MS,
    baselineIngestCount: baselineIngest.lines.length,
    controlMarkers: CONTROL_MARKERS
  });

  console.log(
    JSON.stringify({
      protocol: "STREAM_VALIDATION_02_FINAL_GATE",
      evidence: OUT,
      durationMin: DURATION_MS / 60000,
      intervalSec: INTERVAL_MS / 1000,
      hint: "OBS+Studio+TikFinity running. Send ONE TikFinity test COMMENT (no local POST). RAM ideal 1.5GB, OK if stable at 0.8-1.2GB"
    })
  );

  const stats = {
    healthTimeouts: 0,
    obsDisconnects: 0,
    maxHealthLatencyMs: 0,
    minRamFreeMb: Infinity,
    baselineRamFreeMb: null,
    healthLatencySamples: [],
    liveIngestSeen: false,
    lastLiveIngest: null,
    ttsSpeak: 0,
    decisionOrPipeline: 0,
    watchdogFilesAtEnd: []
  };

  let tick = 0;
  const baseline = await sample(0, sessionStartIso, sessionStartMs, baselineIngest.lines.length);
  append({ kind: "BASELINE", ...baseline });
  if (baseline.health.error === "timeout" || baseline.health.error === "read ECONNRESET") {
    stats.healthTimeouts++;
  }
  if (baseline.health.latencyMs >= HEALTH_TIMEOUT_MS) stats.healthTimeouts++;
  if (baseline.health.latencyMs > stats.maxHealthLatencyMs) {
    stats.maxHealthLatencyMs = baseline.health.latencyMs;
  }
  if (baseline.health.obsConnected === false) stats.obsDisconnects++;
  if (baseline.ramFreeMb != null) {
    stats.baselineRamFreeMb = baseline.ramFreeMb;
    stats.minRamFreeMb = baseline.ramFreeMb;
  }
  stats.healthLatencySamples.push({
    tick: 0,
    latencyMs: baseline.health.latencyMs,
    error: baseline.health.error || null
  });
  process.stdout.write(
    `\r[t0] free=${baseline.ramFreeMb}MB health=${baseline.health.error || baseline.health.latencyMs + "ms"} obs=${baseline.health.obsConnected} liveIngest=${baseline.ingest.liveCount}   `
  );

  const started = Date.now();
  while (Date.now() - started < DURATION_MS) {
    await new Promise((r) => setTimeout(r, INTERVAL_MS));
    tick++;
    const row = await sample(tick, sessionStartIso, sessionStartMs, baselineIngest.lines.length);
    append(row);

    if (row.health.error === "timeout" || row.health.error === "read ECONNRESET") {
      stats.healthTimeouts++;
    }
    if (row.health.latencyMs > stats.maxHealthLatencyMs) {
      stats.maxHealthLatencyMs = row.health.latencyMs;
    }
    if (row.health.latencyMs >= HEALTH_TIMEOUT_MS) stats.healthTimeouts++;
    if (row.health.obsConnected === false) stats.obsDisconnects++;
    if (row.ramFreeMb != null && row.ramFreeMb < stats.minRamFreeMb) {
      stats.minRamFreeMb = row.ramFreeMb;
    }
    stats.healthLatencySamples.push({
      tick,
      latencyMs: row.health.latencyMs,
      error: row.health.error || null
    });
    if (row.ingest.liveCount > 0) {
      stats.liveIngestSeen = true;
      stats.lastLiveIngest = row.ingest.liveLast || row.health.lastIngest;
    }
    if (lastIngestIsLive(row.health.lastIngest)) {
      stats.liveIngestSeen = true;
      stats.lastLiveIngest = row.health.lastIngest;
    }
    stats.ttsSpeak = Math.max(stats.ttsSpeak, row.miaEvents.ttsSpeak);
    stats.decisionOrPipeline = Math.max(
      stats.decisionOrPipeline,
      row.miaEvents.decision + row.miaEvents.ingestComment
    );

    process.stdout.write(
      `\r[t${tick}] free=${row.ramFreeMb}MB health=${row.health.error || row.health.latencyMs + "ms"} obs=${row.health.obsConnected} liveIngest=${row.ingest.liveCount} tts=${row.miaEvents.ttsSpeak}   `
    );
  }

  const final = await sample(tick + 1, sessionStartIso, sessionStartMs, baselineIngest.lines.length);
  append({ kind: "FINAL", ...final });
  stats.watchdogFilesAtEnd = final.tiktokWatchdogFiles;

  if (!Number.isFinite(stats.minRamFreeMb)) stats.minRamFreeMb = null;

  const verdict = buildVerdict(stats);
  const summary = {
    kind: "SUMMARY",
    ts: new Date().toISOString(),
    ticks: tick + 1,
    durationMin: DURATION_MS / 60000,
    ramCriticalAtStart: stats.baselineRamFreeMb != null && stats.baselineRamFreeMb < 100,
    ...verdict,
    stats,
    evidence: OUT,
    streamRecovery01:
      verdict.verdict === "PASS" ? "CLOSED" : "OPEN",
    featureFreeze: verdict.verdict === "PASS" ? "OFF" : "ON"
  };
  append(summary);

  console.log("\n" + JSON.stringify(summary, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
