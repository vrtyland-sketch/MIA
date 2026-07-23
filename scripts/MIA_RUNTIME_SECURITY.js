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

function normalizeClientIp(req = {}) {
  const raw =
    safeString(req.headers["x-forwarded-for"]).split(",")[0] ||
    req.ip ||
    req.socket?.remoteAddress ||
    "";

  return raw.replace(/^::ffff:/, "");
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

function validateLocalAdmin(req = {}) {
  if (isLocalRequest(req)) {
    return { ok: true, mode: "localhost" };
  }

  const configuredSecret = resolveIngestSecret();
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
  if (isDebugRoutesEnabled()) {
    return true;
  }
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
    return res.status(404).json({
      ok: false,
      error: "debug_routes_disabled",
      message: "Debug routes are disabled (MIA_DEBUG_ROUTES=off)"
    });
  };
}

function createLocalAdminGuard() {
  return (req, res, next) => {
    const auth = validateLocalAdmin(req);
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
  normalizeClientIp,
  isLocalRequest,
  isDebugRoutesEnabled,
  validateIngestAuth,
  validateLocalAdmin,
  isDebugRouteAllowed,
  createDebugRouteGuard,
  createLocalAdminGuard,
  createIngestAuthGuard
};
