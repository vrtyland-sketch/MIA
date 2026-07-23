"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const { buildIngestDeduperCtx } = require("../scripts/MIA_INGEST_DEDUPER_CTX");
const { createIngestDeduper } = require("../scripts/MIA_INGEST_GUARD");

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
  await test("buildIngestDeduperCtx flattens grouped host", () => {
    const writeLog = () => {};
    const ctx = buildIngestDeduperCtx({
      core: { windowMs: 5000, writeLog }
    });
    assert.equal(ctx.windowMs, 5000);
    assert.equal(ctx.appendJsonLog, writeLog);
  });

  await test("createIngestDeduper accepts buildIngestDeduperCtx shape", () => {
    const api = createIngestDeduper(
      buildIngestDeduperCtx({
        core: { windowMs: 4500, writeLog: () => {} }
      })
    );
    assert.equal(typeof api.checkDuplicate, "function");
  });

  await test("index.js uses collectIngestDeduperBindingsHost and buildIngestDeduperHost", () => {
    const indexSrc = fs.readFileSync(path.join(ROOT, "index.js"), "utf8");
    assert.match(indexSrc, /function collectIngestDeduperBindingsHost\(\)/);
    assert.match(indexSrc, /MIA_INGEST_DEDUPER_HOST/);
    assert.match(indexSrc, /buildCtx\(collectIngestDeduperHost\(\)\)/);
    assert.match(indexSrc, /function initIngestDeduperRuntime\(\)/);
    assert.doesNotMatch(indexSrc, /function initIngestDeduper\(\)/);
    assert.doesNotMatch(indexSrc, /createIngestDeduper\(\{\s*windowMs:/);
  });

  console.log("ingest_deduper_ctx_contract: all passed");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
