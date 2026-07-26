"use strict";

/**
 * Phase 2–4 — MIA Control Center routes.
 * Pages: /admin, /mia-admin
 * API: /api/mia-admin/status, /api/mia-admin/test/*, profiles, export/import
 */

const path = require("path");
const { validateApp, safeString } = require("./_helpers");

const OVERLAY_DIR = path.join(__dirname, "..", "mia-output-overlay");
const ADMIN_HTML = path.join(OVERLAY_DIR, "mia-admin.html");

const TIER_COINS = Object.freeze({
  T1: 1,
  T2: 15,
  T3: 199,
  T4: 1000
});

function registerAdminRoutes(app, ctx = {}) {
  const check = validateApp(app);
  if (!check.ok) return check;

  const guard =
    typeof ctx.localAdminGuard === "function"
      ? ctx.localAdminGuard
      : typeof ctx.debugRouteGuard === "function"
        ? ctx.debugRouteGuard
        : (_req, _res, next) => next();

  function sendAdminPage(_req, res) {
    res.sendFile(ADMIN_HTML, (err) => {
      if (err) {
        res.status(404).json({ ok: false, error: "mia_admin_html_missing" });
      }
    });
  }

  app.get("/admin", guard, sendAdminPage);
  app.get("/mia-admin", guard, sendAdminPage);

  app.get("/api/mia-admin/status", guard, (_req, res) => {
    try {
      const payload =
        typeof ctx.buildAdminStatusPayload === "function"
          ? ctx.buildAdminStatusPayload()
          : buildDefaultAdminStatus(ctx);
      res.json(payload);
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.post("/api/mia-admin/test/gift", guard, async (req, res) => {
    try {
      const tier = safeString(req.body?.tier || req.query?.tier, "T1").toUpperCase();
      const coins = Number(req.body?.coins ?? TIER_COINS[tier] ?? 1);
      const giftName = safeString(
        req.body?.giftName || req.query?.giftName,
        tier === "T4" ? "Lion" : tier === "T3" ? "Universe" : "Rose"
      );
      const userLabel = safeString(
        req.body?.userLabel || req.query?.userLabel,
        "Admin Test"
      );

      if (typeof ctx.processEvent !== "function") {
        return res.status(503).json({ ok: false, error: "process_event_unavailable" });
      }

      const result = await ctx.processEvent({
        eventType: "gift",
        type: "gift",
        platform: "test",
        giftName,
        coins,
        coinValue: coins,
        count: Number(req.body?.count || 1),
        nickname: userLabel,
        displayName: userLabel,
        username: "admin_test",
        userId: safeString(req.body?.userId, `admin-test-${tier}`)
      });

      res.status(result?.status || 200).json({
        ok: true,
        tier,
        giftName,
        coinsInternalOnly: coins,
        note: "coins used for internal mapping only; overlay uses miaPoints",
        result: result?.body || result
      });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.post("/api/mia-admin/test/chat", guard, async (req, res) => {
    try {
      if (typeof ctx.processEvent !== "function") {
        return res.status(503).json({ ok: false, error: "process_event_unavailable" });
      }
      const message = safeString(req.body?.message || req.query?.message, "ahoj MIA");
      const userLabel = safeString(req.body?.userLabel, "Admin Chat");
      const result = await ctx.processEvent({
        eventType: "comment",
        type: "comment",
        platform: "test",
        message,
        content: message,
        nickname: userLabel,
        displayName: userLabel,
        username: "admin_chat"
      });
      res.status(result?.status || 200).json({ ok: true, result: result?.body || result });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.post("/api/mia-admin/test/bowl", guard, async (req, res) => {
    try {
      // Safe stub: fire a high-value gift that typically fills bowl impact — no direct state wipe.
      if (typeof ctx.processEvent !== "function") {
        return res.status(503).json({ ok: false, error: "process_event_unavailable" });
      }
      const result = await ctx.processEvent({
        eventType: "gift",
        type: "gift",
        platform: "test",
        giftName: safeString(req.body?.giftName, "Lion"),
        coins: Number(req.body?.coins || 1000),
        coinValue: Number(req.body?.coins || 1000),
        count: 1,
        nickname: safeString(req.body?.userLabel, "Bowl Stub"),
        displayName: safeString(req.body?.userLabel, "Bowl Stub"),
        username: "bowl_stub",
        userId: "admin-bowl-stub"
      });
      res.status(result?.status || 200).json({
        ok: true,
        stub: "full_bowl_gift",
        result: result?.body || result
      });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.post("/api/mia-admin/test/tech-form", guard, (req, res) => {
    try {
      const techForms = require("../core/tech-forms-runtime");
      const formId = safeString(req.body?.formId || req.query?.formId, "assistant");
      const getKoj =
        typeof ctx.getKojnozoutState === "function" ? ctx.getKojnozoutState : null;
      const setKoj =
        typeof ctx.setKojnozoutState === "function" ? ctx.setKojnozoutState : null;
      if (!getKoj) {
        return res.status(503).json({ ok: false, error: "koj_state_unavailable" });
      }
      let koj = getKoj();
      koj = techForms.unlockTechForm(koj, formId);
      const result = techForms.activateTechForm(koj, formId, {
        runtimeConfig: ctx.runtimeConfig || {},
        force: true,
        forceUnlock: true,
        miaPoints: Number(req.body?.miaPoints || 100),
        now: Date.now()
      });
      if (result.ok && setKoj) setKoj(result.state);
      else if (result.ok && ctx.refs?.kojnozoutState) {
        Object.assign(ctx.refs.kojnozoutState, result.state);
      }
      res.json({
        ok: result.ok,
        reason: result.reason,
        overlayHint: result.overlayHint || null,
        snapshot: techForms.getTechFormsPublicSnapshot(
          result.state || koj,
          ctx.runtimeConfig || {}
        ),
        note: "Requires MIA_TECH_FORMS=1 for live path; force=true on this admin stub"
      });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.post("/api/mia-admin/test/inventory", guard, (req, res) => {
    try {
      const inventory = require("../core/viewer-inventory");
      const itemId = safeString(req.body?.itemId || req.query?.itemId, "battle_token");
      const userId = safeString(req.body?.userId, "admin-test-user");
      const name = safeString(req.body?.userLabel || req.body?.name, "Admin Test");
      const granted = inventory.grantItem(
        { userId, name },
        itemId,
        { source: "admin", force: true, runtimeConfig: ctx.runtimeConfig || {} }
      );
      res.json({ ok: granted.ok, ...granted });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.post("/api/mia-admin/test/battle", guard, (req, res) => {
    try {
      if (typeof ctx.startArenaDuel !== "function" && typeof ctx.getArenaState !== "function") {
        // Prefer arena module via ctx helpers if present.
      }
      const arena = require("../scripts/MIA_PLATFORM_ARENA");
      let state =
        typeof ctx.getArenaState === "function"
          ? ctx.getArenaState()
          : arena.loadArenaState();
      const durationMs = Number(req.body?.durationMs || 120000);
      const skipPhases = req.body?.skipPhases === true;
      state = arena.startArenaDuel(state, { durationMs, skipPhases });
      if (typeof ctx.setArenaState === "function") ctx.setArenaState(state);
      else arena.saveArenaState(state);
      res.json({
        ok: true,
        duel: arena.getArenaSnapshot(state).duel,
        note: "POST /arena/duel/start also works; overlay: /arena-battle-overlay.html"
      });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // --- Phase 4: profiles + export/import ---
  app.get("/api/mia-admin/profiles", guard, (_req, res) => {
    try {
      const profiles = require("../core/streamer-profiles");
      res.json(profiles.listProfiles());
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.post("/api/mia-admin/profiles", guard, (req, res) => {
    try {
      const profiles = require("../core/streamer-profiles");
      const name = safeString(req.body?.name || req.query?.name, "");
      const result = profiles.saveProfile(name, {
        label: safeString(req.body?.label, name),
        runtimeConfig: ctx.runtimeConfig
      });
      if (!result.ok) return res.status(400).json(result);
      res.json(result);
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.post("/api/mia-admin/profiles/load", guard, (req, res) => {
    try {
      const profiles = require("../core/streamer-profiles");
      const name = safeString(req.body?.name || req.query?.name, "");
      const result = profiles.loadProfile(name);
      if (!result.ok) return res.status(404).json(result);
      res.json(result);
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.post("/api/mia-admin/profiles/delete", guard, (req, res) => {
    try {
      const profiles = require("../core/streamer-profiles");
      const name = safeString(req.body?.name || req.query?.name, "");
      const result = profiles.deleteProfile(name);
      if (!result.ok) return res.status(404).json(result);
      res.json(result);
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.get("/api/mia-admin/export", guard, (req, res) => {
    try {
      const bundleMod = require("../core/settings-bundle");
      const includeViewerMemory =
        req.query?.includeViewerMemory === "1" ||
        req.query?.includeViewerMemory === "true";
      const built = bundleMod.buildSettingsBundle({ includeViewerMemory });
      const filename = bundleMod.getExportFilename();
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.json(built.bundle);
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.post("/api/mia-admin/import", guard, (req, res) => {
    try {
      const bundleMod = require("../core/settings-bundle");
      const body = req.body || {};
      const raw = body.bundle && typeof body.bundle === "object" ? body.bundle : body;
      const includeViewerMemory = body.includeViewerMemory === true;
      const result = bundleMod.importSettingsBundle(raw, { includeViewerMemory });
      if (!result.ok) return res.status(400).json(result);
      res.json(result);
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.get("/api/mia-admin/theme", guard, (_req, res) => {
    try {
      const themeManager = require("../core/theme-manager");
      res.json({
        ok: true,
        ...themeManager.getThemeManagerPublicSnapshot(ctx.runtimeConfig || {}),
        overlayHint: themeManager.getOverlayThemeHint(ctx.runtimeConfig || {})
      });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.post("/api/mia-admin/theme", guard, (req, res) => {
    try {
      const themeManager = require("../core/theme-manager");
      const themeId = safeString(
        req.body?.themeId || req.body?.theme || req.query?.themeId,
        ""
      );
      const result = themeManager.setTheme(themeId);
      if (!result.ok) return res.status(400).json(result);
      const enabled = themeManager.isThemeManagerEnabled(ctx.runtimeConfig || {});
      res.json({
        ok: true,
        enabled,
        theme: result.theme,
        snapshot: themeManager.getThemeManagerPublicSnapshot(ctx.runtimeConfig || {}),
        overlayHint: themeManager.getOverlayThemeHint(ctx.runtimeConfig || {}),
        note: enabled
          ? "Theme applied — overlays poll /overlay-state.theme"
          : "Theme saved; set MIA_THEME_MANAGER=1 for overlay CSS apply"
      });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.get("/api/mia-admin/action-queue", guard, (_req, res) => {
    try {
      const aq = require("../core/action-queue");
      res.json({
        ok: true,
        ...aq.getActionQueuePublicSnapshot(ctx.runtimeConfig || {})
      });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.post("/api/mia-admin/action-queue", guard, (req, res) => {
    try {
      const aq = require("../core/action-queue");
      const body = req.body || {};
      const runtime = ctx.runtimeConfig || {};

      if (body.flush === true || body.action === "flush") {
        const flushed = aq.flushSharedActionQueue();
        return res.json({
          ok: true,
          ...flushed,
          ...aq.getActionQueuePublicSnapshot(runtime)
        });
      }

      if (typeof body.enabled === "boolean") {
        const result = aq.setActionQueueEnabled(body.enabled, runtime);
        return res.json({
          ...result,
          ...aq.getActionQueuePublicSnapshot(runtime)
        });
      }

      if (body.action === "enable") {
        const result = aq.setActionQueueEnabled(true, runtime);
        return res.json({
          ...result,
          ...aq.getActionQueuePublicSnapshot(runtime)
        });
      }

      if (body.action === "disable") {
        const result = aq.setActionQueueEnabled(false, runtime);
        return res.json({
          ...result,
          ...aq.getActionQueuePublicSnapshot(runtime)
        });
      }

      return res.status(400).json({
        ok: false,
        error: "expected { enabled: boolean } or { flush: true }",
        ...aq.getActionQueuePublicSnapshot(runtime)
      });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  return {
    ok: true,
    routes: [
      "GET /admin",
      "GET /mia-admin",
      "GET /api/mia-admin/status",
      "POST /api/mia-admin/test/gift",
      "POST /api/mia-admin/test/chat",
      "POST /api/mia-admin/test/bowl",
      "POST /api/mia-admin/test/tech-form",
      "POST /api/mia-admin/test/inventory",
      "POST /api/mia-admin/test/battle",
      "GET /api/mia-admin/profiles",
      "POST /api/mia-admin/profiles",
      "POST /api/mia-admin/profiles/load",
      "POST /api/mia-admin/profiles/delete",
      "GET /api/mia-admin/export",
      "POST /api/mia-admin/import",
      "GET /api/mia-admin/theme",
      "POST /api/mia-admin/theme",
      "GET /api/mia-admin/action-queue",
      "POST /api/mia-admin/action-queue"
    ]
  };
}

function buildDefaultAdminStatus(ctx = {}) {
  const health =
    typeof ctx.buildHealthPayload === "function" ? ctx.buildHealthPayload() : null;
  const status =
    typeof ctx.buildMiaStatusResponse === "function"
      ? ctx.buildMiaStatusResponse()
      : null;

  let director = null;
  let actionQueue = null;
  let viewerMemory = null;
  let kojNeeds = null;
  let techForms = null;
  let inventory = null;
  let battle = null;
  let profiles = null;
  let userMode = null;
  let themeManager = null;

  try {
    const miaDirector = require("../core/mia-director");
    director = {
      enabled: miaDirector.isDirectorEnabled(ctx.runtimeConfig || {})
    };
  } catch (_err) {
    director = { enabled: false };
  }
  try {
    const aq = require("../core/action-queue");
    actionQueue = aq.getActionQueuePublicSnapshot(ctx.runtimeConfig || {});
  } catch (_err) {
    actionQueue = null;
  }
  try {
    const vm = require("../core/viewer-memory");
    viewerMemory = vm.getSnapshot(8);
  } catch (_err) {
    viewerMemory = null;
  }
  try {
    const longTerm = require("../core/koj-long-term-needs");
    const koj =
      typeof ctx.getKojnozoutState === "function"
        ? ctx.getKojnozoutState()
        : ctx.refs?.kojnozoutState || null;
    if (koj) kojNeeds = longTerm.getLongTermNeedsSnapshot(koj);
  } catch (_err) {
    kojNeeds = null;
  }
  try {
    const tf = require("../core/tech-forms-runtime");
    const koj =
      typeof ctx.getKojnozoutState === "function"
        ? ctx.getKojnozoutState()
        : ctx.refs?.kojnozoutState || {};
    techForms = tf.getTechFormsPublicSnapshot(koj, ctx.runtimeConfig || {});
  } catch (_err) {
    techForms = null;
  }
  try {
    const inv = require("../core/viewer-inventory");
    inventory = inv.getInventorySnapshot(6);
  } catch (_err) {
    inventory = null;
  }
  try {
    const arena = require("../scripts/MIA_PLATFORM_ARENA");
    const state =
      typeof ctx.getArenaState === "function"
        ? ctx.getArenaState()
        : arena.loadArenaState();
    battle = {
      mvpEnabled: arena.isBattleMvpEnabled(),
      duel: arena.getArenaSnapshot(state).duel
    };
  } catch (_err) {
    battle = null;
  }
  try {
    const sp = require("../core/streamer-profiles");
    profiles = sp.getProfilesPublicSnapshot();
  } catch (_err) {
    profiles = null;
  }
  try {
    const um = require("../core/user-mode");
    userMode = um.getUserModePublicSnapshot(ctx.runtimeConfig || {});
  } catch (_err) {
    userMode = { enabled: false, stub: true, multiTenant: false };
  }
  try {
    const tm = require("../core/theme-manager");
    themeManager = tm.getThemeManagerPublicSnapshot(ctx.runtimeConfig || {});
  } catch (_err) {
    themeManager = { enabled: false, active: "cyber", themes: [] };
  }

  let engine2 = undefined;
  try {
    const { buildEngine2AdminSnapshot } = require("../engine2/wiring");
    engine2 = buildEngine2AdminSnapshot(ctx);
  } catch (_err) {
    engine2 = undefined;
  }

  return {
    ok: true,
    service: "MIA",
    phase: 4,
    controlCenter: true,
    engine2,
    director,
    actionQueue,
    viewerMemory,
    kojNeeds,
    techForms,
    inventory,
    battle,
    profiles,
    userMode,
    themeManager,
    health: health || null,
    status: status
      ? {
          ok: status.ok !== false,
          streamSession: status.streamSession || null,
          spamWave: status.spamWave || null
        }
      : null,
    links: {
      health: "/health",
      status: "/status",
      dashboard: "/mia-streamer-dashboard.html",
      admin: "/mia-admin",
      arenaBattle: "/arena-battle-overlay.html",
      export: "/api/mia-admin/export",
      profiles: "/api/mia-admin/profiles"
    }
  };
}

module.exports = {
  registerAdminRoutes,
  buildDefaultAdminStatus,
  TIER_COINS
};
