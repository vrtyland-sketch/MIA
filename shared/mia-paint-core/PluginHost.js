"use strict";

const ALLOWED_HOOKS = new Set([
  "init",
  "destroy",
  "documentChange",
  "toolChange",
  "afterRender",
  "beforeSave"
]);

function createPluginHost(opts = {}) {
  const plugins = new Map();
  const hooks = {};
  for (const h of ALLOWED_HOOKS) hooks[h] = [];

  const host = {
    plugins,
    hooks,
    apiVersion: 1,
    emit(event, payload) {
      const list = hooks[event];
      if (!list?.length) return;
      for (const fn of list.slice()) {
        try {
          fn(payload, host);
        } catch (err) {
          if (typeof opts.onError === "function") opts.onError(err, event);
        }
      }
    },
    on(event, fn) {
      if (!ALLOWED_HOOKS.has(event) || typeof fn !== "function") return false;
      hooks[event].push(fn);
      return true;
    },
    off(event, fn) {
      const list = hooks[event];
      if (!list) return;
      const idx = list.indexOf(fn);
      if (idx >= 0) list.splice(idx, 1);
    },
    registerMenuItem(item) {
      if (!item?.id || !item.label) return false;
      host.menuItems.set(item.id, item);
      return true;
    },
    menuItems: new Map(),
    getContext() {
      return opts.getContext ? opts.getContext() : {};
    }
  };

  function validateManifest(manifest) {
    if (!manifest || typeof manifest !== "object") return { ok: false, error: "invalid_manifest" };
    const id = String(manifest.id || "").trim();
    if (!id || !/^[a-z0-9][a-z0-9\-_]{0,63}$/.test(id)) {
      return { ok: false, error: "invalid_plugin_id" };
    }
    if (!manifest.name || !manifest.entry) {
      return { ok: false, error: "missing_name_or_entry" };
    }
    const hookList = Array.isArray(manifest.hooks) ? manifest.hooks : [];
    for (const h of hookList) {
      if (!ALLOWED_HOOKS.has(h)) return { ok: false, error: `disallowed_hook:${h}` };
    }
    return { ok: true, id, manifest: { ...manifest, id } };
  }

  function register(manifest, activate) {
    const check = validateManifest(manifest);
    if (!check.ok) return check;
    if (plugins.has(check.id)) return { ok: false, error: "plugin_already_registered" };
    const record = {
      id: check.id,
      manifest: check.manifest,
      active: true,
      activate: typeof activate === "function" ? activate : null
    };
    plugins.set(check.id, record);
    if (record.activate) {
      try {
        record.activate(host);
      } catch (err) {
        plugins.delete(check.id);
        return { ok: false, error: "activate_failed", detail: String(err.message || err) };
      }
    }
    host.emit("init", { pluginId: check.id, manifest: check.manifest });
    return { ok: true, id: check.id };
  }

  function unregister(pluginId) {
    const id = String(pluginId || "");
    if (!plugins.has(id)) return false;
    host.emit("destroy", { pluginId: id });
    plugins.delete(id);
    return true;
  }

  function listPublic() {
    return [...plugins.values()].map((p) => ({
      id: p.id,
      name: p.manifest.name,
      version: p.manifest.version || "1.0.0",
      hooks: p.manifest.hooks || [],
      permissions: p.manifest.permissions || [],
      active: p.active
    }));
  }

  return {
    host,
    validateManifest,
    register,
    unregister,
    listPublic,
    ALLOWED_HOOKS
  };
}

module.exports = {
  ALLOWED_HOOKS,
  createPluginHost
};
