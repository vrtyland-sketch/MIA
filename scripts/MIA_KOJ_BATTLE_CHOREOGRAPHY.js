"use strict";

/**
 * Battle choreografie všech Kojnožroutů — sladěné pózy pro arénu, duel, batoh.
 * Respektuje misku (krmení), vitals (spánek/nemoc) a prioritu momentů.
 */

const roster = require("./MIA_KOJ_ROSTER");
const { isItemUseActive } = require("./MIA_KOJNOZROUT_ITEM_EFFECT");

const PLATFORMS = ["tiktok", "kick", "twitch", "youtube"];

const BATTLE_ANIM_TO_POSE = {
  attack: "attack",
  attack2: "attack2",
  hit: "hit",
  hit2: "hit2",
  defend: "defend",
  item_box: "item_box",
  item_heal: "item_heal",
  item_buff: "item_buff",
  excited: "excited",
  happy: "happy",
  win: "win",
  faint: "faint",
  taunt: "taunt"
};

const BATTLE_ANIM_TO_CYCLE = {
  attack: "battle-attack",
  attack2: "battle-attack",
  item_box: "battle-attack",
  hit: "battle-hit",
  hit2: "battle-hit",
  defend: "battle-defend",
  item_heal: "battle-defend",
  item_buff: "battle-buff",
  win: "battle-win",
  faint: "battle-faint",
  taunt: "battle-taunt"
};

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function isSleepingState(state = {}) {
  return Boolean(state.isSleeping) || toNumber(state?.vitals?.sleepDepth, 0) >= 55;
}

function isFeedingPulse(state = {}, now = Date.now()) {
  const behavior = safeString(state.behavior).toLowerCase();
  const lastFedAt = toNumber(state.lastFedAt, 0);
  if (lastFedAt <= 0 || now - lastFedAt > 9000) return false;
  return behavior.includes("feed") || behavior === "feeding";
}

function resolveVitalBlock(state = {}, care = {}, now = Date.now()) {
  const need = safeString(care?.need).toLowerCase();
  const mood = safeString(state?.mood).toLowerCase();
  if (isSleepingState(state) || need === "sleepy" || mood === "sleepy") {
    return "sleepy";
  }
  if (need === "sick" || mood === "sick" || state?.affliction === "sick") {
    return "sick";
  }
  if (isFeedingPulse(state, now)) {
    return "feeding";
  }
  return null;
}

function normalizePlatform(value = "tiktok") {
  const key = safeString(value, "tiktok").toLowerCase();
  return PLATFORMS.includes(key) ? key : "tiktok";
}

function mapAnimToPose(anim = "attack") {
  const key = safeString(anim, "attack").toLowerCase();
  return BATTLE_ANIM_TO_POSE[key] || key;
}

function mapAnimToCycle(anim = "attack") {
  const key = safeString(anim, "attack").toLowerCase();
  return BATTLE_ANIM_TO_CYCLE[key] || "battle-attack";
}

/**
 * @returns {object|null} battle context pro overlay / runtime
 */
function resolveKojBattleContext(input = {}) {
  const now = toNumber(input.now, Date.now());
  const streamPlatform = normalizePlatform(input.streamPlatform);
  const state = input.kojState || {};
  const care = input.care || {};
  const arena = input.arena || null;
  const duel = input.duel || null;
  const backpack = input.backpack || null;

  const vitalBlock = resolveVitalBlock(state, care, now);
  if (vitalBlock) {
    return {
      active: false,
      blockedBy: vitalBlock,
      streamPlatform,
      phase: "blocked"
    };
  }

  const battle = arena?.battle || null;
  const current = battle?.current || null;
  const holdUntil = toNumber(current?.holdUntil, 0);
  const arenaLive =
    Boolean(arena?.duel?.active || arena?.tournament?.active) &&
    current &&
    holdUntil > now;

  if (arenaLive) {
    const isAttacker = current.attacker === streamPlatform;
    const isTarget = (current.targets || []).includes(streamPlatform);
    let pose = "idle";
    let phase = "arena_idle";
    let cycleId = null;
    let role = "spectator";

    if (isAttacker) {
      role = "attacker";
      phase = current.effect === "heal" || current.effect === "buff" ? "arena_buff" : "arena_attack";
      pose = mapAnimToPose(current.anim || "attack");
      cycleId = mapAnimToCycle(current.anim || "attack");
    } else if (isTarget && current.effect === "damage") {
      role = "target";
      phase = "arena_hit";
      pose = current.id % 2 === 0 ? "hit2" : "hit";
      cycleId = "battle-hit";
    } else if (arena?.duel?.active || arena?.tournament?.active) {
      role = "bench";
      phase = "arena_ready";
      pose = "duel-ready";
      cycleId = "duel-ready";
    }

    const profile = roster.getKojProfile(streamPlatform);
    return {
      active: true,
      source: "platform_arena",
      streamPlatform,
      phase,
      role,
      pose,
      cycleId,
      anim: current.anim || null,
      projectile: current.projectile || null,
      effect: current.effect || null,
      actionId: current.id || null,
      actionText: safeString(current.text),
      attacker: current.attacker || null,
      attackerName: safeString(current.attackerName),
      targets: current.targets || [],
      holdUntil,
      remainingMs: Math.max(0, holdUntil - now),
      accent: profile.accent,
      spriteUrl: roster.resolveFormSprite(streamPlatform, pose)
    };
  }

  if (duel?.active) {
    let pose = "duel-ready";
    let cycleId = "duel-ready";
    let phase = "duel_race";
    let itemFxActive = false;
    let lastUse = null;

    if (duel.won) {
      pose = "win";
      cycleId = "battle-win";
      phase = "duel_won";
    } else if (duel.lost) {
      pose = "faint";
      cycleId = "battle-faint";
      phase = "duel_lost";
    } else {
      lastUse = backpack?.display?.lastUseSummary;
      itemFxActive = isItemUseActive(lastUse, now);
      if (itemFxActive && lastUse?.effect) {
        pose = mapAnimToPose(lastUse.effect.pose || "item_box");
        cycleId = lastUse.effect.cycleId || mapAnimToCycle(pose);
        phase = lastUse.effect.role === "duel" ? "duel_item_use" : "duel_item_rush";
      } else {
        const queueLen = toNumber(backpack?.display?.queueLength, 0);
        if (queueLen > 0) {
          pose = "attack";
          cycleId = "battle-attack";
          phase = "duel_item_rush";
        }
      }
    }

    const profile = roster.getKojProfile(streamPlatform);
    return {
      active: true,
      source: "koj_duel",
      streamPlatform,
      phase,
      role: "local",
      pose,
      cycleId,
      holdUntil: toNumber(duel.endsAt, 0),
      remainingMs: Math.max(0, toNumber(duel.remainingMs, 0)),
      accent: profile.accent,
      spriteUrl: roster.resolveFormSprite(streamPlatform, pose),
      itemUse: itemFxActive ? lastUse : null,
      backpackQueue: toNumber(backpack?.display?.queueLength, 0)
    };
  }

  return {
    active: false,
    streamPlatform,
    phase: "idle"
  };
}

function resolveBattleDisplayMood(battle = null) {
  if (!battle?.active) return null;
  const pose = safeString(battle.pose).toLowerCase();
  if (!pose) return null;

  const cycleMap = {
    attack: "attack",
    attack2: "attack",
    hit: "hit",
    hit2: "hit",
    defend: "defend",
    item_box: "attack",
    item_heal: "defend",
    item_buff: "attack",
    win: "duel-win",
    faint: "duel-lose",
    "duel-ready": "duel-ready"
  };

  return cycleMap[pose] || pose;
}

function buildArenaFighterStates(arena = null, now = Date.now()) {
  const battle = arena?.battle || null;
  const current = battle?.current || null;
  const poses = battle?.poses || {};
  const sprites = battle?.sprites || {};
  const out = {};

  for (const platform of PLATFORMS) {
    const profile = roster.getKojProfile(platform);
    const pose = safeString(poses[platform], "idle").toLowerCase() || "idle";
    const spr = sprites[platform] || {};
    out[platform] = {
      platform,
      name: profile.name,
      title: profile.title,
      pose,
      cycleId: mapAnimToCycle(pose),
      spriteUrl: spr.spriteUrl || roster.resolveFormSprite(platform, pose),
      idleUrl: spr.idleUrl || roster.resolveFormSprite(platform, "idle"),
      accent: profile.accent,
      isAttacker: current?.attacker === platform,
      isTarget: (current?.targets || []).includes(platform),
      isWinner:
        arena?.duel?.winner === platform || arena?.tournament?.champion === platform
    };
  }

  return {
    fighters: out,
    current: current
      ? {
          ...current,
          remainingMs: Math.max(0, toNumber(current.holdUntil, 0) - now)
        }
      : null,
    active: Boolean(arena?.duel?.active || arena?.tournament?.active)
  };
}

module.exports = {
  BATTLE_ANIM_TO_POSE,
  BATTLE_ANIM_TO_CYCLE,
  resolveKojBattleContext,
  resolveBattleDisplayMood,
  buildArenaFighterStates,
  mapAnimToPose,
  mapAnimToCycle
};
