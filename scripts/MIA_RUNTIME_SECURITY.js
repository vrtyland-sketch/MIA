"use strict";

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function envFlag(name, fallback = "on") {
  const raw = safeString(process.env[name], fallback).toLowerCase();
  return raw !== "off" && raw !== "0" && raw !== "false";
}

function resolveBindHost(fallback = "127.0.0.1") {
  const host = safeString(process.env.MIA_BIND_HOST, fallback);
  if (host === "0.0.0.0" || host === "::") {
    return host;
  }
  return host || fallback;
}

function resolveIngestSecret() {
  return safeString(process.env.MIA_INGEST_SECRET);
}

function resolveDuelPeerSecret() {
  return safeString(process.env.MIA_DUEL_PEER_SECRET);
}

function stripMappedIpv4(value) {
  return safeString(value).replace(/^::ffff:/i, "");
}

function socketPeerIp(req = {}) {
  const socket = req.socket || req.connection;
  if (!socket || typeof socket !== "object") return "";
  return stripMappedIpv4(socket.remoteAddress);
}

function normalizeClientIp(req = {}) {
  // Auth identity is the TCP peer. A client-supplied X-Forwarded-For, and
  // Express req.ip when trust proxy copies that header, must not grant localhost.
  const peer = socketPeerIp(req);
  if (peer) return peer;
  return stripMappedIpv4(req.ip);
}

function isLocalRequest(req = {}) {
  const ip = normalizeClientIp(req);
  return ip === "127.0.0.1" || ip === "::1" || ip === "localhost";
}

function isDebugRoutesEnabled() {
  return envFlag("MIA_DEBUG_ROUTES", "on");
}

function extractIngestSecret(req = {}) {
  const header =
    req.headers["x-mia-ingest-secret"] ||
    req.headers["x-ingest-secret"] ||
    req.headers["authorization"];

  if (header && safeString(String(header)).toLowerCase().startsWith("bearer ")) {
    return safeString(String(header).slice(7));
  }

  const query = req.query || {};
  const body = req.body && typeof req.body === "object" ? req.body : {};
  return safeString(
    query.mia_secret || query.ingest_secret || query.secret || body.mia_secret || body.secret || header
  );
}

function validateIngestAuth(req = {}) {
  const configuredSecret = resolveIngestSecret();
  const local = isLocalRequest(req);

  // TikFinity na stejném PC: localhost vždy OK (secret jen pro vzdálený ingest / Fold).
  // Vypnout: MIA_INGEST_LOCALHOST_OPEN=off
  const localhostOpen = envFlag("MIA_INGEST_LOCALHOST_OPEN", "on");
  if (local && localhostOpen) {
    return { ok: true, mode: "localhost" };
  }

  if (configuredSecret) {
    const provided = extractIngestSecret(req);
    if (provided !== configuredSecret) {
      return {
        ok: false,
        status: 401,
        error: "unauthorized_ingest",
        message: "Invalid or missing MIA ingest secret"
      };
    }
    return { ok: true, mode: "secret" };
  }

  if (!local) {
    return {
      ok: false,
      status: 403,
      error: "ingest_localhost_only",
      message: "Ingest accepts localhost only unless MIA_INGEST_SECRET is set"
    };
  }

  return { ok: true, mode: "localhost" };
}

function validateLocalAdmin(req = {}, options = {}) {
  if (isLocalRequest(req)) {
    return { ok: true, mode: "localhost" };
  }

  const configuredSecret =
    typeof options.resolveIngestSecret === "function"
      ? safeString(options.resolveIngestSecret())
      : resolveIngestSecret();
  if (configuredSecret && extractIngestSecret(req) === configuredSecret) {
    return { ok: true, mode: "secret" };
  }

  return {
    ok: false,
    status: 403,
    error: "local_admin_only",
    message: "This endpoint is restricted to localhost or ingest secret"
  };
}

function isDebugRouteAllowed(req = {}) {
  if (isLocalRequest(req)) {
    return true;
  }
  const configuredSecret = resolveIngestSecret();
  if (configuredSecret && extractIngestSecret(req) === configuredSecret) {
    return true;
  }
  return false;
}

function createDebugRouteGuard() {
  return (req, res, next) => {
    if (isDebugRouteAllowed(req)) {
      return next();
    }
    if (!isDebugRoutesEnabled()) {
      return res.status(404).json({
        ok: false,
        error: "debug_routes_disabled",
        message: "Debug routes are disabled (MIA_DEBUG_ROUTES=off)"
      });
    }
    return res.status(401).json({
      ok: false,
      error: "debug_routes_unauthorized",
      message: "Debug routes require localhost or ingest secret"
    });
  };
}

function extractDuelPeerSecret(req = {}) {
  return safeString(req.headers?.["x-mia-duel-peer"]);
}

function validateDuelPeer(req = {}, options = {}) {
  const configured =
    typeof options.resolvePeerSecret === "function"
      ? safeString(options.resolvePeerSecret())
      : resolveDuelPeerSecret();
  if (!configured) {
    return { ok: false };
  }
  const provided = extractDuelPeerSecret(req);
  if (provided && provided === configured) {
    return { ok: true, mode: "duel_peer" };
  }
  return { ok: false };
}

function createLocalAdminGuard(options = {}) {
  return (req, res, next) => {
    const auth = validateLocalAdmin(req, options);
    if (auth.ok) {
      return next();
    }
    return res.status(auth.status || 403).json({
      ok: false,
      error: auth.error,
      message: auth.message
    });
  };
}

function createDuelPeerGuard(options = {}) {
  return (req, res, next) => {
    const admin = validateLocalAdmin(req, options);
    if (admin.ok) {
      return next();
    }
    if (validateDuelPeer(req, options).ok) {
      return next();
    }
    return res.status(403).json({
      ok: false,
      error: "duel_peer_unauthorized",
      message: "Duel sync requires localhost, the local admin secret, or the duel peer credential"
    });
  };
}

function createIngestAuthGuard() {
  return (req, res, next) => {
    const auth = validateIngestAuth(req);
    if (auth.ok) {
      return next();
    }
    return res.status(auth.status || 403).json({
      ok: false,
      accepted: false,
      error: auth.error,
      message: auth.message
    });
  };
}

module.exports = {
  resolveBindHost,
  resolveIngestSecret,
  resolveDuelPeerSecret,
  extractDuelPeerSecret,
  validateDuelPeer,
  normalizeClientIp,
  isLocalRequest,
  isDebugRoutesEnabled,
  validateIngestAuth,
  validateLocalAdmin,
  isDebugRouteAllowed,
  createDebugRouteGuard,
  createLocalAdminGuard,
  createDuelPeerGuard,
  createIngestAuthGuard
};
