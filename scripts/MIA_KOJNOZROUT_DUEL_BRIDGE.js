"use strict";

/**
 * Cross-stream duel sync — propojení dvou MIA instancí přes HTTP.
 *
 * Stream A: GET /duel/export  →  POST peer /duel/opponent-sync
 * Stream B: totéž opačně
 */

const axios = require("axios");

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function normalizePeerUrl(url = "") {
  return safeString(url).replace(/\/+$/, "");
}

function buildPeerUrl(baseUrl, path) {
  return `${normalizePeerUrl(baseUrl)}${path.startsWith("/") ? path : `/${path}`}`;
}

async function fetchPeerExport(peerUrl, options = {}) {
  const timeout = Math.max(1000, Number(options.timeoutMs || 4000));
  const url = buildPeerUrl(peerUrl, "/duel/export");

  const response = await axios.get(url, {
    timeout,
    validateStatus: (status) => status >= 200 && status < 300
  });

  return response.data?.export || response.data || null;
}

async function pushLocalExportToPeer(peerUrl, localExport, options = {}) {
  const timeout = Math.max(1000, Number(options.timeoutMs || 4000));
  const url = buildPeerUrl(peerUrl, "/duel/opponent-sync");

  const response = await axios.post(
    url,
    { export: localExport, ...localExport },
    {
      timeout,
      validateStatus: (status) => status >= 200 && status < 300
    }
  );

  return response.data || { ok: true };
}

async function syncDuelWithPeer({
  peerUrl,
  duelState,
  exportLocalSide,
  syncOpponentFromPeer,
  timeoutMs = 4000
} = {}) {
  const base = normalizePeerUrl(peerUrl);
  if (!base) {
    return { ok: false, reason: "peer_url_missing" };
  }
  if (!duelState?.active) {
    return { ok: false, reason: "duel_not_active" };
  }
  if (typeof exportLocalSide !== "function" || typeof syncOpponentFromPeer !== "function") {
    return { ok: false, reason: "duel_module_missing" };
  }

  const localExport = exportLocalSide(duelState);
  let pulled = null;
  let pushed = null;
  let nextState = duelState;

  try {
    pulled = await fetchPeerExport(base, { timeoutMs });
    if (pulled && pulled.duelActive !== false) {
      const syncResult = syncOpponentFromPeer(nextState, pulled);
      if (syncResult?.state) nextState = syncResult.state;
    }
  } catch (err) {
    return {
      ok: false,
      reason: "peer_pull_failed",
      error: err.message,
      localExport
    };
  }

  try {
    pushed = await pushLocalExportToPeer(base, localExport, { timeoutMs });
  } catch (err) {
    return {
      ok: false,
      reason: "peer_push_failed",
      error: err.message,
      localExport,
      pulled
    };
  }

  return {
    ok: true,
    localExport,
    pulled,
    pushed,
    state: nextState
  };
}

module.exports = {
  normalizePeerUrl,
  fetchPeerExport,
  pushLocalExportToPeer,
  syncDuelWithPeer
};
