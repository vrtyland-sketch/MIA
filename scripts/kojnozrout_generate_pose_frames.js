"use strict";

/**
 * Generuje druhé pozicové snímky (f2) a kontroluje párové animační PNG.
 * Nevytváří AI/ruční páry (*-a / *-b). Ty zůstávají v PAIRED_FRAME_SOURCES.
 * Do pose-catalog.js se dostane jen cyklus, jehož všechny snímky na disku jsou.
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

function framePngExists(moodsDir, key) {
  try {
    const filePath = path.join(moodsDir, `kojnozout-${key}.png`);
    return fs.existsSync(filePath) && fs.statSync(filePath).size > 0;
  } catch (_) {
    return false;
  }
}

/**
 * Keep a cycle only when every frame file exists.
 * A missing walk-a/walk-b pair drops the whole cycle; it is not filled from variants.
 */
function selectCompletePoseCycles(cycles, frameExists) {
  const complete = [];
  const skipped = [];
  const missingFrames = new Set();
  for (const cycle of cycles || []) {
    const frames = Array.isArray(cycle.frames) ? cycle.frames : [];
    const missing = frames.filter((frame) => !frameExists(frame));
    if (frames.length > 0 && missing.length === 0) {
      complete.push(cycle);
      continue;
    }
    for (const frame of missing) missingFrames.add(frame);
    if (frames.length === 0) missingFrames.add(`${cycle.id || "cycle"}:empty`);
    skipped.push({ id: cycle.id, missing });
  }
  return {
    definedCount: (cycles || []).length,
    complete,
    skipped,
    missingFrameCount: missingFrames.size,
    missingFrames: [...missingFrames]
  };
}

function availableF2Keys(specMap, frameExists) {
  return Object.keys(specMap || {}).filter(
    (mood) => frameExists(mood) && frameExists(`${mood}-f2`)
  );
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

function writeManifest(results, audit, cyclePlan = null, moodsDir = MOODS_DIR) {
  const manifestPath = path.join(path.dirname(moodsDir), "pose-frames-manifest.json");
  const payload = {
    generatedAt: Date.now(),
    f2Count: results.filter((r) => r.ok && !r.skipped).length,
    derivedF2Count: Object.keys(DERIVED_F2_SPECS).length,
    masterF2Count: Object.keys(MOOD_F2_SPECS).length,
    pairedFrameCount: Object.keys(PAIRED_FRAME_SOURCES).length,
    pairedFramesAreArtBriefs: true,
    note: "generate:koj-poses writes f2 transforms and audits paired AI/manual frames. It does not synthesize *-a/*-b art.",
    audit,
    cyclePlan,
    pairedFrameSources: PAIRED_FRAME_SOURCES,
    results
  };
  fs.writeFileSync(manifestPath, JSON.stringify(payload, null, 2), "utf8");
  return manifestPath;
}

/** Jediný zdroj POSE_CYCLES pro runtime overlay (JSON-serializovatelný, bez when funkcí). */
function emitPoseCatalog(options = {}) {
  const moodsDir = options.moodsDir || MOODS_DIR;
  const catalogPath = options.catalogPath || path.join(path.dirname(moodsDir), "pose-catalog.js");
  const sourceCycles = options.cycles || POSE_CYCLES;
  const frameExists =
    options.frameExists || ((key) => framePngExists(moodsDir, key));
  const plan = selectCompletePoseCycles(sourceCycles, frameExists);
  const moodF2Keys = availableF2Keys(options.moodF2Specs || MOOD_F2_SPECS, frameExists);
  const derivedF2Keys = availableF2Keys(options.derivedF2Specs || DERIVED_F2_SPECS, frameExists);
  const wanderList = [...(options.wanderWalkMoods || WANDER_WALK_MOODS)];
  const walkFrameList = [...(options.wanderWalkFrameMoods || WANDER_WALK_FRAME_MOODS)];
  const body = `/* AUTO-GENERATED — npm run generate:koj-poses — do not edit */
(function () {
  const POSE_CYCLES = ${JSON.stringify(plan.complete, null, 2)};
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
        if (ctx.wandering && WANDER_WALK_FRAME_MOODS.has(key)) {
          var walked = walkCycle();
          if (walked) return walked;
        }
        return cycle;
      }
      if (Array.isArray(cycle.prefixes) && cycle.prefixes.some(function (p) { return key.indexOf(p) === 0; })) return cycle;
    }
    if (ctx.wandering && WANDER_WALK_FRAME_MOODS.has(key)) {
      var trailingWalk = walkCycle();
      if (trailingWalk) return trailingWalk;
    }
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
  fs.mkdirSync(path.dirname(catalogPath), { recursive: true });
  fs.writeFileSync(catalogPath, body, "utf8");
  return {
    catalogPath,
    definedCount: plan.definedCount,
    emitted: plan.complete.map((cycle) => cycle.id),
    skipped: plan.skipped,
    missingFrameCount: plan.missingFrameCount,
    missingFrames: plan.missingFrames,
    moodF2Keys,
    derivedF2Keys
  };
}

function missingPairedAiFrames(moodsDir = MOODS_DIR) {
  return Object.keys(PAIRED_FRAME_SOURCES).filter((key) => !framePngExists(moodsDir, key));
}

function main() {
  const force = process.argv.includes("--force");
  const results = generateF2Frames({ force });
  const audit = auditPoseFrames();
  const catalog = emitPoseCatalog();
  const manifestPath = writeManifest(results, audit, {
    definedCount: catalog.definedCount,
    emitted: catalog.emitted,
    skipped: catalog.skipped,
    missingFrameCount: catalog.missingFrameCount
  });

  const written = results.filter((r) => r.ok && !r.skipped).length;
  const skipped = results.filter((r) => r.skipped).length;
  console.log(`✅ f2 frames: ${written} written, ${skipped} skipped`);
  console.log(`📋 pose frames: ${audit.present.length}/${audit.total} present`);
  console.log(
    `🎞  pose cycles: ${catalog.emitted.length}/${catalog.definedCount} emitted, ${catalog.skipped.length} skipped, missing frames ${catalog.missingFrameCount}`
  );
  if (audit.missing.length) {
    console.log(`⚠️  missing (${audit.missing.length}):`, audit.missing.join(", "));
  }
  console.log(`manifest → ${manifestPath}`);
  console.log(`catalog → ${catalog.catalogPath}`);
}

if (require.main === module) {
  main();
}

module.exports = {
  generateF2Frames,
  auditPoseFrames,
  collectFrameKeys,
  emitPoseCatalog,
  selectCompletePoseCycles,
  availableF2Keys,
  framePngExists,
  missingPairedAiFrames
};
