"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const graphicsStudio = require("../shared/mia-graphics-studio");
const paintAi = require("../shared/mia-paint-ai");

const ROOT = path.resolve(__dirname, "..");

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
  await test("catalog lists generate_animation and true_alpha as 12v", () => {
    const anim = graphicsStudio.getCommand("generate_animation");
    const alpha = graphicsStudio.getCommand("true_alpha");
    assert.equal(anim.phase, "12v");
    assert.equal(anim.status, "implemented");
    assert.equal(alpha.phase, "12v");
    assert.equal(alpha.status, "implemented");
    const modules = graphicsStudio.listAiAnimationModules();
    assert.equal(modules[0].id, "generate_animation");
    assert.match(modules[0].route, /animation\/generate/);
  });

  await test("true alpha keys magenta background from edges", async () => {
    const svg = `<svg width="64" height="64" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#FF00FF"/>
      <circle cx="32" cy="32" r="14" fill="#4B2AD6"/>
    </svg>`;
    const input = await sharp(Buffer.from(svg)).png().toBuffer();
    const out = await paintAi.applyTrueAlphaBuffer(input, { mode: "magenta" });
    assert.ok(out.alphaRatio > 0.4);
    assert.ok(out.alphaRatio < 0.95);
    const meta = await sharp(out.buffer).metadata();
    assert.equal(meta.hasAlpha, true);
  });

  await test("generateAnimation produces true-alpha PNG frames + sheet", async () => {
    const clipId = `test-12v-${Date.now().toString(36)}`;
    const result = await graphicsStudio.generateAnimation({
      prompt: "MIA test mascot",
      motion: "wave",
      frameCount: 4,
      width: 128,
      height: 128,
      fps: 8,
      clipId,
      packSheet: true,
      persist: true,
      encodeGif: false,
      encodeWebm: false
    });
    assert.equal(result.ok, true);
    assert.ok(result.phase === "12v" || result.phase === "13r");
    assert.equal(result.trueAlpha, true);
    assert.equal(result.frameCount, 4);
    assert.ok(result.avgAlphaRatio > 0.35, `avgAlphaRatio=${result.avgAlphaRatio}`);
    assert.ok(result.sheet?.ok);
    assert.ok(result.sheet?.sheetBase64);

    const framesDir = path.join(ROOT, "data", "mia-ai-animations", clipId, "frames");
    const files = fs.readdirSync(framesDir).filter((f) => f.endsWith(".png"));
    assert.equal(files.length, 4);

    const sample = await sharp(path.join(framesDir, files[0])).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    let transparent = 0;
    for (let i = 3; i < sample.data.length; i += 4) {
      if (sample.data[i] < 8) transparent += 1;
    }
    const ratio = transparent / (sample.info.width * sample.info.height);
    assert.ok(ratio > 0.35, `frame alpha ratio=${ratio}`);

    // cleanup test clip
    fs.rmSync(path.join(ROOT, "data", "mia-ai-animations", clipId), { recursive: true, force: true });
  });

  await test("intent resolves to generateAnimation for 2D anim request", () => {
    const intent = graphicsStudio.resolveIntentToPipeline("vygeneruj MIA wave animaci true alpha sprite sheet");
    assert.equal(intent.ok, true);
    const step = intent.steps.find((s) => /generateAnimation|generate_animation/i.test(s.command));
    assert.ok(step);
    assert.equal(step.args.motion, "wave");
    assert.equal(step.args.trueAlpha, true);
  });

  await test("AI modules include true_alpha route", () => {
    const mods = graphicsStudio.listAiModules();
    const row = mods.find((m) => m.id === "true_alpha");
    assert.ok(row);
    assert.match(row.route, /true-alpha/);
  });

  console.log("mia_graphics_studio_12v_contract: all passed");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
