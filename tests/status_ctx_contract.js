"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const { buildStatusCtx } = require("../scripts/MIA_STATUS_CTX");
const { createStatusRuntime } = require("../scripts/MIA_STATUS_RUNTIME");

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
  await test("buildStatusCtx flattens grouped host", () => {
    const getStreamState = () => ({ audience: { viewerCount: 3 } });
    const ctx = buildStatusCtx({
      modules: { videoEngine: { getSnapshot: () => ({}) }, kojnozoutModule: {} },
      core: { cloneJson: (v) => v, runtimeConfig: {}, nowIso: () => "now", getPort: () => 3000 },
      state: {
        getStreamState,
        getKojnozoutState: () => ({}),
        getOverlayState: () => ({}),
        getOutputState: () => ({}),
        getEcosystemState: () => ({})
      }
    });

    assert.equal(ctx.getStreamState, getStreamState);
    assert.equal(ctx.getPort(), 3000);
  });

  await test("createStatusRuntime accepts buildStatusCtx shape", () => {
    const api = createStatusRuntime(
      buildStatusCtx({
        modules: { videoEngine: { getSnapshot: () => ({}) }, kojnozoutModule: {}, overlayStateModule: {} },
        core: { cloneJson: (v) => v, runtimeConfig: {}, nowIso: () => "now", getPort: () => 3000 },
        state: {
          getStreamState: () => ({}),
          getKojnozoutState: () => ({}),
          getOverlayState: () => ({}),
          getOutputState: () => ({}),
          getEcosystemState: () => ({}),
          getServerStartedAt: () => 1,
          getStreamSession: () => ({}),
          getObsConnected: () => false,
          getHostTeamScoreState: () => ({})
        }
      })
    );
    assert.equal(typeof api.buildMiaStatusResponse, "function");
  });

  await test("buildStatusCtx resolves videoEngine and spamSession via getters", () => {
    const video = { id: "video" };
    const spam = { id: "spam" };
    const ctx = buildStatusCtx({
      modules: {
        getVideoEngine: () => video,
        getSpamSessionEngine: () => spam
      }
    });
    assert.equal(ctx.videoEngine.id, "video");
    assert.equal(ctx.spamSessionEngine.id, "spam");
  });

  await test("index.js uses collectStatusHost and buildStatusCtx", () => {
    const indexSrc = fs.readFileSync(path.join(ROOT, "index.js"), "utf8");
    assert.match(indexSrc, /function collectStatusHost\(\)/);
    assert.match(indexSrc, /MIA_STATUS_CTX/);
    assert.match(indexSrc, /MIA_STATUS_HOST/);
    assert.match(indexSrc, /buildHost\(collectStatusBindingsHost\(\)\)/);
    assert.match(indexSrc, /getSpamSessionEngine: spamSessionRuntime/);
    assert.match(indexSrc, /function initPipelineRuntimesRuntime\(\)/);
    assert.match(indexSrc, /initPipelineSummaryRuntime\(\)/);
    assert.doesNotMatch(indexSrc, /createStatusRuntime\(\{\s*videoEngine,/);
  });

  console.log("status_ctx_contract: all passed");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
