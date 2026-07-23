(function (global) {
  "use strict";

  function loadScript(url) {
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = url;
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error(`plugin_load_failed:${url}`));
      document.head.appendChild(s);
    });
  }

  function createBrowserPluginHost(core, opts = {}) {
    const { host, register, listPublic } = core.createPluginHost({
      onError(err, event) {
        if (typeof opts.onError === "function") opts.onError(err, event);
      },
      getContext: () => opts.getContext?.() || {}
    });

    const pluginGlobals = {
      "grid-overlay": "MIA_PAINT_PLUGIN_GRID_OVERLAY",
      "koj-factory-export": "MIA_PAINT_PLUGIN_KOJ_FACTORY"
    };

    async function loadFromServer(apiBase) {
      const resp = await fetch(`${apiBase}/mia/paint/plugins`);
      const data = await resp.json();
      if (!data.ok) return [];
      const loaded = [];
      for (const meta of data.plugins || []) {
        const ok = await activatePlugin(meta, apiBase);
        if (ok) loaded.push(meta.id);
      }
      return loaded;
    }

    async function activatePlugin(meta, apiBase) {
      const globalKey = pluginGlobals[meta.id];
      if (globalKey && !global[globalKey]?.activate) {
        await loadScript(`${apiBase}${meta.scriptUrl}`);
      }
      const mod = global[globalKey];
      if (!mod?.activate) return false;
      const result = register(meta, (hostCore) => {
        mod.activate({
          pluginId: meta.id,
          on: hostCore.on.bind(hostCore),
          registerMenuItem: hostCore.registerMenuItem.bind(hostCore),
          getContext: hostCore.getContext.bind(hostCore)
        });
      });
      return result.ok;
    }

    function emitAfterRender(ctx) {
      host.emit("afterRender", ctx);
    }

    function emitDocumentChange(doc) {
      host.emit("documentChange", { document: doc });
    }

    function getMenuItems() {
      return [...host.menuItems.values()];
    }

    return {
      host,
      loadFromServer,
      listPublic,
      emitAfterRender,
      emitDocumentChange,
      getMenuItems
    };
  }

  global.MIA_PAINT_PLUGIN_HOST = { createBrowserPluginHost };
})(typeof globalThis !== "undefined" ? globalThis : window);
