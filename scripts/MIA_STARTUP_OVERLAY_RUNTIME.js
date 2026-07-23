"use strict";

const path = require("path");
const { spawn } = require("child_process");

/**
 * Startup check slide, preflight-on-start, and boot overlay voice.
 */

function createStartupOverlayRuntime(deps = {}) {
  const {
    writeLog,
    startupCheckModule,
    mediaCatalogModule,
    ttsEngine,
    runtimeConfig,
    kickBridgeModule,
    runtimeSecurityModule,
    getPort,
    getBindHost,
    getObsConnected,
    getObs,
    videoEngine,
    MIA_SPLIT_OVERLAYS,
    flashStartupCheckBrowserSource,
    executeOverlay,
    deliveryRuntime,
    mirrorSpeechOverlayFromVoice,
    invalidateOverlayStateCache,
    voiceHoldUntilTs,
    obsBrowserRefreshOnConnectEnabled,
    refreshObsMiaBrowserSources,
    projectRoot,
    preflightTestsModule
  } = deps;

  let lastStartupCheck = null;
  let lastPreflightReport = null;

  function resolveStartupCheckDurationMs() {
    const raw = Number(process.env.MIA_STARTUP_CHECK_MS || 120000);
    return Number.isFinite(raw) ? Math.max(60000, raw) : 120000;
  }

  function isPreflightOnStartEnabled() {
    const raw = String(process.env.MIA_PREFLIGHT_ON_START ?? "0").toLowerCase();
    return raw === "1" || raw === "on" || raw === "true";
  }

  function resolveStartupPreflightArgs() {
    const mode = String(process.env.MIA_PREFLIGHT_MODE || "fast").trim().toLowerCase();
    if (mode === "off" || mode === "0" || mode === "false") {
      return null;
    }
    if (mode === "full") {
      return ["--full"];
    }
    return ["--fast"];
  }

  function buildStartupCheckPayload() {
    if (typeof startupCheckModule?.buildStartupCheck !== "function") {
      return { ok: false, checks: [], warnings: ["startup_check_module_missing"] };
    }

    const port = typeof getPort === "function" ? getPort() : 3000;
    const bindHost = typeof getBindHost === "function" ? getBindHost() : "127.0.0.1";
    const obsConnected = typeof getObsConnected === "function" ? getObsConnected() : false;

    const catalog =
      typeof mediaCatalogModule?.loadCatalog === "function"
        ? mediaCatalogModule.loadCatalog()
        : null;

    const ttsCfg =
      ttsEngine && typeof ttsEngine.resolveConfig === "function"
        ? ttsEngine.resolveConfig(runtimeConfig)
        : null;

    const kickStatus =
      typeof kickBridgeModule?.getKickBridgeStatus === "function"
        ? kickBridgeModule.getKickBridgeStatus()
        : { connected: false };

    const splitOverlays =
      typeof MIA_SPLIT_OVERLAYS === "function" ? MIA_SPLIT_OVERLAYS() : {};

    const payload = startupCheckModule.buildStartupCheck({
      port,
      baseUrl: `http://127.0.0.1:${port}`,
      obsConnected,
      videoSnapshot:
        videoEngine && typeof videoEngine.getSnapshot === "function"
          ? videoEngine.getSnapshot()
          : {},
      mediaCatalog: catalog,
      ttsEnabled: Boolean(ttsCfg?.enabled),
      ttsSpeaker: ttsCfg?.speaker || "",
      preflight: isPreflightOnStartEnabled() ? lastPreflightReport : null,
      includePreflight: isPreflightOnStartEnabled(),
      kickBridgeEnabled: Boolean(runtimeConfig?.kick?.enabled),
      kickBridgeConnected: Boolean(kickStatus?.connected),
      bindHost,
      ingestSecretConfigured:
        typeof runtimeSecurityModule?.resolveIngestSecret === "function"
          ? Boolean(runtimeSecurityModule.resolveIngestSecret())
          : false,
      debugRoutesEnabled:
        typeof runtimeSecurityModule?.isDebugRoutesEnabled === "function"
          ? runtimeSecurityModule.isDebugRoutesEnabled()
          : true,
      startupSlideUrl: splitOverlays.startupCheck,
      diagnoseUrl: `http://127.0.0.1:${port}/diagnose`,
      videoTestUrl: `http://127.0.0.1:${port}/video/test?tier=T1`,
      mediaSummaryUrl: `http://127.0.0.1:${port}/media/catalog/summary`,
      slideDurationMs: resolveStartupCheckDurationMs()
    });

    lastStartupCheck = payload;
    return payload;
  }

  function logStartupCheck(payload = buildStartupCheckPayload()) {
    const pct = payload.readinessPercent ?? payload.summary?.readinessPercent ?? 0;
    const ready = payload.streamReady === true ? "READY" : "NOT READY";
    console.log(`[STARTUP CHECK] ${pct}% · ${ready} · ${payload.streamReadyLabel || ""}`);
    for (const c of payload.checks || []) {
      console.log(`  ${c.ok ? "✓" : "✗"} ${c.label} — ${c.detail || c.status}`);
    }
    for (const w of payload.warnings || []) {
      console.log(`  ! ${w}`);
    }
    const splitOverlays =
      typeof MIA_SPLIT_OVERLAYS === "function" ? MIA_SPLIT_OVERLAYS() : {};
    console.log(`[STARTUP CHECK] slide -> ${splitOverlays.startupCheck}`);
  }

  function runPreflightTestsAsync() {
    return new Promise((resolve) => {
      if (!isPreflightOnStartEnabled()) {
        resolve(null);
        return;
      }

      const preflightArgs = resolveStartupPreflightArgs();
      if (!preflightArgs) {
        resolve(null);
        return;
      }

      lastPreflightReport = {
        running: true,
        mode: preflightArgs.includes("--fast") ? "fast" : "full",
        startedAt: new Date().toISOString(),
        passed: 0,
        failed: 0,
        total: 0,
        results: []
      };
      buildStartupCheckPayload();

      const root = projectRoot || path.resolve(__dirname, "..");
      const scriptPath = path.resolve(root, "scripts", "run_preflight_tests.js");
      const child = spawn(process.execPath, [scriptPath, ...preflightArgs], {
        cwd: root,
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true
      });

      let stdout = "";
      child.stdout.on("data", (chunk) => {
        stdout += String(chunk || "");
      });

      child.on("close", () => {
        try {
          const report = JSON.parse(stdout);
          lastPreflightReport = {
            ...report,
            running: false,
            finishedAt: report.finishedAt || new Date().toISOString()
          };
        } catch (err) {
          writeLog("mia-errors", {
            source: "preflight_tests",
            error: err.message,
            stdoutPreview: stdout.slice(-400)
          });
          lastPreflightReport = {
            ok: false,
            passed: 0,
            failed: 1,
            total: 1,
            results: [],
            finishedAt: new Date().toISOString(),
            running: false,
            durationMs: 0
          };
        }

        buildStartupCheckPayload();
        console.log(
          `[PREFLIGHT] ${lastPreflightReport.ok ? "OK" : "FAIL"} ${lastPreflightReport.passed}/${lastPreflightReport.total} (${lastPreflightReport.mode || "full"})`
        );

        if (!lastPreflightReport.ok) {
          writeLog("preflight-failed", {
            failed: lastPreflightReport.failed,
            passed: lastPreflightReport.passed,
            total: lastPreflightReport.total,
            suites: (lastPreflightReport.results || [])
              .filter((row) => !row.ok)
              .map((row) => row.name)
          });
        }

        resolve(lastPreflightReport);
      });

      child.on("error", (err) => {
        writeLog("mia-errors", { source: "preflight_tests_spawn", error: err.message });
        lastPreflightReport = {
          ok: false,
          passed: 0,
          failed: 1,
          total: 1,
          results: [],
          finishedAt: new Date().toISOString(),
          running: false,
          durationMs: 0
        };
        buildStartupCheckPayload();
        resolve(lastPreflightReport);
      });
    });
  }

  async function refreshStartupCheckBrowserSources() {
    const obsConnected = typeof getObsConnected === "function" ? getObsConnected() : false;
    const obs = typeof getObs === "function" ? getObs() : null;

    if (!obsConnected || !obs || typeof obs.call !== "function") {
      return { ok: false, reason: "obs_not_connected", refreshed: [] };
    }

    const refreshed = [];

    try {
      const scenesResp = await obs.call("GetSceneList");
      for (const sceneName of scenesResp?.scenes?.map((s) => s.sceneName) || []) {
        const listResp = await obs.call("GetSceneItemList", { sceneName });
        for (const item of listResp?.sceneItems || []) {
          const sourceName = String(item?.sourceName || "");
          let url = "";
          try {
            const settingsResp = await obs.call("GetInputSettings", { inputName: sourceName });
            url = String(settingsResp?.inputSettings?.url || "");
          } catch (_err) {
            continue;
          }

          if (!url.toLowerCase().includes("startup-check")) continue;

          try {
            await obs.call("PressInputPropertiesButton", {
              inputName: sourceName,
              propertyName: "refreshnocache"
            });
            refreshed.push(sourceName);
          } catch (_refreshErr) {
            const baseUrl = url.split("?")[0];
            await obs.call("SetInputSettings", {
              inputName: sourceName,
              inputSettings: { url: `${baseUrl}?_=${Date.now()}` },
              overlay: true
            });
            refreshed.push(sourceName);
          }
        }
      }

      return { ok: true, refreshed };
    } catch (err) {
      return { ok: false, reason: err.message, refreshed };
    }
  }

  function runPreflightTestsBackground() {
    if (typeof preflightTestsModule?.runSuite !== "function") return;
    if (!isPreflightOnStartEnabled()) {
      return;
    }

    const root = projectRoot || path.resolve(__dirname, "..");

    setTimeout(() => {
      const scriptPath = path.resolve(root, "scripts", "run_preflight_tests.js");
      const child = spawn(process.execPath, [scriptPath], {
        cwd: root,
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true
      });

      let stdout = "";
      child.stdout.on("data", (chunk) => {
        stdout += String(chunk || "");
      });

      child.on("close", () => {
        try {
          const report = JSON.parse(stdout);
          lastPreflightReport = {
            ok: report.ok === true,
            passed: Number(report.passed) || 0,
            failed: Number(report.failed) || 0,
            total: Number(report.total) || 0,
            finishedAt: new Date().toISOString()
          };
        } catch (err) {
          writeLog("mia-errors", {
            source: "preflight_tests",
            error: err.message,
            stdoutPreview: stdout.slice(-400)
          });
          lastPreflightReport = {
            ok: false,
            passed: 0,
            failed: 1,
            total: 1,
            finishedAt: new Date().toISOString()
          };
        }

        buildStartupCheckPayload();
        console.log(
          `[PREFLIGHT] ${lastPreflightReport.ok ? "OK" : "FAIL"} ${lastPreflightReport.passed}/${lastPreflightReport.total} (${lastPreflightReport.mode || "full"})`
        );
      });

      child.on("error", (err) => {
        writeLog("mia-errors", { source: "preflight_tests_spawn", error: err.message });
      });
    }, 1200);
  }

  async function emitStartupCheckSlide() {
    try {
      const durationMs = resolveStartupCheckDurationMs();
      buildStartupCheckPayload();
      logStartupCheck(lastStartupCheck || buildStartupCheckPayload());
      await flashStartupCheckBrowserSource(durationMs);

      if (isPreflightOnStartEnabled()) {
        console.log(
          `[PREFLIGHT] Spouštím ${String(process.env.MIA_PREFLIGHT_MODE || "fast")} testy…`
        );
        runPreflightTestsAsync()
          .then(async () => {
            logStartupCheck(lastStartupCheck || buildStartupCheckPayload());
            await refreshStartupCheckBrowserSources();
          })
          .catch((err) => {
            writeLog("mia-errors", { source: "preflight_tests_async", error: err.message });
          });
      }

      const check = lastStartupCheck || buildStartupCheckPayload();
      const pct = check.readinessPercent ?? check.summary?.readinessPercent ?? 0;
      const headline = check.streamReady
        ? `MIA ${pct}% — připravena streamovat`
        : `MIA ${pct}% — ještě ne připravena`;

      const splitOverlays =
        typeof MIA_SPLIT_OVERLAYS === "function" ? MIA_SPLIT_OVERLAYS() : {};

      await executeOverlay(
        {
          owner: "mia",
          route: "system",
          stage: "startup_check",
          title: "Stav MIA",
          text: headline,
          subtext: check.streamReadyLabel || "",
          holdMs: 22000,
          priority: 3,
          meta: { startupCheck: check.summary, slideUrl: splitOverlays.startupCheck }
        },
        { source: "startup_check", priority: 3, force: true, holdMs: 22000 }
      );
    } catch (err) {
      writeLog("mia-errors", { source: "emitStartupCheckSlide", error: err.message });
    }
  }

  async function emitStartupOverlay() {
    try {
      await emitStartupCheckSlide();

      const ttsCfg =
        ttsEngine && typeof ttsEngine.resolveConfig === "function"
          ? ttsEngine.resolveConfig(runtimeConfig)
          : null;
      const phrase =
        "MIA je online. Hlas funguje. Napiš mi do chatu nebo pošli gift Kojnožroutovi.";

      const splitOverlays =
        typeof MIA_SPLIT_OVERLAYS === "function" ? MIA_SPLIT_OVERLAYS() : {};

      if (ttsCfg?.enabled && ttsEngine) {
        const voiceResult = await ttsEngine.speak({
          text: phrase,
          speaker: "mia",
          runtimeConfig
        });
        if (voiceResult?.ok) {
          const now = Date.now();
          const runtime = typeof deliveryRuntime === "function" ? deliveryRuntime() : null;
          const playbackId = runtime?.bumpVoicePlaybackSeq?.() ?? 0;
          runtime?.setVoicePlaybackState?.({
            playbackId,
            speaker: "mia",
            audioUrl: voiceResult.audioUrl,
            textPreview: phrase,
            updatedAt: now,
            holdUntilTs: voiceHoldUntilTs(now, voiceResult.durationMs)
          });
          mirrorSpeechOverlayFromVoice({
            speaker: "mia",
            text: phrase,
            holdUntilTs: runtime?.getVoicePlaybackState?.()?.holdUntilTs,
            source: "startup_voice_mirror"
          });
          invalidateOverlayStateCache();
        }
      } else {
        await executeOverlay(
          {
            owner: "mia",
            route: "community",
            stage: "startup",
            title: "MIA",
            text: "Server připojen — overlay funguje. Pošli gift nebo napiš do chatu.",
            subtext: splitOverlays.speech,
            mood: "warm",
            holdMs: 20000,
            priority: 2
          },
          { source: "startup_ping", priority: 2, force: true }
        );
      }

      if (obsBrowserRefreshOnConnectEnabled()) {
        await refreshObsMiaBrowserSources();
      }
    } catch (err) {
      writeLog("mia-errors", { source: "startup_overlay", error: err.message });
    }
  }

  return {
    buildStartupCheckPayload,
    emitStartupCheckSlide,
    emitStartupOverlay,
    runPreflightTestsAsync,
    runPreflightTestsBackground,
    getLastStartupCheck: () => lastStartupCheck,
    getLastPreflightReport: () => lastPreflightReport
  };
}

module.exports = { createStartupOverlayRuntime };
