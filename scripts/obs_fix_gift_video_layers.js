"use strict";

const path = require("path");
const { applyCatalogToObs } = require("./media_apply_obs");
const { triggerExternalRestart, shouldRestartAfterMediaApply } = require("./MIA_SELF_RESTART");

const PROJECT_ROOT = path.resolve(__dirname, "..");

function loadLocalEnv() {
  const fs = require("fs");
  const envPath = path.join(PROJECT_ROOT, ".env");
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

async function main() {
  loadLocalEnv();
  const report = await applyCatalogToObs();
  console.log(
    JSON.stringify(
      {
        ok: report.missing?.length === 0,
        catalogApplied: report.applied?.length || 0,
        missing: report.missing || [],
        skipped: report.skipped || [],
        restart: shouldRestartAfterMediaApply(report)
          ? triggerExternalRestart("obs_fix_gift_layers", { delayMs: 1200 })
          : { scheduled: false },
        hint: "Jen cesty k videím — OBS layout se nemění (MIA_OBS_LAYOUT_LOCKED)."
      },
      null,
      2
    )
  );
  process.exitCode = report.missing?.length ? 1 : 0;
}

main().catch((err) => {
  console.error(err?.message || err);
  process.exitCode = 1;
});
