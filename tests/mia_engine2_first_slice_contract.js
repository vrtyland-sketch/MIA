"use strict";

const assert = require("assert/strict");
const {
  isEngine2StubEnabled,
  createEngine2Pipeline,
  createGameState,
  createVisibilityEngine,
  createPlatformRenderer,
  projectForPlatform,
  PLATFORM_IDS
} = require("../engine2");
const { buildEngine2AdminSnapshot } = require("../engine2/wiring");
const { stripValueFieldsForPublic } = require("../scripts/MIA_OVERLAY_PUBLIC_RESPONSE");

const FORBIDDEN_KEYS = [
  "coins",
  "coinValue",
  "giftValue",
  "totalCoins",
  "totalFedCoins",
  "rawValue",
  "coin_value"
];

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (err) {
    console.error(`fail - ${name}`);
    throw err;
  }
}

function collectKeys(obj, out = new Set()) {
  if (!obj || typeof obj !== "object") return out;
  for (const key of Object.keys(obj)) {
    out.add(key);
    collectKeys(obj[key], out);
  }
  return out;
}

function assertNoForbiddenKeys(payload, label) {
  const keys = collectKeys(payload);
  for (const forbidden of FORBIDDEN_KEYS) {
    assert.ok(!keys.has(forbidden), `${label} must not expose ${forbidden}`);
  }
}

function samplePipeline() {
  return createEngine2Pipeline({
    loaders: {
      loadKoj: () => ({ mood: "happy", bowlPercent: 55 }),
      loadWorld: () => ({ mode: "arena" }),
      loadArena: () => ({ phase: "duel" }),
      loadEconomy: () => ({
        miaPoints: 120,
        coins: 500,
        giftValue: 500,
        recentGifts: [{ user: "Fan", miaPoints: 10, coins: 50, giftValue: 50 }]
      }),
      loadChat: () => ({ recent: [{ user: "Alice", text: "hi" }] }),
      loadObs: () => ({ scene: "gift-overlay", mediaQueue: ["tier2.webm"] }),
      loadDebug: () => ({ queueDepth: 3, health: "ok" })
    }
  });
}

test("MIA_ENGINE2_STUB defaults OFF", () => {
  const prev = process.env.MIA_ENGINE2_STUB;
  delete process.env.MIA_ENGINE2_STUB;
  assert.equal(isEngine2StubEnabled(), false);
  assert.equal(buildEngine2AdminSnapshot({}), undefined);
  if (prev === undefined) delete process.env.MIA_ENGINE2_STUB;
  else process.env.MIA_ENGINE2_STUB = prev;
});

test("MIA_ENGINE2_STUB=1 enables admin snapshot wiring", () => {
  const prev = process.env.MIA_ENGINE2_STUB;
  process.env.MIA_ENGINE2_STUB = "1";
  const snap = buildEngine2AdminSnapshot({});
  assert.equal(snap.enabled, true);
  assert.ok(snap.projections.tiktok);
  assert.ok(snap.projections.kick);
  assert.ok(snap.projections.obs);
  assert.ok(snap.projections.admin);
  if (prev === undefined) delete process.env.MIA_ENGINE2_STUB;
  else process.env.MIA_ENGINE2_STUB = prev;
});

test("four platforms produce four distinct projection profiles", () => {
  const pipeline = samplePipeline();
  const rendered = pipeline.renderAll();
  assert.equal(rendered.length, 4);

  const profiles = rendered.map((r) => r.payload.profile);
  assert.deepEqual(profiles.sort(), ["admin", "kick", "obs", "tiktok"]);

  const shapes = rendered.map((r) => JSON.stringify(Object.keys(r.payload).sort()));
  const unique = new Set(shapes);
  assert.equal(unique.size, 4, "each platform must have a distinct projection shape");

  const tiktok = rendered.find((r) => r.platform === "tiktok").payload;
  const kick = rendered.find((r) => r.platform === "kick").payload;
  const obs = rendered.find((r) => r.platform === "obs").payload;
  const admin = rendered.find((r) => r.platform === "admin").payload;

  assert.equal(tiktok.profile, "tiktok");
  assert.ok(tiktok.koj);
  assert.ok(Array.isArray(tiktok.recentGifts));

  assert.equal(kick.profile, "kick");
  assert.equal(kick.channel, "kick-chat");
  assert.ok(kick.chat);

  assert.equal(obs.profile, "obs");
  assert.ok(obs.renderIntent);
  assert.equal(obs.renderIntent.scene, "gift-overlay");

  assert.equal(admin.profile, "admin");
  assert.ok(admin.debug !== undefined || admin.queueDepth !== undefined);
});

test("projections strip coin/gift value fields (miaPoints only)", () => {
  const pipeline = samplePipeline();
  for (const platform of PLATFORM_IDS) {
    const { payload } = pipeline.render(platform);
    assertNoForbiddenKeys(payload, platform);
  }
});

test("VisibilityEngine uses shared overlay sanitizer", () => {
  const engine = createVisibilityEngine();
  const gs = createGameState({
    loaders: {
      loadEconomy: () => ({ miaPoints: 7, coins: 100, giftValue: 100 })
    }
  });
  const visible = engine.filter(gs.getSnapshot(), { platform: "tiktok" });
  assert.equal(visible.economy.miaPoints, 7);
  assert.equal(visible.economy.coins, undefined);
  assert.equal(visible.economy.giftValue, undefined);
});

test("PlatformRenderer requires pipeline deps", () => {
  assert.throws(() => createPlatformRenderer({}), /gameState/);
});

test("unknown platform throws", () => {
  const pipeline = samplePipeline();
  assert.throws(() => pipeline.render("twitch"), /unknown platform/);
});

console.log("mia_engine2_first_slice_contract: all passed");
