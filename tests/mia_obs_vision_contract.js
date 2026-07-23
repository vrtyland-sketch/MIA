"use strict";

const assert = require("assert/strict");
const {
  resolveLayoutMode,
  resolvePlatform,
  buildLayoutPlan,
  buildGiftVideoTransform,
  inferRole
} = require("../scripts/MIA_OBS_VISION");

function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
  } catch (err) {
    console.error(`❌ ${name}`);
    console.error(err && err.stack ? err.stack : err);
    process.exitCode = 1;
  }
}

console.log("\n---- MIA OBS VISION CONTRACT ----\n");

test("inferRole maps KOJNOZROUT_RUNTIME to koj", () => {
  assert.equal(inferRole("KOJNOZROUT_RUNTIME", ""), "koj");
  assert.equal(inferRole("MIA_COMBO", "http://127.0.0.1:3000/combo-overlay.html"), "combo");
});

test("resolveLayoutMode prioritizes combo over idle", () => {
  assert.equal(resolveLayoutMode({ comboMoment: { active: true } }), "combo");
  assert.equal(resolveLayoutMode({ playingGiftVideo: true }), "gift_video");
});

test("resolvePlatform auto picks kick when bridge enabled", () => {
  assert.equal(resolvePlatform("auto", true), "kick");
  assert.equal(resolvePlatform("tiktok", true), "tiktok");
});

test("bowl sits left of koj without overlap on 1280x720 tiktok", () => {
  const { rectFromTransform, intersectionArea, rectArea } = require("../scripts/MIA_DISPLAY_VISION");
  const plan = buildLayoutPlan("idle", "tiktok", { width: 1280, height: 720 });
  const bowlW = Math.round(300 * plan.bowl.scaleX);
  const bowlH = Math.round(220 * plan.bowl.scaleY);
  const kojW = Math.round(520 * plan.koj.scaleX);
  const kojH = Math.round(640 * plan.koj.scaleY);
  const bowlRect = rectFromTransform({
    positionX: plan.bowl.positionX,
    positionY: plan.bowl.positionY,
    width: bowlW,
    height: bowlH,
    alignment: plan.bowl.alignment
  });
  const kojRect = rectFromTransform({
    positionX: plan.koj.positionX,
    positionY: plan.koj.positionY,
    width: kojW,
    height: kojH,
    alignment: plan.koj.alignment
  });
  const inter = intersectionArea(bowlRect, kojRect);
  const smaller = Math.min(rectArea(bowlRect), rectArea(kojRect));
  assert.ok(inter / smaller < 0.15, `bowl/koj overlap ${((inter / smaller) * 100).toFixed(1)}%`);
  assert.ok(bowlRect.right <= kojRect.left + 2, "bowl should sit left of koj");
});

test("buildLayoutPlan provides koj position for idle tiktok", () => {
  const plan = buildLayoutPlan("idle", "tiktok");
  assert.ok(plan.koj);
  assert.ok(plan.koj.positionY > 500);
});

test("buildLayoutPlan fits 1280x720 kick canvas", () => {
  const plan = buildLayoutPlan("idle", "kick", { width: 1280, height: 720 });
  assert.equal(plan.koj.alignment, 10, "koj bottom-right anchor");
  assert.equal(plan.entity.alignment, 6, "kick entity top-right anchor");
  assert.ok(plan.koj.positionX <= 1280, "koj X inside canvas");
  assert.ok(plan.koj.positionY <= 720, "koj Y inside canvas");
  assert.ok(plan.entity.positionX <= 1280, "entity X inside canvas");
  assert.ok(plan.bowl.positionX <= 1280, "bowl X inside canvas");
});

test("buildLayoutPlan tiktok entity anchors top-left", () => {
  const plan = buildLayoutPlan("idle", "tiktok", { width: 1280, height: 720 });
  assert.equal(plan.entity.alignment, 5);
  assert.ok(plan.entity.positionX < 200);
  assert.equal(plan.speech.alignment, 9, "speech bottom-left anchor");
});

test("buildLayoutPlan fits 1080x1920 tiktok portrait canvas", () => {
  const plan = buildLayoutPlan("idle", "tiktok", { width: 1080, height: 1920 });
  assert.equal(plan.koj.alignment, 10, "koj bottom-right on portrait");
  assert.equal(plan.entity.alignment, 5, "entity top-left on portrait");
  assert.ok(plan.koj.positionY > 1400, "koj above TikTok comment bar");
  // Full-stage transparent speech (cyber MIA hero) — TOP_LEFT @ 0,0 scale 1
  assert.equal(plan.speech.positionX, 0, "speech full-stage x");
  assert.equal(plan.speech.positionY, 0, "speech full-stage y");
  assert.equal(plan.speech.scaleX, 1, "speech full-stage scale");
  assert.equal(plan.speech.alignment, 5, "speech top-left full stage");
  assert.ok(plan.koj.positionX <= 1080);
  assert.ok(plan.bowl.positionY < 400, "bowl in top safe zone");
});

test("combo mode enables combo overlay", () => {
  const plan = buildLayoutPlan("combo", "tiktok");
  assert.equal(plan.combo.enabled, true);
});

test("gift_video keeps koj PNG at idle anchor", () => {
  const canvas = { width: 1280, height: 720 };
  const idle = buildLayoutPlan("idle", "tiktok", canvas);
  const gv = buildLayoutPlan("gift_video", "tiktok", canvas);
  assert.deepEqual(gv.koj, idle.koj);
  assert.equal(gv.bowl.enabled, false);
  assert.equal(gv.chat.enabled, true);
});

test("buildGiftVideoTransform centers in TikTok safe stage", () => {
  const t1 = buildGiftVideoTransform("T1", { width: 1280, height: 720 }, "tiktok");
  assert.ok(t1.boundsWidth > 200);
  assert.ok(t1.positionX > 200 && t1.positionX < 1080);
  const t5 = buildGiftVideoTransform("T5", { width: 1080, height: 1920 }, "tiktok");
  assert.ok(t5.boundsHeight > t1.boundsHeight);
});

if (process.exitCode) {
  throw new Error("mia_obs_vision_contract failed");
}
console.log("\nmia_obs_vision_contract OK\n");
