"use strict";

const streamEconomy = require("../scripts/MIA_STREAM_ECONOMY_CONFIG");
const spamCfg = streamEconomy.getSpamWaveConfig();

const DEFAULT_SPAM_WINDOW_MS = spamCfg.windowMs ?? 15000;
const DEFAULT_SPAM_MIN_SEQUENCE_COUNT = spamCfg.minSequenceCount ?? 3;
/**
 * Spam reward prahy v MIA bodech (ne coinech).
 * Sjednoceno se stream coin tiery: 100 / 1000 / 5000 coins × 7.5.
 * spamRewardTier ≠ streamTier u jednotlivého giftu — je to milestone vlny.
 */
const DEFAULT_SPAM_REWARD_THRESHOLDS = {
  ...(spamCfg.rewardThresholds || {})
};

let supportPointsHelper = null;

function getSupportPointsHelper() {
  if (supportPointsHelper) return supportPointsHelper;
  try {
    supportPointsHelper = require("../scripts/MIA_SUPPORT_RESOLVER");
  } catch (_err) {
    supportPointsHelper = null;
  }
  return supportPointsHelper;
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function nowMsFromEvent(event = {}) {
  const ts =
    event.ts ??
    event.timestamp ??
    event.createdAt ??
    Date.now();

  const n = Number(ts);
  return Number.isFinite(n) ? n : Date.now();
}

function cloneThresholds() {
  const src = DEFAULT_SPAM_REWARD_THRESHOLDS || {};
  return {
    T2: toNumber(src.T2, 750),
    T3: toNumber(src.T3, 7500),
    T4: toNumber(src.T4, 37500)
  };
}

function normalizeRewardThresholds(thresholds = {}) {
  const defaults = cloneThresholds();
  const raw = {
    T2: toNumber(thresholds.T2, defaults.T2),
    T3: toNumber(thresholds.T3, defaults.T3),
    T4: toNumber(thresholds.T4, defaults.T4)
  };

  const t2 = Math.max(0, raw.T2);
  const t3 = Math.max(t2, raw.T3);
  const t4 = Math.max(t3, raw.T4);

  return { T2: t2, T3: t3, T4: t4 };
}

function spamRewardTierRank(tier = "") {
  const n = Number(String(tier).replace(/\D/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function getCappedTierByPoints(totalPoints, thresholds) {
  const points = Math.max(0, toNumber(totalPoints, 0));
  const resolved = normalizeRewardThresholds(thresholds);

  if (points >= resolved.T4) return "T4";
  if (points >= resolved.T3) return "T3";
  if (points >= resolved.T2) return "T2";
  return null;
}

function createEmptySession() {
  return {
    active: false,
    startedAt: 0,
    lastEventAt: 0,
    eventCount: 0,
    totalPoints: 0,
    participants: {},
    gifts: {},
    spamConfirmed: false,
    highestReachedTier: null,
    lastRewardTierGranted: null,
    lastRewardAt: 0
  };
}

function cloneParticipants(participants = {}) {
  return Object.keys(participants).reduce((acc, key) => {
    const item = participants[key] || {};
    acc[key] = {
      count: toNumber(item.count, 0),
      points: toNumber(item.points, 0),
      userLabel: typeof item.userLabel === "string" ? item.userLabel : "",
      lastGiftName: typeof item.lastGiftName === "string" ? item.lastGiftName : ""
    };
    return acc;
  }, {});
}

function cloneGifts(gifts = {}) {
  return Object.keys(gifts).reduce((acc, key) => {
    acc[key] = toNumber(gifts[key], 0);
    return acc;
  }, {});
}

function getPointsToNextReward(totalPoints, thresholds, lastRewardTierGranted = null) {
  const points = Math.max(0, toNumber(totalPoints, 0));
  const resolved = normalizeRewardThresholds(thresholds);
  const grantedRank = spamRewardTierRank(lastRewardTierGranted);

  for (const tier of ["T2", "T3", "T4"]) {
    if (grantedRank >= spamRewardTierRank(tier)) continue;
    if (points < resolved[tier]) {
      return {
        nextRewardTier: tier,
        targetPoints: resolved[tier],
        pointsToNextReward: Math.max(0, resolved[tier] - points)
      };
    }
  }

  return {
    nextRewardTier: null,
    targetPoints: 0,
    pointsToNextReward: 0
  };
}

function resolveAudienceBand(viewerCount) {
  const viewers = Math.max(0, toNumber(viewerCount, 0));

  if (viewers <= 0) {
    return "unknown";
  }
  if (viewers < 25) {
    return "tiny";
  }
  if (viewers < 75) {
    return "small";
  }
  if (viewers < 200) {
    return "medium";
  }
  if (viewers < 500) {
    return "large";
  }
  return "huge";
}

function resolveDynamicSpamPolicy(viewerCount, baseThresholds = DEFAULT_SPAM_REWARD_THRESHOLDS) {
  const band = resolveAudienceBand(viewerCount);
  const normalizedBase = normalizeRewardThresholds(baseThresholds);

  const bandPolicy = {
    unknown: { minSequenceCount: 3, thresholdScale: 1 },
    tiny: { minSequenceCount: 2, thresholdScale: 0.75 },
    small: { minSequenceCount: 2, thresholdScale: 0.85 },
    medium: { minSequenceCount: 3, thresholdScale: 1 },
    large: { minSequenceCount: 4, thresholdScale: 1.15 },
    huge: { minSequenceCount: 5, thresholdScale: 1.3 }
  };

  const selected = bandPolicy[band] || bandPolicy.unknown;

  return {
    audienceBand: band,
    viewerCount: Math.max(0, toNumber(viewerCount, 0)),
    minSequenceCount: selected.minSequenceCount,
    thresholdScale: selected.thresholdScale,
    rewardThresholds: normalizeRewardThresholds({
      T2: normalizedBase.T2 * selected.thresholdScale,
      T3: normalizedBase.T3 * selected.thresholdScale,
      T4: normalizedBase.T4 * selected.thresholdScale
    })
  };
}

function resolveViewerCountFromContext(event = {}, context = {}) {
  const streamState = context?.streamState || {};
  const audience = streamState?.audience || {};

  const explicit = toNumber(
    context?.viewerCount ??
      audience.viewerCount ??
      event?.audience?.viewerCount ??
      event?.viewerCount,
    0
  );

  if (explicit > 0) {
    return Math.round(explicit);
  }

  return Math.max(0, toNumber(context?.estimatedViewerCount, 0));
}

function buildSnapshot(session, options = {}) {
  const windowMs = Math.max(500, toNumber(options.windowMs, DEFAULT_SPAM_WINDOW_MS));
  const rewardThresholds = normalizeRewardThresholds(
    options.rewardThresholds || cloneThresholds()
  );
  const now = Date.now();
  const remainingWindowMs =
    session.active && session.lastEventAt
      ? Math.max(0, windowMs - (now - toNumber(session.lastEventAt, now)))
      : 0;
  const rewardProgress = getPointsToNextReward(
    session.totalPoints,
    rewardThresholds,
    session.lastRewardTierGranted
  );

  return {
    active: !!session.active,
    startedAt: toNumber(session.startedAt, 0),
    lastEventAt: toNumber(session.lastEventAt, 0),
    eventCount: toNumber(session.eventCount, 0),
    totalPoints: toNumber(session.totalPoints, 0),
    participantCount: Object.keys(session.participants || {}).length,
    participants: cloneParticipants(session.participants),
    gifts: cloneGifts(session.gifts),
    spamConfirmed: !!session.spamConfirmed,
    highestReachedTier: session.highestReachedTier || null,
    lastRewardTierGranted: session.lastRewardTierGranted || null,
    lastRewardAt: toNumber(session.lastRewardAt, 0),
    windowMs,
    remainingWindowMs,
    remainingWindowSec: Math.ceil(remainingWindowMs / 1000),
    nextRewardTier: rewardProgress.nextRewardTier,
    targetRewardPoints: rewardProgress.targetPoints,
    pointsToNextReward: rewardProgress.pointsToNextReward,
    audienceBand: options.audienceBand || null,
    viewerCount: toNumber(options.viewerCount, 0),
    minSequenceCount: toNumber(options.minSequenceCount, 0),
    thresholdScale: toNumber(options.thresholdScale, 1)
  };
}

function buildDefaultResult(session, reason, extra = {}, snapshotOptions = {}) {
  const snapshot = buildSnapshot(session, snapshotOptions);

  const result = {
    ok: true,
    state: reason,
    reason,
    shouldTrack: false,
    shouldRewardSpam: false,
    rewardTier: null,
    /** Alias: milestone vlny, ne streamTier jednotlivého giftu. */
    spamRewardTier: null,
    newlyConfirmed: false,
    shouldConfirmSpam: false,
    isSpamActive: !!session.active,
    isSpamConfirmed: !!session.spamConfirmed,
    totalPoints: toNumber(session.totalPoints, 0),
    eventCount: toNumber(session.eventCount, 0),
    participantCount: Object.keys(session.participants || {}).length,
    contributorCount: Object.keys(session.participants || {}).length,
    singleContributor: Object.keys(session.participants || {}).length <= 1,
    highestReachedTier: session.highestReachedTier || null,
    lastRewardTierGranted: session.lastRewardTierGranted || null,
    remainingWindowMs: snapshot.remainingWindowMs,
    remainingWindowSec: snapshot.remainingWindowSec,
    nextRewardTier: snapshot.nextRewardTier,
    pointsToNextReward: snapshot.pointsToNextReward,
    snapshot,
    ...extra
  };

  if (result.rewardTier && !result.spamRewardTier) {
    result.spamRewardTier = result.rewardTier;
  } else if (result.spamRewardTier && !result.rewardTier) {
    result.rewardTier = result.spamRewardTier;
  }

  return result;
}

class SpamSessionEngine {
  constructor(options = {}) {
    this.windowMs = Math.max(500, toNumber(options.windowMs, DEFAULT_SPAM_WINDOW_MS));
    this.minSequenceCount = Math.max(
      2,
      toNumber(options.minSequenceCount, DEFAULT_SPAM_MIN_SEQUENCE_COUNT)
    );
    this.baseRewardThresholds = normalizeRewardThresholds(
      options.rewardThresholds || cloneThresholds()
    );
    this.rewardThresholds = { ...this.baseRewardThresholds };
    this.currentPolicy = resolveDynamicSpamPolicy(0, this.baseRewardThresholds);
    this.reset();
  }

  applyAudiencePolicy(context = {}) {
    const viewerCount = resolveViewerCountFromContext({}, context);
    this.currentPolicy = resolveDynamicSpamPolicy(
      viewerCount,
      this.baseRewardThresholds
    );
    this.minSequenceCount = Math.max(2, toNumber(this.currentPolicy.minSequenceCount, 3));
    this.rewardThresholds = normalizeRewardThresholds(this.currentPolicy.rewardThresholds);
    return this.currentPolicy;
  }

  getSnapshotOptions() {
    return {
      windowMs: this.windowMs,
      rewardThresholds: this.rewardThresholds,
      audienceBand: this.currentPolicy?.audienceBand || null,
      viewerCount: toNumber(this.currentPolicy?.viewerCount, 0),
      minSequenceCount: this.minSequenceCount,
      thresholdScale: toNumber(this.currentPolicy?.thresholdScale, 1)
    };
  }

  reset() {
    this.session = createEmptySession();
    return this.getState();
  }

  getState() {
    return buildSnapshot(this.session, this.getSnapshotOptions());
  }

  startSession(eventTs) {
    this.session = createEmptySession();
    this.session.active = true;
    this.session.startedAt = eventTs;
    this.session.lastEventAt = eventTs;
  }

  isGiftLike(event = {}) {
    const kind = String(event.kind || event.type || "").toLowerCase();
    return (
      kind === "gift" ||
      kind === "support" ||
      kind === "gift_support" ||
      kind === "support_gift" ||
      String(event.eventType || "").toUpperCase() === "GIFT" ||
      String(event.route || "").toLowerCase() === "support"
    );
  }

  getPointsFromEvent(event = {}) {
    const support = event.support || {};
    const resolvedSupport = event.resolvedSupport || {};

    const explicit =
      event.miaPoints ??
      event.totalPoints ??
      support.miaPoints ??
      support.totalPoints ??
      resolvedSupport.miaPoints ??
      resolvedSupport.totalPoints ??
      event.giftPoints ??
      event.points ??
      event.supportPoints ??
      event.coinPoints ??
      event.valuePoints ??
      support.giftPoints ??
      support.points ??
      support.supportPoints ??
      support.coinPoints ??
      support.valuePoints ??
      support.value ??
      resolvedSupport.giftPoints ??
      resolvedSupport.points ??
      resolvedSupport.supportPoints ??
      resolvedSupport.coinPoints ??
      resolvedSupport.valuePoints ??
      resolvedSupport.value ??
      0;

    const direct = Math.max(0, toNumber(explicit, 0));
    if (direct > 0) {
      return direct;
    }

    const helper = getSupportPointsHelper();
    if (helper && typeof helper.computeMiaPoints === "function") {
      return Math.max(
        0,
        helper.computeMiaPoints({
          explicitMiaPoints: 0,
          miaPoints: support.miaPoints,
          supportIndex: support.supportIndex,
          points: support.points,
          totalPoints: support.totalPoints,
          explicitTotalCoins: support.totalCoins,
          totalCoins: support.totalCoins,
          coins: support.coins,
          repeatCount: support.repeatCount,
          rawValue: support.rawValue
        })
      );
    }

    const totalCoins = Math.max(
      0,
      toNumber(support.totalCoins, toNumber(support.coins, 0) * Math.max(1, toNumber(support.repeatCount, 1)))
    );
    const { MIA_POINTS_PER_COIN } = require("../scripts/MIA_GIFT_TIERS");
    return totalCoins > 0 ? totalCoins * MIA_POINTS_PER_COIN : 0;
  }

  getGiftNameFromEvent(event = {}) {
    const support = event.support || {};
    const resolvedSupport = event.resolvedSupport || {};

    return (
      String(
        event.giftName ||
          event.itemName ||
          event.label ||
          support.giftName ||
          support.itemName ||
          support.label ||
          resolvedSupport.giftName ||
          resolvedSupport.itemName ||
          resolvedSupport.label ||
          "gift"
      ).trim() || "gift"
    );
  }

  getUserIdFromEvent(event = {}) {
    const user = event.user || {};
    return (
      String(
        event.userId ??
          event.viewerId ??
          event.authorId ??
          event.senderId ??
          event.uniqueId ??
          user.userId ??
          user.viewerId ??
          user.authorId ??
          user.senderId ??
          user.uniqueId ??
          event.displayName ??
          user.displayName ??
          "anonymous"
      ).trim() || "anonymous"
    );
  }

  getUserLabelFromEvent(event = {}) {
    const user = event.user || {};
    return (
      String(
        event.userLabel ??
          event.displayName ??
          event.username ??
          event.nickname ??
          user.nickname ??
          user.username ??
          user.displayName ??
          user.name ??
          event.userId ??
          "fanoušek"
      ).trim() || "fanoušek"
    );
  }

  shouldExpire(eventTs) {
    if (!this.session.active) return true;
    return eventTs - this.session.lastEventAt > this.windowMs;
  }

  confirmSpamIfEligible() {
    if (this.session.spamConfirmed) {
      return false;
    }

    if (this.session.eventCount >= this.minSequenceCount) {
      this.session.spamConfirmed = true;
      return true;
    }

    return false;
  }

  registerParticipant(event, points, giftName) {
    const userId = this.getUserIdFromEvent(event);
    const userLabel = this.getUserLabelFromEvent(event);

    if (!this.session.participants[userId]) {
      this.session.participants[userId] = {
        count: 0,
        points: 0,
        userLabel,
        lastGiftName: giftName
      };
    }

    const participant = this.session.participants[userId];
    participant.count += 1;
    participant.points += points;
    participant.userLabel = userLabel || participant.userLabel;
    participant.lastGiftName = giftName || participant.lastGiftName;
  }

  registerGift(giftName) {
    if (!this.session.gifts[giftName]) {
      this.session.gifts[giftName] = 0;
    }
    this.session.gifts[giftName] += 1;
  }

  updateTierProgress() {
    const tier = getCappedTierByPoints(this.session.totalPoints, this.rewardThresholds);

    if (!tier) {
      return null;
    }

    const current = this.session.highestReachedTier;
    if (!current || spamRewardTierRank(tier) > spamRewardTierRank(current)) {
      this.session.highestReachedTier = tier;
    }

    return this.session.highestReachedTier;
  }

  evaluateReward() {
    const reachedTier = this.updateTierProgress();

    if (!this.session.spamConfirmed) {
      return {
        shouldRewardSpam: false,
        rewardTier: null,
        rewardState: "none"
      };
    }

    if (!reachedTier) {
      return {
        shouldRewardSpam: false,
        rewardTier: null,
        rewardState: "confirmed_no_reward"
      };
    }

    if (this.session.lastRewardTierGranted !== reachedTier) {
      this.session.lastRewardTierGranted = reachedTier;
      this.session.lastRewardAt = this.session.lastEventAt;
      return {
        shouldRewardSpam: true,
        rewardTier: reachedTier,
        rewardState: "new_milestone"
      };
    }

    return {
      shouldRewardSpam: false,
      rewardTier: reachedTier,
      rewardState: "already_granted"
    };
  }

  makeResult(reason, extra = {}) {
    return buildDefaultResult(this.session, reason, extra, this.getSnapshotOptions());
  }

  processSupport(event = {}, context = {}) {
    this.applyAudiencePolicy(context);
    return this.ingest(event);
  }

  ingest(event = {}) {
    const eventTs = nowMsFromEvent(event);

    if (!this.isGiftLike(event)) {
      return this.makeResult("ignored_non_gift", {
        shouldTrack: false,
        shouldConfirmSpam: false
      });
    }

    if (this.shouldExpire(eventTs)) {
      this.startSession(eventTs);
    }

    const points = this.getPointsFromEvent(event);
    const giftName = this.getGiftNameFromEvent(event);

    this.session.active = true;
    this.session.lastEventAt = eventTs;
    this.session.eventCount += 1;
    this.session.totalPoints += points;

    this.registerParticipant(event, points, giftName);
    this.registerGift(giftName);

    const newlyConfirmed = this.confirmSpamIfEligible();
    const reward = this.evaluateReward();

    if (reward.shouldRewardSpam) {
      return this.makeResult("spam_confirmed_reward", {
        shouldTrack: true,
        shouldRewardSpam: true,
        rewardTier: reward.rewardTier,
        newlyConfirmed,
        shouldConfirmSpam: newlyConfirmed,
        rewardState: reward.rewardState
      });
    }

    if (this.session.spamConfirmed) {
      if (reward.rewardState === "confirmed_no_reward") {
        return this.makeResult("spam_confirmed_no_reward", {
          shouldTrack: true,
          newlyConfirmed,
          shouldConfirmSpam: newlyConfirmed,
          rewardState: reward.rewardState
        });
      }

      return this.makeResult("spam_confirmed_already_rewarded", {
        shouldTrack: true,
        rewardTier: reward.rewardTier,
        newlyConfirmed,
        shouldConfirmSpam: false,
        rewardState: reward.rewardState
      });
    }

    return this.makeResult("spam_buildup", {
      shouldTrack: true,
      newlyConfirmed: false,
      shouldConfirmSpam: false,
      rewardState: reward.rewardState,
      audienceBand: this.currentPolicy?.audienceBand || null,
      viewerCount: toNumber(this.currentPolicy?.viewerCount, 0),
      minSequenceCount: this.minSequenceCount
    });
  }
}

const defaultEngine = new SpamSessionEngine();

function createSpamSessionEngine(options = {}) {
  return new SpamSessionEngine(options);
}

function configureSpamSession(options = {}) {
  defaultEngine.windowMs = Math.max(
    500,
    toNumber(options.windowMs, defaultEngine.windowMs)
  );
  defaultEngine.minSequenceCount = Math.max(
    2,
    toNumber(options.minSequenceCount, defaultEngine.minSequenceCount)
  );
  defaultEngine.baseRewardThresholds = normalizeRewardThresholds(
    options.rewardThresholds || defaultEngine.baseRewardThresholds
  );
  defaultEngine.applyAudiencePolicy({});
  return defaultEngine.getState();
}

function processSupport(event = {}, context = {}) {
  return defaultEngine.processSupport(event, context);
}

function resetSpamSession() {
  return defaultEngine.reset();
}

function getSpamSessionState() {
  return defaultEngine.getState();
}

function applySpamAudiencePolicy(context = {}) {
  return defaultEngine.applyAudiencePolicy(context);
}

module.exports = {
  SpamSessionEngine,
  createSpamSessionEngine,
  getCappedTierByPoints,
  getPointsToNextReward,
  resolveDynamicSpamPolicy,
  resolveAudienceBand,
  configureSpamSession,
  processSupport,
  resetSpamSession,
  getSpamSessionState,
  applySpamAudiencePolicy
};