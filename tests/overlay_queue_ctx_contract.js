"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const { buildOverlayQueueCtx } = require("../scripts/MIA_OVERLAY_QUEUE_CTX");
const { createOverlayQueue } = require("../scripts/MIA_OVERLAY_QUEUE");

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
  await test("buildOverlayQueueCtx flattens grouped host", () => {
    const writeLog = () => {};
    const ctx = buildOverlayQueueCtx({
      core: { writeLog }
    });
    assert.equal(ctx.appendJsonLog, writeLog);
  });

  await test("createOverlayQueue accepts buildOverlayQueueCtx shape", () => {
    const api = createOverlayQueue(
      buildOverlayQueueCtx({
        core: { writeLog: () => {} }
      })
    );
    assert.equal(typeof api.enqueue, "function");
    assert.equal(typeof api.size, "function");
  });

  await test("index.js uses collectOverlayQueueBindingsHost and buildOverlayQueueHost", () => {
    const indexSrc = fs.readFileSync(path.join(ROOT, "index.js"), "utf8");
    assert.match(indexSrc, /function collectOverlayQueueBindingsHost\(\)/);
    assert.match(indexSrc, /MIA_OVERLAY_QUEUE_HOST/);
    assert.match(indexSrc, /buildCtx\(collectOverlayQueueHost\(\)\)/);
    assert.match(indexSrc, /function initOverlayQueueRuntime\(\)/);
    assert.doesNotMatch(indexSrc, /function initOverlayQueue\(\)/);
    assert.doesNotMatch(indexSrc, /createOverlayQueue\(\{\s*appendJsonLog:/);
  });

  console.log("overlay_queue_ctx_contract: all passed");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
