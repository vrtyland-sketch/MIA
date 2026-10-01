"use strict";

/**
 * CLI: npm run platform:status
 * Shows Multi-Platform Integration Layer readiness (no secrets printed raw).
 */

const { assessAll } = require("../shared/platform_integration");

const report = assessAll();
console.log(JSON.stringify(report, null, 2));

if (!report.summary.fourWayReady) {
  console.error("\n[platform:status] Four-way not ready yet.");
  console.error("Blocked:", report.summary.blocked.join(", ") || "(none)");
  console.error("Disabled:", report.summary.disabled.join(", ") || "(none)");
  console.error("→ docs/MIA_MULTI_PLATFORM_OPERATOR_CHECKLIST.md");
  process.exitCode = 2;
} else {
  console.error("\n[platform:status] TikTok + Kick + Twitch + YouTube READY (credentials present).");
}
