"use strict";

/**
 * Gift moment composer — kanon CARE/SUPPORT vizuál:
 * pozadí (effectProgram) + varianta Kojnožrouta + profilová fotka dárce + text.
 *
 * Výstup: PNG v mia-output-overlay/generated/gift-moments/
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const axios = require("axios");
const {
  SpriteCanvas,
  blitPngBuffer,
  resolveVariantPlan
} = require("./kojnozrout_sprite_renderer");
const {
  WIDTH,
  HEIGHT,
  renderGiftBackground
} = require("./kojnozrout_background_generator");

const ASSETS_ROOT = path.resolve(__dirname, "..", "mia-output-overlay", "assets", "kojnozrout");
const OUTPUT_DIR = path.resolve(__dirname, "..", "mia-output-overlay", "generated", "gift-moments");
const VARIANTS_DIR = path.join(ASSETS_ROOT, "variants");
const BACKGROUNDS_DIR = path.join(ASSETS_ROOT, "backgrounds");

const AVATAR_CACHE_DIR = path.resolve(__dirname, "..", "data", "avatar-cache");

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

function rgba(r, g, b, a = 255) {
  return { r, g, b, a };
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function hashKey(input = "") {
  return crypto.createHash("sha1").update(String(input)).digest("hex").slice(0, 16);
}

function resolveVariantIndex(input = {}) {
  const explicit = toNumber(input.variantIndex, 0);
  if (explicit >= 1 && explicit <= 100) return Math.floor(explicit);

  const tier = safeString(input.tier, "T1").toUpperCase();
  const mood = safeString(input.kojMood, "happy");
  const giftKey = safeString(input.giftKey, "gift");
  const userKey = safeString(input.userLabel, "divak");

  const tierBase = { T1: 4, T2: 18, T3: 42, T4: 68, T5: 82 }[tier] || 4;
  const moodOffset = {
    idle: 0,
    warm: 1,
    happy: 2,
    hungry: 3,
    excited: 4,
    eating: 5,
    full: 6,
    sleepy: 7,
    sick: 8,
    sad: 9,
    annoyed: 10,
    laugh: 11,
    stressed: 12
  }[mood] ?? 2;

  let careOffset = 0;
  if (typeof input.careOffset === "number" && Number.isFinite(input.careOffset)) {
    careOffset = Math.floor(input.careOffset);
  } else if (input.giftAnimation && typeof input.giftAnimation === "object") {
    try {
      const ctx = require("./MIA_GIFT_ANIMATION_CONTEXT");
      careOffset = ctx.resolveCareVariantOffset(input.giftAnimation);
    } catch (_err) {
      careOffset = 0;
    }
  } else if (input.primaryNeed || input.neglect !== undefined) {
    try {
      const ctx = require("./MIA_GIFT_ANIMATION_CONTEXT");
      careOffset = ctx.resolveCareVariantOffset(input);
    } catch (_err) {
      careOffset = 0;
    }
  }

  const hash = hashKey(`${giftKey}:${userKey}:${tier}:${mood}:${input.primaryNeed || ""}`);
  const jitter = parseInt(hash.slice(0, 4), 16) % 9;
  return clamp(tierBase + moodOffset + careOffset + jitter, 1, 100);
}

function resolveBackgroundPath(effectProgram = "generic_support") {
  const program = safeString(effectProgram, "generic_support");
  const filePath = path.join(BACKGROUNDS_DIR, `bg-${program}.png`);
  if (fs.existsSync(filePath)) return filePath;
  return null;
}

function resolveVariantPath(variantIndex = 1) {
  const fileName = `kojnozout-v${String(variantIndex).padStart(3, "0")}.png`;
  const filePath = path.join(VARIANTS_DIR, fileName);
  if (fs.existsSync(filePath)) return filePath;
  return null;
}

function loadBuffer(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return null;
  return fs.readFileSync(filePath);
}

async function loadLocalAvatarBuffer(localPath = "") {
  const filePath = safeString(localPath);
  if (!filePath || !fs.existsSync(filePath)) return null;

  const cacheKey = hashKey(`local:${filePath}:${fs.statSync(filePath).mtimeMs}`);
  const cachePath = path.join(AVATAR_CACHE_DIR, `${cacheKey}.bin`);
  ensureDir(AVATAR_CACHE_DIR);

  if (fs.existsSync(cachePath)) {
    return fs.readFileSync(cachePath);
  }

  const buf = loadBuffer(filePath);
  if (!buf || buf.length < 32) return null;
  fs.writeFileSync(cachePath, buf);
  return buf;
}

async function resolveAvatarBuffer(input = {}) {
  const localPath = safeString(input.avatarLocalPath || input.profilePath);
  if (localPath) {
    const localBuf = await loadLocalAvatarBuffer(localPath);
    if (localBuf) return localBuf;
  }
  return fetchAvatarBuffer(safeString(input.avatarUrl));
}

async function fetchAvatarBuffer(avatarUrl = "") {
  const url = safeString(avatarUrl);
  if (!url.startsWith("http")) return null;

  const cacheKey = hashKey(url);
  const cachePath = path.join(AVATAR_CACHE_DIR, `${cacheKey}.bin`);
  ensureDir(AVATAR_CACHE_DIR);

  if (fs.existsSync(cachePath)) {
    const ageMs = Date.now() - fs.statSync(cachePath).mtimeMs;
    if (ageMs < 86400000) {
      return fs.readFileSync(cachePath);
    }
  }

  try {
    const response = await axios.get(url, {
      responseType: "arraybuffer",
      timeout: 4500,
      maxContentLength: 2 * 1024 * 1024,
      headers: { "User-Agent": "MIA-GiftVisual/1.0" }
    });
    const buf = Buffer.from(response.data);
    if (buf.length < 32) return null;
    fs.writeFileSync(cachePath, buf);
    return buf;
  } catch (_err) {
    return null;
  }
}

function drawAvatarPlaceholder(canvas, cx, cy, radius, userLabel = "") {
  const initial = safeString(userLabel, "?").charAt(0).toUpperCase() || "?";
  const hue = (initial.charCodeAt(0) * 17) % 360;
  const fill = rgba(80 + (hue % 80), 120 + (hue % 60), 160 + (hue % 40), 255);
  canvas.fillDisk(cx, cy, radius + 6, rgba(255, 255, 255, 230));
  canvas.fillDisk(cx, cy, radius, fill);
  const scale = radius > 50 ? 2 : 1.4;
  drawSimpleText(canvas, initial, cx - 8 * scale, cy - 10 * scale, rgba(255, 255, 255, 255), scale);
}

function drawAvatarCircle(canvas, avatarBuffer, cx, cy, radius, userLabel = "") {
  canvas.fillDisk(cx, cy, radius + 8, rgba(255, 255, 255, 220));
  if (!avatarBuffer) {
    drawAvatarPlaceholder(canvas, cx, cy, radius, userLabel);
    return;
  }

  try {
    const { PNG } = require("pngjs");
    const src = PNG.sync.read(avatarBuffer);
    const size = radius * 2;
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const dx = x - radius;
        const dy = y - radius;
        if (dx * dx + dy * dy > radius * radius) continue;
        const sx = Math.min(src.width - 1, Math.floor((x / size) * src.width));
        const sy = Math.min(src.height - 1, Math.floor((y / size) * src.height));
        const o = (sy * src.width + sx) << 2;
        const a = src.data[o + 3];
        if (a <= 8) continue;
        canvas.set(cx - radius + x, cy - radius + y, rgba(src.data[o], src.data[o + 1], src.data[o + 2], a));
      }
    }
  } catch (_err) {
    drawAvatarPlaceholder(canvas, cx, cy, radius, userLabel);
  }
}

const GLYPH_5X7 = {
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  C: ["01111", "10000", "10000", "10000", "10000", "10000", "01111"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  G: ["01111", "10000", "10000", "10011", "10001", "10001", "01111"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  I: ["11111", "00100", "00100", "00100", "00100", "00100", "11111"],
  J: ["00111", "00010", "00010", "00010", "10010", "10010", "01100"],
  K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  M: ["10001", "11011", "10101", "10001", "10001", "10001", "10001"],
  N: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  V: ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
  Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
  Z: ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
  "3": ["11110", "00001", "00001", "01110", "00001", "00001", "11110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "10000", "11110", "00001", "00001", "11110"],
  "6": ["01110", "10000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00001", "01110"],
  ".": ["00000", "00000", "00000", "00000", "00000", "00100", "00100"],
  ",": ["00000", "00000", "00000", "00000", "00100", "00100", "01000"],
  "!": ["00100", "00100", "00100", "00100", "00100", "00000", "00100"],
  "?": ["01110", "10001", "00001", "00110", "00100", "00000", "00100"],
  "-": ["00000", "00000", "00000", "11111", "00000", "00000", "00000"],
  "+": ["00000", "00100", "00100", "11111", "00100", "00100", "00000"],
  " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"]
};

function normalizeGlyphChar(ch) {
  const map = { á: "A", č: "C", ď: "D", é: "E", ě: "E", í: "I", ň: "N", ó: "O", ř: "R", š: "S", ť: "T", ú: "U", ů: "U", ý: "Y", ž: "Z" };
  const lower = ch.toLowerCase();
  if (map[lower]) return map[lower];
  const upper = ch.toUpperCase();
  return GLYPH_5X7[upper] ? upper : GLYPH_5X7[ch] ? ch : "?";
}

function drawSimpleText(canvas, text, x, y, color, scale = 1) {
  const s = Math.max(1, scale);
  let cursor = x;
  const content = safeString(text).slice(0, 120);
  for (const ch of content) {
    const glyphKey = normalizeGlyphChar(ch);
    const rows = GLYPH_5X7[glyphKey] || GLYPH_5X7["?"];
    for (let row = 0; row < rows.length; row += 1) {
      for (let col = 0; col < rows[row].length; col += 1) {
        if (rows[row][col] !== "1") continue;
        for (let py = 0; py < s; py += 1) {
          for (let px = 0; px < s; px += 1) {
            canvas.set(cursor + col * s + px, y + row * s + py, color);
          }
        }
      }
    }
    cursor += (rows[0].length + 1) * s;
  }
}

function drawTextBanner(canvas, lines = []) {
  const bannerH = 108;
  const y0 = HEIGHT - bannerH;
  for (let y = y0; y < HEIGHT; y += 1) {
    for (let x = 0; x < WIDTH; x += 1) {
      const t = (y - y0) / bannerH;
      canvas.set(x, y, rgba(10, 16, 28, Math.round(lerp(150, 210, t))));
    }
  }

  const primary = safeString(lines[0]);
  const secondary = safeString(lines[1]);
  drawSimpleText(canvas, primary, 36, y0 + 22, rgba(255, 255, 255, 255), 2);
  if (secondary) {
    drawSimpleText(canvas, secondary, 36, y0 + 58, rgba(180, 210, 255, 255), 1.5);
  }
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function buildGiftMomentLines(input = {}) {
  const user = safeString(input.userLabel, "Divák");
  const gift = safeString(input.giftName, "dárek");
  const tier = safeString(input.tier, "T1");
  const thank = safeString(input.thankText);
  const line1 = thank || `${user} poslal ${gift}`;
  const line2 = `Děkujeme · ${tier} · Kojnožrout žije`;
  return [line1, line2];
}

async function composeGiftMoment(input = {}) {
  const effectProgram = safeString(input.effectProgram, "generic_support");
  const variantIndex = resolveVariantIndex(input);
  const userLabel = safeString(input.userLabel, "Divák");
  const avatarUrl = safeString(input.avatarUrl);
  const kojMood = safeString(input.kojMood, "happy");
  const lines = buildGiftMomentLines(input);

  ensureDir(OUTPUT_DIR);

  let bgBuf = loadBuffer(resolveBackgroundPath(effectProgram));
  if (!bgBuf) {
    bgBuf = renderGiftBackground(effectProgram, variantIndex);
  }

  const canvas = new SpriteCanvas(WIDTH, HEIGHT);
  blitPngBuffer(canvas, bgBuf, 0, 0, 1);

  const kojAssets = require("./MIA_KOJNOZROUT_ASSETS");
  const kojMoodKey = safeString(input.kojMood, "happy");
  const kojLoaded = kojAssets.loadKojMoodSpriteBuffer(kojMoodKey);
  let kojBuf = kojLoaded?.buffer || null;

  if (!kojBuf) {
    kojBuf = loadBuffer(resolveVariantPath(variantIndex));
  }
  if (!kojBuf) {
    const { renderKojnozoutVariant } = require("./kojnozrout_sprite_renderer");
    kojBuf = renderKojnozoutVariant(variantIndex);
  }

  blitPngBuffer(canvas, kojBuf, WIDTH - 360, 40, 0.62);

  const avatarBuf = await resolveAvatarBuffer(input);
  drawAvatarCircle(canvas, avatarBuf, 150, 210, 88, userLabel);
  drawTextBanner(canvas, lines);

  const fileId = `${Date.now()}-${hashKey(`${userLabel}:${input.giftName}:${variantIndex}`)}`;
  const fileName = `gift-moment-${fileId}.png`;
  const outPath = path.join(OUTPUT_DIR, fileName);
  const pngBuf = canvas.toPngBuffer();
  fs.writeFileSync(outPath, pngBuf);

  const publicPath = `/generated/gift-moments/${fileName}`;
  return {
    ok: true,
    imagePath: outPath,
    imageUrl: publicPath,
    variantIndex,
    effectProgram,
    mood: resolveVariantPlan(variantIndex).mood,
    kojSource: kojLoaded?.source || "variant",
    lines,
    bytes: pngBuf.length,
    avatarLoaded: Boolean(avatarBuf),
    expiresAt: Date.now() + 45000
  };
}

function shouldComposeGiftVisual(normalized = {}, actionResult = {}) {
  const kind = safeString(normalized.kind || normalized.type).toLowerCase();
  if (kind !== "gift" && kind !== "support" && kind !== "gift_support") return false;
  if (safeString(actionResult?.reason) === "ignored_non_gift") return false;

  const tier = safeString(actionResult?.tier || normalized?.support?.tier, "T1").toUpperCase();
  if (tier === "T1") {
    const coins = toNumber(normalized?.support?.coins ?? normalized?.coins, 0);
    if (coins < 1) return false;
  }

  const duelActive = normalized?.duelActive === true || normalized?.meta?.duelActive === true;
  if (duelActive) return false;

  return true;
}

module.exports = {
  composeGiftMoment,
  shouldComposeGiftVisual,
  resolveVariantIndex,
  buildGiftMomentLines,
  fetchAvatarBuffer,
  loadLocalAvatarBuffer,
  resolveAvatarBuffer,
  drawAvatarCircle,
  drawTextBanner,
  OUTPUT_DIR,
  WIDTH,
  HEIGHT
};
