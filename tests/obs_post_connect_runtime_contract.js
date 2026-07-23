"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const { createObsPostConnectRuntime } = require("../scripts/MIA_OBS_POST_CONNECT_RUNTIME");

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
  await test("createObsPostConnectRuntime exposes bootstrapObsAfterConnect", () => {
    const api = createObsPostConnectRuntime({
      writeLog: () => {},
      safeString: (v, d) => String(v ?? d ?? ""),
      runtimeConfig: { obs: { sceneName: "TEST_SCENE" } },
      ensureObsHands: async () => ({ ok: true }),
      configureObsMiaLiveHub: async () => ({ configured: ["MIA_HUB"] }),
      fixObsOverlayBrowserLayouts: async () => {},
      fixObsOverlaySceneTransforms: async () => {},
      ensureObsMiaSourceVisibleInProgramScene: async () => ({ ok: true }),
      videoEngine: null,
      ensureObsVoiceBrowserReady: async () => {},
      obsVision: null,
      obsBrowserRefreshOnConnectEnabled: () => false,
      refreshObsMiaBrowserSources: async () => ({}),
      miaEyes: null
    });
    assert.equal(typeof api.bootstrapObsAfterConnect, "function");
  });

  await test("bootstrapObsAfterConnect runs post-connect chain", async () => {
    const calls = [];

    const result = await createObsPostConnectRuntime({
      writeLog: () => {},
      safeString: (v, d) => String(v ?? d ?? ""),
      runtimeConfig: { obs: { sceneName: "GIFTS", vision: { intervalMs: 3000 } } },
      ensureObsHands: async (opts) => {
        calls.push(["hands", opts.restartReason]);
        return { ok: true };
      },
      configureObsMiaLiveHub: async () => {
        calls.push(["hub"]);
        return { configured: ["MIA_LIVE"] };
      },
      fixObsOverlayBrowserLayouts: async () => calls.push(["layouts"]),
      fixObsOverlaySceneTransforms: async () => calls.push(["transforms"]),
      ensureObsMiaSourceVisibleInProgramScene: async (names) => {
        calls.push(["visible", names]);
      },
      videoEngine: {
        ensurePersistentStreamOverlaysOnTop: async (scene) => {
          calls.push(["overlaysOnTop", scene]);
        }
      },
      ensureObsVoiceBrowserReady: async () => calls.push(["voice"]),
      obsVision: {
        isEnabled: () => true,
        startWatch: () => ({ ok: true })
      },
      obsBrowserRefreshOnConnectEnabled: () => true,
      refreshObsMiaBrowserSources: async () => calls.push(["refresh"]),
      miaEyes: {
        syncWebcamVisibility: async () => ({ action: "show", sourceName: "Cam", avgLum: 0.2 })
      }
    }).bootstrapObsAfterConnect();

    assert.deepEqual(calls[0], ["hands", "obs_hands_bootstrap"]);
    assert.deepEqual(calls[1], ["hub"]);
    assert.deepEqual(calls[2], ["layouts"]);
    assert.deepEqual(calls[3], ["transforms"]);
    assert.deepEqual(calls[4], ["visible", ["MIA_LIVE"]]);
    assert.deepEqual(calls[5], ["overlaysOnTop", "GIFTS"]);
    assert.deepEqual(calls[6], ["voice"]);
    assert.ok(calls.some((row) => row[0] === "refresh"));
    assert.equal(result.handsResult.ok, true);
  });

  await test("index.js wires obsPostConnectRuntime with thin bootstrap wrapper", () => {
    const indexSrc = fs.readFileSync(path.join(ROOT, "index.js"), "utf8");
    assert.match(indexSrc, /initObsPostConnectRuntime/);
    assert.match(indexSrc, /MIA_OBS_POST_CONNECT_RUNTIME/);
    assert.match(indexSrc, /MIA_OBS_POST_CONNECT_CTX/);
    assert.match(
      indexSrc,
      /async function bootstrapObsAfterConnect\(\) \{\s*return obsPostConnectRuntime\(\)\.bootstrapObsAfterConnect\(\);/
    );
    assert.doesNotMatch(indexSrc, /ensurePersistentStreamOverlaysOnTop\(sceneName/);
  });

  console.log("obs_post_connect_runtime_contract: all passed");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
