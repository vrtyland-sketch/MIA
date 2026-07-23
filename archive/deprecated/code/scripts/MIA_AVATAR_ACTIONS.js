"use strict";

/**
 * MIA_AVATAR_ACTIONS.js
 *
 * Future-proof avatar action builder for:
 * - MIA entity
 * - Kojnožrout
 * - viewer avatars
 *
 * Safe for current MVP:
 * - only builds action descriptors
 * - does not execute OBS / visual runtime
 * - current system can ignore avatarActions without breaking anything
 */

function nowTs() {
  return Date.now();
}

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function getUserLabel(user) {
  if (!user || typeof user !== "object") return "";

  return (
    safeString(user.nickname) ||
    safeString(user.username) ||
    safeString(user.displayName) ||
    safeString(user.name) ||
    safeString(user.slug) ||
    (user.id !== undefined && user.id !== null ? String(user.id) : "")
  );
}

function getUserId(user) {
  if (!user || typeof user !== "object") return "";

  return (
    safeString(user.userId) ||
    safeString(user.id) ||
    safeString(user.username) ||
    safeString(user.nickname) ||
    safeString(user.displayName)
  );
}

function buildBaseAvatarAction(input = {}) {
  const entityType = safeString(input.entityType, "system");
  const entityId = safeString(input.entityId, entityType);
  const actorUser = input.actorUser && typeof input.actorUser === "object"
    ? clone(input.actorUser)
    : null;

  return {
    ts: nowTs(),
    kind: safeString(input.kind, "avatar_action"),
    priority: toNumber(input.priority, 100),
    entityType,
    entityId,
    action: safeString(input.action, "idle"),
    trigger: safeString(input.trigger, "system"),
    route: safeString(input.route, ""),
    stage: safeString(input.stage, "planned"),
    targetType: safeString(input.targetType, ""),
    targetId: safeString(input.targetId, ""),
    targetAnchor: safeString(input.targetAnchor, ""),
    holdMs: toNumber(input.holdMs, 0),
    durationMs: toNumber(input.durationMs, 0),
    intensity: Math.max(1, toNumber(input.intensity, 1)),
    payload: input.payload && typeof input.payload === "object" ? clone(input.payload) : {},
    actor: actorUser
      ? {
          userId: getUserId(actorUser),
          label: getUserLabel(actorUser),
          user: actorUser
        }
      : {
          userId: "",
          label: "",
          user: null
        }
  };
}

function buildMiaAction(input = {}) {
  return buildBaseAvatarAction({
    kind: "mia_action",
    entityType: "mia",
    entityId: safeString(input.entityId, "mia.main"),
    priority: toNumber(input.priority, 220),
    action: safeString(input.action, "speak"),
    trigger: safeString(input.trigger, "system"),
    route: safeString(input.route, "community"),
    stage: safeString(input.stage, "planned"),
    targetType: safeString(input.targetType),
    targetId: safeString(input.targetId),
    targetAnchor: safeString(input.targetAnchor),
    holdMs: toNumber(input.holdMs, 2200),
    durationMs: toNumber(input.durationMs, 2200),
    intensity: Math.max(1, toNumber(input.intensity, 1)),
    payload: input.payload,
    actorUser: input.actorUser
  });
}

function buildKojnozoutAction(input = {}) {
  return buildBaseAvatarAction({
    kind: "kojnozout_action",
    entityType: "kojnozout",
    entityId: safeString(input.entityId, "kojnozout.pet"),
    priority: toNumber(input.priority, 240),
    action: safeString(input.action, "react"),
    trigger: safeString(input.trigger, "community"),
    route: safeString(input.route, "community"),
    stage: safeString(input.stage, "planned"),
    targetType: safeString(input.targetType),
    targetId: safeString(input.targetId),
    targetAnchor: safeString(input.targetAnchor),
    holdMs: toNumber(input.holdMs, 2200),
    durationMs: toNumber(input.durationMs, 2200),
    intensity: Math.max(1, toNumber(input.intensity, 1)),
    payload: input.payload,
    actorUser: input.actorUser
  });
}

function buildViewerAvatarAction(input = {}) {
  const actorUser = input.actorUser && typeof input.actorUser === "object"
    ? input.actorUser
    : null;

  const fallbackId = actorUser ? getUserId(actorUser) : "viewer.unknown";
  const fallbackLabel = actorUser ? getUserLabel(actorUser) : "viewer";

  return buildBaseAvatarAction({
    kind: "viewer_avatar_action",
    entityType: "viewer_avatar",
    entityId: safeString(input.entityId, `viewer.${fallbackId || "unknown"}`),
    priority: toNumber(input.priority, 260),
    action: safeString(input.action, "spawn"),
    trigger: safeString(input.trigger, "community"),
    route: safeString(input.route, "community"),
    stage: safeString(input.stage, "planned"),
    targetType: safeString(input.targetType),
    targetId: safeString(input.targetId),
    targetAnchor: safeString(input.targetAnchor, "world.default"),
    holdMs: toNumber(input.holdMs, 2600),
    durationMs: toNumber(input.durationMs, 2600),
    intensity: Math.max(1, toNumber(input.intensity, 1)),
    payload: {
      label: fallbackLabel,
      ...((input.payload && typeof input.payload === "object") ? clone(input.payload) : {})
    },
    actorUser
  });
}

module.exports = {
  buildBaseAvatarAction,
  buildMiaAction,
  buildKojnozoutAction,
  buildViewerAvatarAction,
  getUserId,
  getUserLabel
};