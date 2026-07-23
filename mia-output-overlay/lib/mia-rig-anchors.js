/**
 * Soft Neon Rig Desk — shared anchors JSON loader (v25).
 *
 * Fetch /anchors/{koj|mia}.json with cache bust; fall back to KojBodyAnchors
 * or built-in MIA defaults. Schema: characterId, idleAsset, anchors{…}.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
  root.MiaRigAnchors = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  /** Incremental graphics bust (v32 freeze stays baseline) — see docs/GRAPHICS_v34_ASSET_CONTROL.md */
  const CACHE_BUST = "36-koj-unify";

  const MIA_DEFAULTS = {
    version: 25,
    characterId: "mia",
    artId: "mia-soft-neon-v1",
    idleAsset: "assets/mia/cyber/lip/01.png",
    note: "Built-in MIA defaults (pre-JSON).",
    anchors: {
      belly: { cx: 0.5, cy: 0.62, w: 0.28, h: 0.22 },
      head: { cx: 0.5, cy: 0.23, w: 0.76, h: 0.46 },
      neck: { x: 0.5, y: 0.46 },
      eye: { cx: 0.5, cy: 0.2, w: 0.18, h: 0.1 },
      root: { x: 0.5, y: 1.0 },
      body: { x: 0.5, y: 0.7 },
      hand: { cx: 0.72, cy: 0.55, w: 0.12, h: 0.1 }
    }
  };

  function clamp01(v, fallback) {
    const n = Number(v);
    if (!Number.isFinite(n)) return fallback;
    return Math.max(0, Math.min(1, n));
  }

  function normalizeRect(r, fb) {
    const base = fb || { cx: 0.5, cy: 0.5, w: 0.2, h: 0.2 };
    if (!r || typeof r !== "object") return { ...base };
    // Rig Desk may save pivots as {x,y} — map to cx/cy; keep fb size if w/h missing.
    return {
      cx: clamp01(r.cx != null ? r.cx : r.x, base.cx),
      cy: clamp01(r.cy != null ? r.cy : r.y, base.cy),
      w: clamp01(r.w, base.w),
      h: clamp01(r.h, base.h)
    };
  }

  function normalizePivot(p, fb) {
    const base = fb || { x: 0.5, y: 0.5 };
    if (!p || typeof p !== "object") return { ...base };
    return {
      x: clamp01(p.x != null ? p.x : p.cx, base.x),
      y: clamp01(p.y != null ? p.y : p.cy, base.y)
    };
  }

  function kojFallbackDoc() {
    const g = typeof globalThis !== "undefined" ? globalThis : null;
    const K = g && g.KojBodyAnchors ? g.KojBodyAnchors : null;
    if (!K) {
      return {
        version: 24,
        characterId: "koj",
        artId: "koj-cyborg-v23",
        idleAsset: "assets/kojnozrout/moods/kojnozout-idle.png",
        anchors: {
          belly: { cx: 0.5, cy: 0.575, w: 0.36, h: 0.28 },
          head: { cx: 0.5, cy: 0.3, w: 0.78, h: 0.44 },
          neck: { x: 0.5, y: 0.48 },
          eye: { cx: 0.62, cy: 0.255, w: 0.14, h: 0.12 },
          root: { x: 0.5, y: 1.0 },
          body: { x: 0.5, y: 0.72 }
        }
      };
    }
    return {
      version: K.version || 24,
      characterId: "koj",
      artId: (K.ART && K.ART.id) || "koj-cyborg-v23",
      idleAsset: (K.ART && K.ART.idleAsset) || "assets/kojnozrout/moods/kojnozout-idle.png",
      note: (K.ART && K.ART.note) || "",
      anchors: {
        belly: { ...K.belly },
        head: { ...K.head },
        neck: { ...K.neck },
        eye: K.eye ? { ...K.eye } : undefined,
        eyeOrganic: K.eyeOrganic ? { ...K.eyeOrganic } : undefined,
        root: { ...K.root },
        body: { ...K.body }
      }
    };
  }

  function fallbackDoc(characterId) {
    const id = String(characterId || "koj").toLowerCase();
    if (id === "mia") return JSON.parse(JSON.stringify(MIA_DEFAULTS));
    return kojFallbackDoc();
  }

  /**
   * Normalize any loose JSON into the canonical doc shape.
   */
  function normalizeDoc(raw, characterId) {
    const fb = fallbackDoc(characterId);
    if (!raw || typeof raw !== "object") return fb;
    const flat = raw.anchors && typeof raw.anchors === "object" ? raw.anchors : raw;
    const id = String(raw.characterId || characterId || fb.characterId || "koj").toLowerCase();
    const anchors = {
      belly: normalizeRect(flat.belly, fb.anchors.belly),
      head: normalizeRect(flat.head, fb.anchors.head),
      neck: normalizePivot(flat.neck, fb.anchors.neck),
      root: normalizePivot(flat.root, fb.anchors.root),
      body: normalizePivot(flat.body || flat.torso, fb.anchors.body)
    };
    if (flat.eye) anchors.eye = normalizeRect(flat.eye, fb.anchors.eye);
    else if (fb.anchors.eye) anchors.eye = { ...fb.anchors.eye };
    if (flat.eyeOrganic) anchors.eyeOrganic = normalizeRect(flat.eyeOrganic, fb.anchors.eyeOrganic);
    if (flat.hand) anchors.hand = normalizeRect(flat.hand, fb.anchors.hand || { cx: 0.7, cy: 0.55, w: 0.12, h: 0.1 });
    return {
      version: Number(raw.version) || fb.version || 25,
      characterId: id,
      artId: String(raw.artId || fb.artId || ""),
      idleAsset: String(raw.idleAsset || fb.idleAsset || ""),
      note: String(raw.note || fb.note || ""),
      anchors
    };
  }

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

  /**
   * Mutate a KojBodyAnchors-like API (or plain bag) from a normalized doc.
   */
  function applyDoc(target, doc) {
    if (!target || !doc) return target;
    const a = doc.anchors || doc;
    if (a.belly) target.belly = { ...a.belly };
    if (a.head) target.head = { ...a.head };
    if (a.neck) target.neck = { ...a.neck };
    if (a.eye) target.eye = { ...a.eye };
    if (a.eyeOrganic) target.eyeOrganic = { ...a.eyeOrganic };
    if (a.root) target.root = { ...a.root };
    if (a.body) target.body = { ...a.body };
    if (a.hand) target.hand = { ...a.hand };
    if (doc.version != null) target.version = doc.version;
    if (target.ART && typeof target.ART === "object") {
      if (doc.artId) target.ART.id = doc.artId;
      if (doc.idleAsset) target.ART.idleAsset = doc.idleAsset;
      if (doc.note) target.ART.note = doc.note;
    }
    return target;
  }

  /** Build a runtime bag with helpers (when KojBodyAnchors is missing). */
  function toRuntimeApi(doc) {
    const d = normalizeDoc(doc);
    const a = d.anchors;
    return {
      ART: { id: d.artId, idleAsset: d.idleAsset, note: d.note },
      version: d.version,
      characterId: d.characterId,
      belly: { ...a.belly },
      head: { ...a.head },
      neck: { ...a.neck },
      eye: a.eye ? { ...a.eye } : null,
      eyeOrganic: a.eyeOrganic ? { ...a.eyeOrganic } : null,
      root: { ...a.root },
      body: { ...a.body },
      hand: a.hand ? { ...a.hand } : null,
      rectToCss,
      applyRectStyle,
      pivotToOrigin
    };
  }

  function jsonUrl(characterId, bust) {
    const id = String(characterId || "koj").toLowerCase() === "mia" ? "mia" : "koj";
    const v = bust || CACHE_BUST;
    return "/anchors/" + id + ".json?v=" + encodeURIComponent(v) + "&_=" + Date.now();
  }

  /**
   * Fetch anchors JSON. Never throws — always returns a normalized doc.
   * @param {string} characterId
   * @param {{ bust?: string, base?: string }} [opts]
   */
  async function load(characterId, opts) {
    const id = String(characterId || "koj").toLowerCase();
    const bust = (opts && opts.bust) || CACHE_BUST;
    const base = (opts && opts.base) || "";
    const url = base.replace(/\/$/, "") + jsonUrl(id, bust);
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error("http_" + res.status);
      const raw = await res.json();
      return normalizeDoc(raw, id);
    } catch (_err) {
      return fallbackDoc(id);
    }
  }

  function headPivotRelative(head, neck) {
    if (!head || !neck) return { x: 0.5, y: 1 };
    const left = head.cx - head.w / 2;
    const top = head.cy - head.h / 2;
    const w = head.w || 1;
    const h = head.h || 1;
    return {
      x: (neck.x - left) / w,
      y: (neck.y - top) / h
    };
  }

  return {
    CACHE_BUST,
    MIA_DEFAULTS,
    normalizeDoc,
    fallbackDoc,
    applyDoc,
    toRuntimeApi,
    load,
    jsonUrl,
    rectToCss,
    applyRectStyle,
    pivotToOrigin,
    headPivotRelative
  };
});
