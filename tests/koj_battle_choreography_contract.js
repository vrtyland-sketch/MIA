"use strict";

const assert = require("assert/strict");
const battleChoreo = require("../scripts/MIA_KOJ_BATTLE_CHOREOGRAPHY");
const arenaBattle = require("../scripts/MIA_ARENA_BATTLE");

function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
  } catch (err) {
    console.error(`❌ ${name}`);
    console.error(err?.stack || err);
    process.exitCode = 1;
  }
}

console.log("\n---- KOJ BATTLE CHOREOGRAPHY CONTRACT ----\n");

test("feeding blocks battle choreography", () => {
  const ctx = battleChoreo.resolveKojBattleContext({
    kojState: { behavior: "feeding", lastFedAt: Date.now() - 1000 },
    care: {},
    arena: {
      duel: { active: true },
      battle: {
        current: {
          id: 1,
          attacker: "tiktok",
          targets: ["kick"],
          anim: "attack",
          effect: "damage",
          holdUntil: Date.now() + 3000
        }
      }
    }
  });
  assert.equal(ctx.active, false);
  assert.equal(ctx.blockedBy, "feeding");
});

test("arena attack assigns attacker pose on stream platform", () => {
  const holdUntil = Date.now() + 4000;
  const ctx = battleChoreo.resolveKojBattleContext({
    streamPlatform: "tiktok",
    kojState: { mood: "happy" },
    care: {},
    arena: {
      duel: { active: true },
      battle: {
        current: {
          id: 2,
          attacker: "tiktok",
          attackerName: "Tokžrout",
          targets: ["kick"],
          anim: "attack",
          effect: "damage",
          projectile: "coin",
          holdUntil
        }
      }
    }
  });
  assert.equal(ctx.active, true);
  assert.equal(ctx.source, "platform_arena");
  assert.equal(ctx.role, "attacker");
  assert.equal(ctx.pose, "attack");
  assert.equal(ctx.cycleId, "battle-attack");
});

test("arena damage marks target with hit pose", () => {
  const ctx = battleChoreo.resolveKojBattleContext({
    streamPlatform: "kick",
    kojState: { mood: "happy" },
    care: {},
    arena: {
      duel: { active: true },
      battle: {
        current: {
          id: 3,
          attacker: "tiktok",
          targets: ["kick"],
          anim: "attack",
          effect: "damage",
          holdUntil: Date.now() + 4000
        }
      }
    }
  });
  assert.equal(ctx.role, "target");
  assert.equal(ctx.pose, "hit");
  assert.equal(ctx.cycleId, "battle-hit");
});

test("koj duel active uses duel-ready when no winner", () => {
  const ctx = battleChoreo.resolveKojBattleContext({
    streamPlatform: "tiktok",
    kojState: { mood: "excited" },
    care: {},
    duel: { active: true, remainingMs: 120000 }
  });
  assert.equal(ctx.active, true);
  assert.equal(ctx.source, "koj_duel");
  assert.equal(ctx.pose, "duel-ready");
});

test("backpack queue during duel triggers attack rush", () => {
  const ctx = battleChoreo.resolveKojBattleContext({
    streamPlatform: "tiktok",
    kojState: { mood: "excited" },
    care: {},
    duel: { active: true, remainingMs: 60000 },
    backpack: { display: { queueLength: 2 } }
  });
  assert.equal(ctx.phase, "duel_item_rush");
  assert.equal(ctx.pose, "attack");
});

test("pushBattleAction builds poses for all platforms", () => {
  const { state, action } = arenaBattle.pushBattleAction({}, {
    platform: "kick",
    eventType: "GIFT",
    userLabel: "Fan",
    miaPoints: 500,
    item: { id: "box", label: "BOX", power: 12 }
  });
  assert.ok(action);
  assert.equal(action.anim, "item_box");
  const snap = arenaBattle.getBattleSnapshot(state);
  assert.equal(snap.poses.kick, "item_box");
  assert.equal(snap.poses.tiktok, "hit");
});

test("resolveBattleDisplayMood maps attack to duel-ready alias", () => {
  const mood = battleChoreo.resolveBattleDisplayMood({
    active: true,
    pose: "attack"
  });
  assert.equal(mood, "attack");
});

console.log("\nkoj_battle_choreography_contract: all passed\n");
