"use strict";

/**
 * Mega bank — 300+ Kojnožrout PNG:
 * - transparentní sprite (OBS overlay)
 * - pozadí (gift programy)
 * - full scény (pozadí + Koj = wau efekt)
 *
 *   node scripts/kojnozrout_generate_mega_bank.js
 *   node scripts/kojnozrout_generate_mega_bank.js --force
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { ALL_MOODS, EATING_VARIANT_COUNT } = require("./kojnozrout_sprite_renderer");
const { listBackgroundPrograms } = require("./kojnozrout_background_generator");
const { renderKojSpriteBuffer, composeKojScene } = require("./kojnozrout_scene_composer");
const { renderGiftBackground } = require("./kojnozrout_background_generator");

const ASSETS_ROOT = path.resolve(__dirname, "..", "mia-output-overlay", "assets", "kojnozrout");
const MEGA_DIR = path.join(ASSETS_ROOT, "mega");
const SPRITES_DIR = path.join(MEGA_DIR, "sprites");
const BACKGROUNDS_DIR = path.join(MEGA_DIR, "backgrounds");
const SCENES_DIR = path.join(MEGA_DIR, "scenes");
const MANIFEST_PATH = path.join(MEGA_DIR, "mega-bank-manifest.json");

const MOOD_SEED_COUNT = 10;
const BACKGROUND_SEED_COUNT = 4;
const TARGET_MIN_TOTAL = 300;

function sha256(buf) {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function pad4(n) {
  return String(n).padStart(4, "0");
}

function relative(filePath) {
  return path.relative(ASSETS_ROOT, filePath).replace(/\\/g, "/");
}

function generateMegaBank(options = {}) {
  const force = Boolean(options.force);
  const quick = Boolean(options.quick);
  const moods = quick ? ALL_MOODS.slice(0, 2) : ALL_MOODS;
  const programs = quick ? listBackgroundPrograms().slice(0, 2) : listBackgroundPrograms();
  const moodSeedCount = quick ? 2 : MOOD_SEED_COUNT;
  const backgroundSeedCount = quick ? 2 : BACKGROUND_SEED_COUNT;
  const targetMin = quick ? 8 : TARGET_MIN_TOTAL;
  ensureDir(SPRITES_DIR);
  ensureDir(BACKGROUNDS_DIR);
  ensureDir(SCENES_DIR);

  const sprites = [];
  const backgrounds = [];
  const scenes = [];
  const hashes = new Set();
  let sceneId = 0;

  for (const mood of moods) {
    for (let seed = 0; seed < moodSeedCount; seed += 1) {
      const fileName = `koj-${mood}-s${pad2(seed)}.png`;
      const outPath = path.join(SPRITES_DIR, fileName);
      const buf = renderKojSpriteBuffer(mood, seed);
      const hash = sha256(buf);

      if (!force && fs.existsSync(outPath) && fs.statSync(outPath).size > 800) {
        sprites.push({ id: `${mood}-s${pad2(seed)}`, mood, seed, file: relative(outPath), skipped: true });
      } else {
        fs.writeFileSync(outPath, buf);
        sprites.push({
          id: `${mood}-s${pad2(seed)}`,
          mood,
          seed,
          type: "sprite",
          file: relative(outPath),
          bytes: buf.length,
          sha256: hash
        });
      }
      hashes.add(hash);
    }
  }

  for (const program of programs) {
    for (let seed = 0; seed < backgroundSeedCount; seed += 1) {
      const fileName = `bg-${program}-s${pad2(seed)}.png`;
      const outPath = path.join(BACKGROUNDS_DIR, fileName);
      const buf = renderGiftBackground(program, seed * 17 + program.length);
      const hash = sha256(buf);

      if (!force && fs.existsSync(outPath) && fs.statSync(outPath).size > 800) {
        backgrounds.push({ id: `${program}-s${pad2(seed)}`, program, seed, file: relative(outPath), skipped: true });
      } else {
        fs.writeFileSync(outPath, buf);
        backgrounds.push({
          id: `${program}-s${pad2(seed)}`,
          program,
          seed,
          type: "background",
          file: relative(outPath),
          bytes: buf.length,
          sha256: hash
        });
      }
      hashes.add(hash);
    }
  }

  for (const mood of moods) {
    for (const program of programs) {
      sceneId += 1;
      const seed = sceneId % moodSeedCount;
      const layout = sceneId % 5 === 0 ? "hero" : sceneId % 7 === 0 ? "corner" : "center";
      const fileName = `scene-${pad4(sceneId)}-${mood}-${program}.png`;
      const outPath = path.join(SCENES_DIR, fileName);
      const composed = composeKojScene({ mood, effectProgram: program, seed, layout });
      const buf = composed.pngBuffer;
      const hash = sha256(buf);

      if (!force && fs.existsSync(outPath) && fs.statSync(outPath).size > 2000) {
        scenes.push({
          id: sceneId,
          mood,
          program,
          seed,
          layout,
          file: relative(outPath),
          skipped: true
        });
      } else {
        fs.writeFileSync(outPath, buf);
        scenes.push({
          id: sceneId,
          mood,
          program,
          seed,
          layout,
          type: "scene",
          file: relative(outPath),
          bytes: buf.length,
          sha256: hash
        });
      }
      hashes.add(hash);
    }
  }

  const totalCount = sprites.length + backgrounds.length + scenes.length;
  const manifest = {
    version: 1,
    generatedAt: Date.now(),
    targetMinTotal: targetMin,
    totalCount,
    spriteCount: sprites.length,
    backgroundCount: backgrounds.length,
    sceneCount: scenes.length,
    moodSeedCount,
    backgroundSeedCount,
    moods: ALL_MOODS,
    eatingVariants: EATING_VARIANT_COUNT,
    uniqueHashes: hashes.size,
    dirs: {
      sprites: "mega/sprites",
      backgrounds: "mega/backgrounds",
      scenes: "mega/scenes"
    },
    sprites,
    backgrounds,
    scenes
  };

  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), "utf8");

  return {
    ok: totalCount >= targetMin,
    manifestPath: MANIFEST_PATH,
    totalCount,
    spriteCount: sprites.length,
    backgroundCount: backgrounds.length,
    sceneCount: scenes.length,
    uniqueHashes: hashes.size,
    writtenSprites: sprites.filter((s) => !s.skipped).length,
    writtenBackgrounds: backgrounds.filter((b) => !b.skipped).length,
    writtenScenes: scenes.filter((s) => !s.skipped).length
  };
}

if (require.main === module) {
  const result = generateMegaBank({
    force: process.argv.includes("--force"),
    quick: process.argv.includes("--quick")
  });
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exitCode = 1;
}

module.exports = {
  generateMegaBank,
  MEGA_DIR,
  MANIFEST_PATH,
  MOOD_SEED_COUNT,
  BACKGROUND_SEED_COUNT,
  TARGET_MIN_TOTAL
};
