"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const {
  buildSplitUrls,
  buildTikTokAudioGuide,
  buildStreamReadyReport,
  verifyGiftVideoSlots,
  verifyBrowserOverlays,
  verifyVoiceSource,
  collectFixHints
} = require("../scripts/MIA_OBS_VERIFY");

const ROOT = path.resolve(__dirname, "..");
const SPLIT = buildSplitUrls(3000);

function test(name, fn) {
  return (async () => {
    try {
      await fn();
      console.log(`✅ ${name}`);
    } catch (err) {
      console.error(`❌ ${name}`);
      console.error(err && err.stack ? err.stack : err);
      process.exitCode = 1;
    }
  })();
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
      case "GetVirtualCamStatus":
        return { outputActive: state.virtualCamActive === true };
      case "GetCurrentProgramScene":
        return { currentProgramSceneName: sceneName };
      case "GetStreamStatus":
        return { outputActive: false };
      case "GetInputAudioMonitorType":
        return {
          monitorType:
            settings[`__monitor__${requestData.inputName}`] ||
            "OBS_MONITORING_TYPE_MONITOR_AND_OUTPUT"
        };
      default:
        throw new Error(`unexpected ${requestType}`);
    }
  };
}

async function run() {
  console.log("\n---- SPRINT E CONTRACT ----\n");

  await test("package.json exposes obs:verify-stream-ready", () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
    assert.ok(pkg.scripts["obs:verify-stream-ready"]);
  });

  await test(".env.example documents TikTok audio path", () => {
    const env = fs.readFileSync(path.join(ROOT, ".env.example"), "utf8");
    assert.match(env, /MIA_TIKTOK_MIC_DEVICE/);
    assert.match(env, /Virtual Cable/i);
  });

  await test("buildSplitUrls covers startup and combo", () => {
    assert.match(SPLIT.startupCheck, /startup-check\.html/);
    assert.match(SPLIT.combo, /combo-overlay\.html/);
  });

  await test("TikTok audio guide has VB-Cable steps", () => {
    const guide = buildTikTokAudioGuide({ MIA_OBS_VOICE_MONITOR: "and_output" });
    assert.ok(guide.steps.length >= 4);
    assert.match(guide.steps.join(" "), /CABLE/i);
  });

  await test("verifyGiftVideoSlots flags missing slot", async () => {
    const obsCall = createMockObs({
      inputs: [{ inputName: "T1_VIDEO_01", inputKind: "ffmpeg_source" }],
      settings: {
        T1_VIDEO_01: { local_file: "C:/Videos/test.mp4" }
      }
    });
    const checks = await verifyGiftVideoSlots(obsCall, { tiers: ["T1"] });
    const missing = checks.find((row) => row.id === "gift_T1_VIDEO_02");
    assert.ok(missing);
    assert.strictEqual(missing.ok, false);
  });

  await test("verifyBrowserOverlays accepts alias MIA_BUBBLE", async () => {
    const obsCall = createMockObs({
      inputs: [{ inputName: "MIA_BUBBLE", inputKind: "browser_source" }],
      settings: {
        MIA_BUBBLE: { url: SPLIT.speech, reroute_audio: false }
      },
      sceneItems: [{ sourceName: "MIA_BUBBLE", sceneItemId: 1, sceneItemEnabled: true }]
    });
    const checks = await verifyBrowserOverlays(obsCall, {
      sceneName: "SPINAK_ENGINE_GIFTS",
      splitUrls: SPLIT
    });
    const speech = checks.find((row) => row.id === "browser_speech");
    assert.ok(speech);
    assert.strictEqual(speech.ok, true);
  });

  await test("verifyVoiceSource requires reroute audio", async () => {
    const obsCall = createMockObs({
      inputs: [{ inputName: "MIA_VOICE", inputKind: "browser_source" }],
      settings: {
        MIA_VOICE: { url: SPLIT.voice, reroute_audio: false },
        __monitor__MIA_VOICE: "OBS_MONITORING_TYPE_MONITOR_AND_OUTPUT"
      },
      sceneItems: []
    });
    const checks = await verifyVoiceSource(obsCall, { splitUrls: SPLIT });
    const reroute = checks.find((row) => row.id === "voice_reroute");
    assert.strictEqual(reroute.ok, false);
  });

  await test("buildStreamReadyReport aggregates ok state", async () => {
    const obsCall = createMockObs({
      virtualCamActive: true,
      inputs: [
        { inputName: "MIA_VOICE", inputKind: "browser_source" },
        { inputName: "MIA_BUBBLE", inputKind: "browser_source" },
        { inputName: "T1_VIDEO_01", inputKind: "ffmpeg_source" },
        { inputName: "T2_VIDEO_05", inputKind: "ffmpeg_source" },
        { inputName: "T3_VIDEO_09", inputKind: "ffmpeg_source" },
        { inputName: "T4_VIDEO_13", inputKind: "ffmpeg_source" }
      ],
      settings: {
        MIA_VOICE: { url: SPLIT.voice, reroute_audio: true },
        MIA_BUBBLE: { url: SPLIT.speech },
        T1_VIDEO_01: { local_file: __filename },
        T2_VIDEO_05: { local_file: __filename },
        T3_VIDEO_09: { local_file: __filename },
        T4_VIDEO_13: { local_file: __filename },
        __monitor__MIA_VOICE: "OBS_MONITORING_TYPE_MONITOR_AND_OUTPUT"
      },
      sceneItems: [
        { sourceName: "MIA_VOICE", sceneItemId: 1 },
        { sourceName: "MIA_BUBBLE", sceneItemId: 2 }
      ]
    });

    const report = await buildStreamReadyReport({
      obsCall,
      miaOk: true,
      port: 3000,
      splitUrls: SPLIT,
      templates: {
        tierSlots: {
          T1: ["T1_VIDEO_01"],
          T2: ["T2_VIDEO_05"],
          T3: ["T3_VIDEO_09"],
          T4: ["T4_VIDEO_13"],
          T5: []
        }
      }
    });

    assert.ok(Array.isArray(report.checks));
    assert.ok(report.tiktokAudio);
    assert.ok(report.fixes.length >= 0);
    const voice = report.checks.find((row) => row.id === "voice_source");
    assert.strictEqual(voice.ok, true);
  });

  await test("collectFixHints suggests media apply for gift failures", () => {
    const hints = collectFixHints([
      { ok: false, group: "gift_video", id: "gift_T1_VIDEO_01" }
    ]);
    assert.ok(hints.some((line) => /media:apply-obs/.test(line)));
  });

  if (process.exitCode) {
    throw new Error("sprint_e_contract failed");
  }
  console.log("\nsprint_e_contract OK\n");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
