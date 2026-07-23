"use strict";

const { execSync } = require("child_process");
const {
  describePortListener,
  looksLikeMiaProcess,
  waitForPortFree
} = require("./MIA_PORT_GUARD");

const PORT = Number(process.env.PORT || 3000);
const force = process.argv.includes("--force");

async function stopMia(options = {}) {
  const port = Number(options.port || PORT);
  const listener = describePortListener(port);

  if (!listener?.pid) {
    return { ok: true, stopped: false, reason: "port_free", port };
  }

  if (!options.force && !force && !looksLikeMiaProcess(listener)) {
    return {
      ok: false,
      stopped: false,
      reason: "foreign_process",
      port,
      pid: listener.pid,
      commandLine: listener.commandLine || ""
    };
  }

  try {
    if (process.platform === "win32") {
      execSync(`taskkill /PID ${listener.pid} /T /F`, {
        stdio: "ignore",
        timeout: 5000
      });
    } else {
      process.kill(listener.pid);
    }
  } catch (err) {
    return { ok: false, stopped: false, reason: err.message, port, pid: listener.pid };
  }

  const wait = await waitForPortFree(port, options.waitMs || 8000);
  return {
    ok: wait.ok,
    stopped: true,
    port,
    pid: listener.pid,
    waitedMs: wait.waitedMs
  };
}

async function main() {
  const result = await stopMia();

  if (result.stopped === false && result.reason === "port_free") {
    console.log(`[MIA] Port ${PORT} is free — nothing to stop.`);
    process.exit(0);
  }

  if (!result.ok && result.reason === "foreign_process") {
    console.error(`[MIA] Port ${PORT} is held by PID ${result.pid}, which does not look like MIA:`);
    if (result.commandLine) {
      console.error(`  ${result.commandLine}`);
    }
    console.error("[MIA] Refusing to stop a foreign process. Use --force to override.");
    process.exit(1);
  }

  if (!result.ok) {
    console.error(`[MIA] Failed to stop PID ${result.pid}: ${result.reason || "timeout"}`);
    process.exit(1);
  }

  console.log(`[MIA] Stopped PID ${result.pid} on port ${PORT}.`);
  process.exit(0);
}

if (require.main === module) {
  main().catch((err) => {
    console.error("[MIA] stop script failed:", err.message);
    process.exit(1);
  });
}

module.exports = { stopMia };
