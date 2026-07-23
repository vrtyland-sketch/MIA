"use strict";

const path = require("path");
const { spawn } = require("child_process");
const { waitForPortFree } = require("./MIA_PORT_GUARD");
const { waitForHealth } = require("./mia_health");
const { stopMia } = require("./mia_stop");

const ROOT = path.resolve(__dirname, "..");

function parseDelayMs(argv = process.argv) {
  const flag = argv.find((a) => a.startsWith("--delay="));
  if (!flag) return 1500;
  const n = Number(flag.split("=")[1]);
  return Number.isFinite(n) ? Math.max(0, n) : 1500;
}

function parseReason(argv = process.argv) {
  const flag = argv.find((a) => a.startsWith("--reason="));
  if (!flag) return "manual";
  try {
    return decodeURIComponent(flag.slice("--reason=".length));
  } catch (_err) {
    return flag.slice("--reason=".length);
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatHealthLine(port, health) {
  const obs =
    health?.data && typeof health.data.obsConnected === "boolean"
      ? ` · obsConnected: ${health.data.obsConnected}`
      : "";
  return `[MIA] Health OK · http://127.0.0.1:${port}/health (${health.waitedMs} ms)${obs}`;
}

async function restartMia(options = {}) {
  const delayMs = options.delayMs ?? 1500;
  const reason = options.reason || "manual";
  const healthTimeoutMs = Number(options.healthTimeoutMs || process.env.MIA_RESTART_HEALTH_MS || 15000);

  if (delayMs > 0) {
    await sleep(delayMs);
  }

  console.log(`[MIA] Restart (${reason})…`);

  const port = Number(options.port || process.env.PORT || 3000);
  const stop = await stopMia({ port });
  if (!stop.ok && stop.reason === "foreign_process") {
    throw new Error(`Port held by foreign process PID ${stop.pid}`);
  }
  if (stop.stopped) {
    console.log(`[MIA] Zastaveno PID ${stop.pid}.`);
  }

  const wait = await waitForPortFree(port, 8000);
  if (!wait.ok) {
    throw new Error(`Port ${port} still busy after stop`);
  }

  const child = spawn(process.execPath, [path.join(ROOT, "server.js")], {
    cwd: ROOT,
    detached: true,
    stdio: "ignore",
    env: process.env
  });
  child.unref();

  console.log(`[MIA] Nový proces spuštěn${child.pid ? ` (PID ${child.pid})` : ""}.`);

  const health = await waitForHealth(port, { timeoutMs: healthTimeoutMs });
  if (!health.ok) {
    throw new Error(
      `Health check failed after spawn${child.pid ? ` (PID ${child.pid})` : ""} — ` +
        `zkontroluj log nebo spusť: node server.js`
    );
  }

  console.log(formatHealthLine(port, health));

  return {
    ok: true,
    pid: child.pid,
    reason,
    port,
    health: {
      ok: true,
      waitedMs: health.waitedMs,
      obsConnected: health.data?.obsConnected,
      service: health.data?.service || "MIA"
    }
  };
}

async function main() {
  await restartMia({
    delayMs: parseDelayMs(),
    reason: parseReason()
  });
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err?.message || err);
    process.exit(1);
  });
}

module.exports = { restartMia, parseDelayMs, parseReason, formatHealthLine };
