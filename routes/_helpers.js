"use strict";

function validateApp(app) {
  if (!app || typeof app.get !== "function" || typeof app.post !== "function") {
    return { ok: false, error: "invalid_app" };
  }
  return { ok: true };
}

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function mergeRoutes(...results) {
  const routes = [];
  for (const row of results) {
    if (Array.isArray(row?.routes)) routes.push(...row.routes);
  }
  return routes;
}

module.exports = {
  validateApp,
  safeString,
  mergeRoutes
};
