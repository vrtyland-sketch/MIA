"use strict";

const { MASTER_MOODS, DERIVED_MOOD_KEYS, EATING_VARIANT_COUNT } = require("./KOJNOZROUT_MOOD_DERIVE");
const { resolveMoodEmoji } = require("./MIA_KOJNOZROUT_MOOD_EMOJI");
const { resolveEvolutionTierSpriteUrl, resolveStageMoodSpriteUrl } = require("./MIA_KOJNOZROUT_ASSETS");
const { resolveActiveItemUse, ITEM_USE_MS } = require("./MIA_KOJNOZROUT_ITEM_EFFECT");
const moodBrain = require("../shared/mia-graphics-studio/moodBrain");

const FEED_PULSE_MS = 9000;

const CONTEXT_PULSE_MS = {
  gift: 4500,
  thanks: 3500,
  celebrate: 6500,
  chat: 3200,
  walk: 4500,
  evolution: 8000
};

const AMBIENT_POSE_MS = 10800;

const AMBIENT_POSE_POOLS = {
  // Přirozený život v klidu: Koj se prochází (hop), mává, sedne si, protáhne se,
  // hraje si a rozhlíží se — působí jako živý avatar, ne statický obrázek.
  idle: ["idle", "wave", "hop", "sit", "stretch", "play", "lean-left", "lean-right", "peek", "curious", "perch", "thinking"],
  warm: ["warm", "calm", "cozy-blanket", "sit", "react-chat", "bond-warm"],
  happy: ["happy", "play", "wave", "wink", "love", "bond-warm", "cheer-soft", "love-hug", "gift-hold"],
  excited: ["excited", "bounce", "hop", "cheer", "hype", "surprised-pop", "surprised", "party", "combo"],
  hungry: ["hungry", "alert", "munch", "snack", "sip", "guard"],
  full: ["full", "proud", "stretch", "proud-stand", "sit"],
  sleepy: ["sleepy", "rest", "curl", "yawn", "cozy"],
  sick: ["sick", "heal-glow", "comfort"],
  sad: ["sad", "neglect-droop", "comfort", "shy-hide", "shy"],
  annoyed: ["annoyed", "guard", "chaos-spin"],
  laugh: ["laugh", "cheer-loud", "party-pop"],
  stressed: ["stressed", "thinking-hmm", "alert"],
  celebrate: ["celebrate", "party-pop", "cheer-loud", "proud-stand", "party"]
};

const EGG_POSE_POOL = ["egg-rest", "hatch-wiggle", "idle", "peek", "curious"];
const HATCH_POSE_POOL = ["hatch-wiggle", "hop", "peek", "happy", "play"];

const SPRITE_ASSETS = new Set([...MASTER_MOODS, ...DERIVED_MOOD_KEYS]);

const BLOCKED_CONTEXT_MOODS = new Set(["sleepy", "sick"]);
const VITAL_LOCKED_MOODS = new Set(["sad", "annoyed", "sick"]);

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
  if (lastFedAt <= 0 || now - lastFedAt > FEED_PULSE_MS) {
    return false;
  }
  return behavior.includes("feed") || behavior === "feeding";
}

function isMomentActive(moment, now = Date.now()) {
  if (!moment || typeof moment !== "object") return false;
  const holdUntil = toNumber(moment.holdUntilTs || moment.expiresAt || moment.until, 0);
  if (holdUntil > 0) return holdUntil > now;
  return Boolean(moment.active);
}

function resolveBowlMeta(state = {}) {
  return state?.bowl?.meta && typeof state.bowl.meta === "object" ? state.bowl.meta : {};
}

function resolveOverlayMomentMood(extras = {}, now = Date.now()) {
  if (isMomentActive(extras.bossCinematic, now)) {
    const kind = safeString(extras.bossCinematic.kind).toUpperCase();
    if (kind === "LEGEND") return "hype";
    return "party-pop";
  }
  if (isMomentActive(extras.comboMoment, now)) {
    if (safeString(extras.comboMoment.source).toLowerCase() === "achievement") {
      return "celebrate";
    }
    return "combo-fire";
  }
  if (extras.duel?.active) {
    if (extras.duel.won) return "duel-win";
    if (extras.duel.lost) return "duel-lose";
    return "duel-ready";
  }
  if (extras.kojBattle?.active) {
    const battleMood =
      typeof extras.kojBattle.displayMood === "string"
        ? extras.kojBattle.displayMood
        : null;
    if (battleMood) return battleMood;
  }
  if (isMomentActive(extras.t0Flyby, now)) return "flyby-fast";
  if (isMomentActive(extras.storyVisual, now)) return "story-read";
  if (isMomentActive(extras.animationReaction, now)) {
    const hint = safeString(extras.animationReaction.spriteHint).toLowerCase();
    if (hint) return hint;
    return "react-gift";
  }
  if (isMomentActive(extras.giftVisual, now)) return "gift-open";
  if (extras.spamSession?.active) return "cheer-loud";
  return null;
}

function resolveBehaviorContextMood(state = {}, now = Date.now()) {
  const behavior = safeString(state.behavior).toLowerCase();
  const stage = safeString(state.stage || state?.bowl?.stage).toLowerCase();
  const meta = resolveBowlMeta(state);
  const lastFedAt = toNumber(state.lastFedAt, 0);
  const lastPingAt = toNumber(state.lastPingAt, 0);
  const lastTransitionTs = toNumber(meta.lastTransitionTs, 0);
  const lastEvent = safeString(meta.lastEvent).toUpperCase();
  const recentTs = Math.max(lastFedAt, lastPingAt, lastTransitionTs);

  if (behavior === "quest_complete" && now - recentTs < CONTEXT_PULSE_MS.celebrate) {
    return "party-pop";
  }
  if (lastEvent === "FULL_BOWL_TRIGGER" && now - lastTransitionTs < CONTEXT_PULSE_MS.celebrate) {
    return "celebrate";
  }
  if (stage === "stuffed" && meta.fullTriggered && now - toNumber(meta.fullTs, lastTransitionTs) < CONTEXT_PULSE_MS.celebrate) {
    return "party-pop";
  }
  if (
    (behavior === "care_react" || behavior === "feed_react") &&
    now - recentTs < CONTEXT_PULSE_MS.thanks
  ) {
    return "thanks-bow";
  }
  if (behavior === "walking" || state.walkActive || toNumber(state.walkUntilTs, 0) > now) {
    return "hop";
  }
  if (behavior === "play_with_chat" && now - lastPingAt < CONTEXT_PULSE_MS.chat) {
    return Math.floor(now / 900) % 2 === 0 ? "wave-left" : "wave-right";
  }
  if (
    (behavior === "support_feed" || behavior === "big_feed") &&
    lastFedAt > 0 &&
    now - lastFedAt < CONTEXT_PULSE_MS.gift &&
    !isFeedingPulse(state, now)
  ) {
    return "react-gift";
  }
  if (state.lastEvolutionMoment && typeof state.lastEvolutionMoment === "object") {
    const evoUntil = toNumber(state.lastEvolutionMoment.until, 0);
    if (evoUntil > now) return "proud-stand";
  }
  if (behavior.includes("laugh") || behavior === "play_with_chat") {
    if (now - lastPingAt < CONTEXT_PULSE_MS.chat) return "play";
  }
  return null;
}

function pickFromPool(pool, state = {}, now = Date.now()) {
  if (!Array.isArray(pool) || pool.length === 0) return null;
  const behavior = safeString(state.behavior).toLowerCase();
  const tick = Math.floor(now / AMBIENT_POSE_MS);
  let offset = 0;
  if (behavior === "watching") offset = 1;
  if (behavior === "walking") return "hop";
  if (behavior === "sleepy_chat" || behavior === "sleepy_react") return pool[(tick + 2) % pool.length];
  if (behavior === "wake_react") return "hop";
  return pool[(tick + offset) % pool.length];
}

function resolveAmbientSpriteMood(baseMood, state = {}, now = Date.now()) {
  const base = safeString(baseMood).toLowerCase() || "idle";
  const tier = safeString(state.evolutionTier || state?.evolution?.tier).toLowerCase();
  const behavior = safeString(state.behavior).toLowerCase();

  if (tier === "egg" || tier === "vejicko") {
    return pickFromPool(EGG_POSE_POOL, state, now) || "egg-rest";
  }
  if (tier === "hatch" || tier === "hatching") {
    return pickFromPool(HATCH_POSE_POOL, state, now) || "hatch-wiggle";
  }
  if (behavior === "watching") {
    const watchPool = ["watch", "react-video", "curious", "thinking", "perch"];
    return pickFromPool(watchPool, state, now) || base;
  }

  const pool = AMBIENT_POSE_POOLS[base];
  return pickFromPool(pool, state, now) || base;
}

function resolveCommunityChatMood(extras = {}, now = Date.now()) {
  return moodBrain.resolveKojSpriteFromCommunity(extras?.communityMood, now);
}

function resolveContextualDisplayMood(baseMood, state = {}, extras = {}, now = Date.now()) {
  const forced = extras?.showcase?.forcedKoj;
  if (forced?.mood) {
    return safeString(forced.spriteAsset || forced.mood).toLowerCase();
  }

  const base = safeString(baseMood).toLowerCase() || "idle";
  if (BLOCKED_CONTEXT_MOODS.has(base)) return base;

  const overlayMood = resolveOverlayMomentMood(extras, now);
  if (overlayMood) return overlayMood;

  const behaviorMood = resolveBehaviorContextMood(state, now);
  if (behaviorMood) return behaviorMood;

  const communitySprite = resolveCommunityChatMood(extras, now);
  if (communitySprite) return communitySprite;

  if (VITAL_LOCKED_MOODS.has(base)) return base;

  return resolveAmbientSpriteMood(base, state, now);
}

function resolveKojDisplayMood(state = {}, care = {}, now = Date.now()) {
  const need = safeString(care?.need).toLowerCase();
  const mood = safeString(state?.mood).toLowerCase();
  const affliction = safeString(state?.affliction).toLowerCase();
  const bowl = toNumber(state?.bowlPercent ?? state?.bowl?.percent, 0);
  const hunger = toNumber(state?.hunger, 0);
  const meta = resolveBowlMeta(state);
  const stage = safeString(state.stage || state?.bowl?.stage).toLowerCase();

  if (isSleepingState(state) || need === "sleepy" || mood === "sleepy") {
    return "sleepy";
  }
  if (affliction === "sick" || need === "sick" || mood === "sick") {
    return "sick";
  }
  if (affliction === "sad" || need === "sad" || mood === "sad") {
    return "sad";
  }
  if (affliction === "stressed" || need === "stressed" || mood === "stressed") {
    return "stressed";
  }
  if (affliction === "annoyed" || need === "annoyed" || mood === "annoyed") {
    return "annoyed";
  }
  if (isFeedingPulse(state, now)) {
    return "eating";
  }
  if (
    meta.fullTriggered &&
    stage === "stuffed" &&
    now - toNumber(meta.fullTs, 0) < CONTEXT_PULSE_MS.celebrate
  ) {
    return "celebrate";
  }
  if (need === "hungry" || mood === "hungry" || hunger >= 52) {
    return "hungry";
  }
  const behavior = safeString(state.behavior).toLowerCase();
  if (behavior === "care_react" && now - toNumber(state.lastCareAt, 0) < CONTEXT_PULSE_MS.thanks) {
    return "bond-warm";
  }
  const sleepDepth = toNumber(state?.vitals?.sleepDepth, 0);
  if (
    (behavior === "watching" || behavior === "sleepy_react") &&
    sleepDepth >= 20 &&
    sleepDepth < 55 &&
    bowl < 80
  ) {
    return sleepDepth >= 35 ? "calm-deep" : "cozy-blanket";
  }
  if (bowl >= 95 || mood === "full") {
    return "full";
  }
  if (mood === "laugh" || need === "laugh") {
    return "laugh";
  }
  if (mood === "excited") {
    return "excited";
  }
  if (need === "happy" || mood === "happy") {
    return "happy";
  }
  if (mood === "warm") {
    return "warm";
  }
  if (mood === "calm" || mood === "cozy") {
    return mood;
  }
  if (mood === "idle") {
    return "idle";
  }

  if (SPRITE_ASSETS.has(mood)) {
    return mood;
  }

  return mood || "idle";
}

function resolveEatingSpriteAsset(state = {}, now = Date.now()) {
  const feedPoints = toNumber(state.feedPoints, 0);
  const feedSeq = toNumber(state.sessionFeedCount, feedPoints);
  const lastFedAt = toNumber(state.lastFedAt, 0);
  const tick = lastFedAt > 0 ? Math.floor(lastFedAt / 900) : Math.floor(now / 900);
  const variant = (Math.abs(feedSeq + tick) % EATING_VARIANT_COUNT) + 1;
  return `eating-${String(variant).padStart(2, "0")}`;
}

function resolveKojSpriteAssetKey(displayMood = "idle", state = {}, now = Date.now()) {
  const key = safeString(displayMood).toLowerCase() || "idle";

  const battleAlias = {
    attack: "duel-ready",
    attack2: "duel-ready",
    hit: "annoyed",
    hit2: "stressed",
    defend: "guard",
    item_box: "gift-hold",
    item_heal: "heal-glow",
    item_buff: "happy",
    win: "celebrate",
    faint: "sad",
    taunt: "duel-ready"
  };
  const battleKey = battleAlias[key] || key;

  if (battleKey === "eating" || battleKey === "feeding") {
    return resolveEatingSpriteAsset(state, now);
  }

  if (SPRITE_ASSETS.has(battleKey)) {
    return battleKey;
  }

  return "idle";
}

function normalizeGiftTier(tier = "T1") {
  const raw = safeString(tier).toUpperCase();
  if (raw === "T6") return "T5";
  if (["T1", "T2", "T3", "T4", "T5", "PROFILE"].includes(raw)) return raw;
  return "T1";
}

const VIDEO_REACTION_GROOVE_MS = 2500;
const VIDEO_REACTION_DANCE_MS = {
  T1: 12000,
  T2: 10000,
  T3: 8000,
  T4: 5000,
  T5: 3000,
  PROFILE: 9000
};
const VIDEO_REACTION_HYPE_MS = {
  T1: 22000,
  T2: 18000,
  T3: 14000,
  T4: 10000,
  T5: 7000,
  PROFILE: 16000
};

const VIDEO_REACTION_HOLD_MS = 2500;

function buildKojVideoReactionPhase(elapsedMs, tier) {
  const danceAt = VIDEO_REACTION_DANCE_MS[tier] || 10000;
  const hypeAt = VIDEO_REACTION_HYPE_MS[tier] || 20000;

  let phase = "watch";
  if (elapsedMs >= hypeAt) phase = "hype";
  else if (elapsedMs >= danceAt) phase = "dance";
  else if (elapsedMs >= VIDEO_REACTION_GROOVE_MS) phase = "groove";

  return { phase, danceAt, hypeAt };
}

function buildKojVideoReaction(video = {}, now = Date.now()) {
  const playback = video?.currentPlayback;
  const startedAt = toNumber(playback?.startedAt, 0);
  const sourceName = safeString(playback?.sourceName);

  if (sourceName && startedAt > 0) {
    const elapsedMs = Math.max(0, now - startedAt);
    const tier = normalizeGiftTier(playback?.tier);
    const { phase, danceAt, hypeAt } = buildKojVideoReactionPhase(elapsedMs, tier);

    return {
      active: true,
      phase,
      tier,
      elapsedMs,
      sourceName,
      danceAtMs: danceAt,
      hypeAtMs: hypeAt
    };
  }

  const lastEndedAt = toNumber(video?.lastEndedAt, 0);
  const lastStartedAt = toNumber(video?.lastStartedAt, 0);
  if (lastEndedAt > 0 && lastStartedAt > 0 && now - lastEndedAt < VIDEO_REACTION_HOLD_MS) {
    const tier = normalizeGiftTier(
      video?.lastResult?.tier || video?.lastJob?.tier || video?.currentPlayback?.tier
    );
    const elapsedMs = Math.max(0, lastEndedAt - lastStartedAt);
    const { phase, danceAt, hypeAt } = buildKojVideoReactionPhase(elapsedMs, tier);
    const holdSource =
      safeString(video?.lastResult?.sourceName) ||
      safeString(video?.lastJob?.sourceName) ||
      "recent-video";

    return {
      active: true,
      phase,
      tier,
      elapsedMs,
      sourceName: holdSource,
      danceAtMs: danceAt,
      hypeAtMs: hypeAt,
      holdAfterEnd: true,
      holdRemainingMs: VIDEO_REACTION_HOLD_MS - (now - lastEndedAt)
    };
  }

  return { active: false, phase: "idle", elapsedMs: 0 };
}

function applyVideoReactionMood(baseMood, reaction = {}, state = {}, care = {}) {
  if (!reaction?.active) return baseMood;

  const mood = safeString(baseMood).toLowerCase();
  const need = safeString(care?.need).toLowerCase();
  if (isSleepingState(state) || ["sleepy", "sick"].includes(mood)) {
    return baseMood;
  }
  if (["sleepy", "sick"].includes(need)) {
    return baseMood;
  }

  if (reaction.phase === "hype") return "hype-jump";
  if (reaction.phase === "dance") return "dance";
  if (reaction.phase === "groove") return "groove";
  if (reaction.phase === "watch") return "react-video";
  return baseMood;
}

function resolveKojBowlPanelClass(mood = "idle", state = {}, care = {}, feeding = false) {
  const key = safeString(mood).toLowerCase();
  if (key === "sleepy" || key === "rest" || key === "curl" || key === "yawn") return "sleepy";
  if (key === "sick" || key === "heal-glow") return "sick";
  if (key === "sad" || key === "neglect-droop" || key === "comfort") return "sad";
  if (key.startsWith("combo") || key.startsWith("cheer") || key === "hype-jump" || key === "hype") {
    return "combo";
  }
  if (key.startsWith("duel")) return "duel";
  if (
    key.startsWith("celebrate") ||
    key === "party-pop" ||
    key.startsWith("proud") ||
    key === "party"
  ) {
    return "celebrate";
  }
  if (key.startsWith("gift") || key.startsWith("thanks") || key === "react-gift") return "gift";
  if (feeding || key === "eating" || key === "feeding" || key.startsWith("eating-") || key === "munch" || key === "snack" || key === "sip") {
    return "eating";
  }
  if (key === "full") return "full";
  if (key === "hungry" || key === "stressed" || key === "annoyed" || key === "alert" || key === "guard" || key === "chaos-spin") {
    return "hungry";
  }
  return "";
}

function buildStatusHint(mood, baseMood, reaction, feeding, care) {
  const need = safeString(care?.need).toLowerCase();
  let statusHint = safeString(care?.needLabel);

  if (reaction?.active && !BLOCKED_CONTEXT_MOODS.has(baseMood) && !BLOCKED_CONTEXT_MOODS.has(need)) {
    if (reaction.phase === "hype") statusHint = "Hype u videa!";
    else if (reaction.phase === "dance") statusHint = "Tancuje k videu";
    else if (reaction.phase === "groove") statusHint = "Groove u videa";
    else if (reaction.phase === "watch") statusHint = "Kouká na video";
  } else if (feeding) {
    statusHint = "Jí z misky";
  } else if (!statusHint) {
    const hints = {
      idle: "Pohodička",
      sleepy: "Spí",
      sick: "Je nemocný",
      sad: "Je smutný",
      stressed: "Je ve stresu",
      annoyed: "Je naštvaný",
      hungry: "Má hlad",
      eating: "Jí z misky",
      laugh: "Se směje",
      full: "Najedený, miska plná",
      warm: "Spokojený klid",
      happy: "Veselý",
      excited: "Nadšený",
      dance: "Tancuje",
      groove: "Groove",
      watch: "Kouká kolem",
      love: "Má vás rád",
      celebrate: "Oslavuje plnou misku!",
      gift: "Děkuje za gift",
      thanks: "Děkuje za péči",
      combo: "Combo moment!",
      duel: "V duelu!",
      flyby: "Pozdrav divákům",
      wave: "Mává komunitě",
      proud: "Evoluční úspěch!",
      story: "Příběhový moment",
      cheer: "Komunitní vlna",
      hype: "Na maximum!",
      "party-pop": "Oslavuje mega boss!"
    };
    statusHint = hints[mood] || hints[baseMood] || `Nálada: ${mood}`;
  }

  return statusHint;
}

function buildKojDisplaySnapshot(state = {}, care = {}, now = Date.now(), extras = {}) {
  const reaction =
    extras?.videoReaction && typeof extras.videoReaction === "object"
      ? extras.videoReaction
      : buildKojVideoReaction(extras?.video || {}, now);
  const baseMood = resolveKojDisplayMood(state, care, now);
  const contextualMood = resolveContextualDisplayMood(baseMood, state, extras, now);
  let mood = applyVideoReactionMood(contextualMood, reaction, state, care);

  const activeItemUse = resolveActiveItemUse(state, extras?.backpack, now);
  let itemUseSnapshot = { active: false };
  let battleCycleId = extras?.kojBattle?.cycleId || null;

  if (activeItemUse?.effect) {
    const fx = activeItemUse.effect;
    mood = fx.mood || mood;
    if (fx.cycleId) {
      battleCycleId = fx.cycleId;
    }
    itemUseSnapshot = {
      active: true,
      at: activeItemUse.at,
      holdUntil: activeItemUse.holdUntil,
      itemId: activeItemUse.itemId,
      itemLabel: activeItemUse.itemLabel,
      action: activeItemUse.action,
      duelActive: Boolean(activeItemUse.duelActive),
      role: fx.role,
      mood: fx.mood,
      spriteAsset: fx.spriteAsset,
      prop: fx.prop,
      pose: fx.pose,
      cycleId: fx.cycleId,
      projectile: fx.projectile,
      panelClass: fx.panelClass,
      remainingMs: Math.max(0, toNumber(activeItemUse.holdUntil, 0) - now)
    };
  }

  const spriteAsset = activeItemUse?.effect?.spriteAsset
    ? safeString(activeItemUse.effect.spriteAsset).toLowerCase()
    : resolveKojSpriteAssetKey(mood, state, now);
  const evoTier = safeString(state.evolutionTier || state?.evolution?.tier).toLowerCase();
  const evolutionSpriteUrl = resolveEvolutionTierSpriteUrl(evoTier);
  const stageSpriteUrl = resolveStageMoodSpriteUrl(evoTier, spriteAsset);
  const moodSpriteUrl =
    stageSpriteUrl || `/assets/kojnozrout/moods/kojnozout-${spriteAsset}.png`;

  // Platformní forma (Tokžrout / Stackžrout / Bitsžrout / Kisstube) — živočichové ze stejného vesmíru.
  // Mood mapování: forms/{platform}/{mood}.png (idle/happy/excited/attack/win), jinak idle.
  const platformForm =
    extras?.platformForm && typeof extras.platformForm === "object"
      ? extras.platformForm
      : null;
  let platformSpriteUrl = safeString(platformForm?.spriteUrl || platformForm?.previewPng);
  if (platformForm?.formDir) {
    const battlePose = safeString(
      activeItemUse?.effect?.pose || extras?.battlePose || extras?.kojBattle?.pose
    ).toLowerCase();
    const knownForm = [
      "idle", "happy", "warm", "love", "excited", "laugh", "hungry", "full",
      "sleepy", "sick", "sad", "annoyed", "stressed", "curious", "proud",
      "attack", "attack2", "hit", "hit2", "win", "faint", "defend",
      "item_box", "item_heal", "item_buff", "hop", "wave", "lean_left",
      "lean_right", "taunt", "duel-ready"
    ];
    const moodAlias = {
      celebrate: "laugh",
      hype: "excited",
      party: "laugh",
      cheer: "excited",
      calm: "warm",
      cozy: "sleepy",
      duel: "attack",
      "duel-ready": "attack",
      attack: "attack",
      attack2: "attack2",
      hit: "hit",
      hit2: "hit2",
      win: "win",
      faint: "faint",
      defend: "defend",
      item_box: "item_box",
      item_heal: "item_heal",
      item_buff: "item_buff",
      taunt: "taunt",
      gift: "happy",
      thanks: "warm",
      combo: "excited",
      story: "curious",
      flyby: "wave",
      feeding: "hungry",
      munch: "hungry",
      bounce: "hop",
      sit: "idle",
      stretch: "full",
      peek: "curious",
      wink: "happy",
      "lean-left": "lean_left",
      "lean-right": "lean_right",
      guard: "defend",
      surprised: "excited",
      thinking: "curious"
    };
    let moodFile = "idle";
    if (battlePose && knownForm.includes(battlePose)) {
      moodFile = battlePose;
    } else if (battlePose && moodAlias[battlePose]) {
      moodFile = moodAlias[battlePose];
    } else if (battlePose && knownForm.includes(moodAlias[battlePose] || "")) {
      moodFile = moodAlias[battlePose];
    } else if (knownForm.includes(spriteAsset)) {
      moodFile = spriteAsset;
    } else if (moodAlias[spriteAsset]) {
      moodFile = moodAlias[spriteAsset];
    }
    platformSpriteUrl = `${safeString(platformForm.formDir)}/${moodFile}.png`;
  }
  const usePlatformForm = Boolean(platformSpriteUrl) && extras?.preferPlatformForm !== false;
  const spriteUrl = usePlatformForm ? platformSpriteUrl : moodSpriteUrl;

  const need = safeString(care?.need).toLowerCase();
  const feeding = isFeedingPulse(state, now) || activeItemUse?.effect?.role === "food";
  const statusHint = buildStatusHint(mood, baseMood, reaction, feeding, care);
  const moodEmoji = resolveMoodEmoji(spriteAsset) || resolveMoodEmoji(mood);
  const panelClass = activeItemUse?.effect?.panelClass
    ? safeString(activeItemUse.effect.panelClass)
    : resolveKojBowlPanelClass(mood, state, care, feeding);

  let walk = {
    active: false,
    kind: null,
    cssWander: false,
    spriteMood: null,
    remainingSec: 0
  };
  try {
    const walkModule = require("./MIA_KOJNOZROUT_WALK");
    if (typeof walkModule.resolveWalkVisual === "function") {
      walk = walkModule.resolveWalkVisual(state, now);
    }
  } catch (_err) {
    /* optional */
  }

  return {
    mood,
    baseMood,
    contextualMood: contextualMood !== baseMood ? contextualMood : null,
    spriteAsset,
    spriteUrl,
    moodSpriteUrl,
    battleCycleId: battleCycleId || extras?.kojBattle?.cycleId || null,
    battlePhase: extras?.kojBattle?.phase || null,
    evolutionTier: evoTier || null,
    evolutionSpriteUrl: evolutionSpriteUrl || null,
    stageSpriteUrl: stageSpriteUrl || null,
    platformForm: platformForm
      ? {
          id: safeString(platformForm.id),
          name: safeString(platformForm.name),
          title: safeString(platformForm.title),
          spriteUrl: platformSpriteUrl,
          accent: safeString(platformForm.accent)
        }
      : null,
    moodEmoji,
    panelClass,
    itemUse: itemUseSnapshot,
    walk,
    need: need || mood,
    needLabel: statusHint,
    needEmoji: feeding ? "🍽️" : safeString(care?.needEmoji) || moodEmoji,
    feeding,
    feedPulseMs: FEED_PULSE_MS,
    isSleeping: isSleepingState(state),
    videoReaction: reaction?.active
      ? {
          active: true,
          phase: reaction.phase,
          tier: reaction.tier,
          elapsedMs: reaction.elapsedMs
        }
      : { active: false, phase: "idle" },
    updatedAt: now
  };
}

module.exports = {
  FEED_PULSE_MS,
  ITEM_USE_MS,
  EATING_VARIANT_COUNT,
  CONTEXT_PULSE_MS,
  isSleepingState,
  isFeedingPulse,
  isMomentActive,
  resolveKojDisplayMood,
  resolveContextualDisplayMood,
  resolveBehaviorContextMood,
  resolveOverlayMomentMood,
  resolveAmbientSpriteMood,
  resolveEatingSpriteAsset,
  resolveKojSpriteAssetKey,
  resolveKojBowlPanelClass,
  buildKojVideoReaction,
  applyVideoReactionMood,
  buildKojDisplaySnapshot
};
