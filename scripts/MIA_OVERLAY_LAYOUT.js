"use strict";

/**
 * Manual overlay size / growth knobs for OBS browser sources.
 * Stored in data/overlay-layout.json — GET is public, POST is local-admin.
 * Overlays poll /overlay/layout and apply CSS vars (no coins / gift values).
 */

const fs = require("fs");
const path = require("path");

const STORE_PATH = path.resolve(__dirname, "..", "data", "overlay-layout.json");

const DEFAULTS = Object.freeze({
  version: 1,
  /** Multiplier on sprite max-height growth (evolution still applies). */
  growthMul: 0.82,
  /** Extra CSS scale on #spriteLayer (fit on portrait). */
  kojScale: 0.82,
  dockMaxW: 240,
  dockMaxH: 400,
  bellyScale: 0.88,
  chipScale: 0.9,
  propScale: 0.75,
  /** Viewer strip top offset in % of stage height. */
  viewerTopPct: 40,
  /** OBS Vision scale for TikTok portrait Koj browser (was 1.35). */
  obsKojScale: 1.0,
  /** Gift animation cast width multiplier. */
  giftCastScale: 0.72,
  /** Genesis overlay root scale. */
  genesisScale: 0.85,
  updatedAt: null
});

let cache = null;

function clamp(n, min, max, fallback) {
  const v = Number(n);
  if (!Number.isFinite(v)) return fallback;
  return Math.min(max, Math.max(min, v));
}

function normalize(raw = {}) {
  const src = raw && typeof raw === "object" ? raw : {};
  return {
    version: 1,
    growthMul: clamp(src.growthMul, 0.4, 1.4, DEFAULTS.growthMul),
    kojScale: clamp(src.kojScale, 0.4, 1.4, DEFAULTS.kojScale),
    dockMaxW: clamp(src.dockMaxW, 140, 520, DEFAULTS.dockMaxW),
    dockMaxH: clamp(src.dockMaxH, 180, 720, DEFAULTS.dockMaxH),
    bellyScale: clamp(src.bellyScale, 0.4, 1.4, DEFAULTS.bellyScale),
    chipScale: clamp(src.chipScale, 0.4, 1.4, DEFAULTS.chipScale),
    propScale: clamp(src.propScale, 0.4, 1.4, DEFAULTS.propScale),
    viewerTopPct: clamp(src.viewerTopPct, 8, 70, DEFAULTS.viewerTopPct),
    obsKojScale: clamp(src.obsKojScale, 0.45, 1.6, DEFAULTS.obsKojScale),
    giftCastScale: clamp(src.giftCastScale, 0.4, 1.2, DEFAULTS.giftCastScale),
    genesisScale: clamp(src.genesisScale, 0.5, 1.2, DEFAULTS.genesisScale),
    updatedAt: src.updatedAt || null
  };
}

function readFromDisk() {
  try {
    if (!fs.existsSync(STORE_PATH)) return normalize(DEFAULTS);
    const parsed = JSON.parse(fs.readFileSync(STORE_PATH, "utf8"));
    return normalize(parsed);
  } catch (_err) {
    return normalize(DEFAULTS);
  }
}

function getLayout({ forceReload = false } = {}) {
  if (!cache || forceReload) {
    cache = readFromDisk();
  }
  return { ...cache };
}

function saveLayout( partial = {}) {
  const next = normalize({ ...getLayout(), ...partial, updatedAt: new Date().toISOString() });
  const dir = path.dirname(STORE_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(STORE_PATH, JSON.stringify(next, null, 2), "utf8");
  cache = next;
  return getLayout();
}

function resetLayout() {
  cache = null;
  if (fs.existsSync(STORE_PATH)) {
    try {
      fs.unlinkSync(STORE_PATH);
    } catch (_err) {
      /* keep going — defaults still apply */
    }
  }
  return getLayout({ forceReload: true });
}

function resolveObsKojScale(platform, isPortrait, fallback) {
  const envRaw = process.env.MIA_KOJ_OBS_SCALE;
  if (envRaw != null && String(envRaw).trim() !== "") {
    const envScale = Number(envRaw);
    if (Number.isFinite(envScale) && envScale > 0) {
      return clamp(envScale, 0.45, 1.6, fallback);
    }
  }
  const layout = getLayout();
  if (platform === "tiktok" && isPortrait && Number.isFinite(layout.obsKojScale)) {
    return layout.obsKojScale;
  }
  return fallback;
}

module.exports = {
  DEFAULTS,
  STORE_PATH,
  getLayout,
  saveLayout,
  resetLayout,
  normalize,
  resolveObsKojScale
};
