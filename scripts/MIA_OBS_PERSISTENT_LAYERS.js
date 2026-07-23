"use strict";

/**
 * Vrstvy, které mají zůstat viditelné nad kamerou i gift videi (PNG Koj, miska, bubliny…).
 * Pořadí: nižší priorita = dřív nahoru, vyšší priorita = nakonec (nejvýš).
 */

const PERSISTENT_LAYER_RULES = [
  { priority: 10, pattern: /BOWL|MISKA/i },
  { priority: 20, pattern: /SPEECH|BUBBLE|CHAT_OVERLAY|MIA_BUBBLE/i },
  { priority: 30, pattern: /ENTITY|STATUS|LIVE|BADGE/i },
  { priority: 40, pattern: /STORY.?MOMENT|STORY_MOMENT/i },
  // Combo/spam alert (MIA_COMBO) je fullscreen alert přes gift vlnu — musí být
  // nad gift videem, jinak ho video překryje. Stejně tak T0 flyby a duel.
  { priority: 45, pattern: /COMBO|T0.?FLYBY|FLYBY|MIA_DUEL|DUEL/i },
  { priority: 50, pattern: /VOICE|HLAS|TTS|MIA_VOICE/i },
  {
    priority: 60,
    pattern: /KOJNOZROUT|KOJNOZ|KOJ_|_KOJ|ZROUT|SPRITE|MASCOT|RUNTIME/i
  }
];

const GIFT_VIDEO_PATTERN = /^T[1-6]_(VIDEO|PHOTO)|^PROFILE_VIDEO/i;

/**
 * Alert overlaye (combo/spam, T0 flyby, duel) drží z-order NAD videem, ale
 * NESMÍ se natvrdo zapínat — jsou to fullscreen 1920×1080 browser zdroje a
 * trvalé renderování 3 dalších CEF vrstev zbytečně žere paměť/GPU (na slabém
 * APU i příčina pádu OBS při alokaci video framu). Zapínají se vlastní logikou
 * při aktivaci momentu; tady je jen zvedáme, pokud už zapnuté jsou.
 */
const RAISE_ONLY_PATTERN = /COMBO|T0.?FLYBY|FLYBY|MIA_DUEL|DUEL/i;

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function parseExtraPersistentPatterns(raw = "") {
  return safeString(raw)
    .split(/[,;|]+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      try {
        return new RegExp(part, "i");
      } catch (_err) {
        const escaped = part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        return new RegExp(escaped, "i");
      }
    });
}

function buildPersistentLayerRules(extraPatterns = []) {
  const extras = Array.isArray(extraPatterns) ? extraPatterns : [];
  if (!extras.length) {
    return PERSISTENT_LAYER_RULES;
  }

  return [
    ...PERSISTENT_LAYER_RULES,
    ...extras.map((pattern, index) => ({
      priority: 55 + index,
      pattern
    }))
  ];
}

function isGiftVideoSourceName(sourceName = "") {
  return GIFT_VIDEO_PATTERN.test(safeString(sourceName));
}

function getPersistentOverlayPriority(sourceName = "", rules = PERSISTENT_LAYER_RULES) {
  const name = safeString(sourceName);
  if (!name || isGiftVideoSourceName(name)) {
    return 0;
  }

  for (const rule of rules) {
    if (rule.pattern.test(name)) {
      return rule.priority;
    }
  }
  return 0;
}

function isPersistentOverlaySource(sourceName = "", rules = PERSISTENT_LAYER_RULES) {
  return getPersistentOverlayPriority(sourceName, rules) > 0;
}

/**
 * Smí se zdroj při zvedání nad video i zapnout, když je skrytý?
 * Pro alert overlaye (combo/flyby/duel) vrací false → jen z-order, žádné force-enable.
 */
function shouldForceEnablePersistentOverlay(sourceName = "") {
  const name = safeString(sourceName);
  if (!name || isGiftVideoSourceName(name)) return false;
  return !RAISE_ONLY_PATTERN.test(name);
}

function sortPersistentOverlaySources(sourceNames = [], rules = PERSISTENT_LAYER_RULES) {
  return [...sourceNames]
    .filter((name) => isPersistentOverlaySource(name, rules))
    .sort(
      (a, b) =>
        getPersistentOverlayPriority(a, rules) - getPersistentOverlayPriority(b, rules)
    );
}

function shouldKeepPersistentOverlaysAboveVideo(runtimeConfig = {}, env = process.env) {
  if (runtimeConfig?.obs?.keepPersistentOverlaysAboveVideo === false) {
    return false;
  }
  const envFlag = safeString(
    env?.MIA_OBS_KEEP_PERSISTENT_LAYERS_ABOVE_VIDEO ||
      env?.OBS_KEEP_PERSISTENT_LAYERS_ABOVE_VIDEO
  ).toLowerCase();
  if (envFlag === "0" || envFlag === "false" || envFlag === "off") {
    return false;
  }
  return true;
}

function resolvePersistentLayerRules(runtimeConfig = {}, env = process.env) {
  const fromConfig = safeString(runtimeConfig?.obs?.persistentLayerPatterns);
  const fromEnv = safeString(
    env?.MIA_OBS_PERSISTENT_LAYER_PATTERNS || env?.OBS_PERSISTENT_LAYER_PATTERNS
  );
  return buildPersistentLayerRules(parseExtraPersistentPatterns(fromConfig || fromEnv));
}

module.exports = {
  PERSISTENT_LAYER_RULES,
  GIFT_VIDEO_PATTERN,
  RAISE_ONLY_PATTERN,
  isGiftVideoSourceName,
  getPersistentOverlayPriority,
  isPersistentOverlaySource,
  shouldForceEnablePersistentOverlay,
  sortPersistentOverlaySources,
  shouldKeepPersistentOverlaysAboveVideo,
  resolvePersistentLayerRules
};
