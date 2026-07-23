"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const {
  SpriteCanvas,
  blitPngBuffer
} = require("./kojnozrout_sprite_renderer");
const {
  WIDTH,
  HEIGHT,
  renderGiftBackground
} = require("./kojnozrout_background_generator");
const {
  fetchAvatarBuffer,
  loadLocalAvatarBuffer,
  drawAvatarCircle,
  drawTextBanner,
  resolveVariantIndex
} = require("./MIA_GIFT_VISUAL_COMPOSER");
const { loadKojMoodSpriteBuffer } = require("./MIA_KOJNOZROUT_ASSETS");
const { loadTemplates, loadCatalog, resolveMediaAbs, pickProfileForUser } = require("./MIA_MEDIA_CATALOG");

const OUTPUT_DIR = path.resolve(__dirname, "..", "mia-output-overlay", "generated", "media-templates");

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function rgba(r, g, b, a = 255) {
  return { r, g, b, a };
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function hashKey(input = "") {
  return crypto.createHash("sha1").update(String(input)).digest("hex").slice(0, 16);
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function formatCaption(template = "", userLabel = "", extras = {}) {
  const first = safeString(userLabel, "Divák").split(/\s+/)[0] || userLabel;
  return safeString(template)
    .replace(/\{user\}/g, first)
    .replace(/\{fullUser\}/g, userLabel)
    .replace(/\{tier\}/g, safeString(extras.tier, ""));
}

function drawAvatarRing(canvas, cx, cy, radius, color = rgba(255, 210, 90, 255)) {
  for (let r = radius + 10; r <= radius + 16; r += 1) {
    for (let a = 0; a < Math.PI * 2; a += 0.02) {
      const x = Math.round(cx + Math.cos(a) * r);
      const y = Math.round(cy + Math.sin(a) * r);
      canvas.set(x, y, color);
    }
  }
}

function drawVignette(canvas) {
  const cx = WIDTH / 2;
  const cy = HEIGHT / 2;
  const maxR = Math.hypot(cx, cy);
  for (let y = 0; y < HEIGHT; y += 2) {
    for (let x = 0; x < WIDTH; x += 2) {
      const d = Math.hypot(x - cx, y - cy) / maxR;
      if (d < 0.55) continue;
      const alpha = Math.round(lerp(0, 110, (d - 0.55) / 0.45));
      const px = canvas.get(x, y);
      if (!px) continue;
      canvas.set(x, y, rgba(px.r, px.g, px.b, Math.min(255, px.a + alpha)));
    }
  }
}

async function resolveProfileBuffer(input = {}, template = {}) {
  if (input.avatarBuffer) return input.avatarBuffer;
  const localPath =
    safeString(input.avatarLocalPath) ||
    safeString(input.profilePath) ||
    pickProfileForUser(input.catalog || loadCatalog(), input.userLabel);
  if (localPath) {
    const buf = await loadLocalAvatarBuffer(localPath);
    if (buf) return buf;
  }
  return fetchAvatarBuffer(safeString(input.avatarUrl));
}

async function composeDonatorSpotlightPro(input = {}, template = {}) {
  const effectProgram = safeString(template.effectProgram || input.effectProgram, "generic_support");
  const kojMood = safeString(template.kojMood || input.kojMood, "excited");
  const userLabel = safeString(input.userLabel, "Top dárce");
  const variantIndex = resolveVariantIndex({ ...input, tier: input.tier || template.minTier || "T2", kojMood });
  const radius = Number(template.avatarRadius) || 96;

  ensureDir(OUTPUT_DIR);
  let bgBuf = null;
  const bgPath = path.resolve(__dirname, "..", "mia-output-overlay", "assets", "kojnozrout", "backgrounds", `bg-${effectProgram}.png`);
  if (fs.existsSync(bgPath)) bgBuf = fs.readFileSync(bgPath);
  if (!bgBuf) bgBuf = renderGiftBackground(effectProgram, variantIndex);

  const canvas = new SpriteCanvas(WIDTH, HEIGHT);
  blitPngBuffer(canvas, bgBuf, 0, 0, 1);
  drawVignette(canvas);

  const avatarBuf = await resolveProfileBuffer(input, template);
  if (template.avatarRing !== false) drawAvatarRing(canvas, 220, 300, radius);
  drawAvatarCircle(canvas, avatarBuf, 220, 300, radius, userLabel);

  const kojLoaded = loadKojMoodSpriteBuffer(kojMood);
  let kojBuf = kojLoaded?.buffer || null;
  if (!kojBuf) {
    const { renderKojnozoutVariant } = require("./kojnozrout_sprite_renderer");
    kojBuf = renderKojnozoutVariant(variantIndex);
  }
  blitPngBuffer(canvas, kojBuf, WIDTH - 380, 60, 0.68);

  const line1 = safeString(
    input.caption,
    formatCaption(template.captionTemplate || "{fullUser}", userLabel, { tier: input.tier })
  );
  const line2 = safeString(
    input.subcaption,
    formatCaption(template.subcaptionTemplate || "Spinák · děkujeme", userLabel, { tier: input.tier })
  );
  drawTextBanner(canvas, [line1, line2]);

  const fileName = `donator-spotlight-${Date.now()}-${hashKey(userLabel)}.png`;
  const outPath = path.join(OUTPUT_DIR, fileName);
  const pngBuf = canvas.toPngBuffer();
  fs.writeFileSync(outPath, pngBuf);

  return {
    ok: true,
    templateId: "donator_spotlight",
    layout: "donator_spotlight_pro",
    imagePath: outPath,
    imageUrl: `/generated/media-templates/${fileName}`,
    avatarLoaded: Boolean(avatarBuf),
    lines: [line1, line2],
    bytes: pngBuf.length
  };
}

async function composeProfileHeroCard(input = {}, template = {}) {
  const effectProgram = safeString(template.effectProgram, "warm_glow");
  const userLabel = safeString(input.userLabel, "Komunita");
  const variantIndex = resolveVariantIndex({ ...input, kojMood: template.kojMood || "warm" });

  ensureDir(OUTPUT_DIR);
  const canvas = new SpriteCanvas(WIDTH, HEIGHT);
  const bg = renderGiftBackground(effectProgram, variantIndex);
  blitPngBuffer(canvas, bg, 0, 0, 1);

  const profilePath =
    safeString(input.profilePath) ||
    resolveMediaAbs(input.catalog || loadCatalog(), input.profileId) ||
    pickProfileForUser(input.catalog || loadCatalog(), userLabel);
  const profileBuf = profilePath ? await loadLocalAvatarBuffer(profilePath) : null;

  if (profileBuf) {
    try {
      const { PNG } = require("pngjs");
      const src = PNG.sync.read(profileBuf);
      const targetW = 520;
      const targetH = 680;
      const x0 = 120;
      const y0 = 120;
      for (let y = 0; y < targetH; y += 1) {
        for (let x = 0; x < targetW; x += 1) {
          const sx = Math.min(src.width - 1, Math.floor((x / targetW) * src.width));
          const sy = Math.min(src.height - 1, Math.floor((y / targetH) * src.height));
          const o = (sy * src.width + sx) << 2;
          canvas.set(x0 + x, y0 + y, rgba(src.data[o], src.data[o + 1], src.data[o + 2], src.data[o + 3]));
        }
      }
      for (let t = 0; t < 8; t += 1) {
        for (let x = x0 - t; x < x0 + targetW + t; x += 1) {
          canvas.set(x, y0 - t, rgba(255, 255, 255, 200));
          canvas.set(x, y0 + targetH + t, rgba(255, 255, 255, 200));
        }
      }
    } catch (_err) {
      drawAvatarCircle(canvas, profileBuf, 360, 420, 120, userLabel);
    }
  } else {
    drawAvatarCircle(canvas, null, 360, 420, 120, userLabel);
  }

  const kojLoaded = loadKojMoodSpriteBuffer(safeString(template.kojMood, "happy"));
  if (kojLoaded?.buffer) blitPngBuffer(canvas, kojLoaded.buffer, WIDTH - 340, 180, 0.55);

  const line1 = formatCaption(template.captionTemplate || "{user}", userLabel);
  const line2 = formatCaption(template.subcaptionTemplate || "Spinák · top komunita", userLabel);
  drawTextBanner(canvas, [line1, line2]);

  const fileName = `profile-card-${Date.now()}-${hashKey(userLabel)}.png`;
  const outPath = path.join(OUTPUT_DIR, fileName);
  const pngBuf = canvas.toPngBuffer();
  fs.writeFileSync(outPath, pngBuf);

  return {
    ok: true,
    templateId: safeString(template.id, "profile_card_warm"),
    layout: safeString(template.layout, "profile_hero_card"),
    imagePath: outPath,
    imageUrl: `/generated/media-templates/${fileName}`,
    avatarLoaded: Boolean(profileBuf),
    lines: [line1, line2],
    bytes: pngBuf.length
  };
}

async function composeFromTemplate(templateId = "donator_spotlight", input = {}) {
  const templates = loadTemplates();
  const template = templates.templates?.[templateId];
  if (!template) {
    return { ok: false, reason: "template_not_found", templateId };
  }

  const layout = safeString(template.layout);
  if (layout === "donator_spotlight_pro") {
    return composeDonatorSpotlightPro(input, { ...template, id: templateId });
  }
  if (layout === "profile_hero_card" || layout === "profile_minimal") {
    return composeProfileHeroCard(input, { ...template, id: templateId });
  }

  return { ok: false, reason: "template_layout_unsupported", templateId, layout };
}

module.exports = {
  OUTPUT_DIR,
  composeFromTemplate,
  composeDonatorSpotlightPro,
  composeProfileHeroCard
};
