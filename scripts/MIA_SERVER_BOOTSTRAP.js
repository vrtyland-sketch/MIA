"use strict";

/**
 * HTTP server bootstrap — listen, startup hooks, graceful shutdown.
 * Runtime wiring stays in index.js; this module only starts the process.
 */

function createMiaServerStarter(deps = {}) {
  const {
    app,
    PORT,
    BIND_HOST,
    portGuardModule,
    runtimeSecurityModule,
    overlayStaticDir,
    MIA_SPLIT_OVERLAYS,
    warnOnDeadObsSceneFiles,
    connectObs,
    selfRestartModule,
    emitStartupOverlay,
    miaPaintWs,
    miaPaintBridge,
    markStreamSessionEnded
  } = deps;

  async function startMiaServer() {
    if (typeof portGuardModule?.assertPortAvailableOrExit === "function") {
      await portGuardModule.assertPortAvailableOrExit(PORT);
    }

    const server = app.listen(PORT, BIND_HOST, async () => {
      console.log(`MIA RUNNING ${BIND_HOST}:${PORT}`);
      if (BIND_HOST === "0.0.0.0" || BIND_HOST === "::") {
        console.warn("[SECURITY] MIA listens on all interfaces — prefer MIA_BIND_HOST=127.0.0.1");
      }
      if (typeof runtimeSecurityModule?.resolveIngestSecret === "function") {
        const secret = runtimeSecurityModule.resolveIngestSecret();
        console.log(
          `[SECURITY] ingest auth: ${secret ? "secret header/query" : "localhost only"}`
        );
      }
      if (typeof runtimeSecurityModule?.isDebugRoutesEnabled === "function") {
        console.log(
          `[SECURITY] debug routes: ${runtimeSecurityModule.isDebugRoutesEnabled() ? "on" : "off (localhost only)"}`
        );
      }
      console.log(`[OVERLAYS] ${overlayStaticDir}`);
      const split = MIA_SPLIT_OVERLAYS();
      console.log(`[OBS URL] mode=split (5 zdroju — smaz duplicity, ne jen skryvej)`);
      console.log(`[OBS URL] speech  -> ${split.speech}  (1920x1080, bubliny)`);
      console.log(`[OBS URL] bowl    -> ${split.bowl}  (320x180, miska)`);
      console.log(`[OBS URL] runtime -> ${split.runtime}  (400x400, Koj sprite)`);
      console.log(`[OBS URL] voice   -> ${split.voice}  (200x80, TTS audio — Control audio ON)`);
      console.log(`[OBS URL] status  -> ${split.status}  (240x48, LIVE badge)`);
      console.log(`[OBS URL] story   -> ${split.storyMoment}  (960x540, příběh diváka)`);
      console.log(`[OBS URL] combo   -> ${split.combo}  (1920x1080, COMBO + spam bar)`);
      console.log(`[OBS URL] host    -> ${split.hostMode}  (1920x1080, NEJSEM TU panel)`);
      console.log(`[OBS URL] viewers -> ${split.viewerStrip}  (strip avatarů, volitelné)`);
      console.log(`[OBS URL] check   -> ${split.startupCheck}  (1920x1080, kontrola po restartu)`);
      console.log(`[OBS URL] dash    -> ${split.dashboard}  (streamer panel, ne pro OBS)`);
      console.log(`[OBS URL] hub     -> ${split.hub}  (legacy all-in-one, nedoporuceno)`);
      console.log(`[TIKFINITY] POST/GET -> http://127.0.0.1:${PORT}/ingest`);
      warnOnDeadObsSceneFiles();
      await connectObs();
      setTimeout(() => {
        if (
          typeof selfRestartModule?.isRestartPending === "function" &&
          selfRestartModule.isRestartPending()
        ) {
          console.log("[MIA] Startup slide přeskočen — čeká se na restart po OBS rukou.");
          return;
        }
        emitStartupOverlay().catch(() => {});
      }, 800);
    });

    if (typeof miaPaintWs?.attachPaintWebSocket === "function") {
      miaPaintWs.attachPaintWebSocket(server, { paintBridge: miaPaintBridge });
      console.log(`[MIA PAINT] ws -> ws://127.0.0.1:${PORT}/mia/paint/ws`);
    }

    server.on("error", (err) => {
      if (err && err.code === "EADDRINUSE") {
        if (typeof portGuardModule?.printPortInUseHelp === "function") {
          portGuardModule.printPortInUseHelp(PORT);
        } else {
          console.error(`[MIA] Port ${PORT} is already in use.`);
        }
        process.exit(1);
      }

      throw err;
    });

    let shuttingDown = false;
    const gracefulShutdown = (signal) => {
      if (shuttingDown) return;
      shuttingDown = true;
      markStreamSessionEnded(String(signal || "shutdown").toLowerCase());
      server.close(() => {
        process.exit(0);
      });
      setTimeout(() => process.exit(0), 1500).unref();
    };

    process.once("SIGINT", () => gracefulShutdown("sigint"));
    process.once("SIGTERM", () => gracefulShutdown("sigterm"));

    return server;
  }

  return { startMiaServer };
}

module.exports = { createMiaServerStarter };
