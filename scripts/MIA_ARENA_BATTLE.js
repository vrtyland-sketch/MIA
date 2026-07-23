"use strict";

const fs = require("fs");
const path = require("path");
const { resolveItemUseEffect } = require("./MIA_KOJNOZROUT_ITEM_EFFECT");

/**
 * Pokémon-styl battle logika pro platformní Koje.
 * MIA ví, z které platformy přišel dárek/item → ten Koj útočí / hází item na ostatní.
 */

const roster = require("./MIA_KOJ_ROSTER");

const PLATFORMS = ["tiktok", "kick", "twitch", "youtube"];

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function nowTs() {
  return Date.now();
}

function createBattleState(seed = {}) {
  return {
    actions: Array.isArray(seed.actions) ? seed.actions.slice(0, 24) : [],
    lastActionId: toNumber(seed.lastActionId, 0)
  };
}

function resolveMoveFromItem(item = {}) {
  const effect = resolveItemUseEffect(item, { action: "use" });
  const role = safeString(effect.role || item.role).toLowerCase();
  const label = safeString(effect.itemLabel || item.label, item.id);

  const animByRole = {
    food: "item_buff",
    heal: "item_heal",
    comfort: "item_buff",
    care: "item_heal",
    duel: effect.pose === "attack" || effect.pose === "attack2" ? "attack" : "item_box"
  };
  const effectByRole = {
    food: "buff",
    heal: "heal",
    comfort: "buff",
    care: "buff",
    duel: "damage"
  };

  return {
    move: role || "strike",
    anim: animByRole[role] || safeString(effect.pose, "attack"),
    projectile: safeString(effect.projectile, "coin"),
    effect: effectByRole[role] || "damage",
    label: label.toUpperCase()
  };
}

function resolveMoveFromEvent(eventType = "", item = null) {
  const type = safeString(eventType).toUpperCase();
  if (item) return resolveMoveFromItem(item);
  if (type === "GIFT") {
    return {
      move: "gift_strike",
      anim: "attack",
      projectile: "coin",
      effect: "damage",
      label: "DÁREK"
    };
  }
  if (type === "COMMENT") {
    return {
      move: "chat_spark",
      anim: "excited",
      projectile: "spark",
      effect: "buff",
      label: "CHAT"
    };
  }
  return {
    move: "poke",
    anim: "happy",
    projectile: "spark",
    effect: "buff",
    label: "POKE"
  };
}

function otherPlatforms(attacker = "") {
  return PLATFORMS.filter((p) => p !== attacker);
}

/**
 * Vytvoř battle akci: útočník = platforma zdroje, cíle = ostatní žrouti.
 */
function pushBattleAction(battleState = {}, payload = {}) {
  const state = createBattleState(battleState);
  const attacker = safeString(payload.platform, "tiktok").toLowerCase();
  if (!PLATFORMS.includes(attacker)) {
    return { state, action: null };
  }

  const profile = roster.getKojProfile(attacker);
  const move = resolveMoveFromEvent(payload.eventType, payload.item);
  const targets =
    move.effect === "heal" || move.effect === "buff"
      ? [attacker]
      : otherPlatforms(attacker);

  // Box / damage item z Kick → Kick Koj hází box na ostatní.
  const power = Math.max(
    4,
    Math.round(toNumber(payload.miaPoints, 0) * 0.12) || toNumber(payload.item?.power, 8)
  );

  const id = state.lastActionId + 1;
  const at = nowTs();
  const action = {
    id,
    at,
    holdUntil: at + 3200,
    attacker,
    attackerName: profile.name,
    targets,
    move: move.move,
    anim: move.anim,
    projectile: move.projectile,
    effect: move.effect,
    label: move.label,
    itemId: safeString(payload.item?.id),
    itemLabel: safeString(payload.item?.label),
    userLabel: safeString(payload.userLabel, "divák"),
    power,
    text:
      move.effect === "damage"
        ? `${profile.name} používá ${move.label} na ostatní žrouty!`
        : `${profile.name} používá ${move.label}!`
  };

  state.lastActionId = id;
  state.actions = [action, ...state.actions].slice(0, 24);
  return { state, action };
}

function pruneBattleActions(battleState = {}, now = nowTs()) {
  const state = createBattleState(battleState);
  state.actions = state.actions.filter((a) => toNumber(a.holdUntil, 0) > now - 800);
  return state;
}

function resolveBattleFramePose(pose = "idle", actionId = 0) {
  const p = safeString(pose, "idle").toLowerCase();
  if (p === "attack" || p === "attack2" || p === "item_box") {
    const frames = ["attack_01", "attack_02", "attack_03"];
    return frames[toNumber(actionId, 0) % frames.length];
  }
  if (p === "hit" || p === "hit2") {
    return toNumber(actionId, 0) % 2 === 0 ? "hit_02" : "hit_01";
  }
  return p;
}

function getBattleSnapshot(battleState = {}) {
  const state = pruneBattleActions(battleState);
  const now = nowTs();
  const live = state.actions.filter((a) => toNumber(a.holdUntil, 0) > now);
  const current = live[0] || null;

  const poses = {};
  for (const p of PLATFORMS) {
    poses[p] = "idle";
  }
  if (current) {
    const atkAnim = current.anim || "attack";
    // Střídej attack / attack2 pro bohatší dojem.
    poses[current.attacker] =
      atkAnim === "attack" && current.id % 2 === 0 ? "attack2" : atkAnim;
    if (current.effect === "damage") {
      for (const t of current.targets || []) {
        poses[t] = current.id % 2 === 0 ? "hit2" : "hit";
      }
    } else if (current.effect === "heal" || current.effect === "buff") {
      poses[current.attacker] = current.anim || "item_buff";
    }
  }

  return {
    current,
    recent: state.actions.slice(0, 8),
    poses,
    sprites: Object.fromEntries(
      PLATFORMS.map((p) => {
        const profile = roster.getKojProfile(p);
        const basePose = poses[p] || "idle";
        const pose = current
          ? resolveBattleFramePose(basePose, current.id)
          : basePose;
        const formDir = profile.formDir || `/assets/kojnozrout/forms/${p}`;
        const framePath = path.join(
          __dirname,
          "..",
          "mia-output-overlay",
          "assets",
          "kojnozrout",
          "forms",
          p,
          `${pose}.png`
        );
        const spriteFile = fs.existsSync(framePath) ? pose : basePose;
        return [
          p,
          {
            name: profile.name,
            title: profile.title,
            pose: basePose,
            framePose: spriteFile,
            spriteUrl: `${formDir}/${spriteFile}.png`,
            idleUrl: `${formDir}/idle.png`,
            attackUrl: `${formDir}/attack.png`,
            hitUrl: `${formDir}/hit.png`,
            winUrl: `${formDir}/win.png`,
            boxUrl: `${formDir}/item_box.png`,
            accent: profile.accent
          }
        ];
      })
    )
  };
}

module.exports = {
  PLATFORMS,
  createBattleState,
  resolveMoveFromItem,
  resolveMoveFromEvent,
  pushBattleAction,
  pruneBattleActions,
  getBattleSnapshot
};
