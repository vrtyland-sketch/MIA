"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const {
  validateClipMetadata,
  buildClipManifest,
  packSpriteSheet,
  loadBankIndex,
  resolveGiftReactionPlan,
  buildMotionKeyframes,
  sampleMotion,
  DEFAULT_BANK_ROOT
} = require("../shared/mia-animation-engine");
const { layoutSpriteSheet } = require("../shared/mia-paint-core/spriteSheetExport");
const { renderKojnozoutMood } = require("../scripts/kojnozrout_sprite_renderer");
const { buildAnimationBank } = require("../scripts/build_animation_bank");
const animationReaction = require("../scripts/MIA_ANIMATION_REACTION");
const overlayState = require("../scripts/MIA_OVERLAY_STATE");

function pass(label) {
  console.log(`✅ ${label}`);
}

async function run() {
  const meta = validateClipMetadata({
    id: "gift/rose",
    fps: 12,
    loop: false,
    emotion: "warm",
    giftKeys: ["rose"]
  });
  assert.equal(meta.ok, true);
  assert.equal(meta.normalized.id, "gift/rose");
  pass("validateClipMetadata");

  const layout = layoutSpriteSheet([{}, {}, {}, {}], { frameWidth: 64, frameHeight: 64, cols: 2, rows: 2 });
  const manifest = buildClipManifest(layout, { id: "test/clip", fps: 10, loop: true });
  assert.equal(manifest.kind, "mia_animation_sheet");
  assert.equal(manifest.frames.length, 4);
  pass("buildClipManifest");

  const frames = [renderKojnozoutMood("idle"), renderKojnozoutMood("happy")];
  const tmpDir = path.join(__dirname, "..", "data", "tmp-anim-pack");
  const framesDir = path.join(tmpDir, "frames");
  fs.mkdirSync(framesDir, { recursive: true });
  frames.forEach((buf, i) => {
    fs.writeFileSync(path.join(framesDir, `${String(i + 1).padStart(4, "0")}.png`), buf);
  });
  const framePaths = frames.map((_, i) => path.join(framesDir, `${String(i + 1).padStart(4, "0")}.png`));
  const packed = await packSpriteSheet(framePaths, {
    clipId: "test/pack",
    fps: 8,
    metadata: { id: "test/pack", emotion: "idle" }
  });
  assert.equal(packed.ok, true);
  assert.ok(packed.sheetBuffer.length > 500);
  assert.equal(packed.manifest.frameCount, 2);
  pass("packSpriteSheet");

  const motion = buildMotionKeyframes({ style: "bounce", intensity: 0.6, durationMs: 800 });
  const mid = sampleMotion(motion, 0.5);
  assert.ok(Math.abs(mid.translateY) > 0);
  pass("ProceduralMotion");

  const built = await buildAnimationBank({ force: true, seed: true });
  assert.equal(built.ok, true);
  assert.ok(built.clipCount >= 10);
  assert.ok(fs.existsSync(path.join(DEFAULT_BANK_ROOT, "bank-index.json")));
  pass("buildAnimationBank");

  const bank = loadBankIndex();
  assert.ok(bank.clipCount >= 10);
  const rose = bank.clips.find((c) => c.id === "gift/rose");
  assert.ok(rose?.built, "gift/rose built");
  assert.ok(fs.existsSync(path.join(DEFAULT_BANK_ROOT, "gift", "rose", "built", "sprite_sheet.png")));
  pass("Animation Bank index");

  const plan = resolveGiftReactionPlan({
    giftKey: "rose",
    effectProgram: "flower_support",
    emotion: "warm",
    tier: "T2"
  });
  assert.equal(plan.animationId, "gift/rose");
  assert.equal(plan.particles.burst, "heal");
  assert.equal(plan.soundCue, "gift_rose");
  assert.ok(plan.sheetUrl.includes("gift/rose"));
  pass("resolveGiftReactionPlan");

  const payload = animationReaction.buildGiftAnimationReactionPayload({
    giftProfile: { key: "rose", effectProgram: "flower_support", moodHint: "warm", animationOwner: "mia" },
    giftAnimation: { rawMood: "happy" },
    giftName: "Rose",
    tier: "T1",
    userLabel: "Pepa"
  });
  assert.equal(payload.animationId, "gift/rose");
  assert.ok(payload.manifestUrl);
  pass("buildGiftAnimationReactionPayload");

  const state = overlayState.createOverlayState();
  overlayState.setAnimationReaction(state, payload);
  const snap = overlayState.getOverlaySnapshot(state);
  assert.equal(snap.animationReaction.animationId, "gift/rose");
  assert.equal(snap.animationReaction.soundCue, "gift_rose");
  pass("overlay animationReaction state");

  const runtimeHtml = fs.readFileSync(
    path.join(__dirname, "..", "mia-output-overlay", "kojnozrout-runtime.html"),
    "utf8"
  );
  assert.match(runtimeHtml, /mia-animation-player\.js/);
  assert.match(runtimeHtml, /syncAnimationReaction/);
  pass("koj runtime integration");

  fs.rmSync(tmpDir, { recursive: true, force: true });

  console.log("\n---- MIA ANIMATION ENGINE CONTRACT (Phase 13) ----");
  console.log("passed");
}

run().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
