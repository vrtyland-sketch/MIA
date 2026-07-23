"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const { buildParticipantCtx } = require("../scripts/MIA_PARTICIPANT_CTX");
const { createParticipantRuntime } = require("../scripts/MIA_PARTICIPANT_RUNTIME");

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
  await test("buildParticipantCtx flattens grouped host", () => {
    const getOverlayState = () => ({ recentParticipants: [] });
    const ctx = buildParticipantCtx({
      core: { safeString: String, runtimeConfig: {} },
      modules: { overlayStateModule: {} },
      state: { getOverlayState },
      handlers: { getUserLabel: () => "Alice", getAvatarUrl: () => "url" }
    });
    assert.equal(ctx.getOverlayState, getOverlayState);
    assert.equal(ctx.getUserLabel(), "Alice");
  });

  await test("createParticipantRuntime accepts buildParticipantCtx shape", () => {
    const api = createParticipantRuntime(
      buildParticipantCtx({
        core: { safeString: String, runtimeConfig: {} },
        modules: { overlayStateModule: {} },
        state: { getOverlayState: () => ({ recentParticipants: [] }) },
        handlers: { getUserLabel: () => "Alice", getAvatarUrl: () => "url" }
      })
    );
    assert.equal(typeof api.pushRecentParticipant, "function");
  });

  await test("index.js uses collectParticipantHost and buildParticipantCtx", () => {
    const indexSrc = fs.readFileSync(path.join(ROOT, "index.js"), "utf8");
    assert.match(indexSrc, /function collectParticipantHost\(\)/);
    assert.match(indexSrc, /MIA_PARTICIPANT_CTX/);
    assert.match(indexSrc, /MIA_PARTICIPANT_HOST/);
    assert.match(indexSrc, /buildHost\(collectParticipantBindingsHost\(\)\)/);
    assert.doesNotMatch(indexSrc, /createParticipantRuntime\(\{\s*safeString,/);
  });

  console.log("participant_ctx_contract: all passed");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
