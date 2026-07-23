"use strict";

/**
 * Export paint timeline frames → Animation Bank 2.0 clip + sprite sheet pack.
 * Phase 16: multi-camera export (C1–C6) with cameraId in metadata.
 */

const fs = require("fs");
const path = require("path");
const { packClipDirectory } = require("../shared/mia-animation-engine/spriteSheetPack");
const { DEFAULT_BANK_ROOT, loadBankIndex } = require("../shared/mia-animation-engine/AnimationBank");
const { buildAnimationBank } = require("./build_animation_bank");
const {
  getCameraPreset,
  listCameraPresets,
  clipIdForCamera
} = require("../shared/mia-paint-core/cameraPresets");

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function normalizeClipId(clipId = "") {
  const id = safeString(clipId, "custom/clip_001")
    .replace(/\\/g, "/")
    .replace(/[^a-zA-Z0-9/_-]/g, "")
    .replace(/\/+/g, "/")
    .replace(/^\/+/, "");
  if (!id.includes("/")) return `custom/${id}`;
  return id;
}

function normalizeCameraList(input = {}) {
  if (Array.isArray(input.cameras) && input.cameras.length) {
    return input.cameras.map((c) => String(c).toUpperCase());
  }
  if (input.framesByCamera && typeof input.framesByCamera === "object") {
    return Object.keys(input.framesByCamera).map((c) => String(c).toUpperCase());
  }
  if (input.cameraId) return [String(input.cameraId).toUpperCase()];
  return [];
}

async function exportPaintFramesToBank(input = {}) {
  const clipId = normalizeClipId(input.clipId);
  const frames = Array.isArray(input.frames) ? input.frames : [];
  if (!frames.length) return { ok: false, error: "no_frames" };

  const bankRoot = input.bankRoot || DEFAULT_BANK_ROOT;
  const clipDir = path.join(bankRoot, ...clipId.split("/"));
  const framesDir = path.join(clipDir, "frames");
  ensureDir(framesDir);

  const sharp = require("sharp");
  let frameWidth = 0;
  let frameHeight = 0;

  for (let i = 0; i < frames.length; i += 1) {
    const raw = frames[i];
    const buf = Buffer.isBuffer(raw)
      ? raw
      : Buffer.from(String(raw).replace(/^data:image\/\w+;base64,/, ""), "base64");
    const meta = await sharp(buf).metadata();
    frameWidth = Math.max(frameWidth, meta.width || 0);
    frameHeight = Math.max(frameHeight, meta.height || 0);
    const fileName = `${String(i + 1).padStart(4, "0")}.png`;
    fs.writeFileSync(path.join(framesDir, fileName), buf);
  }

  const cameraId = safeString(input.cameraId).toUpperCase() || null;
  const preset = cameraId ? getCameraPreset(cameraId) : null;
  const tags = Array.isArray(input.tags) ? [...input.tags] : ["paint-export"];
  if (cameraId && !tags.some((t) => String(t).toLowerCase() === `camera:${cameraId.toLowerCase()}`)) {
    tags.push(`camera:${cameraId}`);
  }

  const metadata = {
    id: clipId,
    category: clipId.split("/")[0],
    label: safeString(input.label, clipId.split("/").pop()),
    fps: Math.max(1, Math.min(60, Number(input.fps) || 12)),
    loop: input.loop !== false,
    emotion: safeString(input.emotion, "idle"),
    effectProgram: safeString(input.effectProgram),
    giftKeys: Array.isArray(input.giftKeys) ? input.giftKeys : [],
    tags,
    frameCount: frames.length,
    frameWidth: frameWidth || undefined,
    frameHeight: frameHeight || undefined,
    anchor: input.anchor || { x: 0.5, y: 1 },
    cameraId: cameraId || undefined,
    shotLabel: safeString(input.shotLabel, preset?.label || "")
  };

  fs.writeFileSync(path.join(clipDir, "metadata.json"), `${JSON.stringify(metadata, null, 2)}\n`);

  const packed = await packClipDirectory(clipDir, { bankRoot, clipId });
  if (!packed.ok) return packed;

  await buildAnimationBank({ bankRoot, seed: false, force: true });
  const bank = loadBankIndex(bankRoot);
  const clip = bank.clips.find((c) => c.id === clipId);

  return {
    ok: true,
    clipId,
    cameraId,
    shotLabel: metadata.shotLabel || null,
    frameCount: frames.length,
    sheetUrl: clip?.sheetUrl || `/assets/animation-bank/${clipId}/built/sprite_sheet.png`,
    manifestUrl: clip?.manifestUrl || `/assets/animation-bank/${clipId}/built/sprite.json`,
    packed
  };
}

async function exportPaintMultiCameraToBank(input = {}) {
  const baseClipId = normalizeClipId(input.clipId);
  const framesByCamera = input.framesByCamera && typeof input.framesByCamera === "object" ? input.framesByCamera : null;
  let cameraIds = normalizeCameraList(input);

  if (!cameraIds.length && input.multiCamera === true) {
    cameraIds = listCameraPresets().map((p) => p.id);
  }

  if (!cameraIds.length) {
    return exportPaintFramesToBank(input);
  }

  const exports = [];
  for (const cameraId of cameraIds) {
    const frames = framesByCamera
      ? framesByCamera[cameraId] || framesByCamera[cameraId.toLowerCase()]
      : input.frames;
    if (!Array.isArray(frames) || !frames.length) {
      exports.push({ ok: false, cameraId, error: "no_frames_for_camera" });
      continue;
    }
    const preset = getCameraPreset(cameraId);
    const clipId = clipIdForCamera(baseClipId, cameraId);
    const result = await exportPaintFramesToBank({
      ...input,
      clipId,
      frames,
      cameraId,
      label: safeString(input.label, baseClipId.split("/").pop()) + ` (${preset.label})`,
      shotLabel: preset.label,
      tags: [...(Array.isArray(input.tags) ? input.tags : []), `camera:${cameraId}`, `multi-export`]
    });
    exports.push(result);
  }

  const okExports = exports.filter((e) => e.ok);
  if (!okExports.length) {
    return { ok: false, error: "multi_export_failed", exports };
  }

  return {
    ok: true,
    multiCamera: true,
    baseClipId,
    count: okExports.length,
    exports: okExports,
    clipIds: okExports.map((e) => e.clipId),
    cameraIds: okExports.map((e) => e.cameraId).filter(Boolean)
  };
}

module.exports = {
  exportPaintFramesToBank,
  exportPaintMultiCameraToBank,
  normalizeClipId,
  normalizeCameraList
};
