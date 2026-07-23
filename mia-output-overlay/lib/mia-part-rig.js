/**
 * MIA / Koj 2D part-rig foundation (v0).
 *
 * Parts with parent, pivot (transform-origin), and local x/y/rot/sx/sy.
 * Update walks parents → children and writes CSS transforms.
 * No editor UI yet — motion modules drive setLocal().
 *
 * Interim single-PNG: clip/overlay a head region and rotate around neck pivot
 * until real part art sheets exist. Do not treat whole-sprite squash as life.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
  root.MiaPartRig = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const TICK_MS = 36;

  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }

  /**
   * @param {object} [opts]
   * @param {number} [opts.tickMs]
   */
  function create(opts) {
    const tickMs = (opts && opts.tickMs) || TICK_MS;
    /** @type {Map<string, object>} */
    const parts = new Map();
    let order = [];
    let timer = null;
    let running = false;
    let onAfterUpdate = typeof opts?.onAfterUpdate === "function" ? opts.onAfterUpdate : null;

    function rebuildOrder() {
      const ids = [...parts.keys()];
      const visited = new Set();
      const out = [];
      function visit(id) {
        if (visited.has(id) || !parts.has(id)) return;
        visited.add(id);
        const p = parts.get(id);
        if (p.parent) visit(p.parent);
        out.push(id);
      }
      ids.forEach(visit);
      order = out;
    }

    /**
     * @param {string} id
     * @param {object} def
     * @param {string|null} [def.parent]
     * @param {{x:number,y:number}} [def.pivot] — normalized 0–1 origin
     * @param {HTMLElement} [def.el]
     * @param {{x?:number,y?:number,rot?:number,sx?:number,sy?:number}} [def.local]
     */
    function addPart(id, def) {
      if (!id) return;
      const local = Object.assign({ x: 0, y: 0, rot: 0, sx: 1, sy: 1 }, def && def.local);
      parts.set(id, {
        id,
        parent: (def && def.parent) || null,
        pivot: (def && def.pivot) || { x: 0.5, y: 0.5 },
        el: (def && def.el) || null,
        local,
        /** Accumulated from parents (for debugging / HUD sync). */
        world: { x: 0, y: 0, rot: 0, sx: 1, sy: 1 }
      });
      rebuildOrder();
      return parts.get(id);
    }

    function getPart(id) {
      return parts.get(id) || null;
    }

    function setEl(id, el) {
      const p = parts.get(id);
      if (!p) return;
      p.el = el || null;
      if (p.el && p.pivot) {
        p.el.style.transformOrigin =
          p.pivot.x * 100 + "% " + p.pivot.y * 100 + "%";
      }
    }

    function setPivot(id, pivot) {
      const p = parts.get(id);
      if (!p || !pivot) return;
      p.pivot = { x: pivot.x, y: pivot.y };
      if (p.el) {
        p.el.style.transformOrigin =
          p.pivot.x * 100 + "% " + p.pivot.y * 100 + "%";
      }
    }

    function setLocal(id, patch) {
      const p = parts.get(id);
      if (!p || !patch) return;
      if (patch.x != null) p.local.x = patch.x;
      if (patch.y != null) p.local.y = patch.y;
      if (patch.rot != null) p.local.rot = patch.rot;
      if (patch.sx != null) p.local.sx = patch.sx;
      if (patch.sy != null) p.local.sy = patch.sy;
    }

    function writeTransform(el, x, y, rot, sx, sy) {
      if (!el) return;
      el.style.transform =
        "translate(" +
        x.toFixed(3) +
        "px, " +
        y.toFixed(3) +
        "px) rotate(" +
        rot.toFixed(3) +
        "deg) scale(" +
        sx.toFixed(4) +
        ", " +
        sy.toFixed(4) +
        ")";
    }

    function update() {
      for (let i = 0; i < order.length; i++) {
        const p = parts.get(order[i]);
        if (!p) continue;
        const parent = p.parent ? parts.get(p.parent) : null;
        const px = parent ? parent.world.x : 0;
        const py = parent ? parent.world.y : 0;
        const pr = parent ? parent.world.rot : 0;
        const psx = parent ? parent.world.sx : 1;
        const psy = parent ? parent.world.sy : 1;

        // v0: local translate in px; rotation/scale compose simply.
        // Parent scale affects child translate; nested rot is additive (CSS tree).
        p.world.x = px + p.local.x * psx;
        p.world.y = py + p.local.y * psy;
        p.world.rot = pr + p.local.rot;
        p.world.sx = psx * p.local.sx;
        p.world.sy = psy * p.local.sy;

        // Each element gets its LOCAL transform only — CSS parent/child
        // nesting carries the rest when DOM mirrors the rig hierarchy.
        if (p.el) {
          if (p.pivot) {
            p.el.style.transformOrigin =
              p.pivot.x * 100 + "% " + p.pivot.y * 100 + "%";
          }
          writeTransform(
            p.el,
            p.local.x,
            p.local.y,
            p.local.rot,
            p.local.sx,
            p.local.sy
          );
        }
      }
      if (onAfterUpdate) onAfterUpdate(parts);
    }

    function tick() {
      if (!running) return;
      update();
    }

    function start() {
      if (running) return;
      running = true;
      update();
      timer = setInterval(tick, tickMs);
    }

    function stop() {
      running = false;
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    }

    function destroy() {
      stop();
      parts.forEach((p) => {
        if (p.el) p.el.style.transform = "";
      });
      parts.clear();
      order = [];
    }

    function listParts() {
      return order.slice();
    }

    return {
      addPart,
      getPart,
      setEl,
      setPivot,
      setLocal,
      update,
      start,
      stop,
      destroy,
      listParts,
      tickMs,
      clamp
    };
  }

  /**
   * Helper: build root → torso/body → head chain used by MIA + Koj.
   * Pass `headEl: null` + `includeHead: false` for whole-sprite mode
   * (no interim clip/mask seam).
   * @param {object} cfg
   * @param {HTMLElement} [cfg.rootEl]
   * @param {HTMLElement} [cfg.torsoEl]
   * @param {HTMLElement} [cfg.headEl]
   * @param {boolean} [cfg.includeHead] — default true when headEl set; false = whole sprite
   * @param {{x:number,y:number}} [cfg.rootPivot]
   * @param {{x:number,y:number}} [cfg.torsoPivot]
   * @param {{x:number,y:number}} [cfg.headPivot]
   * @param {string} [cfg.torsoId] — "torso" | "body"
   */
  function createStandardHumanoid(cfg) {
    const c = cfg || {};
    const torsoId = c.torsoId || "torso";
    const wantHead =
      c.includeHead === true || (c.includeHead !== false && !!c.headEl);
    const rig = create(c);
    rig.addPart("root", {
      parent: null,
      pivot: c.rootPivot || { x: 0.5, y: 1 },
      el: c.rootEl || null
    });
    rig.addPart(torsoId, {
      parent: "root",
      pivot: c.torsoPivot || { x: 0.5, y: 0.7 },
      el: c.torsoEl || null
    });
    if (wantHead) {
      rig.addPart("head", {
        parent: torsoId,
        pivot: c.headPivot || { x: 0.5, y: 1 },
        el: c.headEl || null
      });
    }
    return rig;
  }

  return { create, createStandardHumanoid, TICK_MS };
});
