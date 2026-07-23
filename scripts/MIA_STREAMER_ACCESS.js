"use strict";

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function normalizeUserKey(value = "") {
  return safeString(value)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

function parseStreamerLabels(runtimeConfig = {}) {
  const fromConfig = safeString(runtimeConfig?.stream?.streamerUserLabels);
  const fromEnv = safeString(process.env.MIA_STREAMER_USER_LABELS);
  const raw = fromConfig || fromEnv || "VasaSpinak,Spinak,Spinyak,Spinaku";

  return raw
    .split(/[,;|]+/)
    .map((item) => normalizeUserKey(item))
    .filter(Boolean);
}

function resolveStreamerAccess(userLabel = "", runtimeConfig = {}) {
  const userKey = normalizeUserKey(userLabel);
  const labels = parseStreamerLabels(runtimeConfig);
  const streamerName = safeString(
    runtimeConfig?.llm?.streamerName ||
      runtimeConfig?.stream?.streamerName ||
      process.env.MIA_STREAMER_NAME,
    "streamer"
  );

  const isStreamerBoss =
    Boolean(userKey) &&
    (labels.includes(userKey) ||
      userKey.includes("spinak") ||
      userKey.includes("spinyak"));

  return {
    userKey,
    streamerName,
    isStreamerBoss,
    bypassEvents: runtimeConfig?.stream?.streamerBypassEvents !== false,
    bypassLlmRateLimit: isStreamerBoss,
    bypassGiftGates: isStreamerBoss
  };
}

module.exports = {
  normalizeUserKey,
  parseStreamerLabels,
  resolveStreamerAccess
};
