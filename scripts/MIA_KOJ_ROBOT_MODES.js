"use strict";

/**
 * Koj robot Tech Forms — pure contract (Pet Core always on).
 * Design: docs/_export_koj_robot_pet_game_logic.md
 *
 * Not wired into gift/OBS runtime activation yet — state shape + helpers only.
 */

const KOJ_ROBOT_FORMS = Object.freeze({
  PET: "pet",
  ASSISTANT: "assistant",
  SHIELD: "shield",
  BATTLE_TOOL: "battle_tool",
  SCANNER: "scanner",
  PROJECTOR: "projector"
});

const TECH_FORMS = Object.freeze([
  KOJ_ROBOT_FORMS.ASSISTANT,
  KOJ_ROBOT_FORMS.SHIELD,
  KOJ_ROBOT_FORMS.BATTLE_TOOL,
  KOJ_ROBOT_FORMS.SCANNER,
  KOJ_ROBOT_FORMS.PROJECTOR
]);

const FORM_META = Object.freeze({
  [KOJ_ROBOT_FORMS.PET]: {
    id: KOJ_ROBOT_FORMS.PET,
    label: "Mazlíček",
    layer: "pet_core",
    defaultUnlocked: true,
    maxDurationMs: 0,
    cooldownMs: 0,
    energyCost: 0,
    miaPointsCost: 0
  },
  [KOJ_ROBOT_FORMS.ASSISTANT]: {
    id: KOJ_ROBOT_FORMS.ASSISTANT,
    label: "AI asistent",
    layer: "tech_form",
    defaultUnlocked: false,
    maxDurationMs: 60000,
    cooldownMs: 45000,
    energyCost: 8,
    miaPointsCost: 0,
    anchorHint: "head"
  },
  [KOJ_ROBOT_FORMS.SHIELD]: {
    id: KOJ_ROBOT_FORMS.SHIELD,
    label: "Obrana",
    layer: "tech_form",
    defaultUnlocked: false,
    maxDurationMs: 90000,
    cooldownMs: 60000,
    energyCost: 12,
    miaPointsCost: 6,
    anchorHint: "belly"
  },
  [KOJ_ROBOT_FORMS.BATTLE_TOOL]: {
    id: KOJ_ROBOT_FORMS.BATTLE_TOOL,
    label: "Bojový nástroj",
    layer: "tech_form",
    defaultUnlocked: false,
    maxDurationMs: 90000,
    cooldownMs: 60000,
    energyCost: 16,
    miaPointsCost: 10,
    anchorHint: "body"
  },
  [KOJ_ROBOT_FORMS.SCANNER]: {
    id: KOJ_ROBOT_FORMS.SCANNER,
    label: "Skener",
    layer: "tech_form",
    defaultUnlocked: false,
    maxDurationMs: 45000,
    cooldownMs: 30000,
    energyCost: 6,
    miaPointsCost: 0,
    anchorHint: "eye"
  },
  [KOJ_ROBOT_FORMS.PROJECTOR]: {
    id: KOJ_ROBOT_FORMS.PROJECTOR,
    label: "Projektor",
    layer: "tech_form",
    defaultUnlocked: false,
    maxDurationMs: 45000,
    cooldownMs: 40000,
    energyCost: 10,
    miaPointsCost: 4,
    anchorHint: "belly"
  }
});

const EVOLUTION_COMBAT_BASE = Object.freeze({
  egg: 8,
  hatch: 16,
  grow: 28,
  teen: 40,
  adult: 55,
  legend: 72
});

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function isKnownForm(formId) {
  return Object.prototype.hasOwnProperty.call(FORM_META, safeString(formId));
}

function normalizeFormId(formId, fallback = KOJ_ROBOT_FORMS.PET) {
  const id = safeString(formId, fallback);
  return isKnownForm(id) ? id : fallback;
}

function createRobotModesState(seed = {}) {
  const unlockedRaw = Array.isArray(seed.unlockedForms) ? seed.unlockedForms : [];
  const unlocked = new Set([KOJ_ROBOT_FORMS.PET]);
  for (const item of unlockedRaw) {
    const id = normalizeFormId(item, "");
    if (id) unlocked.add(id);
  }

  return {
    activeForm: normalizeFormId(seed.activeForm, KOJ_ROBOT_FORMS.PET),
    unlockedForms: Array.from(unlocked),
    miaSync: clamp(toNumber(seed.miaSync, 0), 0, 100),
    combatPower: clamp(toNumber(seed.combatPower, 0), 0, 100),
    formExpiresAt: toNumber(seed.formExpiresAt, 0),
    formCooldownUntil: toNumber(seed.formCooldownUntil, 0),
    lastFormId: seed.lastFormId ? normalizeFormId(seed.lastFormId) : null,
    lastFormChangedAt: toNumber(seed.lastFormChangedAt, 0)
  };
}

function getFormMeta(formId) {
  const id = normalizeFormId(formId);
  return FORM_META[id];
}

function estimateFormCost(formId) {
  const meta = getFormMeta(formId);
  return {
    formId: meta.id,
    energy: meta.energyCost,
    miaPoints: meta.miaPointsCost,
    durationMs: meta.maxDurationMs,
    cooldownMs: meta.cooldownMs
  };
}

function deriveCombatPower(kojnozoutState = {}, robotModes = null) {
  const modes = robotModes || createRobotModesState(kojnozoutState.robotModes || {});
  const tier = safeString(kojnozoutState.evolutionTier, "egg").toLowerCase();
  const base = toNumber(EVOLUTION_COMBAT_BASE[tier], 12);
  const bond = toNumber(kojnozoutState?.bond?.careBond, 12);
  const energy = toNumber(kojnozoutState.energy, 50);
  const neglect = toNumber(kojnozoutState?.bond?.neglect, 0);
  const syncBonus = toNumber(modes.miaSync, 0) * 0.12;
  return clamp(
    Math.round(base + bond * 0.08 + energy * 0.25 - neglect * 0.3 + syncBonus),
    0,
    100
  );
}

function isPetCoreLocked(kojnozoutState = {}) {
  const hunger = toNumber(kojnozoutState.hunger, 0);
  const neglect = toNumber(kojnozoutState?.bond?.neglect, 0);
  const mood = safeString(kojnozoutState.mood).toLowerCase();
  const sleeping =
    Boolean(kojnozoutState.isSleeping) ||
    toNumber(kojnozoutState?.vitals?.sleepDepth, 0) >= 55;
  const sick =
    mood === "sick" ||
    safeString(kojnozoutState.affliction).toLowerCase() === "sick";

  if (hunger >= 85) return { locked: true, reason: "hungry" };
  if (sick) return { locked: true, reason: "sick" };
  if (neglect >= 75) return { locked: true, reason: "neglect" };
  if (sleeping) return { locked: true, reason: "sleeping" };
  return { locked: false, reason: null };
}

function canActivateForm(kojnozoutState = {}, formId, options = {}) {
  const now = toNumber(options.now, Date.now());
  const target = normalizeFormId(formId);
  const modes = createRobotModesState(kojnozoutState.robotModes || {});
  const meta = getFormMeta(target);
  const energy = toNumber(kojnozoutState.energy, 0);
  const availableMiaPoints = toNumber(options.miaPoints, 0);

  if (target === KOJ_ROBOT_FORMS.PET) {
    return { ok: true, formId: target, reason: null };
  }

  if (!modes.unlockedForms.includes(target) && !options.forceUnlock) {
    return { ok: false, formId: target, reason: "locked_form" };
  }

  const petLock = isPetCoreLocked(kojnozoutState);
  if (petLock.locked) {
    return { ok: false, formId: target, reason: `pet_core_${petLock.reason}` };
  }

  if (modes.formCooldownUntil > now && modes.activeForm === KOJ_ROBOT_FORMS.PET) {
    return { ok: false, formId: target, reason: "cooldown" };
  }

  if (energy < meta.energyCost) {
    return { ok: false, formId: target, reason: "energy" };
  }

  if (meta.miaPointsCost > 0 && availableMiaPoints < meta.miaPointsCost) {
    return { ok: false, formId: target, reason: "mia_points" };
  }

  return { ok: true, formId: target, reason: null, cost: estimateFormCost(target) };
}

/**
 * Pure preview of activation — does not mutate gift/overlay pipelines.
 * Callers may apply the returned `next` later when wiring is ready.
 */
function previewActivateForm(kojnozoutState = {}, formId, options = {}) {
  const gate = canActivateForm(kojnozoutState, formId, options);
  if (!gate.ok) {
    return { ok: false, reason: gate.reason, state: kojnozoutState };
  }

  const now = toNumber(options.now, Date.now());
  const target = gate.formId;
  const meta = getFormMeta(target);
  const modes = createRobotModesState(kojnozoutState.robotModes || {});
  const unlocked = new Set(modes.unlockedForms);
  unlocked.add(target);

  const nextModes = {
    ...modes,
    activeForm: target,
    unlockedForms: Array.from(unlocked),
    lastFormId: modes.activeForm,
    lastFormChangedAt: now,
    formExpiresAt: target === KOJ_ROBOT_FORMS.PET ? 0 : now + meta.maxDurationMs,
    formCooldownUntil:
      target === KOJ_ROBOT_FORMS.PET ? modes.formCooldownUntil : now + meta.cooldownMs,
    combatPower: deriveCombatPower(kojnozoutState, modes)
  };

  if (target !== KOJ_ROBOT_FORMS.PET) {
    nextModes.miaSync = clamp(modes.miaSync + 1.5, 0, 100);
  }

  return {
    ok: true,
    reason: null,
    cost: estimateFormCost(target),
    state: {
      ...kojnozoutState,
      energy:
        target === KOJ_ROBOT_FORMS.PET
          ? toNumber(kojnozoutState.energy, 0)
          : clamp(toNumber(kojnozoutState.energy, 0) - meta.energyCost, 0, 100),
      robotModes: nextModes
    }
  };
}

function getRobotModesSnapshot(kojnozoutState = {}) {
  const modes = createRobotModesState(kojnozoutState.robotModes || {});
  const combatPower = deriveCombatPower(kojnozoutState, modes);
  const activeMeta = getFormMeta(modes.activeForm);
  return {
    activeForm: modes.activeForm,
    activeLabel: activeMeta.label,
    layer: activeMeta.layer,
    unlockedForms: modes.unlockedForms.slice(),
    miaSync: Math.round(modes.miaSync),
    combatPower,
    formExpiresAt: modes.formExpiresAt || null,
    formCooldownUntil: modes.formCooldownUntil || null,
    petCoreAlwaysOn: true
  };
}

module.exports = {
  KOJ_ROBOT_FORMS,
  TECH_FORMS,
  FORM_META,
  createRobotModesState,
  getFormMeta,
  estimateFormCost,
  deriveCombatPower,
  isPetCoreLocked,
  canActivateForm,
  previewActivateForm,
  getRobotModesSnapshot,
  normalizeFormId,
  isKnownForm
};
