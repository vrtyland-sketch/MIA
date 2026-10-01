"use strict";

/**
 * STREAM_VALIDATION_02 — RAM + ingest chain validation monitor.
 * Observe only; no fixes.
 *
 *   node scripts/stream_validation_02.js
 *   node scripts/stream_validation_02.js --duration=120 --interval=5
 */

const fs = require("fs");
const http = require("http");
const path = require("path");
const { execSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "docs", "STREAM_VALIDATION_02_EVIDENCE.jsonl");
const DURATION_MS = Number(
  (process.argv.find((a) => a.startsWith("--duration=")) || "").split("=")[1] || 120
) * 1000;
const INTERVAL_MS = Number(
  (process.argv.find((a) => a.startsWith("--interval=")) || "").split("=")[1] || 5
) * 1000;

const TIKTOK_NAME_RE =
  /tiktok|live.?studio|ttlives|livestudio|tik.?live|bytedance/i;

function fetchHealth(timeoutMs = 6000) {
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

function getSystemRam() {
  try {
    const out = execSync(
      "powershell -NoProfile -Command \"$o=Get-CimInstance Win32_OperatingSystem; Write-Output ([math]::Round($o.FreePhysicalMemory/1024,1)); Write-Output ([math]::Round($o.TotalVisibleMemorySize/1024,1))\"",
      { encoding: "utf8", timeout: 15000 }
    );
    const [free, total] = out.trim().split(/\r?\n/).map((s) => Number(s.trim()));
    return { FreeMB: free, TotalMB: total };
  } catch {
    return { FreeMB: null, TotalMB: null };
  }
}

function getProcesses() {
  try {
    const out = execSync(
      "powershell -NoProfile -Command \"Get-Process | ForEach-Object { '{0}|{1}|{2}' -f $_.ProcessName,$_.Id,[math]::Round($_.WorkingSet64/1MB,1) }\"",
      { encoding: "utf8", timeout: 20000, maxBuffer: 4 * 1024 * 1024 }
    );
    return out
      .trim()
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => {
        const [ProcessName, Id, MB] = line.split("|");
        return { ProcessName, Id: Number(Id), MB: Number(MB) };
      });
  } catch {
    return [];
  }
}

function pickProcs(procs) {
  const obs = procs.filter((p) => /^obs64$/i.test(p.ProcessName));
  const node = procs.filter((p) => /^node$/i.test(p.ProcessName));
  const tiktok = procs.filter((p) => TIKTOK_NAME_RE.test(p.ProcessName || ""));
  const cursor = procs.filter((p) => /^Cursor$/i.test(p.ProcessName));
  return {
    obsRamMb: obs.reduce((s, p) => s + (p.MB || 0), 0),
    nodeRamMb: node.reduce((s, p) => s + (p.MB || 0), 0),
    cursorRamMb: cursor.reduce((s, p) => s + (p.MB || 0), 0),
    tiktokProcs: tiktok.map((p) => ({ name: p.ProcessName, pid: p.Id, mb: p.MB })),
    tiktokRamMb: tiktok.reduce((s, p) => s + (p.MB || 0), 0)
  };
}

function tailIngestLog(day) {
  const logPath = path.join(ROOT, "logs", `ingest-${day}.jsonl`);
  if (!fs.existsSync(logPath)) return { exists: false, last: null };
  try {
    const lines = fs.readFileSync(logPath, "utf8").trim().split(/\r?\n/).filter(Boolean);
    const last = lines.length ? JSON.parse(lines[lines.length - 1]) : null;
    return { exists: true, count: lines.length, last };
  } catch {
    return { exists: true, last: null, error: "parse" };
  }
}

function scanMiaEvents(day) {
  const logPath = path.join(ROOT, "logs", `mia-events-${day}.jsonl`);
  const out = { ttsSpeak: 0, commentIngest: 0, giftIngest: 0, watchdogStale: null };
  if (!fs.existsSync(logPath)) return out;
  try {
    const tail = fs.readFileSync(logPath, "utf8").slice(-80000);
    for (const line of tail.split(/\r?\n/).filter(Boolean)) {
      try {
        const o = JSON.parse(line);
        if (o.stage === "tts_speak") out.ttsSpeak++;
        if (o.stage === "stream_watchdog_health") {
          out.watchdogStale = o.ingestStale;
          out.watchdogObs = o.obsConnected;
        }
        if (o.eventType === "COMMENT" || o.stage === "ingest_comment") out.commentIngest++;
        if (o.eventType === "GIFT" || o.stage === "ingest_gift") out.giftIngest++;
      } catch {
        /* ignore */
      }
    }
  } catch {
    /* ignore */
  }
  return out;
}

function append(row) {
  fs.appendFileSync(OUT, `${JSON.stringify(row)}\n`, "utf8");
}

async function sample(phase, tick) {
  const day = new Date().toISOString().slice(0, 10);
  const ram = getSystemRam();
  const procs = pickProcs(getProcesses());
  const health = await fetchHealth();
  const ingest = tailIngestLog(day);
  const events = scanMiaEvents(day);
  const row = {
    ts: new Date().toISOString(),
    phase,
    tick,
    ramFreeMb: ram.FreeMB,
    ramTotalMb: ram.TotalMB,
    ...procs,
    health: {
      ok: health.data?.ok,
      latencyMs: health.latencyMs,
      error: health.error,
      obsConnected: health.data?.obsConnected,
      lastIngest: health.data?.lastIngest || null
    },
    ingestLog: ingest,
    miaEventsTail: events
  };
  append(row);
  const tt = procs.tiktokProcs.length
    ? `tiktok=${procs.tiktokRamMb}MB`
    : "tiktok=none";
  process.stdout.write(
    `\r[${phase}] t${tick} free=${ram.FreeMB}MB obs=${procs.obsRamMb}MB ${tt} lastIngest=${health.data?.lastIngest?.eventType || "null"}   `
  );
  return row;
}

async function main() {
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  append({
    kind: "SESSION_START",
    ts: new Date().toISOString(),
    protocol: "STREAM_VALIDATION_02",
    durationMs: DURATION_MS,
    intervalMs: INTERVAL_MS
  });

  console.log(
    JSON.stringify({
      protocol: "STREAM_VALIDATION_02",
      evidence: OUT,
      durationSec: DURATION_MS / 1000,
      hint: "Baseline → start TikTok LIVE Studio → send test comment via TikFinity"
    })
  );

  const baseline = await sample("baseline_pre_studio", 0);
  append({ kind: "BASELINE_PRE_STUDIO", ...baseline });

  const started = Date.now();
  let tick = 1;
  let studioSeen = false;
  let postStudioSample = null;

  while (Date.now() - started < DURATION_MS) {
    await new Promise((r) => setTimeout(r, INTERVAL_MS));
    const row = await sample("monitor", tick++);
    if (!studioSeen && row.tiktokProcs && row.tiktokProcs.length > 0) {
      studioSeen = true;
      append({ kind: "TIKTOK_STUDIO_DETECTED", ...row });
      postStudioSample = row;
    }
  }

  const final = await sample("final", tick);
  append({ kind: "SESSION_END", ts: new Date().toISOString(), ticks: tick, studioSeen });

  const summary = {
    done: true,
    evidence: OUT,
    baselineFreeMb: baseline.ramFreeMb,
    finalFreeMb: final.ramFreeMb,
    studioSeen,
    postStudioFreeMb: postStudioSample?.ramFreeMb ?? null,
    lastIngest: final.health?.lastIngest,
    ingestLogLast: final.ingestLog?.last
  };
  append({ kind: "SUMMARY", ...summary });
  console.log("\n" + JSON.stringify(summary, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
