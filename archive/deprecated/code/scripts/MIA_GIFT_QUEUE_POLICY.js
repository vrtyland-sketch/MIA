"use strict";

/**
 * MIA_GIFT_QUEUE_POLICY.js
 *
 * Centrální policy vrstva pro gift playback queue.
 *
 * Cíl:
 * - zabránit přehnanému zahlcení queue
 * - umět slučovat podobné pending gift joby do combo jobu
 * - zachovat celkovou dobu přehrávání
 * - držet enterprise-ready pravidla na jednom místě
 *
 * Pravidlo merge:
 * - merge jen PENDING jobů, nikdy ne current PLAYING job
 * - merge pouze pokud:
 *   - stejný tier
 *   - stejný giftName
 *   - stejný user identity key
 *   - job je v merge window
 *
 * Výsledek merge:
 * - nevznikne nový job
 * - pending job navýší occurrenceCount
 * - totalPlaybackMs se navýší o basePlaybackMs
 */

function nowTs() {
  return Date.now();
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function normalizeTier(tierValue) {
  const tier = safeString(tierValue).toUpperCase();
  if (tier === "T1" || tier === "T2" || tier === "T3") {
    return tier;
  }
  return "T1";
}

function buildUserMergeKey(normalizedEvent = {}) {
  const user = normalizedEvent.user || {};
  const userId = user.userId;
  const username = safeString(user.username).toLowerCase();
  const nickname = safeString(user.nickname).toLowerCase();

  if (userId !== null && userId !== undefined && String(userId).trim()) {
    return `uid:${String(userId).trim().toLowerCase()}`;
  }

  if (username) return `username:${username}`;
  if (nickname) return `nickname:${nickname}`;

  return "anon";
}

function buildGiftMergeKey(normalizedEvent = {}, tier = "T1") {
  const support = normalizedEvent.support || {};
  const giftName = safeString(support.giftName, "unknown_gift").toLowerCase();

  return [
    normalizeTier(tier),
    buildUserMergeKey(normalizedEvent),
    giftName
  ].join("|");
}

function createGiftPlaybackJob({ tier, playbackMs, normalizedEvent }) {
  const safeTier = normalizeTier(tier);
  const basePlaybackMs = Math.max(0, toNumber(playbackMs, 0));

  return {
    id: `gift_job_${nowTs()}_${Math.random().toString(36).slice(2, 8)}`,
    tier: safeTier,

    basePlaybackMs,
    totalPlaybackMs: basePlaybackMs,
    occurrenceCount: 1,

    createdAt: nowTs(),
    updatedAt: nowTs(),
    startedAt: 0,
    finishedAt: 0,

    status: "WAITING",
    sourceName: "",
    eventId: normalizedEvent?.eventId || "",

    mergeKey: buildGiftMergeKey(normalizedEvent, safeTier),

    support: normalizedEvent?.support || null,
    user: normalizedEvent?.user || null
  };
}

function canMergeIntoJob(existingJob = {}, normalizedEvent = {}, tier = "T1", options = {}) {
  if (!existingJob || typeof existingJob !== "object") return false;
  if (safeString(existingJob.status, "WAITING").toUpperCase() !== "WAITING") return false;

  const safeTier = normalizeTier(tier);
  const safeMergeWindowMs = Math.max(0, toNumber(options.mergeWindowMs, 3500));

  const existingMergeKey = safeString(existingJob.mergeKey);
  const incomingMergeKey = buildGiftMergeKey(normalizedEvent, safeTier);

  if (!existingMergeKey || !incomingMergeKey) return false;
  if (existingMergeKey !== incomingMergeKey) return false;

  if (normalizeTier(existingJob.tier) !== safeTier) return false;

  const updatedAt = toNumber(existingJob.updatedAt || existingJob.createdAt, 0);
  if (!updatedAt) return false;

  if (nowTs() - updatedAt > safeMergeWindowMs) return false;

  return true;
}

function mergeGiftPlaybackJob(existingJob = {}, normalizedEvent = {}, playbackMs = 0) {
  const addMs = Math.max(0, toNumber(playbackMs, 0));

  existingJob.occurrenceCount = Math.max(1, toNumber(existingJob.occurrenceCount, 1)) + 1;
  existingJob.totalPlaybackMs = Math.max(0, toNumber(existingJob.totalPlaybackMs, 0)) + addMs;
  existingJob.updatedAt = nowTs();

  const incomingSupport = normalizedEvent?.support || {};
  const existingSupport = existingJob.support && typeof existingJob.support === "object"
    ? existingJob.support
    : {};

  existingJob.support = {
    ...existingSupport,
    totalCoins:
      toNumber(existingSupport.totalCoins, 0) +
      Math.max(0, toNumber(incomingSupport.totalCoins, incomingSupport.rawValue || 0))
  };

  return existingJob;
}

function enqueueWithPolicy(queue = [], { tier, playbackMs, normalizedEvent, config = {} } = {}) {
  const safeQueue = Array.isArray(queue) ? queue : [];
  const safeTier = normalizeTier(tier);
  const safePlaybackMs = Math.max(0, toNumber(playbackMs, 0));

  const mergeEnabled = config?.mergeEnabled !== false;
  const mergeWindowMs = Math.max(0, toNumber(config?.mergeWindowMs, 3500));

  if (mergeEnabled) {
    for (let i = safeQueue.length - 1; i >= 0; i -= 1) {
      const candidate = safeQueue[i];

      if (canMergeIntoJob(candidate, normalizedEvent, safeTier, { mergeWindowMs })) {
        const mergedJob = mergeGiftPlaybackJob(candidate, normalizedEvent, safePlaybackMs);

        return {
          mode: "merged",
          job: mergedJob,
          queue: safeQueue
        };
      }
    }
  }

  const newJob = createGiftPlaybackJob({
    tier: safeTier,
    playbackMs: safePlaybackMs,
    normalizedEvent
  });

  safeQueue.push(newJob);

  return {
    mode: "enqueued",
    job: newJob,
    queue: safeQueue
  };
}

module.exports = {
  buildUserMergeKey,
  buildGiftMergeKey,
  createGiftPlaybackJob,
  canMergeIntoJob,
  mergeGiftPlaybackJob,
  enqueueWithPolicy
};