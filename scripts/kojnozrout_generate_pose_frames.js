"use strict";

/**
 * Generuje druhé pozicové snímky (f2) a kontroluje párové animační PNG.
 *
 *   node scripts/kojnozrout_generate_pose_frames.js
 *   node scripts/kojnozrout_generate_pose_frames.js --force
 */

const fs = require("fs");
const path = require("path");
const { MOODS_DIR, isCanonArtFile } = require("./kojnozrout_restore_canon_sprites");
const { transformCanonFile } = require("./kojnozrout_canon_transform");
const {
  MOOD_F2_SPECS,
  DERIVED_F2_SPECS,
  POSE_CYCLES,
  PAIRED_FRAME_SOURCES,
  WANDER_WALK_MOODS,
  CALM_WANDER_MOODS,
  WANDER_WALK_FRAME_MOODS,
  resolvePoseCycle
} = require("./kojnozrout_pose_frames");

function fileExists(p) {
  try {
    return fs.existsSync(p) && fs.statSync(p).size > 800;
  } catch (_) {
    return false;
  }
}

function collectFrameKeys() {
  const keys = new Set();
  for (const cycle of POSE_CYCLES) {
    for (const f of cycle.frames || []) keys.add(f);
  }
  for (const key of Object.keys(PAIRED_FRAME_SOURCES)) keys.add(key);
  for (const mood of Object.keys(MOOD_F2_SPECS)) keys.add(`${mood}-f2`);
  for (const mood of Object.keys(DERIVED_F2_SPECS)) keys.add(`${mood}-f2`);
  return [...keys];
}

function generateF2FromSpecs(specMap, options = {}) {
  const force = options.force === true;
  const results = [];

  for (const [mood, spec] of Object.entries(specMap)) {
    const src = path.join(MOODS_DIR, `kojnozout-${mood}.png`);
    const dest = path.join(MOODS_DIR, `kojnozout-${mood}-f2.png`);

    if (!fileExists(src)) {
      results.push({ mood, frame: `${mood}-f2`, ok: false, reason: "source_missing" });
      continue;
    }
    if (!force && fileExists(dest)) {
      results.push({ mood, frame: `${mood}-f2`, ok: true, skipped: true });
      continue;
    }

    const out = transformCanonFile(src, dest, spec);
    results.push({
      mood,
      frame: `${mood}-f2`,
      ok: true,
      bytes: out.bytes,
      spec
    });
  }

  return results;
}

function generateF2Frames(options = {}) {
  const master = generateF2FromSpecs(MOOD_F2_SPECS, options);
  const derived = generateF2FromSpecs(DERIVED_F2_SPECS, options);
  return [...master, ...derived];
}

function auditPoseFrames() {
  const missing = [];
  const present = [];
  const allKeys = collectFrameKeys();

  for (const key of allKeys) {
    const p = path.join(MOODS_DIR, `kojnozout-${key}.png`);
    if (fileExists(p)) {
      present.push(key);
    } else {
      missing.push(key);
    }
  }

  return { present, missing, total: allKeys.length };
}

function writeManifest(results, audit) {
  const manifestPath = path.join(
    path.dirname(MOODS_DIR),
    "pose-frames-manifest.json"
  );
  const payload = {
    generatedAt: Date.now(),
    f2Count: results.filter((r) => r.ok && !r.skipped).length,
    derivedF2Count: Object.keys(DERIVED_F2_SPECS).length,
    masterF2Count: Object.keys(MOOD_F2_SPECS).length,
    pairedFrameCount: Object.keys(PAIRED_FRAME_SOURCES).length,
    audit,
    pairedFrameSources: PAIRED_FRAME_SOURCES,
    results
  };
  fs.writeFileSync(manifestPath, JSON.stringify(payload, null, 2), "utf8");
  return manifestPath;
}

/** Jediný zdroj POSE_CYCLES pro runtime overlay (JSON-serializovatelný, bez when funkcí). */
function emitPoseCatalog() {
  const catalogPath = path.join(path.dirname(MOODS_DIR), "pose-catalog.js");
  const moodF2Keys = Object.keys(MOOD_F2_SPECS);
  const derivedF2Keys = Object.keys(DERIVED_F2_SPECS);
  const wanderList = [...WANDER_WALK_MOODS];
  const walkFrameList = [...WANDER_WALK_FRAME_MOODS];
  const body = `/* AUTO-GENERATED — npm run generate:koj-poses — do not edit */
(function () {
  const POSE_CYCLES = ${JSON.stringify(POSE_CYCLES, null, 2)};
  const WANDER_WALK_MOODS = new Set(${JSON.stringify(wanderList)});
  const CALM_WANDER_MOODS = WANDER_WALK_MOODS;
  const WANDER_WALK_FRAME_MOODS = new Set(${JSON.stringify(walkFrameList)});
  const MOOD_F2_KEYS = new Set(${JSON.stringify(moodF2Keys)});
  const DERIVED_F2_KEYS = new Set(${JSON.stringify(derivedF2Keys)});

  function resolvePoseCycle(ctx) {
    ctx = ctx || {};
    const key = String(ctx.assetKey || ctx.displayMood || "idle").toLowerCase();
    function walkCycle() {
      return POSE_CYCLES.find(function (c) { return c.id === "walk"; }) || null;
    }
    for (var i = 0; i < POSE_CYCLES.length; i++) {
      var cycle = POSE_CYCLES[i];
      if (cycle.id === "walk") continue;
      if (Array.isArray(cycle.moods) && cycle.moods.indexOf(key) >= 0) {
        if (ctx.wandering && WANDER_WALK_FRAME_MOODS.has(key)) return walkCycle();
        return cycle;
      }
      if (Array.isArray(cycle.prefixes) && cycle.prefixes.some(function (p) { return key.indexOf(p) === 0; })) return cycle;
    }
    if (ctx.wandering && WANDER_WALK_FRAME_MOODS.has(key)) return walkCycle();
    if (MOOD_F2_KEYS.has(key)) return { id: key + "-pair", frames: [key, key + "-f2"], halfMs: 900 };
    if (DERIVED_F2_KEYS.has(key)) return { id: key + "-pair", frames: [key, key + "-f2"], halfMs: 850 };
    return null;
  }

  globalThis.KOJ_POSE = {
    POSE_CYCLES: POSE_CYCLES,
    WANDER_WALK_MOODS: WANDER_WALK_MOODS,
    CALM_WANDER_MOODS: CALM_WANDER_MOODS,
    MOOD_F2_KEYS: MOOD_F2_KEYS,
    DERIVED_F2_KEYS: DERIVED_F2_KEYS,
    resolvePoseCycle: resolvePoseCycle
  };
})();
`;
  fs.writeFileSync(catalogPath, body, "utf8");
  return catalogPath;
}

function main() {
  const force = process.argv.includes("--force");
  const results = generateF2Frames({ force });
  const audit = auditPoseFrames();
  const manifestPath = writeManifest(results, audit);
  const catalogPath = emitPoseCatalog();

  const written = results.filter((r) => r.ok && !r.skipped).length;
  const skipped = results.filter((r) => r.skipped).length;
  console.log(`✅ f2 frames: ${written} written, ${skipped} skipped`);
  console.log(`📋 pose frames: ${audit.present.length}/${audit.total} present`);
  if (audit.missing.length) {
    console.log(`⚠️  missing (${audit.missing.length}):`, audit.missing.join(", "));
  }
  console.log(`manifest → ${manifestPath}`);
  console.log(`catalog → ${catalogPath}`);
}

if (require.main === module) {
  main();
}

module.exports = {
  generateF2Frames,
  auditPoseFrames,
  collectFrameKeys,
  emitPoseCatalog
};
