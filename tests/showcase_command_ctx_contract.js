"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const { buildShowcaseCommandCtx } = require("../scripts/MIA_SHOWCASE_COMMAND_CTX");
const { createShowcaseCommandRuntime } = require("../scripts/MIA_SHOWCASE_COMMAND_RUNTIME");

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
  await test("buildShowcaseCommandCtx flattens grouped host", () => {
    const getOverlayState = () => ({});
    const ctx = buildShowcaseCommandCtx({
      modules: {
        streamerShowcaseModule: {},
        streamerIdentityModule: {},
        overlayStateModule: {},
        kojTestModeModule: {},
        kojnozoutVitalsModule: {},
        kojnozoutDuelModule: {}
      },
      core: {
        runtimeConfig: {},
        safeString: String,
        getUserLabel: () => "Boss",
        writeLog: () => {},
        getEnv: () => ({})
      },
      state: {
        getOverlayState,
        getKojnozoutState: () => ({}),
        setKojnozoutState: () => {},
        getDuelState: () => ({}),
        setDuelState: () => {}
      },
      handlers: { executeOverlay: async () => ({}), speakMiaShowcaseLine: async () => ({}) },
      media: { videoEngine: null },
      koj: { scheduleWorldSave: () => {} }
    });
    assert.equal(ctx.getOverlayState, getOverlayState);
    assert.equal(typeof ctx.scheduleWorldSave, "function");
  });

  await test("createShowcaseCommandRuntime accepts buildShowcaseCommandCtx shape", () => {
    const api = createShowcaseCommandRuntime(
      buildShowcaseCommandCtx({
        modules: {
          streamerShowcaseModule: {},
          streamerIdentityModule: {},
          overlayStateModule: {},
          kojTestModeModule: {},
          kojnozoutVitalsModule: {},
          kojnozoutDuelModule: {}
        },
        core: {
          runtimeConfig: {},
          safeString: String,
          getUserLabel: () => "Boss",
          writeLog: () => {},
          getEnv: () => ({})
        },
        state: {
          getOverlayState: () => ({}),
          getKojnozoutState: () => ({}),
          setKojnozoutState: () => {},
          getDuelState: () => ({}),
          setDuelState: () => {}
        },
        handlers: { executeOverlay: async () => ({}), speakMiaShowcaseLine: async () => ({}) },
        media: { videoEngine: null },
        koj: { scheduleWorldSave: () => {} }
      })
    );
    assert.equal(typeof api.tryHandleKojStateShowcaseCommand, "function");
    assert.equal(typeof api.tryHandleStreamerShowcaseCommand, "function");
  });

  await test("buildShowcaseCommandCtx resolves videoEngine via getter", () => {
    const video = { id: "video" };
    const ctx = buildShowcaseCommandCtx({
      media: { getVideoEngine: () => video }
    });
    assert.equal(ctx.videoEngine.id, "video");
  });

  await test("index.js uses collectShowcaseCommandHost and buildShowcaseCommandCtx", () => {
    const indexSrc = fs.readFileSync(path.join(ROOT, "index.js"), "utf8");
    assert.match(indexSrc, /function collectShowcaseCommandHost\(\)/);
    assert.match(indexSrc, /MIA_SHOWCASE_COMMAND_CTX/);
    assert.match(indexSrc, /MIA_SHOWCASE_COMMAND_HOST/);
    assert.match(indexSrc, /buildHost\(collectShowcaseCommandBindingsHost\(\)\)/);
    assert.match(indexSrc, /initShowcaseCommandRuntime\(\)/);
    assert.doesNotMatch(indexSrc, /createShowcaseCommandRuntime\(\{\s*streamerShowcaseModule,/);
  });

  console.log("showcase_command_ctx_contract: all passed");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
