"use strict";

/**
 * CLI: npm run platform:status
 * Shows Multi-Platform Integration Layer readiness (no secrets printed raw).
 */

const { assessAll, loadDotEnv } = require("../shared/platform_integration");
const { loadStoredLiveSignals } = require("../shared/platform_integration/liveSignals");

const report = assessAll(loadDotEnv(), { liveSignals: loadStoredLiveSignals() });
console.log(JSON.stringify(report, null, 2));

if (!report.summary.configuredReady) {
  console.error("\n[platform:status] Four-way credentials are not configured.");
  console.error("Blocked:", report.summary.blocked.join(", ") || "(none)");
  console.error("Disabled:", report.summary.disabled.join(", ") || "(none)");
  console.error("configuredReady=false. This check does not prove live chat.");
  console.error("→ docs/MIA_MULTI_PLATFORM_OPERATOR_CHECKLIST.md");
  process.exitCode = 2;
} else if (!report.summary.liveReady) {
  console.error("\n[platform:status] Credentials configured. Live inputs are not proven.");
  console.error("configuredReady=true runtimeReady=false liveReady=false");
  console.error("fourWayReady is the credential layer only (impliesLiveInputs=false).");
} else {
  console.error("\n[platform:status] TikTok + Kick + Twitch + YouTube have recent live ingest.");
}
