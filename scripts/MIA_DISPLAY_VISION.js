"use strict";

/**
 * MIA celozobrazový zrak — „MIA se dívá na celý display jako člověk".
 *
 * Posuzuje kompozici VŠECH overlayů, ne jen Koje:
 *   - je overlay v obraze, nebo přetéká / je úplně mimo canvas?
 *   - nepřekrývají se bubliny / panely, takže část není vidět?
 *   - není overlay moc malý (nečitelný) nebo moc velký?
 *   - chybí trvalý overlay ve scéně, nebo je vypnutý?
 *
 * Jádro jsou ČISTÉ geometrické funkce (rect z OBS transformu, průnik, mimo obraz),
 * aby šly unit-testovat bez OBS. Orchestrace (čtení scény) bere safeObsCall zvenčí.
 */

// ===== Registr overlayů =====
// region = očekávané umístění jako zlomek canvasu (0..1). Slouží k posouzení,
// jestli overlay sedí tam, kam patří. solo = nemá se s ničím překrývat.
const OVERLAY_REGISTRY = [
  {
    key: "speech",
    names: ["MIA_SPEECH", "MIA_BUBBLE", "MIA_SPEECH_OVERLAY", "SPEECH_OVERLAY"],
    role: "MIA/Koj bublina + hologram",
    persistent: true,
    // Průhledný full-area kontejner: viditelná bublina je menší a plave uvnitř.
    // Bounding-box překryv/velikost zdroje by byl falešný → skutečnou bublinu
    // řeší propriocepce (/mia/speech/render-report → bubble rect v canvas souř.).
    transparentContainer: true,
    // Full-stage hero+bubble on TikTok portrait; CSS zones place MIA left/lower.
    region: { x: 0.0, y: 0.2, w: 1.0, h: 0.8 }
  },
  {
    key: "entity",
    names: ["MIA_ENTITY", "MIA_STATUS", "MIA_LIVE_BADGE"],
    role: "LIVE / status badge",
    persistent: true,
    solo: true,
    region: { x: 0.0, y: 0.0, w: 0.4, h: 0.18 },
    minCanvasFrac: 0.003,
    maxCanvasFrac: 0.12
  },
  {
    key: "bowl",
    names: ["MIA_BOWL", "KOJNOZROUT_BOWL", "KOJNOZROUT_BOWL_V2", "KOJ_MISKA"],
    role: "Koj miska / hlad",
    persistent: true,
    region: { x: 0.6, y: 0.0, w: 0.4, h: 0.35 },
    minCanvasFrac: 0.01,
    maxCanvasFrac: 0.3
  },
  {
    key: "runtime",
    names: ["MIA_KOJ_RUNTIME", "KOJNOZROUT_RUNTIME", "KOJ_RUNTIME", "KOJ_SPRITE"],
    role: "Koj sprite / nálada",
    persistent: true,
    region: { x: 0.55, y: 0.45, w: 0.45, h: 0.55 },
    minCanvasFrac: 0.02,
    maxCanvasFrac: 0.6
  },
  {
    key: "voice",
    names: ["MIA_VOICE", "MIA_TTS", "MIA_VOICE_OVERLAY"],
    role: "neviditelný TTS přehrávač",
    persistent: true,
    invisible: true
  },
  // Efemerní — kontrolujeme jen mimo-obraz, když jsou zapnuté (překryv je u nich záměr).
  { key: "startup", names: ["MIA_STARTUP_CHECK"], role: "startup slide", ephemeral: true, skipOffscreenCheck: true },
  { key: "combo", names: ["MIA_COMBO", "MIA_COMBO_OVERLAY"], role: "combo flash", ephemeral: true },
  {
    key: "boss_cinematic",
    names: ["MIA_BOSS_CINEMATIC", "MIA_BOSS_CINEMATIC_OVERLAY", "BOSS_CINEMATIC"],
    role: "T5+ boss cinematic",
    ephemeral: true
  },
  { key: "gift", names: ["MIA_GIFT_MOMENT", "GIFT_MOMENT"], role: "gift karta", ephemeral: true },
  {
    key: "gift_animation",
    names: ["MIA_GIFT_ANIMATION", "GIFT_ANIMATION", "MIA_GIFT_ANIM"],
    role: "gift animation stage",
    ephemeral: true
  },
  { key: "evolution", names: ["MIA_EVOLUTION", "MIA_EVOLUTION_TOAST", "EVOLUTION_TOAST"], role: "evolution toast", ephemeral: true },
  { key: "backpack", names: ["MIA_BACKPACK", "KOJNOZROUT_BACKPACK", "KOJ_BACKPACK"], role: "batoh panel", ephemeral: true },
  { key: "story", names: ["MIA_STORY", "MIA_STORY_MOMENT", "STORY_MOMENT"], role: "story moment", ephemeral: true },
  { key: "t0flyby", names: ["MIA_T0_FLYBY", "T0_FLYBY", "MIA_FLYBY"], role: "T0 flyby", ephemeral: true },
  { key: "duel", names: ["MIA_DUEL", "KOJNOZROUT_DUEL", "DUEL_BAR"], role: "duel scoreboard", ephemeral: true }
];

// Dvojice trvalých overlayů, které se NESMÍ překrývat (ztratí se čitelnost).
// Pozn.: "speech" tu NENÍ — je to průhledný full-area kontejner, jeho bounding
// box přirozeně leží přes Koje. Skutečný překryv bubliny řeší propriocepce.
const FORBIDDEN_OVERLAP_PAIRS = [
  ["entity", "bowl"],
  ["entity", "runtime"],
  ["bowl", "runtime"]
];

function num(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function registryForName(name) {
  const upper = String(name || "").toUpperCase();
  return (
    OVERLAY_REGISTRY.find((o) => o.names.some((n) => n.toUpperCase() === upper)) || null
  );
}

/**
 * Spočítá obdélník overlaye v pixelech canvasu z OBS sceneItemTransform.
 * V obs-websocket v5 jsou transform.width/height už finální (po scale/bounds).
 * Roh dopočítáme z positionX/Y + alignment (bitfield: 1=left,2=right,4=top,8=bottom).
 */
function rectFromTransform(t = {}) {
  const boundsW = num(t.boundsWidth, 0);
  const boundsH = num(t.boundsHeight, 0);
  let w = num(t.width, 0);
  let h = num(t.height, 0);
  if ((!w || !h) && (boundsW || boundsH)) {
    w = boundsW || w;
    h = boundsH || h;
  }
  if (!w) w = Math.abs(num(t.sourceWidth, 0) * num(t.scaleX, 1));
  if (!h) h = Math.abs(num(t.sourceHeight, 0) * num(t.scaleY, 1));

  const px = num(t.positionX, 0);
  const py = num(t.positionY, 0);
  const align = num(t.alignment, 5); // default OBS = 5 (top-left)

  let left;
  if (align & 1) left = px; // left
  else if (align & 2) left = px - w; // right
  else left = px - w / 2; // h-center

  let top;
  if (align & 4) top = py; // top
  else if (align & 8) top = py - h; // bottom
  else top = py - h / 2; // v-center

  return { left, top, right: left + w, bottom: top + h, w, h };
}

/** Kolik pixelů overlay přesahuje mimo canvas na každé straně (0 = uvnitř). */
function offscreenAmount(rect, canvas) {
  const cw = num(canvas.w, 0);
  const ch = num(canvas.h, 0);
  return {
    left: Math.max(0, Math.round(-rect.left)),
    top: Math.max(0, Math.round(-rect.top)),
    right: Math.max(0, Math.round(rect.right - cw)),
    bottom: Math.max(0, Math.round(rect.bottom - ch))
  };
}

/** Plocha průniku dvou obdélníků (0 = nepřekrývají se). */
function intersectionArea(a, b) {
  const x = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
  const y = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
  return x * y;
}

function rectArea(r) {
  return Math.max(0, r.w) * Math.max(0, r.h);
}

/**
 * Posoudí kompozici. items = [{ key, name, enabled, rect }], canvas = {w,h}.
 * Vrací findings: off-screen, překryvy, velikost, chybějící trvalé overlaye.
 */
function analyzeLayout(items = [], canvas = { w: 1920, h: 1080 }, opts = {}) {
  const findings = [];
  const overlapFrac = num(opts.overlapFrac, 0.15); // >15 % menšího = problém
  const offscreenTol = num(opts.offscreenTolPx, 2); // pár px = zaokrouhlení
  const canvasArea = Math.max(1, num(canvas.w, 1) * num(canvas.h, 1));

  const byKey = {};
  for (const it of items) {
    if (it.key) byKey[it.key] = it;
  }

  // 1) Chybějící / vypnuté trvalé (viditelné) overlaye
  for (const reg of OVERLAY_REGISTRY) {
    if (!reg.persistent || reg.invisible) continue;
    const it = byKey[reg.key];
    if (!it) {
      findings.push({ level: "fail", key: reg.key, msg: `Trvalý overlay "${reg.role}" (${reg.names[0]}) chybí ve scéně.` });
    } else if (!it.enabled) {
      findings.push({ level: "fail", key: reg.key, msg: `Trvalý overlay "${reg.role}" (${it.name}) je ve scéně VYPNUTÝ — divák ho nevidí.` });
    }
  }

  // 2) Per-overlay: mimo obraz + velikost
  for (const it of items) {
    const reg = registryForName(it.name) || {};
    if (reg.invisible || reg.skipOffscreenCheck) continue;
    if (!it.enabled || !it.rect) continue;
    const r = it.rect;

    const off = offscreenAmount(r, canvas);
    const offMax = Math.max(off.left, off.top, off.right, off.bottom);
    if (offMax > offscreenTol) {
      const sides = [];
      if (off.left > offscreenTol) sides.push(`vlevo ${off.left}px`);
      if (off.top > offscreenTol) sides.push(`nahoře ${off.top}px`);
      if (off.right > offscreenTol) sides.push(`vpravo ${off.right}px`);
      if (off.bottom > offscreenTol) sides.push(`dole ${off.bottom}px`);
      const fullyOut = r.right <= 0 || r.bottom <= 0 || r.left >= canvas.w || r.top >= canvas.h;
      findings.push({
        level: fullyOut ? "fail" : "warn",
        key: reg.key || it.key,
        msg: `${reg.role || it.name} ${fullyOut ? "je ÚPLNĚ MIMO obraz" : "přetéká mimo obraz"} (${sides.join(", ")}).`
      });
    }

    // velikost vs canvas
    const frac = rectArea(r) / canvasArea;
    if (reg.minCanvasFrac && frac < reg.minCanvasFrac) {
      findings.push({ level: "warn", key: reg.key, msg: `${reg.role} je hodně malý (${(frac * 100).toFixed(1)} % plochy) — možná špatně čitelný.` });
    }
    if (reg.maxCanvasFrac && frac > reg.maxCanvasFrac) {
      findings.push({ level: "warn", key: reg.key, msg: `${reg.role} je hodně velký (${(frac * 100).toFixed(0)} % plochy) — možná zakrývá zbytek.` });
    }
  }

  // 3) Zakázané překryvy mezi trvalými overlayi
  for (const [aKey, bKey] of FORBIDDEN_OVERLAP_PAIRS) {
    const a = byKey[aKey];
    const b = byKey[bKey];
    if (!a || !b || !a.enabled || !b.enabled || !a.rect || !b.rect) continue;
    const inter = intersectionArea(a.rect, b.rect);
    if (inter <= 0) continue;
    const smaller = Math.min(rectArea(a.rect), rectArea(b.rect));
    const frac = smaller > 0 ? inter / smaller : 0;
    if (frac >= overlapFrac) {
      const ra = registryForName(a.name) || {};
      const rb = registryForName(b.name) || {};
      findings.push({
        level: "warn",
        key: `${aKey}+${bKey}`,
        msg: `Překryv: "${ra.role || aKey}" a "${rb.role || bKey}" se překrývají z ${(frac * 100).toFixed(0)} % — část může být zakrytá.`
      });
    }
  }

  return findings;
}

// ===== Orchestrace přes OBS (potřebuje safeObsCall) =====

async function readCanvas(safeObsCall) {
  const res = await safeObsCall("GetVideoSettings", {});
  const r = res?.response || res || {};
  const w = num(r.baseWidth, 0);
  const h = num(r.baseHeight, 0);
  if (w && h) return { w, h, source: "obs" };
  return { w: 1920, h: 1080, source: "fallback" };
}

async function readSceneLayout(safeObsCall, sceneName) {
  const listRes = await safeObsCall("GetSceneItemList", { sceneName });
  const rawItems =
    listRes?.response?.sceneItems || listRes?.sceneItems || [];
  const items = [];
  for (const si of rawItems) {
    const name = si.sourceName || si.inputName || "";
    const reg = registryForName(name);
    if (!reg) continue; // jen overlaye, co známe
    const sceneItemId = si.sceneItemId;
    const enabled = si.sceneItemEnabled !== false;
    let rect = null;
    if (enabled && !reg.invisible) {
      const tRes = await safeObsCall("GetSceneItemTransform", { sceneName, sceneItemId });
      const transform =
        tRes?.response?.sceneItemTransform || tRes?.sceneItemTransform || null;
      if (transform) rect = rectFromTransform(transform);
    }
    items.push({
      key: reg.key,
      name,
      sceneItemId,
      enabled,
      index: num(si.sceneItemIndex, 0),
      rect
    });
  }
  return items;
}

module.exports = {
  OVERLAY_REGISTRY,
  FORBIDDEN_OVERLAP_PAIRS,
  registryForName,
  rectFromTransform,
  offscreenAmount,
  intersectionArea,
  rectArea,
  analyzeLayout,
  readCanvas,
  readSceneLayout
};
