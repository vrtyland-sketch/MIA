"use strict";

const fs = require("fs");
const path = require("path");
const { BANK_VERSION, validateClipMetadata } = require("./animationBankSchema");

const DEFAULT_BANK_ROOT = path.resolve(
  __dirname,
  "..",
  "..",
  "mia-output-overlay",
  "assets",
  "animation-bank"
);

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function readJson(filePath, fallback = null) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function discoverClipDirs(bankRoot = DEFAULT_BANK_ROOT) {
  const clips = [];
  if (!fs.existsSync(bankRoot)) return clips;

  function walk(dir, rel = "") {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const hasMetadata = entries.some((e) => e.isFile() && e.name === "metadata.json");
    const hasFrames = entries.some((e) => e.isDirectory() && e.name === "frames");

    if (hasMetadata && hasFrames) {
      clips.push({
        dir,
        rel: rel.replace(/\\/g, "/"),
        id: rel.replace(/\\/g, "/")
      });
      return;
    }

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (entry.name === "built" || entry.name === "frames") continue;
      const childRel = rel ? `${rel}/${entry.name}` : entry.name;
      walk(path.join(dir, entry.name), childRel);
    }
  }

  walk(bankRoot);
  return clips;
}

function loadBankIndex(bankRoot = DEFAULT_BANK_ROOT) {
  const indexPath = path.join(bankRoot, "bank-index.json");
  const indexed = readJson(indexPath);
  if (indexed?.clips?.length) return indexed;

  const clips = discoverClipDirs(bankRoot).map((clip) => {
    const metadata = readJson(path.join(clip.dir, "metadata.json"), {});
    const builtManifest = readJson(path.join(clip.dir, "built", "sprite.json"), null);
    const validated = validateClipMetadata({ ...metadata, id: clip.id }, clip.id);
    return {
      id: clip.id,
      category: validated.normalized.category,
      label: validated.normalized.label,
      metadata: validated.normalized,
      built: fs.existsSync(path.join(clip.dir, "built", "sprite_sheet.png")),
      sheetUrl: `/assets/animation-bank/${clip.id}/built/sprite_sheet.png`,
      manifestUrl: `/assets/animation-bank/${clip.id}/built/sprite.json`,
      manifest: builtManifest
    };
  });

  return {
    version: BANK_VERSION,
    generatedAt: Date.now(),
    bankRoot,
    clipCount: clips.length,
    clips
  };
}

function getClipEntry(bank, clipId = "") {
  const id = safeString(clipId);
  if (!id || !bank?.clips) return null;
  return bank.clips.find((clip) => clip.id === id) || null;
}

function clipHasGiftKey(clip, giftKey) {
  const keys = clip?.metadata?.giftKeys || clip?.manifest?.giftKeys || [];
  if (!Array.isArray(keys) || !giftKey) return false;
  return keys.map((k) => String(k).toLowerCase()).includes(giftKey);
}

function isProductionClip(clip) {
  const quality = safeString(clip?.metadata?.quality || clip?.manifest?.quality).toLowerCase();
  if (quality === "production") return true;
  const source = safeString(clip?.metadata?.source || clip?.manifest?.source).toLowerCase();
  if (source === "production_moods") return true;
  const tags = clip?.metadata?.tags || clip?.manifest?.tags || [];
  return Array.isArray(tags) && tags.includes("production");
}

function isGiftOverrideClip(clip) {
  if (!clip?.built) return false;
  if (!isProductionClip(clip)) return false;
  if (clip.metadata?.giftOverride === true || clip.manifest?.giftOverride === true) return true;
  const tags = clip.metadata?.tags || clip.manifest?.tags || [];
  return Array.isArray(tags) && tags.includes("gift-override");
}

/**
 * Phase 12y — production clip with giftOverride beats hardcoded GIFT_ANIMATION_IDS.
 */
function findGiftOverrideClip(bank, giftKey) {
  const key = safeString(giftKey).toLowerCase();
  if (!key || !bank?.clips?.length) return null;
  return bank.clips.find((c) => isGiftOverrideClip(c) && clipHasGiftKey(c, key)) || null;
}

function resolveClipForGift(bank, input = {}) {
  const { resolveGiftAnimationId } = require("./effectProgramPresets");
  const { resolveCameraForContext, clipIdForCamera } = require("../mia-paint-core/cameraPresets");
  const giftKey = safeString(input.giftKey).toLowerCase();
  const effectProgram = safeString(input.effectProgram).toLowerCase();
  const emotion = safeString(input.emotion || input.mood, "happy").toLowerCase();
  const cameraId = resolveCameraForContext(input);

  // 12y: explicit production override for known gifts (rose/heart/…)
  const overrideClip = findGiftOverrideClip(bank, giftKey);
  if (overrideClip) return overrideClip;

  const directId = resolveGiftAnimationId(giftKey, effectProgram, emotion);
  let clip = getClipEntry(bank, clipIdForCamera(directId, cameraId));
  if (clip?.built) return clip;

  clip = getClipEntry(bank, directId);
  if (clip?.built && (!clip.metadata?.cameraId || clip.metadata.cameraId === cameraId)) return clip;

  const byCameraEmotion = bank.clips.find(
    (c) =>
      c.built &&
      safeString(c.metadata?.cameraId).toUpperCase() === cameraId &&
      safeString(c.metadata?.emotion).toLowerCase() === emotion
  );
  if (byCameraEmotion) return byCameraEmotion;

  const byCameraGift = bank.clips.find(
    (c) =>
      c.built &&
      safeString(c.metadata?.cameraId).toUpperCase() === cameraId &&
      Array.isArray(c.metadata?.giftKeys) &&
      c.metadata.giftKeys.map((k) => k.toLowerCase()).includes(giftKey)
  );
  if (byCameraGift) return byCameraGift;

  const byGiftKey = bank.clips.find(
    (c) => Array.isArray(c.metadata?.giftKeys) && c.metadata.giftKeys.map((k) => k.toLowerCase()).includes(giftKey)
  );
  if (byGiftKey?.built) return byGiftKey;

  const byEffect = bank.clips.find(
    (c) => safeString(c.metadata?.effectProgram).toLowerCase() === effectProgram && c.built
  );
  if (byEffect) return byEffect;

  const byEmotion = bank.clips.find(
    (c) => safeString(c.metadata?.emotion).toLowerCase() === emotion && c.built
  );
  if (byEmotion) return byEmotion;

  const idle = getClipEntry(bank, "idle/idle_001");
  return idle?.built ? idle : bank.clips.find((c) => c.built) || null;
}

module.exports = {
  DEFAULT_BANK_ROOT,
  discoverClipDirs,
  loadBankIndex,
  getClipEntry,
  resolveClipForGift,
  findGiftOverrideClip,
  isGiftOverrideClip,
  isProductionClip
};
