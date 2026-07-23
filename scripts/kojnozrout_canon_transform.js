"use strict";

/**
 * Vizuálně odlišné varianty z kanonických master PNG (1536×1024).
 * Flip, rotace, scale, posun, hue — výstup zůstává velké RGBA (ne procedurální mlhovina).
 */

const fs = require("fs");
const { PNG } = require("pngjs");

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function rgbToHsl(r, g, b) {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rn:
        h = (gn - bn) / d + (gn < bn ? 6 : 0);
        break;
      case gn:
        h = (bn - rn) / d + 2;
        break;
      default:
        h = (rn - gn) / d + 4;
        break;
    }
    h /= 6;
  }
  return { h, s, l };
}

function hslToRgb(h, s, l) {
  if (s === 0) {
    const v = Math.round(l * 255);
    return { r: v, g: v, b: v };
  }
  const hue2rgb = (p, q, t) => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return {
    r: Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
    g: Math.round(hue2rgb(p, q, h) * 255),
    b: Math.round(hue2rgb(p, q, h - 1 / 3) * 255)
  };
}

function shiftRgb(r, g, b, hueDeg = 0, satMul = 1, lightMul = 1) {
  if (!hueDeg && satMul === 1 && lightMul === 1) {
    return { r, g, b };
  }
  const { h, s, l } = rgbToHsl(r, g, b);
  const nh = (h + hueDeg / 360 + 1) % 1;
  const ns = clamp(s * satMul, 0, 1);
  const nl = clamp(l * lightMul, 0, 1);
  return hslToRgb(nh, ns, nl);
}

function sampleBilinear(src, x, y) {
  const w = src.width;
  const h = src.height;
  if (x < 0 || y < 0 || x > w - 1 || y > h - 1) {
    return { r: 0, g: 0, b: 0, a: 0 };
  }
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = Math.min(w - 1, x0 + 1);
  const y1 = Math.min(h - 1, y0 + 1);
  const tx = x - x0;
  const ty = y - y0;

  function px(pxx, pyy) {
    const o = (pyy * w + pxx) << 2;
    return {
      r: src.data[o],
      g: src.data[o + 1],
      b: src.data[o + 2],
      a: src.data[o + 3]
    };
  }

  const c00 = px(x0, y0);
  const c10 = px(x1, y0);
  const c01 = px(x0, y1);
  const c11 = px(x1, y1);
  const lerp = (a, b, t) => a + (b - a) * t;
  const r = lerp(lerp(c00.r, c10.r, tx), lerp(c01.r, c11.r, tx), ty);
  const g = lerp(lerp(c00.g, c10.g, tx), lerp(c01.g, c11.g, tx), ty);
  const bch = lerp(lerp(c00.b, c10.b, tx), lerp(c01.b, c11.b, tx), ty);
  const a = lerp(lerp(c00.a, c10.a, tx), lerp(c01.a, c11.a, tx), ty);
  return { r: Math.round(r), g: Math.round(g), b: Math.round(bch), a: Math.round(a) };
}

function normalizeTransformSpec(spec = {}) {
  if (typeof spec === "string") {
    return { source: spec };
  }
  return {
    source: spec.source || "idle",
    flipX: Boolean(spec.flipX),
    flipY: Boolean(spec.flipY),
    rotateDeg: toNumber(spec.rotateDeg, 0),
    scale: toNumber(spec.scale, 1),
    scaleY: toNumber(spec.scaleY, spec.scale || 1),
    offsetX: toNumber(spec.offsetX, 0),
    offsetY: toNumber(spec.offsetY, 0),
    hueDeg: toNumber(spec.hueDeg, 0),
    satMul: toNumber(spec.satMul, 1),
    lightMul: toNumber(spec.lightMul, 1)
  };
}

function transformPngData(src, rawSpec = {}) {
  const spec = normalizeTransformSpec(rawSpec);
  const w = src.width;
  const h = src.height;
  const out = new PNG({ width: w, height: h });
  out.data.fill(0);

  const cx = w / 2;
  const cy = h / 2;
  const rad = (spec.rotateDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const invScale = 1 / Math.max(0.01, spec.scale);
  const invScaleY = 1 / Math.max(0.01, spec.scaleY);

  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      let dx = x - cx - spec.offsetX;
      let dy = y - cy - spec.offsetY;

      const rx = dx * cos + dy * sin;
      const ry = -dx * sin + dy * cos;

      let sx = rx * invScale;
      let sy = ry * invScaleY;

      if (spec.flipX) sx = -sx;
      if (spec.flipY) sy = -sy;

      sx += cx;
      sy += cy;

      const sample = sampleBilinear(src, sx, sy);
      if (sample.a <= 10) continue;

      const rgb = shiftRgb(
        sample.r,
        sample.g,
        sample.b,
        spec.hueDeg,
        spec.satMul,
        spec.lightMul
      );
      const o = (y * w + x) << 2;
      out.data[o] = rgb.r;
      out.data[o + 1] = rgb.g;
      out.data[o + 2] = rgb.b;
      out.data[o + 3] = sample.a;
    }
  }

  return out;
}

function readPngFile(filePath) {
  return PNG.sync.read(fs.readFileSync(filePath));
}

function writePngFile(filePath, png) {
  fs.mkdirSync(require("path").dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, PNG.sync.write(png));
}

function transformCanonFile(sourcePath, destPath, spec) {
  const src = readPngFile(sourcePath);
  const out = transformPngData(src, spec);
  writePngFile(destPath, out);
  return {
    ok: true,
    bytes: fs.statSync(destPath).size,
    width: out.width,
    height: out.height
  };
}

module.exports = {
  normalizeTransformSpec,
  transformPngData,
  transformCanonFile,
  readPngFile,
  writePngFile,
  shiftRgb
};
