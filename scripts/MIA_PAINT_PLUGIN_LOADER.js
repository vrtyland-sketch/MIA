"use strict";

const fs = require("fs");
const path = require("path");

const PLUGINS_ROOT = path.join(__dirname, "..", "plugins", "mia-paint");
const ALLOWED_PERMISSIONS = new Set(["overlay", "menu", "document", "export"]);

function safePluginId(id) {
  return /^[a-z0-9][a-z0-9\-_]{0,63}$/.test(String(id || ""));
}

function readManifest(pluginDir) {
  const file = path.join(pluginDir, "manifest.json");
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (_err) {
    return null;
  }
}

function validateManifestPath(pluginDir, entry) {
  const entryPath = path.normalize(path.join(pluginDir, String(entry || "")));
  if (!entryPath.startsWith(pluginDir)) return null;
  if (!fs.existsSync(entryPath)) return null;
  return entryPath;
}

function discoverPlugins(root = PLUGINS_ROOT) {
  if (!fs.existsSync(root)) return [];
  const out = [];
  for (const name of fs.readdirSync(root)) {
    const dir = path.join(root, name);
    if (!fs.statSync(dir).isDirectory()) continue;
    const manifest = readManifest(dir);
    if (!manifest?.id || manifest.id !== name) continue;
    if (!safePluginId(manifest.id)) continue;
    const entryPath = validateManifestPath(dir, manifest.entry);
    if (!entryPath) continue;
    const perms = (manifest.permissions || []).filter((p) => ALLOWED_PERMISSIONS.has(p));
    out.push({
      id: manifest.id,
      name: manifest.name,
      version: manifest.version || "1.0.0",
      description: manifest.description || "",
      hooks: Array.isArray(manifest.hooks) ? manifest.hooks : [],
      permissions: perms,
      entry: manifest.entry,
      dir,
      entryPath,
      scriptUrl: `/mia/paint/plugins/${manifest.id}/${manifest.entry}`
    });
  }
  return out.sort((a, b) => a.id.localeCompare(b.id));
}

function getPluginScript(pluginId) {
  if (!safePluginId(pluginId)) return null;
  const list = discoverPlugins();
  const plugin = list.find((p) => p.id === pluginId);
  if (!plugin) return null;
  return {
    ...plugin,
    source: fs.readFileSync(plugin.entryPath, "utf8")
  };
}

module.exports = {
  PLUGINS_ROOT,
  ALLOWED_PERMISSIONS,
  discoverPlugins,
  getPluginScript,
  safePluginId
};
