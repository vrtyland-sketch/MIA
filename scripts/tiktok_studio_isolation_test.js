"use strict";

/**
 * STREAM_RECOVERY_01 — TikTok LIVE Studio isolation monitor.
 * Logs every 10s for 5 minutes. No fixes, observe only.
 *
 *   node scripts/tiktok_studio_isolation_test.js
 *   node scripts/tiktok_studio_isolation_test.js --duration=300 --interval=10
 */

const fs = require("fs");
const http = require("http");
const path = require("path");
const { execSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "docs", "TIKTOK_STUDIO_ISOLATION_EVIDENCE.jsonl");
const DURATION_MS = Number(
  (process.argv.find((a) => a.startsWith("--duration=")) || "").split("=")[1] || 300
) * 1000;
const INTERVAL_MS = Number(
  (process.argv.find((a) => a.startsWith("--interval=")) || "").split("=")[1] || 10
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
      'powershell -NoProfile -Command "$o=Get-CimInstance Win32_OperatingSystem; [PSCustomObject]@{FreeMB=[math]::Round($o.FreePhysicalMemory/1024,1);TotalMB=[math]::Round($o.TotalVisibleMemorySize/1024,1)}" | ConvertTo-Json -Compress',
      { encoding: "utf8", timeout: 15000 }
    );
    return JSON.parse(out.trim());
  } catch {
    return { FreeMB: null, TotalMB: null };
  }
}

function getProcesses() {
  try {
    const out = execSync(
      'powershell -NoProfile -Command "Get-Process | Select-Object ProcessName,Id,@{n=\'MB\';e={[math]::Round($_.WorkingSet64/1MB,1)}} | ConvertTo-Json -Compress"',
      { encoding: "utf8", timeout: 20000, maxBuffer: 4 * 1024 * 1024 }
    );
    const parsed = JSON.parse(out.trim());
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return [];
  }
}

function pickProcs(procs) {
  const obs = procs.filter((p) => /^obs64$/i.test(p.ProcessName));
  const node = procs.filter((p) => /^node$/i.test(p.ProcessName));
  const tiktok = procs.filter((p) => TIKTOK_NAME_RE.test(p.ProcessName || ""));
  const top = [...procs].sort((a, b) => (b.MB || 0) - (a.MB || 0)).slice(0, 8);
  return {
    obsRamMb: obs.reduce((s, p) => s + (p.MB || 0), 0),
    nodeRamMb: node.reduce((s, p) => s + (p.MB || 0), 0),
    tiktokProcs: tiktok.map((p) => ({ name: p.ProcessName, pid: p.Id, mb: p.MB })),
    tiktokRamMb: tiktok.reduce((s, p) => s + (p.MB || 0), 0),
    topRam: top.map((p) => ({ name: p.ProcessName, pid: p.Id, mb: p.MB }))
  };
}

function tailWatchdogErrors() {
  const day = new Date().toISOString().slice(0, 10);
  const logPath = path.join(ROOT, "logs", `mia-events-${day}.jsonl`);
  if (!fs.existsSync(logPath)) return { ingestStale: null, obsConnected: null };
  try {
    const tail = fs.readFileSync(logPath, "utf8").slice(-12000);
    const lines = tail.split(/\r?\n/).filter(Boolean);
    for (let i = lines.length - 1; i >= 0; i--) {
      try {
        const o = JSON.parse(lines[i]);
        if (o.stage === "stream_watchdog_health") {
          return {
            ingestStale: o.ingestStale,
            ingestAgeMs: o.ingestAgeMs,
            obsConnected: o.obsConnected,
            consecutiveObsDown: o.consecutiveObsDown
          };
        }
      } catch {
        /* ignore */
      }
    }
  } catch {
    /* ignore */
  }
  return {};
}

function append(row) {
  fs.appendFileSync(OUT, `${JSON.stringify(row)}\n`, "utf8");
}

async function sample(phase, tick) {
  const ram = getSystemRam();
  const procs = pickProcs(getProcesses());
  const health = await fetchHealth();
  const wd = tailWatchdogErrors();
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
    watchdog: wd
  };
  append(row);
  const tt = procs.tiktokProcs.length
    ? `tiktok=${procs.tiktokRamMb}MB(${procs.tiktokProcs.map((p) => p.name).join(",")})`
    : "tiktok=none";
  process.stdout.write(
    `\r[${phase}] t${tick} free=${ram.FreeMB}MB obs=${procs.obsRamMb}MB ${tt} ingestStale=${wd.ingestStale} health=${health.error || health.data?.ok}   `
  );
  return row;
}

async function main() {
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  append({
    kind: "SESSION_START",
    ts: new Date().toISOString(),
    durationMs: DURATION_MS,
    intervalMs: INTERVAL_MS,
    protocol: "STREAM_RECOVERY_01"
  });

  console.log(
    JSON.stringify({
      protocol: "STREAM_RECOVERY_01",
      evidence: OUT,
      durationSec: DURATION_MS / 1000,
      intervalSec: INTERVAL_MS / 1000,
      hint: "Baseline now. Start TikTok LIVE Studio when ready — monitor continues."
    })
  );

  const baseline = await sample("baseline", 0);
  append({ kind: "BASELINE", ...baseline });

  const started = Date.now();
  let tick = 1;
  while (Date.now() - started < DURATION_MS) {
    await new Promise((r) => setTimeout(r, INTERVAL_MS));
    await sample("monitor", tick++);
  }

  append({ kind: "SESSION_END", ts: new Date().toISOString(), ticks: tick });
  console.log("\n" + JSON.stringify({ done: true, ticks: tick, evidence: OUT }));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
