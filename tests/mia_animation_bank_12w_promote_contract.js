"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const sharp = require("sharp");
const {
  resolveBankQuality,
  isLiveSheetEligible,
  resolveGiftReactionPlan
} = require("../shared/mia-animation-engine/GiftReactionOrchestrator");
const {
  promoteAiAnimationToBank,
  markBankClipProduction,
  resolvePromoteQuality
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

async function writeMagentaFrame(filePath, offset = 0) {
  const svg = `<svg width="64" height="64" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="#FF00FF"/>
    <circle cx="${32 + offset}" cy="32" r="12" fill="#4B2AD6"/>
  </svg>`;
  const buf = await sharp(Buffer.from(svg)).png().toBuffer();
  fs.writeFileSync(filePath, buf);
}

(async () => {
  await test("resolveBankQuality is ternary production|ai|procedural", () => {
    assert.equal(resolveBankQuality({ metadata: { quality: "production" } }), "production");
    assert.equal(resolveBankQuality({ metadata: { quality: "ai" } }), "ai");
    assert.equal(resolveBankQuality({ metadata: { source: "ai_true_alpha_anim" } }), "ai");
    assert.equal(resolveBankQuality({ metadata: { tags: ["ai-true-alpha"] } }), "ai");
    assert.equal(resolveBankQuality({ metadata: {} }), "procedural");
    assert.equal(isLiveSheetEligible("ai"), false);
    assert.equal(isLiveSheetEligible("procedural"), false);
    assert.equal(isLiveSheetEligible("production"), true);
  });

  await test("AI quality never exposes live gift sheets", () => {
    const plan = resolveGiftReactionPlan(
      { giftKey: "rose", effectProgram: "flower_support", emotion: "happy", tier: "T1" },
      {
        clips: [
          {
            id: "ai/fake_rose",
            built: true,
            sheetUrl: "/assets/animation-bank/ai/fake_rose/built/sprite_sheet.png",
            manifestUrl: "/assets/animation-bank/ai/fake_rose/built/sprite.json",
            metadata: {
              quality: "ai",
              source: "ai_true_alpha_anim",
              giftKeys: ["rose"],
              tags: ["ai-true-alpha"],
              emotion: "happy"
            },
            manifest: {
              quality: "ai",
              source: "ai_true_alpha_anim",
              giftKeys: ["rose"],
              frameCount: 4,
              fps: 12
            }
          }
        ]
      }
    );
    assert.equal(plan.bankQuality, "ai");
    assert.equal(plan.sheetUrl, null);
    assert.equal(plan.manifestUrl, null);
    assert.equal(plan.preferProductionSprite, true);
    assert.equal(plan.liveSheetEligible, false);
  });

  await test("promote staging → bank as ai (not production)", async () => {
    const stagingRoot = fs.mkdtempSync(path.join(os.tmpdir(), "mia-ai-stage-"));
    const bankRoot = fs.mkdtempSync(path.join(os.tmpdir(), "mia-ai-bank-"));
    const stagingId = "wave-test";
    const stagingDir = path.join(stagingRoot, stagingId);
    const framesDir = path.join(stagingDir, "frames");
    fs.mkdirSync(framesDir, { recursive: true });
    for (let i = 0; i < 3; i += 1) {
      await writeMagentaFrame(path.join(framesDir, `${String(i).padStart(4, "0")}.png`), i);
    }
    fs.writeFileSync(
      path.join(stagingDir, "metadata.json"),
      JSON.stringify({
        id: stagingId,
        quality: "procedural",
        source: "ai_true_alpha_anim",
        fps: 10,
        avgAlphaRatio: 0.7,
        trueAlpha: true,
        motion: "wave",
        width: 64,
        height: 64
      })
    );

    const promoted = await promoteAiAnimationToBank({
      stagingRoot,
      stagingId,
      bankRoot,
      category: "ai",
      bankClipId: "ai/wave_test",
      minAlphaRatio: 0.2
    });
    assert.equal(promoted.ok, true);
    assert.equal(promoted.quality, "procedural");
    assert.equal(promoted.liveSheetEligible, false);
    assert.ok(fs.existsSync(path.join(bankRoot, "ai", "wave_test", "frames", "0001.png")));
    assert.ok(fs.existsSync(path.join(bankRoot, "ai", "wave_test", "built", "sprite_sheet.png")));
    const meta = JSON.parse(
      fs.readFileSync(path.join(bankRoot, "ai", "wave_test", "metadata.json"), "utf8")
    );
    assert.equal(meta.quality, "procedural");
    assert.ok(meta.tags.includes("ai-true-alpha"));
    assert.ok(!meta.tags.includes("production"));

    const blocked = await markBankClipProduction({
      clipId: "ai/wave_test",
      bankRoot,
      confirmProduction: false
    });
    assert.equal(blocked.ok, false);
    assert.equal(blocked.error, "production_requires_confirm");

    const gated = await markBankClipProduction({
      clipId: "ai/wave_test",
      bankRoot,
      confirmProduction: true
    });
    assert.equal(gated.ok, false);
    assert.equal(gated.error, "production_gate_failed");
    assert.ok(gated.blockers.includes("procedural_not_allowed"));

    const marked = await markBankClipProduction({
      clipId: "ai/wave_test",
      bankRoot,
      confirmProduction: true,
      forceProduction: true,
      confirmForceProduction: true
    });
    assert.equal(marked.ok, true);
    assert.equal(marked.liveSheetEligible, true);
    assert.equal(marked.forced, true);
    const meta2 = JSON.parse(
      fs.readFileSync(path.join(bankRoot, "ai", "wave_test", "metadata.json"), "utf8")
    );
    assert.equal(meta2.quality, "production");

    fs.rmSync(stagingRoot, { recursive: true, force: true });
    fs.rmSync(bankRoot, { recursive: true, force: true });
  });

  await test("resolvePromoteQuality never auto-production without confirm", () => {
    assert.equal(resolvePromoteQuality({ quality: "production" }, {}), "ai");
    assert.equal(
      resolvePromoteQuality({ quality: "ai" }, { asProduction: true, confirmProduction: true }),
      "production"
    );
  });

  await test("catalog lists promote_animation as 12w", () => {
    const def = graphicsStudio.getCommand("promote_animation");
    assert.equal(def.phase, "12w");
    assert.equal(def.status, "implemented");
    const mods = graphicsStudio.listAiAnimationModules();
    assert.ok(mods.some((m) => m.id === "promote_animation"));
  });

  await test("npm promote script exists", () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
    assert.match(pkg.scripts["promote:ai-animation"], /promote_ai_animation_to_bank/);
    assert.match(pkg.scripts["test:animation-engine"], /12w_promote/);
  });

  console.log("mia_animation_bank_12w_promote_contract: all passed");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
