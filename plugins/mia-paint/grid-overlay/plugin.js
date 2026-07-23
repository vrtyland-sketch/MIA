(function (global) {
  "use strict";

  function activate(api) {
    let enabled = true;
    const step = 16;

    api.registerMenuItem({
      id: "grid-overlay-toggle",
      label: "Mřížka 16px",
      run() {
        enabled = !enabled;
      }
    });

    api.on("afterRender", (ctx) => {
      if (!enabled || !ctx?.overlayCtx || !ctx?.viewportState) return;
      const ctx2d = ctx.overlayCtx;
      const vp = ctx.viewportState;
      const zoom = vp.zoom || 1;
      const gridStep = step * zoom;
      if (gridStep < 4) return;
      const offX = vp.panX % gridStep;
      const offY = vp.panY % gridStep;
      ctx2d.save();
      ctx2d.strokeStyle = "rgba(123,108,255,0.12)";
      ctx2d.lineWidth = 1;
      ctx2d.beginPath();
      for (let x = offX; x < vp.width; x += gridStep) {
        ctx2d.moveTo(x, 0);
        ctx2d.lineTo(x, vp.height);
      }
      for (let y = offY; y < vp.height; y += gridStep) {
        ctx2d.moveTo(0, y);
        ctx2d.lineTo(vp.width, y);
      }
      ctx2d.stroke();
      ctx2d.restore();
    });
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = { activate };
  }
  global.MIA_PAINT_PLUGIN_GRID_OVERLAY = { activate };
})(typeof globalThis !== "undefined" ? globalThis : window);
