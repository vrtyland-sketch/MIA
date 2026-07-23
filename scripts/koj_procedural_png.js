"use strict";

const { PNG } = require("pngjs");

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

function createCanvas(w, h) {
  const png = new PNG({ width: w, height: h });
  png.data.fill(0);
  return png;
}

function setPixel(png, x, y, r, g, b, a = 255) {
  if (x < 0 || y < 0 || x >= png.width || y >= png.height) return;
  const i = (png.width * y + x) << 2;
  if (a >= 255) {
    png.data[i] = r;
    png.data[i + 1] = g;
    png.data[i + 2] = b;
    png.data[i + 3] = 255;
    return;
  }
  const ia = a / 255;
  const oa = png.data[i + 3] / 255;
  const outA = ia + oa * (1 - ia);
  if (outA <= 0) return;
  png.data[i] = Math.round((r * ia + png.data[i] * oa * (1 - ia)) / outA);
  png.data[i + 1] = Math.round((g * ia + png.data[i + 1] * oa * (1 - ia)) / outA);
  png.data[i + 2] = Math.round((b * ia + png.data[i + 2] * oa * (1 - ia)) / outA);
  png.data[i + 3] = Math.round(outA * 255);
}

function fillCircle(png, cx, cy, radius, color) {
  const r2 = radius * radius;
  for (let y = Math.floor(cy - radius); y <= Math.ceil(cy + radius); y += 1) {
    for (let x = Math.floor(cx - radius); x <= Math.ceil(cx + radius); x += 1) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= r2) {
        setPixel(png, x, y, color.r, color.g, color.b, color.a ?? 255);
      }
    }
  }
}

function fillRect(png, x0, y0, w, h, color) {
  for (let y = y0; y < y0 + h; y += 1) {
    for (let x = x0; x < x0 + w; x += 1) {
      setPixel(png, x, y, color.r, color.g, color.b, color.a ?? 255);
    }
  }
}

function fillRoundRect(png, x0, y0, w, h, radius, color) {
  fillRect(png, x0 + radius, y0, w - radius * 2, h, color);
  fillRect(png, x0, y0 + radius, w, h - radius * 2, color);
  fillCircle(png, x0 + radius, y0 + radius, radius, color);
  fillCircle(png, x0 + w - radius, y0 + radius, radius, color);
  fillCircle(png, x0 + radius, y0 + h - radius, radius, color);
  fillCircle(png, x0 + w - radius, y0 + h - radius, radius, color);
}

function drawStar(png, cx, cy, outerR, innerR, color, points = 5) {
  const verts = [];
  for (let i = 0; i < points * 2; i += 1) {
    const a = (Math.PI / 2) * -1 + (i * Math.PI) / points;
    const r = i % 2 === 0 ? outerR : innerR;
    verts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
  }
  for (let y = 0; y < png.height; y += 1) {
    for (let x = 0; x < png.width; x += 1) {
      if (pointInPoly(x + 0.5, y + 0.5, verts)) {
        setPixel(png, x, y, color.r, color.g, color.b, color.a ?? 255);
      }
    }
  }
}

function pointInPoly(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x;
    const yi = poly[i].y;
    const xj = poly[j].x;
    const yj = poly[j].y;
    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi + 1e-9) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function drawHeart(png, cx, cy, size, color) {
  for (let y = 0; y < png.height; y += 1) {
    for (let x = 0; x < png.width; x += 1) {
      const nx = (x - cx) / size;
      const ny = (y - cy) / size;
      const v = Math.pow(nx * nx + ny * ny - 1, 3) - nx * nx * Math.pow(ny, 3);
      if (v <= 0.05) setPixel(png, x, y, color.r, color.g, color.b, color.a ?? 255);
    }
  }
}

function writePng(png, dest) {
  return new Promise((resolve, reject) => {
    png
      .pack()
      .pipe(require("fs").createWriteStream(dest))
      .on("finish", resolve)
      .on("error", reject);
  });
}

function drawCoin(png) {
  const s = png.width;
  fillCircle(png, s / 2, s / 2, s * 0.42, { r: 255, g: 208, b: 64 });
  fillCircle(png, s / 2, s / 2, s * 0.34, { r: 255, g: 180, b: 20 });
  fillCircle(png, s / 2, s / 2, s * 0.12, { r: 120, g: 70, b: 0, a: 180 });
}

function drawBox(png) {
  const s = png.width;
  fillRoundRect(png, s * 0.18, s * 0.22, s * 0.64, s * 0.58, s * 0.08, { r: 160, g: 110, b: 60 });
  fillRoundRect(png, s * 0.22, s * 0.18, s * 0.56, s * 0.12, s * 0.04, { r: 120, g: 75, b: 35 });
  fillRect(png, s * 0.46, s * 0.18, s * 0.08, s * 0.62, { r: 90, g: 55, b: 25 });
}

function drawOrb(png) {
  const s = png.width;
  fillCircle(png, s / 2, s / 2, s * 0.38, { r: 160, g: 90, b: 255, a: 90 });
  fillCircle(png, s / 2, s / 2, s * 0.28, { r: 200, g: 140, b: 255, a: 200 });
  fillCircle(png, s * 0.58, s * 0.4, s * 0.08, { r: 255, g: 255, b: 255, a: 220 });
}

function drawHeartIcon(png) {
  drawHeart(png, png.width / 2, png.height / 2 + png.height * 0.05, png.width * 0.22, {
    r: 80,
    g: 230,
    b: 120
  });
}

function drawFood(png) {
  const s = png.width;
  fillRoundRect(png, s * 0.28, s * 0.42, s * 0.44, s * 0.22, s * 0.08, { r: 220, g: 120, b: 70 });
  fillCircle(png, s * 0.28, s * 0.48, s * 0.1, { r: 255, g: 240, b: 220 });
  fillCircle(png, s * 0.72, s * 0.48, s * 0.1, { r: 255, g: 240, b: 220 });
}

function drawStarIcon(png) {
  drawStar(png, png.width / 2, png.height / 2, png.width * 0.38, png.width * 0.16, {
    r: 255,
    g: 230,
    b: 80
  });
}

function drawSpark(png) {
  const s = png.width;
  const c = { r: 255, g: 255, b: 180 };
  fillCircle(png, s / 2, s / 2, s * 0.08, c);
  for (let i = 0; i < 4; i += 1) {
    const a = (i * Math.PI) / 2;
    for (let t = 0; t < s * 0.35; t += 1) {
      setPixel(png, Math.round(s / 2 + Math.cos(a) * t), Math.round(s / 2 + Math.sin(a) * t), c.r, c.g, c.b, 255 - t * 2);
    }
  }
}

function drawItemIcon(kind, size = 96) {
  const png = createCanvas(size, size);
  const drawers = {
    snack: drawFood,
    jablko: (p) => {
      fillCircle(p, size / 2, size / 2, size * 0.32, { r: 220, g: 50, b: 50 });
      fillRect(p, size * 0.48, size * 0.12, size * 0.06, size * 0.16, { r: 80, g: 160, b: 40 });
    },
    granule: (p) => {
      for (let i = 0; i < 8; i += 1) {
        fillCircle(p, size * 0.3 + (i % 4) * size * 0.12, size * 0.35 + Math.floor(i / 4) * size * 0.18, size * 0.07, {
          r: 180,
          g: 120,
          b: 60
        });
      }
    },
    feast: drawFood,
    cheer: drawStarIcon,
    micek: (p) => fillCircle(p, size / 2, size / 2, size * 0.28, { r: 255, g: 90, b: 90 }),
    kartac: (p) => {
      fillRect(p, size * 0.42, size * 0.2, size * 0.16, size * 0.55, { r: 120, g: 80, b: 40 });
      for (let i = 0; i < 5; i += 1) {
        fillRect(p, size * 0.3 + i * size * 0.08, size * 0.16, size * 0.04, size * 0.12, { r: 200, g: 180, b: 140 });
      }
    },
    spark: drawSpark,
    boost: drawOrb,
    utok: (p) => {
      fillCircle(p, size / 2, size / 2, size * 0.3, { r: 255, g: 80, b: 60, a: 200 });
      for (let i = 0; i < 6; i += 1) {
        const a = (i * Math.PI * 2) / 6;
        fillCircle(p, size / 2 + Math.cos(a) * size * 0.28, size / 2 + Math.sin(a) * size * 0.28, size * 0.07, {
          r: 255,
          g: 120,
          b: 80
        });
      }
    },
    posileni: drawStarIcon,
    shield: (p) => {
      for (let y = 0; y < size; y += 1) {
        for (let x = 0; x < size; x += 1) {
          const nx = (x - size / 2) / (size * 0.35);
          const ny = (y - size * 0.55) / (size * 0.45);
          if (nx * nx + ny * ny <= 1 && y >= size * 0.25) {
            setPixel(p, x, y, 100, 180, 255, 230);
          }
        }
      }
    },
    lektvar: (p) => {
      fillRoundRect(p, size * 0.35, size * 0.28, size * 0.3, size * 0.48, size * 0.08, { r: 80, g: 220, b: 120, a: 220 });
      fillRect(p, size * 0.42, size * 0.18, size * 0.16, size * 0.12, { r: 180, g: 180, b: 200 });
    },
    obvaz: (p) => {
      fillRoundRect(p, size * 0.22, size * 0.38, size * 0.56, size * 0.24, size * 0.06, { r: 240, g: 240, b: 250 });
      fillRect(p, size * 0.46, size * 0.34, size * 0.08, size * 0.32, { r: 220, g: 60, b: 60 });
    },
    ryba: (p) => {
      fillCircle(p, size * 0.45, size * 0.5, size * 0.22, { r: 100, g: 160, b: 220 });
      fillCircle(p, size * 0.72, size * 0.5, size * 0.08, { r: 80, g: 140, b: 200 });
    },
    kolac: (p) => {
      fillCircle(p, size / 2, size / 2, size * 0.32, { r: 240, g: 200, b: 120 });
      fillCircle(p, size * 0.42, size * 0.42, size * 0.06, { r: 255, g: 80, b: 100 });
      fillCircle(p, size * 0.58, size * 0.55, size * 0.06, { r: 255, g: 80, b: 100 });
    },
    energie: drawSpark,
    koruna: drawStarIcon,
    prapor: (p) => {
      fillRect(p, size * 0.28, size * 0.2, size * 0.06, size * 0.62, { r: 120, g: 80, b: 40 });
      fillRect(p, size * 0.34, size * 0.22, size * 0.38, size * 0.26, { r: 255, g: 60, b: 90 });
    },
    balzam: (p) => {
      fillRoundRect(p, size * 0.32, size * 0.35, size * 0.36, size * 0.42, size * 0.1, { r: 180, g: 255, b: 200, a: 220 });
    },
    hvezda: drawStarIcon,
    talisman: drawOrb,
    box: drawBox,
    coin: drawCoin,
    orb: drawOrb,
    heart: drawHeartIcon,
    food: drawFood,
    star: drawStarIcon
  };
  (drawers[kind] || drawSpark)(png);
  return png;
}

function drawArenaBackground(w = 1080, h = 1920) {
  const png = createCanvas(w, h);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const t = y / h;
      const r = Math.round(18 + t * 8 + Math.sin(x * 0.01) * 4);
      const g = Math.round(6 + t * 12);
      const b = Math.round(28 + t * 18);
      setPixel(png, x, y, r, g, b, Math.round(140 + t * 80));
    }
  }
  for (let x = 0; x < w; x += 1) {
    const wave = Math.sin(x * 0.02) * 8;
    for (let y = Math.floor(h * 0.72 + wave); y < h; y += 1) {
      setPixel(png, x, y, 40, 18, 60, 200);
    }
  }
  fillCircle(png, w / 2, h * 0.42, w * 0.35, { r: 120, g: 40, b: 180, a: 35 });
  return png;
}

function drawVsBadge(w = 320, h = 160) {
  const png = createCanvas(w, h);
  fillRoundRect(png, w * 0.08, h * 0.12, w * 0.84, h * 0.76, h * 0.2, { r: 20, g: 8, b: 32, a: 220 });
  fillRoundRect(png, w * 0.1, h * 0.14, w * 0.8, h * 0.72, h * 0.18, { r: 255, g: 80, b: 180, a: 40 });
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      if (x > w * 0.28 && x < w * 0.72 && y > h * 0.28 && y < h * 0.72) {
        setPixel(png, x, y, 255, 240, 120, 255);
      }
    }
  }
  return png;
}

function drawPropBowl(png) {
  const s = png.width;
  fillRoundRect(png, s * 0.12, s * 0.42, s * 0.76, s * 0.34, s * 0.12, { r: 180, g: 120, b: 90 });
  fillRoundRect(png, s * 0.16, s * 0.38, s * 0.68, s * 0.12, s * 0.06, { r: 200, g: 140, b: 100 });
  for (let i = 0; i < 18; i += 1) {
    const x = s * (0.22 + (i * 17 % 56) / 100);
    const y = s * (0.46 + (i * 13 % 22) / 100);
    fillCircle(png, x, y, s * 0.04, { r: 220, g: 140, b: 60 });
  }
}

function drawPropBall(png) {
  const s = png.width;
  fillCircle(png, s / 2, s / 2, s * 0.36, { r: 145, g: 70, b: 255 });
  for (let i = 0; i < 5; i += 1) {
    const a = (i * Math.PI * 2) / 5;
    fillCircle(png, s / 2 + Math.cos(a) * s * 0.18, s / 2 + Math.sin(a) * s * 0.18, s * 0.08, { r: 138, g: 255, b: 157 });
  }
  fillCircle(png, s * 0.58, s * 0.38, s * 0.08, { r: 255, g: 255, b: 255, a: 180 });
}

function drawPropMic(png) {
  const s = png.width;
  fillRoundRect(png, s * 0.38, s * 0.18, s * 0.24, s * 0.34, s * 0.08, { r: 120, g: 60, b: 200 });
  fillCircle(png, s / 2, s * 0.58, s * 0.16, { r: 80, g: 40, b: 140 });
  fillRect(png, s * 0.47, s * 0.72, s * 0.06, s * 0.18, { r: 60, g: 60, b: 80 });
  fillCircle(png, s / 2, s * 0.24, s * 0.12, { r: 138, g: 255, b: 157, a: 200 });
}

function drawPropHand(png) {
  const s = png.width;
  fillRoundRect(png, s * 0.28, s * 0.52, s * 0.34, s * 0.28, s * 0.1, { r: 120, g: 70, b: 180 });
  fillCircle(png, s * 0.34, s * 0.34, s * 0.1, { r: 130, g: 80, b: 190 });
  fillCircle(png, s * 0.48, s * 0.26, s * 0.1, { r: 130, g: 80, b: 190 });
  fillCircle(png, s * 0.62, s * 0.3, s * 0.09, { r: 130, g: 80, b: 190 });
  fillCircle(png, s * 0.72, s * 0.42, s * 0.08, { r: 130, g: 80, b: 190 });
}

function drawSceneBackdrop(png, palette) {
  const w = png.width;
  const h = png.height;
  for (let y = 0; y < h; y += 1) {
    const t = y / h;
    for (let x = 0; x < w; x += 1) {
      const r = Math.round(palette.top[0] + (palette.bottom[0] - palette.top[0]) * t);
      const g = Math.round(palette.top[1] + (palette.bottom[1] - palette.top[1]) * t);
      const b = Math.round(palette.top[2] + (palette.bottom[2] - palette.top[2]) * t);
      setPixel(png, x, y, r, g, b, 255);
    }
  }
  fillCircle(png, w / 2, h * 0.28, w * 0.32, {
    r: palette.glow[0],
    g: palette.glow[1],
    b: palette.glow[2],
    a: palette.glowA || 40
  });
}

function drawSceneDen(png) {
  drawSceneBackdrop(png, { top: [60, 40, 30], bottom: [20, 14, 10], glow: [120, 80, 40], glowA: 50 });
}
function drawSceneCave(png) {
  drawSceneBackdrop(png, { top: [20, 16, 50], bottom: [8, 6, 20], glow: [140, 60, 220], glowA: 55 });
}
function drawSceneCozy(png) {
  drawSceneBackdrop(png, { top: [40, 24, 50], bottom: [16, 10, 24], glow: [255, 120, 180], glowA: 45 });
}
function drawSceneFeast(png) {
  drawSceneBackdrop(png, { top: [70, 40, 20], bottom: [24, 14, 8], glow: [255, 160, 60], glowA: 50 });
}
function drawSceneParty(png) {
  drawSceneBackdrop(png, { top: [50, 20, 80], bottom: [18, 8, 30], glow: [255, 80, 180], glowA: 55 });
}
function drawSceneNight(png) {
  drawSceneBackdrop(png, { top: [16, 20, 60], bottom: [6, 8, 24], glow: [200, 200, 255], glowA: 40 });
}

function blitCanvas(dest, src, dx, dy) {
  for (let y = 0; y < src.height; y += 1) {
    for (let x = 0; x < src.width; x += 1) {
      const si = (src.width * y + x) << 2;
      const di = (dest.width * (y + dy) + (x + dx)) << 2;
      if (dest.data[di + 3] === 0 || src.data[si + 3] >= dest.data[di + 3]) {
        dest.data[di] = src.data[si];
        dest.data[di + 1] = src.data[si + 1];
        dest.data[di + 2] = src.data[si + 2];
        dest.data[di + 3] = src.data[si + 3];
      } else {
        const ia = src.data[si + 3] / 255;
        const oa = dest.data[di + 3] / 255;
        const outA = ia + oa * (1 - ia);
        if (outA <= 0) continue;
        dest.data[di] = Math.round((src.data[si] * ia + dest.data[di] * oa * (1 - ia)) / outA);
        dest.data[di + 1] = Math.round((src.data[si + 1] * ia + dest.data[di + 1] * oa * (1 - ia)) / outA);
        dest.data[di + 2] = Math.round((src.data[si + 2] * ia + dest.data[di + 2] * oa * (1 - ia)) / outA);
        dest.data[di + 3] = Math.round(outA * 255);
      }
    }
  }
}

function drawParticleAnimCell(drawFn, phase, totalPhases = 4, size = 48) {
  const png = createCanvas(size, size);
  drawFn(png);
  const t = phase / Math.max(1, totalPhases - 1);
  const glowR = size * (0.34 + t * 0.12);
  if (phase === 1 || phase === 2) {
    fillCircle(png, size / 2, size / 2, glowR, { r: 255, g: 255, b: 255, a: phase === 1 ? 28 : 18 });
  }
  const alphaMul = phase === 0 ? 0.82 : phase === totalPhases - 1 ? 0.52 : 1;
  if (alphaMul !== 1) {
    for (let i = 0; i < png.data.length; i += 4) {
      png.data[i + 3] = Math.round(png.data[i + 3] * alphaMul);
    }
  }
  if (phase === 0) {
    const inner = createCanvas(size, size);
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const nx = (x - size / 2) / (size * 0.34);
        const ny = (y - size / 2) / (size * 0.34);
        if (nx * nx + ny * ny > 1) {
          const i = (size * y + x) << 2;
          png.data[i + 3] = 0;
        }
      }
    }
  }
  return png;
}

function drawParticleSheet() {
  const frame = 48;
  const png = createCanvas(frame * 8, frame);
  const kinds = [drawSpark, drawOrb, drawStarIcon, drawCoin, drawHeartIcon, drawBox, drawFood, drawSpark];
  kinds.forEach((draw, i) => {
    const cell = createCanvas(frame, frame);
    draw(cell);
    for (let y = 0; y < frame; y += 1) {
      for (let x = 0; x < frame; x += 1) {
        const si = (frame * y + x) << 2;
        const di = (png.width * y + (i * frame + x)) << 2;
        png.data[di] = cell.data[si];
        png.data[di + 1] = cell.data[si + 1];
        png.data[di + 2] = cell.data[si + 2];
        png.data[di + 3] = cell.data[si + 3];
      }
    }
  });
  return png;
}

/** 8 druhů × 4 anim snímky (řádky = kind, sloupce = fáze) */
function drawParticleSheetAnim() {
  const frame = 48;
  const cols = 4;
  const rows = 8;
  const png = createCanvas(frame * cols, frame * rows);
  const drawers = [drawSpark, drawOrb, drawStarIcon, drawCoin, drawHeartIcon, drawBox, drawFood, drawSpark];
  drawers.forEach((draw, row) => {
    for (let col = 0; col < cols; col += 1) {
      const cell = drawParticleAnimCell(draw, col, cols, frame);
      blitCanvas(png, cell, col * frame, row * frame);
    }
  });
  return png;
}

/** 16-snímkový impact burst (4×4 grid, 64 px buňka) */
function drawBurstImpactFrame(png, idx, total) {
  const s = png.width;
  const cx = s / 2;
  const cy = s / 2;
  const t = idx / Math.max(1, total - 1);
  const ringR = s * (0.05 + t * 0.46);
  const alpha = Math.round(255 * (1 - t * 0.9));
  const core = { r: 255, g: 240, b: 180, a: Math.round(alpha * 0.85) };
  const ring = { r: 255, g: 120, b: 180, a: Math.round(alpha * 0.75) };
  if (t < 0.35) {
    fillCircle(png, cx, cy, s * 0.14 * (1 - t / 0.35), core);
  }
  for (let a = 0; a < Math.PI * 2; a += Math.PI / 10) {
    const px = cx + Math.cos(a + idx * 0.35) * ringR;
    const py = cy + Math.sin(a + idx * 0.35) * ringR;
    fillCircle(png, px, py, 2.2 + (1 - t) * 2.8, ring);
  }
  const sparks = 10 + idx;
  for (let i = 0; i < sparks; i += 1) {
    const ang = (i / sparks) * Math.PI * 2 + idx * 0.55;
    const dist = ringR * (0.45 + ((i * 17 + idx * 13) % 100) / 100);
    fillCircle(png, cx + Math.cos(ang) * dist, cy + Math.sin(ang) * dist, 1.4 + (idx % 3), {
      r: 255,
      g: 200 + (i % 3) * 18,
      b: 120,
      a: Math.round(alpha * 0.65)
    });
  }
  fillCircle(png, cx, cy, s * 0.06, { r: 255, g: 255, b: 255, a: Math.round(alpha * 0.5) });
}

function drawBurstImpactSheet() {
  const frame = 64;
  const cols = 4;
  const rows = 4;
  const total = cols * rows;
  const png = createCanvas(frame * cols, frame * rows);
  for (let i = 0; i < total; i += 1) {
    const cell = createCanvas(frame, frame);
    drawBurstImpactFrame(cell, i, total);
    const col = i % cols;
    const row = Math.floor(i / cols);
    blitCanvas(png, cell, col * frame, row * frame);
  }
  return png;
}

module.exports = {
  createCanvas,
  writePng,
  drawCoin,
  drawBox,
  drawOrb,
  drawHeartIcon,
  drawFood,
  drawStarIcon,
  drawSpark,
  drawItemIcon,
  drawArenaBackground,
  drawVsBadge,
  drawParticleSheet,
  drawParticleSheetAnim,
  drawBurstImpactSheet,
  drawPropBowl,
  drawPropBall,
  drawPropMic,
  drawPropHand,
  drawSceneDen,
  drawSceneCave,
  drawSceneCozy,
  drawSceneFeast,
  drawSceneParty,
  drawSceneNight
};
