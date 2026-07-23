"use strict";

/**
 * Příprava před TikTok live — sekvenční orchestrátor.
 * Usage:
 *   npm run live:prep
 *   npm run live:prep -- --skip-restart
 *   npm run live:prep -- --human
 */

const { spawnSync } = require("child_process");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");

function runStep(label, cmd, args, extraEnv = {}) {
  const started = Date.now();
  console.log(`\n[LIVE PREP] ${label}…`);
  const result = spawnSync(cmd, args, {
    cwd: ROOT,
    encoding: "utf8",
    shell: process.platform === "win32",
    env: { ...process.env, ...extraEnv }
  });
  const output = `${result.stdout || ""}${result.stderr || ""}`.trim();
  if (output) {
    console.log(output);
  }
  const ms = Date.now() - started;
  const ok = result.status === 0;
  console.log(`[LIVE PREP] ${label}: ${ok ? "OK" : "FAIL"} (${ms} ms)`);
  return { label, ok, exitCode: result.status, ms, output: output.slice(-600) };
}

async function runLivePrep(options = {}) {
  const argv = options.argv || process.argv;
  const skipRestart = options.skipRestart ?? argv.includes("--skip-restart");
  const human = options.human ?? argv.includes("--human");
  const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";

  const steps = [];
  if (!skipRestart) {
    steps.push(runStep("restart MIA", npmCmd, ["run", "restart", "--", "--delay=0", "--reason=live_prep"]));
  }
  steps.push(runStep("OBS Virtual Camera", npmCmd, ["run", "obs:prepare-tiktok"]));
  steps.push(runStep("TTS + MIA_VOICE", npmCmd, ["run", "obs:ensure-voice"]));
  steps.push(
    runStep(
      "stream-ready check",
      npmCmd,
      ["run", "obs:stream-ready", "--", ...(human ? ["--human"] : [])]
    )
  );

  const failed = steps.filter((step) => !step.ok);
  const report = {
    ok: failed.length === 0,
    steps,
    failed: failed.map((step) => step.label),
    finishedAt: new Date().toISOString()
  };

  console.log(`\n[LIVE PREP] ${report.ok ? "HOTOVO — připraveno na live" : "NEHOTOVO — viz výše"}\n`);
  return report;
}

async function main() {
  const report = await runLivePrep();
  process.exitCode = report.ok ? 0 : 1;
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err?.message || err);
    process.exitCode = 1;
  });
}

module.exports = { runLivePrep, runStep };
