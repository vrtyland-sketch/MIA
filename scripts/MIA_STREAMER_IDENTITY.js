"use strict";

/**
 * Boss identita (streamer) — tvrdý zámek na konkrétní Kick účet.
 *
 * Cíl: citlivé příkazy (např. Koj test slide) smí spustit jen majitel streamu.
 * Jméno v chatu se dá napodobit, proto se zamykáme na STABILNÍ Kick userId.
 *
 * Pin se získá jedním ze dvou způsobů:
 *  1) Explicitně přes ENV / config (MIA_STREAMER_BOSS_KICK_ID) — nejsilnější.
 *  2) Trust-On-First-Use (TOFU): při prvním příkazu od uživatele, který projde
 *     jmenným bossem (resolveStreamerAccess) a má reálné userId, se identita
 *     uloží do data/streamer-identity.json a od té chvíle platí jen ona.
 *
 * Po napnutí pinu už jméno nestačí — musí sedět userId (a platforma).
 */

const fs = require("fs");
const path = require("path");

const { resolveStreamerAccess, normalizeUserKey } = require("./MIA_STREAMER_ACCESS");

const STORE_PATH = path.resolve(__dirname, "..", "data", "streamer-identity.json");

let cache = null;
let cacheLoaded = false;

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function normalizePlatform(value = "") {
  return safeString(value).toLowerCase();
}

function normalizeId(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function readStore() {
  if (cacheLoaded) return cache;
  cacheLoaded = true;
  try {
    if (fs.existsSync(STORE_PATH)) {
      const raw = fs.readFileSync(STORE_PATH, "utf8");
      const parsed = JSON.parse(raw);
      cache = parsed && typeof parsed === "object" ? parsed : null;
    } else {
      cache = null;
    }
  } catch (_err) {
    cache = null;
  }
  return cache;
}

function writeStore(identity) {
  cache = identity;
  cacheLoaded = true;
  try {
    fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true });
    fs.writeFileSync(STORE_PATH, JSON.stringify(identity, null, 2), "utf8");
    return true;
  } catch (_err) {
    return false;
  }
}

/** Pin z ENV/configu — má přednost před souborem. */
function pinFromConfig(runtimeConfig = {}) {
  const id = normalizeId(
    runtimeConfig?.stream?.bossKickUserId || process.env.MIA_STREAMER_BOSS_KICK_ID
  );
  if (!id) return null;
  return {
    source: "config",
    platform: normalizePlatform(
      runtimeConfig?.stream?.bossPlatform || process.env.MIA_STREAMER_BOSS_PLATFORM || "kick"
    ),
    userId: id,
    label: safeString(
      runtimeConfig?.stream?.bossLabel || process.env.MIA_STREAMER_BOSS_LABEL,
      "VasaSpinak"
    )
  };
}

/** Aktuálně napnutá boss identita (config má přednost před souborem). */
function getPinnedBoss(runtimeConfig = {}) {
  const fromConfig = pinFromConfig(runtimeConfig);
  if (fromConfig) return fromConfig;
  const stored = readStore();
  if (stored && normalizeId(stored.userId)) {
    return {
      source: "store",
      platform: normalizePlatform(stored.platform || "kick"),
      userId: normalizeId(stored.userId),
      label: safeString(stored.label, "VasaSpinak"),
      capturedAt: stored.capturedAt || null
    };
  }
  return null;
}

function extractIdentity(normalized = {}) {
  return {
    userId: normalizeId(
      normalized.userId ?? normalized.user?.userId ?? normalized.user_id
    ),
    platform: normalizePlatform(normalized.platform || "kick"),
    label: safeString(
      normalized.nickname ||
        normalized.user?.nickname ||
        normalized.username ||
        normalized.user?.username,
      "divák"
    )
  };
}

/**
 * Tvrdé ověření, zda je daný event od bosse.
 * Vrací { ok, reason, identity, pinned, captured }.
 */
function verifyBoss(normalized = {}, runtimeConfig = {}) {
  const identity = extractIdentity(normalized);
  const pinned = getPinnedBoss(runtimeConfig);

  if (pinned) {
    const platformOk =
      !pinned.platform ||
      !identity.platform ||
      pinned.platform === identity.platform ||
      identity.platform === "unknown";

    if (identity.userId && pinned.userId === identity.userId && platformOk) {
      return { ok: true, reason: "pinned_match", identity, pinned, captured: false };
    }
    return {
      ok: false,
      reason: identity.userId ? "not_pinned_boss" : "missing_user_id",
      identity,
      pinned,
      captured: false
    };
  }

  // Žádný pin → bootstrap přes jmenného bosse (TOFU).
  const access = resolveStreamerAccess(identity.label, runtimeConfig);
  if (!access.isStreamerBoss) {
    return { ok: false, reason: "not_streamer_name", identity, pinned: null, captured: false };
  }

  // Bez reálného userId nepustíme citlivý příkaz a hlavně nepinujeme placeholder.
  if (!identity.userId || normalizeUserKey(identity.userId) === "") {
    return { ok: false, reason: "no_stable_id_to_pin", identity, pinned: null, captured: false };
  }

  const record = {
    platform: identity.platform || "kick",
    userId: identity.userId,
    label: identity.label,
    capturedAt: Date.now()
  };
  const persisted = writeStore(record);

  return {
    ok: true,
    reason: "captured_first_use",
    identity,
    pinned: { source: "store", ...record },
    captured: true,
    persisted
  };
}

function getIdentitySnapshot(runtimeConfig = {}) {
  const pinned = getPinnedBoss(runtimeConfig);
  return {
    locked: Boolean(pinned),
    source: pinned?.source || null,
    platform: pinned?.platform || null,
    userId: pinned?.userId || null,
    label: pinned?.label || null,
    capturedAt: pinned?.capturedAt || null,
    storePath: STORE_PATH
  };
}

/** Reset pinu (jen pro admin/údržbu). Nepromaže config pin, jen soubor. */
function clearPinnedBoss() {
  cache = null;
  cacheLoaded = true;
  try {
    if (fs.existsSync(STORE_PATH)) fs.unlinkSync(STORE_PATH);
    return true;
  } catch (_err) {
    return false;
  }
}

module.exports = {
  STORE_PATH,
  verifyBoss,
  getPinnedBoss,
  getIdentitySnapshot,
  clearPinnedBoss
};
