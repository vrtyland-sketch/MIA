"use strict";

/**
 * OBS overlay sync — browser source URL/layout, transforms, hands, refresh.
 */

function createObsOverlaySync(deps = {}) {
  const {
    getObs,
    getObsConnected,
    getSplitOverlays,
    getOverlayBase,
    runtimeConfig,
    safeString,
    writeLog,
    obsFixLayoutModule,
    buildVisionContext,
    getVoicePlaybackSnapshot,
    obsHandsModule,
    obsAwaySceneModule,
    obsStreamerCamerasModule,
    selfRestartModule,
    getMiaEyes
  } = deps;

  let obsRefreshTimer = null;
  let lastObsBrowserRefreshAt = 0;
  const OBS_BROWSER_REFRESH_MIN_MS = Math.max(
    3000,
    Number(process.env.MIA_OBS_BROWSER_REFRESH_MS || 30000)
  );

  function obs() {
    return typeof getObs === "function" ? getObs() : null;
  }

  function isObsReady() {
    const client = obs();
    return Boolean(getObsConnected?.()) && client && typeof client.call === "function";
  }

  function MIA_SPLIT_OVERLAYS() {
    return typeof getSplitOverlays === "function" ? getSplitOverlays() : {};
  }

  function MIA_OVERLAY_BASE() {
    return typeof getOverlayBase === "function" ? getOverlayBase() : "http://127.0.0.1:3000";
  }

  function obsBrowserRefreshOnOverlayEnabled() {
    return runtimeConfig?.obs?.browserRefreshOnOverlay === true;
  }

  function obsBrowserRefreshOnConnectEnabled() {
    return runtimeConfig?.obs?.browserRefreshOnConnect === true;
  }

  async function scheduleObsBrowserRefresh(force = false) {
    if (!getObsConnected?.()) return;
    if (!force && !obsBrowserRefreshOnOverlayEnabled()) return;

    const now = Date.now();
    if (!force && now - lastObsBrowserRefreshAt < OBS_BROWSER_REFRESH_MIN_MS) return;
    if (obsRefreshTimer) return;

    obsRefreshTimer = setTimeout(async () => {
      obsRefreshTimer = null;
      try {
        await refreshObsMiaBrowserSources();
        lastObsBrowserRefreshAt = Date.now();
      } catch (_err) {
        // ignore
      }
    }, 350);
  }

function resolveObsOverlayMode() {
  const envMode = String(process.env.MIA_OBS_OVERLAY_MODE || "").trim().toLowerCase();
  if (envMode === "hub" || envMode === "split") return envMode;
  return String(runtimeConfig?.obs?.overlayMode || "split").toLowerCase() === "hub"
    ? "hub"
    : "split";
}

function isObsLayoutLocked() {
  return runtimeConfig?.obs?.layoutLocked !== false;
}

function resolveObsVoiceMonitorType() {
  const mode = safeString(runtimeConfig?.obs?.voiceMonitor, "and_output").toLowerCase();
  if (mode === "none" || mode === "off") return "OBS_MONITORING_TYPE_NONE";
  if (mode === "monitor" || mode === "monitor_only") {
    return "OBS_MONITORING_TYPE_MONITOR_ONLY";
  }
  return "OBS_MONITORING_TYPE_MONITOR_AND_OUTPUT";
}

function isObsVoiceBrowserSource(inputName = "", currentUrl = "") {
  const name = String(inputName || "").toLowerCase();
  const url = String(currentUrl || "").toLowerCase();
  return (
    /voice|audio|tts|hlas/i.test(name) ||
    /voice-overlay|mia-overlay\.html/i.test(url)
  );
}

async function auditObsMiaBrowserSources() {
  if (!isObsReady()) {
    return { ok: false, reason: "obs_not_connected" };
  }

  const voiceUrls = [];
  const duplicates = [];
  const sources = [];

  try {
    const inputList = await obs().call("GetInputList");
    const inputs = inputList?.inputs || [];

    for (const input of inputs) {
      if (input?.inputKind !== "browser_source") continue;

      let url = "";
      let monitorType = null;
      try {
        const settingsResp = await obs().call("GetInputSettings", {
          inputName: input.inputName
        });
        url = String(
          settingsResp?.inputSettings?.url ||
            settingsResp?.inputSettings?.local_file ||
            ""
        );
      } catch (_err) {
        continue;
      }

      const isMia =
        /127\.0\.0\.1:3000|localhost:3000|mia-live-hub|speech-overlay|voice-overlay|kojnozrout|entity-overlay|chat-overlay/i.test(
          url
        ) || /^MIA_/i.test(String(input.inputName || ""));

      if (!isMia) continue;

      try {
        const mon = await obs().call("GetInputAudioMonitorType", {
          inputName: input.inputName
        });
        monitorType = mon?.monitorType || null;
      } catch (_monErr) {
        // ignore
      }

      const isVoice =
        isObsVoiceBrowserSource(input.inputName, url) ||
        /mia-live-hub/i.test(url);
      const entry = {
        inputName: input.inputName,
        url,
        isVoice,
        monitorType
      };
      sources.push(entry);

      if (isVoice) {
        voiceUrls.push(url);
        const sameVoice = sources.filter(
          (s) => s.isVoice && s.url === url && s.inputName !== input.inputName
        );
        if (sameVoice.length > 0) {
          duplicates.push({
            url,
            inputs: [input.inputName, ...sameVoice.map((s) => s.inputName)]
          });
        }
      }
    }

    const voiceCount = sources.filter((s) => s.isVoice).length;
    const hasHub = sources.some((s) => /mia-live-hub/i.test(s.url));
    const hasLegacyOverlay = sources.some((s) => /mia-overlay\.html/i.test(s.url));
    const hasCanonicalVoice = sources.some(
      (s) =>
        /^MIA_VOICE$/i.test(s.inputName) || /mia-voice-overlay/i.test(s.url)
    );
    const hasTikfinity = sources.some(
      (s) => /tikfinity|zerody\.one\/widget/i.test(s.url) || /tikfinity/i.test(s.inputName)
    );

    let desktopMuted = null;
    let visibleBodyParts = [];
    try {
      const special = await obs().call("GetSpecialInputs");
      const desktopName = special?.desktop1 || "Desktop Audio";
      try {
        const mute = await obs().call("GetInputMute", { inputName: desktopName });
        desktopMuted = Boolean(mute?.inputMuted);
      } catch (_e) {
        desktopMuted = null;
      }

      const prog = await obs().call("GetCurrentProgramScene");
      const sceneName = prog?.currentProgramSceneName;
      if (sceneName) {
        const listResp = await obs().call("GetSceneItemList", { sceneName });
        visibleBodyParts = (listResp?.sceneItems || [])
          .filter(
            (it) =>
              it?.sceneItemEnabled === true &&
              /^(MIA_HEAD|MIA_TORSO|MIA_EYES|MIA_HANDS|MIA_FEET|MIA_GRAPHICS_PREVIEW|MIA_RIG_DESK|RIG_DESK)$/i.test(
                String(it.sourceName || "")
              )
          )
          .map((it) => it.sourceName);
      }
    } catch (_visErr) {
      // ignore
    }

    let doubleAudioRisk = null;
    if (voiceCount > 1) {
      doubleAudioRisk =
        "Více voice browser zdrojů — každý přehraje stejný TTS. Nech jen MIA_VOICE; hub/mia-overlay ztlum nebo smaž.";
    } else if (hasHub && hasCanonicalVoice) {
      doubleAudioRisk =
        "Legacy mia-live-hub hraje stejný hlas jako MIA_VOICE — vypni hub zdroj.";
    } else if (hasLegacyOverlay) {
      doubleAudioRisk =
        "mia-overlay.html teď redirectuje na voice — duplicitní TTS. Smaž starý zdroj.";
    } else if (hasTikfinity) {
      doubleAudioRisk =
        "TikFinity widget ve scéně — může hrát vlastní TTS/alerty vedle MIA_VOICE. Ztlum/skryj.";
    } else if (desktopMuted === false) {
      doubleAudioRisk =
        "Desktop Audio NENÍ mute — Monitor+Output na MIA_VOICE = echo ze speeakers.";
    } else if (
      sources.some(
        (s) =>
          s.isVoice &&
          s.monitorType === "OBS_MONITORING_TYPE_MONITOR_AND_OUTPUT"
      )
    ) {
      doubleAudioRisk =
        "Monitor+Output OK jen s Desktop Audio MUTE + Mic bez room feedback. Monitoring = VB-Cable.";
    }

    return {
      ok: true,
      voiceSourceCount: voiceCount,
      duplicateVoiceSources: duplicates,
      doubleAudioRisk,
      desktopMuted,
      visibleBodyParts,
      doubleVisualRisk:
        visibleBodyParts.length > 0
          ? `Zapnuté body/preview vrstvy vedle MIA_BUBBLE: ${visibleBodyParts.join(", ")} — skryj (npm run obs:ensure-voice).`
          : null,
      sources
    };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

function resolveObsBrowserTargetUrl(inputName = "", currentUrl = "") {
  const urls = MIA_SPLIT_OVERLAYS();
  if (resolveObsOverlayMode() === "hub") {
    return urls.hub;
  }

  const name = String(inputName || "").toLowerCase();
  const url = String(currentUrl || "").toLowerCase();

  // Jméno zdroje má prioritu — opraví MIA_STORY s chybnou speech URL.
  if (/story|pribeh|příběh/i.test(name)) return urls.storyMoment;
  if (/gift.?anim/i.test(name)) return urls.giftAnimation;
  if (/gift.?moment|gift_moment/i.test(name)) return urls.giftMoment;
  if (/speech|bubble|mia_bubble|bubl|text|odpov/i.test(name)) return urls.speech;
  if (/bowl|miska/i.test(name)) return urls.bowl;
  if (/koj|runtime|sprite|mascot|zrout/i.test(name)) return urls.runtime;
  if (/voice|audio|tts|hlas/i.test(name)) return urls.voice;
  if (/evolution|toast|level/i.test(name)) return urls.evolutionToast;
  if (/backpack|batoh|item/i.test(name)) return urls.backpack;
  if (/entity|status|badge|conn/i.test(name)) return urls.status;
  if (/combo/i.test(name)) return urls.combo;
  if (/t0|flyby/i.test(name)) return urls.t0Flyby;
  if (/duel/i.test(name)) return urls.duel;
  if (/startup|kontrola|check/i.test(name)) return urls.startupCheck;
  if (/chat/i.test(name)) return `${MIA_OVERLAY_BASE()}/chat-overlay.html`;
  if (/hub|live-hub/i.test(name)) return urls.hub;

  if (/story-moment/i.test(url)) return urls.storyMoment;
  if (/gift-animation/i.test(url)) return urls.giftAnimation;
  if (/gift-moment/i.test(url)) return urls.giftMoment;
  if (/speech-overlay/i.test(url)) return urls.speech;
  if (/bowl-overlay/i.test(url)) return urls.bowl;
  if (/kojnozrout-runtime/i.test(url)) return urls.runtime;
  if (/voice-overlay|mia-overlay/i.test(url)) return urls.voice;
  if (/evolution-toast/i.test(url)) return urls.evolutionToast;
  if (/backpack-overlay/i.test(url)) return urls.backpack;
  if (/entity-overlay/i.test(url)) return urls.status;
  if (/combo-overlay/i.test(url)) return urls.combo;
  if (/t0-flyby/i.test(url)) return urls.t0Flyby;
  if (/duel-overlay/i.test(url)) return urls.duel;
  if (/startup-check/i.test(url)) return urls.startupCheck;
  if (/chat-overlay/i.test(url)) return `${MIA_OVERLAY_BASE()}/chat-overlay.html`;
  if (/mia-live-hub/i.test(url)) return urls.hub;
  if (/127\.0\.0\.1:3000|localhost:3000/.test(url)) {
    return currentUrl;
  }
  return urls.speech;
}

/** TikTok divák = vertikální 9:16; Kick / legacy = landscape stage. */
function resolveStreamViewerProfile() {
  const raw = String(process.env.MIA_STREAM_PLATFORM || "auto").toLowerCase();
  if (raw === "tiktok") return "tiktok";
  if (raw === "kick" || raw === "both") return "landscape";
  return "tiktok";
}

function obsFullStageSize() {
  return resolveStreamViewerProfile() === "tiktok"
    ? { width: 1080, height: 1920 }
    : { width: 1920, height: 1080 };
}

function obsSpeechStripSize() {
  // TikTok: full portrait transparent stage — MIA hero + bubble CSS zones inside.
  // Legacy 400px strip made cyber MIA too small vs empty black.
  return resolveStreamViewerProfile() === "tiktok"
    ? { width: 1080, height: 1920 }
    : { width: 1920, height: 1080 };
}

function obsKojRuntimeSize() {
  return resolveStreamViewerProfile() === "tiktok"
    ? { width: 520, height: 640 }
    : { width: 400, height: 400 };
}

function obsBowlPanelSize() {
  return resolveStreamViewerProfile() === "tiktok"
    ? { width: 300, height: 220 }
    : { width: 320, height: 240 };
}

function resolveObsBrowserLayout(inputName = "", currentUrl = "") {
  const urls = MIA_SPLIT_OVERLAYS();
  const name = String(inputName || "").toLowerCase();
  const targetUrl = resolveObsBrowserTargetUrl(inputName, currentUrl);

  if (isObsVoiceBrowserSource(inputName, targetUrl)) {
    return {
      targetUrl: urls.voice,
      width: 200,
      height: 80,
      rerouteAudio: true,
      isVoice: true
    };
  }
  if (/bowl|miska/i.test(name) || /bowl-overlay/i.test(targetUrl)) {
    const bowlSize = obsBowlPanelSize();
    return {
      targetUrl: urls.bowl,
      width: bowlSize.width,
      height: bowlSize.height,
      rerouteAudio: false,
      isVoice: false
    };
  }
  if (/runtime|sprite|mascot|zrout/i.test(name) || /kojnozrout-runtime/i.test(targetUrl)) {
    const kojSize = obsKojRuntimeSize();
    return {
      targetUrl: urls.runtime,
      width: kojSize.width,
      height: kojSize.height,
      rerouteAudio: false,
      isVoice: false
    };
  }
  if (/story|pribeh|příběh/i.test(name) || /story-moment/i.test(targetUrl)) {
    return {
      targetUrl: urls.storyMoment,
      width: 960,
      height: 540,
      rerouteAudio: false,
      isVoice: false
    };
  }
  if (/gift.?anim/i.test(name) || /gift-animation/i.test(targetUrl)) {
    const stage = obsFullStageSize();
    return {
      targetUrl: urls.giftAnimation,
      width: stage.width,
      height: stage.height,
      rerouteAudio: false,
      isVoice: false
    };
  }
  if (/gift.?moment|gift_moment/i.test(name) || /gift-moment/i.test(targetUrl)) {
    return {
      targetUrl: urls.giftMoment,
      width: 960,
      height: 540,
      rerouteAudio: false,
      isVoice: false
    };
  }
  if (/speech|bubble|mia_bubble|bubl/i.test(name) || /speech-overlay/i.test(targetUrl)) {
    const speechSize = obsSpeechStripSize();
    return {
      targetUrl: urls.speech,
      width: speechSize.width,
      height: speechSize.height,
      rerouteAudio: false,
      isVoice: false
    };
  }
  if (/entity|status|badge|mia_status/i.test(name) || /entity-overlay/i.test(targetUrl)) {
    const tiktok = resolveStreamViewerProfile() === "tiktok";
    return {
      targetUrl: urls.status,
      width: tiktok ? 340 : 260,
      height: tiktok ? 56 : 50,
      rerouteAudio: false,
      isVoice: false
    };
  }
  if (/combo/i.test(name) || /combo-overlay/i.test(targetUrl)) {
    const stage = obsFullStageSize();
    return {
      targetUrl: urls.combo,
      width: stage.width,
      height: stage.height,
      rerouteAudio: false,
      isVoice: false
    };
  }
  if (/t0|flyby/i.test(name) || /t0-flyby/i.test(targetUrl)) {
    const stage = obsFullStageSize();
    return {
      targetUrl: urls.t0Flyby,
      width: stage.width,
      height: stage.height,
      rerouteAudio: false,
      isVoice: false
    };
  }
  if (/duel/i.test(name) || /duel-overlay/i.test(targetUrl)) {
    const stage = obsFullStageSize();
    return {
      targetUrl: urls.duel,
      width: stage.width,
      height: stage.height,
      rerouteAudio: false,
      isVoice: false
    };
  }
  if (/startup|kontrola|check/i.test(name) || /startup-check/i.test(targetUrl)) {
    const stage = obsFullStageSize();
    return {
      targetUrl: urls.startupCheck,
      width: stage.width,
      height: stage.height,
      rerouteAudio: false,
      isVoice: false
    };
  }
  if (/evolution|toast|level/i.test(name) || /evolution-toast/i.test(targetUrl)) {
    return {
      targetUrl: urls.evolutionToast,
      width: 420,
      height: 140,
      rerouteAudio: false,
      isVoice: false
    };
  }
  if (/backpack|batoh|item/i.test(name) || /backpack-overlay/i.test(targetUrl)) {
    return {
      targetUrl: urls.backpack,
      width: 320,
      height: 240,
      rerouteAudio: false,
      isVoice: false
    };
  }
  if (/chat/i.test(name) || /chat-overlay/i.test(targetUrl)) {
    return {
      targetUrl: `${MIA_OVERLAY_BASE()}/chat-overlay.html`,
      width: 460,
      height: 600,
      rerouteAudio: false,
      isVoice: false
    };
  }
  if (/hub|live-hub/i.test(name) || /mia-live-hub/i.test(targetUrl)) {
    const stage = obsFullStageSize();
    return {
      targetUrl: urls.hub,
      width: stage.width,
      height: stage.height,
      rerouteAudio: false,
      isVoice: false,
      disableInSplitMode: true
    };
  }
  if (/127\.0\.0\.1:3000|localhost:3000/.test(targetUrl)) {
    return {
      targetUrl,
      width: 800,
      height: 600,
      rerouteAudio: false,
      isVoice: false
    };
  }
  return null;
}

async function readObsVoiceAudioState(inputName) {
  const state = {
    muted: null,
    monitorType: null,
    volumeMul: null
  };

  try {
    const muteResp = await obs().call("GetInputMute", { inputName });
    state.muted = Boolean(muteResp?.inputMuted);
  } catch (_err) {
    // ignore
  }

  try {
    const monResp = await obs().call("GetInputAudioMonitorType", { inputName });
    state.monitorType = monResp?.monitorType || null;
  } catch (_err) {
    // ignore
  }

  try {
    const volResp = await obs().call("GetInputVolume", { inputName });
    state.volumeMul = Number(volResp?.inputVolumeMul);
  } catch (_err) {
    // ignore
  }

  return state;
}

async function syncObsVoiceAudioRouteIfNeeded(inputName, options = {}) {
  if (!isObsReady()) {
    return { ok: false, reason: "obs_not_connected" };
  }

  const force = options.force === true;
  const targetMonitor = resolveObsVoiceMonitorType();
  const state = await readObsVoiceAudioState(inputName);
  const needsMute = state.muted === true;
  const needsMonitor = state.monitorType !== targetMonitor;
  const needsVolume =
    !Number.isFinite(state.volumeMul) || state.volumeMul < 0.95;

  if (!force && !needsMute && !needsMonitor && !needsVolume) {
    return { ok: true, inputName, skipped: true };
  }

  if (needsMonitor || force) {
    await obs().call("SetInputAudioMonitorType", {
      inputName,
      monitorType: targetMonitor
    });
  }

  if (needsVolume || force) {
    await obs().call("SetInputVolume", {
      inputName,
      inputVolumeMul: 1.0
    });
  }

  if (needsMute || force) {
    await obs().call("SetInputMute", {
      inputName,
      inputMuted: false
    });
  }

  // Anti-echo: Monitor+Output + Desktop Audio = dvojitý hlas (snímá reproduktory).
  let antiEcho = null;
  const antiRaw = String(process.env.MIA_OBS_VOICE_ANTI_ECHO ?? "1").trim().toLowerCase();
  const antiOn = antiRaw !== "0" && antiRaw !== "false" && antiRaw !== "off";
  if (
    antiOn &&
    (force || targetMonitor === "OBS_MONITORING_TYPE_MONITOR_AND_OUTPUT")
  ) {
    try {
      const { applyAntiEchoDesktopMute } = require("./obs_revive_voice");
      antiEcho = await applyAntiEchoDesktopMute(obs().call.bind(obs()));
    } catch (_err) {
      antiEcho = { ok: false, error: "anti_echo_failed" };
    }
  }

  return {
    ok: true,
    inputName,
    monitorType: targetMonitor,
    antiEcho,
    changed: { needsMute, needsMonitor, needsVolume, force }
  };
}

async function applyObsBrowserSourceProfile(inputName, currentUrl = "", options = {}) {
  if (!isObsReady()) {
    return { ok: false, reason: "obs_not_connected" };
  }

  const allowRestart = options.allowRestart === true;
  const repairVoiceAudio = options.repairVoiceAudio === true;
  const layout = resolveObsBrowserLayout(inputName, currentUrl);
  if (!layout) {
    return { ok: false, skipped: true, inputName };
  }

  try {
    let currentSettings = {};
    try {
      const settingsResp = await obs().call("GetInputSettings", { inputName });
      currentSettings = settingsResp?.inputSettings || {};
    } catch (_readErr) {
      currentSettings = {};
    }

    const settingsMatch =
      String(currentSettings.url || "") === String(layout.targetUrl || "") &&
      Number(currentSettings.width || 0) === Number(layout.width || 0) &&
      Number(currentSettings.height || 0) === Number(layout.height || 0) &&
      Boolean(currentSettings.reroute_audio) === Boolean(layout.rerouteAudio);

    if (settingsMatch) {
      if (layout.isVoice && repairVoiceAudio) {
        const audio = await syncObsVoiceAudioRouteIfNeeded(inputName);
        return { ok: true, inputName, skippedSettings: true, audio, ...layout };
      }
      return { ok: true, inputName, skippedSettings: true, ...layout };
    }

    await obs().call("SetInputSettings", {
      inputName,
      inputSettings: {
        url: layout.targetUrl,
        width: layout.width,
        height: layout.height,
        fps: 30,
        reroute_audio: layout.rerouteAudio,
        shutdown: false,
        restart_when_active: allowRestart
      },
      overlay: true
    });

    if (layout.isVoice && repairVoiceAudio) {
      await syncObsVoiceAudioRouteIfNeeded(inputName, { force: true });
    }

    return { ok: true, inputName, ...layout };
  } catch (err) {
    return { ok: false, inputName, error: err.message };
  }
}

async function ensureObsVoiceBrowserReady(options = {}) {
  if (!isObsReady()) {
    return { ok: false, reason: "obs_not_connected" };
  }

  const forceRefresh = options.forceRefresh === true;
  const prepared = [];
  const silencedDuplicates = [];
  const mutedBrowsers = [];
  const hiddenClutter = [];
  const offenders = [];

  const HIDE_NAME_RE =
    /^(MIA_HEAD|MIA_TORSO|MIA_EYES|MIA_HANDS|MIA_FEET|MIA_GRAPHICS_PREVIEW|MIA_RIG_DESK|RIG_DESK)$/i;
  const HIDE_URL_RE =
    /mia-live-hub|mia-overlay\.html|mia-graphics-preview|mia-body-part-overlay|rig-desk\.html/i;
  const FORCE_MUTE_URL_RE =
    /tikfinity|zerody\.one\/widget|mia-live-hub|mia-overlay\.html|mia-voice-overlay|speech-overlay|kojnozrout|kojnozout|chat-overlay|entity-overlay/i;

  try {
    const inputList = await obs().call("GetInputList");
    const inputs = inputList?.inputs || [];
    const voiceInputs = [];
    const browserMeta = [];

    for (const input of inputs) {
      if (input?.inputKind !== "browser_source") continue;

      let url = "";
      let reroute = false;
      try {
        const settingsResp = await obs().call("GetInputSettings", {
          inputName: input.inputName
        });
        url = String(
          settingsResp?.inputSettings?.url ||
            settingsResp?.inputSettings?.local_file ||
            ""
        );
        reroute = Boolean(settingsResp?.inputSettings?.reroute_audio);
      } catch (_err) {
        continue;
      }

      const isVoice =
        isObsVoiceBrowserSource(input.inputName, url) ||
        /^MIA_VOICE/i.test(String(input.inputName || "")) ||
        /mia-live-hub/i.test(url) ||
        /mia-overlay\.html/i.test(url);

      browserMeta.push({
        inputName: input.inputName,
        url,
        reroute,
        isVoice
      });
      if (isVoice) {
        voiceInputs.push({ inputName: input.inputName, url });
      }
    }

    // Jediný audio authority: kanonické MIA_VOICE; ostatní voice/hub ztlum.
    const canonical =
      voiceInputs.find((v) => /^MIA_VOICE$/i.test(v.inputName)) ||
      voiceInputs.find((v) => /mia-voice-overlay/i.test(v.url)) ||
      null;

    for (const entry of voiceInputs) {
      const isCanonical =
        canonical && entry.inputName === canonical.inputName;

      if (!isCanonical) {
        try {
          await obs().call("SetInputMute", {
            inputName: entry.inputName,
            inputMuted: true
          });
          silencedDuplicates.push(entry.inputName);
          offenders.push({
            inputName: entry.inputName,
            reason: "duplicate_voice_muted",
            url: entry.url
          });
        } catch (_muteErr) {
          // ignore
        }
        continue;
      }

      const profile = await applyObsBrowserSourceProfile(entry.inputName, entry.url, {
        allowRestart: false,
        repairVoiceAudio: true
      });
      if (profile.ok) prepared.push(entry.inputName);

      await syncObsVoiceAudioRouteIfNeeded(entry.inputName, { force: true });

      if (forceRefresh && !getVoicePlaybackSnapshot()) {
        try {
          await obs().call("PressInputPropertiesButton", {
            inputName: entry.inputName,
            propertyName: "refreshnocache"
          });
        } catch (_refreshErr) {
          // ignore
        }
      }
    }

    // Ztlum VŠECHNY browser zdroje kromě kanonického MIA_VOICE
    // (+ TikFinity widgety / legacy URL i když nejsou „voice“).
    for (const entry of browserMeta) {
      const isCanonical =
        canonical && entry.inputName === canonical.inputName;
      if (isCanonical) continue;

      const shouldMute =
        entry.isVoice ||
        entry.reroute === true ||
        FORCE_MUTE_URL_RE.test(entry.url) ||
        FORCE_MUTE_URL_RE.test(entry.inputName);

      if (!shouldMute) {
        // I běžné MIA overlaye: mixer mute = bezpečné (bez Control audio nic nezmění).
        if (/127\.0\.0\.1:3000|localhost:3000/i.test(entry.url)) {
          try {
            await obs().call("SetInputMute", {
              inputName: entry.inputName,
              inputMuted: true
            });
            mutedBrowsers.push(entry.inputName);
          } catch (_err) {
            // ignore
          }
        }
        continue;
      }

      try {
        await obs().call("SetInputMute", {
          inputName: entry.inputName,
          inputMuted: true
        });
        mutedBrowsers.push(entry.inputName);
        if (/tikfinity|zerody\.one/i.test(entry.url) || /tikfinity/i.test(entry.inputName)) {
          offenders.push({
            inputName: entry.inputName,
            reason: "tikfinity_or_widget_muted",
            url: entry.url
          });
        }
      } catch (_err) {
        // ignore
      }
    }

    // Skryj body-party + graphics preview + legacy hub (double visual s MIA_BUBBLE).
    try {
      const prog = await obs().call("GetCurrentProgramScene");
      const sceneName = prog?.currentProgramSceneName;
      if (sceneName) {
        const listResp = await obs().call("GetSceneItemList", { sceneName });
        const items = listResp?.sceneItems || [];
        for (const item of items) {
          const sourceName = String(item?.sourceName || "");
          let url = "";
          const meta = browserMeta.find((b) => b.inputName === sourceName);
          if (meta) url = meta.url;

          const hide =
            HIDE_NAME_RE.test(sourceName) ||
            HIDE_URL_RE.test(url) ||
            /hub|live-hub/i.test(sourceName);

          if (!hide) continue;
          if (item?.sceneItemEnabled !== true) continue;

          try {
            await obs().call("SetSceneItemEnabled", {
              sceneName,
              sceneItemId: item.sceneItemId,
              sceneItemEnabled: false
            });
            hiddenClutter.push(sourceName);
            offenders.push({
              inputName: sourceName,
              reason: "hidden_double_visual",
              url
            });
          } catch (_hideErr) {
            // ignore
          }
        }
      }
    } catch (_sceneErr) {
      // ignore
    }

    await ensureObsMiaSourceVisibleInProgramScene(["MIA_VOICE"]);

    if (hiddenClutter.length) {
      console.log(
        "[OBS_VOICE] Skryté double-visual vrstvy:",
        hiddenClutter.join(", ")
      );
    }
    if (mutedBrowsers.length) {
      console.log(
        "[OBS_VOICE] Ztlumené browser zdroje (ne MIA_VOICE):",
        [...new Set(mutedBrowsers)].join(", ")
      );
    }
    if (offenders.length) {
      console.log(
        "[OBS_VOICE] Offenders:",
        offenders.map((o) => `${o.inputName} (${o.reason})`).join("; ")
      );
    }

    return {
      ok: true,
      prepared,
      refreshed: forceRefresh,
      silencedDuplicates,
      mutedBrowsers: [...new Set(mutedBrowsers)],
      hiddenClutter: [...new Set(hiddenClutter)],
      offenders,
      canonicalVoice: canonical?.inputName || null
    };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

async function fixObsOverlayBrowserLayouts() {
  if (!isObsReady()) {
    return { ok: false, reason: "obs_not_connected" };
  }

  if (isObsLayoutLocked()) {
    const voice = await ensureObsVoiceBrowserReady();
    return {
      ok: true,
      skipped: true,
      reason: "layout_locked",
      voice,
      hint: "MIA nemění pozice/velikosti OBS — jen audio route MIA_VOICE."
    };
  }

  const fixed = [];
  const skipped = [];

  try {
    const inputList = await obs().call("GetInputList");
    const inputs = inputList?.inputs || [];

    for (const input of inputs) {
      if (input?.inputKind !== "browser_source") continue;

      let url = "";
      try {
        const settingsResp = await obs().call("GetInputSettings", {
          inputName: input.inputName
        });
        url = String(
          settingsResp?.inputSettings?.url ||
            settingsResp?.inputSettings?.local_file ||
            ""
        );
      } catch (_err) {
        continue;
      }

      const isMia =
        /127\.0\.0\.1:3000|localhost:3000|mia-live-hub|speech-overlay|voice-overlay|kojnozrout|entity-overlay|chat-overlay/i.test(
          url
        ) || /^MIA_|^KOJNOZROUT_|^CHAT_OVERLAY/i.test(String(input.inputName || ""));

      if (!isMia) continue;

      const layout = resolveObsBrowserLayout(input.inputName, url);
      if (layout?.isVoice) {
        skipped.push({
          inputName: input.inputName,
          reason: "voice_skip_auto_layout"
        });
        continue;
      }

      const result = await applyObsBrowserSourceProfile(input.inputName, url, {
        allowRestart: false
      });
      if (result.ok) fixed.push(result);
      else skipped.push(result);
    }

    return { ok: true, fixed, skipped, overlayMode: resolveObsOverlayMode() };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

function resolveObsOverlaySceneTransform(sourceName = "") {
  const name = String(sourceName || "").toUpperCase();

  // Split overlay layout — mirrors mia-live-hub zones on SPINAK_ENGINE_GIFTS
  if (/KOJNOZROUT_BOWL|BOWL|MISKA/i.test(name)) {
    return {
      positionX: 1479,
      positionY: 134,
      scaleX: 0.84,
      scaleY: 0.84,
      alignment: 6
    };
  }

  if (/KOJNOZROUT_RUNTIME|RUNTIME|SPRITE|MASCOT/i.test(name)) {
    return {
      positionX: 1872,
      positionY: 788,
      scaleX: 0.74,
      scaleY: 0.74,
      alignment: 10
    };
  }

  if (/MIA_VOICE|VOICE|HLAS|TTS/i.test(name)) {
    return {
      positionX: 0,
      positionY: 0,
      scaleX: 1,
      scaleY: 1,
      alignment: 5
    };
  }

  return null;
}

function sanitizeObsSceneItemTransform(base, patch) {
  const merged = { ...(base || {}), ...(patch || {}) };
  if (merged.boundsType === "OBS_BOUNDS_NONE") {
    delete merged.boundsWidth;
    delete merged.boundsHeight;
  }
  return merged;
}

async function fixObsOverlaySceneTransforms(sceneName = "") {
  if (!isObsReady()) {
    return { ok: false, reason: "obs_not_connected" };
  }

  if (isObsLayoutLocked()) {
    return { ok: true, skipped: true, reason: "layout_locked", fixed: [], skipped: [] };
  }

  const targetScene =
    safeString(sceneName) ||
    safeString(runtimeConfig?.obs?.sceneName) ||
    "SPINAK_ENGINE_GIFTS";

  if (typeof obsFixLayoutModule.applyObsOverlayLayout === "function") {
    try {
      const visionResult = await obsFixLayoutModule.applyObsOverlayLayout(obs(), {
        sceneName: targetScene,
        platform: process.env.MIA_STREAM_PLATFORM || "auto",
        kickBridge: Boolean(runtimeConfig?.kick?.enabled),
        layoutContext:
          typeof buildVisionContext === "function" ? buildVisionContext() : {}
      });

      return {
        ok: visionResult.ok === true,
        engine: "mia_vision",
        sceneName: targetScene,
        canvas: visionResult.canvas,
        platform: visionResult.platform,
        mode: visionResult.mode,
        fixed: visionResult.positions || [],
        reenabled: visionResult.reenabled || [],
        skipped: []
      };
    } catch (err) {
      writeLog("mia-errors", {
        source: "obs_vision_layout",
        error: err.message
      });
    }
  }

  const fixed = [];
  const skipped = [];

  try {
    const listResp = await obs().call("GetSceneItemList", { sceneName: targetScene });
    const items = listResp?.sceneItems || [];

    for (const item of items) {
      const sourceName = String(item?.sourceName || "");

      if (
        resolveObsOverlayMode() === "split" &&
        /hub|live-hub|mia-live-hub/i.test(sourceName)
      ) {
        try {
          await obs().call("SetSceneItemEnabled", {
            sceneName: targetScene,
            sceneItemId: item.sceneItemId,
            sceneItemEnabled: false
          });
          fixed.push({ sourceName, action: "disabled_legacy_hub" });
        } catch (err) {
          skipped.push({ sourceName, error: err.message });
        }
        continue;
      }

      const transform = resolveObsOverlaySceneTransform(sourceName);
      if (!transform) {
        skipped.push({ sourceName, reason: "no_profile" });
        continue;
      }

      try {
        let sceneItemTransform = transform;
        try {
          const current = await obs().call("GetSceneItemTransform", {
            sceneName: targetScene,
            sceneItemId: item.sceneItemId
          });
          sceneItemTransform = sanitizeObsSceneItemTransform(
            current?.sceneItemTransform,
            transform
          );
        } catch (_readErr) {
          // use profile defaults only
        }

        await obs().call("SetSceneItemTransform", {
          sceneName: targetScene,
          sceneItemId: item.sceneItemId,
          sceneItemTransform
        });
        fixed.push({
          sourceName,
          sceneItemId: item.sceneItemId,
          positionX: sceneItemTransform.positionX,
          positionY: sceneItemTransform.positionY,
          scaleX: sceneItemTransform.scaleX,
          scaleY: sceneItemTransform.scaleY
        });
      } catch (err) {
        skipped.push({ sourceName, error: err.message });
      }
    }

    return { ok: true, engine: "legacy", sceneName: targetScene, fixed, skipped };
  } catch (err) {
    return { ok: false, sceneName: targetScene, error: err.message };
  }
}

async function ensureObsHands(options = {}) {
  if (process.env.MIA_OBS_HANDS === "0" || process.env.MIA_OBS_HANDS === "false") {
    return { ok: true, skipped: true, reason: "disabled" };
  }
  if (!isObsReady()) {
    return { ok: false, reason: "obs_not_connected" };
  }
  if (typeof obsHandsModule.ensureObsOverlayHands !== "function") {
    return { ok: false, reason: "module_missing" };
  }

  const sceneName =
    safeString(options.sceneName) ||
    safeString(runtimeConfig?.obs?.sceneName) ||
    "SPINAK_ENGINE_GIFTS";

  const { withHandsBodySyncUrls } = require("./MIA_OBS_BODY_SYNC");
  const baseUrls = MIA_SPLIT_OVERLAYS();
  const { urls: splitUrls, bodySyncMode } = withHandsBodySyncUrls(
    baseUrls,
    MIA_OVERLAY_BASE(),
    options,
    process.env
  );

  const result = await obsHandsModule.ensureObsOverlayHands(obs().call.bind(obs), {
    sceneName,
    splitUrls,
    bodySyncMode,
    resolveLayout: resolveObsBrowserLayout,
    applyProfile: async (inputName, url) =>
      applyObsBrowserSourceProfile(inputName, url, { allowRestart: false }),
    layoutLocked: isObsLayoutLocked(),
    overlayMode: resolveObsOverlayMode(),
    onlyIds: Array.isArray(options.onlyIds) ? options.onlyIds : null
  });

  let awayResult = { ok: true, skipped: true, reason: "disabled" };
  if (
    typeof obsAwaySceneModule.ensureObsAwayScene === "function" &&
    process.env.MIA_OBS_AWAY_SCENE_HANDS !== "0" &&
    process.env.MIA_OBS_AWAY_SCENE_HANDS !== "false"
  ) {
    awayResult = await obsAwaySceneModule.ensureObsAwayScene(obs().call.bind(obs), {
      sceneName:
        safeString(process.env.MIA_AWAY_SCENE) ||
        safeString(obsAwaySceneModule.resolveAwaySceneName?.()) ||
        "SPINAK_NEJSEM_TU",
      splitUrls,
      bodySyncMode,
      resolveLayout: resolveObsBrowserLayout,
      applyProfile: async (inputName, url) =>
        applyObsBrowserSourceProfile(inputName, url, { allowRestart: false }),
      layoutLocked: isObsLayoutLocked(),
      overlayMode: resolveObsOverlayMode(),
      onlyIds: Array.isArray(options.onlyIds) ? options.onlyIds : null
    });
  }

  if (awayResult?.sceneCreated) {
    console.log(`[OBS HANDS] vytvořena scéna ${awayResult.sceneName}`);
  }
  if (awayResult?.sceneAdded?.length) {
    console.log(
      `[OBS HANDS] přidáno do scény ${awayResult.sceneName}: ${awayResult.sceneAdded.join(", ")}`
    );
  }

  if (result?.created?.length) {
    console.log(`[OBS HANDS] vytvořeno: ${result.created.join(", ")}`);
  }
  if (result?.sceneAdded?.length) {
    console.log(`[OBS HANDS] přidáno do scény ${sceneName}: ${result.sceneAdded.join(", ")}`);
  }

  if (awayResult?.sceneAdded?.length) {
    result.sceneAdded = [...(result.sceneAdded || []), ...awayResult.sceneAdded];
  }
  if (awayResult?.created?.length) {
    result.created = [...(result.created || []), ...awayResult.created];
  }
  if (awayResult?.configured?.length) {
    result.configured = [...(result.configured || []), ...awayResult.configured];
  }
  result.awayScene = awayResult;
  result.bodySyncMode = bodySyncMode;

  if (typeof getMiaEyes === "function") {
    const miaEyes = getMiaEyes();
    if (typeof miaEyes?.scanAwayScene === "function" && awayResult?.ok && !awayResult?.skipped) {
      try {
        const awayEyes = await miaEyes.scanAwayScene({
          sceneName:
            safeString(process.env.MIA_AWAY_SCENE) ||
            safeString(obsAwaySceneModule.resolveAwaySceneName?.()) ||
            "SPINAK_NEJSEM_TU"
        });
        result.awayEyes = awayEyes;
        if (awayEyes?.ok) {
          console.log(`[OBS HANDS] AWAY oči OK — smyčka viditelná (${awayEyes.loopSource})`);
        } else if (awayEyes?.missingRequired?.length) {
          console.log(
            `[OBS HANDS] AWAY oči — chybí: ${awayEyes.missingRequired.join(", ")}`
          );
        }
      } catch (err) {
        result.awayEyes = { ok: false, reason: err.message };
      }
    }
  }

  if (typeof selfRestartModule.maybeScheduleRestartAfterHands === "function") {
    result.restart = selfRestartModule.maybeScheduleRestartAfterHands(
      result,
      options.restartReason || "obs_hands"
    );
  }

  return result;
}

async function ensureObsStreamerCameras(options = {}) {
  if (
    process.env.MIA_OBS_STREAMER_CAMERAS === "0" ||
    process.env.MIA_OBS_STREAMER_CAMERAS === "false"
  ) {
    return { ok: true, skipped: true, reason: "disabled" };
  }
  if (!isObsReady()) {
    return { ok: false, reason: "obs_not_connected" };
  }
  if (typeof obsStreamerCamerasModule.ensureObsStreamerRig !== "function") {
    return { ok: false, reason: "module_missing" };
  }

  const sceneName =
    safeString(options.sceneName) ||
    safeString(runtimeConfig?.obs?.sceneName) ||
    "SPINAK_ENGINE_GIFTS";

  return obsStreamerCamerasModule.ensureObsStreamerRig(obs().call.bind(obs), {
    sceneName,
    splitUrls: MIA_SPLIT_OVERLAYS(),
    layoutLocked: isObsLayoutLocked(),
    primaryDevice: process.env.MIA_OBS_CAMERA_DEVICE || process.env.MIA_OBS_PRIMARY_DEVICE,
    legacyPrimaryName: process.env.MIA_OBS_CAMERA_NAME || "NOTEBOOK_CAMERA",
    ensureOverlay: options.ensureOverlay !== false
  });
}

async function flashStartupCheckBrowserSource(durationMs = 25000) {
  if (!isObsReady()) {
    return { ok: false, reason: "obs_not_connected" };
  }

  await ensureObsHands({ onlyIds: ["startup"] });

  const toggled = [];

  try {
    const scenesResp = await obs().call("GetSceneList");
    for (const sceneName of scenesResp?.scenes?.map((s) => s.sceneName) || []) {
      const listResp = await obs().call("GetSceneItemList", { sceneName });
      for (const item of listResp?.sceneItems || []) {
        const sourceName = String(item?.sourceName || "");
        let url = "";
        try {
          const settingsResp = await obs().call("GetInputSettings", { inputName: sourceName });
          url = String(settingsResp?.inputSettings?.url || "").toLowerCase();
        } catch (_err) {
          continue;
        }
        if (!url.includes("startup-check")) continue;

        const wasEnabled = item?.sceneItemEnabled === true;
        if (!wasEnabled) {
          await obs().call("SetSceneItemEnabled", {
            sceneName,
            sceneItemId: item.sceneItemId,
            sceneItemEnabled: true
          });
        }
        toggled.push({ sceneName, sourceName, sceneItemId: item.sceneItemId, wasEnabled });
      }
    }

    if (toggled.length > 0) {
      deps.setStartupSlideActiveUntil(Date.now() + durationMs);
      setTimeout(() => {
        deps.setStartupSlideActiveUntil(0);
        for (const t of toggled) {
          if (t.wasEnabled) continue;
          obs().call("SetSceneItemEnabled", {
            sceneName: t.sceneName,
            sceneItemId: t.sceneItemId,
            sceneItemEnabled: false
          }).catch(() => {});
        }
      }, durationMs);
    }

    return { ok: true, toggled: toggled.length, items: toggled };
  } catch (err) {
    return { ok: false, reason: err.message };
  }
}

async function configureObsMiaLiveHub() {
  if (!isObsReady()) {
    return { ok: false, reason: "obs_not_connected" };
  }

  const overlayMode = resolveObsOverlayMode();
  const configured = [];

  try {
    const inputList = await obs().call("GetInputList");
    const inputs = inputList?.inputs || [];

    for (const input of inputs) {
      if (input?.inputKind !== "browser_source") continue;

      let url = "";
      try {
        const settingsResp = await obs().call("GetInputSettings", {
          inputName: input.inputName
        });
        url = String(
          settingsResp?.inputSettings?.url ||
            settingsResp?.inputSettings?.local_file ||
            ""
        );
      } catch (_err) {
        continue;
      }

      const isMiaSource =
        /mia-overlay|mia-live-hub|mia-voice|speech-overlay|kojnozrout|entity-overlay|chat-overlay|127\.0\.0\.1:3000|localhost:3000/i.test(
          url
        ) ||
        /^MIA_|^KOJNOZROUT_|^CHAT_OVERLAY/i.test(String(input.inputName || ""));

      if (!isMiaSource) continue;

      const layout = resolveObsBrowserLayout(input.inputName, url);
      if (layout?.isVoice) continue;

      const result = await applyObsBrowserSourceProfile(input.inputName, url, {
        allowRestart: false
      });
      if (result.ok) configured.push(result);
    }

    return { ok: true, configured, overlayMode, urls: MIA_SPLIT_OVERLAYS() };
  } catch (err) {
    writeLog("mia-errors", {
      source: "configureObsMiaLiveHub",
      error: err.message
    });
    return { ok: false, reason: err.message };
  }
}

async function ensureObsMiaSourceVisibleInProgramScene(preferredNames = []) {
  if (!isObsReady()) {
    return { ok: false, reason: "obs_not_connected", enabled: [] };
  }

  const enabled = [];
  /** Body/preview vrstvy nesmí auto-enable — dělají double visual s MIA_BUBBLE. */
  const NEVER_AUTO_ENABLE =
    /^(MIA_HEAD|MIA_TORSO|MIA_EYES|MIA_HANDS|MIA_FEET|MIA_GRAPHICS_PREVIEW|MIA_RIG_DESK|RIG_DESK)$/i;

  try {
    const sceneResp = await obs().call("GetCurrentProgramScene");
    const sceneName = sceneResp?.currentProgramSceneName;
    if (!sceneName) {
      return { ok: false, reason: "no_program_scene", enabled };
    }

    const listResp = await obs().call("GetSceneItemList", { sceneName });
    const items = listResp?.sceneItems || [];
    const preferred = Array.isArray(preferredNames)
      ? preferredNames.filter(Boolean)
      : [];
    // Když caller předá explicitní seznam, zapni jen ty — ne všechny MIA_*.
    const preferredOnly = preferred.length > 0;

    for (const item of items) {
      const sourceName = String(item?.sourceName || "");
      const isPreferred = preferred.includes(sourceName);
      const isMiaNamed =
        /^MIA_|^KOJNOZROUT_|^CHAT_OVERLAY/i.test(sourceName);

      if (preferredOnly) {
        if (!isPreferred) continue;
      } else if (!isMiaNamed) {
        continue;
      }

      if (NEVER_AUTO_ENABLE.test(sourceName) && !isPreferred) {
        continue;
      }

      if (item?.sceneItemEnabled === true) {
        enabled.push(sourceName);
        continue;
      }

      try {
        await obs().call("SetSceneItemEnabled", {
          sceneName,
          sceneItemId: item.sceneItemId,
          sceneItemEnabled: true
        });
        enabled.push(sourceName);
      } catch (_err) {
        // ignore per-item failures
      }
    }

    return { ok: true, sceneName, enabled };
  } catch (err) {
    writeLog("mia-errors", {
      source: "ensureObsMiaSourceVisibleInProgramScene",
      error: err.message
    });
    return { ok: false, reason: err.message, enabled };
  }
}

async function refreshObsMiaBrowserSources() {
  if (!isObsReady()) {
    return { ok: false, reason: "obs_not_connected", refreshed: [] };
  }

  const refreshed = [];

  try {
    const inputList = await obs().call("GetInputList");
    const inputs = inputList?.inputs || [];

    for (const input of inputs) {
      if (input?.inputKind !== "browser_source") continue;

      let url = "";

      try {
        const settingsResp = await obs().call("GetInputSettings", {
          inputName: input.inputName
        });
        url = String(
          settingsResp?.inputSettings?.url ||
            settingsResp?.inputSettings?.local_file ||
            ""
        );
      } catch (_err) {
        continue;
      }

      if (
        !/mia-overlay|mia-live-hub|speech-overlay|voice-overlay|kojnozrout|entity-overlay|chat-overlay|combo-overlay|startup-check|t0-flyby|gift-moment|story-moment|127\.0\.0\.1:3000|localhost:3000/i.test(
          url
        ) &&
        !/^MIA_|^KOJNOZROUT_|^CHAT_OVERLAY/i.test(String(input.inputName || ""))
      ) {
        continue;
      }

      const isVoiceSource =
        isObsVoiceBrowserSource(input.inputName, url) ||
        /^MIA_VOICE/i.test(String(input.inputName || ""));

      // Voice browser self-polls — never refresh or touch during stream.
      if (isVoiceSource) {
        continue;
      }

      await applyObsBrowserSourceProfile(input.inputName, url, {
        allowRestart: false
      });

      try {
        await obs().call("PressInputPropertiesButton", {
          inputName: input.inputName,
          propertyName: "refreshnocache"
        });
        refreshed.push(input.inputName);
        continue;
      } catch (_refreshErr) {
        // fallback below
      }

      try {
        const baseUrl = url.split("?")[0];
        await obs().call("SetInputSettings", {
          inputName: input.inputName,
          inputSettings: {
            url: `${baseUrl}?_=${Date.now()}`
          },
          overlay: true
        });
        refreshed.push(input.inputName);
      } catch (err) {
        writeLog("mia-errors", {
          source: "refreshObsMiaBrowserSources",
          inputName: input.inputName,
          error: err.message
        });
      }
    }

    return { ok: true, refreshed };
  } catch (err) {
    writeLog("mia-errors", {
      source: "refreshObsMiaBrowserSources",
      error: err.message
    });

    return { ok: false, reason: "refresh_failed", error: err.message, refreshed };
  }
}
  return {
    resolveObsOverlayMode,
    isObsLayoutLocked,
    resolveObsBrowserLayout,
    resolveObsBrowserTargetUrl,
    auditObsMiaBrowserSources,
    applyObsBrowserSourceProfile,
    ensureObsVoiceBrowserReady,
    fixObsOverlayBrowserLayouts,
    fixObsOverlaySceneTransforms,
    ensureObsHands,
    ensureObsStreamerCameras,
    flashStartupCheckBrowserSource,
    configureObsMiaLiveHub,
    ensureObsMiaSourceVisibleInProgramScene,
    refreshObsMiaBrowserSources,
    scheduleObsBrowserRefresh,
    obsBrowserRefreshOnConnectEnabled,
    obsBrowserRefreshOnOverlayEnabled
  };
}

module.exports = { createObsOverlaySync };
