"use strict";

const fs = require("fs");
const path = require("path");
const os = require("os");

const PROJECTS_DIR = path.join(__dirname, "..", "data", "mia-paint", "projects");

function detectShellMode(query = {}) {
  if (query.shell === "1" || query.native === "1" || query.native === "tauri") return true;
  return process.env.MIA_PAINT_SHELL === "1" || process.env.MIA_PAINT_TAURI === "1";
}

function isTauriMode(query = {}, opts = {}) {
  if (query.native === "tauri" || opts.tauriMode) return true;
  return process.env.MIA_PAINT_TAURI === "1";
}

function getNativeCapabilities(opts = {}) {
  const shell = !!opts.shellMode;
  const tauri = isTauriMode(opts.query || {}, opts);
  const platform = process.platform;
  const ink = (shell || tauri) && platform === "win32";
  return {
    ok: true,
    shell,
    tauri,
    platform,
    runtime: tauri ? "mia-paint-tauri" : shell ? "mia-paint-shell" : "browser",
    capabilities: {
      filesystem: true,
      localProjects: fs.existsSync(PROJECTS_DIR),
      windowsInk: ink,
      pointerPressure: true,
      tauriNative: tauri,
      offline: shell || tauri,
      saveDialog: tauri,
      openDialog: tauri
    },
    paths: {
      projects: PROJECTS_DIR,
      home: os.homedir()
    }
  };
}

function resolveProjectPath(filename) {
  const base = path.basename(String(filename || ""));
  if (!base || base.includes("..")) return null;
  const full = path.join(PROJECTS_DIR, base.endsWith(".miapaint") ? base : `${base}.miapaint`);
  if (!full.startsWith(PROJECTS_DIR)) return null;
  return full;
}

function listLocalProjects() {
  if (!fs.existsSync(PROJECTS_DIR)) return [];
  return fs
    .readdirSync(PROJECTS_DIR)
    .filter((f) => f.endsWith(".miapaint"))
    .map((f) => {
      const full = path.join(PROJECTS_DIR, f);
      const stat = fs.statSync(full);
      return { name: f, path: full, size: stat.size, mtime: stat.mtime.toISOString() };
    });
}

module.exports = {
  PROJECTS_DIR,
  detectShellMode,
  isTauriMode,
  getNativeCapabilities,
  resolveProjectPath,
  listLocalProjects
};
