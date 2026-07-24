"use strict";

/**
 * MIA Graphics Phase R1 acceptance contract  automated gates R1-A / R1-B.
 * R1-C (manual OBS stream session) stays human-only; see docs/MIA_GRAPHICS_R1_STATUS.md.
 */

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const OVERLAY = path.join(ROOT, "mia-output-overlay");
const RUNTIME_HTML = path.join(OVERLAY, "kojnozrout-runtime.html");
const RUNTIME_CSS = path.join(OVERLAY, "assets", "kojnozrout", "koj-runtime.css");
const STATUS_DOC = path.join(ROOT, "docs", "MIA_GRAPHICS_R1_STATUS.md");

const manifest = require("../scripts/MIA_OBS_LIVE_MANIFEST");
const { stripValueFieldsForPublic } = require("../scripts/MIA_OVERLAY_PUBLIC_RESPONSE");
const { create: createKojRuntimeStage } = require("../mia-output-overlay/lib/koj-runtime-stage");
const { resolveScene } = require("../mia-output-overlay/lib/koj-runtime-scene");
const { buildSpamWaveBellyContent } = require("../mia-output-overlay/lib/koj-runtime-belly");

const KOJ_SPLIT_BUST = "44-r1-combo";

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (err) {
    console.error(`fail - ${name}`);
    throw err;
  }
}

function mockClassList() {
  const set = new Set();
  return {
    _c: set,
    add(...xs) {
      xs.forEach((x) => set.add(x));
    },
    remove(...xs) {
      xs.forEach((x) => set.delete(x));
    },
    toggle(x, on) {
      if (on) set.add(x);
      else set.delete(x);
    },
    contains(x) {
      return set.has(x);
    }
  };
}

function createStage(classList, style = { setProperty() {}, removeProperty() {} }) {
  return createKojRuntimeStage({
    stageEl: { classList, style },
    resolvePropKey: () => "idle",
    playsWithProp: () => false,
    isCalmWanderMood: () => false,
    shouldForceWander: () => false,
    setLastStepDurMs: () => {},
    getLiveMotion: () => null,
    random: () => 0.5
  });
}

test("R1 status doc lists acceptance gates and dual bust layers", () => {
  const doc = fs.readFileSync(STATUS_DOC, "utf8");
  assert.ok(doc.includes("R1-A"));
  assert.ok(doc.includes("R1-B"));
  assert.ok(doc.includes("R1-C"));
  assert.ok(doc.includes("36-koj-unify"));
  assert.ok(doc.includes("37-stream-polish"));
  assert.ok(doc.includes(KOJ_SPLIT_BUST));
  assert.ok(doc.includes("R1-C how to verify"));
});

test("dual bust invariant: OBS manifest 36/37; split runtime libs 44-r1-combo", () => {
  assert.equal(manifest.GFX_CACHE_BUST, "36-koj-unify");
  assert.equal(manifest.GIFT_ANIM_CACHE_BUST, "37-stream-polish");

  const urls = manifest.buildSplitUrls(3000);
  assert.match(urls.runtime, /kojnozrout-runtime\.html\?v=36-koj-unify/);
  assert.match(urls.giftAnimation, /gift-animation-overlay\.html\?v=37-stream-polish/);

  const html = fs.readFileSync(RUNTIME_HTML, "utf8");
  assert.match(html, new RegExp(`ASSET_CACHE_V = "${KOJ_SPLIT_BUST}"`));
  const bustRefs = html.match(/44-r1-combo/g) || [];
  assert.ok(bustRefs.length >= 20, "split libs cache-bust consistently");
  assert.ok(!html.includes("37-stream-polish"), "gift bust must not leak into koj runtime html");
});

test("koj runtime css exposes combo/spam wave stage selectors", () => {
  const css = fs.readFileSync(RUNTIME_CSS, "utf8");
  for (const sel of ["#stage.spam-wave", "#stage.combo-pulse", "#stage.combo-urgent"]) {
    assert.ok(css.includes(sel), `missing ${sel}`);
  }
});

test("syncComboVisual toggles pulse at 72% and urgent within 5s window", () => {
  const classList = mockClassList();
  const style = { props: {}, setProperty(k, v) { this.props[k] = v; }, removeProperty(k) { delete this.props[k]; } };
  const stage = createStage(classList, style);

  stage.syncComboVisual(
    {
      spamSession: {
        active: true,
        spamConfirmed: true,
        totalPoints: 540,
        targetRewardPoints: 750,
        remainingWindowSec: 12
      }
    },
    Date.now()
  );
  assert.ok(classList.contains("combo-pulse"), "72% progress enables pulse");
  assert.ok(!classList.contains("combo-urgent"), "urgent only inside last 5s");

  classList._c.clear();
  stage.syncComboVisual(
    {
      spamSession: {
        active: true,
        spamConfirmed: true,
        totalPoints: 200,
        targetRewardPoints: 750,
        remainingWindowSec: 4
      }
    },
    Date.now()
  );
  assert.ok(classList.contains("combo-urgent"));
  assert.ok(!classList.contains("combo-pulse"), "pulse needs >=72% progress");
  assert.equal(style.props["--koj-wave-pct"], "27%");
});

test("resolveScene and belly HUD use miaPoints fields only", () => {
  const now = Date.now();
  assert.equal(resolveScene("idle", { comboMoment: { active: true, holdUntilTs: now + 5000 } }, now), "party");
  assert.equal(resolveScene("idle", { spamSession: { active: true } }, now), "party");

  const belly = buildSpamWaveBellyContent({
    active: true,
    spamConfirmed: true,
    totalPoints: 420,
    targetRewardPoints: 750,
    remainingWindowSec: 6,
    nextRewardTier: "T2"
  });
  assert.ok(String(belly.main).includes("T2"), "belly shows next reward tier");
  assert.ok(!JSON.stringify(belly).toLowerCase().includes("coin"));

  const spamPublic = stripValueFieldsForPublic({
    spamSession: {
      active: true,
      totalPoints: 600,
      targetRewardPoints: 750,
      coins: 999,
      giftValue: 100,
      coinValue: 50
    }
  });
  assert.equal(spamPublic.spamSession.totalPoints, 600);
  assert.equal(spamPublic.spamSession.coins, undefined);
  assert.equal(spamPublic.spamSession.giftValue, undefined);
  assert.equal(spamPublic.spamSession.coinValue, undefined);
});

console.log("mia_graphics_r1_contract: all passed");
