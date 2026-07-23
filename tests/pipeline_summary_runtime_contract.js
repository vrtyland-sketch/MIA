"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
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
  await test("recordIngestSummary stores summary with timestamps", () => {
    let saved = null;
    createPipelineSummaryRuntime({
      setLastIngestSummary: (summary) => {
        saved = summary;
      },
      nowIso: () => "2026-01-01T00:00:00.000Z"
    }).recordIngestSummary({ lane: "community", ok: true });

    assert.equal(saved.lane, "community");
    assert.equal(saved.atIso, "2026-01-01T00:00:00.000Z");
    assert.equal(typeof saved.at, "number");
  });

  await test("recordShadowPipelineSummary skips when summarizer missing", () => {
    let called = false;
    createPipelineSummaryRuntime({
      statusSnapshotModule: {},
      setLastShadowPipelineSummary: () => {
        called = true;
      }
    }).recordShadowPipelineSummary({ ok: true });
    assert.equal(called, false);
  });

  await test("recordShadowPipelineSummary stores shadow summary", () => {
    let saved = null;
    createPipelineSummaryRuntime({
      statusSnapshotModule: {
        summarizeShadowPipelineResult: () => ({ route: "support" })
      },
      setLastShadowPipelineSummary: (summary) => {
        saved = summary;
      },
      nowIso: () => "iso"
    }).recordShadowPipelineSummary({ ok: true });

    assert.equal(saved.route, "support");
    assert.equal(saved.atIso, "iso");
  });

  await test("index.js wires pipelineSummaryRuntime with thin wrappers", () => {
    const indexSrc = fs.readFileSync(path.join(ROOT, "index.js"), "utf8");
    assert.match(indexSrc, /initPipelineSummaryRuntime/);
    assert.match(indexSrc, /MIA_PIPELINE_SUMMARY_RUNTIME/);
    assert.match(indexSrc, /MIA_PIPELINE_SUMMARY_CTX/);
    assert.doesNotMatch(indexSrc, /summarizeShadowPipelineResult/);
  });

  console.log("pipeline_summary_runtime_contract: all passed");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
