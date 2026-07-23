"use strict";

const {
  loadCatalog,
  buildCatalog,
  CONTENT_KIND_LABELS,
  ALL_GIFT_TIERS
} = require("./MIA_MEDIA_CATALOG");
const { durationBucketLabel } = require("./MIA_MEDIA_PROBE");

function formatMs(ms) {
  if (typeof ms !== "number" || !Number.isFinite(ms)) return "?";
  const sec = Math.round(ms / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  const rem = sec % 60;
  return rem ? `${min}m ${rem}s` : `${min}m`;
}

function printReport(catalog) {
  const videos = (catalog.items || []).filter((i) => i.kind === "videos");
  const intel = catalog.intelligence || {};

  console.log("");
  console.log("=== MIA video knihovna ===");
  console.log(`Vygenerováno: ${catalog.generatedAt || "?"}`);
  console.log(`Videí celkem: ${catalog.totalVideos || videos.length}`);
  console.log(`Fotek celkem: ${catalog.totalPhotos || 0}`);
  console.log(`OBS slotů: ${catalog.obsAssignments?.length || 0}`);
  console.log("");

  console.log("--- Podle délky ---");
  for (const [bucket, count] of Object.entries(intel.byDurationBucket || {})) {
    console.log(`  ${durationBucketLabel(bucket)}: ${count}`);
  }

  console.log("");
  console.log("--- Zvuk ---");
  const audio = intel.byAudio || {};
  console.log(`  se zvukem (bublina): ${audio.withAudio || 0}`);
  console.log(`  tiché (Koj mluví): ${audio.silent || 0}`);
  console.log(`  neznámé: ${audio.unknown || 0}`);
  const probed = (catalog.items || []).filter((i) => i.kind === "videos" && i.probeOk === true).length;
  const estimated = (catalog.items || []).filter((i) => i.kind === "videos" && i.durationEstimated === true).length;
  if (probed === 0 && estimated > 0) {
    console.log(`  ⚠ ffprobe není k dispozici — délka/zvuk odhad z velikosti souboru (${estimated} videí)`);
    console.log("    Nastav MIA_FFPROBE_PATH v .env pro přesné hodnoty.");
  }

  console.log("");
  console.log("--- Typ obsahu ---");
  for (const [kind, count] of Object.entries(intel.byContentKind || {})) {
    console.log(`  ${CONTENT_KIND_LABELS[kind] || kind}: ${count}`);
  }

  console.log("");
  console.log("--- Tier rotace (pool) ---");
  for (const tier of ALL_GIFT_TIERS) {
    const pool = catalog.tierRotationPools?.[tier] || [];
    const slots = catalog.tierSlotNames?.[tier] || [];
    console.log(`  ${tier}: ${pool.length} videí · ${slots.length} OBS slotů`);
  }

  console.log("");
  console.log("--- Ukázky podle tieru ---");
  for (const tier of ALL_GIFT_TIERS) {
    const pool = catalog.tierRotationPools?.[tier] || [];
    if (!pool.length) continue;
    console.log(`\n[${tier}]`);
    for (const item of pool.slice(0, 5)) {
      const audio = item.hasEmbeddedAudio === true ? "🔊" : item.hasEmbeddedAudio === false ? "🔇" : "?";
      console.log(
        `  ${audio} ${formatMs(item.durationMs).padEnd(8)} ${item.contentKindLabel || item.contentKind} — ${item.name}`
      );
    }
    if (pool.length > 5) {
      console.log(`  … +${pool.length - 5} dalších`);
    }
  }

  console.log("");
}

async function main() {
  const cmd = process.argv[2] || "report";
  let catalog = loadCatalog();

  if (cmd === "rescan") {
    catalog = buildCatalog();
    const { saveCatalog } = require("./MIA_MEDIA_CATALOG");
    saveCatalog(catalog);
    console.log("Katalog přeskenován (ffprobe).");
  } else if (!catalog) {
    console.error("Chybí katalog — spusť: npm run media:scan");
    process.exitCode = 1;
    return;
  }

  if (cmd === "json") {
    console.log(
      JSON.stringify(
        {
          ok: true,
          generatedAt: catalog.generatedAt,
          intelligence: catalog.intelligence,
          tierRotationPools: Object.fromEntries(
            ALL_GIFT_TIERS.map((tier) => [
              tier,
              (catalog.tierRotationPools?.[tier] || []).length
            ])
          ),
          obsAssignments: catalog.obsAssignments?.length || 0
        },
        null,
        2
      )
    );
    return;
  }

  printReport(catalog);
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err?.stack || err);
    process.exitCode = 1;
  });
}

module.exports = { printReport };
