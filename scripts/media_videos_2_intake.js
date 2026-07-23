"use strict";

/**
 * Analyzuje incoming-images/videos_2 a vypíše tier návrhy.
 * ffprobe volitelný (MIA_FFPROBE_PATH); bez něj heuristika velikosti.
 */

const fs = require("fs");
const path = require("path");
const catalog = require("./MIA_MEDIA_CATALOG");
const { probeVideoMedia, durationBucketLabel, durationBucket } = require("./MIA_MEDIA_PROBE");

const ROOT = path.join(__dirname, "..", "incoming-images", "videos_2");

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function listVideos(dir = ROOT) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((name) => /\.(mp4|mov|webm|mkv|m4v)$/i.test(name))
    .sort();
}

function analyzeFile(name) {
  const abs = path.join(ROOT, name);
  const st = fs.statSync(abs);
  const rel = `videos_2/${name}`.replace(/\\/g, "/");
  const pattern = catalog.detectSourcePattern(name);
  const probe = probeVideoMedia(abs);
  const classified = catalog.classifyVideo({
    name,
    abs,
    rel,
    sizeBytes: st.size,
    pattern,
    durationMs: probe.durationMs,
    hasEmbeddedAudio: probe.hasEmbeddedAudio,
    width: probe.width,
    height: probe.height
  });

  const intake = catalog.loadVideos2Intake();
  const override = (intake.assignments || []).find((row) => safeString(row.rel) === rel);

  return {
    rel,
    name,
    sizeMB: Number((st.size / 1_000_000).toFixed(1)),
    pattern,
    durationSec: probe.durationMs ? Math.round(probe.durationMs / 1000) : null,
    durationEstimated: classified.durationEstimated === true,
    durationBucket: durationBucket(probe.durationMs || classified.durationMs),
    durationBucketLabel: durationBucketLabel(
      durationBucket(probe.durationMs || classified.durationMs)
    ),
    audio: probe.hasEmbeddedAudio,
    resolution: probe.width && probe.height ? `${probe.width}x${probe.height}` : null,
    probeOk: probe.probeOk,
    autoKind: classified.contentKind,
    autoTier: classified.suggestedTier,
    qualityScore: classified.qualityScore,
    tier: override?.tier || classified.suggestedTier,
    contentKind: override?.contentKind || classified.contentKind,
    note: override?.note || null,
    intakeOverride: Boolean(override)
  };
}

function summarize(rows = []) {
  const byTier = {};
  for (const row of rows) {
    byTier[row.tier] = byTier[row.tier] || [];
    byTier[row.tier].push(row.rel);
  }
  return byTier;
}

function main() {
  const cmd = process.argv[2] || "report";
  const names = listVideos();

  if (!names.length) {
    console.log(
      JSON.stringify(
        {
          ok: false,
          reason: "no_videos",
          folder: ROOT,
          hint: "Vlož .mp4 do incoming-images/videos_2 a spusť znovu."
        },
        null,
        2
      )
    );
    process.exitCode = 1;
    return;
  }

  const rows = names.map(analyzeFile);

  if (cmd === "json") {
    console.log(JSON.stringify({ ok: true, folder: ROOT, count: rows.length, rows, byTier: summarize(rows) }, null, 2));
    return;
  }

  console.log("\n=== videos_2 INTAKE ===\n");
  console.log(`Složka: ${ROOT}`);
  console.log(`Souborů: ${rows.length}`);
  console.log(`ffprobe: ${rows.some((r) => r.probeOk) ? "OK (alespoň 1)" : "nedostupný — heuristika velikosti"}\n`);

  for (const row of rows) {
    console.log(`${row.tier.padEnd(8)} | ${row.contentKind.padEnd(16)} | ${String(row.sizeMB).padStart(5)} MB | ${row.name}`);
    console.log(
      `         auto ${row.autoTier}/${row.autoKind} · ${row.durationSec != null ? `${row.durationSec}s` : `~${row.durationBucketLabel}`}${row.intakeOverride ? " · ✓ intake" : ""}`
    );
    if (row.note) console.log(`         → ${row.note}`);
    console.log("");
  }

  console.log("--- Shrnutí tier ---");
  for (const [tier, list] of Object.entries(summarize(rows)).sort()) {
    console.log(`${tier}: ${list.length}`);
  }
  console.log("\n→ npm run media:scan && npm run media:status\n");
}

if (require.main === module) {
  main();
}

module.exports = { listVideos, analyzeFile, summarize };
