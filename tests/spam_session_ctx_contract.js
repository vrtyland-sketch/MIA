"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const { buildSpamSessionCtx } = require("../scripts/MIA_SPAM_SESSION_CTX");
const spamSessionEngine = require("../MIA_NEXT/engine_spam_session");

const ROOT = path.resolve(__dirname, "..");

function test(name, fn) {
  return Promise.resolve()
    .then(() => fn())
    .then(() => console.log(`ok - ${name}`))
    .catch((err) => {
      console.error(`fail - ${name}`);
      throw err;
    });
}

async function run() {
  await test("buildSpamSessionCtx flattens grouped host", () => {
    const ctx = buildSpamSessionCtx({
      core: {
        spamConfig: {
          windowMs: 7000,
          minSequenceCount: 4,
          rewardThresholds: [{ count: 3, reward: "combo" }]
        }
      }
    });
    assert.equal(ctx.windowMs, 7000);
    assert.equal(ctx.minSequenceCount, 4);
    assert.deepEqual(ctx.rewardThresholds, [{ count: 3, reward: "combo" }]);
  });

  await test("configureSpamSession accepts buildSpamSessionCtx shape", () => {
    if (typeof spamSessionEngine.configureSpamSession !== "function") {
      return;
    }
    const state = spamSessionEngine.configureSpamSession(
      buildSpamSessionCtx({
        core: { spamConfig: { windowMs: 8000, minSequenceCount: 3 } }
      })
    );
    assert.equal(typeof state, "object");
  });

  await test("index.js uses collectSpamSessionHost and initSpamSessionRuntime", () => {
    const indexSrc = fs.readFileSync(path.join(ROOT, "index.js"), "utf8");
    assert.match(indexSrc, /function collectSpamSessionHost\(\)/);
    assert.match(indexSrc, /MIA_SPAM_SESSION_CTX/);
    assert.match(indexSrc, /MIA_SPAM_SESSION_HOST/);
    assert.match(indexSrc, /buildHost\(collectSpamSessionBindingsHost\(\)\)/);
    assert.match(indexSrc, /function initSpamSessionRuntime\(\)/);
    assert.match(indexSrc, /function spamSessionRuntime\(\)/);
    assert.match(indexSrc, /function initMediaSingletonsRuntime\(\)/);
    assert.doesNotMatch(indexSrc, /function initSpamSessionConfig\(\)/);
    assert.doesNotMatch(indexSrc, /configureSpamSession\(\{\s*windowMs: spamConfig/);
  });

  console.log("spam_session_ctx_contract: all passed");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
