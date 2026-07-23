"use strict";

/**
 * Runtime seznam dárců — krátký cache (kánon §5).
 * Referenční chování: přesný výpis uživatelů u giftů (dříve Streamer.bot).
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

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function createGiftUserLedger(seed = {}) {
  return {
    entries: Array.isArray(seed.entries) ? seed.entries.slice() : [],
    maxEntries: Math.max(4, toNumber(seed.maxEntries, 24)),
    maxAgeMs: Math.max(60000, toNumber(seed.maxAgeMs, 1800000))
  };
}

function pruneGiftUserLedger(state, options = {}) {
  const ledger = createGiftUserLedger(state);
  const now = nowTs();
  const maxAgeMs = toNumber(options.maxAgeMs, ledger.maxAgeMs);

  ledger.entries = ledger.entries.filter(
    (entry) => now - toNumber(entry.ts, 0) <= maxAgeMs
  );

  return ledger;
}

function buildGiftUserEntry(normalized = {}) {
  const user = normalized.user && typeof normalized.user === "object" ? normalized.user : {};
  const support =
    normalized.support && typeof normalized.support === "object" ? normalized.support : {};

  const nickname = safeString(user.nickname || user.username);
  const username = safeString(user.username || user.nickname);

  return {
    ts: toNumber(normalized.ts, nowTs()),
    userId: user.userId ?? null,
    nickname,
    username,
    userLabel: nickname || username || "Divák",
    avatarUrl: safeString(user.avatarUrl || user.avatar || user.profilePictureUrl),
    giftName: safeString(support.giftName),
    giftCount: Math.max(1, toNumber(support.giftCount, toNumber(support.repeatCount, 1))),
    giftValue: toNumber(support.giftValue, toNumber(support.totalCoins, 0)),
    miaPoints: toNumber(support.miaPoints, 0),
    xp: toNumber(support.xp, 0),
    giftLevel: toNumber(support.giftLevel, 0),
    giftLevelLabel: safeString(support.giftLevelLabel),
    tier: safeString(support.tier).toUpperCase(),
    platform: safeString(normalized.platform, "unknown"),
    source: safeString(normalized.source, "unknown")
  };
}

function recordGiftUser(state, normalized = {}, options = {}) {
  const ledger = pruneGiftUserLedger(state, options);
  const entry = buildGiftUserEntry(normalized);

  if (!entry.userLabel && !entry.giftName) {
    return ledger;
  }

  const userKey = safeString(
    entry.userId !== null && entry.userId !== undefined
      ? String(entry.userId)
      : entry.userLabel
  ).toLowerCase();

  ledger.entries = ledger.entries.filter((existing) => {
    const existingKey = safeString(
      existing.userId !== null && existing.userId !== undefined
        ? String(existing.userId)
        : existing.userLabel
    ).toLowerCase();
    return existingKey !== userKey;
  });

  ledger.entries.unshift(entry);
  ledger.entries = ledger.entries.slice(0, ledger.maxEntries);

  return ledger;
}

function getGiftUserLedgerSnapshot(state, options = {}) {
  const ledger = pruneGiftUserLedger(state, options);
  const limit = Math.max(1, toNumber(options.limit, ledger.maxEntries));

  return {
    count: ledger.entries.length,
    maxEntries: ledger.maxEntries,
    maxAgeMs: ledger.maxAgeMs,
    entries: clone(ledger.entries.slice(0, limit))
  };
}

module.exports = {
  createGiftUserLedger,
  pruneGiftUserLedger,
  buildGiftUserEntry,
  recordGiftUser,
  getGiftUserLedgerSnapshot
};
