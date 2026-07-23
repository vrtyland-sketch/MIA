(function (global) {
  "use strict";

  const KOJ_EXPORT_HINT = "mia-output-overlay/assets/kojnozrout/custom/";

  function activate(api) {
    api.registerMenuItem({
      id: "koj-factory-export",
      label: "Export → Koj Factory",
      run(ctx) {
        if (typeof ctx?.exportKojFactory === "function") {
          ctx.exportKojFactory();
        } else if (typeof ctx?.notify === "function") {
          ctx.notify(`Export přes panel AI nebo Ctrl+Shift+K · ${KOJ_EXPORT_HINT}`);
        }
      }
    });
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = { activate, KOJ_EXPORT_HINT };
  }
  global.MIA_PAINT_PLUGIN_KOJ_FACTORY = { activate, KOJ_EXPORT_HINT };
})(typeof globalThis !== "undefined" ? globalThis : window);
