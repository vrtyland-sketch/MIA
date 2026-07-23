"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const graphicsStudio = require("../shared/mia-graphics-studio");
const { getAiStagingClip, listAiStagingClips } = require("../shared/mia-animation-engine/promoteAiAnimation");

const ROOT = path.resolve(__dirname, "..");
const STAGING_ROOT = path.join(ROOT, "data", "mia-ai-animations");
const DASH = path.join(ROOT, "mia-output-overlay", "mia-streamer-dashboard.html");
const PAINT = path.join(ROOT, "mia-output-overlay", "mia-paint");

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
  await test("catalog lists dashboard_ai_generate as 13j", () => {
    const def = graphicsStudio.getCommand("dashboard_ai_generate");
    assert.equal(def.phase, "13j");
    assert.equal(def.status, "implemented");
    const mods = graphicsStudio.listAiAnimationModules();
    const row = mods.find((m) => m.id === "dashboard_ai_generate");
    assert.ok(row);
    assert.equal(row.paintQuery, "aiStaging");
    assert.match(row.stagingRoute, /staging\/:stagingId/);
  });

  await test("getAiStagingClip returns framesBase64 for Paint round-trip", async () => {
    const stagingId = `test-13j-${Date.now().toString(36)}`;
    const dir = path.join(STAGING_ROOT, stagingId);
    const framesDir = path.join(dir, "frames");
    fs.mkdirSync(framesDir, { recursive: true });
    for (let i = 0; i < 2; i += 1) {
      const buf = await sharp({
        create: {
          width: 32,
          height: 32,
          channels: 4,
          background: { r: 0, g: 220, b: 255, alpha: i === 0 ? 1 : 0.8 }
        }
      })
        .png()
        .toBuffer();
      fs.writeFileSync(path.join(framesDir, `${String(i).padStart(4, "0")}.png`), buf);
    }
    fs.writeFileSync(
      path.join(dir, "metadata.json"),
      `${JSON.stringify({
        id: stagingId,
        prompt: "13j test",
        motion: "wave",
        fps: 10,
        quality: "procedural",
        trueAlpha: true,
        avgAlphaRatio: 0.5
      })}\n`
    );

    const detail = getAiStagingClip({ stagingId });
    assert.equal(detail.ok, true);
    assert.equal(detail.phase, "13j");
    assert.equal(detail.frameCount, 2);
    assert.equal(detail.framesBase64.length, 2);
    assert.match(detail.paintUrl, /aiStaging=/);
    assert.equal(detail.motion, "wave");

    const listed = listAiStagingClips();
    assert.ok(listed.clips.some((c) => c.stagingId === stagingId));

    fs.rmSync(dir, { recursive: true, force: true });
  });

  await test("dashboard + paint wire 13j generate / staging load", () => {
    const html = fs.readFileSync(DASH, "utf8");
    assert.match(html, /btnBankAiGenerate/);
    assert.match(html, /bankAiPrompt/);
    assert.match(html, /bankAiMotion/);
    assert.match(html, /bankAiAutoPromote/);
    assert.match(html, /\/mia\/graphics\/ai\/animation\/generate/);
    assert.match(html, /aiStaging=/);
    assert.match(html, /12x[–-]13[a-z]/);

    const app = fs.readFileSync(path.join(PAINT, "app.js"), "utf8");
    assert.match(app, /loadAiStagingFromQuery/);
    assert.match(app, /aiStaging/);
    assert.match(app, /fetchStagingClip/);

    const client = fs.readFileSync(path.join(PAINT, "lib", "mia-graphics-client.js"), "utf8");
    assert.match(client, /fetchStagingClip/);

    const routes = fs.readFileSync(path.join(ROOT, "routes", "eyes.js"), "utf8");
    assert.match(routes, /\/mia\/animation\/staging\/:stagingId/);
    assert.match(routes, /getAiStagingClip/);
  });

  console.log("mia_graphics_studio_13j_dashboard_ai_generate_contract: all passed");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
