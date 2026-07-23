"use strict";

/**
 * Phase 3 Game Layer contracts — long-term needs, tech forms, battle phases,
 * inventory, viewer levels.
 */

const assert = require("assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");

const longTerm = require("../core/koj-long-term-needs");
const techForms = require("../core/tech-forms-runtime");
const inventory = require("../core/viewer-inventory");
const viewerMemory = require("../core/viewer-memory");
const arena = require("../scripts/MIA_PLATFORM_ARENA");
const { createKojnozoutState, applyPassiveDecay } = require("../scripts/MIA_KOJNOZROUT_ENGINE");
const { registerAdminRoutes } = require("../routes/admin");

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (err) {
    console.error(`fail - ${name}`);
    throw err;
  }
}

test("long-term needs seed + mood mapping", () => {
  const state = createKojnozoutState({ hunger: 40, energy: 80, fatigue: 10, techCharge: 40 });
  assert.equal(state.fatigue, 10);
  assert.equal(state.techCharge, 40);
  const hint = longTerm.mapNeedsToMoodHint({ ...state, fatigue: 85, hunger: 20 });
  assert.equal(hint.moodHint, "sleepy");
  const snap = longTerm.getLongTermNeedsSnapshot(state);
  assert.ok(snap.hunger != null);
  assert.ok(snap.fatigue != null);
});

test("passive decay ticks fatigue/techCharge without breaking hunger", () => {
  const state = createKojnozoutState({
    hunger: 30,
    energy: 20,
    fatigue: 10,
    techCharge: 50,
    lastDecayAt: Date.now() - 10 * 60_000
  });
  applyPassiveDecay(state, { skipVitalsSync: true });
  assert.ok(state.hunger > 30);
  assert.ok(state.fatigue >= 10);
  assert.ok(state.techCharge <= 50);
});

test("tech forms flag off by default; aliases resolve", () => {
  delete process.env.MIA_TECH_FORMS;
  assert.equal(techForms.isTechFormsEnabled({}), false);
  assert.equal(techForms.resolveFormId("scout"), "scanner");
  assert.equal(techForms.resolveFormId("guardian"), "shield");
  assert.equal(techForms.resolveFormId("battle"), "battle_tool");
  assert.equal(techForms.resolveFormId("party"), "projector");

  process.env.MIA_TECH_FORMS = "1";
  assert.equal(techForms.isTechFormsEnabled({}), true);
  let koj = createKojnozoutState({
    hunger: 30,
    energy: 80,
    robotModes: { unlockedForms: ["pet", "assistant"], activeForm: "pet" }
  });
  const act = techForms.activateTechForm(koj, "assistant", {
    runtimeConfig: {},
    miaPoints: 0,
    now: Date.now()
  });
  assert.equal(act.ok, true);
  assert.equal(act.state.robotModes.activeForm, "assistant");
  assert.ok(act.overlayHint);
  assert.ok(act.state.energy < 80);
  delete process.env.MIA_TECH_FORMS;
});

test("tech forms gated when hungry", () => {
  process.env.MIA_TECH_FORMS = "1";
  const koj = createKojnozoutState({
    hunger: 90,
    energy: 90,
    robotModes: { unlockedForms: ["pet", "shield"], activeForm: "pet" }
  });
  const act = techForms.activateTechForm(koj, "shield", {
    runtimeConfig: {},
    miaPoints: 100,
    forceUnlock: true
  });
  assert.equal(act.ok, false);
  assert.match(String(act.reason), /hungry|pet_core/);
  delete process.env.MIA_TECH_FORMS;
});

test("battle MVP phases announce→countdown→active; score only in active", () => {
  let state = arena.createArenaState();
  state = arena.startArenaDuel(state, {
    durationMs: 60_000,
    announceMs: 5_000,
    countdownMs: 5_000
  });
  assert.equal(state.duel.phase, "announce");
  assert.equal(state.duel.active, true);

  let r = arena.ingestArenaActivity(state, {
    platform: "tiktok",
    eventType: "GIFT",
    userLabel: "Early",
    miaPoints: 50
  });
  assert.equal(toNumber(r.state.duel.scores.tiktok), 0);

  state = r.state;
  state.duel.announceEndsAt = Date.now() - 1;
  arena.advanceDuelPhases(state);
  assert.equal(state.duel.phase, "countdown");

  state.duel.countdownEndsAt = Date.now() - 1;
  arena.advanceDuelPhases(state);
  assert.equal(state.duel.phase, "active");

  r = arena.ingestArenaActivity(state, {
    platform: "tiktok",
    eventType: "GIFT",
    userLabel: "Live",
    miaPoints: 50
  });
  assert.ok(r.state.duel.scores.tiktok >= 50);
  assert.ok(r.state.duel.energy.tiktok > 0);

  r.state.duel.endsAt = Date.now() - 1;
  state = arena.finishArenaDuel(r.state);
  assert.equal(state.duel.phase, "finished");
  assert.equal(state.duel.winner, "tiktok");
});

test("battle action gated by energy + interval", () => {
  let state = arena.createArenaState();
  state = arena.startArenaDuel(state, { durationMs: 120_000, skipPhases: true });
  const blocked = arena.pushPlatformBattleAction(state, {
    platform: "kick",
    miaPoints: 20,
    item: { id: "box", power: 10 }
  });
  assert.equal(blocked.reason, "energy");

  state.duel.energy.kick = 50;
  const ok = arena.pushPlatformBattleAction(state, {
    platform: "kick",
    miaPoints: 20,
    item: { id: "box", power: 10 }
  });
  assert.equal(ok.reason, "ok");
  assert.ok(ok.action);

  const again = arena.pushPlatformBattleAction(ok.state, {
    platform: "kick",
    miaPoints: 20,
    item: { id: "box", power: 10 }
  });
  assert.equal(again.reason, "action_interval");
});

test("viewer inventory grants stub items without coins", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "mia-inv-"));
  const filePath = path.join(tmp, "viewer-inventory.json");
  inventory.configureViewerInventory({ path: filePath });
  inventory.resetViewerInventoryForTest();
  inventory.configureViewerInventory({ path: filePath });

  const g = inventory.grantItem(
    { userId: "u1", name: "Pepa" },
    "battle_token",
    { source: "admin", force: true }
  );
  assert.equal(g.ok, true);
  assert.equal(g.inventory.items[0].id, "battle_token");
  inventory.flushSync();
  const raw = fs.readFileSync(filePath, "utf8");
  assert.ok(!raw.toLowerCase().includes("coins"));
});

test("viewer levels from totalMiaPoints + thank line", () => {
  assert.equal(viewerMemory.levelFromMiaPoints(0).level, 1);
  assert.equal(viewerMemory.levelFromMiaPoints(50).level, 2);
  assert.equal(viewerMemory.levelFromMiaPoints(400).level, 4);

  const line = viewerMemory.buildMemoryThankLine(
    { name: "Pepa", giftCount: 4, level: 3 },
    { speaker: "mia" }
  );
  assert.match(line, /level 3/i);

  const up = viewerMemory.buildMemoryThankLine(
    { name: "Pepa", giftCount: 2, level: 2 },
    { leveledUp: true, speaker: "mia" }
  );
  assert.match(up, /level 2/i);
});

test("admin status phase 3 + new test routes", () => {
  const routes = { get: [], post: [] };
  const app = {
    get(p) {
      routes.get.push(p);
    },
    post(p) {
      routes.post.push(p);
    }
  };
  const result = registerAdminRoutes(app, {
    localAdminGuard: (_req, _res, next) => next && next(),
    processEvent: async () => ({ status: 200, body: { ok: true } })
  });
  assert.equal(result.ok, true);
  assert.ok(routes.post.includes("/api/mia-admin/test/tech-form"));
  assert.ok(routes.post.includes("/api/mia-admin/test/inventory"));
  assert.ok(routes.post.includes("/api/mia-admin/test/battle"));

  const { buildDefaultAdminStatus } = require("../routes/admin");
  const status = buildDefaultAdminStatus({
    getKojnozoutState: () => createKojnozoutState({ fatigue: 12, techCharge: 40 })
  });
  assert.ok(status.phase >= 3);
  assert.ok(status.kojNeeds);
  assert.equal(status.kojNeeds.fatigue, 12);
});

function toNumber(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

console.log("phase3_game_layer_contract: all passed");
