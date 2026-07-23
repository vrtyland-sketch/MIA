"use strict";

/**
 * Centrální registr HTTP route balíčků MIA.
 * Každý balíček: registerXxxRoutes(app, ctx) → { ok, routes[] }
 */

const { mergeRoutes } = require("./_helpers");
const { registerHealthRoutes } = require("./health");
const { registerIngestRoutes } = require("./ingest");
const { registerMediaRoutes } = require("./media");
const { registerSceneRoutes } = require("./scene");
const { registerObsRoutes } = require("./obs");
const { registerVideoRoutes } = require("./video");
const { registerOverlayRoutes } = require("./overlay");
const { registerSystemRoutes } = require("./system");
const { registerArenaRoutes } = require("./arena");
const { registerTtsRoutes } = require("./tts");
const { registerRemoteFoldRoutes } = require("./remote_fold");
const { registerDebugRoutes } = require("./debug");
const { registerVoiceRoutes } = require("./voice");
const { registerSoloStreamRoutes } = require("./solo_stream");
const { registerEyesRoutes } = require("./eyes");
const { registerKojRoutes } = require("./koj");
const { registerRemoteDevRoutes } = require("./remote_dev");
const { registerStreamSessionRoutes } = require("./stream_session");
const { registerStatusRoutes } = require("./status");
const { registerAdminRoutes } = require("./admin");

let registerMiaPaintRoutes = null;
try {
  registerMiaPaintRoutes = require("./mia_paint").registerMiaPaintRoutes;
} catch (_err) {
  /* optional */
}

let registerGiftAnimationRoutes = null;
try {
  registerGiftAnimationRoutes = require("./gift_animation").registerGiftAnimationRoutes;
} catch (_err) {
  /* optional */
}

function registerAllRoutes(app, ctx = {}) {
  const results = [];

  results.push(registerHealthRoutes(app, ctx.health || ctx));
  results.push(registerIngestRoutes(app, ctx.ingest || ctx));
  results.push(registerOverlayRoutes(app, ctx.overlay || ctx));
  results.push(registerMediaRoutes(app, ctx.media || ctx));
  results.push(registerVideoRoutes(app, ctx.video || ctx));
  results.push(registerObsRoutes(app, ctx.obs || ctx));
  results.push(registerSceneRoutes(app, ctx.scene || ctx));
  results.push(registerSystemRoutes(app, ctx.system || ctx));
  results.push(registerArenaRoutes(app, ctx.arena || ctx));
  results.push(registerTtsRoutes(app, ctx.tts || ctx));
  results.push(registerRemoteFoldRoutes(app, ctx.remoteFold || ctx));
  results.push(registerDebugRoutes(app, ctx.debug || ctx));
  results.push(registerVoiceRoutes(app, ctx.voice || ctx));
  results.push(registerSoloStreamRoutes(app, ctx.soloStream || ctx));
  results.push(registerEyesRoutes(app, ctx.eyes || ctx));
  results.push(registerKojRoutes(app, ctx.koj || ctx));

  if (typeof registerRemoteDevRoutes === "function") {
    results.push(registerRemoteDevRoutes(app, ctx.remoteDev || ctx));
  }
  if (typeof registerMiaPaintRoutes === "function") {
    results.push(registerMiaPaintRoutes(app, ctx.paint || ctx));
  }
  if (typeof registerGiftAnimationRoutes === "function") {
    results.push(registerGiftAnimationRoutes(app, ctx.giftAnimation || ctx));
  }
  if (typeof registerStreamSessionRoutes === "function") {
    results.push(registerStreamSessionRoutes(app, ctx.streamSession || ctx));
  }
  if (typeof registerStatusRoutes === "function") {
    results.push(registerStatusRoutes(app, ctx.status || ctx));
  }
  if (typeof registerAdminRoutes === "function") {
    results.push(registerAdminRoutes(app, ctx.admin || ctx));
  }

  const failed = results.filter((row) => row && row.ok === false);
  return {
    ok: failed.length === 0,
    packageCount: results.length,
    routeCount: mergeRoutes(...results).length,
    routes: mergeRoutes(...results),
    packages: results.map((row, index) => ({
      index,
      ok: row?.ok !== false,
      error: row?.error || null,
      routes: row?.routes || []
    })),
    errors: failed.map((row) => row.error).filter(Boolean)
  };
}

module.exports = {
  registerAllRoutes,
  registerHealthRoutes,
  registerIngestRoutes,
  registerMediaRoutes,
  registerSceneRoutes,
  registerObsRoutes,
  registerVideoRoutes,
  registerOverlayRoutes,
  registerSystemRoutes,
  registerArenaRoutes,
  registerTtsRoutes,
  registerRemoteFoldRoutes,
  registerDebugRoutes,
  registerVoiceRoutes,
  registerSoloStreamRoutes,
  registerEyesRoutes,
  registerKojRoutes,
  registerAdminRoutes
};
