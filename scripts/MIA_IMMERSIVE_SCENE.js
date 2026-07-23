"use strict";

const sceneEngine = require("../shared/mia-scene-engine");
const overlayState = require("./MIA_OVERLAY_STATE");

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function buildImmersiveScenePayload(input = {}) {
  const plan = sceneEngine.resolveSceneFromContext(input);
  const holdMs = Math.max(3000, toNumber(input.holdMs, plan.mode === "combat" ? 12000 : 8000));
  return {
    ...plan,
    active: true,
    holdMs,
    userLabel: safeString(input.userLabel || input.nickname),
    trigger: safeString(input.trigger, "manual")
  };
}

function applyImmersiveScene(state, input = {}) {
  const payload = buildImmersiveScenePayload(input);
  if (typeof overlayState.setImmersiveScene === "function") {
    return overlayState.setImmersiveScene(state, payload);
  }
  return payload;
}

function clearImmersiveScene(state) {
  if (typeof overlayState.clearImmersiveScene === "function") {
    return overlayState.clearImmersiveScene(state);
  }
  return { cleared: true };
}

function getSceneCatalog() {
  return {
    ok: true,
    environments: sceneEngine.listEnvironments(),
    creatures: sceneEngine.listCreatures(),
    cameras: sceneEngine.listCameraSlots(),
    mattingProvider: "mia_matting_v1",
    provider: "mia_scene_engine_v1"
  };
}

function resolveScene(input = {}) {
  return sceneEngine.resolveSceneFromContext(input);
}

let lastChatAutoApplyAt = 0;

function shouldAutoApplyFromChat(plan = {}) {
  if (plan.mode === "combat") return true;
  const envId = safeString(plan.environmentId);
  return envId && envId !== "studio_neutral";
}

function tryAutoApplyFromChat(state, input = {}, opts = {}) {
  const chatText = safeString(input.chatText || input.message);
  if (!chatText) return null;

  const cooldownMs = Math.max(5000, toNumber(opts.chatCooldownMs, 45000));
  const now = Date.now();
  if (now - lastChatAutoApplyAt < cooldownMs) {
    return { ok: false, skipped: true, reason: "cooldown" };
  }

  const plan = sceneEngine.resolveSceneFromChat(chatText, input);
  if (!shouldAutoApplyFromChat(plan)) {
    return { ok: false, skipped: true, reason: "no_scene_match" };
  }

  const applied = applyImmersiveScene(state, {
    ...input,
    chatText,
    mode: plan.mode,
    environmentId: plan.environmentId,
    trigger: safeString(input.trigger, "chat_auto")
  });
  lastChatAutoApplyAt = now;
  return { ok: true, applied, plan };
}

module.exports = {
  buildImmersiveScenePayload,
  applyImmersiveScene,
  clearImmersiveScene,
  getSceneCatalog,
  resolveScene,
  shouldAutoApplyFromChat,
  tryAutoApplyFromChat
};
