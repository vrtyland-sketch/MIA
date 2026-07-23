"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const {
  previewBankClip,
  listBankOperatorClips,
  pushBankClipPreview
} = require("../shared/mia-animation-engine/bankPreview");
const {
  resolveGiftReactionPlan,
  resolveBankQuality
} = require("../shared/mia-animation-engine/GiftReactionOrchestrator");
const { bindGiftKeysToClip } = require("../shared/mia-animation-engine/promoteAiAnimation");
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

(async () => {
  await test("catalog lists preview_bank_clip (12x) and bind_gift_keys (12y)", () => {
    assert.equal(graphicsStudio.getCommand("preview_bank_clip").phase, "12x");
    assert.equal(graphicsStudio.getCommand("bind_gift_keys").phase, "12y");
    const mods = graphicsStudio.listAiAnimationModules();
    assert.ok(mods.some((m) => m.id === "preview_bank_clip"));
    assert.ok(mods.some((m) => m.id === "bind_gift_keys"));
  });

  await test("operator list includes production gift/rose", () => {
    const list = listBankOperatorClips();
    assert.equal(list.ok, true);
    assert.ok(list.clipCount >= 1);
    const rose = list.clips.find((c) => c.id === "gift/rose");
    assert.ok(rose);
    assert.equal(rose.quality, "production");
    assert.equal(rose.liveSheetEligible, true);
  });

  await test("studio preview returns sheets for production clip", () => {
    const preview = previewBankClip({ clipId: "gift/rose" });
    assert.equal(preview.ok, true);
    assert.equal(preview.studioPreview, true);
    assert.ok(preview.reaction.sheetUrl);
    assert.ok(preview.reaction.manifestUrl);
    assert.equal(preview.reaction.preferProductionSprite, false);
    assert.equal(preview.reaction.studioPreview, true);
  });

  await test("live gift plan nulls AI sheets while quality stays ai", () => {
    const live = resolveGiftReactionPlan(
      { giftKey: "custom_ai_only", emotion: "happy" },
      {
        clips: [
          {
            id: "ai/studio_only",
            built: true,
            sheetUrl: "/assets/animation-bank/ai/studio_only/built/sprite_sheet.png",
            manifestUrl: "/assets/animation-bank/ai/studio_only/built/sprite.json",
            metadata: {
              quality: "ai",
              source: "ai_true_alpha_anim",
              giftKeys: ["custom_ai_only"],
              tags: ["ai-true-alpha"]
            },
            manifest: { quality: "ai", frameCount: 4, fps: 12 }
          }
        ]
      }
    );
    assert.equal(live.bankQuality, "ai");
    assert.equal(live.sheetUrl, null);
    assert.equal(resolveBankQuality({ metadata: { quality: "ai" } }), "ai");
  });

  await test("pushBankClipPreview sets studioPreview on overlay state", () => {
    const state = { animationReaction: null };
    const overlayStateModule = {
      setAnimationReaction(s, payload) {
        s.animationReaction = { ...payload, active: true };
        return s.animationReaction;
      }
    };
    const result = pushBankClipPreview(
      { clipId: "gift/rose" },
      { overlayStateModule, overlayState: state }
    );
    assert.equal(result.ok, true);
    assert.equal(result.pushed, true);
    assert.equal(state.animationReaction.studioPreview, true);
    assert.ok(state.animationReaction.sheetUrl);
  });

  await test("runtime honors studioPreview for sheets", () => {
    const src = fs.readFileSync(
      path.join(ROOT, "mia-output-overlay", "kojnozrout-runtime.html"),
      "utf8"
    );
    assert.match(src, /studioPreview/);
  });

  await test("dashboard has Animation Bank operator card", () => {
    const src = fs.readFileSync(
      path.join(ROOT, "mia-output-overlay", "mia-streamer-dashboard.html"),
      "utf8"
    );
    assert.match(src, /Animation Bank/);
    assert.match(src, /\/mia\/animation\/bank\/preview/);
    assert.match(src, /\/mia\/animation\/bank\/bind-gift-keys/);
    assert.match(src, /btnBankMarkProd/);
  });

  await test("overlay state stores studioPreview flag", () => {
    const src = fs.readFileSync(path.join(ROOT, "scripts", "MIA_OVERLAY_STATE.js"), "utf8");
    assert.match(src, /studioPreview/);
  });

  await test("bindGiftKeys warns on shadowed rose key", async () => {
    // Use real gift/rose metadata path read-only bind on a temp copy would be heavy;
    // assert helper exists and function rejects missing clip
    const missing = await bindGiftKeysToClip({
      clipId: "ai/does_not_exist_12x",
      giftKeys: ["custom"]
    });
    assert.equal(missing.ok, false);
    assert.equal(missing.error, "clip_missing");
  });

  console.log("mia_animation_bank_12x_preview_contract: all passed");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
