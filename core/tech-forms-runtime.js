"use strict";

/**
 * Phase 3 — Tech Forms live runtime (roadmap §6).
 * Wraps scripts/MIA_KOJ_ROBOT_MODES.js. Default OFF unless MIA_TECH_FORMS=1.
 */

const robotModes = require("../scripts/MIA_KOJ_ROBOT_MODES");

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function envFlag(name) {
  const v = String(process.env[name] || "").trim().toLowerCase();
  if (!v) return null;
  if (v === "1" || v === "true" || v === "yes" || v === "on") return true;
  if (v === "0" || v === "false" || v === "no" || v === "off") return false;
  return null;
}

/** Roadmap names → robot form ids */
const FORM_ALIASES = Object.freeze({
  pet: robotModes.KOJ_ROBOT_FORMS.PET,
  assistant: robotModes.KOJ_ROBOT_FORMS.ASSISTANT,
  scout: robotModes.KOJ_ROBOT_FORMS.SCANNER,
  scanner: robotModes.KOJ_ROBOT_FORMS.SCANNER,
  shield: robotModes.KOJ_ROBOT_FORMS.SHIELD,
  guardian: robotModes.KOJ_ROBOT_FORMS.SHIELD,
  battle_tool: robotModes.KOJ_ROBOT_FORMS.BATTLE_TOOL,
  battle: robotModes.KOJ_ROBOT_FORMS.BATTLE_TOOL,
  projector: robotModes.KOJ_ROBOT_FORMS.PROJECTOR,
  party: robotModes.KOJ_ROBOT_FORMS.PROJECTOR
});

function isTechFormsEnabled(runtimeConfig = {}) {
  const env = envFlag("MIA_TECH_FORMS");
  if (env === false) return false;
  if (env === true) return true;
  const cfg = runtimeConfig?.phase3?.techForms ?? runtimeConfig?.techForms;
  if (cfg && cfg.enabled === true) return true;
  return false;
}

function resolveFormId(formId) {
  const raw = safeString(formId).toLowerCase();
  if (!raw) return robotModes.KOJ_ROBOT_FORMS.PET;
  if (FORM_ALIASES[raw]) return FORM_ALIASES[raw];
  return robotModes.normalizeFormId(raw);
}

function buildFormOverlayHint(formId, meta = {}) {
  const id = resolveFormId(formId);
  const formMeta = robotModes.getFormMeta(id);
  return {
    kind: "tech_form",
    formId: id,
    label: formMeta.label,
    moodFlash: id === robotModes.KOJ_ROBOT_FORMS.PET ? "warm" : "excited",
    message: id === robotModes.KOJ_ROBOT_FORMS.PET
      ? "Koj je zase mazlíček."
      : `Koj: forma ${formMeta.label}`,
    at: Date.now(),
    ...meta
  };
}

/**
 * Apply activation onto koj state when flag is on.
 * Returns { ok, reason, state, overlayHint, cost }.
 */
function activateTechForm(kojnozoutState = {}, formId, options = {}) {
  if (!isTechFormsEnabled(options.runtimeConfig) && !options.force) {
    return { ok: false, reason: "tech_forms_disabled", state: kojnozoutState };
  }

  const target = resolveFormId(formId);
  const preview = robotModes.previewActivateForm(kojnozoutState, target, {
    now: options.now,
    miaPoints: options.miaPoints,
    forceUnlock: options.forceUnlock === true
  });

  if (!preview.ok) {
    return { ok: false, reason: preview.reason, state: kojnozoutState };
  }

  return {
    ok: true,
    reason: null,
    state: preview.state,
    cost: preview.cost,
    overlayHint: buildFormOverlayHint(target)
  };
}

/**
 * Expire active tech form back to pet when formExpiresAt passed.
 */
function tickTechForms(kojnozoutState = {}, options = {}) {
  if (!isTechFormsEnabled(options.runtimeConfig) && !options.force) {
    return { changed: false, state: kojnozoutState };
  }

  const now = toNumber(options.now, Date.now());
  const modes = robotModes.createRobotModesState(kojnozoutState.robotModes || {});
  if (
    modes.activeForm === robotModes.KOJ_ROBOT_FORMS.PET ||
    !modes.formExpiresAt ||
    modes.formExpiresAt > now
  ) {
    return { changed: false, state: kojnozoutState };
  }

  const next = activateTechForm(kojnozoutState, robotModes.KOJ_ROBOT_FORMS.PET, {
    ...options,
    force: true
  });
  return {
    changed: next.ok === true,
    state: next.ok ? next.state : kojnozoutState,
    overlayHint: next.overlayHint || null
  };
}

function unlockTechForm(kojnozoutState = {}, formId, options = {}) {
  const target = resolveFormId(formId);
  const modes = robotModes.createRobotModesState(kojnozoutState.robotModes || {});
  const unlocked = new Set(modes.unlockedForms);
  unlocked.add(target);
  return {
    ...kojnozoutState,
    robotModes: {
      ...modes,
      unlockedForms: Array.from(unlocked)
    }
  };
}

function getTechFormsPublicSnapshot(kojnozoutState = {}, runtimeConfig = {}) {
  const snap = robotModes.getRobotModesSnapshot(kojnozoutState);
  return {
    enabled: isTechFormsEnabled(runtimeConfig),
    ...snap,
    aliases: { scout: "scanner", guardian: "shield", battle: "battle_tool", party: "projector" }
  };
}

module.exports = {
  FORM_ALIASES,
  isTechFormsEnabled,
  resolveFormId,
  activateTechForm,
  tickTechForms,
  unlockTechForm,
  buildFormOverlayHint,
  getTechFormsPublicSnapshot,
  KOJ_ROBOT_FORMS: robotModes.KOJ_ROBOT_FORMS
};
