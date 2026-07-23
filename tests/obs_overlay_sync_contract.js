"use strict";

const assert = require("assert/strict");
const { createObsOverlaySync } = require("../scripts/MIA_OBS_OVERLAY_SYNC");

function test(name, fn) {
  return Promise.resolve()
    .then(() => fn())
    .then(() => console.log(`ok - ${name}`))
    .catch((err) => {
      console.error(`fail - ${name}`);
      throw err;
    });
}

function makeApi(overrides = {}) {
  return createObsOverlaySync({
    getObs: () => null,
    getObsConnected: () => false,
    getSplitOverlays: () => ({ speech: "http://127.0.0.1:3000/speech" }),
    getOverlayBase: () => "http://127.0.0.1:3000",
    runtimeConfig: { obs: { overlayMode: "split" } },
    safeString: (v, d) => (v == null || v === "" ? d || "" : String(v)),
    writeLog: () => {},
    obsFixLayoutModule: {},
    buildVisionContext: () => ({}),
    getVoicePlaybackSnapshot: () => ({}),
    obsHandsModule: {},
    obsAwaySceneModule: {},
    obsStreamerCamerasModule: {},
    selfRestartModule: {},
    getMiaEyes: () => null,
    setStartupSlideActiveUntil: () => {},
    ...overrides
  });
}

async function run() {
  await test("createObsOverlaySync exposes overlay sync API", () => {
    const api = makeApi();
    const keys = [
      "resolveObsOverlayMode",
      "auditObsMiaBrowserSources",
      "applyObsBrowserSourceProfile",
      "ensureObsVoiceBrowserReady",
      "fixObsOverlayBrowserLayouts",
      "fixObsOverlaySceneTransforms",
      "ensureObsHands",
      "ensureObsStreamerCameras",
      "flashStartupCheckBrowserSource",
      "configureObsMiaLiveHub",
      "ensureObsMiaSourceVisibleInProgramScene",
      "refreshObsMiaBrowserSources",
      "scheduleObsBrowserRefresh",
      "obsBrowserRefreshOnConnectEnabled",
      "obsBrowserRefreshOnOverlayEnabled"
    ];
    for (const key of keys) {
      assert.equal(typeof api[key], "function", `missing ${key}`);
    }
  });

  await test("resolveObsOverlayMode prefers env then runtimeConfig", () => {
    const prev = process.env.MIA_OBS_OVERLAY_MODE;
    process.env.MIA_OBS_OVERLAY_MODE = "hub";
    try {
      assert.equal(makeApi().resolveObsOverlayMode(), "hub");
      assert.equal(
        makeApi({ runtimeConfig: { obs: { overlayMode: "split" } } }).resolveObsOverlayMode(),
        "hub"
      );
    } finally {
      if (prev == null) delete process.env.MIA_OBS_OVERLAY_MODE;
      else process.env.MIA_OBS_OVERLAY_MODE = prev;
    }
  });

  await test("ensureObsHands skips when disabled", async () => {
    const prev = process.env.MIA_OBS_HANDS;
    process.env.MIA_OBS_HANDS = "0";
    try {
      const result = await makeApi().ensureObsHands();
      assert.equal(result.skipped, true);
      assert.equal(result.ok, true);
    } finally {
      if (prev == null) delete process.env.MIA_OBS_HANDS;
      else process.env.MIA_OBS_HANDS = prev;
    }
  });

  await test("auditObsMiaBrowserSources fails closed without OBS", async () => {
    const result = await makeApi().auditObsMiaBrowserSources();
    assert.equal(result.ok, false);
    assert.equal(result.reason, "obs_not_connected");
  });

  console.log("obs_overlay_sync_contract: all passed");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
