"use strict";

/**
 * MIA vizuální self-check — „MIA se podívá na sebe jako člověk".
 *
 * Spojuje tři smysly do jednoho úsudku o Kojově overlayi:
 *   1) ZÁMĚR     — /overlay-state → kojDisplay (jakou náladu MIA CHCE ukázat)
 *   2) PROPRIOCEPCE — /mia/koj/render-report (co overlay REÁLNĚ renderuje + rozbitý obrázek)
 *   3) ZRAK      — /mia/eyes/screenshot + analýza pokrytí (je tam Koj vážně vidět?)
 *
 * Porovná je a řekne lidsky, co je špatně. Funguje i bez OBS (zrak se přeskočí).
 *
 *   node scripts/mia_visual_self_check.js
 *   node scripts/mia_visual_self_check.js --json
 *   node scripts/mia_visual_self_check.js --no-eyes   # přeskočí screenshot
 *   node scripts/mia_visual_self_check.js --source KOJNOZROUT_RUNTIME
 */

const fs = require("fs");
const { analyzePngBase64Coverage } = require("./MIA_EYES");

const BASE = process.env.MIA_BASE_URL || "http://127.0.0.1:3000";
const args = process.argv.slice(2);
const asJson = args.includes("--json");
const useEyes = !args.includes("--no-eyes");
const sourceArg = (() => {
  const i = args.indexOf("--source");
  return i >= 0 && args[i + 1] ? args[i + 1] : "KOJNOZROUT_RUNTIME";
})();

async function getJson(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, { cache: "no-store", ...opts });
  if (!res.ok) throw new Error(`HTTP ${res.status} @ ${path}`);
  return res.json();
}

function finding(level, msg) {
  return { level, msg };
}

async function run() {
  const findings = [];
  const senses = { intent: null, proprioception: null, eyes: null };

  // ---- 1) ZÁMĚR ----
  let overlay;
  try {
    overlay = await getJson(`/overlay-state?_=${Date.now()}`);
  } catch (err) {
    findings.push(finding("fail", `MIA server neodpovídá na /overlay-state (${err.message}). Běží MIA?`));
    return report(findings, senses);
  }
  const kd = overlay.kojDisplay || {};
  senses.intent = {
    mood: kd.mood || null,
    spriteAsset: kd.spriteAsset || null,
    spriteUrl: kd.spriteUrl || null
  };
  if (!kd.mood && !kd.spriteAsset) {
    findings.push(finding("warn", "Server nehlásí žádnou Koj náladu (kojDisplay je prázdný)."));
  } else {
    findings.push(finding("ok", `Záměr: nálada "${kd.mood}" → sprite "${kd.spriteAsset}".`));
  }

  // ---- 2) PROPRIOCEPCE ----
  let rr;
  try {
    rr = await getJson("/mia/koj/render-report");
  } catch (err) {
    findings.push(finding("warn", `Render-report nedostupný (${err.message}).`));
  }
  if (rr && rr.report) {
    senses.proprioception = rr.report;
    if (rr.stale) {
      findings.push(finding("warn", `Overlay nehlásí čerstvá data (stáří ${rr.ageMs} ms). Je Koj overlay otevřený v OBS/prohlížeči?`));
    }
    const a = rr.report.actual || {};
    if (a.brokenImage) {
      findings.push(finding("fail", `ROZBITÝ OBRÁZEK: slot má src "${a.slotSrc}", ale prohlížeč nenačetl pixely (naturalWidth=0).`));
    } else if (a.usingCssFallback) {
      findings.push(finding("warn", "Koj jede na CSS fallbacku — žádné PNG se nenačetlo."));
    } else if (a.slotVisible && a.naturalW > 0) {
      findings.push(finding("ok", `Tělo: ${a.poseCycle ? `cyklus "${a.poseCycle}" frame "${a.frameKey}"` : `statický "${a.assetKey}"`} (${a.naturalW}×${a.naturalH}).`));
    }
    // Intent vs realita
    const wantAsset = (kd.spriteAsset || "").toLowerCase();
    const gotKey = (a.frameKey || a.assetKey || "").toLowerCase().replace(/^__pose__/, "");
    if (wantAsset && gotKey && !gotKey.includes(wantAsset) && !wantAsset.includes(gotKey) && a.poseCycle) {
      // cyklus může mít jiný frame name než asset — jen informativně
      findings.push(finding("info", `Záměr "${wantAsset}" hraje přes cyklus "${a.poseCycle}" (frame "${gotKey}").`));
    }
  } else if (rr) {
    findings.push(finding("warn", "Overlay zatím neposlal žádný render-report (otevři Koj overlay v OBS)."));
  }

  // ---- 3) ZRAK ----
  if (useEyes) {
    try {
      const shotRes = await getJson(`/mia/eyes/screenshot?source=${encodeURIComponent(sourceArg)}&save=1`);
      const shot = shotRes.shot || {};
      if (!shotRes.ok || !shot.savedPath) {
        findings.push(finding("warn", `Zrak: screenshot se nepovedl (${shotRes.error || shot.reason || "neznámý důvod"}). OBS pravděpodobně neběží.`));
      } else if (!fs.existsSync(shot.savedPath)) {
        findings.push(finding("warn", `Zrak: screenshot uložen, ale soubor nenalezen: ${shot.savedPath}`));
      } else {
        const b64 = fs.readFileSync(shot.savedPath).toString("base64");
        const cov = await analyzePngBase64Coverage(b64, { minCoverage: 0.01 });
        senses.eyes = cov;
        if (!cov.ok) {
          findings.push(finding("warn", `Zrak: PNG se nepodařilo analyzovat (${cov.reason}).`));
        } else if (cov.blank) {
          findings.push(finding("fail", `PRÁZDNÝ OVERLAY: zrak nevidí Koje (pokrytí ${(cov.coverage * 100).toFixed(2)} %). Zkontroluj browser source v OBS.`));
        } else {
          const bb = cov.bbox;
          findings.push(finding("ok", `Zrak vidí Koje: pokrytí ${(cov.coverage * 100).toFixed(1)} %${bb ? `, bbox ${bb.w}×${bb.h}` : ""}.`));
        }
      }
    } catch (err) {
      findings.push(finding("warn", `Zrak nedostupný (${err.message}). Pro vizuální kontrolu spusť OBS.`));
    }
  }

  return report(findings, senses);
}

function report(findings, senses) {
  const fails = findings.filter((f) => f.level === "fail");
  const warns = findings.filter((f) => f.level === "warn");
  const verdict = fails.length ? "FAIL" : warns.length ? "WARN" : "OK";

  if (asJson) {
    console.log(JSON.stringify({ verdict, findings, senses }, null, 2));
  } else {
    const icon = { ok: "✅", info: "ℹ️ ", warn: "⚠️ ", fail: "❌" };
    console.log("\n👁  MIA vizuální self-check\n");
    for (const f of findings) console.log(`${icon[f.level] || "•"} ${f.msg}`);
    console.log(`\n---- VERDIKT: ${verdict} ----`);
    if (verdict === "OK") console.log("Koj vypadá tak, jak MIA zamýšlí.");
    else if (verdict === "WARN") console.log("Drobnosti k prověření (často jen: OBS/overlay neběží).");
    else console.log("MIA vidí problém — viz ❌ výše.");
  }

  process.exitCode = verdict === "FAIL" ? 1 : 0;
  return verdict;
}

if (require.main === module) {
  run().catch((err) => {
    console.error("self-check selhal:", err.message);
    process.exitCode = 1;
  });
}

module.exports = { run };
