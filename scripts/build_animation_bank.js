"use strict";

/**
 * Phase 13 — pack Animation Bank clip frames → sprite_sheet.png + sprite.json + bank-index.json
 *
 *   npm run seed:animation-bank
 *   npm run build:animation-bank
 */

const fs = require("fs");
const path = require("path");
const { packClipDirectory } = require("../shared/mia-animation-engine/spriteSheetPack");
const { discoverClipDirs, DEFAULT_BANK_ROOT } = require("../shared/mia-animation-engine/AnimationBank");
const { BANK_VERSION } = require("../shared/mia-animation-engine/animationBankSchema");
const { seedAnimationBank } = require("./seed_animation_bank");

async function buildAnimationBank(options = {}) {
  const bankRoot = options.bankRoot || DEFAULT_BANK_ROOT;

  if (options.seed !== false) {
    seedAnimationBank({ force: Boolean(options.force) });
  }

  const clipDirs = discoverClipDirs(bankRoot);
  const packed = [];

  for (const clip of clipDirs) {
    const result = await packClipDirectory(clip.dir, { bankRoot, clipId: clip.id });
    packed.push(result);
    if (!result.ok) {
      throw new Error(`pack_failed:${clip.id}:${result.error}`);
    }
  }

  const clips = packed
    .filter((p) => p.ok)
    .map((p) => ({
      id: p.clipId,
      category: p.clipId.split("/")[0],
      label: p.manifest?.label || p.clipId,
      metadata: {
        id: p.clipId,
        fps: p.manifest?.fps,
        loop: p.manifest?.loop,
        emotion: p.manifest?.emotion,
        effectProgram: p.manifest?.effectProgram,
        giftKeys: p.manifest?.giftKeys || [],
        tags: p.manifest?.tags || [],
        tiers: p.manifest?.tiers || [],
        quality: p.manifest?.quality || null,
        source: p.manifest?.source || null,
        spriteHint: p.manifest?.spriteHint || null,
        giftOverride: p.manifest?.giftOverride === true,
        trueAlpha: p.manifest?.trueAlpha === true,
        avgAlphaRatio: p.manifest?.avgAlphaRatio ?? null
      },
      built: true,
      sheetUrl: `/assets/animation-bank/${p.clipId}/built/sprite_sheet.png`,
      manifestUrl: `/assets/animation-bank/${p.clipId}/built/sprite.json`,
      manifest: p.manifest,
      frameCount: p.frameCount
    }));

  const index = {
    version: BANK_VERSION,
    generatedAt: Date.now(),
    bankRoot,
    clipCount: clips.length,
    clips
  };

  const indexPath = path.join(bankRoot, "bank-index.json");
  fs.writeFileSync(indexPath, `${JSON.stringify(index, null, 2)}\n`);

  return {
    ok: true,
    indexPath,
    clipCount: clips.length,
    clips: clips.map((c) => c.id)
  };
}

if (require.main === module) {
  const force = process.argv.includes("--force");
  buildAnimationBank({ force, seed: !process.argv.includes("--no-seed") })
    .then((result) => {
      console.log(JSON.stringify(result, null, 2));
    })
    .catch((err) => {
      console.error(err);
      process.exitCode = 1;
    });
}

module.exports = { buildAnimationBank };
