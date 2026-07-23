"use strict";

/**
 * Kompletní animační / mood sady pro platformní formy z master idle PNG.
 *
 *   node scripts/generate_platform_form_anims.js --force
 */

const fs = require("fs");
const path = require("path");
const { transformCanonFile } = require("./kojnozrout_canon_transform");

const ROOT = path.join(__dirname, "..", "mia-output-overlay", "assets", "kojnozrout");
const FORMS = ["tiktok", "kick", "twitch", "youtube"];

const MASTER_FILES = {
  tiktok: "tokzrout-master.png",
  kick: "stackzrout-master.png",
  twitch: "bitszrout-master.png",
  youtube: "kisstube-master.png"
};

/** Plná sada: battle + nálady napojené na stávající mood systém. */
const ANIM_SPECS = {
  idle: { source: "idle" },
  // nálady
  happy: { source: "idle", scale: 1.04, rotateDeg: -6, offsetY: -12 },
  warm: { source: "idle", scale: 0.98, rotateDeg: 4, offsetY: 8, hueDeg: -8 },
  love: { source: "idle", scale: 1.05, rotateDeg: -8, hueDeg: -18, satMul: 1.08 },
  excited: { source: "idle", scale: 1.1, rotateDeg: 8, offsetY: -28 },
  laugh: { source: "idle", scale: 1.08, rotateDeg: -12, offsetY: -16, hueDeg: 10 },
  hungry: { source: "idle", scale: 0.96, rotateDeg: 7, offsetY: 14, lightMul: 0.94 },
  full: { source: "idle", scale: 1.06, rotateDeg: -4, offsetY: 10 },
  sleepy: { source: "idle", scale: 0.92, rotateDeg: 10, offsetY: 28, lightMul: 0.9 },
  sick: { source: "idle", scale: 0.94, rotateDeg: 6, offsetY: 16, hueDeg: 40, satMul: 0.75 },
  sad: { source: "idle", scale: 0.9, rotateDeg: 8, offsetY: 22, lightMul: 0.82 },
  annoyed: { source: "idle", scale: 1.02, rotateDeg: -10, offsetX: -12 },
  stressed: { source: "idle", scale: 0.97, rotateDeg: 11, offsetX: 14, lightMul: 0.88 },
  curious: { source: "idle", scale: 1.04, rotateDeg: 12, offsetY: -18 },
  proud: { source: "idle", scale: 1.08, rotateDeg: -6, offsetY: -14 },
  // battle / item
  attack: { source: "idle", scale: 1.08, rotateDeg: -14, offsetX: 40, offsetY: -10 },
  attack2: { source: "idle", scale: 1.12, rotateDeg: -20, offsetX: 56, offsetY: -18 },
  hit: { source: "idle", scale: 0.94, rotateDeg: 12, offsetX: -36, lightMul: 0.86 },
  hit2: { source: "idle", scale: 0.9, rotateDeg: 16, offsetX: -48, lightMul: 0.8 },
  win: { source: "idle", scale: 1.14, rotateDeg: -8, offsetY: -36, hueDeg: 8 },
  faint: { source: "idle", scale: 0.86, rotateDeg: 28, offsetY: 40, lightMul: 0.72 },
  defend: { source: "idle", scale: 0.9, rotateDeg: 4, offsetY: 18 },
  item_box: { source: "idle", scale: 1.06, rotateDeg: -18, offsetX: 48, offsetY: -20 },
  item_heal: { source: "idle", scale: 1.02, rotateDeg: 6, hueDeg: -12, satMul: 1.06 },
  item_buff: { source: "idle", scale: 1.08, rotateDeg: -10, offsetY: -18, hueDeg: 16 },
  // pohyb
  hop: { source: "idle", scale: 1.1, offsetY: -34, rotateDeg: -6 },
  wave: { source: "idle", scale: 1.03, rotateDeg: -11, offsetX: 28 },
  lean_left: { source: "idle", rotateDeg: 16, offsetX: 36 },
  lean_right: { source: "idle", rotateDeg: -16, offsetX: -36 },
  taunt: { source: "idle", scale: 1.06, rotateDeg: 10, offsetY: -12, flipX: true }
};

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function generateForPlatform(platform, force = false) {
  const dir = path.join(ROOT, "forms", platform);
  ensureDir(dir);
  const idlePath = path.join(dir, "idle.png");
  const masterFallback = path.join(ROOT, "masters", MASTER_FILES[platform]);

  if (!fs.existsSync(idlePath) && fs.existsSync(masterFallback)) {
    fs.copyFileSync(masterFallback, idlePath);
  }
  if (!fs.existsSync(idlePath)) {
    return { platform, ok: false, reason: "idle_missing" };
  }

  const results = [];
  for (const [anim, spec] of Object.entries(ANIM_SPECS)) {
    const dest = path.join(dir, `${anim}.png`);
    if (anim === "idle") {
      results.push({ anim, skipped: true });
      continue;
    }
    if (!force && fs.existsSync(dest) && fs.statSync(dest).size > 0) {
      results.push({ anim, skipped: true });
      continue;
    }
    const src = path.join(dir, `${spec.source || "idle"}.png`);
    transformCanonFile(src, dest, spec);
    results.push({ anim, ok: true, bytes: fs.statSync(dest).size });
  }

  const battleDir = path.join(ROOT, "battle");
  ensureDir(battleDir);
  /** Zrcadlo klíčových battle PNG pro legacy overlay cesty. */
  const battleMirror = {
    battle: "attack",
    attack2: "attack2",
    hit: "hit",
    hit2: "hit2",
    win: "win",
    faint: "faint",
    defend: "defend",
    box: "item_box",
    heal: "item_heal",
    buff: "item_buff",
    taunt: "taunt"
  };
  for (const [destStem, srcStem] of Object.entries(battleMirror)) {
    const srcPath = path.join(dir, `${srcStem}.png`);
    if (!fs.existsSync(srcPath)) continue;
    fs.copyFileSync(srcPath, path.join(battleDir, `${platform}-${destStem}.png`));
  }

  return { platform, ok: true, count: results.filter((r) => r.ok).length, results };
}

function main() {
  const force = process.argv.includes("--force");
  const platformArg = process.argv.find((a) => a.startsWith("--platform="));
  const only = platformArg ? platformArg.split("=")[1] : null;
  const targets = only && FORMS.includes(only) ? [only] : FORMS;
  const out = targets.map((p) => generateForPlatform(p, force));
  console.log(JSON.stringify({ ok: true, force, only: only || "all", out }, null, 2));
}

if (require.main === module) main();

module.exports = { generateForPlatform, ANIM_SPECS, FORMS };
