"use strict";

const assert = require("assert");
const {
  createMiaEyes,
  analyzePngBase64Luminance,
  normalizeScreenshotBase64
} = require("../scripts/MIA_EYES");

const { PNG } = require("pngjs");

function solidPngBase64(r, g, b) {
  return new Promise((resolve, reject) => {
    const png = new PNG({ width: 8, height: 8 });
    for (let i = 0; i < png.data.length; i += 4) {
      png.data[i] = r;
      png.data[i + 1] = g;
      png.data[i + 2] = b;
      png.data[i + 3] = 255;
    }
    const chunks = [];
    png
      .pack()
      .on("data", (chunk) => chunks.push(chunk))
      .on("end", () => resolve(Buffer.concat(chunks).toString("base64")))
      .on("error", reject);
  });
}

function createMockObs(blackB64) {
  const inputs = [
    { inputName: "T1_VIDEO_01", inputKind: "ffmpeg_source" },
    { inputName: "T1_VIDEO_02", inputKind: "ffmpeg_source" },
    { inputName: "T2_VIDEO_05", inputKind: "ffmpeg_source" },
    { inputName: "MIA_BUBBLE", inputKind: "browser_source" }
  ];

  const sceneItems = [
    { sourceName: "T1_VIDEO_01", sceneItemId: 11, sceneItemEnabled: false },
    { sourceName: "T1_VIDEO_02", sceneItemId: 12, sceneItemEnabled: true },
    { sourceName: "T2_VIDEO_05", sceneItemId: 13, sceneItemEnabled: false },
    { sourceName: "Video Capture Device", sceneItemId: 99, sceneItemEnabled: true }
  ];
  const settings = {
    T1_VIDEO_01: {
      local_file: "C:/Videos/arrival.mp4"
    },
    T1_VIDEO_02: {
      local_file: "C:/Videos/feeding.mp4"
    },
    T2_VIDEO_05: {
      local_file: "C:/Videos/sock.mp4"
    }
  };

  return async function safeObsCall(requestType, requestData = {}) {
    switch (requestType) {
      case "GetInputList":
        return { ok: true, response: { inputs } };
      case "GetSceneItemList":
        return { ok: true, response: { sceneItems } };
      case "GetCurrentProgramScene":
        return { ok: true, response: { sceneName: "SPINAK_ENGINE_GIFTS" } };
      case "GetInputSettings":
        return {
          ok: true,
          response: {
            inputSettings: settings[requestData.inputName] || {}
          }
        };
      case "GetSceneItemId":
        return {
          ok: true,
          response: {
            sceneItemId:
              sceneItems.find((x) => x.sourceName === requestData.sourceName)?.sceneItemId || 1
          }
        };
      case "GetSceneItemEnabled":
        return {
          ok: true,
          response: {
            sceneItemEnabled:
              sceneItems.find((x) => x.sceneItemId === requestData.sceneItemId)?.sceneItemEnabled ||
              false
          }
        };
      case "GetSceneItemTransform":
        return {
          ok: true,
          response: {
            sceneItemTransform: {
              positionX: 0,
              positionY: 0,
              scaleX: 1,
              scaleY: 1,
              sourceWidth: 1920,
              sourceHeight: 1080
            }
          }
        };
      case "GetMediaInputStatus":
        return {
          ok: true,
          response: {
            mediaState: "OBS_MEDIA_STATE_PLAYING",
            mediaDuration: 5000,
            mediaCursor: 1200
          }
        };
      case "GetSourceScreenshot":
        return {
          ok: true,
          response: {
            imageData:
              requestData.sourceName === "Video Capture Device"
                ? blackB64
                : Buffer.from("fakepng").toString("base64")
          }
        };
      case "SetSceneItemEnabled": {
        const item = sceneItems.find((x) => x.sceneItemId === requestData.sceneItemId);
        if (item) item.sceneItemEnabled = requestData.sceneItemEnabled;
        return { ok: true, response: {} };
      }      default:
        return { ok: false, reason: `unexpected_${requestType}` };
    }
  };
}

async function run() {
  const blackB64 = await solidPngBase64(0, 0, 0);
  const brightB64 = await solidPngBase64(220, 220, 220);

  const eyes = createMiaEyes({
    runtimeConfig: {
      obs: {
        sceneName: "SPINAK_ENGINE_GIFTS",
        tierSources: {
          T1: ["T1_VIDEO_01", "T1_VIDEO_02"],
          T2: ["T2_VIDEO_05"]
        }
      }
    },
    safeObsCall: createMockObs(blackB64)
  });
  const scan = await eyes.scanCatalog({ force: true });
  assert.equal(scan.ok, true);
  assert.equal(scan.items.length, 3);

  const view = await eyes.getPlaybackView();
  assert.equal(view.onGiftScene, true);
  assert.equal(view.activeVideos.length, 1);
  assert.equal(view.activeVideos[0].sourceName, "T1_VIDEO_02");
  assert.equal(view.playingNow.length, 1);

  const story = {
    id: "sock_rocket_saga",
    beats: [
      { id: "arrival", caption: "{user} přichází", videoTier: "T1", videoSource: "T1_VIDEO_01" },
      { id: "feeding", caption: "{user} krmí", videoTier: "T1" }
    ]
  };

  const plan = eyes.buildStoryPlanFromEyes(story, "Karel");
  assert.equal(plan.length, 2);
  assert.equal(plan[0].sourceName, "T1_VIDEO_01");
  assert.equal(plan[0].pickedBy, "manifest");
  assert.equal(plan[0].caption, "Karel přichází");
  assert.equal(plan[1].pickedBy, "eyes_tier_pool");

  const shot = await eyes.captureScreenshot({ sourceName: "T1_VIDEO_01", save: false });
  assert.equal(shot.ok, true);
  assert.equal(shot.sourceName, "T1_VIDEO_01");

  const blackLum = await analyzePngBase64Luminance(blackB64);
  assert.equal(blackLum.ok, true);
  assert.ok(blackLum.avgLum < 10, "black png is dark");

  const brightLum = await analyzePngBase64Luminance(brightB64);
  assert.ok(brightLum.avgLum > 100, "bright png is bright");

  const prefixedLum = await analyzePngBase64Luminance(`data:image/png;base64,${blackB64}`);
  assert.equal(prefixedLum.ok, true);
  assert.ok(prefixedLum.avgLum < 10, "data-uri prefix stripped for luminance");
  assert.equal(normalizeScreenshotBase64(`data:image/png;base64,${blackB64}`), blackB64);

  const webcam = await eyes.syncWebcamVisibility();
  assert.equal(webcam.ok, true);
  assert.equal(webcam.action, "hide");
  assert.equal(webcam.enabled, false);

  console.log("✅ mia eyes contract passed");}

run().catch((err) => {
  console.error("❌ mia eyes contract failed:", err);
  process.exit(1);
});
