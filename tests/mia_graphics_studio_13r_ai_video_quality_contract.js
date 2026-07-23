"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const graphicsStudio = require("../shared/mia-graphics-studio");
const paintAi = require("../shared/mia-paint-ai");
const { listStagingMediaUrls } = require("../shared/mia-animation-engine/stagingPreview");

const ROOT = path.resolve(__dirname, "..");
const DASH = path.join(ROOT, "mia-output-overlay", "mia-streamer-dashboard.html");
const EYES = path.join(ROOT, "routes", "eyes.js");

async function test(name, fn) {
  try {
    await fn();
    console.log(`ok - ${name}`);
  } catch (err) {
    console.error(`fail - ${name}`);
    throw err;
  }
}

(async () => {
  await test("catalog lists ai_video_quality as 13r", () => {
    const def = graphicsStudio.getCommand("ai_video_quality");
    assert.equal(def.phase, "13r");
    assert.equal(def.status, "implemented");
    const mods = graphicsStudio.listAiAnimationModules();
    assert.ok(mods.some((m) => m.id === "ai_video_quality" && m.phase === "13r"));
  });

  await test("dashboard wires MP4 + staging playback", () => {
    const html = fs.readFileSync(DASH, "utf8");
    assert.match(html, /btnStagingMp4/);
    assert.match(html, /encodeStagingFormat\("mp4"\)/);
    assert.match(html, /bankStagingPlayer/);
    assert.match(html, /showStagingPlayback/);
    assert.match(html, /\/media/);
  });

  await test("eyes route exposes staging media", () => {
    const src = fs.readFileSync(EYES, "utf8");
    assert.match(src, /staging\/:stagingId\/media/);
    assert.match(src, /listStagingMediaUrls/);
  });

  await test("listStagingMediaUrls returns structure", () => {
    const result = listStagingMediaUrls("__missing_clip__");
    assert.equal(result.ok, true);
    assert.equal(result.stagingId, "__missing_clip__");
    assert.equal(result.gif, null);
    assert.equal(result.mp4, null);
  });

  await test("procedural identitySeed keeps colors stable across frames", async () => {
    const seed = paintAi.hashPrompt("mia-wave-test");
    const a = await paintAi.proceduralImage(64, 64, "frame 1 pose wave", {
      trueAlphaBg: true,
      frameIndex: 0,
      frameCount: 4,
      motion: "wave",
      identitySeed: seed,
      useMiaIdentity: true
    });
    const b = await paintAi.proceduralImage(64, 64, "frame 2 pose wave", {
      trueAlphaBg: true,
      frameIndex: 1,
      frameCount: 4,
      motion: "wave",
      identitySeed: seed,
      useMiaIdentity: true
    });
    const ra = await sharp(a).raw().toBuffer({ resolveWithObject: true });
    const rb = await sharp(b).raw().toBuffer({ resolveWithObject: true });
    // Sample opaque-ish pixels — body tint should stay in same cyan family
    let found = 0;
    for (let i = 0; i < ra.data.length; i += 4) {
      if (ra.data[i + 3] < 200) continue;
      found += 1;
      assert.ok(Math.abs(ra.data[i] - rb.data[i]) < 40, "R drift");
      assert.ok(Math.abs(ra.data[i + 1] - rb.data[i + 1]) < 40, "G drift");
      assert.ok(Math.abs(ra.data[i + 2] - rb.data[i + 2]) < 40, "B drift");
      if (found >= 8) break;
    }
    assert.ok(found >= 1, "expected opaque pixels");
  });

  await test("blendWithPreviousFrame mixes pixels", async () => {
    const cur = await sharp({
      create: { width: 8, height: 8, channels: 4, background: { r: 255, g: 0, b: 0, alpha: 1 } }
    })
      .png()
      .toBuffer();
    const prev = await sharp({
      create: { width: 8, height: 8, channels: 4, background: { r: 0, g: 0, b: 255, alpha: 1 } }
    })
      .png()
      .toBuffer();
    const mixed = await paintAi.blendWithPreviousFrame(cur, prev, 0.5);
    const { data } = await sharp(mixed).raw().toBuffer({ resolveWithObject: true });
    assert.ok(data[0] > 100 && data[0] < 160, `R ~127 got ${data[0]}`);
    assert.ok(data[2] > 100 && data[2] < 160, `B ~127 got ${data[2]}`);
  });

  await test("generateAnimation enables temporal by default", async () => {
    const result = await graphicsStudio.generateAnimation(
      {
        prompt: "MIA test mascot",
        motion: "wave",
        frameCount: 3,
        width: 64,
        height: 64,
        persist: false,
        packSheet: false,
        encodeGif: false,
        encodeWebm: false
      },
      { env: {} }
    );
    assert.equal(result.ok, true);
    assert.equal(result.temporalConsistency, true);
    assert.ok(result.identitySeed);
    assert.equal(result.phase, "13r");
    assert.ok(result.frames.some((f) => f.index > 0));
  });

  console.log("mia_graphics_studio_13r_ai_video_quality_contract: all passed");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
