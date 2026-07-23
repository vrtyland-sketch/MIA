"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const sharp = require("sharp");
const {
  evaluateProductionReadiness,
  DEFAULT_MIN_ALPHA
} = require("../shared/mia-animation-engine/productionGate");
const {
  listAiStagingClips,
  markBankClipProduction,
  promoteAiAnimationToBank
} = require("../shared/mia-animation-engine/promoteAiAnimation");
const graphicsStudio = require("../shared/mia-graphics-studio");

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

async function writeFrame(filePath) {
  const svg = `<svg width="48" height="48" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="#FF00FF"/>
    <circle cx="24" cy="24" r="10" fill="#2266CC"/>
  </svg>`;
  fs.writeFileSync(filePath, await sharp(Buffer.from(svg)).png().toBuffer());
}

(async () => {
  await test("catalog lists production_gate as 12z", () => {
    assert.equal(graphicsStudio.getCommand("production_gate").phase, "12z");
    assert.equal(graphicsStudio.getCommand("production_gate").status, "implemented");
  });

  await test("evaluateProductionReadiness blocks procedural", () => {
    const gate = evaluateProductionReadiness({
      quality: "procedural",
      avgAlphaRatio: 0.7,
      trueAlpha: true
    });
    assert.equal(gate.ready, false);
    assert.ok(gate.blockers.includes("procedural_not_allowed"));
  });

  await test("evaluateProductionReadiness blocks low alpha", () => {
    const gate = evaluateProductionReadiness({
      quality: "ai",
      avgAlphaRatio: 0.05,
      trueAlpha: true
    });
    assert.equal(gate.ready, false);
    assert.ok(gate.blockers.includes("alpha_too_low"));
    assert.equal(DEFAULT_MIN_ALPHA, 0.25);
  });

  await test("evaluateProductionReadiness allows ai with good alpha", () => {
    const gate = evaluateProductionReadiness({
      quality: "ai",
      avgAlphaRatio: 0.55,
      trueAlpha: true
    });
    assert.equal(gate.ready, true);
  });

  await test("forceProduction bypasses procedural gate with warning", () => {
    const gate = evaluateProductionReadiness(
      { quality: "procedural", avgAlphaRatio: 0.6 },
      { forceProduction: true }
    );
    assert.equal(gate.ready, true);
    assert.ok(gate.warnings.includes("procedural_forced_to_production"));
  });

  await test("markBankClipProduction rejects procedural without force", async () => {
    const bankRoot = fs.mkdtempSync(path.join(os.tmpdir(), "mia-12z-a-"));
    const clipId = "ai/proc_clip";
    const clipDir = path.join(bankRoot, "ai", "proc_clip");
    const framesDir = path.join(clipDir, "frames");
    fs.mkdirSync(framesDir, { recursive: true });
    await writeFrame(path.join(framesDir, "0001.png"));
    fs.writeFileSync(
      path.join(clipDir, "metadata.json"),
      JSON.stringify({
        id: clipId,
        quality: "procedural",
        source: "ai_true_alpha_anim",
        avgAlphaRatio: 0.7,
        trueAlpha: true,
        fps: 10
      })
    );
    const { packClipDirectory } = require("../shared/mia-animation-engine/spriteSheetPack");
    await packClipDirectory(clipDir, { bankRoot, clipId });

    const blocked = await markBankClipProduction({
      bankRoot,
      clipId,
      confirmProduction: true
    });
    assert.equal(blocked.ok, false);
    assert.equal(blocked.error, "production_gate_failed");
    assert.ok(blocked.blockers.includes("procedural_not_allowed"));

    const forced = await markBankClipProduction({
      bankRoot,
      clipId,
      confirmProduction: true,
      forceProduction: true,
      confirmForceProduction: true
    });
    assert.equal(forced.ok, true);
    assert.equal(forced.forced, true);

    fs.rmSync(bankRoot, { recursive: true, force: true });
  });

  await test("listAiStagingClips returns structure", () => {
    const list = listAiStagingClips();
    assert.equal(list.ok, true);
    assert.equal(list.phase, "12z");
    assert.ok(Array.isArray(list.clips));
  });

  await test("dashboard has staging promote and force production", () => {
    const src = fs.readFileSync(
      path.join(ROOT, "mia-output-overlay", "mia-streamer-dashboard.html"),
      "utf8"
    );
    assert.match(src, /stagingSelect/);
    assert.match(src, /btnStagingPromote/);
    assert.match(src, /bankForceProduction/);
    assert.match(src, /\/mia\/animation\/staging/);
    assert.match(src, /confirmForceProduction/);
  });

  await test("promote then gate reflects staging quality", async () => {
    const stagingRoot = fs.mkdtempSync(path.join(os.tmpdir(), "mia-12z-s-"));
    const bankRoot = fs.mkdtempSync(path.join(os.tmpdir(), "mia-12z-b-"));
    const stagingId = "wave-gate";
    const stagingDir = path.join(stagingRoot, stagingId);
    const framesDir = path.join(stagingDir, "frames");
    fs.mkdirSync(framesDir, { recursive: true });
    await writeFrame(path.join(framesDir, "0000.png"));
    await writeFrame(path.join(framesDir, "0001.png"));
    fs.writeFileSync(
      path.join(stagingDir, "metadata.json"),
      JSON.stringify({
        id: stagingId,
        quality: "procedural",
        source: "ai_true_alpha_anim",
        avgAlphaRatio: 0.65,
        trueAlpha: true,
        fps: 8,
        width: 48,
        height: 48
      })
    );

    const promoted = await promoteAiAnimationToBank({
      stagingRoot,
      stagingId,
      bankRoot,
      category: "ai",
      bankClipId: "ai/wave_gate"
    });
    assert.equal(promoted.ok, true);
    assert.equal(promoted.quality, "procedural");

    const blocked = await markBankClipProduction({
      bankRoot,
      clipId: "ai/wave_gate",
      confirmProduction: true
    });
    assert.equal(blocked.ok, false);
    assert.equal(blocked.error, "production_gate_failed");

    const listed = listAiStagingClips({ stagingRoot });
    assert.ok(listed.clips.some((c) => c.stagingId === stagingId));
    assert.equal(listed.clips.find((c) => c.stagingId === stagingId).productionReady, false);

    fs.rmSync(stagingRoot, { recursive: true, force: true });
    fs.rmSync(bankRoot, { recursive: true, force: true });
  });

  console.log("mia_animation_bank_12z_production_gate_contract: all passed");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
