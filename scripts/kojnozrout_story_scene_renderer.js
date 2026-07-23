"use strict";

/**
 * Story scene composer — stejné Koj PNG jako runtime overlay + čistší layout.
 */

const {
  SpriteCanvas,
  blitPngBuffer: blitSprite
} = require("./kojnozrout_sprite_renderer");
const {
  WIDTH,
  HEIGHT,
  renderGiftBackground
} = require("./kojnozrout_background_generator");
const { loadKojMoodSpriteBuffer } = require("./MIA_KOJNOZROUT_ASSETS");
const {
  fetchAvatarBuffer,
  drawAvatarCircle,
  drawTextBanner
} = require("./MIA_GIFT_VISUAL_COMPOSER");

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function rgba(r, g, b, a = 255) {
  return { r, g, b, a };
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function blitKoj(canvas, kojBuf, x, y, scale = 0.7) {
  if (!kojBuf) return;
  blitSprite(canvas, kojBuf, Math.round(x), Math.round(y), scale);
}

function drawStar(canvas, cx, cy, size, color) {
  canvas.fillDisk(cx, cy, Math.max(2, Math.floor(size)), color);
  for (let i = 0; i < 4; i += 1) {
    const a = (i / 4) * Math.PI * 2;
    canvas.fillDisk(
      Math.round(cx + Math.cos(a) * size * 1.6),
      Math.round(cy + Math.sin(a) * size * 1.6),
      Math.max(1, Math.floor(size * 0.35)),
      color
    );
  }
}

function drawSock(canvas, x, y, scale = 1) {
  const s = scale;
  const bodyW = Math.round(24 * s);
  const bodyH = Math.round(52 * s);
  for (let py = 0; py < bodyH; py += 1) {
    for (let px = 0; px < bodyW; px += 1) {
      const stripe = Math.floor(py / (7 * s)) % 2 === 0;
      canvas.set(
        x + px,
        y + py,
        stripe ? rgba(220, 40, 60, 255) : rgba(255, 255, 255, 255)
      );
    }
  }
  const footW = Math.round(36 * s);
  const footH = Math.round(18 * s);
  for (let py = 0; py < footH; py += 1) {
    for (let px = 0; px < footW; px += 1) {
      canvas.set(x + px, y + bodyH + py, rgba(200, 30, 50, 255));
    }
  }
}

function drawRocket(canvas, x, y, scale = 1, flame = false) {
  const s = scale;
  const bodyH = Math.round(100 * s);
  const bodyW = Math.round(40 * s);
  const cx = x + Math.floor(bodyW / 2);

  for (let py = 0; py < bodyH; py += 1) {
    const t = py / bodyH;
    const half = Math.floor(lerp(bodyW / 2, 5, t));
    for (let px = -half; px <= half; px += 1) {
      const col = t < 0.12 ? rgba(230, 70, 90, 255) : rgba(200, 210, 230, 255);
      canvas.set(cx + px, y + py, col);
    }
  }

  for (let py = 0; py < Math.round(20 * s); py += 1) {
    const half = Math.round(lerp(12, 24, py / (20 * s)) * s);
    for (let px = -half; px <= half; px += 1) {
      canvas.set(cx + px, y - py - 2, rgba(255, 130, 70, flame ? 255 : 200));
    }
  }

  if (flame) {
    for (let py = 0; py < Math.round(32 * s); py += 1) {
      const half = Math.round(lerp(10, 20, py / (32 * s)) * s);
      const col = py % 3 === 0 ? rgba(255, 210, 50, 255) : rgba(255, 100, 30, 240);
      for (let px = -half; px <= half; px += 1) {
        canvas.set(cx + px, y + bodyH + py, col);
      }
    }
  }
}

function drawBowl(canvas, x, y, scale = 1, fillPct = 0.6) {
  const s = scale;
  const w = Math.round(76 * s);
  const h = Math.round(30 * s);
  for (let py = 0; py < h; py += 1) {
    for (let px = 0; px < w; px += 1) {
      const nx = (px - w / 2) / (w / 2);
      const ny = py / h;
      if (nx * nx + ny * ny * 1.35 > 1) continue;
      canvas.set(x + px, y + py, rgba(90, 60, 40, 255));
    }
  }
  const fillH = Math.round(h * fillPct);
  for (let py = h - fillH; py < h; py += 1) {
    for (let px = 5; px < w - 5; px += 1) {
      canvas.set(x + px, y + py, rgba(190, 130, 55, 255));
    }
  }
}

function drawSpaceField(canvas, density = 48) {
  for (let i = 0; i < density; i += 1) {
    const x = (i * 151) % WIDTH;
    const y = (i * 97) % (HEIGHT - 130);
    const size = 1 + (i % 3);
    drawStar(canvas, x, y, size, rgba(255, 255, 255, 120 + (i % 110)));
  }
}

function applyLayout(canvas, layout, ctx = {}) {
  const avatarBuf = ctx.avatarBuf || null;
  const userLabel = safeString(ctx.userLabel, "Divák");
  const kojBuf = ctx.kojBuf || null;

  if (layout === "arrival") {
    blitKoj(canvas, kojBuf, WIDTH - 290, 55, 0.72);
    drawAvatarCircle(canvas, avatarBuf, 150, 215, 82, userLabel);
    drawBowl(canvas, WIDTH - 330, 300, 0.95, 0.22);
    return;
  }

  if (layout === "feeding") {
    blitKoj(canvas, kojBuf, WIDTH - 280, 45, 0.76);
    drawAvatarCircle(canvas, avatarBuf, 130, 225, 78, userLabel);
    drawBowl(canvas, WIDTH - 300, 295, 1.05, 0.88);
    for (let i = 0; i < 7; i += 1) {
      drawStar(canvas, WIDTH - 200 + i * 16, 90 - i * 6, 2, rgba(255, 240, 120, 220));
    }
    return;
  }

  if (layout === "sock_snatch") {
    blitKoj(canvas, kojBuf, WIDTH - 300, 40, 0.78);
    drawAvatarCircle(canvas, avatarBuf, 170, 235, 74, userLabel);
    drawSock(canvas, WIDTH - 220, 250, 1.35);
    for (let i = 0; i < 10; i += 1) {
      drawStar(canvas, 420 + i * 22, 70 + (i % 2) * 18, 2, rgba(255, 200, 80, 210));
    }
    return;
  }

  if (layout === "rocket_board") {
    drawRocket(canvas, WIDTH / 2 - 24, HEIGHT / 2 - 70, 1.55, true);
    drawAvatarCircle(canvas, avatarBuf, WIDTH / 2 - 150, HEIGHT / 2 + 35, 58, userLabel);
    blitKoj(canvas, kojBuf, WIDTH / 2 + 35, HEIGHT / 2 - 10, 0.58);
    return;
  }

  if (layout === "space_fly") {
    drawSpaceField(canvas, 60);
    drawRocket(canvas, WIDTH / 2 - 18, HEIGHT / 2 - 80, 1.35, true);
    drawAvatarCircle(canvas, avatarBuf, WIDTH / 2 - 120, HEIGHT / 2 + 15, 54, userLabel);
    blitKoj(canvas, kojBuf, WIDTH / 2 + 55, HEIGHT / 2 - 25, 0.52);
    drawSock(canvas, WIDTH / 2 + 155, HEIGHT / 2 - 35, 0.9);
    return;
  }

  blitKoj(canvas, kojBuf, WIDTH - 290, 55, 0.72);
  drawAvatarCircle(canvas, avatarBuf, 150, 215, 80, userLabel);
}

async function composeStoryBeatFrame(input = {}) {
  const beat = input.beat || {};
  const userLabel = safeString(input.userLabel, "Divák");
  const avatarUrl = safeString(input.avatarUrl);
  const variantIndex = input.variantIndex || 1;
  const effectProgram = safeString(beat.bg, "generic_support");
  const layout = safeString(beat.layout, "arrival");
  const mood = safeString(beat.kojMood, "happy");

  const bgBuf = renderGiftBackground(effectProgram, variantIndex);
  const kojLoaded = loadKojMoodSpriteBuffer(mood);
  const kojBuf = kojLoaded.buffer;
  const avatarBuf = await fetchAvatarBuffer(avatarUrl);

  const canvas = new SpriteCanvas(WIDTH, HEIGHT);
  blitSprite(canvas, bgBuf, 0, 0, 1);

  if (layout === "space_fly") {
    drawSpaceField(canvas, 28);
  }

  applyLayout(canvas, layout, {
    avatarBuf,
    userLabel,
    kojBuf
  });

  const caption = safeString(beat.caption)
    .replace(/\{user\}/g, userLabel.split(/\s+/)[0] || userLabel)
    .replace(/\{fullUser\}/g, userLabel);

  drawTextBanner(canvas, [caption, safeString(beat.subcaption, "MIA · příběh diváka")]);

  return {
    pngBuffer: canvas.toPngBuffer(),
    caption,
    layout,
    mood,
    kojSpriteSource: kojLoaded.source,
    avatarLoaded: Boolean(avatarBuf)
  };
}

module.exports = {
  composeStoryBeatFrame,
  drawSock,
  drawRocket,
  drawBowl,
  drawSpaceField,
  WIDTH,
  HEIGHT
};
