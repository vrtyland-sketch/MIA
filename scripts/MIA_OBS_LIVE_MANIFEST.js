"use strict";

/**
 * Kanonický OBS manifest pro Stream Mode (Spinák).
 * Jediný zdroj pravdy pro: ruce (MIA_OBS_HANDS), verify, startup-check, docs.
 */

const { BODY_PARTS } = require("../shared/mia-graphics-studio/bodyPartsCatalog");
const { resolveBodySyncMode, applyBodySyncToSplitUrls } = require("./MIA_OBS_BODY_SYNC");

const DEFAULT_SCENE = "SPINAK_ENGINE_GIFTS";
const DEFAULT_PORT = 3000;

/** Incremental graphics cache bust (v32 freeze = baseline). */
const GFX_CACHE_BUST = "36-koj-unify";
/** Gift animation overlay only — post-DoD stream polish (Koj/speech stay on v36). */
const GIFT_ANIM_CACHE_BUST = "37-stream-polish";

/**
 * Live OBS input names ↔ manifest catalog names.
 * Ensure / refresh / hands resolve both sides (e.g. MIA_BUBBLE ↔ MIA_SPEECH).
 */
const OBS_INPUT_NAME_ALIASES = {
  MIA_SPEECH: ["MIA_BUBBLE", "MIA_SPEECH_OVERLAY", "SPEECH_OVERLAY"],
  MIA_BUBBLE: ["MIA_SPEECH", "MIA_SPEECH_OVERLAY", "SPEECH_OVERLAY"],
  MIA_KOJ_RUNTIME: ["KOJNOZROUT_RUNTIME", "KOJ_RUNTIME", "KOJ_SPRITE"],
  KOJNOZROUT_RUNTIME: ["MIA_KOJ_RUNTIME", "KOJ_RUNTIME", "KOJ_SPRITE"],
  MIA_BOWL: ["KOJNOZROUT_BOWL_V2", "KOJNOZROUT_BOWL", "KOJ_MISKA"],
  KOJNOZROUT_BOWL_V2: ["MIA_BOWL", "KOJNOZROUT_BOWL", "KOJ_MISKA"],
  KOJNOZROUT_BOWL: ["MIA_BOWL", "KOJNOZROUT_BOWL_V2", "KOJ_MISKA"]
};

function resolveObsInputNames(name = "") {
  const primary = String(name || "").trim();
  if (!primary) return [];
  const key = primary.toUpperCase();
  const aliases =
    OBS_INPUT_NAME_ALIASES[primary] || OBS_INPUT_NAME_ALIASES[key] || [];
  return [primary, ...aliases].filter((n, i, arr) => n && arr.indexOf(n) === i);
}

/** V OBS: čím vyšší zIndex, tím víc „vpředu“ (nahoře v seznamu vrstev). */
const BROWSER_LAYERS = [
  {
    id: "startup",
    label: "Startup kontrola",
    inputName: "MIA_STARTUP_CHECK",
    file: "startup-check.html",
    urlKey: "startupCheck",
    width: 1920,
    height: 1080,
    defaultVisible: false,
    moment: true,
    rerouteAudio: false,
    zIndex: 100,
    obs: true,
    note: "Po startu MIA ~60s slide; pak skrýt (sceneItemEnabled=false)."
  },
  {
    id: "combo",
    label: "COMBO + dárková vlna",
    inputName: "MIA_COMBO",
    file: "combo-overlay.html",
    urlKey: "combo",
    width: 1920,
    height: 1080,
    defaultVisible: false,
    moment: true,
    rerouteAudio: false,
    zIndex: 90,
    obs: true,
    note: "Fullscreen flash + wave HUD; defaultně skrytý, zobrazí se při combo/spam."
  },
  {
    id: "boss_cinematic",
    label: "T5+ boss cinematic",
    inputName: "MIA_BOSS_CINEMATIC",
    file: "boss-cinematic-overlay.html",
    urlKey: "bossCinematic",
    width: 1920,
    height: 1080,
    defaultVisible: false,
    moment: true,
    rerouteAudio: false,
    zIndex: 92,
    obs: true,
    note: "Signature WOW vrstva pro T5/T6 boss — particles + hero ring nad combo kartou."
  },
  {
    id: "immersive_scene",
    label: "Immersive scene compositor",
    inputName: "MIA_IMMERSIVE_SCENE",
    file: "immersive-scene-overlay.html",
    urlKey: "immersiveScene",
    width: 1920,
    height: 1080,
    defaultVisible: false,
    moment: true,
    rerouteAudio: false,
    zIndex: 91,
    obs: true,
    note: "Fullscreen prostředí + streamer matte cutout; aktivní při immersive/combat scéně."
  },
  {
    id: "t0_flyby",
    label: "T0 flyby",
    inputName: "MIA_T0_FLYBY",
    file: "t0-flyby-overlay.html",
    urlKey: "t0Flyby",
    width: 1920,
    height: 1080,
    defaultVisible: false,
    moment: true,
    rerouteAudio: false,
    zIndex: 88,
    obs: true
  },
  {
    id: "duel",
    label: "Duel bar",
    inputName: "MIA_DUEL",
    file: "kojnozrout-duel-overlay.html",
    urlKey: "duel",
    width: 1920,
    height: 1080,
    defaultVisible: false,
    moment: true,
    rerouteAudio: false,
    zIndex: 86,
    obs: true
  },
  {
    id: "story",
    label: "Story moment",
    inputName: "MIA_STORY",
    file: "story-moment-overlay.html",
    urlKey: "storyMoment",
    width: 960,
    height: 540,
    defaultVisible: false,
    moment: true,
    rerouteAudio: false,
    zIndex: 84,
    obs: true
  },
  {
    id: "gift_moment",
    label: "Gift moment",
    inputName: "MIA_GIFT_MOMENT",
    file: "gift-moment-overlay.html",
    urlKey: "giftMoment",
    width: 960,
    height: 540,
    defaultVisible: false,
    moment: true,
    rerouteAudio: false,
    zIndex: 82,
    obs: true
  },
  {
    id: "gift_animation",
    label: "Gift animation desk",
    inputName: "MIA_GIFT_ANIMATION",
    file: "gift-animation-overlay.html",
    urlKey: "giftAnimation",
    urlQuery: `v=${GIFT_ANIM_CACHE_BUST}`,
    width: 1920,
    height: 1080,
    defaultVisible: true,
    moment: true,
    rerouteAudio: false,
    zIndex: 83,
    obs: true,
    note: "Desk ~10s soft-neon stage; CSS self-hides when idle — keep enabled so browser keeps polling."
  },
  {
    id: "evolution",
    label: "Evolution toast",
    inputName: "MIA_EVOLUTION",
    file: "evolution-toast-overlay.html",
    urlKey: "evolutionToast",
    width: 420,
    height: 140,
    defaultVisible: false,
    moment: true,
    rerouteAudio: false,
    zIndex: 80,
    obs: true
  },
  {
    id: "host_mode",
    label: "HOST / NEJSEM TU panel",
    inputName: "MIA_HOST_MODE",
    file: "host-mode-overlay.html",
    urlKey: "hostMode",
    width: 1920,
    height: 1080,
    defaultVisible: false,
    moment: true,
    rerouteAudio: false,
    zIndex: 75,
    obs: true,
    note: "Fullscreen AWAY panel — badge, OBS Ninja iframe, capybara prompt; skrytý mimo NEJSEM TU."
  },
  {
    id: "entity",
    label: "LIVE badge + host team",
    inputName: "MIA_ENTITY",
    file: "entity-overlay.html",
    urlKey: "status",
    width: 300,
    height: 130,
    defaultVisible: true,
    moment: false,
    rerouteAudio: false,
    zIndex: 70,
    obs: true,
    note: "Levý horní roh — LIVE / NEJSEM TU + team bar v host režimu."
  },
  {
    id: "viewer_strip",
    label: "Viewer strip",
    inputName: "MIA_VIEWER_STRIP",
    file: "viewer-strip-overlay.html",
    urlKey: "viewerStrip",
    width: 720,
    height: 120,
    defaultVisible: true,
    moment: false,
    rerouteAudio: false,
    zIndex: 65,
    obs: true,
    note: "Levý dolní roh — recentParticipants (chat + gift, bez coins)."
  },
  {
    id: "backpack",
    label: "Koj batoh",
    inputName: "MIA_BACKPACK",
    file: "kojnozrout-backpack-overlay.html",
    urlKey: "backpack",
    width: 320,
    height: 240,
    defaultVisible: false,
    moment: true,
    rerouteAudio: false,
    zIndex: 60,
    obs: true
  },
  {
    id: "bowl",
    label: "Koj miska",
    inputName: "MIA_BOWL",
    nameAliases: ["KOJNOZROUT_BOWL_V2", "KOJNOZROUT_BOWL", "KOJ_MISKA"],
    file: "kojnozrout-bowl-overlay.html",
    urlKey: "bowl",
    urlQuery: `v=${GFX_CACHE_BUST}`,
    width: 320,
    height: 240,
    defaultVisible: true,
    moment: false,
    rerouteAudio: false,
    zIndex: 55,
    obs: true,
    note: "Pravý horní — plnění misky. Live alias: KOJNOZROUT_BOWL_V2."
  },
  {
    id: "runtime",
    label: "Koj sprite",
    inputName: "MIA_KOJ_RUNTIME",
    nameAliases: ["KOJNOZROUT_RUNTIME", "KOJ_RUNTIME", "KOJ_SPRITE"],
    file: "kojnozrout-runtime.html",
    urlKey: "runtime",
    urlQuery: `v=${GFX_CACHE_BUST}`,
    width: 400,
    height: 400,
    defaultVisible: true,
    moment: false,
    rerouteAudio: false,
    zIndex: 50,
    obs: true,
    note: "Pravý dolní — Kojnožrout + strip avatarů v runtime. Live alias: KOJNOZROUT_RUNTIME."
  },
  ...BODY_PARTS.map((row) => ({
    id: row.id,
    label: row.label,
    inputName: row.inputName,
    file: row.file,
    urlKey: row.urlKey,
    urlQuery: row.urlQuery,
    width: row.width,
    height: row.height,
    defaultVisible: row.defaultVisible,
    moment: row.moment,
    rerouteAudio: row.rerouteAudio,
    zIndex: row.zIndex,
    obs: row.obs,
    note: row.note
  })),
  {
    id: "graphics_preview",
    label: "Graphics Studio preview",
    inputName: "MIA_GRAPHICS_PREVIEW",
    file: "mia-graphics-preview.html",
    urlKey: "graphicsPreview",
    width: 512,
    height: 512,
    defaultVisible: false,
    moment: false,
    rerouteAudio: false,
    zIndex: 45,
    obs: true,
    note: "Realtime náhled z MIA Graphics Studio (avatar / dokument). Volitelný Browser Source."
  },
  {
    id: "speech",
    label: "Speech bubliny",
    inputName: "MIA_SPEECH",
    nameAliases: ["MIA_BUBBLE", "MIA_SPEECH_OVERLAY", "SPEECH_OVERLAY"],
    file: "speech-overlay.html",
    urlKey: "speech",
    urlQuery: `v=${GFX_CACHE_BUST}`,
    width: 1920,
    height: 1080,
    defaultVisible: true,
    moment: false,
    rerouteAudio: false,
    zIndex: 40,
    obs: true,
    note: "Fullscreen — MIA/Koj bubliny; nikdy coins. Live alias: MIA_BUBBLE."
  },
  {
    id: "voice",
    label: "TTS audio",
    inputName: "MIA_VOICE",
    file: "mia-voice-overlay.html",
    urlKey: "voice",
    width: 200,
    height: 80,
    defaultVisible: true,
    moment: false,
    rerouteAudio: true,
    zIndex: 30,
    obs: true,
    note: "Control audio ON + Monitor and Output → VB-Cable → TikTok mic."
  }
];

const NON_OBS_LAYERS = [
  {
    id: "chat",
    label: "Chat overlay",
    file: "chat-overlay.html",
    obs: false,
    note: "Volitelné — Kick/TikTok chat; není v default split."
  },
  {
    id: "dashboard",
    label: "Streamer dashboard",
    file: "mia-streamer-dashboard.html",
    obs: false,
    note: "Pro streamera v prohlížeči, ne do OBS."
  }
];

const GIFT_VIDEO_TIERS = ["T1", "T2", "T3", "T4", "T5"];

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function buildBaseUrl(port = DEFAULT_PORT) {
  return `http://127.0.0.1:${port}`;
}

function buildSplitUrls(port = DEFAULT_PORT, options = {}) {
  const base = buildBaseUrl(port);
  const urls = {};
  for (const layer of BROWSER_LAYERS) {
    if (layer.urlKey) {
      const query = layer.urlQuery ? `?${layer.urlQuery}` : "";
      urls[layer.urlKey] = `${base}/${layer.file}${query}`;
    }
  }
  urls.hub = `${base}/mia-live-hub.html`;
  urls.dashboard = `${base}/mia-streamer-dashboard.html`;
  const bodySyncMode = resolveBodySyncMode(options);
  return applyBodySyncToSplitUrls(urls, base, bodySyncMode);
}

function buildLiveManifest(options = {}) {
  const port = Number(options.port || DEFAULT_PORT);
  const baseUrl = safeString(options.baseUrl, buildBaseUrl(port)).replace(/\/$/, "");
  const scene =
    safeString(options.sceneName) ||
    safeString(process.env.MIA_OBS_CAMERA_SCENE) ||
    DEFAULT_SCENE;

  const bodySyncMode = resolveBodySyncMode(options);
  const splitUrls = buildSplitUrls(port, options);

  const browserLayers = BROWSER_LAYERS.map((layer) => ({
    ...layer,
    url:
      splitUrls[layer.urlKey] ||
      `${baseUrl}/${layer.file}${layer.urlQuery ? `?${layer.urlQuery}` : ""}`,
    sceneItemEnabled: layer.defaultVisible === true
  }));

  return {
    version: "1.0.0",
    scene,
    baseUrl,
    port,
    tikfinityIngest: `${baseUrl}/ingest`,
    bodySync: bodySyncMode,
    splitUrls,
    browserLayers,
    nonObsLayers: NON_OBS_LAYERS.map((row) => ({
      ...row,
      url: `${baseUrl}/${row.file}`
    })),
    giftVideo: {
      scene,
      tiers: GIFT_VIDEO_TIERS,
      note: "FFmpeg/VLC sloty T1_01… — npm run media:scan && npm run media:add-obs-slots"
    },
    audioChain: {
      voiceSource: "MIA_VOICE",
      rerouteAudio: true,
      monitor: "Monitor and Output",
      tiktokMic: "VB-Audio Virtual Cable Output",
      commands: ["npm run obs:ensure-voice", "npm run obs:prepare-tiktok"]
    },
    automation: {
      applyHands: "npm run obs:apply-hands",
      bodySyncDefault: "hybrid (?sync=hybrid on MIA body browser sources)",
      ensureStreamerCameras: "npm run obs:ensure-streamer-cameras",
      applyAwayScene: "npm run obs:apply-away-scene",
      awayManifest: "npm run obs:away-manifest",
      verify: "npm run obs:verify-stream-ready",
      streamReady: "npm run obs:stream-ready -- --fix --wait",
      fixLayout: "npm run obs:fix-layout",
      startupCheck: `${baseUrl}/startup-check.html`
    },
    zOrderNote:
      "V OBS seřaď browser sources shora dolů podle zIndex (100=nahoře v seznamu = vpředu)."
  };
}

function formatManifestText(manifest = buildLiveManifest()) {
  const lines = [];
  lines.push("=== MIA OBS LIVE MANIFEST ===");
  lines.push(`Scéna: ${manifest.scene}`);
  lines.push(`MIA: ${manifest.baseUrl}`);
  lines.push(`TikFinity ingest: ${manifest.tikfinityIngest}`);
  lines.push("");
  lines.push("--- Browser sources (split mode) ---");
  lines.push(
    "z | viditelný | moment | OBS jméno | rozměr | URL"
  );

  const sorted = [...manifest.browserLayers].sort((a, b) => b.zIndex - a.zIndex);
  for (const row of sorted) {
    if (row.obs === false) continue;
    lines.push(
      [
        String(row.zIndex).padStart(3, " "),
        row.defaultVisible ? "ANO" : "ne ",
        row.moment ? "ano" : "ne ",
        row.inputName,
        `${row.width}x${row.height}`,
        row.url
      ].join(" | ")
    );
    if (row.note) {
      lines.push(`      → ${row.note}`);
    }
  }

  lines.push("");
  lines.push("--- Gift video (FFmpeg/VLC, ne browser) ---");
  lines.push(`Tiery: ${manifest.giftVideo.tiers.join(", ")} ve scéně ${manifest.scene}`);
  lines.push(`→ ${manifest.giftVideo.note}`);
  lines.push("");
  lines.push("--- Audio (TTS → TikTok) ---");
  lines.push(`Zdroj: ${manifest.audioChain.voiceSource} · reroute_audio=ON · ${manifest.audioChain.monitor}`);
  lines.push(`TikTok mikrofon: ${manifest.audioChain.tiktokMic}`);
  for (const cmd of manifest.audioChain.commands) {
    lines.push(`→ ${cmd}`);
  }
  lines.push("");
  lines.push("--- Automatizace ---");
  for (const [key, value] of Object.entries(manifest.automation)) {
    lines.push(`${key}: ${value}`);
  }
  lines.push("");
  return lines.join("\n");
}

module.exports = {
  DEFAULT_SCENE,
  BROWSER_LAYERS,
  NON_OBS_LAYERS,
  GIFT_VIDEO_TIERS,
  GFX_CACHE_BUST,
  GIFT_ANIM_CACHE_BUST,
  OBS_INPUT_NAME_ALIASES,
  resolveObsInputNames,
  buildBaseUrl,
  buildSplitUrls,
  buildLiveManifest,
  formatManifestText
};
