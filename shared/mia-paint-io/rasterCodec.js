"use strict";

const { PNG } = require("pngjs");

function pngBufferToRgba(buffer) {
  const png = PNG.sync.read(buffer);
  return {
    width: png.width,
    height: png.height,
    data: png.data
  };
}

function rgbaToPngBuffer(rgba) {
  const png = new PNG({ width: rgba.width, height: rgba.height });
  png.data = Buffer.from(rgba.data);
  return PNG.sync.write(png);
}

function rgbaToBase64Png(rgba) {
  return rgbaToPngBuffer(rgba).toString("base64");
}

function base64PngToRgba(base64) {
  const buf = Buffer.from(String(base64 || ""), "base64");
  return pngBufferToRgba(buf);
}

async function sharpBufferToRgba(buffer) {
  const sharp = require("sharp");
  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return {
    width: info.width,
    height: info.height,
    data
  };
}

async function decodeImageBuffer(buffer) {
  try {
    return await sharpBufferToRgba(buffer);
  } catch (_err) {
    return pngBufferToRgba(buffer);
  }
}

async function encodeImageBuffer(rgba, format, quality) {
  const sharp = require("sharp");
  let pipeline = sharp(Buffer.from(rgba.data), {
    raw: { width: rgba.width, height: rgba.height, channels: 4 }
  });
  const fmt = String(format || "png").toLowerCase();
  if (fmt === "jpg" || fmt === "jpeg") {
    pipeline = pipeline.jpeg({ quality: Math.max(1, Math.min(100, Number(quality) || 90)) });
  } else if (fmt === "webp") {
    pipeline = pipeline.webp({ quality: Math.max(1, Math.min(100, Number(quality) || 90)) });
  } else {
    pipeline = pipeline.png();
  }
  return pipeline.toBuffer();
}

module.exports = {
  pngBufferToRgba,
  rgbaToPngBuffer,
  rgbaToBase64Png,
  base64PngToRgba,
  decodeImageBuffer,
  encodeImageBuffer
};
