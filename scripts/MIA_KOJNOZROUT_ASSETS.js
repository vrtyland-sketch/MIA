"use strict";

const fs = require("fs");
const path = require("path");

const ASSETS_ROOT = path.resolve(
  __dirname,
  "..",
  "mia-output-overlay",
  "assets",
  "kojnozrout"
);

const EVOLUTION_DIR = path.join(ASSETS_ROOT, "evolution");
const STAGES_DIR = path.join(ASSETS_ROOT, "stages");
const ITEMS_DIR = path.join(ASSETS_ROOT, "items");

const EVOLUTION_STAGE_TIERS = ["egg", "hatchling", "sprout", "guardian", "legend"];
const STAGE_ASSET_VER = "?v=2";

const CORE_MOODS = ["idle", "happy", "hungry", "excited", "full"];

const VITAL_MOODS = ["sleepy", "sick", "sad", "annoyed"];

const {
  MASTER_MOODS,
  FULL_DERIVE_MAP,
  EATING_VARIANT_COUNT,
  listEatingVariantKeys,
  DERIVED_MOOD_KEYS
} = require("./KOJNOZROUT_MOOD_DERIVE");

const EXTENDED_MOODS = DERIVED_MOOD_KEYS.filter(
  (key) => !/^eating-\d{2}$/.test(key)
);

const EATING_VARIANT_KEYS = listEatingVariantKeys(EATING_VARIANT_COUNT);

const REQUIRED_MOODS = [...new Set([...MASTER_MOODS, ...DERIVED_MOOD_KEYS])];

const MOOD_FALLBACKS = {
  sleepy: "idle",
  sick: "sick",
  sad: "sad",
  annoyed: "stressed",
  warm: "idle",
  eating: "eating-01",
  feeding: "eating-01",
  laugh: "happy",
  stressed: "stressed",
  watch: "warm",
  groove: "happy",
  dance: "excited",
  party: "laugh",
  curious: "idle",
  love: "happy",
  celebrate: "laugh",
  cheer: "excited",
  hype: "excited",
  wave: "happy",
  proud: "full",
  shy: "warm",
  surprised: "excited",
  thinking: "idle",
  calm: "warm",
  cozy: "warm",
  gift: "happy",
  thanks: "laugh",
  combo: "excited",
  duel: "annoyed",
  story: "warm",
  flyby: "happy",
  feeding: "eating",
  "eating-01": "eating",
  "eating-02": "eating",
  "eating-03": "eating",
  "eating-04": "eating",
  "eating-05": "eating",
  "eating-06": "eating",
  "eating-07": "eating",
  "eating-08": "eating",
  "eating-09": "excited",
  "eating-10": "happy",
  "eating-11": "eating",
  "eating-12": "full",
  "eating-13": "eating",
  "eating-14": "warm",
  "eating-15": "laugh",
  "eating-16": "hungry",
  perch: "idle",
  hop: "excited",
  play: "happy",
  "egg-rest": "idle",
  "combo-fire": "excited",
  "duel-ready": "annoyed",
  "hype-jump": "excited"
};

function fileExists(filePath) {
  try {
    return fs.existsSync(filePath) && fs.statSync(filePath).size > 0;
  } catch (_err) {
    return false;
  }
}

function inspectKojnozoutAssets(rootDir = ASSETS_ROOT) {
  const moodsDir = path.join(rootDir, "moods");
  const missing = [];
  const present = [];
  const vitalPresent = [];
  const vitalMissing = [];
  const extendedPresent = [];
  const extendedMissing = [];

  for (const mood of CORE_MOODS) {
    const filePath = path.join(moodsDir, `kojnozout-${mood}.png`);
    if (fileExists(filePath)) {
      present.push({
        mood,
        path: filePath.replace(/\\/g, "/"),
        bytes: fs.statSync(filePath).size
      });
    } else {
      missing.push({
        mood,
        expected: `assets/kojnozrout/moods/kojnozout-${mood}.png`
      });
    }
  }

  for (const mood of VITAL_MOODS) {
    const filePath = path.join(moodsDir, `kojnozout-${mood}.png`);
    if (fileExists(filePath)) {
      vitalPresent.push({ mood, path: filePath.replace(/\\/g, "/") });
    } else {
      vitalMissing.push({
        mood,
        fallback: MOOD_FALLBACKS[mood] || "idle",
        expected: `assets/kojnozrout/moods/kojnozout-${mood}.png`
      });
    }
  }

  for (const mood of EXTENDED_MOODS) {
    const filePath = path.join(moodsDir, `kojnozout-${mood}.png`);
    if (fileExists(filePath)) {
      extendedPresent.push({ mood, path: filePath.replace(/\\/g, "/") });
    } else {
      extendedMissing.push({
        mood,
        fallback: MOOD_FALLBACKS[mood] || "idle",
        expected: `assets/kojnozrout/moods/kojnozout-${mood}.png`
      });
    }
  }

  for (const mood of EATING_VARIANT_KEYS) {
    const filePath = path.join(moodsDir, `kojnozout-${mood}.png`);
    if (fileExists(filePath)) {
      extendedPresent.push({ mood, path: filePath.replace(/\\/g, "/") });
    } else {
      extendedMissing.push({
        mood,
        fallback: MOOD_FALLBACKS[mood] || "eating",
        expected: `assets/kojnozrout/moods/kojnozout-${mood}.png`
      });
    }
  }

  for (const mood of MASTER_MOODS) {
    if (CORE_MOODS.includes(mood) || VITAL_MOODS.includes(mood)) continue;
    const filePath = path.join(moodsDir, `kojnozout-${mood}.png`);
    if (fileExists(filePath)) {
      extendedPresent.push({ mood, path: filePath.replace(/\\/g, "/") });
    } else {
      extendedMissing.push({
        mood,
        fallback: MOOD_FALLBACKS[mood] || "idle",
        expected: `assets/kojnozrout/moods/kojnozout-${mood}.png`
      });
    }
  }

  const ok = missing.length === 0 && vitalMissing.length === 0 && extendedMissing.length === 0;

  return {
    ok,
    rootDir,
    requiredCount: CORE_MOODS.length,
    presentCount: present.length,
    missingCount: missing.length,
    present,
    missing,
    vitalMoods: {
      required: VITAL_MOODS,
      present: vitalPresent,
      missing: vitalMissing,
      fallbacks: MOOD_FALLBACKS
    },
    extendedMoods: {
      required: EXTENDED_MOODS,
      present: extendedPresent,
      missing: extendedMissing,
      fallbacks: MOOD_FALLBACKS
    },
    allMoods: REQUIRED_MOODS,
    obsRuntimeUrl: "http://127.0.0.1:3000/kojnozrout-runtime.html",
    obsBackpackUrl: "http://127.0.0.1:3000/kojnozrout-backpack-overlay.html",
    prepareHint:
      missing.length > 0 || vitalMissing.length > 0 || extendedMissing.length > 0
        ? "npm run generate:koj-moods && npm run restore:koj-sprites"
        : null
  };
}

function resolveMoodSpritePath(mood = "idle", rootDir = ASSETS_ROOT) {
  const key = String(mood || "idle").toLowerCase();
  const moodsDir = path.join(rootDir, "moods");
  const primary = path.join(moodsDir, `kojnozout-${key}.png`);
  if (fileExists(primary)) return primary;

  if (/^eating-\d{2}$/.test(key)) {
    for (const variant of EATING_VARIANT_KEYS) {
      const variantPath = path.join(moodsDir, `kojnozout-${variant}.png`);
      if (fileExists(variantPath)) return variantPath;
    }
  }

  const fallback = MOOD_FALLBACKS[key] || "idle";
  const fallbackPath = path.join(moodsDir, `kojnozout-${fallback}.png`);
  if (fileExists(fallbackPath)) return fallbackPath;

  return null;
}

function loadKojMoodSpriteBuffer(mood = "idle", rootDir = ASSETS_ROOT) {
  const filePath = resolveMoodSpritePath(mood, rootDir);
  if (filePath) {
    return {
      buffer: fs.readFileSync(filePath),
      source: "asset_png",
      mood,
      path: filePath.replace(/\\/g, "/")
    };
  }

  const { renderKojnozoutMood, renderEatingVariant, ALL_MOODS } = require("./kojnozrout_sprite_renderer");
  const key = String(mood || "idle").toLowerCase();
  const eatingMatch = key.match(/^eating-(\d{2})$/);
  if (eatingMatch) {
    return {
      buffer: renderEatingVariant(Number(eatingMatch[1])),
      source: "procedural",
      mood: key,
      path: null
    };
  }
  const renderMood = ALL_MOODS.includes(key) ? key : MOOD_FALLBACKS[key] || "happy";
  return {
    buffer: renderKojnozoutMood(renderMood),
    source: "procedural",
    mood: renderMood,
    path: null
  };
}

function resolveEvolutionTierSpriteUrl(tier = "egg") {
  const key = String(tier || "egg").toLowerCase();
  if (!key) return null;
  const filePath = path.join(EVOLUTION_DIR, `${key}.png`);
  if (fileExists(filePath)) {
    return `/assets/kojnozrout/evolution/${key}.png?v=2`;
  }
  return null;
}

function stageMoodCandidates(mood = "idle") {
  const key = String(mood || "idle").toLowerCase();
  const chain = [key];
  const fb = MOOD_FALLBACKS[key];
  if (fb && !chain.includes(fb)) chain.push(fb);
  if (!chain.includes("idle")) chain.push("idle");
  return chain;
}

function resolveStageMoodSpritePath(tier = "egg", mood = "idle", rootDir = ASSETS_ROOT) {
  const t = String(tier || "egg").toLowerCase();
  if (!EVOLUTION_STAGE_TIERS.includes(t)) return null;
  for (const key of stageMoodCandidates(mood)) {
    const filePath = path.join(rootDir, "stages", t, `kojnozout-${key}.png`);
    if (fileExists(filePath)) {
      return { filePath, moodKey: key, tier: t };
    }
  }
  return null;
}

function resolveStageMoodSpriteUrl(tier = "egg", mood = "idle", rootDir = ASSETS_ROOT) {
  const hit = resolveStageMoodSpritePath(tier, mood, rootDir);
  if (!hit) return null;
  return `/assets/kojnozrout/stages/${hit.tier}/kojnozout-${hit.moodKey}.png${STAGE_ASSET_VER}`;
}

function resolveItemIconUrl(itemId = "") {
  const key = String(itemId || "").toLowerCase();
  if (!key) return null;
  const filePath = path.join(ITEMS_DIR, `${key}.png`);
  if (fileExists(filePath)) {
    return `/assets/kojnozrout/items/${key}.png`;
  }
  return null;
}

module.exports = {
  ASSETS_ROOT,
  EVOLUTION_DIR,
  STAGES_DIR,
  ITEMS_DIR,
  EVOLUTION_STAGE_TIERS,
  CORE_MOODS,
  REQUIRED_MOODS,
  VITAL_MOODS,
  EATING_VARIANT_KEYS,
  EXTENDED_MOODS,
  MOOD_FALLBACKS,
  inspectKojnozoutAssets,
  resolveMoodSpritePath,
  resolveEvolutionTierSpriteUrl,
  resolveStageMoodSpritePath,
  resolveStageMoodSpriteUrl,
  resolveItemIconUrl,
  loadKojMoodSpriteBuffer
};
