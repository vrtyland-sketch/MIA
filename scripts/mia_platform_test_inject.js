"use strict";

/**
 * Dry-run: print or POST synthetic chat events for 4 platforms.
 *   node scripts/mia_platform_test_inject.js           # print only
 *   node scripts/mia_platform_test_inject.js --post    # POST /ingest
 *
 * Does not enable gift/economy. Safe for Core freeze (COMMENT only).
 */

const {
  testHarness,
  readiness
} = require("../shared/platform_integration");

const POST = process.argv.includes("--post");
const ingestUrl =
  process.env.MIA_INGEST_URL ||
  readiness.loadDotEnv().MIA_INGEST_URL ||
  "http://127.0.0.1:3000/ingest";

async function main() {
  const events = testHarness.buildFourPlatformChatBurst("integration layer smoke");
  if (!POST) {
    console.log(JSON.stringify({ mode: "print", events }, null, 2));
    console.error("Re-run with --post to send to", ingestUrl);
    return;
  }

  const results = [];
  for (const event of events) {
    try {
      const res = await fetch(ingestUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(event)
      });
      const text = await res.text();
      results.push({ platform: event.platform, status: res.status, body: text.slice(0, 200) });
    } catch (err) {
      results.push({ platform: event.platform, status: 0, error: err.message });
    }
  }
  console.log(JSON.stringify({ mode: "post", ingestUrl, results }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
