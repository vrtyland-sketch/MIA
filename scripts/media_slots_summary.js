"use strict";

/**
 * Přehled OBS video slotů — čitelný výpis pro streamera.
 * Usage: node scripts/media_slots_summary.js
 */

const fs = require("fs");
const path = require("path");

const CATALOG_PATH = path.join(__dirname, "..", "config", "stream-media-catalog.json");

function loadCatalog() {
  if (!fs.existsSync(CATALOG_PATH)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(CATALOG_PATH, "utf8"));
}

function sec(ms) {
  const n = Number(ms);
  if (!Number.isFinite(n) || n <= 0) return "?";
  return `${Math.round(n / 1000)}s`;
}

function basename(rel = "") {
  return String(rel).split("/").pop() || rel;
}

function main() {
  const catalog = loadCatalog();
  if (!catalog) {
    console.log("Katalog chybí. Spusť: npm run media:scan");
    process.exitCode = 1;
    return;
  }

  const tiers = ["T1", "T2", "T3", "T4", "T5", "PROFILE"];
  const assignments = catalog.obsAssignments || [];
  const pools = catalog.tierRotationPools || {};

  console.log("");
  console.log("=== MIA VIDEO SLOTY (OBS) ===");
  console.log(`Katalog: ${catalog.totalVideos || "?"} videí · ${assignments.length} slotů obsazeno`);
  console.log("");

  for (const tier of tiers) {
    const rows = assignments.filter((a) => a.tier === tier);
    const poolSize = (pools[tier] || []).length;
    console.log(`--- ${tier} (${rows.length} slotů · zásoba v knihovně: ${poolSize}) ---`);
    if (rows.length === 0) {
      console.log("  (prázdné — chybí přiřazení!)");
      console.log("");
      continue;
    }
    for (const row of rows) {
      const exists = row.abs && fs.existsSync(row.abs) ? "✓" : "✗ CHYBÍ SOUBOR";
      const pin = row.pinned ? " [pin]" : "";
      console.log(
        `  ${row.obsSource}  ${exists}  ${sec(row.durationMs)}  ${row.contentKind || "?"}  ${basename(row.rel)}${pin}`
      );
    }
    console.log("");
  }

  console.log("Poznámka: T3 sloty se jmenují T3_VIDEO_09–14 (ne 01–06). To je OK — OBS tak má nastavené zdroje.");
  console.log("");
  console.log("Příkazy:");
  console.log("  npm run media:scan");
  console.log("  npm run media:apply-obs");
  console.log("  npm run media:slots");
  console.log("  http://127.0.0.1:3000/video/test?tier=T3");
  console.log("");
}

main();
