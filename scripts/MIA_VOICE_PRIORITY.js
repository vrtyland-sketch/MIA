"use strict";

/**
 * MIA_VOICE_PRIORITY
 *
 * izolovaná vrstva dominance pro voice overlay:
 * - voice může na krátkou dobu uzamknout overlay owner/stage
 * - runtime/chat/gift může dál běžet, ale overlay se dočasně nepřepíše
 * - bez zásahu do OBS auto scene switch logiky
 * - high tier support (T3/T4) může voice lock prorazit
 */

function createVoicePriorityLayer(deps = {}) {
  const nowTs = deps.nowTs || (() => Date.now());
  const appendJsonLog = deps.appendJsonLog || (() => {});

  const state = {
    lockActive: false,
    lockOwner: "",
    lockStage: "",
    lockSource: "",
    lockUntilTs: 0,
    lastActivatedAt: 0
  };

  function getSnapshot() {
    const now = nowTs();
    const active = state.lockActive === true && state.lockUntilTs > now;

    if (!active && state.lockActive) {
      clearLock("expired");
    }

    return {
      active: state.lockActive === true && state.lockUntilTs > nowTs(),
      lockOwner: state.lockOwner,
      lockStage: state.lockStage,
      lockSource: state.lockSource,
      lockUntilTs: Number(state.lockUntilTs || 0),
      lastActivatedAt: Number(state.lastActivatedAt || 0)
    };
  }

  function activateVoicePriority(input = {}) {
    const owner = safeString(input.owner, "mia").toLowerCase();
    const stage = safeString(input.stage, "voice");
    const source = safeString(input.source, "voice_command");
    const holdMs = clampMs(input.holdMs, 2500);

    state.lockActive = true;
    state.lockOwner = owner;
    state.lockStage = stage;
    state.lockSource = source;
    state.lockUntilTs = nowTs() + holdMs;
    state.lastActivatedAt = nowTs();

    appendJsonLog("mia-events", {
      ts: nowTs(),
      stage: "voice_priority_activated",
      owner,
      source,
      holdMs,
      lockUntilTs: state.lockUntilTs
    });

    return getSnapshot();
  }

  function clearLock(reason = "manual_clear") {
    const hadLock = state.lockActive === true;

    state.lockActive = false;
    state.lockOwner = "";
    state.lockStage = "";
    state.lockSource = "";
    state.lockUntilTs = 0;

    if (hadLock) {
      appendJsonLog("mia-events", {
        ts: nowTs(),
        stage: "voice_priority_cleared",
        reason
      });
    }

    return getSnapshot();
  }

  function shouldBlockOverlay(overlayPayload) {
    const snapshot = getSnapshot();

    if (!snapshot.active) {
      return {
        blocked: false,
        reason: "no_active_voice_lock",
        snapshot
      };
    }

    const owner = safeString(overlayPayload?.owner, "mia").toLowerCase();
    const stage = safeString(overlayPayload?.stage, "");

    if (stage === "voice") {
      return {
        blocked: false,
        reason: "voice_overlay_allowed",
        snapshot
      };
    }

    if (shouldOverrideBySupport(overlayPayload)) {
      return {
        blocked: false,
        reason: "high_tier_override",
        snapshot
      };
    }

    if (owner === snapshot.lockOwner) {
      return {
        blocked: false,
        reason: "same_owner_allowed",
        snapshot
      };
    }

    return {
      blocked: true,
      reason: "voice_priority_lock_active",
      snapshot
    };
  }

  return {
    getSnapshot,
    activateVoicePriority,
    clearLock,
    shouldBlockOverlay
  };
}

function shouldOverrideBySupport(overlayPayload) {
  const tier = safeString(overlayPayload?.tier).toUpperCase();

  if (!tier) return false;
  if (tier === "T4") return true;
  if (tier === "T3") return true;

  return false;
}

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function clampMs(value, fallback = 2500) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(250, Math.min(15000, Math.round(n)));
}

module.exports = {
  createVoicePriorityLayer
};