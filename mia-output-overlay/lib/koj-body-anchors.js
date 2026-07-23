/**
 * Koj cyborg body anchors (v23 art / v25 JSON-backed).
 *
 * Normalized 0–1 rects & pivots relative to the visible sprite bbox
 * (object-fit: contain, bottom-center). Prefer editing via Soft Neon Rig Desk
 * (`/mia-paint/rig-desk.html`) → `/anchors/koj.json`. This module remains the
 * sync fallback when JSON fetch fails.
 *
 * Rect format: { cx, cy, w, h } — center + size in normalized sprite space.
 * Pivot format: { x, y } — transform-origin in normalized sprite space.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
  root.KojBodyAnchors = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  /** Art set these numbers were tuned against */
  const ART = {
    id: "koj-cyborg-v23",
    idleAsset: "assets/kojnozrout/moods/kojnozout-idle.png",
    note: "Pale mint belly plate + dual eyes; pear body fills most of PNG."
  };

  /**
   * Belly HUD glass (gift / clock / date / weather).
   * Tuned to the pale circular plate on cyborg idle — tighter than the old
   * loose 28%/46%/44%/30% CSS guess.
   */
  const belly = {
    cx: 0.5,
    cy: 0.575,
    w: 0.36,
    h: 0.28
  };

  /** Head region for interim clipped head layer (until part PNGs exist). */
  const head = {
    cx: 0.5,
    cy: 0.3,
    w: 0.78,
    h: 0.44
  };

  /** Neck pivot — transform-origin for head yaw/nod (normalized). */
  const neck = {
    x: 0.5,
    y: 0.48
  };

  /** Primary cyber eye (viewer-right lens) — soft projector origin. */
  const eye = {
    cx: 0.62,
    cy: 0.255,
    w: 0.14,
    h: 0.12
  };

  /** Organic eye (viewer-left) — reference only for tools. */
  const eyeOrganic = {
    cx: 0.38,
    cy: 0.27,
    w: 0.16,
    h: 0.14
  };

  /** Root / body pivots for part-rig (feet / torso weight). */
  const root = { x: 0.5, y: 1.0 };
  const body = { x: 0.5, y: 0.72 };

  function rectToCss(rect) {
    if (!rect) return null;
    return {
      left: (rect.cx - rect.w / 2) * 100,
      top: (rect.cy - rect.h / 2) * 100,
      width: rect.w * 100,
      height: rect.h * 100
    };
  }

  function applyRectStyle(el, rect) {
    if (!el || !rect) return;
    const css = rectToCss(rect);
    el.style.left = css.left.toFixed(3) + "%";
    el.style.top = css.top.toFixed(3) + "%";
    el.style.width = css.width.toFixed(3) + "%";
    el.style.height = css.height.toFixed(3) + "%";
  }

  function pivotToOrigin(pivot) {
    if (!pivot) return "50% 50%";
    return (pivot.x * 100).toFixed(2) + "% " + (pivot.y * 100).toFixed(2) + "%";
  }

  return {
    ART,
    version: 25,
    belly,
    head,
    neck,
    eye,
    eyeOrganic,
    root,
    body,
    rectToCss,
    applyRectStyle,
    pivotToOrigin
  };
});
