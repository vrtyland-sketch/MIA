"use strict";

const assert = require("assert/strict");
const sharp = require("sharp");
const paintAi = require("../shared/mia-paint-ai");
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

(async () => {
  await test("catalog lists visual_identity as 13a", () => {
    const def = graphicsStudio.getCommand("visual_identity");
    assert.equal(def.phase, "13a");
    assert.equal(def.status, "implemented");
  });

  await test("HOLO cyan matches speech-overlay #miaHolo", () => {
    const snap = graphicsStudio.getVisualIdentitySnapshot();
    assert.equal(snap.phase, "13a");
    assert.equal(snap.holo.c1.r, 0);
    assert.equal(snap.holo.c1.g, 220);
    assert.equal(snap.holo.c1.b, 255);
    assert.match(snap.identityPromptSuffix, /holographic AI projection/);
    assert.match(snap.identityPromptSuffix, /#00DCFF|cyan/i);
  });

  await test("withMiaIdentityPrompt appends suffix once", () => {
    const a = paintAi.withMiaIdentityPrompt("MIA wave");
    assert.match(a, /holographic AI projection/);
    const b = paintAi.withMiaIdentityPrompt(a);
    assert.equal(a, b);
  });

  await test("buildFramePrompt includes identity + true alpha", () => {
    const prompt = graphicsStudio.buildFramePrompt("MIA test", "wave", 0, 4);
    assert.match(prompt, /holographic AI projection|#00DCFF/i);
    assert.match(prompt, /#FF00FF|magenta/i);
    assert.match(prompt, /animation frame 1 of 4/);
  });

  await test("procedural true-alpha frames use locked cyan body", async () => {
    const buf = await paintAi.proceduralImage(64, 64, "identity check", {
      trueAlphaBg: true,
      frameIndex: 0,
      frameCount: 2,
      motion: "wave",
      useMiaIdentity: true
    });
    const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    let cyanish = 0;
    let opaque = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 200) continue;
      opaque += 1;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      // cyan-ish: low-mid R, high G/B (holo c1 ≈ 0,220,255; accents up to r≈120)
      if (r < 140 && g > 140 && b > 180) cyanish += 1;
    }
    assert.ok(opaque > 50, `opaque=${opaque}`);
    assert.ok(cyanish / opaque > 0.15, `cyanish ratio=${cyanish / opaque}`);
    assert.equal(info.width, 64);
  });

  await test("avatar mia preset mentions holographic cyan", () => {
    const preset = graphicsStudio.getAvatarPreset("mia");
    assert.match(preset.prompt, /holographic|cyan/i);
  });

  console.log("mia_graphics_studio_13a_identity_contract: all passed");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
