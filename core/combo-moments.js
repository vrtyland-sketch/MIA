"use strict";

/**
 * Phase 2 — Combo moment detection (roadmap §8 start).
 *
 * Ships solid detectors for:
 *   - solo_combo — same user rapid gifts
 *   - community_burst — multiple gifters in a short window
 *   - first_support — first gift from a viewer (when memory says so)
 *   - bowl_rush — bowl climbing fast / near full (hook)
 *
 * Deferred: gift_storm polish, legendary_moment.
 *
 * Emits named moment payloads for overlay-state / action queue.
 */

const DEFAULT_SOLO_WINDOW_MS = 8000;
const DEFAULT_BURST_WINDOW_MS = 12000;
const DEFAULT_SOLO_MIN = 3;
const DEFAULT_BURST_MIN_GIFTS = 4;
const DEFAULT_BURST_MIN_USERS = 3;
const DEFAULT_BOWL_RUSH_DELTA = 12;
const DEFAULT_BOWL_RUSH_WINDOW_MS = 20000;

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function envFlag(name) {
  const v = String(process.env[name] || "").trim().toLowerCase();
  if (!v) return null;
  if (v === "1" || v === "true" || v === "yes" || v === "on") return true;
  if (v === "0" || v === "false" || v === "no" || v === "off") return false;
  return null;
}

function isComboMomentsEnabled(runtimeConfig = {}) {
  const env = envFlag("MIA_COMBO_MOMENTS");
  if (env === false) return false;
  if (env === true) return true;
  const cfg = runtimeConfig?.phase2?.comboMoments ?? runtimeConfig?.comboMoments;
  if (cfg && cfg.enabled === false) return false;
  return true;
}

function createComboMomentDetector(options = {}) {
  const soloWindowMs = Math.max(
    1000,
    toNumber(options.soloWindowMs, DEFAULT_SOLO_WINDOW_MS)
  );
  const burstWindowMs = Math.max(
    2000,
    toNumber(options.burstWindowMs, DEFAULT_BURST_WINDOW_MS)
  );
  const soloMin = Math.max(2, toNumber(options.soloMin, DEFAULT_SOLO_MIN));
  const burstMinGifts = Math.max(
    2,
    toNumber(options.burstMinGifts, DEFAULT_BURST_MIN_GIFTS)
  );
  const burstMinUsers = Math.max(
    2,
    toNumber(options.burstMinUsers, DEFAULT_BURST_MIN_USERS)
  );
  const bowlRushDelta = Math.max(
    5,
    toNumber(options.bowlRushDelta, DEFAULT_BOWL_RUSH_DELTA)
  );
  const bowlRushWindowMs = Math.max(
    3000,
    toNumber(options.bowlRushWindowMs, DEFAULT_BOWL_RUSH_WINDOW_MS)
  );

  /** @type {Array<{at:number,userKey:string,miaPoints:number,giftName:string}>} */
  let recentGifts = [];
  /** @type {Map<string, {at:number, bowl:number}>} */
  let bowlSamples = [];
  /** @type {Map<string, number>} last emitted by type+key to debounce */
  const lastEmitted = new Map();

  function prune(now) {
    const oldest = now - Math.max(soloWindowMs, burstWindowMs, bowlRushWindowMs);
    recentGifts = recentGifts.filter((g) => g.at >= oldest);
    bowlSamples = bowlSamples.filter((s) => s.at >= now - bowlRushWindowMs);
  }

  function userKeyFromEvent(event = {}) {
    return (
      safeString(event.user?.id) ||
      safeString(event.user?.name) ||
      safeString(event.userId) ||
      "anon"
    );
  }

  function debounceOk(key, now, cooldownMs = 6000) {
    const prev = lastEmitted.get(key) || 0;
    if (now - prev < cooldownMs) return false;
    lastEmitted.set(key, now);
    return true;
  }

  function buildMoment(type, fields = {}) {
    const styles = {
      solo_combo: {
        kind: "SOLO_COMBO",
        title: "SOLO COMBO",
        accent: "#ffb400",
        glow: "rgba(255,180,0,0.45)",
        holdMs: 7000,
        priority: 4
      },
      community_burst: {
        kind: "COMMUNITY_BURST",
        title: "COMMUNITY BURST",
        accent: "#00eaff",
        glow: "rgba(0,234,255,0.45)",
        holdMs: 7800,
        priority: 5
      },
      first_support: {
        kind: "FIRST_SUPPORT",
        title: "FIRST SUPPORT",
        accent: "#38d976",
        glow: "rgba(56,217,118,0.48)",
        holdMs: 6500,
        priority: 3
      },
      bowl_rush: {
        kind: "BOWL_RUSH",
        title: "BOWL RUSH",
        accent: "#ff6040",
        glow: "rgba(255,96,64,0.5)",
        holdMs: 8200,
        priority: 6
      }
    };
    const style = styles[type] || styles.solo_combo;
    return {
      type,
      momentType: type,
      kind: style.kind,
      title: fields.title || style.title,
      subtext: fields.subtext || "",
      count: toNumber(fields.count, 0),
      accent: style.accent,
      glow: style.glow,
      holdMs: style.holdMs,
      priority: style.priority,
      source: "phase2_combo_moments",
      meta: {
        ...(fields.meta || {}),
        momentType: type,
        miaPointsOnly: true
      }
    };
  }

  /**
   * Observe a gift (or chat for first_support hook) and optionally return a moment.
   *
   * @param {object} event — unified runtime event
   * @param {object} [ctx]
   * @param {object} [ctx.viewerMemory] — before or after update; giftCount===0/1 for first
   * @param {number} [ctx.bowlPercent]
   * @param {boolean} [ctx.isFirstSupport]
   */
  function observe(event = {}, ctx = {}) {
    const now = toNumber(ctx.now, Date.now());
    prune(now);

    const type = safeString(event.type).toLowerCase();
    const moments = [];

    if (type === "gift" || type === "support") {
      const userKey = userKeyFromEvent(event);
      const name = safeString(event.user?.name, "Divák");
      const giftName = safeString(event.gift?.name, "gift");
      const miaPoints = toNumber(event.gift?.miaPoints ?? event.miaPoints, 0);

      recentGifts.push({
        at: now,
        userKey,
        miaPoints,
        giftName,
        name
      });

      // --- first_support ---
      const isFirst =
        ctx.isFirstSupport === true ||
        toNumber(ctx.viewerMemory?.giftCount ?? ctx.viewerMemory?.totalGifts, -1) ===
          0 ||
        (ctx.viewerMemory &&
          toNumber(ctx.viewerMemory.giftCount ?? ctx.viewerMemory.totalGifts, 0) <= 1 &&
          ctx.viewerMemoryWasNew === true);

      if (isFirst && debounceOk(`first:${userKey}`, now, 30000)) {
        moments.push(
          buildMoment("first_support", {
            title: "FIRST SUPPORT",
            subtext: `${name} · ${giftName}`,
            count: 1,
            meta: { userKey, giftName, miaPoints }
          })
        );
      }

      // --- solo_combo ---
      const soloRecent = recentGifts.filter(
        (g) => g.userKey === userKey && now - g.at <= soloWindowMs
      );
      if (soloRecent.length >= soloMin && debounceOk(`solo:${userKey}`, now, 7000)) {
        const totalPts = soloRecent.reduce((s, g) => s + g.miaPoints, 0);
        moments.push(
          buildMoment("solo_combo", {
            title: `SOLO COMBO ×${soloRecent.length}`,
            subtext: `${name} · ${Math.round(totalPts)} miaPoints`,
            count: soloRecent.length,
            meta: { userKey, giftCount: soloRecent.length, totalMiaPoints: totalPts }
          })
        );
      }

      // --- community_burst ---
      const burstRecent = recentGifts.filter((g) => now - g.at <= burstWindowMs);
      const users = new Set(burstRecent.map((g) => g.userKey));
      if (
        burstRecent.length >= burstMinGifts &&
        users.size >= burstMinUsers &&
        debounceOk("community_burst", now, 10000)
      ) {
        const totalPts = burstRecent.reduce((s, g) => s + g.miaPoints, 0);
        moments.push(
          buildMoment("community_burst", {
            title: "COMMUNITY BURST",
            subtext: `${users.size} lidí · ${burstRecent.length} dárků · ${Math.round(totalPts)} miaPoints`,
            count: burstRecent.length,
            meta: {
              userCount: users.size,
              giftCount: burstRecent.length,
              totalMiaPoints: totalPts
            }
          })
        );
      }

      // --- bowl_rush ---
      const bowlPercent = toNumber(ctx.bowlPercent, NaN);
      if (Number.isFinite(bowlPercent)) {
        bowlSamples.push({ at: now, bowl: bowlPercent });
        const oldest = bowlSamples[0];
        const delta = bowlPercent - toNumber(oldest?.bowl, bowlPercent);
        const nearFull = bowlPercent >= 85;
        if (
          ((delta >= bowlRushDelta && bowlSamples.length >= 2) || nearFull) &&
          debounceOk("bowl_rush", now, 15000)
        ) {
          moments.push(
            buildMoment("bowl_rush", {
              title: nearFull ? "BOWL RUSH · FULL" : "BOWL RUSH",
              subtext: `Miska ${Math.round(bowlPercent)}%`,
              count: Math.round(bowlPercent),
              meta: { bowlPercent, delta, nearFull }
            })
          );
        }
      }
    }

    // Prefer strongest moment for single emit; keep all on .all
    moments.sort((a, b) => b.priority - a.priority);
    return {
      moment: moments[0] || null,
      all: moments
    };
  }

  function snapshot() {
    return {
      recentGiftCount: recentGifts.length,
      bowlSampleCount: bowlSamples.length
    };
  }

  function reset() {
    recentGifts = [];
    bowlSamples = [];
    lastEmitted.clear();
  }

  return { observe, snapshot, reset, isEnabled: isComboMomentsEnabled };
}

let sharedDetector = null;

function getSharedComboMomentDetector(options = {}) {
  if (!sharedDetector) {
    sharedDetector = createComboMomentDetector(options);
  }
  return sharedDetector;
}

function resetSharedComboMomentDetectorForTest() {
  if (sharedDetector) sharedDetector.reset();
  sharedDetector = null;
}

/**
 * Map moment → action-queue overlay shell (coins never included).
 */
function momentToQueueAction(moment = {}) {
  if (!moment || !moment.type) return null;
  return {
    type: "overlay",
    priority: toNumber(moment.priority, 50) + 30,
    coalesceKey: `combo:${moment.type}`,
    payload: {
      overlayPayload: {
        kind: moment.kind,
        title: moment.title,
        subtext: moment.subtext,
        count: moment.count,
        accent: moment.accent,
        glow: moment.glow,
        holdMs: moment.holdMs,
        meta: moment.meta || {},
        source: "phase2_combo_moments"
      },
      comboMoment: moment
    }
  };
}

module.exports = {
  isComboMomentsEnabled,
  createComboMomentDetector,
  getSharedComboMomentDetector,
  resetSharedComboMomentDetectorForTest,
  momentToQueueAction,
  DEFAULT_SOLO_WINDOW_MS,
  DEFAULT_BURST_WINDOW_MS
};
