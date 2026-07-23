"use strict";

const net = require("net");
const { execSync } = require("child_process");
const path = require("path");

/**
 * OBS WebSocket connection lifecycle — connect, reconnect, health, maintenance.
 * Stav drží `state` objekt sdílený s index.js: { obs, obsConnected, connectingPromise, reconnectTimer, lastFailLogAt }
 */

function resolveObsWsEndpoint(runtimeConfig = {}) {
  const raw = runtimeConfig?.obs?.url || "ws://127.0.0.1:4455";
  try {
    const parsed = new URL(raw);
    return {
      host: parsed.hostname || "127.0.0.1",
      port: Number(parsed.port || 4455)
    };
  } catch (_err) {
    return { host: "127.0.0.1", port: 4455 };
  }
}

function probeTcpPort(host, port, timeoutMs = 900) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let settled = false;

    const finish = (open) => {
      if (settled) return;
      settled = true;
      try {
        socket.destroy();
      } catch (_destroyErr) {
        // ignore
      }
      resolve(open);
    };

    socket.setTimeout(timeoutMs);
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));
    socket.connect(port, host);
  });
}

function detectObsProcessRunning() {
  if (process.platform !== "win32") return false;

  try {
    const out = execSync('tasklist /FI "IMAGENAME eq obs64.exe" /NH', {
      encoding: "utf8",
      windowsHide: true,
      timeout: 3000
    });
    return /obs64\.exe/i.test(out);
  } catch (_err) {
    return false;
  }
}

function createObsBootstrap(deps = {}) {
  const {
    state,
    OBSWebSocket,
    runtimeConfig,
    writeLog,
    port,
    getObsWatchdog,
    obsSceneGuardModule,
    onAfterConnect,
    onConnectionClosed,
    onMediaPlaybackEnded,
    maybeAutoLaunchObs: maybeAutoLaunchObsExternal,
    reconnectMs = 5000
  } = deps;

  if (!state || typeof state !== "object") {
    throw new Error("createObsBootstrap requires shared state object");
  }

  async function buildObsHealthSnapshot() {
    const { host, port: wsPort } = resolveObsWsEndpoint(runtimeConfig);
    const [portOpen, processRunning] = await Promise.all([
      probeTcpPort(host, wsPort),
      Promise.resolve(detectObsProcessRunning())
    ]);

    let status = "unknown";
    let fix =
      "Spusť OBS Studio, Tools → WebSocket Server Settings → Enable, port 4455.";

    if (state.obsConnected) {
      status = "connected";
      fix = "OBS WebSocket je připojený — gift videa by měla fungovat.";
    } else if (processRunning && !portOpen) {
      status = "safe_mode_or_websocket_off";
      fix =
        "OBS běží, ale port 4455 neposlouchá. Po pádu OBS často startuje v Safe Mode — WebSocket plugin se nenačte a MIA nemůže přehrát gift videa. Zavři OBS úplně a spusť ho normálně (ne Safe Mode). Pak Tools → WebSocket Server Settings → Enable.";
    } else if (!processRunning && !portOpen) {
      status = "obs_not_running";
      fix =
        "OBS neběží. Spusť OBS Studio a zapni WebSocket server na portu 4455.";
    } else if (portOpen && !state.obsConnected) {
      status = "port_open_not_connected";
      fix =
        "Port 4455 je otevřený, ale MIA není připojená. Zkus /obs/reconnect a zkontroluj OBS_WS_PASSWORD v .env.";
    }

    return {
      processRunning,
      portOpen,
      host,
      port: wsPort,
      connected: state.obsConnected,
      status,
      fix,
      reconnectUrl: `http://127.0.0.1:${port}/obs/reconnect`,
      videoTestUrl: `http://127.0.0.1:${port}/video/test?tier=T1`
    };
  }

  function warnOnDeadObsSceneFiles() {
    try {
      if (typeof obsSceneGuardModule?.scanScenes !== "function") return;
      const result = obsSceneGuardModule.scanScenes();
      if (result && result.dead && result.dead.length > 0) {
        console.warn(
          `[OBS_SCENE_GUARD] ${result.dead.length} mrtvý(ch) zdroj(ů) ve scénách — OBS může při startu zobrazit blokující "Missing Files" dialog:`
        );
        for (const d of result.dead) {
          console.warn(`  · ${d.scene} / ${d.sourceName} → ${d.file}`);
        }
        writeLog("mia-errors", {
          source: "obs_scene_guard",
          deadCount: result.dead.length,
          dead: result.dead
        });
      }
    } catch (err) {
      console.warn("[OBS_SCENE_GUARD] chyba:", err && err.message);
    }
  }

  function maybeAutoLaunchObs() {
    if (typeof maybeAutoLaunchObsExternal === "function") {
      maybeAutoLaunchObsExternal();
      return;
    }
    try {
      const watchdog = typeof getObsWatchdog === "function" ? getObsWatchdog() : null;
      if (!watchdog) return;
      if (detectObsProcessRunning()) return;
      const result = watchdog.ensureRunning();
      if (result && result.action === "launched") {
        writeLog("mia-errors", {
          source: "obs_watchdog",
          action: "launched",
          detail: "OBS proces nebyl nalezen — watchdog spustil OBS"
        });
      }
    } catch (err) {
      console.warn("[OBS_WATCHDOG] chyba:", err && err.message);
    }
  }

  function scheduleObsReconnect() {
    if (state.reconnectTimer) return;
    state.reconnectTimer = setTimeout(() => {
      state.reconnectTimer = null;
      connectObs().catch(() => {});
    }, reconnectMs);
  }

  async function connectObs() {
    if (!OBSWebSocket) return;

    if (state.obsConnected && state.obs && typeof state.obs.call === "function") {
      try {
        await state.obs.call("GetVersion");
        return;
      } catch (_probeErr) {
        state.obsConnected = false;
        state.obs = null;
      }
    }

    if (state.obs && typeof state.obs.disconnect === "function") {
      try {
        await state.obs.disconnect();
      } catch (_disconnectErr) {
        // ignore stale socket cleanup
      }
      state.obs = null;
      state.obsConnected = false;
    }

    try {
      state.obs = new OBSWebSocket();

      await state.obs.connect(
        runtimeConfig?.obs?.url || "ws://127.0.0.1:4455",
        runtimeConfig?.obs?.password || undefined
      );

      state.obsConnected = true;
      console.log("[OBS] connected", runtimeConfig?.obs?.url || "ws://127.0.0.1:4455");

      const watchdogOk = typeof getObsWatchdog === "function" ? getObsWatchdog() : null;
      if (watchdogOk && typeof watchdogOk.noteConnected === "function") {
        watchdogOk.noteConnected();
      }

      if (typeof state.obs.on === "function") {
        state.obs.on("ConnectionClosed", () => {
          state.obsConnected = false;
          state.obs = null;
          if (typeof onConnectionClosed === "function") {
            onConnectionClosed();
          }
          console.warn("[OBS] disconnected — reconnect za pár sekund");
          scheduleObsReconnect();
        });

        state.obs.on("MediaInputPlaybackEnded", (event) => {
          try {
            if (typeof onMediaPlaybackEnded === "function") {
              onMediaPlaybackEnded(event);
            }
          } catch (err) {
            console.error("[VIDEO_ENDED_HOOK_FAILED]", err.message);
          }
        });
      }

      if (typeof onAfterConnect === "function") {
        void onAfterConnect().catch((err) => {
          writeLog("mia-errors", { source: "obs_bootstrap", error: err.message });
        });
      }
    } catch (err) {
      state.obsConnected = false;
      state.obs = null;
      const now = Date.now();
      if (now - (state.lastFailLogAt || 0) > 30000) {
        state.lastFailLogAt = now;
        const obsRunning = detectObsProcessRunning();
        const { port: wsPort } = resolveObsWsEndpoint(runtimeConfig);
        const portOpen = await probeTcpPort("127.0.0.1", wsPort);
        const hint =
          obsRunning && !portOpen
            ? "[OBS] běží v Safe Mode nebo je WebSocket vypnutý — zavři OBS a spusť normálně (port 4455)."
            : "[OBS] nepřipojeno — spusť OBS a zapni WebSocket server (port 4455).";
        console.warn(hint, err.message);
      }
      maybeAutoLaunchObs();
      scheduleObsReconnect();
    }
  }

  async function ensureObsConnected(trigger = "obs") {
    if (state.obsConnected && state.obs && typeof state.obs.call === "function") {
      return { ok: true, obsConnected: true, reused: true, trigger };
    }

    if (state.connectingPromise) {
      await state.connectingPromise;
      return {
        ok: state.obsConnected && state.obs && typeof state.obs.call === "function",
        obsConnected: state.obsConnected,
        reused: false,
        trigger
      };
    }

    state.connectingPromise = connectObs();

    try {
      await state.connectingPromise;
    } finally {
      state.connectingPromise = null;
    }

    return {
      ok: state.obsConnected && state.obs && typeof state.obs.call === "function",
      obsConnected: state.obsConnected,
      reused: false,
      trigger
    };
  }

  async function ensureObsConnectedWithRetry(
    trigger = "obs",
    maxWaitMs = 15000,
    pollMs = 2500
  ) {
    const startedAt = Date.now();
    const deadline = startedAt + Math.max(pollMs, Number(maxWaitMs) || 15000);
    let attempt = 0;
    let last = await ensureObsConnected(trigger);

    while (!last.ok && Date.now() < deadline) {
      attempt += 1;
      await new Promise((resolve) => setTimeout(resolve, pollMs));
      last = await ensureObsConnected(`${trigger}:retry_${attempt}`);
    }

    return {
      ...last,
      attempts: attempt + 1,
      waitedMs: Date.now() - startedAt
    };
  }

  async function forceReconnectObs(trigger = "manual") {
    state.obsConnected = false;

    if (state.obs && typeof state.obs.disconnect === "function") {
      try {
        await state.obs.disconnect();
      } catch (_err) {
        // ignore
      }
    }

    state.obs = null;

    if (state.reconnectTimer) {
      clearTimeout(state.reconnectTimer);
      state.reconnectTimer = null;
    }

    return ensureObsConnectedWithRetry(trigger, 12000, 1500);
  }

  function runObsMaintenanceScript(scriptName, rootDir) {
    const { spawnSync } = require("child_process");
    const scriptPath = path.join(rootDir || process.cwd(), "scripts", scriptName);
    return spawnSync(process.execPath, [scriptPath], {
      cwd: rootDir || process.cwd(),
      encoding: "utf8",
      timeout: 45000,
      windowsHide: true
    });
  }

  return {
    buildObsHealthSnapshot,
    warnOnDeadObsSceneFiles,
    maybeAutoLaunchObs,
    scheduleObsReconnect,
    connectObs,
    ensureObsConnected,
    ensureObsConnectedWithRetry,
    forceReconnectObs,
    runObsMaintenanceScript,
    resolveObsWsEndpoint,
    probeTcpPort,
    detectObsProcessRunning
  };
}

module.exports = {
  createObsBootstrap,
  resolveObsWsEndpoint,
  probeTcpPort,
  detectObsProcessRunning
};
