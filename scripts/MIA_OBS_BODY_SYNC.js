"use strict";

const { BODY_PARTS } = require("../shared/mia-graphics-studio/bodyPartsCatalog");

const BODY_PART_URL_KEYS = new Set(BODY_PARTS.map((row) => row.urlKey));

function resolveBodySyncMode(options = {}, env = process.env) {
  const raw = options.bodySync ?? options.bodySyncMode ?? env.MIA_OBS_BODY_SYNC ?? "none";
  const mode = String(raw).toLowerCase();
  if (mode === "0" || mode === "false" || mode === "off" || mode === "none") return "none";
  if (mode === "graphics" || mode === "studio") return "graphics";
  return "hybrid";
}

/**
 * Hands / stream-ready fix path — default hybrid (stejně jako npm run obs:apply-hands).
 * Explicit MIA_OBS_BODY_SYNC=off stále vypne body URL.
 */
function resolveHandsBodySyncMode(options = {}, env = process.env) {
  const raw = options.bodySync ?? options.bodySyncMode ?? env.MIA_OBS_BODY_SYNC;
  if (raw == null || String(raw).trim() === "") return "hybrid";
  return resolveBodySyncMode({ bodySync: raw }, env);
}

function applyBodySyncToSplitUrls(urls = {}, baseUrl = "http://127.0.0.1:3000", mode = "hybrid") {
  if (!urls || typeof urls !== "object" || mode === "none") return urls;
  const { buildBodyPartUrls } = require("../shared/mia-graphics-studio/bodyPartsCatalog");
  const syncOpts = mode === "graphics" ? { syncGraphics: true } : { syncHybrid: true };
  return {
    ...urls,
    ...buildBodyPartUrls(String(baseUrl).replace(/\/$/, ""), syncOpts)
  };
}

function withHandsBodySyncUrls(urls = {}, baseUrl = "http://127.0.0.1:3000", options = {}, env = process.env) {
  const mode = resolveHandsBodySyncMode(options, env);
  return {
    urls: applyBodySyncToSplitUrls(urls, baseUrl, mode),
    bodySyncMode: mode
  };
}

module.exports = {
  BODY_PART_URL_KEYS,
  resolveBodySyncMode,
  resolveHandsBodySyncMode,
  applyBodySyncToSplitUrls,
  withHandsBodySyncUrls
};
