"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const { buildPipelineSummaryCtx } = require("../scripts/MIA_PIPELINE_SUMMARY_CTX");
const { createPipelineSummaryRuntime } = require("../scripts/MIA_PIPELINE_SUMMARY_RUNTIME");

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
  await test("buildPipelineSummaryCtx flattens grouped host", () => {
    let saved = null;
    const ctx = buildPipelineSummaryCtx({
      core: { nowIso: () => "iso" },
      modules: { statusSnapshotModule: {} },
      state: {
        setLastIngestSummary: (summary) => {
          saved = summary;
        },
        setLastShadowPipelineSummary: () => {}
      }
    });
    ctx.setLastIngestSummary({ lane: "community" });
    assert.equal(saved.lane, "community");
    assert.equal(ctx.nowIso(), "iso");
  });

  await test("createPipelineSummaryRuntime accepts buildPipelineSummaryCtx shape", () => {
    const api = createPipelineSummaryRuntime(
      buildPipelineSummaryCtx({
        core: { nowIso: () => "iso" },
        modules: { statusSnapshotModule: {} },
        state: {
          setLastIngestSummary: () => {},
          setLastShadowPipelineSummary: () => {}
        }
      })
    );
    assert.equal(typeof api.recordIngestSummary, "function");
  });

  await test("index.js uses collectPipelineSummaryHost and buildPipelineSummaryCtx", () => {
    const indexSrc = fs.readFileSync(path.join(ROOT, "index.js"), "utf8");
    assert.match(indexSrc, /function collectPipelineSummaryHost\(\)/);
    assert.match(indexSrc, /MIA_PIPELINE_SUMMARY_CTX/);
    assert.match(indexSrc, /MIA_PIPELINE_SUMMARY_HOST/);
    assert.match(indexSrc, /buildHost\(collectPipelineSummaryBindingsHost\(\)\)/);
    assert.match(indexSrc, /initPipelineSummaryRuntime\(\)/);
    assert.doesNotMatch(indexSrc, /createPipelineSummaryRuntime\(\{\s*statusSnapshotModule,/);
  });

  console.log("pipeline_summary_ctx_contract: all passed");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
