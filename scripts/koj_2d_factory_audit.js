"use strict";

/**
 * Audit 2D grafické továrny Kojnožroutů — co je hotové vs. co chybí.
 *
 *   node scripts/koj_2d_factory_audit.js
 *   node scripts/koj_2d_factory_audit.js --json
 */

const fs = require("fs");
const path = require("path");
const { CANON_MOODS, MOODS_DIR, isCanonArtFile } = require("./kojnozrout_restore_canon_sprites");
const { DERIVED_MOOD_KEYS, MASTER_MOODS } = require("./KOJNOZROUT_MOOD_DERIVE");
const { ANIM_SPECS, FORMS } = require("./generate_platform_form_anims");
const { PAIRED_FRAME_SOURCES } = require("./kojnozrout_pose_frames");

const ROOT = path.join(__dirname, "..", "mia-output-overlay", "assets", "kojnozrout");

function fileOk(p, min = 800) {
  try {
    return fs.existsSync(p) && fs.statSync(p).size >= min;
  } catch (_) {
    return false;
  }
}

function auditMoods() {
  const canon = [];
  const derivedOk = [];
  const derivedMissing = [];
  for (const mood of CANON_MOODS) {
    const p = path.join(MOODS_DIR, `kojnozout-${mood}.png`);
    if (fileOk(p, 5000)) {
      canon.push({ mood, bytes: fs.statSync(p).size, handPainted: isCanonArtFile(p) });
    } else {
      canon.push({ mood, missing: true });
    }
  }
  for (const mood of DERIVED_MOOD_KEYS) {
    const p = path.join(MOODS_DIR, `kojnozout-${mood}.png`);
    if (fileOk(p)) derivedOk.push(mood);
    else derivedMissing.push(mood);
  }
  return { canon, derivedOk: derivedOk.length, derivedMissing, derivedTotal: DERIVED_MOOD_KEYS.length };
}

function auditPoses() {
  let manifest = { audit: { present: [], missing: [] } };
  const manifestPath = path.join(ROOT, "pose-frames-manifest.json");
  if (fs.existsSync(manifestPath)) {
    manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  }
  const aiBriefs = Object.keys(PAIRED_FRAME_SOURCES).filter((k) => /-[ab]$/.test(k));
  const aiPresent = aiBriefs.filter((k) => fileOk(path.join(MOODS_DIR, `kojnozout-${k}.png`)));
  const aiMissing = aiBriefs.filter((k) => !fileOk(path.join(MOODS_DIR, `kojnozout-${k}.png`)));
  return {
    poseFramesPresent: manifest.audit?.present?.length || 0,
    poseFramesMissing: manifest.audit?.missing || [],
    pairedAiBriefs: aiBriefs.length,
    pairedAiPresent: aiPresent.length,
    pairedAiMissing: aiMissing.slice(0, 20),
    pairedAiMissingCount: aiMissing.length
  };
}

function auditPlatformForms() {
  const platforms = {};
  for (const platform of FORMS) {
    const dir = path.join(ROOT, "forms", platform);
    const files = {};
    for (const anim of Object.keys(ANIM_SPECS)) {
      files[anim] = fileOk(path.join(dir, `${anim}.png`), 50000);
    }
    platforms[platform] = {
      ok: Object.values(files).every(Boolean),
      missing: Object.entries(files).filter(([, v]) => !v).map(([k]) => k)
    };
  }
  const masters = ["tokzrout", "stackzrout", "bitszrout", "kisstube"].map((name) => ({
    name,
    ok: fileOk(path.join(ROOT, "masters", `${name}-master.png`), 50000)
  }));
  return { platforms, masters, animCount: Object.keys(ANIM_SPECS).length };
}

function auditBattle() {
  const stems = ["battle", "attack2", "hit", "hit2", "defend", "win", "faint", "box", "heal", "buff", "taunt"];
  const gaps = [];
  for (const platform of FORMS) {
    for (const stem of stems) {
      if (!fileOk(path.join(ROOT, "battle", `${platform}-${stem}.png`), 50000)) {
        gaps.push(`${platform}-${stem}`);
      }
    }
  }
  return { mirrorOk: gaps.length === 0, gaps };
}

function auditFactoryGfx() {
  const projDir = path.join(ROOT, "fx", "projectiles");
  const arenaDir = path.join(ROOT, "arena");
  const itemsDir = path.join(ROOT, "items");
  const evoDir = path.join(ROOT, "evolution");
  const projectiles = ["coin", "box", "orb", "heart", "food", "star", "spark", "particle-sheet", "particle-sheet-anim", "burst-impact-sheet"].filter(
    (n) => fileOk(path.join(projDir, `${n}.png`), 200)
  );
  const arena = ["background", "vs-badge"].filter((n) => fileOk(path.join(arenaDir, `${n}.png`), 1000));
  const evolution = ["egg", "hatchling", "sprout", "guardian", "legend"].filter((n) =>
    fileOk(path.join(evoDir, `${n}.png`), 5000)
  );
  let itemCount = 0;
  try {
    itemCount = fs.readdirSync(itemsDir).filter((f) => f.endsWith(".png")).length;
  } catch (_) {
    itemCount = 0;
  }
  let battleFrames = 0;
  for (const platform of FORMS) {
    for (const frame of ["attack_01", "attack_02", "attack_03", "hit_01", "hit_02"]) {
      if (fileOk(path.join(ROOT, "forms", platform, `${frame}.png`), 50000)) battleFrames += 1;
    }
  }
  const propsDir = path.join(ROOT, "props");
  const scenesDir = path.join(ROOT, "scenes");
  const props = ["bowl", "ball", "mic", "hand"].filter((n) =>
    fileOk(path.join(propsDir, `${n}.png`), 20000)
  );
  const scenes = ["den", "cave", "cozy", "feast", "party", "night"].filter((n) =>
    fileOk(path.join(scenesDir, `scene-${n}.png`), 100000)
  );
  return {
    projectiles,
    arena,
    evolution,
    itemCount,
    battleFrames,
    battleFramesExpected: FORMS.length * 5,
    props,
    scenes
  };
}

function buildGapList(report) {
  const gaps = [];

  gaps.push({
    area: "Kánonové master nálady (malované)",
    status: report.moods.canon.filter((c) => c.missing).length ? "🟡" : "🟢",
    done: `${report.moods.canon.filter((c) => !c.missing).length}/${CANON_MOODS.length} PNG`,
    remains:
      report.moods.canon.filter((c) => c.missing).length
        ? `Chybí: ${report.moods.canon.filter((c) => c.missing).map((c) => c.mood).join(", ")}`
        : "13 master nálad — základ továrny"
  });

  gaps.push({
    area: "Derived nálady (transform z masterů)",
    status: report.moods.derivedMissing.length ? "🟡" : "🟢",
    done: `${report.moods.derivedOk}/${report.moods.derivedTotal}`,
    remains: report.moods.derivedMissing.length
      ? `${report.moods.derivedMissing.length} chybí — npm run generate:koj-moods`
      : "Automaticky odvozené"
  });

  gaps.push({
    area: "Pose snímky (248 cyklů)",
    status: report.poses.poseFramesMissing.length ? "🔴" : "🟢",
    done: `${report.poses.poseFramesPresent} snímků`,
    remains: report.poses.poseFramesMissing.length
      ? `Chybí: ${report.poses.poseFramesMissing.join(", ")}`
      : "Kompletní — npm run generate:koj-poses"
  });

  gaps.push({
    area: "Párové AI snímky (walk/hop/dance…)",
    status: report.poses.pairedAiMissingCount ? "🟡" : "🟢",
    done: `${report.poses.pairedAiPresent}/${report.poses.pairedAiBriefs} párů`,
    remains:
      report.poses.pairedAiMissingCount > 0
        ? "Část je transform fallback — pro skutečný krok/chůzi dodat ruční/AI snímky dle PAIRED_FRAME_SOURCES v kojnozrout_pose_frames.js"
        : "Všechny páry na disku"
  });

  gaps.push({
    area: "Platform coin-žrouti (4 mastery + formy)",
    status: Object.values(report.platforms.platforms).every((p) => p.ok) ? "🟢" : "🔴",
    done: `4 mastery · ${report.platforms.animCount} animací × 4 platformy`,
    remains: Object.values(report.platforms.platforms)
      .filter((p) => !p.ok)
      .map((p) => p.missing.join(", "))
      .join("; ") || "npm run generate:platform-forms"
  });

  gaps.push({
    area: "Battle mirror + choreografie",
    status: report.battle.mirrorOk ? "🟢" : "🟡",
    done: report.battle.mirrorOk ? "44 battle PNG + overlay FX" : "Neúplné",
    remains: report.battle.gaps.join(", ") || "OBS test: npm run battle:demo"
  });

  gaps.push({
    area: "Unikátní battle animace per platforma",
    status:
      report.factory.battleFrames >= report.factory.battleFramesExpected ? "🟢" : "🟡",
    done: `${report.factory.battleFrames}/${report.factory.battleFramesExpected} multi-frame PNG`,
    remains:
      report.factory.battleFrames >= report.factory.battleFramesExpected
        ? "attack_01…03 + hit_01…02 per platforma"
        : "npm run generate:koj-2d-factory"
  });

  gaps.push({
    area: "Projectile / FX sprite PNG",
    status: report.factory.projectiles.length >= 8 ? "🟢" : "🔴",
    done: `${report.factory.projectiles.length}/8 projectile PNG`,
    remains:
      report.factory.projectiles.length >= 8
        ? "PNG v arena overlay + particle sheet"
        : "npm run generate:koj-2d-factory"
  });

  gaps.push({
    area: "Arena pozadí + UI chrome",
    status: report.factory.arena.length >= 2 ? "🟢" : "🟡",
    done: `${report.factory.arena.length}/2 arena PNG + damage float CSS`,
    remains:
      report.factory.arena.length >= 2
        ? "background.png + vs-badge.png v overlay"
        : "npm run generate:koj-2d-factory"
  });

  gaps.push({
    area: "Evoluce / tier formy Koje",
    status: report.factory.evolution.length >= 5 ? "🟢" : "🔴",
    done: `${report.factory.evolution.length}/5 tier PNG`,
    remains:
      report.factory.evolution.length >= 5
        ? "egg → legend v assets/kojnozrout/evolution/"
        : "npm run generate:koj-2d-factory"
  });

  gaps.push({
    area: "Props (miska, batoh, itemy ve scéně)",
    status: report.factory.props.length >= 4 ? "🟢" : "🔴",
    done: `${report.factory.props.length}/4 scene prop PNG`,
    remains:
      report.factory.props.length >= 4
        ? "bowl · ball · mic · hand v runtime propLayer"
        : "npm run generate:koj-2d-factory"
  });

  gaps.push({
    area: "Scény za Kojem (den/cave/cozy/feast/party/night)",
    status: report.factory.scenes.length >= 6 ? "🟢" : "🔴",
    done: `${report.factory.scenes.length}/6 scene PNG`,
    remains:
      report.factory.scenes.length >= 6
        ? "runtime = tint + accent fragmenty · celoplošné = away-loop?gfx=1"
        : "npm run generate:koj-2d-factory"
  });

  gaps.push({
    area: "Item ikony batohu",
    status: report.factory.itemCount >= 15 ? "🟢" : "🟡",
    done: `${report.factory.itemCount} item ikon PNG`,
    remains:
      report.factory.itemCount >= 15
        ? "assets/kojnozrout/items/{id}.png"
        : "npm run generate:koj-2d-factory"
  });

  gaps.push({
    area: "Normalizace nohou / baseline",
    status: "🟢",
    done: "npm run normalize:frames",
    remains: "Po nových AI snímcích vždy znovu normalizovat"
  });

  return gaps;
}

function main() {
  const asJson = process.argv.includes("--json");
  const report = {
    generatedAt: new Date().toISOString(),
    moods: auditMoods(),
    poses: auditPoses(),
    platforms: auditPlatformForms(),
    battle: auditBattle(),
    factory: auditFactoryGfx(),
    pipelines: {
      restoreCanon: "npm run restore:koj-sprites",
      deriveMoods: "npm run generate:koj-moods",
      poseFrames: "npm run generate:koj-poses",
      platformForms: "npm run generate:platform-forms",
      factoryGfx: "npm run generate:koj-2d-factory",
      battleBundle: "npm run generate:koj-battle-assets",
      normalize: "npm run normalize:frames",
      obsDemo: "npm run battle:demo"
    }
  };
  report.gaps = buildGapList(report);
  report.completionPct = Math.round(
    (report.gaps.filter((g) => g.status === "🟢").length / report.gaps.length) * 100
  );

  const outPath = path.join(__dirname, "..", "data", "koj-2d-factory-audit.json");
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2), "utf8");

  if (asJson) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  console.log("\n=== MIA · 2D GRAFICKÁ TOVÁRNA KOJNOŽROUT ===\n");
  for (const row of report.gaps) {
    console.log(`${row.status} ${row.area}`);
    console.log(`   Hotovo: ${row.done}`);
    console.log(`   Zbývá:  ${row.remains}\n`);
  }
  console.log(`Detail JSON → ${outPath}`);
  console.log(`Dokončení: ${report.completionPct}%\n`);
}

if (require.main === module) main();

module.exports = { auditMoods, auditPoses, auditPlatformForms, auditBattle, auditFactoryGfx, buildGapList };
