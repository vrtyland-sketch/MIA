"use strict";

const sharp = require("sharp");
const { hashPrompt } = require("./constants");
const { withTrueAlphaPrompt, applyTrueAlphaBuffer } = require("./trueAlpha");
const {
  proceduralBodyRgb,
  proceduralAccentRgb,
  withMiaIdentityPrompt,
  DEFAULT_MIA_PROMPT
} = require("./visualIdentity");

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

function avoidMagenta(r, g, b) {
  if (r > 200 && g < 90 && b > 200) return { r: 0, g: 200, b: 240 };
  return { r, g, b };
}

async function proceduralImage(width, height, prompt, opts = {}) {
  const w = clamp(Math.round(Number(width) || 512), 64, 1024);
  const h = clamp(Math.round(Number(height) || 512), 64, 1024);
  // Stable identity seed across animation frames (13r) — do not hash per-frame pose prompt
  const seed = hashPrompt(String(opts.identitySeed || opts.seedPrompt || prompt));
  const r1 = parseInt(seed.slice(0, 2), 16);
  const g1 = parseInt(seed.slice(2, 4), 16);
  const b1 = parseInt(seed.slice(4, 6), 16);

  if (opts.trueAlphaBg || opts.frameIndex != null) {
    const frameIndex = Math.max(0, Number(opts.frameIndex) || 0);
    const frameCount = Math.max(1, Number(opts.frameCount) || 1);
    const t = frameCount <= 1 ? 0 : frameIndex / (frameCount - 1);
    const motion = String(opts.motion || "idle").toLowerCase();
    const body =
      opts.useMiaIdentity === false
        ? avoidMagenta(r1, Math.max(40, g1), Math.min(200, b1))
        : (() => {
            const c = proceduralBodyRgb();
            return avoidMagenta(c.r, c.g, c.b);
          })();
    const accent =
      opts.useMiaIdentity === false
        ? avoidMagenta(255 - r1, 80 + (g1 % 64), 160 + (b1 % 40))
        : (() => {
            const c = proceduralAccentRgb(motion);
            return avoidMagenta(c.r, c.g, c.b);
          })();
    let dx = 0;
    let dy = 0;
    let armLift = 0;
    let scale = 1;
    if (motion === "wave") {
      armLift = Math.sin(t * Math.PI * 2) * 0.12;
      dx = Math.sin(t * Math.PI * 2) * 0.02;
    } else if (motion === "bounce") {
      dy = -Math.abs(Math.sin(t * Math.PI)) * 0.08;
      scale = 1 + Math.sin(t * Math.PI) * 0.04;
    } else if (motion === "nod") {
      dy = Math.sin(t * Math.PI * 2) * 0.03;
    } else {
      dy = Math.sin(t * Math.PI * 2) * 0.015;
      scale = 1 + Math.sin(t * Math.PI * 2) * 0.01;
    }
    const cx = w * (0.5 + dx);
    const cy = h * (0.58 + dy);
    const bw = w * 0.22 * scale;
    const bh = h * 0.32 * scale;
    const hx = cx;
    const hy = cy - bh * 0.72;
    const hr = Math.min(w, h) * 0.11 * scale;
    const armY = cy - bh * 0.15 - armLift * h;
    const armX = cx + bw * 0.95;
    const svg = `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#FF00FF"/>
      <ellipse cx="${cx}" cy="${cy}" rx="${bw}" ry="${bh}" fill="rgb(${body.r},${body.g},${body.b})"/>
      <circle cx="${hx}" cy="${hy}" r="${hr}" fill="rgb(${accent.r},${accent.g},${accent.b})"/>
      <ellipse cx="${armX}" cy="${armY}" rx="${bw * 0.28}" ry="${bh * 0.18}" fill="rgb(${body.r},${body.g},${body.b})"/>
      <ellipse cx="${cx - bw * 0.95}" cy="${cy - bh * 0.1}" rx="${bw * 0.28}" ry="${bh * 0.18}" fill="rgb(${body.r},${body.g},${body.b})"/>
    </svg>`;
    return sharp(Buffer.from(svg)).png().toBuffer();
  }

  const svg = `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="rgb(${r1},${g1},${b1})"/>
        <stop offset="100%" stop-color="rgb(${255 - r1},${128 + g1 % 64},${192 + b1 % 32})"/>
      </linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
    <text x="50%" y="52%" text-anchor="middle" font-family="Segoe UI,sans-serif" font-size="${Math.max(12, Math.round(w / 24))}" fill="rgba(255,255,255,0.35)">${String(prompt || "MIA").slice(0, 48).replace(/[<>&"]/g, "")}</text>
  </svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

async function removeBackgroundBuffer(inputBuffer, opts = {}) {
  const tolerance = clamp(Number(opts.tolerance) || 32, 4, 96);
  const { data, info } = await sharp(inputBuffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  const corners = [
    0,
    (w - 1) * 4,
    (h - 1) * w * 4,
    ((h - 1) * w + (w - 1)) * 4
  ];
  let br = 0;
  let bg = 0;
  let bb = 0;
  for (const i of corners) {
    br += data[i];
    bg += data[i + 1];
    bb += data[i + 2];
  }
  br = Math.round(br / corners.length);
  bg = Math.round(bg / corners.length);
  bb = Math.round(bb / corners.length);

  for (let i = 0; i < data.length; i += 4) {
    const dr = Math.abs(data[i] - br);
    const dg = Math.abs(data[i + 1] - bg);
    const db = Math.abs(data[i + 2] - bb);
    if (dr <= tolerance && dg <= tolerance && db <= tolerance) {
      data[i + 3] = 0;
    }
  }

  return sharp(Buffer.from(data), { raw: { width: w, height: h, channels: 4 } }).png().toBuffer();
}

async function inpaintFillBuffer(inputBuffer, maskBase64, opts = {}) {
  const maskBuf = Buffer.from(String(maskBase64 || ""), "base64");
  const source = await sharp(inputBuffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const mask = await sharp(maskBuf).resize(source.info.width, source.info.height).greyscale().raw().toBuffer();
  const out = Buffer.from(source.data);
  for (let i = 0, p = 0; i < out.length; i += 4, p += 1) {
    if (mask[p] > 127) {
      const avg = sampleAverage(out, source.info.width, source.info.height, i, 3);
      out[i] = avg.r;
      out[i + 1] = avg.g;
      out[i + 2] = avg.b;
      out[i + 3] = 255;
    }
  }
  return sharp(out, { raw: { width: source.info.width, height: source.info.height, channels: 4 } })
    .png()
    .toBuffer();
}

function sampleAverage(data, w, h, idx, radius) {
  const px = (idx / 4) % w;
  const py = Math.floor(idx / 4 / w);
  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;
  for (let dy = -radius; dy <= radius; dy += 1) {
    for (let dx = -radius; dx <= radius; dx += 1) {
      const x = px + dx;
      const y = py + dy;
      if (x < 0 || y < 0 || x >= w || y >= h) continue;
      const j = (y * w + x) * 4;
      if (data[j + 3] < 8) continue;
      r += data[j];
      g += data[j + 1];
      b += data[j + 2];
      n += 1;
    }
  }
  if (!n) return { r: 200, g: 200, b: 200 };
  return { r: Math.round(r / n), g: Math.round(g / n), b: Math.round(b / n) };
}

const RECOLOR_PRESETS = {
  cyberpunk: { hue: 200, saturation: 1.25 },
  warm: { hue: 25, saturation: 1.1 },
  cold: { hue: 210, saturation: 1.05 },
  vintage: { hue: 35, saturation: 0.75, tint: { r: 255, g: 235, b: 200 } },
  neon: { hue: 280, saturation: 1.4 },
  mono: { saturation: 0 }
};

async function upscaleBuffer(inputBuffer, opts = {}) {
  const meta = await sharp(inputBuffer).metadata();
  const scale = clamp(Number(opts.scale) || 2, 1.25, 4);
  const maxDim = 4096;
  let tw = opts.width ? clamp(Math.round(Number(opts.width)), 64, maxDim) : Math.round(meta.width * scale);
  let th = opts.height
    ? clamp(Math.round(Number(opts.height)), 64, maxDim)
    : Math.round(meta.height * scale);
  if (!opts.width && !opts.height) {
    tw = Math.min(tw, maxDim);
    th = Math.min(th, maxDim);
  }
  let pipe = sharp(inputBuffer).resize(tw, th, { kernel: sharp.kernel.lanczos3 });
  if (opts.sharpen !== false) {
    pipe = pipe.sharpen({ sigma: 0.7, m1: 0.5, m2: 0.35 });
  }
  const out = await pipe.png().toBuffer();
  return { buffer: out, width: tw, height: th, provider: "sharp_lanczos3", scale };
}

async function restoreBuffer(inputBuffer, opts = {}) {
  const strength = clamp(Number(opts.strength) || 0.65, 0.1, 1);
  const meta = await sharp(inputBuffer).metadata();
  let pipe = sharp(inputBuffer).ensureAlpha();
  if (strength >= 0.35) {
    pipe = pipe.median(strength >= 0.7 ? 3 : 2);
  }
  const out = await pipe
    .normalize()
    .sharpen({ sigma: 0.4 + strength * 0.9, m1: 0.45, m2: 0.3 })
    .modulate({
      brightness: 1 + strength * 0.04,
      saturation: 1 + strength * 0.06
    })
    .png()
    .toBuffer();
  return {
    buffer: out,
    width: meta.width,
    height: meta.height,
    provider: "sharp_restore",
    strength
  };
}

async function recolorBuffer(inputBuffer, opts = {}) {
  const presetKey = String(opts.palette || opts.preset || "cyberpunk")
    .toLowerCase()
    .replace(/[^\w]+/g, "");
  const preset = RECOLOR_PRESETS[presetKey] || RECOLOR_PRESETS.cyberpunk;
  const hue = Number.isFinite(Number(opts.hue)) ? Number(opts.hue) : preset.hue || 0;
  const saturation = Number.isFinite(Number(opts.saturation)) ? Number(opts.saturation) : preset.saturation || 1;
  const meta = await sharp(inputBuffer).metadata();
  let pipe = sharp(inputBuffer).ensureAlpha().modulate({ hue, saturation });
  if (preset.tint) {
    pipe = pipe.tint(preset.tint);
  }
  const out = await pipe.png().toBuffer();
  return {
    buffer: out,
    width: meta.width,
    height: meta.height,
    provider: "sharp_recolor",
    palette: presetKey,
    hue,
    saturation
  };
}

async function openAiGenerate(prompt, size, env = process.env) {
  const key = env.MIA_LLM_API_KEY || env.OPENAI_API_KEY;
  if (!key) return null;
  const axios = require("axios");
  const dim = size === "1024x1024" ? "1024x1024" : "512x512";
  const resp = await axios.post(
    "https://api.openai.com/v1/images/generations",
    {
      model: "dall-e-2",
      prompt: String(prompt || "abstract art").slice(0, 900),
      size: dim,
      response_format: "b64_json"
    },
    {
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      timeout: 120000
    }
  );
  const b64 = resp.data?.data?.[0]?.b64_json;
  if (!b64) return null;
  return Buffer.from(b64, "base64");
}

/** Phase 13r — img2img-ish continuity via dall-e-2 edits when prior frame exists. */
async function openAiEditFromReference(prompt, imageBuffer, size, env = process.env) {
  const key = env.MIA_LLM_API_KEY || env.OPENAI_API_KEY;
  if (!key || !Buffer.isBuffer(imageBuffer) || !imageBuffer.length) return null;
  const dim = size === "1024x1024" ? "1024x1024" : "512x512";
  const side = dim === "1024x1024" ? 1024 : 512;
  const square = await sharp(imageBuffer)
    .resize(side, side, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .png()
    .toBuffer();

  try {
    const FormData = require("form-data");
    const axios = require("axios");
    const form = new FormData();
    form.append("image", square, { filename: "ref.png", contentType: "image/png" });
    form.append("prompt", String(prompt || "same character, next animation frame").slice(0, 900));
    form.append("size", dim);
    form.append("n", "1");
    form.append("response_format", "b64_json");
    const resp = await axios.post("https://api.openai.com/v1/images/edits", form, {
      headers: { Authorization: `Bearer ${key}`, ...form.getHeaders() },
      timeout: 120000,
      maxBodyLength: Infinity
    });
    const b64 = resp.data?.data?.[0]?.b64_json;
    if (!b64) return null;
    return Buffer.from(b64, "base64");
  } catch (_err) {
    // Native FormData (Node 18+) fallback without form-data package
    try {
      const form = new FormData();
      form.append("image", new Blob([square], { type: "image/png" }), "ref.png");
      form.append("prompt", String(prompt || "same character, next animation frame").slice(0, 900));
      form.append("size", dim);
      form.append("n", "1");
      form.append("response_format", "b64_json");
      const resp = await fetch("https://api.openai.com/v1/images/edits", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}` },
        body: form
      });
      if (!resp.ok) return null;
      const json = await resp.json();
      const b64 = json?.data?.[0]?.b64_json;
      if (!b64) return null;
      return Buffer.from(b64, "base64");
    } catch (_err2) {
      return null;
    }
  }
}

/** Soft temporal blend — keeps silhouette continuity without cloud video models. */
async function blendWithPreviousFrame(currentBuffer, previousBuffer, mix = 0.22) {
  if (!Buffer.isBuffer(currentBuffer) || !Buffer.isBuffer(previousBuffer)) return currentBuffer;
  const amount = clamp(Number(mix) || 0, 0, 0.5);
  if (amount <= 0.001) return currentBuffer;
  const cur = await sharp(currentBuffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const prev = await sharp(previousBuffer)
    .resize(cur.info.width, cur.info.height, { fit: "fill" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const out = Buffer.alloc(cur.data.length);
  const a = 1 - amount;
  for (let i = 0; i < cur.data.length; i += 4) {
    out[i] = Math.round(cur.data[i] * a + prev.data[i] * amount);
    out[i + 1] = Math.round(cur.data[i + 1] * a + prev.data[i + 1] * amount);
    out[i + 2] = Math.round(cur.data[i + 2] * a + prev.data[i + 2] * amount);
    out[i + 3] = Math.round(cur.data[i + 3] * a + prev.data[i + 3] * amount);
  }
  return sharp(out, {
    raw: { width: cur.info.width, height: cur.info.height, channels: 4 }
  })
    .png()
    .toBuffer();
}

async function generateImage(opts = {}) {
  const width = opts.width || 512;
  const height = opts.height || 512;
  const trueAlpha = opts.trueAlpha === true || opts.trueAlphaBg === true;
  const useMiaIdentity = opts.useMiaIdentity !== false && (trueAlpha || opts.miaIdentity === true);
  let prompt = String(opts.prompt || (useMiaIdentity ? DEFAULT_MIA_PROMPT : "MIA Paint asset"));
  if (useMiaIdentity) {
    prompt = withMiaIdentityPrompt(prompt, { motion: opts.motion, mood: opts.mood });
  }
  if (trueAlpha) {
    prompt = withTrueAlphaPrompt(prompt);
  }
  const identitySeed = opts.identitySeed || opts.seedPrompt || null;
  const referenceBuffer = Buffer.isBuffer(opts.referenceBuffer) ? opts.referenceBuffer : null;
  const sizeKey = `${width}x${height}`;
  let buffer = null;
  let provider = "procedural";
  let temporal = null;

  try {
    if (referenceBuffer && opts.useReferenceEdit !== false) {
      buffer = await openAiEditFromReference(prompt, referenceBuffer, sizeKey, opts.env);
      if (buffer) {
        provider = "openai_edit";
        temporal = { mode: "reference_edit" };
      }
    }
    if (!buffer) {
      buffer = await openAiGenerate(prompt, sizeKey, opts.env);
      if (buffer) provider = "openai";
    }
  } catch (_err) {
    buffer = null;
  }
  if (!buffer) {
    buffer = await proceduralImage(width, height, prompt, {
      trueAlphaBg: trueAlpha,
      frameIndex: opts.frameIndex,
      frameCount: opts.frameCount,
      motion: opts.motion,
      useMiaIdentity,
      identitySeed: identitySeed || prompt
    });
    provider = "procedural";
  }

  const blendMix =
    opts.temporalBlend != null
      ? Number(opts.temporalBlend)
      : referenceBuffer
        ? 0.2
        : 0;
  if (referenceBuffer && blendMix > 0 && provider !== "openai_edit") {
    buffer = await blendWithPreviousFrame(buffer, referenceBuffer, blendMix);
    temporal = { ...(temporal || {}), mode: temporal?.mode || "blend", mix: blendMix };
  } else if (referenceBuffer && blendMix > 0 && provider === "openai_edit") {
    // Light lock after edit so silhouette does not jump
    buffer = await blendWithPreviousFrame(buffer, referenceBuffer, Math.min(0.12, blendMix));
    temporal = { ...(temporal || {}), blend: Math.min(0.12, blendMix) };
  }

  let alpha = null;
  if (trueAlpha && opts.applyMatte !== false) {
    const matted = await applyTrueAlphaBuffer(buffer, { mode: opts.alphaMode || "auto" });
    buffer = matted.buffer;
    alpha = {
      transparentPixels: matted.transparentPixels,
      alphaRatio: matted.alphaRatio,
      mode: matted.mode,
      provider: matted.provider
    };
  }

  return {
    ok: true,
    provider,
    buffer,
    width,
    height,
    prompt,
    trueAlpha,
    miaIdentity: useMiaIdentity,
    identitySeed: identitySeed || null,
    temporal,
    alpha
  };
}

module.exports = {
  proceduralImage,
  removeBackgroundBuffer,
  inpaintFillBuffer,
  upscaleBuffer,
  restoreBuffer,
  recolorBuffer,
  RECOLOR_PRESETS,
  blendWithPreviousFrame,
  openAiEditFromReference,
  generateImage
};
