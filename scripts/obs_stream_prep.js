"use strict";

/**
 * Příprava streamu: kamera + layout + refresh overlay cache.
 * Usage: npm run obs:prep-stream
 */

const path = require("path");
const { spawnSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");

function runNode(scriptName) {
  const result = spawnSync(process.execPath, [path.join(ROOT, "scripts", scriptName)], {
    cwd: ROOT,
    encoding: "utf8",
    timeout: 60000,
    windowsHide: true
  });
  return {
    script: scriptName,
    ok: result.status === 0,
    exitCode: result.status,
    stdout: (result.stdout || "").trim(),
    stderr: (result.stderr || "").trim()
  };
}

function parseJson(stdout) {
  try {
    return JSON.parse(stdout);
  } catch (_err) {
    return null;
  }
}

async function main() {
  const steps = [
    runNode("obs_verify_camera.js"),
    runNode("obs_fix_overlay_layout.js"),
    runNode("obs_refresh_overlays.js")
  ];

  const report = {
    ok: steps.every((step) => step.ok),
    steps: steps.map((step) => ({
      script: step.script,
      ok: step.ok,
      body: parseJson(step.stdout) || { raw: step.stdout.slice(-500) },
      error: step.ok ? null : step.stderr || step.stdout || "failed"
    }))
  };

  console.log(JSON.stringify(report, null, 2));
  process.exitCode = report.ok ? 0 : 1;
}

main().catch((err) => {
  console.error(JSON.stringify({ ok: false, error: err.message }));
  process.exitCode = 1;
});
