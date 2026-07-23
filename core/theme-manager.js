"use strict";

/**
 * Post-DoD thin Theme Manager MVP.
 * Themes: Cyber / Purple Robot / Arena.
 * Default OFF — enable with MIA_THEME_MANAGER=1.
 * Overlay hint via /overlay-state → theme.cssVars (miaPoints-safe; no coins).
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const STATE_PATH = path.join(ROOT, "data", "mia-theme.json");

const THEMES = Object.freeze({
  cyber: Object.freeze({
    id: "cyber",
    label: "Cyber",
    cssVars: Object.freeze({
      "--accent": "#5ee7ff",
      "--motif": "#7c5cff",
      "--theme-bg-deep": "#040a16",
      "--theme-bg-mid": "#0a1224",
      "--sn-mint": "100, 210, 255",
      "--sn-aqua": "94, 231, 255",
      "--sn-rim": "140, 180, 255"
    })
  }),
  purple_robot: Object.freeze({
    id: "purple_robot",
    label: "Purple Robot",
    cssVars: Object.freeze({
      "--accent": "#c77dff",
      "--motif": "#a078ff",
      "--theme-bg-deep": "#0a0618",
      "--theme-bg-mid": "#140e28",
      "--sn-mint": "160, 120, 255",
      "--sn-aqua": "180, 140, 255",
      "--sn-rim": "200, 160, 255"
    })
  }),
  arena: Object.freeze({
    id: "arena",
    label: "Arena",
    cssVars: Object.freeze({
      "--accent": "#ff8a4c",
      "--motif": "#ff5a7a",
      "--theme-bg-deep": "#120808",
      "--theme-bg-mid": "#1c1010",
      "--sn-mint": "255, 140, 70",
      "--sn-aqua": "255, 90, 122",
      "--sn-rim": "255, 180, 120"
    })
  })
});

const DEFAULT_THEME_ID = "cyber";

let memoryState = {
  themeId: DEFAULT_THEME_ID,
  updatedAt: 0
};

function envFlag(name) {
  const v = String(process.env[name] || "").trim().toLowerCase();
  if (!v) return null;
  if (v === "1" || v === "true" || v === "yes" || v === "on") return true;
  if (v === "0" || v === "false" || v === "no" || v === "off") return false;
  return null;
}

/** Default OFF. Unset or MIA_THEME_MANAGER=0 → false. */
function isThemeManagerEnabled(runtimeConfig = {}) {
  const env = envFlag("MIA_THEME_MANAGER");
  if (env === true) return true;
  if (env === false) return false;
  const cfg =
    runtimeConfig?.postDod?.themeManager ??
    runtimeConfig?.phase2?.themeManager ??
    runtimeConfig?.themeManager;
  if (cfg && cfg.enabled === true) return true;
  return false;
}

function normalizeThemeId(value) {
  const raw = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  if (THEMES[raw]) return raw;
  if (raw === "purple" || raw === "robot" || raw === "purplerobot") return "purple_robot";
  return null;
}

function loadDiskState() {
  try {
    if (!fs.existsSync(STATE_PATH)) return null;
    const parsed = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
    const id = normalizeThemeId(parsed?.themeId);
    if (!id) return null;
    return { themeId: id, updatedAt: Number(parsed.updatedAt) || 0 };
  } catch (_err) {
    return null;
  }
}

function saveDiskState(state) {
  try {
    fs.mkdirSync(path.dirname(STATE_PATH), { recursive: true });
    fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2), "utf8");
  } catch (_err) {
    // Non-fatal — memory still wins for the process.
  }
}

function ensureState() {
  if (memoryState.updatedAt) return memoryState;
  const disk = loadDiskState();
  if (disk) memoryState = disk;
  return memoryState;
}

function listThemes() {
  return Object.values(THEMES).map((t) => ({
    id: t.id,
    label: t.label
  }));
}

function getTheme(themeId = DEFAULT_THEME_ID) {
  const id = normalizeThemeId(themeId) || DEFAULT_THEME_ID;
  return THEMES[id];
}

function getActiveThemeId() {
  return ensureState().themeId || DEFAULT_THEME_ID;
}

function getActiveTheme() {
  return getTheme(getActiveThemeId());
}

/**
 * Apply theme by id. Returns { ok, theme } or { ok:false, error }.
 */
function setTheme(themeId) {
  const id = normalizeThemeId(themeId);
  if (!id) {
    return {
      ok: false,
      error: "unknown_theme",
      allowed: Object.keys(THEMES)
    };
  }
  memoryState = { themeId: id, updatedAt: Date.now() };
  saveDiskState(memoryState);
  return { ok: true, theme: getActiveTheme(), enabled: null };
}

function getOverlayThemeHint(runtimeConfig = {}) {
  const enabled = isThemeManagerEnabled(runtimeConfig);
  const theme = getActiveTheme();
  if (!enabled) {
    return {
      enabled: false,
      id: theme.id,
      label: theme.label,
      cssVars: null,
      note: "Theme Manager OFF (default). Set MIA_THEME_MANAGER=1 to apply CSS vars."
    };
  }
  return {
    enabled: true,
    id: theme.id,
    label: theme.label,
    cssVars: { ...theme.cssVars },
    updatedAt: ensureState().updatedAt || null
  };
}

function getThemeManagerPublicSnapshot(runtimeConfig = {}) {
  const enabled = isThemeManagerEnabled(runtimeConfig);
  const theme = getActiveTheme();
  return {
    enabled,
    active: theme.id,
    label: theme.label,
    themes: listThemes(),
    note: enabled
      ? "Theme Manager ON — overlay-state.theme.cssVars applied by overlays that listen"
      : "Theme Manager OFF (default). Enable: MIA_THEME_MANAGER=1"
  };
}

/** Test helper — reset memory without wiping disk unless requested. */
function _resetForTests(options = {}) {
  memoryState = {
    themeId: normalizeThemeId(options.themeId) || DEFAULT_THEME_ID,
    updatedAt: 0
  };
  if (options.wipeDisk && fs.existsSync(STATE_PATH)) {
    try {
      fs.unlinkSync(STATE_PATH);
    } catch (_err) {
      /* ignore */
    }
  }
}

module.exports = {
  THEMES,
  DEFAULT_THEME_ID,
  STATE_PATH,
  isThemeManagerEnabled,
  listThemes,
  getTheme,
  getActiveThemeId,
  getActiveTheme,
  setTheme,
  getOverlayThemeHint,
  getThemeManagerPublicSnapshot,
  normalizeThemeId,
  _resetForTests
};
