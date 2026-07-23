"use strict";

const sharp = require("sharp");
const { removeBackgroundBuffer } = require("../mia-paint-ai/imageOps");

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function bufferFromInput(input) {
  if (Buffer.isBuffer(input)) return input;
  const raw = String(input || "").replace(/^data:image\/\w+;base64,/, "");
  return Buffer.from(raw, "base64");
}

async function chromaKeyGreenBuffer(inputBuffer, opts = {}) {
  const tolerance = clamp(Number(opts.tolerance) || 48, 8, 120);
  const { data, info } = await sharp(inputBuffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const isGreen = g > 80 && g > r + tolerance * 0.35 && g > b + tolerance * 0.35;
    if (isGreen) data[i + 3] = 0;
  }
  return sharp(Buffer.from(data), { raw: { width: info.width, height: info.height, channels: 4 } })
    .png()
    .toBuffer();
}

async function applyCreatureTintBuffer(inputBuffer, creatureParams = {}) {
  if (!creatureParams || !creatureParams.skinTint) return inputBuffer;
  const [tr, tg, tb] = creatureParams.skinTint;
  const [er, eg, eb] = creatureParams.edgeGlow || [0, 255, 180];
  const strength = clamp(Number(creatureParams.plateStrength) || 0.5, 0, 1);
  const { data, info } = await sharp(inputBuffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a < 8) continue;
    const edge = a < 220 ? 1 : 0;
    data[i] = clamp(Math.round(data[i] * (1 - strength) + tr * strength + edge * er * 0.15), 0, 255);
    data[i + 1] = clamp(Math.round(data[i + 1] * (1 - strength) + tg * strength + edge * eg * 0.15), 0, 255);
    data[i + 2] = clamp(Math.round(data[i + 2] * (1 - strength) + tb * strength + edge * eb * 0.15), 0, 255);
  }
  return sharp(Buffer.from(data), { raw: { width: info.width, height: info.height, channels: 4 } })
    .png()
    .toBuffer();
}

async function processFrameMatting(input, opts = {}) {
  const buf = bufferFromInput(input);
  if (!buf.length) return { ok: false, error: "empty_frame" };

  const mode = String(opts.mode || "auto").toLowerCase();
  let matteBuf;
  if (mode === "chroma_green") {
    matteBuf = await chromaKeyGreenBuffer(buf, opts);
  } else if (mode === "corner") {
    matteBuf = await removeBackgroundBuffer(buf, opts);
  } else {
    try {
      matteBuf = await chromaKeyGreenBuffer(buf, { tolerance: opts.tolerance || 40 });
      const meta = await sharp(matteBuf).raw().toBuffer({ resolveWithObject: true });
      let visible = 0;
      for (let i = 3; i < meta.data.length; i += 4) {
        if (meta.data[i] > 16) visible += 1;
      }
      const ratio = visible / (meta.info.width * meta.info.height);
      if (ratio > 0.92) {
        matteBuf = await removeBackgroundBuffer(buf, opts);
      }
    } catch (_err) {
      matteBuf = await removeBackgroundBuffer(buf, opts);
    }
  }

  if (opts.creatureParams) {
    matteBuf = await applyCreatureTintBuffer(matteBuf, opts.creatureParams);
  }

  const meta = await sharp(matteBuf).metadata();
  return {
    ok: true,
    buffer: matteBuf,
    width: meta.width || 0,
    height: meta.height || 0,
    mode,
    provider: "mia_matting_v1"
  };
}

function bufferToDataUrl(buf) {
  return `data:image/png;base64,${buf.toString("base64")}`;
}

module.exports = {
  processFrameMatting,
  chromaKeyGreenBuffer,
  applyCreatureTintBuffer,
  bufferToDataUrl,
  bufferFromInput
};
