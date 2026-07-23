"use strict";

/**
 * MIA Koj gallery — vygeneruje vizuální přehled VŠECH sprite PNG seskupených
 * podle toho, KDY se spouští. Čte reálné pooly z MIA_KOJNOZROUT_DISPLAY, aby
 * popis nikdy nezastaral.
 *
 *   node scripts/koj_gallery_build.js
 *   → mia-output-overlay/koj-gallery.html  (http://127.0.0.1:3000/koj-gallery.html)
 */

const fs = require("fs");
const path = require("path");

const PROJECT_ROOT = path.resolve(__dirname, "..");
const MOODS_DIR = path.join(PROJECT_ROOT, "mia-output-overlay", "assets", "kojnozrout", "moods");
const OUT_PATH = path.join(PROJECT_ROOT, "mia-output-overlay", "koj-gallery.html");
const ASSET_URL_BASE = "/assets/kojnozrout/moods";

// Reálné ambientní pooly z živé logiky.
let AMBIENT_POSE_POOLS = {};
try {
  const src = fs.readFileSync(path.join(__dirname, "MIA_KOJNOZROUT_DISPLAY.js"), "utf8");
  const start = src.indexOf("const AMBIENT_POSE_POOLS");
  const block = src.slice(start, src.indexOf("};", start) + 2);
  // bezpečný eval jen tohoto literálu
  // eslint-disable-next-line no-new-func
  AMBIENT_POSE_POOLS = new Function(`${block}; return AMBIENT_POSE_POOLS;`)();
} catch (err) {
  console.error("Nelze načíst AMBIENT_POSE_POOLS:", err.message);
}

function listPngKeys() {
  return new Set(
    fs
      .readdirSync(MOODS_DIR)
      .filter((f) => f.toLowerCase().endsWith(".png"))
      .map((f) => f.replace(/^kojnozout-/, "").replace(/\.png$/i, ""))
  );
}

// Kurátorské skupiny: KDY se sprite spouští (mimo ambient).
const TRIGGER_GROUPS = [
  {
    id: "vital",
    title: "🩺 Vitální stavy (mají přednost)",
    desc: "Vychází z mood/affliction/vitals. Přebijí vše ostatní — když je Koj nemocný nebo spí, ambient se nehraje.",
    items: [
      { key: "sleepy", when: "spí (sleepDepth ≥ 55 nebo isSleeping)" },
      { key: "sick", when: "nemoc (affliction/need/mood = sick)" },
      { key: "sad", when: "smutek (zanedbání)" },
      { key: "stressed", when: "stres" },
      { key: "annoyed", when: "naštvání" },
      { key: "hungry", when: "hlad (hunger ≥ 52)" },
      { key: "full", when: "miska ≥ 95 %" },
      { key: "calm-deep", when: "usíná u videa (sleepDepth 35–55)" },
      { key: "cozy-blanket", when: "klimbá u videa (sleepDepth 20–35)" }
    ]
  },
  {
    id: "eating",
    title: "🍽️ Krmení (9 s puls po nakrmení)",
    desc: "Po nakrmení rotuje 16 variant eating-01…16 podle pořadí krmení.",
    items: [{ key: "eating", when: "základ" }].concat(
      Array.from({ length: 16 }, (_, i) => ({
        key: `eating-${String(i + 1).padStart(2, "0")}`,
        when: `varianta ${i + 1}`
      }))
    )
  },
  {
    id: "overlay",
    title: "⚡ Overlay momenty (krátké pulzy)",
    desc: "Spouští je dění na streamu — combo, duel, flyby, story, gift, spam vlna.",
    items: [
      { key: "combo-fire", when: "combo overlay aktivní" },
      { key: "duel-ready", when: "duel běží" },
      { key: "duel-win", when: "duel vyhrán" },
      { key: "duel-lose", when: "duel prohrán" },
      { key: "flyby-fast", when: "T0 flyby pozdrav" },
      { key: "story-read", when: "story video" },
      { key: "gift-open", when: "gift visual" },
      { key: "cheer-loud", when: "spam/dárková vlna" }
    ]
  },
  {
    id: "behavior",
    title: "🎬 Reakce na chování (kontextové pulzy)",
    desc: "Krátká reakce na konkrétní událost (krmení, péče, quest, chat, evoluce).",
    items: [
      { key: "celebrate", when: "plná miska (FULL_BOWL_TRIGGER, 6,5 s)" },
      { key: "party-pop", when: "quest splněn / stuffed oslava" },
      { key: "thanks-bow", when: "reakce na péči/krmení (3,5 s)" },
      { key: "react-gift", when: "support/big feed (4,5 s)" },
      { key: "hop", when: "chůze (walking)" },
      { key: "wave-left", when: "hra s chatem — sudý tik (3,2 s)" },
      { key: "wave-right", when: "hra s chatem — lichý tik" },
      { key: "proud-stand", when: "evoluční moment" },
      { key: "play", when: "smích / hra s chatem" }
    ]
  },
  {
    id: "video",
    title: "📺 Reakce na gift video (fáze podle délky)",
    desc: "Když hraje gift video, Koj prochází fázemi. Délka fází závisí na tieru (T1 nejdéle, T5 nejrychleji).",
    items: [
      { key: "react-video", when: "watch (0–2,5 s)" },
      { key: "groove", when: "groove (2,5 s+)" },
      { key: "dance", when: "dance fáze (dle tieru)" },
      { key: "hype-jump", when: "hype fáze (vrchol)" }
    ]
  },
  {
    id: "evolution",
    title: "🥚 Evoluce (vajíčko / líhnutí)",
    desc: "Když je Koj ve fázi egg/hatch, používá vlastní malý pool.",
    items: [
      { key: "egg-rest", when: "vajíčko v klidu" },
      { key: "hatch-wiggle", when: "líhnutí" }
    ]
  }
];

function buildAmbientGroups() {
  return Object.entries(AMBIENT_POSE_POOLS).map(([base, pool]) => ({
    id: `ambient-${base}`,
    base,
    pool: Array.isArray(pool) ? pool : []
  }));
}

function imgCard(key, have, when) {
  const exists = have.has(key);
  const url = `${ASSET_URL_BASE}/kojnozout-${key}.png`;
  const missingClass = exists ? "" : " missing";
  const img = exists
    ? `<img loading="lazy" src="${url}" alt="${key}">`
    : `<div class="noimg">chybí PNG</div>`;
  const whenLine = when ? `<span class="when">${when}</span>` : "";
  return `<figure class="card${missingClass}">${img}<figcaption><b>${key}</b>${whenLine}</figcaption></figure>`;
}

function main() {
  const have = listPngKeys();
  const usedKeys = new Set();

  let triggerHtml = "";
  for (const group of TRIGGER_GROUPS) {
    const cards = group.items
      .map((it) => {
        usedKeys.add(it.key);
        return imgCard(it.key, have, it.when);
      })
      .join("\n");
    triggerHtml += `
    <section class="group">
      <h2>${group.title}</h2>
      <p class="gdesc">${group.desc}</p>
      <div class="grid">${cards}</div>
    </section>`;
  }

  let ambientHtml = "";
  for (const g of buildAmbientGroups()) {
    const cards = g.pool
      .map((key) => {
        usedKeys.add(key);
        return imgCard(key, have, null);
      })
      .join("\n");
    ambientHtml += `
      <section class="group ambient">
        <h3>idle „${g.base}" → rotace po 7,2 s</h3>
        <div class="grid">${cards}</div>
      </section>`;
  }

  const orphans = [...have].filter((k) => !usedKeys.has(k));
  let orphanHtml = "";
  if (orphans.length) {
    orphanHtml = `
    <section class="group orphan">
      <h2>❓ PNG bez zařazení (${orphans.length})</h2>
      <p class="gdesc">Existují jako soubor, ale logika je přímo nevolá (rezerva / k zapojení).</p>
      <div class="grid">${orphans.map((k) => imgCard(k, have, null)).join("\n")}</div>
    </section>`;
  }

  const total = have.size;
  const generatedAt = new Date().toISOString();

  const html = `<!DOCTYPE html>
<html lang="cs">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Kojnožrout — galerie grafiky</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body { margin:0; font-family: system-ui, "Segoe UI", sans-serif; background:#0d0f16; color:#e8ecf5; }
  header { position:sticky; top:0; z-index:5; background:linear-gradient(180deg,#141a2b,#0d0f16); padding:18px 22px; border-bottom:1px solid #232a3d; }
  header h1 { margin:0 0 4px; font-size:22px; }
  header .meta { color:#8b94ad; font-size:13px; }
  header .badge { display:inline-block; background:#1d2740; color:#7fb0ff; border-radius:20px; padding:2px 10px; margin-right:6px; font-size:12px; }
  main { padding:18px 22px 60px; max-width:1280px; margin:0 auto; }
  .group { margin:26px 0; }
  .group h2 { font-size:18px; margin:0 0 4px; }
  .group h3 { font-size:15px; margin:0 0 8px; color:#b9c2db; }
  .gdesc { color:#8b94ad; font-size:13px; margin:0 0 12px; max-width:780px; line-height:1.5; }
  .grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(132px,1fr)); gap:12px; }
  .card { margin:0; background:#161b29; border:1px solid #232a3d; border-radius:12px; padding:8px; text-align:center; transition:transform .12s, border-color .12s; }
  .card:hover { transform:translateY(-3px); border-color:#3a4a72; }
  .card img { width:100%; height:120px; object-fit:contain; image-rendering:auto; background:radial-gradient(circle at 50% 40%, #1d2336, #11141f); border-radius:8px; }
  .card .noimg { height:120px; display:flex; align-items:center; justify-content:center; color:#ff7a90; font-size:12px; background:#241420; border-radius:8px; }
  .card.missing { border-color:#5a2030; }
  figcaption { margin-top:6px; font-size:12px; line-height:1.35; }
  figcaption b { color:#fff; word-break:break-word; }
  figcaption .when { display:block; color:#8b94ad; margin-top:2px; font-size:11px; }
  .ambient .grid { grid-template-columns:repeat(auto-fill,minmax(108px,1fr)); }
  .ambient .card img { height:96px; }
  .section-divider { margin:40px 0 10px; padding-top:18px; border-top:1px solid #232a3d; color:#7fb0ff; font-size:14px; letter-spacing:.5px; text-transform:uppercase; }
  .orphan .card { border-color:#4a4320; }
</style>
</head>
<body>
<header>
  <h1>🐾 Kojnožrout — galerie grafiky</h1>
  <div class="meta">
    <span class="badge">${total} PNG</span>
    <span class="badge">${orphans.length} bez zařazení</span>
    generováno ${generatedAt} · zdroj: MIA_KOJNOZROUT_DISPLAY.js
  </div>
</header>
<main>
  <div class="section-divider">Spouštěče podle situace</div>
  ${triggerHtml}
  ${orphanHtml}
  <div class="section-divider">Ambientní rotace (idle pohyb, když se nic neděje)</div>
  ${ambientHtml}
</main>
</body>
</html>`;

  fs.writeFileSync(OUT_PATH, html, "utf8");
  console.log(
    JSON.stringify(
      {
        ok: true,
        out: OUT_PATH,
        url: "http://127.0.0.1:3000/koj-gallery.html",
        totalPng: total,
        grouped: usedKeys.size,
        orphans: orphans.length,
        orphanKeys: orphans.sort()
      },
      null,
      2
    )
  );
}

if (require.main === module) {
  main();
}

module.exports = { listPngKeys };
