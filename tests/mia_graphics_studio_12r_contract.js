"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const {
  verifyGraphicsBodyLayers,
  buildStreamReadyReport,
  collectFixHints
} = require("../scripts/MIA_OBS_VERIFY");
const { buildBodyPartUrls } = require("../shared/mia-graphics-studio/bodyPartsCatalog");
const graphicsStudio = require("../shared/mia-graphics-studio");

async function test(name, fn) {
  try {
    await fn();
    console.log(`ok - ${name}`);
  } catch (err) {
    console.error(`fail - ${name}`);
    throw err;
  }
}

function createMockObs(state = {}) {
  const inputs = [...(state.inputs || [])];
  const settings = { ...(state.settings || {}) };
  const sceneItems = [...(state.sceneItems || [])];
  const sceneName = state.sceneName || "SPINAK_ENGINE_GIFTS";

  return async function obsCall(requestType, requestData = {}) {
    switch (requestType) {
      case "GetInputList":
        return { inputs };
      case "GetInputSettings":
        return { inputSettings: settings[requestData.inputName] || {} };
      case "GetSceneItemList":
        return { sceneItems: sceneItems.filter(() => requestData.sceneName === sceneName) };
      default:
        throw new Error(`unexpected ${requestType}`);
    }
  };
}

(async () => {
  const hybridUrls = buildBodyPartUrls("http://127.0.0.1:3000", { syncHybrid: true });

  await test("verifyGraphicsBodyLayers accepts hybrid body sources", async () => {
    const obsCall = createMockObs({
      inputs: [
        { inputName: "MIA_HEAD", inputKind: "browser_source" },
        { inputName: "MIA_EYES", inputKind: "browser_source" },
        { inputName: "MIA_HANDS", inputKind: "browser_source" },
        { inputName: "MIA_TORSO", inputKind: "browser_source" },
        { inputName: "MIA_FEET", inputKind: "browser_source" }
      ],
      settings: {
        MIA_HEAD: { url: hybridUrls.miaHead },
        MIA_EYES: { url: hybridUrls.miaEyes },
        MIA_HANDS: { url: hybridUrls.miaHands },
        MIA_TORSO: { url: hybridUrls.miaTorso },
        MIA_FEET: { url: hybridUrls.miaFeet }
      },
      sceneItems: [
        { sourceName: "MIA_HEAD", sceneItemEnabled: false },
        { sourceName: "MIA_EYES", sceneItemEnabled: false },
        { sourceName: "MIA_HANDS", sceneItemEnabled: false },
        { sourceName: "MIA_TORSO", sceneItemEnabled: false },
        { sourceName: "MIA_FEET", sceneItemEnabled: false }
      ]
    });

    const checks = await verifyGraphicsBodyLayers(obsCall, {
      port: 3000,
      env: { MIA_OBS_BODY_SYNC: "hybrid" }
    });
    const summary = checks.find((row) => row.id === "graphics_body_summary");
    assert.ok(summary);
    assert.equal(summary.ok, true);
    assert.match(summary.detail, /5\/5/);
  });

  await test("verifyGraphicsBodyLayers flags missing hybrid sync", async () => {
    const obsCall = createMockObs({
      inputs: [{ inputName: "MIA_HEAD", inputKind: "browser_source" }],
      settings: {
        MIA_HEAD: { url: "http://127.0.0.1:3000/mia-body-part-overlay.html?part=head" }
      },
      sceneItems: [{ sourceName: "MIA_HEAD", sceneItemEnabled: false }]
    });
    const checks = await verifyGraphicsBodyLayers(obsCall, {
      port: 3000,
      env: { MIA_OBS_BODY_SYNC: "hybrid" }
    });
    const head = checks.find((row) => row.id === "graphics_body_mia_head");
    assert.ok(head);
    assert.equal(head.ok, false);
    assert.match(head.detail, /hybrid/i);
  });

  await test("buildStreamReadyReport includes graphics body summary", async () => {
    const obsCall = createMockObs({
      virtualCamActive: true,
      inputs: [{ inputName: "MIA_HEAD", inputKind: "browser_source" }],
      settings: {
        MIA_HEAD: { url: hybridUrls.miaHead }
      },
      sceneItems: [{ sourceName: "MIA_HEAD", sceneItemEnabled: false }]
    });
    const report = await buildStreamReadyReport({
      obsCall,
      miaOk: true,
      port: 3000,
      env: { MIA_OBS_BODY_SYNC: "hybrid" },
      templates: { tierSlots: { T1: [], T2: [], T3: [], T4: [], T5: [] } }
    });
    assert.ok(report.summary.graphicsBody);
    assert.ok(report.checks.some((row) => row.group === "graphics_body"));
  });

  await test("collectFixHints suggests obs:apply-hands for graphics body", () => {
    const hints = collectFixHints([
      { ok: false, group: "graphics_body", id: "graphics_body_mia_head" }
    ]);
    assert.ok(hints.some((line) => /obs:apply-hands/.test(line)));
  });

  await test("obs verify stream ready applies hands fix on body failure", () => {
    const src = fs.readFileSync(
      path.join(__dirname, "..", "scripts", "obs_verify_stream_ready.js"),
      "utf8"
    );
    assert.match(src, /graphics_body/);
    assert.match(src, /bodyFailed/);
  });

  await test("graphics body phase 12r verify features", () => {
    assert.equal(typeof verifyGraphicsBodyLayers, "function");
  });

  console.log("mia_graphics_studio_12r_contract: all passed");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
