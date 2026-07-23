"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const { generateKoj2dFactory } = require("../scripts/generate_koj_2d_factory_gfx");
const { buildGapList, auditFactoryGfx, auditMoods, auditPoses, auditPlatformForms, auditBattle } = require("../scripts/koj_2d_factory_audit");

const ROOT = path.join(__dirname, "..", "mia-output-overlay", "assets", "kojnozrout");

async function run() {
  console.log("\n---- KOJ 2D FACTORY CONTRACT ----\n");

  try {
    const result = await generateKoj2dFactory();
    assert.equal(result.ok, true);
    assert.ok(result.manifest.projectiles.length >= 8);
    assert.ok(result.manifest.arena.length >= 2);
    assert.ok(result.manifest.items.length >= 15);
    assert.equal(result.manifest.evolution.filter((r) => r.ok || r.skipped).length, 5);
    assert.ok(result.manifest.props.length >= 4);
    assert.ok(result.manifest.scenes.length >= 6);
    console.log("✅ factory generator produces all gfx layers");
  } catch (err) {
    console.error("❌ factory generator produces all gfx layers");
    console.error(err?.stack || err);
    process.exitCode = 1;
  }

  try {
    for (const name of ["coin", "box", "orb", "heart", "food", "star", "spark"]) {
      const p = path.join(ROOT, "fx", "projectiles", `${name}.png`);
      assert.ok(fs.existsSync(p), p);
      assert.ok(fs.statSync(p).size > 5000, `${name} should be hand-painted`);
    }
    console.log("✅ projectile PNG files exist on disk");
  } catch (err) {
    console.error("❌ projectile PNG files exist on disk");
    console.error(err?.stack || err);
    process.exitCode = 1;
  }

  try {
    for (const tier of ["egg", "hatchling", "sprout", "guardian", "legend"]) {
      const p = path.join(ROOT, "evolution", `${tier}.png`);
      assert.ok(fs.existsSync(p), p);
      assert.ok(fs.statSync(p).size > 50000, `${tier} should be hand-painted`);
    }
    console.log("✅ evolution tier sprites exist");
  } catch (err) {
    console.error("❌ evolution tier sprites exist");
    console.error(err?.stack || err);
    process.exitCode = 1;
  }

  try {
    for (const name of ["bowl", "ball", "mic", "hand"]) {
      const p = path.join(ROOT, "props", `${name}.png`);
      assert.ok(fs.existsSync(p), p);
      assert.ok(fs.statSync(p).size > 20000);
    }
    console.log("✅ scene prop PNG files exist on disk");
  } catch (err) {
    console.error("❌ scene prop PNG files exist on disk");
    console.error(err?.stack || err);
    process.exitCode = 1;
  }

  try {
    for (const scene of ["den", "cave", "cozy", "feast", "party", "night"]) {
      const p = path.join(ROOT, "scenes", `scene-${scene}.png`);
      assert.ok(fs.existsSync(p), p);
      assert.ok(fs.statSync(p).size > 100000);
    }
    console.log("✅ koj scene background PNG files exist on disk");
  } catch (err) {
    console.error("❌ koj scene background PNG files exist on disk");
    console.error(err?.stack || err);
    process.exitCode = 1;
  }

  try {
    const report = {
      moods: auditMoods(),
      poses: auditPoses(),
      platforms: auditPlatformForms(),
      battle: auditBattle(),
      factory: auditFactoryGfx()
    };
    const gaps = buildGapList(report);
    const pct = Math.round((gaps.filter((g) => g.status === "🟢").length / gaps.length) * 100);
    assert.equal(pct, 100, `completion ${pct}% gaps: ${gaps.filter((g) => g.status !== "🟢").map((g) => g.area).join(", ")}`);
    console.log("✅ audit reports 100% completion");
  } catch (err) {
    console.error("❌ audit reports 100% completion");
    console.error(err?.stack || err);
    process.exitCode = 1;
  }

  if (!process.exitCode) {
    console.log("\nkoj_2d_factory_contract: all passed\n");
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
