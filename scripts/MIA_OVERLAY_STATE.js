"use strict";

function nowTs() {
  return Date.now();
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

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

function normalizeText(value) {
  return safeString(value, "").replace(/\s+/g, " ").trim();
}

function resolveOverlayText(payload = {}) {
  return normalizeText(
    payload.text ||
      payload.overlay_text ||
      payload.speech_text ||
      payload.overlayText ||
      payload.speechText
  );
}

function normalizeOwner(payload = {}) {
  const owner = safeString(
    payload.owner ||
      payload.creature ||
      payload.actor ||
      payload.speaker,
    "mia"
  ).toLowerCase();

  if (owner === "kojnozrout") return "kojnozout";
  if (owner === "kojnozout") return "kojnozout";
  return "mia";
}

function normalizeRoute(payload = {}) {
  return safeString(payload.route, "community").toLowerCase();
}

function normalizePriority(priority, payload = {}) {
  const explicit = Number(priority);
  if (Number.isFinite(explicit)) {
    return clamp(explicit, 0, 10);
  }

  const route = normalizeRoute(payload);
  const owner = normalizeOwner(payload);

  if (route === "support" && owner === "kojnozout") return 6;
  if (route === "support") return 5;
  if (route === "community") return 3;
  return 1;
}

function normalizeHoldMs(holdMs, payload = {}) {
  const explicit = Number(holdMs);
  const route = normalizeRoute(payload);
  const minHold = route === "support" ? 10000 : 8500;

  if (Number.isFinite(explicit) && explicit >= 0) {
    return Math.max(minHold, explicit);
  }

  if (route === "support") return 10000;
  return 12000;
}

function getOverlaySignature(payload = {}) {
  return JSON.stringify({
    owner: normalizeOwner(payload),
    route: normalizeRoute(payload),
    title: normalizeText(payload.title),
    text: resolveOverlayText(payload),
    subtext: normalizeText(payload.subtext),
    user: safeString(payload.user || payload.userLabel),
    giftName: safeString(payload.giftName),
    tier: safeString(payload.tier),
    action: safeString(payload.action),
    bowlPercent: toNumber(payload.bowlPercent, 0),
    mood: safeString(payload.mood),
    stage: safeString(payload.stage)
  });
}

function getChatSignature(item = {}) {
  return JSON.stringify({
    platform: safeString(item.platform).toLowerCase(),
    user: normalizeText(item.user || item.userLabel).toLowerCase(),
    text: normalizeText(item.text || item.message || item.content).toLowerCase(),
    type: safeString(item.type, "chat").toLowerCase()
  });
}

function createOverlayState() {
  return {
    overlayByOwner: {
      mia: null,
      kojnozout: null
    },
    overlaySignatureByOwner: {
      mia: "",
      kojnozout: ""
    },
    overlayHistory: [],
    lastAcceptedAt: 0,
    chatFeed: [],
    recentParticipants: [],
    giftVisual: null,
    giftAnimationMoment: null,
    animationReaction: null,
    storyVisual: null,
    comboMoment: null,
    bossCinematic: null,
    t0Flyby: null,
    immersiveScene: null,
    bossMission: null,
    communityMood: null
  };
}

function ensureState(state) {
  const safeState = state && typeof state === "object"
    ? state
    : createOverlayState();

  if (!Array.isArray(safeState.chatFeed)) {
    safeState.chatFeed = [];
  }

  if (!Array.isArray(safeState.recentParticipants)) {
    safeState.recentParticipants = [];
  }

  if (!Array.isArray(safeState.overlayHistory)) {
    safeState.overlayHistory = [];
  }

  if (!safeState.overlayByOwner || typeof safeState.overlayByOwner !== "object") {
    safeState.overlayByOwner = {
      mia: null,
      kojnozout: null
    };
  }

  if (!Object.prototype.hasOwnProperty.call(safeState.overlayByOwner, "mia")) {
    safeState.overlayByOwner.mia = null;
  }

  if (!Object.prototype.hasOwnProperty.call(safeState.overlayByOwner, "kojnozout")) {
    safeState.overlayByOwner.kojnozout = null;
  }

  if (!safeState.overlaySignatureByOwner || typeof safeState.overlaySignatureByOwner !== "object") {
    safeState.overlaySignatureByOwner = {
      mia: "",
      kojnozout: ""
    };
  }

  if (!Object.prototype.hasOwnProperty.call(safeState.overlaySignatureByOwner, "mia")) {
    safeState.overlaySignatureByOwner.mia = "";
  }

  if (!Object.prototype.hasOwnProperty.call(safeState.overlaySignatureByOwner, "kojnozout")) {
    safeState.overlaySignatureByOwner.kojnozout = "";
  }

  if (!Object.prototype.hasOwnProperty.call(safeState, "lastAcceptedAt")) {
    safeState.lastAcceptedAt = 0;
  }

  return safeState;
}

function pruneOverlayHistory(state, maxAgeMs = 12000) {
  const safeState = ensureState(state);
  const now = nowTs();

  safeState.overlayHistory = safeState.overlayHistory.filter((entry) => {
    return now - toNumber(entry.at, 0) <= maxAgeMs;
  });

  return safeState.overlayHistory;
}

function pruneChatFeed(state, options = {}) {
  const safeState = ensureState(state);
  const now = nowTs();
  const maxAgeMs = Math.max(1000, toNumber(options.maxAgeMs, 15000));

  safeState.chatFeed = safeState.chatFeed.filter((item) => {
    return now - toNumber(item.ts, 0) <= maxAgeMs;
  });

  return safeState.chatFeed;
}

function buildOverlayResponse(payload, accepted, reason, priority, holdMs) {
  const ts = nowTs();

  const normalizedPayload = payload
    ? {
        ...payload,
        owner: normalizeOwner(payload),
        route: normalizeRoute(payload),
        title: normalizeText(payload.title),
        text: resolveOverlayText(payload),
        subtext: normalizeText(payload.subtext),
        user: safeString(payload.user || payload.userLabel),
        userLabel: safeString(payload.userLabel || payload.user),
        priority,
        holdMs,
        accepted,
        reason,
        updatedAt: ts,
        holdUntilTs: ts + holdMs
      }
    : null;

  return normalizedPayload
    ? normalizedPayload
    : {
        accepted,
        reason,
        priority,
        holdMs,
        updatedAt: ts,
        holdUntilTs: ts + holdMs
      };
}

function setOverlay(state, payload, options = {}) {
  const safeState = ensureState(state);

  if (!payload || typeof payload !== "object") {
    return buildOverlayResponse(null, false, "invalid_payload", 0, 0);
  }

  const owner = normalizeOwner(payload);
  const text = resolveOverlayText(payload);

  if (!text) {
    return buildOverlayResponse(payload, false, "empty_text", 0, 0);
  }

  const now = nowTs();
  const priority = normalizePriority(options.priority, payload);
  const holdMs = normalizeHoldMs(options.holdMs, payload);
  const force = options.force === true;

  pruneOverlayHistory(safeState, 12000);

  const nextSignature = getOverlaySignature(payload);
  const lastOverlay = safeState.overlayByOwner[owner] || null;
  const currentPriority = toNumber(lastOverlay?.priority, 0);
  const currentHoldUntilTs = toNumber(lastOverlay?.holdUntilTs, 0);

  const recentDuplicate = safeState.overlayHistory.find((entry) => {
    return (
      entry.owner === owner &&
      entry.signature === nextSignature &&
      now - toNumber(entry.at, 0) <= 5000
    );
  });

  if (recentDuplicate && !force) {
    return buildOverlayResponse(payload, false, "duplicate_recent", priority, holdMs);
  }

  if (
    lastOverlay &&
    now < currentHoldUntilTs &&
    priority < currentPriority &&
    !force
  ) {
    return buildOverlayResponse(payload, false, "lower_priority_blocked", priority, holdMs);
  }

  if (
    lastOverlay &&
    now < currentHoldUntilTs &&
    priority === currentPriority &&
    safeState.overlaySignatureByOwner[owner] === nextSignature &&
    !force
  ) {
    return buildOverlayResponse(payload, false, "same_overlay_already_active", priority, holdMs);
  }

  const acceptedOverlay = {
    ...payload,
    owner,
    route: normalizeRoute(payload),
    title: normalizeText(payload.title),
    text,
    subtext: normalizeText(payload.subtext),
    user: safeString(payload.user || payload.userLabel),
    userLabel: safeString(payload.userLabel || payload.user),
    giftName: safeString(payload.giftName),
    tier: safeString(payload.tier),
    action: safeString(payload.action),
    mood: safeString(payload.mood),
    stage: safeString(payload.stage),
    bowlPercent: clamp(toNumber(payload.bowlPercent, 0), 0, 100),
    bowlVisualLevel: safeString(payload.bowlVisualLevel, "empty"),
    hunger: clamp(toNumber(payload.hunger, 0), 0, 100),
    energy: clamp(toNumber(payload.energy, 0), 0, 100),
    socialState: clamp(toNumber(payload.socialState, 0), -100, 100),
    priority,
    holdMs,
    accepted: true,
    reason: "accepted",
    updatedAt: now,
    holdUntilTs: now + holdMs
  };

  safeState.overlayByOwner[owner] = acceptedOverlay;
  safeState.overlaySignatureByOwner[owner] = nextSignature;
  safeState.lastAcceptedAt = now;
  safeState.overlayHistory.push({
    signature: nextSignature,
    at: now,
    owner: acceptedOverlay.owner,
    route: acceptedOverlay.route
  });

  return clone(acceptedOverlay);
}

function clearOverlay(state, options = {}) {
  const safeState = ensureState(state);
  const force = options.force === true;
  const owner = safeString(options.owner).toLowerCase();

  if (owner === "mia" || owner === "kojnozout" || owner === "kojnozrout") {
    const normalizedOwner = owner === "kojnozrout" ? "kojnozout" : owner;

    safeState.overlayByOwner[normalizedOwner] = null;
    safeState.overlaySignatureByOwner[normalizedOwner] = "";

    return {
      accepted: true,
      cleared: true,
      force,
      owner: normalizedOwner,
      overlay: null
    };
  }

  safeState.overlayByOwner.mia = null;
  safeState.overlayByOwner.kojnozout = null;
  safeState.overlaySignatureByOwner.mia = "";
  safeState.overlaySignatureByOwner.kojnozout = "";

  return {
    accepted: true,
    cleared: true,
    force,
    overlay: null
  };
}

function buildChatSignature(item) {
  return getChatSignature(item);
}

function getParticipantSignature(item = {}) {
  return JSON.stringify({
    user: normalizeText(item.user || item.userLabel).toLowerCase(),
    type: safeString(item.type, "chat").toLowerCase()
  });
}

function pruneRecentParticipants(state, options = {}) {
  const safeState = ensureState(state);
  const now = nowTs();
  const maxAgeMs = Math.max(1000, toNumber(options.maxAgeMs, 300000));

  safeState.recentParticipants = safeState.recentParticipants.filter((item) => {
    return now - toNumber(item.ts, 0) <= maxAgeMs;
  });

  return safeState.recentParticipants;
}

function pushRecentParticipant(state, item, maxItems = 8, options = {}) {
  const safeState = ensureState(state);

  pruneRecentParticipants(safeState, {
    maxAgeMs: toNumber(options.maxAgeMs, 300000)
  });

  const normalizedItem = {
    platform: safeString(item?.platform, "unknown"),
    user: normalizeText(item?.user || item?.userLabel) || "Chat",
    userLabel: normalizeText(item?.userLabel || item?.user) || "Chat",
    userId: item?.userId ?? null,
    avatarUrl: safeString(item?.avatarUrl),
    type: safeString(item?.type, "chat"),
    giftName: safeString(item?.giftName),
    giftCount: Math.max(1, toNumber(item?.giftCount, 1)),
    tier: safeString(item?.tier),
    ts: toNumber(item?.ts, nowTs())
  };

  if (!normalizedItem.user) {
    return clone(safeState.recentParticipants);
  }

  const userKey = normalizedItem.user.toLowerCase();
  safeState.recentParticipants = safeState.recentParticipants.filter((existing) => {
    return normalizeText(existing.user || existing.userLabel).toLowerCase() !== userKey;
  });

  safeState.recentParticipants.unshift(normalizedItem);
  safeState.recentParticipants = safeState.recentParticipants.slice(
    0,
    Math.max(1, toNumber(maxItems, 8))
  );

  return clone(safeState.recentParticipants);
}

function pushChatFeedItem(state, item, maxItems = 5, options = {}) {
  const safeState = ensureState(state);

  pruneChatFeed(safeState, {
    maxAgeMs: toNumber(options.maxAgeMs, 15000)
  });

  const normalizedItem = {
    platform: safeString(item?.platform, "unknown"),
    user: normalizeText(item?.user || item?.userLabel) || "Chat",
    userLabel: normalizeText(item?.userLabel || item?.user) || "Chat",
    avatarUrl: safeString(item?.avatarUrl),
    text: normalizeText(item?.text || item?.message || item?.content),
    type: safeString(item?.type, "chat"),
    ts: toNumber(item?.ts, nowTs())
  };

  if (!normalizedItem.text) {
    return clone(safeState.chatFeed);
  }

  const nextSignature = getChatSignature(normalizedItem);
  const dedupeWindowMs = Math.max(500, toNumber(options.dedupeWindowMs, 8000));

  const duplicate = safeState.chatFeed.find((existing) => {
    const existingSignature = getChatSignature(existing);
    return (
      existingSignature === nextSignature &&
      Math.abs(toNumber(existing.ts, 0) - normalizedItem.ts) <= dedupeWindowMs
    );
  });

  if (duplicate) {
    return clone(safeState.chatFeed);
  }

  safeState.chatFeed.unshift(normalizedItem);
  safeState.chatFeed = safeState.chatFeed
    .sort((a, b) => toNumber(b.ts, 0) - toNumber(a.ts, 0))
    .slice(0, Math.max(1, toNumber(maxItems, 5)));

  return clone(safeState.chatFeed);
}

function clearChatFeed(state) {
  const safeState = ensureState(state);
  safeState.chatFeed = [];
  return [];
}

function getOwnerOverlaySnapshot(state, owner) {
  const safeState = ensureState(state);
  const now = nowTs();
  const normalizedOwner = owner === "kojnozrout" ? "kojnozout" : owner;
  const overlay = safeState.overlayByOwner[normalizedOwner] || null;

  if (!overlay) return null;

  // Peek-only: čtení nemutuje stav. Skutečné vyčištění expirovaných slotů
  // dělá pruneExpiredEphemeral() v getOverlaySnapshot (jediné místo mutace).
  if (toNumber(overlay.holdUntilTs, 0) <= now) {
    return null;
  }

  return clone(overlay);
}

function setGiftVisual(state, payload = {}) {
  const safeState = ensureState(state);
  const now = nowTs();
  const holdMs = Math.max(8000, toNumber(payload.holdMs, 14000));

  safeState.giftVisual = {
    imageUrl: safeString(payload.imageUrl),
    text: normalizeText(payload.text),
    subtext: normalizeText(payload.subtext),
    userLabel: safeString(payload.userLabel),
    giftName: safeString(payload.giftName),
    tier: safeString(payload.tier),
    variantIndex: toNumber(payload.variantIndex, 0),
    effectProgram: safeString(payload.effectProgram),
    avatarLoaded: Boolean(payload.avatarLoaded),
    accepted: true,
    updatedAt: now,
    holdUntilTs: now + holdMs,
    expiresAt: toNumber(payload.expiresAt, now + holdMs)
  };

  return clone(safeState.giftVisual);
}

function getGiftVisualSnapshot(state) {
  const safeState = ensureState(state);
  const visual = safeState.giftVisual;
  if (!visual || typeof visual !== "object") return null;
  if (toNumber(visual.holdUntilTs, 0) <= nowTs()) {
    return null; // peek-only, viz pruneExpiredEphemeral
  }
  return clone(visual);
}

function clearGiftVisual(state) {
  const safeState = ensureState(state);
  safeState.giftVisual = null;
  return { cleared: true };
}

function setGiftAnimationMoment(state, payload = {}) {
  const safeState = ensureState(state);
  const now = nowTs();
  const holdMs = Math.max(6000, toNumber(payload.holdMs, 11000));

  safeState.giftAnimationMoment = {
    jobId: safeString(payload.jobId),
    manifestUrl: safeString(payload.manifestUrl),
    overlayUrl: safeString(payload.overlayUrl),
    posterUrl: safeString(payload.posterUrl),
    videoUrl: safeString(payload.videoUrl),
    avatarUrl: safeString(payload.avatarUrl),
    giftKey: safeString(payload.giftKey),
    giftName: safeString(payload.giftName),
    userLabel: safeString(payload.userLabel),
    caption: normalizeText(payload.caption),
    improvLine: normalizeText(payload.improvLine),
    askChatPrompt: normalizeText(payload.askChatPrompt),
    phase: safeString(payload.phase, "playing"),
    motif: payload.motif && typeof payload.motif === "object" ? clone(payload.motif) : null,
    trueAiVideo: Boolean(payload.trueAiVideo),
    provider: safeString(payload.provider, "procedural_v1"),
    accepted: true,
    updatedAt: now,
    holdUntilTs: now + holdMs,
    expiresAt: toNumber(payload.expiresAt, now + holdMs)
  };

  return clone(safeState.giftAnimationMoment);
}

function getGiftAnimationMomentSnapshot(state) {
  const safeState = ensureState(state);
  const visual = safeState.giftAnimationMoment;
  if (!visual || typeof visual !== "object") return null;
  if (toNumber(visual.holdUntilTs, 0) <= nowTs()) {
    return null;
  }
  return clone(visual);
}

function clearGiftAnimationMoment(state) {
  const safeState = ensureState(state);
  safeState.giftAnimationMoment = null;
  return { cleared: true };
}

function setAnimationReaction(state, payload = {}) {
  const safeState = ensureState(state);
  const now = nowTs();
  const holdMs = Math.max(900, toNumber(payload.holdMs, 3200));

  safeState.animationReaction = {
    animationId: safeString(payload.animationId),
    emotion: safeString(payload.emotion),
    effectProgram: safeString(payload.effectProgram),
    giftKey: safeString(payload.giftKey),
    giftName: safeString(payload.giftName),
    tier: safeString(payload.tier),
    userLabel: safeString(payload.userLabel),
    animationOwner: safeString(payload.animationOwner, "kojnozout"),
    sheetUrl: safeString(payload.sheetUrl),
    manifestUrl: safeString(payload.manifestUrl),
    particles: payload.particles && typeof payload.particles === "object" ? clone(payload.particles) : null,
    soundCue: safeString(payload.soundCue),
    motion: payload.motion && typeof payload.motion === "object" ? clone(payload.motion) : null,
    speechIntent:
      payload.speechIntent && typeof payload.speechIntent === "object"
        ? clone(payload.speechIntent)
        : null,
    overlay:
      payload.overlay && typeof payload.overlay === "object" ? clone(payload.overlay) : null,
    bankQuality: safeString(payload.bankQuality, "procedural"),
    preferProductionSprite: payload.preferProductionSprite === true,
    studioPreview: payload.studioPreview === true,
    spriteHint: safeString(payload.spriteHint, "react-gift"),
    active: true,
    updatedAt: now,
    holdUntilTs: now + holdMs,
    expiresAt: toNumber(payload.expiresAt, now + holdMs)
  };

  return clone(safeState.animationReaction);
}

function getAnimationReactionSnapshot(state) {
  const safeState = ensureState(state);
  const reaction = safeState.animationReaction;
  if (!reaction || typeof reaction !== "object") return null;
  if (toNumber(reaction.holdUntilTs, 0) <= nowTs()) {
    return null;
  }
  return clone(reaction);
}

function clearAnimationReaction(state) {
  const safeState = ensureState(state);
  safeState.animationReaction = null;
  return { cleared: true };
}

function setStoryVisual(state, payload = {}) {
  const safeState = ensureState(state);
  const now = nowTs();
  const frames = Array.isArray(payload.frames) ? payload.frames : [];
  const totalDurationMs = frames.reduce(
    (sum, frame) => sum + Math.max(1600, toNumber(frame.durationMs, toNumber(payload.frameMs, 2800))),
    0
  );
  const holdMs = Math.max(10000, toNumber(payload.holdMs, totalDurationMs + 4000));

  safeState.storyVisual = {
    playbackId: safeString(payload.playbackId),
    storyId: safeString(payload.storyId),
    title: normalizeText(payload.title),
    intro: normalizeText(payload.intro),
    outro: normalizeText(payload.outro),
    userLabel: safeString(payload.userLabel),
    feedCount: toNumber(payload.feedCount, 0),
    milestone: toNumber(payload.milestone, 0),
    isRepeat: Boolean(payload.isRepeat),
    frames: clone(frames),
    frameMs: toNumber(payload.frameMs, 2800),
    totalDurationMs,
    avatarLoaded: Boolean(payload.avatarLoaded),
    accepted: true,
    updatedAt: now,
    holdUntilTs: now + holdMs,
    expiresAt: toNumber(payload.expiresAt, now + holdMs)
  };

  return clone(safeState.storyVisual);
}

function getStoryVisualSnapshot(state) {
  const safeState = ensureState(state);
  const visual = safeState.storyVisual;
  if (!visual || typeof visual !== "object") return null;
  if (toNumber(visual.holdUntilTs, 0) <= nowTs()) {
    return null; // peek-only, viz pruneExpiredEphemeral
  }
  return clone(visual);
}

function clearStoryVisual(state) {
  const safeState = ensureState(state);
  safeState.storyVisual = null;
  return { cleared: true };
}

function setComboMoment(state, payload = {}) {
  const safeState = ensureState(state);
  const now = nowTs();
  const holdMs = Math.max(4000, toNumber(payload.holdMs, 6500));
  const momentId = safeString(payload.momentId, `${now}-${safeString(payload.kind, "combo")}`);

  safeState.comboMoment = {
    momentId,
    kind: safeString(payload.kind, "COMBO"),
    title: normalizeText(payload.title),
    subtext: normalizeText(payload.subtext),
    count: toNumber(payload.count, 0),
    accent: safeString(payload.accent, "#ffb400"),
    glow: safeString(payload.glow, "rgba(255,180,0,0.45)"),
    source: safeString(payload.source, "gift_repeat"),
    priority: toNumber(payload.priority, 3),
    meta: payload.meta && typeof payload.meta === "object" ? clone(payload.meta) : {},
    updatedAt: now,
    holdUntilTs: now + holdMs,
    expiresAt: now + holdMs
  };

  return clone(safeState.comboMoment);
}

function getComboMomentSnapshot(state) {
  const safeState = ensureState(state);
  const moment = safeState.comboMoment;
  if (!moment || typeof moment !== "object") return null;
  if (toNumber(moment.holdUntilTs, 0) <= nowTs()) {
    return null; // peek-only, viz pruneExpiredEphemeral
  }
  return clone(moment);
}

function clearComboMoment(state) {
  const safeState = ensureState(state);
  safeState.comboMoment = null;
  return { cleared: true };
}

function setBossCinematic(state, payload = {}) {
  const safeState = ensureState(state);
  const now = nowTs();
  const holdMs = Math.max(8500, toNumber(payload.holdMs, 9500));
  const momentId = safeString(
    payload.momentId,
    `${now}-${safeString(payload.kind, "boss_cinematic")}`
  );

  safeState.bossCinematic = {
    momentId,
    kind: safeString(payload.kind, "MEGA_BOSS"),
    title: normalizeText(payload.title),
    subtext: normalizeText(payload.subtext),
    tier: safeString(payload.tier, "T5").toUpperCase(),
    accent: safeString(payload.accent, "#ff6040"),
    glow: safeString(payload.glow, "rgba(255,96,64,0.5)"),
    userLabel: normalizeText(payload.userLabel),
    giftName: normalizeText(payload.giftName),
    heroImageUrl: safeString(payload.heroImageUrl),
    miaPoints: Math.max(0, toNumber(payload.miaPoints ?? payload.meta?.miaPoints, 0)),
    source: safeString(payload.source, "boss_cinematic"),
    priority: toNumber(payload.priority, 6),
    meta: payload.meta && typeof payload.meta === "object" ? clone(payload.meta) : {},
    updatedAt: now,
    holdUntilTs: now + holdMs,
    expiresAt: now + holdMs,
    holdMs
  };

  return clone(safeState.bossCinematic);
}

function getBossCinematicSnapshot(state) {
  const safeState = ensureState(state);
  const cinematic = safeState.bossCinematic;
  if (!cinematic || typeof cinematic !== "object") return null;
  if (toNumber(cinematic.holdUntilTs, 0) <= nowTs()) {
    return null;
  }
  return clone(cinematic);
}

function clearBossCinematic(state) {
  const safeState = ensureState(state);
  safeState.bossCinematic = null;
  return { cleared: true };
}

function setT0Flyby(state, payload = {}) {
  const safeState = ensureState(state);
  const now = nowTs();
  const holdMs = Math.max(3200, toNumber(payload.holdMs, 4800));
  const flybyId = safeString(payload.flybyId, `${now}-${safeString(payload.eventType, "T0")}`);

  safeState.t0Flyby = {
    flybyId,
    eventType: safeString(payload.eventType, "FOLLOW").toUpperCase(),
    userLabel: safeString(payload.userLabel, "Divák"),
    avatarUrl: safeString(payload.avatarUrl) || null,
    accent: safeString(payload.accent, "#00eaff"),
    label: normalizeText(payload.label || payload.title),
    subtext: normalizeText(payload.subtext),
    updatedAt: now,
    holdUntilTs: now + holdMs,
    expiresAt: now + holdMs
  };

  return clone(safeState.t0Flyby);
}

function getT0FlybySnapshot(state) {
  const safeState = ensureState(state);
  const flyby = safeState.t0Flyby;
  if (!flyby || typeof flyby !== "object") return null;
  if (toNumber(flyby.holdUntilTs, 0) <= nowTs()) {
    return null; // peek-only, viz pruneExpiredEphemeral
  }
  return clone(flyby);
}

function clearT0Flyby(state) {
  const safeState = ensureState(state);
  safeState.t0Flyby = null;
  return { cleared: true };
}

function setImmersiveScene(state, payload = {}) {
  const safeState = ensureState(state);
  const now = nowTs();
  const holdMs = Math.max(2000, toNumber(payload.holdMs, 8000));

  safeState.immersiveScene = {
    active: payload.active !== false,
    mode: safeString(payload.mode, "immersive"),
    environmentId: safeString(payload.environmentId),
    environmentLabel: safeString(payload.environmentLabel),
    environmentCategory: safeString(payload.environmentCategory),
    motionHint: safeString(payload.motionHint, "idle"),
    parallaxSpeed: toNumber(payload.parallaxSpeed, 0.2),
    backdrop: safeString(payload.backdrop, "#050814"),
    windows: Array.isArray(payload.windows) ? clone(payload.windows) : [],
    layers: Array.isArray(payload.layers) ? clone(payload.layers) : [],
    filterProfile: safeString(payload.filterProfile),
    streamerSlot:
      payload.streamerSlot && typeof payload.streamerSlot === "object"
        ? clone(payload.streamerSlot)
        : { x: 0.32, y: 0.22, w: 0.36, h: 0.62 },
    segmentation:
      payload.segmentation && typeof payload.segmentation === "object"
        ? clone(payload.segmentation)
        : null,
    creature:
      payload.creature && typeof payload.creature === "object" ? clone(payload.creature) : null,
    cameraCount: Math.max(1, Math.min(6, toNumber(payload.cameraCount, 1))),
    userLabel: safeString(payload.userLabel),
    trigger: safeString(payload.trigger),
    tags: Array.isArray(payload.tags) ? clone(payload.tags) : [],
    provider: safeString(payload.provider, "mia_scene_director_v1"),
    updatedAt: now,
    holdUntilTs: now + holdMs,
    expiresAt: toNumber(payload.expiresAt, now + holdMs)
  };

  return clone(safeState.immersiveScene);
}

function getImmersiveSceneSnapshot(state) {
  const safeState = ensureState(state);
  const scene = safeState.immersiveScene;
  if (!scene || typeof scene !== "object") return null;
  if (toNumber(scene.holdUntilTs, 0) <= nowTs()) return null;
  return clone(scene);
}

function clearImmersiveScene(state) {
  const safeState = ensureState(state);
  safeState.immersiveScene = null;
  return { cleared: true };
}

function setBossMission(state, payload = {}) {
  const safeState = ensureState(state);
  const now = nowTs();
  const holdMs = Math.max(8000, toNumber(payload.holdMs, 22000));

  safeState.bossMission = {
    active: payload.active !== false,
    missionId: safeString(payload.missionId),
    arcId: safeString(payload.arcId),
    title: normalizeText(payload.title),
    subtitle: normalizeText(payload.subtitle),
    userLabel: normalizeText(payload.userLabel),
    phases: Array.isArray(payload.phases) ? clone(payload.phases) : [],
    currentPhase: Math.max(0, toNumber(payload.currentPhase, 0)),
    bossPhase:
      payload.bossPhase && typeof payload.bossPhase === "object"
        ? clone(payload.bossPhase)
        : null,
    visualReference:
      payload.visualReference && typeof payload.visualReference === "object"
        ? clone(payload.visualReference)
        : null,
    avatarSeedRel: safeString(payload.avatarSeedRel),
    statueRel: safeString(payload.statueRel),
    provider: safeString(payload.provider, "mia_boss_mission_v1"),
    updatedAt: now,
    holdUntilTs: now + holdMs,
    expiresAt: now + holdMs,
    holdMs
  };

  return clone(safeState.bossMission);
}

function getBossMissionSnapshot(state) {
  const safeState = ensureState(state);
  const mission = safeState.bossMission;
  if (!mission || typeof mission !== "object") return null;
  if (toNumber(mission.holdUntilTs, 0) <= nowTs()) return null;
  return clone(mission);
}

function clearBossMission(state) {
  const safeState = ensureState(state);
  safeState.bossMission = null;
  return { cleared: true };
}

function setCommunityMood(state, payload = {}) {
  const safeState = ensureState(state);
  const now = nowTs();
  const holdMs = Math.max(
    8000,
    toNumber(payload.holdUntilTs, 0) > now
      ? toNumber(payload.holdUntilTs, 0) - now
      : toNumber(payload.holdMs, 12000)
  );

  safeState.communityMood = {
    roomTone: safeString(payload.roomTone, "calm"),
    miaMood: safeString(payload.miaMood, "idle"),
    kojMood: safeString(payload.kojMood, "warm"),
    spice: toNumber(payload.spice, 0),
    energy: toNumber(payload.energy, 0),
    source: safeString(payload.source, "mood_brain_v1"),
    active: true,
    updatedAt: toNumber(payload.updatedAt, now),
    holdUntilTs: toNumber(payload.holdUntilTs, now + holdMs),
    expiresAt: toNumber(payload.expiresAt, now + holdMs)
  };

  return clone(safeState.communityMood);
}

function getCommunityMoodSnapshot(state) {
  const safeState = ensureState(state);
  const slot = safeState.communityMood;
  if (!slot || typeof slot !== "object") return null;
  if (toNumber(slot.holdUntilTs, 0) <= nowTs()) return null;
  return clone(slot);
}

function clearCommunityMood(state) {
  const safeState = ensureState(state);
  safeState.communityMood = null;
  return { cleared: true };
}

// Jediné místo, kde se expirované efemerní sloty čistí (mutace stavu).
// Gettery výše jsou peek-only, takže čtení (vč. výpočtu cache klíče) nemá
// vedlejší efekty a nehrozí předčasné nullnutí slotu cizím call-sitem.
function pruneExpiredEphemeral(state) {
  const safeState = ensureState(state);
  const now = nowTs();

  for (const owner of Object.keys(safeState.overlayByOwner || {})) {
    const overlay = safeState.overlayByOwner[owner];
    if (overlay && toNumber(overlay.holdUntilTs, 0) <= now) {
      safeState.overlayByOwner[owner] = null;
      if (safeState.overlaySignatureByOwner) {
        safeState.overlaySignatureByOwner[owner] = "";
      }
    }
  }

  const ephemeralKeys = [
    "giftVisual",
    "giftAnimationMoment",
    "animationReaction",
    "storyVisual",
    "comboMoment",
    "bossCinematic",
    "t0Flyby",
    "immersiveScene",
    "bossMission",
    "communityMood"
  ];
  for (const key of ephemeralKeys) {
    const slot = safeState[key];
    if (slot && typeof slot === "object" && toNumber(slot.holdUntilTs, 0) <= now) {
      safeState[key] = null;
    }
  }

  return safeState;
}

function getOverlaySnapshot(state, options = {}) {
  const safeState = ensureState(state);

  pruneExpiredEphemeral(safeState);

  pruneChatFeed(safeState, {
    maxAgeMs: toNumber(options.chatFeedMaxAgeMs, 15000)
  });

  pruneRecentParticipants(safeState, {
    maxAgeMs: toNumber(options.recentParticipantsMaxAgeMs, 300000)
  });

  const miaOverlay = getOwnerOverlaySnapshot(safeState, "mia");
  const kojnozoutOverlay = getOwnerOverlaySnapshot(safeState, "kojnozout");
  const maxChatFeedItems = Math.max(1, toNumber(options.maxChatFeedItems, 5));
  const legacyOverlay = kojnozoutOverlay || miaOverlay || null;

  return {
    ...(legacyOverlay || {}),
    overlay: legacyOverlay,
    miaOverlay,
    kojnozoutOverlay,
    kojnozroutOverlay: kojnozoutOverlay,
    chatFeed: clone(safeState.chatFeed.slice(0, maxChatFeedItems)),
    recentParticipants: clone(
      safeState.recentParticipants.slice(
        0,
        Math.max(1, toNumber(options.maxRecentParticipants, 8))
      )
    ),
    giftVisual: getGiftVisualSnapshot(safeState),
    giftAnimationMoment: getGiftAnimationMomentSnapshot(safeState),
    animationReaction: getAnimationReactionSnapshot(safeState),
    storyVisual: getStoryVisualSnapshot(safeState),
    comboMoment: getComboMomentSnapshot(safeState),
    bossCinematic: getBossCinematicSnapshot(safeState),
    t0Flyby: getT0FlybySnapshot(safeState),
    immersiveScene: getImmersiveSceneSnapshot(safeState),
    bossMission: getBossMissionSnapshot(safeState),
    communityMood: getCommunityMoodSnapshot(safeState)
  };
}

module.exports = {
  createOverlayState,
  getOverlaySnapshot,
  pruneExpiredEphemeral,
  buildChatSignature,
  pushChatFeedItem,
  pushRecentParticipant,
  setOverlay,
  clearOverlay,
  clearChatFeed,
  setGiftVisual,
  getGiftVisualSnapshot,
  clearGiftVisual,
  setGiftAnimationMoment,
  getGiftAnimationMomentSnapshot,
  clearGiftAnimationMoment,
  setAnimationReaction,
  getAnimationReactionSnapshot,
  clearAnimationReaction,
  setStoryVisual,
  getStoryVisualSnapshot,
  clearStoryVisual,
  setComboMoment,
  getComboMomentSnapshot,
  clearComboMoment,
  setBossCinematic,
  getBossCinematicSnapshot,
  clearBossCinematic,
  setT0Flyby,
  getT0FlybySnapshot,
  clearT0Flyby,
  setImmersiveScene,
  getImmersiveSceneSnapshot,
  clearImmersiveScene,
  setBossMission,
  getBossMissionSnapshot,
  clearBossMission,
  setCommunityMood,
  getCommunityMoodSnapshot,
  clearCommunityMood
};