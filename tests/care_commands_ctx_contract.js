"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const { buildCareCommandsCtx } = require("../scripts/MIA_CARE_COMMANDS_CTX");
const { buildCareCommandsDeps } = require("../scripts/MIA_CARE_COMMANDS_WIRING");

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
  await test("buildCareCommandsCtx flattens grouped host", () => {
    const executeOverlay = async () => ({});
    const ctx = buildCareCommandsCtx({
      core: {
        safeString: (v) => String(v ?? ""),
        upper: (v) => String(v).toUpperCase(),
        writeLog: () => {},
        getRuntimeConfig: () => ({ stream: { platform: "tiktok" } }),
        getStreamPlatformKey: () => "tiktok"
      },
      state: { getStreamState: () => ({}) },
      handlers: { executeOverlay },
      modules: { giftMapEnterprise: {}, care: { careQuestModule: { id: "quest" } } }
    });

    assert.equal(ctx.executeOverlay, executeOverlay);
    assert.equal(ctx.modules.careQuestModule.id, "quest");
    assert.equal(ctx.getStreamPlatformKey(), "tiktok");
  });

  await test("buildCareCommandsCtx matches wiring deps shape", () => {
    const deps = buildCareCommandsDeps(
      buildCareCommandsCtx({
        core: { safeString: (v) => v, upper: (v) => v, writeLog: () => {} },
        handlers: { executeOverlay: async () => ({}) },
        modules: { care: {} }
      })
    );
    assert.equal(typeof deps.safeString, "function");
    assert.equal(typeof deps.executeOverlay, "function");
  });

  await test("index.js uses collectCareCommandsHost and buildCareCommandsCtx", () => {
    const indexSrc = fs.readFileSync(path.join(ROOT, "index.js"), "utf8");
    assert.match(indexSrc, /function collectCareCommandsHost\(\)/);
    assert.match(indexSrc, /MIA_CARE_COMMANDS_CTX/);
    assert.match(indexSrc, /MIA_CARE_COMMANDS_HOST/);
    assert.match(indexSrc, /buildHost\(collectCareCommandsBindingsHost\(\)\)/);
    assert.match(indexSrc, /function initCareCommandsRuntime\(\)/);
    assert.match(indexSrc, /function initPipelineRuntimesRuntime\(\)/);
    assert.doesNotMatch(indexSrc, /function getCareCommandsCtx\(\)/);
  });

  console.log("care_commands_ctx_contract: all passed");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
