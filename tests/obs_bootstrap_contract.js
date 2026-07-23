"use strict";

const assert = require("assert/strict");
const {
  createObsBootstrap,
  probeTcpPort,
  detectObsProcessRunning
} = require("../scripts/MIA_OBS_BOOTSTRAP");
const { buildPresentationPlan } = require("../scripts/MIA_PRESENTATION_PLAN");

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (err) {
    console.error(`fail - ${name}`);
    throw err;
  }
}

test("detectObsProcessRunning returns boolean", () => {
  assert.equal(typeof detectObsProcessRunning(), "boolean");
});

test("createObsBootstrap ensureObsConnected reports state", async () => {
  const state = {
    obs: null,
    obsConnected: false,
    connectingPromise: null,
    reconnectTimer: null,
    lastFailLogAt: 0
  };

  const api = createObsBootstrap({
    state,
    OBSWebSocket: null,
    runtimeConfig: { obs: { url: "ws://127.0.0.1:4455" } },
    writeLog: () => {},
    port: 3000,
    onAfterConnect: async () => ({ ok: true })
  });

  const result = await api.ensureObsConnected("test");
  assert.equal(result.obsConnected, false);
  assert.equal(result.ok, false);
});

test("buildPresentationPlan structures gift overlays", () => {
  const ctx = {
    eventType: "GIFT",
    normalized: { giftName: "Rose" },
    scratch: {
      actionResult: {
        shouldPlayVideo: true,
        overlayPayload: { owner: "mia", text: "Díky" },
        meta: { giftPresentationPlan: { tier: "T1" }, giftVideoPick: { id: "v1" } },
        tier: "T1"
      }
    }
  };

  const plan = buildPresentationPlan(ctx, { safeString: (v, d) => v || d || "" });
  assert.equal(plan.video.shouldPlay, true);
  assert.equal(plan.overlays.length, 2);
  assert.equal(plan.giftPresentation.plan.tier, "T1");
});

console.log("obs_bootstrap_contract: all passed");
