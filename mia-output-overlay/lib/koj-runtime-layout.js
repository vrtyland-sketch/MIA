/**
 * Koj / overlay layout controls — applies /overlay/layout + URL overrides.
 * Open with ?layout=1 for a floating size panel (pointer-events enabled).
 */
(function (root) {
  "use strict";

  const KEYS = [
    "growthMul",
    "kojScale",
    "dockMaxW",
    "dockMaxH",
    "bellyScale",
    "chipScale",
    "propScale",
    "viewerTopPct",
    "obsKojScale",
    "giftCastScale",
    "genesisScale"
  ];

  const LABELS = {
    growthMul: "Růst sprite (evoluce ×)",
    kojScale: "Měřítko Koje",
    dockMaxW: "Dock max šířka px",
    dockMaxH: "Dock max výška px",
    bellyScale: "Břicho / projektor",
    chipScale: "Avatar chips",
    propScale: "Props (míč/mic…)",
    viewerTopPct: "Strip výška %",
    obsKojScale: "OBS Koj scale (portrait)",
    giftCastScale: "Gift cast",
    genesisScale: "Genesis overlay"
  };

  const RANGES = {
    growthMul: [0.4, 1.4, 0.01],
    kojScale: [0.4, 1.4, 0.01],
    dockMaxW: [140, 520, 4],
    dockMaxH: [180, 720, 4],
    bellyScale: [0.4, 1.4, 0.01],
    chipScale: [0.4, 1.4, 0.01],
    propScale: [0.4, 1.4, 0.01],
    viewerTopPct: [8, 70, 1],
    obsKojScale: [0.45, 1.6, 0.01],
    giftCastScale: [0.4, 1.2, 0.01],
    genesisScale: [0.5, 1.2, 0.01]
  };

  let state = null;
  let panelEl = null;
  let pollTimer = null;
  let onChange = null;

  function qs() {
    try {
      return new URLSearchParams(root.location.search);
    } catch (_err) {
      return new URLSearchParams();
    }
  }

  function num(v, fallback) {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  }

  function apiBase() {
    if (root.location && root.location.protocol && root.location.protocol.startsWith("http")) {
      return root.location.origin;
    }
    return "http://127.0.0.1:3000";
  }

  function fromUrl(base) {
    const p = qs();
    const out = { ...base };
    for (const key of KEYS) {
      if (p.has(key)) out[key] = num(p.get(key), out[key]);
    }
    // Short aliases
    if (p.has("scale")) out.kojScale = num(p.get("scale"), out.kojScale);
    if (p.has("growth")) out.growthMul = num(p.get("growth"), out.growthMul);
    return out;
  }

  function applyCss(layout) {
    const rootEl = document.documentElement;
    const stage = document.getElementById("stage");
    const targets = [rootEl, stage].filter(Boolean);
    const map = {
      "--koj-sprite-scale": String(layout.kojScale),
      "--koj-growth-mul": String(layout.growthMul),
      "--koj-dock-max-w": `${Math.round(layout.dockMaxW)}px`,
      "--koj-dock-max-h": `${Math.round(layout.dockMaxH)}px`,
      "--koj-belly-scale": String(layout.bellyScale),
      "--koj-chip-scale": String(layout.chipScale),
      "--koj-prop-scale": String(layout.propScale),
      "--koj-viewer-top": `${layout.viewerTopPct}%`,
      "--gift-cast-scale": String(layout.giftCastScale),
      "--genesis-scale": String(layout.genesisScale)
    };
    for (const el of targets) {
      for (const [k, v] of Object.entries(map)) {
        el.style.setProperty(k, v);
      }
    }
    if (typeof onChange === "function") onChange(layout);
  }

  function get() {
    return state ? { ...state } : null;
  }

  async function fetchLayout() {
    const res = await fetch(`${apiBase()}/overlay/layout`, { cache: "no-store" });
    if (!res.ok) throw new Error("layout_http_" + res.status);
    const body = await res.json();
    return body.layout || body;
  }

  async function saveLayout(partial) {
    const res = await fetch(`${apiBase()}/overlay/layout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(partial || state || {})
    });
    if (!res.ok) throw new Error("layout_save_" + res.status);
    const body = await res.json();
    state = fromUrl(body.layout || body);
    applyCss(state);
    syncPanel();
    return state;
  }

  async function resetLayout() {
    const res = await fetch(`${apiBase()}/overlay/layout/reset`, { method: "POST" });
    if (!res.ok) throw new Error("layout_reset_" + res.status);
    const body = await res.json();
    state = fromUrl(body.layout || body);
    applyCss(state);
    syncPanel();
    return state;
  }

  function syncPanel() {
    if (!panelEl || !state) return;
    for (const key of KEYS) {
      const input = panelEl.querySelector(`[data-key="${key}"]`);
      const val = panelEl.querySelector(`[data-val="${key}"]`);
      if (input) input.value = String(state[key]);
      if (val) val.textContent = String(state[key]);
    }
  }

  function buildPanel() {
    if (panelEl || !document.body) return;
    panelEl = document.createElement("div");
    panelEl.id = "kojLayoutPanel";
    panelEl.innerHTML = [
      '<div class="koj-layout-head"><strong>Velikost / růst</strong>',
      '<button type="button" data-act="hide" title="Schovat">×</button></div>',
      '<p class="koj-layout-hint">Ulož → OBS browser si to vytáhne z /overlay/layout. URL paramy mají prioritu.</p>',
      KEYS.map((key) => {
        const [min, max, step] = RANGES[key];
        return (
          `<label class="koj-layout-row"><span>${LABELS[key]}</span>` +
          `<input type="range" data-key="${key}" min="${min}" max="${max}" step="${step}" />` +
          `<em data-val="${key}">—</em></label>`
        );
      }).join(""),
      '<div class="koj-layout-actions">',
      '<button type="button" data-act="save">Uložit</button>',
      '<button type="button" data-act="reset">Reset</button>',
      '<button type="button" data-act="copy">Kopírovat URL</button>',
      "</div>"
    ].join("");

    const style = document.createElement("style");
    style.textContent = `
      #kojLayoutPanel {
        position: fixed; right: 10px; top: 10px; z-index: 99999;
        width: min(320px, 92vw); max-height: 92vh; overflow: auto;
        pointer-events: auto;
        background: rgba(8, 14, 22, 0.92);
        color: #e8f6ff; border: 1px solid rgba(120, 200, 255, 0.35);
        border-radius: 12px; padding: 10px 12px 12px;
        font: 12px/1.35 system-ui, sans-serif;
        box-shadow: 0 12px 32px rgba(0,0,0,0.45);
      }
      #kojLayoutPanel .koj-layout-head {
        display: flex; justify-content: space-between; align-items: center;
        margin-bottom: 6px; font-size: 13px;
      }
      #kojLayoutPanel .koj-layout-head button {
        background: transparent; border: 0; color: #9ec; font-size: 18px; cursor: pointer;
      }
      #kojLayoutPanel .koj-layout-hint { opacity: 0.72; margin: 0 0 8px; font-size: 11px; }
      #kojLayoutPanel .koj-layout-row {
        display: grid; grid-template-columns: 1fr 88px 36px; gap: 6px;
        align-items: center; margin: 5px 0;
      }
      #kojLayoutPanel .koj-layout-row em { font-style: normal; text-align: right; opacity: 0.85; }
      #kojLayoutPanel .koj-layout-actions { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
      #kojLayoutPanel .koj-layout-actions button {
        cursor: pointer; border-radius: 8px; border: 1px solid rgba(120,200,255,0.35);
        background: rgba(30, 60, 80, 0.9); color: #e8f6ff; padding: 6px 10px;
      }
    `;
    document.head.appendChild(style);
    document.body.appendChild(panelEl);

    panelEl.addEventListener("input", (ev) => {
      const input = ev.target;
      if (!input || !input.dataset || !input.dataset.key) return;
      const key = input.dataset.key;
      state[key] = num(input.value, state[key]);
      applyCss(state);
      syncPanel();
    });

    panelEl.addEventListener("click", async (ev) => {
      const btn = ev.target && ev.target.closest ? ev.target.closest("[data-act]") : null;
      if (!btn) return;
      const act = btn.getAttribute("data-act");
      try {
        if (act === "hide") {
          panelEl.style.display = "none";
        } else if (act === "save") {
          await saveLayout(state);
          btn.textContent = "Uloženo";
          setTimeout(() => {
            btn.textContent = "Uložit";
          }, 1200);
        } else if (act === "reset") {
          await resetLayout();
        } else if (act === "copy") {
          const u = new URL(root.location.href);
          for (const key of KEYS) u.searchParams.set(key, String(state[key]));
          u.searchParams.set("layout", "1");
          await navigator.clipboard.writeText(u.toString());
          btn.textContent = "Zkopírováno";
          setTimeout(() => {
            btn.textContent = "Kopírovat URL";
          }, 1200);
        }
      } catch (err) {
        console.warn("[koj-layout]", err);
        btn.textContent = "Chyba";
        setTimeout(() => {
          btn.textContent = LABELS[act] || act;
        }, 1500);
      }
    });
  }

  async function refresh() {
    try {
      const remote = await fetchLayout();
      state = fromUrl(remote);
    } catch (_err) {
      if (!state) {
        state = fromUrl({
          growthMul: 0.82,
          kojScale: 0.82,
          dockMaxW: 240,
          dockMaxH: 400,
          bellyScale: 0.88,
          chipScale: 0.9,
          propScale: 0.75,
          viewerTopPct: 40,
          obsKojScale: 1,
          giftCastScale: 0.72,
          genesisScale: 0.85
        });
      } else {
        state = fromUrl(state);
      }
    }
    applyCss(state);
    syncPanel();
    return state;
  }

  function start(options = {}) {
    onChange = typeof options.onChange === "function" ? options.onChange : null;
    const showPanel = qs().get("layout") === "1" || options.panel === true;
    if (showPanel) buildPanel();
    refresh();
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = setInterval(refresh, options.pollMs || 4000);
    return {
      get,
      refresh,
      save: saveLayout,
      reset: resetLayout,
      applyCss,
      showPanel: () => {
        buildPanel();
        if (panelEl) panelEl.style.display = "";
        syncPanel();
      }
    };
  }

  root.KojRuntimeLayout = {
    start,
    get,
    refresh,
    save: saveLayout,
    reset: resetLayout,
    KEYS,
    LABELS
  };
})(typeof globalThis !== "undefined" ? globalThis : window);
