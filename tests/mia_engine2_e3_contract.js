"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const {
  isEngine2StubEnabled,
  applyOverlayProfile,
  PROFILE_IDS,
  buildProfileRouteUrls
} = require("../engine2");
const { buildEngine2AdminSnapshot } = require("../engine2/wiring");

const ROOT = path.join(__dirname, "..");

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

const SAMPLE_OVERLAY = Object.freeze({
  updatedAt: 1_700_000_000_000,
  kojDisplay: { mood: "happy", scene: "party", pose: "wave", comboMoment: { tier: 2 } },
  miaOverlay: { text: "hello" },
  kojnozoutOverlay: { text: "koj" },
  chatFeed: [
    { user: "A", text: "hi" },
    { user: "B", text: "yo" },
    { user: "C", text: "!" }
  ],
  recentGifts: [
    { user: "Fan1", miaPoints: 5, coins: 99, giftValue: 99 },
    { user: "Fan2", miaPoints: 10 }
  ],
  spamSession: { active: true, waveLabel: "wave", comboTier: "pulse" },
  giftEconomy: { miaPoints: 42, coins: 500 },
  obsConnected: true,
  voicePlayback: { queueLength: 2 },
  runtimeAudit: { lastGiftAt: 123 },
  theme: { enabled: true, id: "cyber", cssVars: { "--accent": "#a0f" } },
  arena: { phase: "duel" }
});

test("PROFILE_IDS lists four overlay channels", () => {
  assert.deepEqual([...PROFILE_IDS], ["main", "clean", "host", "game"]);
});

test("same snapshot yields four distinct profile payloads", () => {
  const main = applyOverlayProfile(SAMPLE_OVERLAY, "main");
  const clean = applyOverlayProfile(SAMPLE_OVERLAY, "clean");
  const host = applyOverlayProfile(SAMPLE_OVERLAY, "host");
  const game = applyOverlayProfile(SAMPLE_OVERLAY, "game");

  assert.equal(main.engine2Profile, "main");
  assert.equal(clean.engine2Profile, "clean");
  assert.equal(host.engine2Profile, "host");
  assert.equal(game.engine2Profile, "game");

  assert.notDeepStrictEqual(clean, main);
  assert.notDeepStrictEqual(host, main);
  assert.notDeepStrictEqual(game, main);

  assert.equal(clean.chatFeed.length, 2);
  assert.equal(clean.recentGifts.length, 2);
  assert.equal(host.debug.health, "ok");
  assert.equal(game.gameChannel.active, false);
  assert.equal(game.gameChannel.pluginId, null);
});

test("profiles strip coin fields from nested gifts", () => {
  for (const profile of PROFILE_IDS) {
    const out = applyOverlayProfile(SAMPLE_OVERLAY, profile);
    assertNoForbiddenKeys(out, `profile.${profile}`);
  }
});

test("buildProfileRouteUrls exposes four overlay-state routes", () => {
  const routes = buildProfileRouteUrls("http://127.0.0.1:3000");
  assert.match(routes.main, /profile=main$/);
  assert.match(routes.clean, /profile=clean$/);
  assert.match(routes.host, /profile=host$/);
  assert.match(routes.game, /profile=game$/);
});

test("routes/overlay.js handles profile query when stub enabled", () => {
  const overlaySrc = fs.readFileSync(path.join(ROOT, "routes", "overlay.js"), "utf8");
  assert.match(overlaySrc, /req\.query\?\.profile/);
  assert.match(overlaySrc, /applyOverlayProfile/);
  assert.match(overlaySrc, /isEngine2StubEnabled/);
});

test("MIA_ENGINE2_STUB=1 admin snapshot includes overlayProfiles and profileRoutes", () => {
  const prev = process.env.MIA_ENGINE2_STUB;
  process.env.MIA_ENGINE2_STUB = "1";
  const snap = buildEngine2AdminSnapshot({ baseUrl: "http://127.0.0.1:3000" });
  assert.equal(snap.phase, "E3");
  assert.ok(snap.overlayProfiles);
  assert.ok(snap.overlayProfiles.main);
  assert.ok(snap.overlayProfiles.clean);
  assert.ok(snap.overlayProfiles.host);
  assert.ok(snap.overlayProfiles.game);
  assert.ok(snap.profileRoutes.main.includes("profile=main"));
  assert.notDeepStrictEqual(snap.overlayProfiles.clean, snap.overlayProfiles.host);
  if (prev === undefined) delete process.env.MIA_ENGINE2_STUB;
  else process.env.MIA_ENGINE2_STUB = prev;
});

test("unknown profile throws from applyOverlayProfile", () => {
  assert.throws(() => applyOverlayProfile(SAMPLE_OVERLAY, "poker"), /unknown/i);
});

test("MIA_ENGINE2_STUB defaults OFF — admin snapshot undefined", () => {
  const prev = process.env.MIA_ENGINE2_STUB;
  delete process.env.MIA_ENGINE2_STUB;
  assert.equal(isEngine2StubEnabled(), false);
  assert.equal(buildEngine2AdminSnapshot({}), undefined);
  if (prev === undefined) delete process.env.MIA_ENGINE2_STUB;
  else process.env.MIA_ENGINE2_STUB = prev;
});

console.log("mia_engine2_e3_contract: all passed");
