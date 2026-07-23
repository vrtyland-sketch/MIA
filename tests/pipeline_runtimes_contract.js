"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");

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
  await test("index.js uses initPipelineRuntimesRuntime orchestrator", () => {
    const indexSrc = fs.readFileSync(path.join(ROOT, "index.js"), "utf8");
    assert.match(indexSrc, /let pipelineRuntimesApi = null/);
    assert.match(indexSrc, /function initPipelineRuntimesRuntime\(\)/);
    assert.match(indexSrc, /function pipelineRuntimesRuntime\(\)/);
    assert.match(indexSrc, /handleDebugGift\(req, res\);\s*\n\}\s*\n\s*initPipelineRuntimesRuntime\(\);/);
    assert.match(indexSrc, /initOverlayPublicRuntime\(\);\s*\n\s*initCareCommandsRuntime\(\);/);
    assert.match(
      indexSrc,
      /initStoryFeedRuntime\(\);\s*\n\s*initGiftMediaRuntime\(\);\s*\n\s*initGiftRuntime\(\);\s*\n\s*initParticipantRuntime\(\);\s*\n\s*initWorldModeRuntime\(\);/
    );
    assert.match(indexSrc, /initCapybaraFlowRuntime\(\);\s*\n\s*initStreamerMediaRuntime\(\);/);
    assert.doesNotMatch(indexSrc, /initOverlayPublicRuntime\(\);\s*\ninitCareCommandsRuntime\(\);\s*\ninitKojMomentsRuntime\(\);\s*\ninitActionBuilderRuntime\(\);\s*\ninitStatusRuntime\(\);\s*\nfunction buildMiaStatusResponse/);
  });

  console.log("pipeline_runtimes_contract: all passed");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
