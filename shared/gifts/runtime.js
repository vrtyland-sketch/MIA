"use strict";

/**
 * Gift Map runtime — fronta, merge, streak, statistiky, achievementy, viewer level.
 * Index.js zůstává orchestrátor; tato vrstva drží stav gift ekonomiky.
 */

const path = require("path");
const fs = require("fs");
const { resolveGift, tierRank, achievements, rewards, overlayMap } = require("./resolver");
const { validateGiftEvent, validateResolved } = require("./validator");

const WAVE_THRESHOLD = 10;
const MERGE_WINDOW_MS = 2500;
const STATS_PATH = path.join(__dirname, "..", "..", "data", "gift-map-stats.json");

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function nowMs() {
  return Date.now();
}

function levelFromXp(xp, base = 50, growth = 1.35) {
  let level = 1;
  let need = base;
  let left = Math.max(0, toNumber(xp, 0));
  while (left >= need && level < 99) {
    left -= need;
    level += 1;
    need = Math.round(need * growth);
  }
  return { level, xpIntoLevel: left, xpToNext: need };
}

function loadStatsFile() {
  try {
    if (!fs.existsSync(STATS_PATH)) return null;
    return JSON.parse(fs.readFileSync(STATS_PATH, "utf8"));
  } catch {
    return null;
  }
}

function saveStatsFile(stats) {
  try {
    fs.mkdirSync(path.dirname(STATS_PATH), { recursive: true });
    fs.writeFileSync(STATS_PATH, JSON.stringify(stats, null, 2), "utf8");
  } catch {
    // non-fatal
  }
}

function createRuntime(options = {}) {
  const persist = options.persist !== false;
  const loaded = persist ? loadStatsFile() : null;

  const state = {
    queue: [],
    pendingMerge: new Map(),
    viewers: loaded?.viewers || {},
    community: loaded?.community || {
      totalGifts: 0,
      totalCoins: 0,
      totalMiaPoints: 0,
      giftCounts: {},
      biggest: null,
      xp: 0
    },
    achievementsUnlocked: loaded?.achievementsUnlocked || {},
    lastPlay: null
  };

  function viewerKey(resolved) {
    return `${resolved.platform || "unknown"}:${safeString(resolved.displayName, "viewer").toLowerCase()}`;
  }

  function ensureViewer(resolved) {
    const key = viewerKey(resolved);
    if (!state.viewers[key]) {
      state.viewers[key] = {
        key,
        displayName: resolved.displayName,
        platform: resolved.platform,
        totalGifts: 0,
        totalCoins: 0,
        totalMiaPoints: 0,
        giftCounts: {},
        careCounts: {},
        bowlFillTotal: 0,
        xp: { viewer: 0, support: 0, care: 0 },
        favoriteGift: null,
        biggest: null,
        achievements: []
      };
    }
    return state.viewers[key];
  }

  function updateFavorite(viewer) {
    let bestKey = null;
    let bestCount = 0;
    for (const [k, c] of Object.entries(viewer.giftCounts || {})) {
      if (c > bestCount) {
        bestCount = c;
        bestKey = k;
      }
    }
    viewer.favoriteGift = bestKey;
  }

  function checkAchievements(viewer, resolved) {
    const unlocked = [];
    const defs = achievements.achievements || {};
    for (const [id, def] of Object.entries(defs)) {
      if (viewer.achievements.includes(id)) continue;
      const when = def.when || {};
      let ok = true;
      if (when.totalGifts != null && viewer.totalGifts < when.totalGifts) ok = false;
      if (when.totalCoins != null && viewer.totalCoins < when.totalCoins) ok = false;
      if (when.bowlFillTotal != null && viewer.bowlFillTotal < when.bowlFillTotal) ok = false;
      if (when.giftKey && when.count != null) {
        if (toNumber(viewer.giftCounts[when.giftKey], 0) < when.count) ok = false;
      }
      if (when.care && when.count != null) {
        if (toNumber(viewer.careCounts[when.care], 0) < when.count) ok = false;
      }
      if (when.minTier && tierRank(resolved.tier) < tierRank(when.minTier)) ok = false;
      if (!ok) continue;
      viewer.achievements.push(id);
      state.achievementsUnlocked[`${viewer.key}:${id}`] = {
        id,
        label: def.label,
        viewer: viewer.displayName,
        at: nowMs(),
        public: def.public !== false
      };
      unlocked.push({ id, label: def.label, public: def.public !== false });
    }
    return unlocked;
  }

  function applyStats(resolved) {
    const viewer = ensureViewer(resolved);
    viewer.totalGifts += 1;
    viewer.totalCoins += resolved.totalCoins;
    viewer.totalMiaPoints += resolved.miaPoints;
    viewer.giftCounts[resolved.giftKey] = toNumber(viewer.giftCounts[resolved.giftKey], 0) + resolved.count;
    viewer.careCounts[resolved.care] = toNumber(viewer.careCounts[resolved.care], 0) + 1;
    viewer.bowlFillTotal += toNumber(resolved.bowl?.fill, 0);
    viewer.xp.viewer += resolved.xp.viewer;
    viewer.xp.support += resolved.xp.viewer;
    viewer.xp.care += resolved.care === "CARE" || resolved.care === "LOVE" || resolved.care === "PET"
      ? resolved.xp.koj
      : Math.round(resolved.xp.koj * 0.5);

    if (!viewer.biggest || resolved.totalCoins > viewer.biggest.totalCoins) {
      viewer.biggest = {
        giftKey: resolved.giftKey,
        label: resolved.label,
        totalCoins: resolved.totalCoins,
        miaPoints: resolved.miaPoints,
        tier: resolved.tier
      };
    }
    updateFavorite(viewer);

    state.community.totalGifts += 1;
    state.community.totalCoins += resolved.totalCoins;
    state.community.totalMiaPoints += resolved.miaPoints;
    state.community.giftCounts[resolved.giftKey] =
      toNumber(state.community.giftCounts[resolved.giftKey], 0) + resolved.count;
    state.community.xp += resolved.xp.community;
    if (!state.community.biggest || resolved.totalCoins > state.community.biggest.totalCoins) {
      state.community.biggest = {
        giftKey: resolved.giftKey,
        label: resolved.label,
        displayName: resolved.displayName,
        totalCoins: resolved.totalCoins,
        miaPoints: resolved.miaPoints,
        tier: resolved.tier
      };
    }

    const levelsCfg = rewards.levels || {};
    const levels = {
      viewer: levelFromXp(viewer.xp.viewer, levelsCfg.viewer?.base, levelsCfg.viewer?.growth),
      support: levelFromXp(viewer.xp.support, levelsCfg.support?.base, levelsCfg.support?.growth),
      care: levelFromXp(viewer.xp.care, levelsCfg.care?.base, levelsCfg.care?.growth),
      community: levelFromXp(state.community.xp, levelsCfg.community?.base, levelsCfg.community?.growth)
    };

    const unlocked = checkAchievements(viewer, resolved);
    if (persist) {
      saveStatsFile({
        viewers: state.viewers,
        community: state.community,
        achievementsUnlocked: state.achievementsUnlocked,
        updatedAt: nowMs()
      });
    }

    return { viewer, levels, unlocked };
  }

  function classifyStreak(resolved, mergedCount) {
    const count = mergedCount || resolved.count;
    if (count >= 100) return { kind: "wave", label: `${resolved.label} Wave`, count };
    if (count >= WAVE_THRESHOLD) return { kind: "wave", label: `${resolved.label} Wave`, count };
    if (count >= 3) return { kind: "combo", label: `${resolved.label} combo`, count };
    if (count === 2) return { kind: "repeat", label: `${resolved.label} ×2`, count };
    return { kind: "single", label: resolved.label, count };
  }

  function mergeKey(resolved) {
    return `${viewerKey(resolved)}:${resolved.giftKey}`;
  }

  /**
   * Přijme platform gift event, vrátí plný gift map kontext.
   * Malé giftů stejného klíče od stejného vieweru se v okně sloučí (Rose ×4).
   */
  function ingest(rawInput = {}) {
    const eventCheck = validateGiftEvent(rawInput);
    const resolved = resolveGift(rawInput);
    const resolvedCheck = validateResolved(resolved);
    const stats = applyStats(resolved);

    const key = mergeKey(resolved);
    const existing = state.pendingMerge.get(key);
    const ts = nowMs();

    let playItem;
    if (existing && ts - existing.at <= MERGE_WINDOW_MS && tierRank(resolved.tier) <= 2) {
      existing.count += resolved.count;
      existing.totalCoins += resolved.totalCoins;
      existing.miaPoints += resolved.miaPoints;
      existing.at = ts;
      existing.resolved = {
        ...resolved,
        count: existing.count,
        totalCoins: existing.totalCoins,
        miaPoints: existing.miaPoints,
        overlay: {
          ...resolved.overlay,
          text: renderMergedOverlay(resolved, existing.count),
          miaPoints: existing.miaPoints
        }
      };
      playItem = existing.resolved;
      playItem.merged = true;
      playItem.streak = classifyStreak(resolved, existing.count);
      // replace queued merge slot
      state.queue = state.queue.filter((q) => q.mergeKey !== key);
      state.queue.push({
        mergeKey: key,
        priority: playItem.priority,
        at: ts,
        resolved: playItem
      });
    } else {
      const streak = classifyStreak(resolved, resolved.count);
      playItem = {
        ...resolved,
        merged: false,
        streak,
        overlay: {
          ...resolved.overlay,
          text:
            streak.kind === "wave" || streak.kind === "combo"
              ? renderMergedOverlay(resolved, resolved.count)
              : resolved.overlay.text
        }
      };
      state.pendingMerge.set(key, {
        at: ts,
        count: resolved.count,
        totalCoins: resolved.totalCoins,
        miaPoints: resolved.miaPoints,
        resolved: playItem
      });
      state.queue.push({
        mergeKey: key,
        priority: playItem.priority,
        at: ts,
        resolved: playItem
      });
    }

    state.queue.sort((a, b) => b.priority - a.priority || a.at - b.at);
    state.lastPlay = playItem;

    return {
      ok: eventCheck.ok && resolvedCheck.ok,
      validation: { event: eventCheck, resolved: resolvedCheck },
      gift: playItem,
      stats: {
        viewer: {
          displayName: stats.viewer.displayName,
          favoriteGift: stats.viewer.favoriteGift,
          totalGifts: stats.viewer.totalGifts,
          totalMiaPoints: stats.viewer.totalMiaPoints,
          biggest: stats.viewer.biggest
        },
        levels: stats.levels,
        achievements: stats.unlocked,
        community: {
          totalGifts: state.community.totalGifts,
          totalMiaPoints: state.community.totalMiaPoints,
          biggest: state.community.biggest
        }
      },
      queueLength: state.queue.length
    };
  }

  function renderMergedOverlay(resolved, count) {
    const template =
      count >= WAVE_THRESHOLD
        ? overlayMap.waveTemplate || "{user} · {gift} Wave ×{count}"
        : overlayMap.comboTemplate || "{user} · combo {gift} ×{count}";
    return template
      .replace("{user}", resolved.displayName)
      .replace("{gift}", resolved.label)
      .replace("{count}", String(count));
  }

  function dequeueNext() {
    if (!state.queue.length) return null;
    const item = state.queue.shift();
    state.lastPlay = item.resolved;
    state.pendingMerge.delete(item.mergeKey);
    return item.resolved;
  }

  function peekQueue() {
    return state.queue.map((q) => ({
      giftKey: q.resolved.giftKey,
      priority: q.priority,
      count: q.resolved.count,
      tier: q.resolved.tier,
      displayName: q.resolved.displayName
    }));
  }

  function getStats() {
    return {
      community: state.community,
      viewers: state.viewers,
      achievementsUnlocked: state.achievementsUnlocked,
      queue: peekQueue(),
      lastPlay: state.lastPlay
    };
  }

  /**
   * Paměť vieweru pro AI / děkování (bez coins).
   * Např. Tomino často posílá ROSE → personalizovaná reakce.
   */
  function getViewerMemory(query = {}) {
    const platform = safeString(query.platform, "unknown").toLowerCase();
    const displayName = safeString(
      query.displayName || query.nickname || query.userLabel,
      ""
    );
    if (!displayName) return null;

    const directKey = `${platform}:${displayName.toLowerCase()}`;
    let viewer = state.viewers[directKey];

    if (!viewer) {
      const needle = displayName.toLowerCase();
      viewer = Object.values(state.viewers).find(
        (row) => safeString(row.displayName).toLowerCase() === needle
      );
    }

    if (!viewer) return null;

    const favoriteGift = safeString(viewer.favoriteGift);
    const careCounts = viewer.careCounts || {};
    let careRole = "supporter";
    const feedCare =
      toNumber(careCounts.CARE, 0) +
      toNumber(careCounts.PET, 0) +
      toNumber(careCounts.LOVE, 0);
    if (feedCare >= 3 && feedCare >= toNumber(careCounts.SUPPORT, 0)) {
      careRole = "feeder";
    }

    return {
      displayName: viewer.displayName,
      platform: viewer.platform,
      totalGifts: toNumber(viewer.totalGifts, 0),
      totalMiaPoints: toNumber(viewer.totalMiaPoints, 0),
      favoriteGift: favoriteGift || null,
      careRole,
      achievements: (viewer.achievements || []).slice(-6),
      biggest: viewer.biggest
        ? {
            giftKey: viewer.biggest.giftKey,
            label: viewer.biggest.label,
            miaPoints: viewer.biggest.miaPoints,
            tier: viewer.biggest.tier
          }
        : null
    };
  }

  /** Public overlay shape — bez coins / giftValue. */
  function getPublicSnapshot(limit = 8) {
    const recentAchievements = Object.values(state.achievementsUnlocked || {})
      .filter((row) => row && row.public !== false)
      .sort((a, b) => toNumber(b.at, 0) - toNumber(a.at, 0))
      .slice(0, Math.max(1, limit))
      .map((row) => ({
        id: row.id,
        label: row.label,
        viewer: row.viewer,
        at: row.at
      }));

    const topViewers = Object.values(state.viewers || {})
      .sort(
        (a, b) =>
          toNumber(b.totalMiaPoints, 0) - toNumber(a.totalMiaPoints, 0)
      )
      .slice(0, Math.max(1, limit))
      .map((viewer) => ({
        displayName: viewer.displayName,
        platform: viewer.platform,
        totalGifts: viewer.totalGifts,
        totalMiaPoints: viewer.totalMiaPoints,
        favoriteGift: viewer.favoriteGift,
        achievements: (viewer.achievements || []).slice(-6),
        biggest: viewer.biggest
          ? {
              giftKey: viewer.biggest.giftKey,
              label: viewer.biggest.label,
              miaPoints: viewer.biggest.miaPoints,
              tier: viewer.biggest.tier
            }
          : null
      }));

    const communityBiggest = state.community.biggest
      ? {
          giftKey: state.community.biggest.giftKey,
          label: state.community.biggest.label,
          displayName: state.community.biggest.displayName,
          miaPoints: state.community.biggest.miaPoints,
          tier: state.community.biggest.tier
        }
      : null;

    return {
      community: {
        totalGifts: state.community.totalGifts,
        totalMiaPoints: state.community.totalMiaPoints,
        biggest: communityBiggest
      },
      topViewers,
      recentAchievements,
      queue: peekQueue(),
      lastPlay: state.lastPlay
        ? {
            giftKey: state.lastPlay.giftKey,
            label: state.lastPlay.label,
            displayName: state.lastPlay.displayName,
            tier: state.lastPlay.tier,
            priority: state.lastPlay.priority,
            streak: state.lastPlay.streak || null,
            overlayText: state.lastPlay.overlay?.text || null
          }
        : null
    };
  }

  function resetQueue() {
    state.queue = [];
    state.pendingMerge.clear();
  }

  return {
    ingest,
    resolve: resolveGift,
    dequeueNext,
    peekQueue,
    getStats,
    getViewerMemory,
    getPublicSnapshot,
    resetQueue
  };
}

const defaultRuntime = createRuntime();

module.exports = {
  createRuntime,
  ingest: (...args) => defaultRuntime.ingest(...args),
  resolve: resolveGift,
  dequeueNext: (...args) => defaultRuntime.dequeueNext(...args),
  peekQueue: (...args) => defaultRuntime.peekQueue(...args),
  getStats: (...args) => defaultRuntime.getStats(...args),
  getViewerMemory: (...args) => defaultRuntime.getViewerMemory(...args),
  getPublicSnapshot: (...args) => defaultRuntime.getPublicSnapshot(...args),
  resetQueue: (...args) => defaultRuntime.resetQueue(...args)
};
