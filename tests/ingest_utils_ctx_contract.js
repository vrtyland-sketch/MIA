"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const { buildIngestUtilsCtx } = require("../scripts/MIA_INGEST_UTILS_CTX");
const { createIngestUtilsRuntime } = require("../scripts/MIA_INGEST_UTILS_RUNTIME");

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
  await test("buildIngestUtilsCtx flattens grouped host", () => {
    const getOverlayState = () => ({ chatFeed: [] });
    const ctx = buildIngestUtilsCtx({
      core: { safeString: String, runtimeConfig: {} },
      modules: { overlayStateModule: {} },
      state: { getOverlayState },
      handlers: { getUserLabel: () => "Viewer", getAvatarUrl: () => "url" }
    });
    assert.equal(ctx.getOverlayState, getOverlayState);
    assert.equal(ctx.getUserLabel(), "Viewer");
  });

  await test("createIngestUtilsRuntime accepts buildIngestUtilsCtx shape", () => {
    const api = createIngestUtilsRuntime(
      buildIngestUtilsCtx({
        core: { safeString: String, runtimeConfig: {} },
        modules: { overlayStateModule: {} },
        state: { getOverlayState: () => ({ chatFeed: [] }) },
        handlers: { getUserLabel: () => "Viewer", getAvatarUrl: () => "url" }
      })
    );
    assert.equal(typeof api.pushChatFeed, "function");
  });

  await test("index.js uses collectIngestUtilsHost and buildIngestUtilsCtx", () => {
    const indexSrc = fs.readFileSync(path.join(ROOT, "index.js"), "utf8");
    assert.match(indexSrc, /function collectIngestUtilsHost\(\)/);
    assert.match(indexSrc, /MIA_INGEST_UTILS_CTX/);
    assert.match(indexSrc, /MIA_INGEST_UTILS_HOST/);
    assert.match(indexSrc, /buildHost\(collectIngestUtilsBindingsHost\(\)\)/);
    assert.doesNotMatch(indexSrc, /createIngestUtilsRuntime\(\{\s*safeString,/);
  });

  console.log("ingest_utils_ctx_contract: all passed");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
