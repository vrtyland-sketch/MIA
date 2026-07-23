"use strict";

/**
 * MIA celozobrazový self-check (CLI) — „MIA se podívá na celý display jako člověk".
 *
 * Zavolá /mia/display/self-check a vypíše lidsky, co je špatně:
 *   - overlay mimo obraz / přetéká
 *   - bubliny/panely se překrývají (část není vidět)
 *   - overlay moc malý (nečitelný) / moc velký (zakrývá)
 *   - chybějící nebo vypnutý trvalý overlay
 *   - prázdný overlay (možná chybí PNG)
 *   - rozbitý obrázek / přetékající text (propriocepce)
 *   - BLIKÁNÍ: dvě měření po ~1.2 s — když overlay skáče blank↔obsah.
 *
 *   node scripts/mia_display_self_check.js
 *   node scripts/mia_display_self_check.js --json
 *   node scripts/mia_display_self_check.js --no-blink
 */

const BASE = process.env.MIA_BASE_URL || "http://127.0.0.1:3000";
const args = process.argv.slice(2);
const asJson = args.includes("--json");
const checkBlink = !args.includes("--no-blink");

async function getCheck() {
  const res = await fetch(`${BASE}/mia/display/self-check?_=${Date.now()}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function run() {
  let check;
  try {
    check = await getCheck();
  } catch (err) {
    const msg = `MIA server / display self-check nedostupný (${err.message}). Běží MIA + OBS?`;
    if (asJson) console.log(JSON.stringify({ verdict: "FAIL", error: msg }, null, 2));
    else console.log(`\n👁  MIA celozobrazový self-check\n\n❌ ${msg}`);
    process.exitCode = 1;
    return;
  }

  if (check.error === "obs_not_connected") {
    const msg = "OBS není připojené — MIA teď nevidí svůj display. Spusť OBS + WebSocket.";
    if (asJson) console.log(JSON.stringify({ verdict: "WARN", error: msg }, null, 2));
    else console.log(`\n👁  MIA celozobrazový self-check\n\n⚠️  ${msg}`);
    process.exitCode = 0;
    return;
  }

  const findings = [...(check.findings || [])];

  // ---- BLIKÁNÍ: druhé měření per-source coverage ----
  if (checkBlink && check.sources) {
    await sleep(1200);
    try {
      const second = await getCheck();
      const s1 = check.sources || {};
      const s2 = second.sources || {};
      for (const key of Object.keys(s1)) {
        const a = s1[key];
        const b = s2[key];
        if (!a || !b) continue;
        // Blank↔obsah přeskok = blikání / mizející PNG.
        if (a.blank !== b.blank) {
          findings.push({ level: "warn", key, msg: `BLIKÁNÍ: "${key}" mezi dvěma snímky skočil ${a.blank ? "prázdný→obsah" : "obsah→prázdný"} — něco problikává/mizí.` });
        } else if (a.coverage != null && b.coverage != null) {
          const delta = Math.abs(a.coverage - b.coverage);
          if (delta > 0.25) {
            findings.push({ level: "info", key, msg: `"${key}" se mezi snímky výrazně změnil (Δ ${(delta * 100).toFixed(0)} %) — pohyb/animace (ok), nebo problikávání.` });
          }
        }
      }
    } catch (_e) {
      /* blink check best-effort */
    }
  }

  const fails = findings.filter((f) => f.level === "fail");
  const warns = findings.filter((f) => f.level === "warn");
  const verdict = fails.length ? "FAIL" : warns.length ? "WARN" : "OK";

  if (asJson) {
    console.log(JSON.stringify({ verdict, canvas: check.canvas, scene: check.sceneName, findings, layout: check.layout, sources: check.sources }, null, 2));
    process.exitCode = verdict === "FAIL" ? 1 : 0;
    return;
  }

  const icon = { ok: "✅", info: "ℹ️ ", warn: "⚠️ ", fail: "❌" };
  console.log("\n👁  MIA celozobrazový self-check");
  console.log(`Canvas: ${check.canvas?.w}×${check.canvas?.h} (${check.canvas?.source}) · scéna: ${check.sceneName}\n`);

  // Co MIA vidí ve scéně
  const visible = (check.layout || []).filter((l) => l.enabled);
  console.log(`MIA vidí ${visible.length} zapnutých overlayů:`);
  for (const l of visible) {
    const r = l.rect;
    const where = r ? `${Math.round(r.w)}×${Math.round(r.h)} @ (${Math.round(r.left)},${Math.round(r.top)})` : "neviditelný";
    console.log(`  • ${l.key.padEnd(9)} ${where}`);
  }
  console.log("");

  if (!findings.length) {
    console.log("✅ Kompozice vypadá srovnaně — nic mimo obraz, žádné překryvy, vše čitelné.");
  } else {
    for (const f of findings) console.log(`${icon[f.level] || "•"} ${f.msg}`);
  }

  console.log(`\n---- VERDIKT: ${verdict} ----`);
  if (verdict === "OK") console.log("Display je hezky srovnaný. MIA nevidí co zlepšit.");
  else if (verdict === "WARN") console.log("MIA vidí drobnosti ke zlepšení (viz ⚠️ výše).");
  else console.log("MIA vidí vážný problém s kompozicí (viz ❌ výše).");

  process.exitCode = verdict === "FAIL" ? 1 : 0;
}

if (require.main === module) {
  run().catch((err) => {
    console.error("display self-check selhal:", err.message);
    process.exitCode = 1;
  });
}

module.exports = { run };
