"use strict";

/**
 * Runtime profil dárce — kumulativní XP, gift level, streak (krátký cache).
 */

const giftEconomy = require("./MIA_GIFT_ECONOMY");

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

function dayKey(ts = Date.now()) {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function prevDayKey(day = "") {
  const parts = safeString(day).split("-").map((x) => Number(x));
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) {
    return dayKey(nowTs() - 86400000);
  }
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  d.setDate(d.getDate() - 1);
  return dayKey(d.getTime());
}

function createGiftSupporterProfile(seed = {}) {
  return {
    supporters: seed.supporters && typeof seed.supporters === "object" ? { ...seed.supporters } : {},
    maxSupporters: Math.max(32, toNumber(seed.maxSupporters, 512))
  };
}

function resolveSupporterKey(normalized = {}) {
  const user = normalized.user && typeof normalized.user === "object" ? normalized.user : {};
  const userId = user.userId ?? normalized.userId ?? null;
  if (userId !== null && userId !== undefined && safeString(String(userId))) {
    return `id:${safeString(String(userId))}`;
  }

  const label = safeString(
    user.nickname || user.username || normalized.nickname || normalized.username,
    "Divák"
  );
  return `nick:${label.toLowerCase()}`;
}

function getSupporter(state = {}, key = "") {
  const profile = createGiftSupporterProfile(state);
  const supporter = profile.supporters[key];
  if (!supporter || typeof supporter !== "object") {
    return {
      key,
      userLabel: "",
      cumulativeXp: 0,
      giftLevel: 1,
      giftLevelLabel: "Nováček",
      streakDays: 0,
      streakBonusPct: 0,
      lastGiftDay: "",
      giftCount: 0,
      lastGiftName: "",
      engagementCounts: { like: 0, follow: 0, share: 0, comment: 0 },
      lastEngagementType: "",
      lastEngagementAt: 0,
      updatedAt: 0
    };
  }
  return {
    ...supporter,
    key,
    engagementCounts: {
      like: toNumber(supporter.engagementCounts?.like, 0),
      follow: toNumber(supporter.engagementCounts?.follow, 0),
      share: toNumber(supporter.engagementCounts?.share, 0),
      comment: toNumber(supporter.engagementCounts?.comment, 0)
    }
  };
}

function recordGiftSupport(state = {}, normalized = {}, support = {}) {
  const profile = createGiftSupporterProfile(state);
  const key = resolveSupporterKey(normalized);
  const user = normalized.user && typeof normalized.user === "object" ? normalized.user : {};
  const userLabel = safeString(
    user.nickname || user.username || normalized.nickname,
    "Divák"
  );

  const existing = getSupporter(profile, key);
  const today = dayKey(toNumber(normalized.ts, nowTs()));
  const yesterday = prevDayKey(today);

  let streakDays = toNumber(existing.streakDays, 0);
  if (!existing.lastGiftDay) {
    streakDays = 1;
  } else if (existing.lastGiftDay === today) {
    streakDays = Math.max(1, streakDays);
  } else if (existing.lastGiftDay === yesterday) {
    streakDays = Math.max(1, streakDays) + 1;
  } else {
    streakDays = 1;
  }

  // Gift mapa: giftXp.viewer (už s category mul) má přednost před surovými coins.
  const mapViewerXp = toNumber(support.giftXp?.viewer, NaN);
  const baseXp = Math.max(
    0,
    Number.isFinite(mapViewerXp) && mapViewerXp > 0
      ? mapViewerXp
      : toNumber(support.totalCoins, toNumber(support.coins, 0))
  );
  const streakBonusPct = giftEconomy.resolveStreakBonusPct(streakDays);
  const xpAward = giftEconomy.applyXpBonus(baseXp, streakBonusPct);
  const cumulativeXp = toNumber(existing.cumulativeXp, 0) + xpAward;
  const level = giftEconomy.resolveGiftLevel(cumulativeXp);

  const giftKey = safeString(support.giftKey || support.giftMap?.giftKey);
  const favoriteGift = giftKey || safeString(existing.favoriteGift);
  const mapAchievements = Array.isArray(support.giftStats?.achievements)
    ? support.giftStats.achievements
    : [];
  const achievements = Array.isArray(existing.achievements)
    ? existing.achievements.slice()
    : [];
  for (const row of mapAchievements) {
    if (!row || row.public === false) continue;
    const id = safeString(row.id);
    if (!id || achievements.some((item) => item.id === id)) continue;
    achievements.push({
      id,
      label: safeString(row.label, id),
      at: nowTs()
    });
  }

  const next = {
    key,
    userLabel,
    cumulativeXp,
    giftLevel: level.giftLevel,
    giftLevelLabel: level.giftLevelLabel,
    streakDays,
    streakBonusPct,
    lastGiftDay: today,
    giftCount: toNumber(existing.giftCount, 0) + 1,
    lastGiftName: safeString(support.giftName),
    lastGiftKey: giftKey || safeString(existing.lastGiftKey),
    favoriteGift,
    achievements: achievements.slice(-12),
    lastStreamTier: safeString(support.tier || support.streamTier),
    updatedAt: nowTs()
  };

  profile.supporters[key] = next;

  const keys = Object.keys(profile.supporters);
  if (keys.length > profile.maxSupporters) {
    keys
      .sort(
        (a, b) =>
          toNumber(profile.supporters[a]?.updatedAt, 0) -
          toNumber(profile.supporters[b]?.updatedAt, 0)
      )
      .slice(0, keys.length - profile.maxSupporters)
      .forEach((dropKey) => {
        delete profile.supporters[dropKey];
      });
  }

  return {
    state: profile,
    supporter: next,
    xpBase: baseXp,
    xpAward,
    streakBonusPct
  };
}

function recordCommunityEngagement(state = {}, normalized = {}, opts = {}) {
  const profile = createGiftSupporterProfile(state);
  const eventType = safeString(opts.eventType, "LIKE").toUpperCase();
  const xpAward = Math.max(0, toNumber(opts.xpAward, 0));

  const key = resolveSupporterKey(normalized);
  const user = normalized.user && typeof normalized.user === "object" ? normalized.user : {};
  const userLabel = safeString(
    user.nickname || user.username || normalized.nickname,
    "Divák"
  );

  const existing = getSupporter(profile, key);
  const engagementCounts = {
    like: toNumber(existing.engagementCounts?.like, 0),
    follow: toNumber(existing.engagementCounts?.follow, 0),
    share: toNumber(existing.engagementCounts?.share, 0),
    comment: toNumber(existing.engagementCounts?.comment, 0)
  };

  const countKey = {
    LIKE: "like",
    FOLLOW: "follow",
    SHARE: "share",
    COMMENT: "comment"
  }[eventType];

  if (countKey) {
    engagementCounts[countKey] += 1;
  }

  const cumulativeXp = toNumber(existing.cumulativeXp, 0) + xpAward;
  const level = giftEconomy.resolveGiftLevel(cumulativeXp);

  const next = {
    key,
    userLabel,
    cumulativeXp,
    giftLevel: level.giftLevel,
    giftLevelLabel: level.giftLevelLabel,
    streakDays: toNumber(existing.streakDays, 0),
    streakBonusPct: toNumber(existing.streakBonusPct, 0),
    lastGiftDay: safeString(existing.lastGiftDay),
    giftCount: toNumber(existing.giftCount, 0),
    lastGiftName: safeString(existing.lastGiftName),
    engagementCounts,
    lastEngagementType: eventType,
    lastEngagementAt: nowTs(),
    updatedAt: nowTs()
  };

  profile.supporters[key] = next;

  const keys = Object.keys(profile.supporters);
  if (keys.length > profile.maxSupporters) {
    keys
      .sort(
        (a, b) =>
          toNumber(profile.supporters[a]?.updatedAt, 0) -
          toNumber(profile.supporters[b]?.updatedAt, 0)
      )
      .slice(0, keys.length - profile.maxSupporters)
      .forEach((dropKey) => {
        delete profile.supporters[dropKey];
      });
  }

  return {
    state: profile,
    supporter: next,
    xpAward,
    eventType
  };
}

function attachGiftMapAchievements(state = {}, normalized = {}, achievements = []) {
  const profile = createGiftSupporterProfile(state);
  const list = Array.isArray(achievements) ? achievements : [];
  if (!list.length) {
    return { state: profile, supporter: null, added: [] };
  }

  const key = resolveSupporterKey(normalized);
  const existing = getSupporter(profile, key);
  const user = normalized.user && typeof normalized.user === "object" ? normalized.user : {};
  const userLabel = safeString(
    user.nickname || user.username || existing.userLabel || normalized.nickname,
    "Divák"
  );
  const nextAchievements = Array.isArray(existing.achievements)
    ? existing.achievements.slice()
    : [];
  const added = [];

  for (const row of list) {
    if (!row || row.public === false) continue;
    const id = safeString(row.id);
    if (!id || nextAchievements.some((item) => item.id === id)) continue;
    const entry = {
      id,
      label: safeString(row.label, id),
      at: nowTs()
    };
    nextAchievements.push(entry);
    added.push(entry);
  }

  if (!added.length && existing.key) {
    return { state: profile, supporter: existing, added };
  }

  const next = {
    ...existing,
    key,
    userLabel,
    achievements: nextAchievements.slice(-12),
    favoriteGift: safeString(
      normalized?.support?.giftKey ||
        normalized?.support?.giftMap?.giftKey ||
        existing.favoriteGift
    ),
    lastGiftKey: safeString(
      normalized?.support?.giftKey ||
        normalized?.support?.giftMap?.giftKey ||
        existing.lastGiftKey
    ),
    updatedAt: nowTs()
  };

  profile.supporters[key] = next;
  return { state: profile, supporter: next, added };
}

function getSupporterSnapshot(state = {}, key = "") {
  const profile = createGiftSupporterProfile(state);
  if (key) {
    return clone(getSupporter(profile, key));
  }

  const entries = Object.values(profile.supporters)
    .sort((a, b) => toNumber(b.updatedAt, 0) - toNumber(a.updatedAt, 0))
    .slice(0, 24);

  return {
    count: entries.length,
    maxSupporters: profile.maxSupporters,
    entries: clone(entries)
  };
}

module.exports = {
  dayKey,
  createGiftSupporterProfile,
  resolveSupporterKey,
  getSupporter,
  recordGiftSupport,
  attachGiftMapAchievements,
  recordCommunityEngagement,
  getSupporterSnapshot
};
