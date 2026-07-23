"use strict";

/**
 * Procedural Kojnožrout mascot renderer — distinct PNG per mood.
 * Output: 512×512 RGBA with transparent background.
 */

const { PNG } = require("pngjs");

const SIZE = 512;
const MAGENTA = [255, 0, 255];

const MOOD_SPECS = {
  idle: {
    body: [98, 196, 118],
    bodyDark: [52, 130, 72],
    highlight: [168, 238, 178],
    cheeks: null,
    eyeStyle: "open",
    mouth: "smile",
    tilt: 0,
    scaleY: 1
  },
  warm: {
    body: [108, 206, 128],
    bodyDark: [58, 140, 78],
    highlight: [178, 248, 188],
    cheeks: [255, 170, 170],
    eyeStyle: "gentle",
    mouth: "softSmile",
    tilt: 0,
    scaleY: 1
  },
  happy: {
    body: [118, 216, 138],
    bodyDark: [62, 150, 82],
    highlight: [190, 255, 200],
    cheeks: [255, 140, 160],
    eyeStyle: "sparkle",
    mouth: "grin",
    tilt: -4,
    scaleY: 1.04
  },
  hungry: {
    body: [230, 170, 90],
    bodyDark: [170, 110, 40],
    highlight: [255, 210, 130],
    cheeks: null,
    eyeStyle: "wide",
    mouth: "open",
    tilt: 6,
    scaleY: 0.96,
    props: ["drool", "rumble"]
  },
  excited: {
    body: [130, 210, 255],
    bodyDark: [70, 140, 210],
    highlight: [200, 240, 255],
    cheeks: [255, 180, 210],
    eyeStyle: "star",
    mouth: "grin",
    tilt: -8,
    scaleY: 1.08,
    props: ["sparkles"]
  },
  eating: {
    body: [120, 200, 130],
    bodyDark: [60, 140, 75],
    highlight: [180, 240, 190],
    cheeks: [255, 190, 150],
    eyeStyle: "happy",
    mouth: "chew",
    tilt: 4,
    scaleY: 1,
    props: ["bowl", "spoon"]
  },
  full: {
    body: [100, 190, 150],
    bodyDark: [55, 125, 90],
    highlight: [160, 230, 190],
    cheeks: [255, 160, 140],
    eyeStyle: "content",
    mouth: "fullSmile",
    tilt: 0,
    scaleY: 1.12,
    props: ["belly", "crumbs"]
  },
  sleepy: {
    body: [140, 170, 220],
    bodyDark: [90, 110, 170],
    highlight: [190, 210, 245],
    cheeks: [180, 190, 230],
    eyeStyle: "closed",
    mouth: "o",
    tilt: 8,
    scaleY: 0.94,
    props: ["zzz"]
  },
  sick: {
    body: [170, 220, 130],
    bodyDark: [100, 150, 70],
    highlight: [210, 245, 170],
    cheeks: [190, 230, 160],
    eyeStyle: "dizzy",
    mouth: "wavy",
    tilt: 5,
    scaleY: 0.98,
    props: ["thermometer", "bandage"]
  },
  sad: {
    body: [120, 160, 210],
    bodyDark: [70, 100, 160],
    highlight: [170, 200, 240],
    cheeks: null,
    eyeStyle: "sad",
    mouth: "frown",
    tilt: 10,
    scaleY: 0.92,
    props: ["tear"]
  },
  annoyed: {
    body: [240, 140, 120],
    bodyDark: [180, 80, 70],
    highlight: [255, 190, 170],
    cheeks: [255, 100, 90],
    eyeStyle: "angry",
    mouth: "flat",
    tilt: -3,
    scaleY: 1.02,
    props: ["steam"]
  },
  laugh: {
    body: [255, 210, 100],
    bodyDark: [220, 150, 50],
    highlight: [255, 240, 170],
    cheeks: [255, 150, 170],
    eyeStyle: "happy",
    mouth: "grin",
    tilt: -6,
    scaleY: 1.06,
    props: ["sparkles"]
  },
  stressed: {
    body: [255, 160, 130],
    bodyDark: [200, 90, 70],
    highlight: [255, 210, 180],
    cheeks: [255, 120, 100],
    eyeStyle: "wide",
    mouth: "wavy",
    tilt: 4,
    scaleY: 0.97,
    props: ["steam", "drool"]
  },
  watch: {
    body: [108, 198, 128],
    bodyDark: [56, 132, 76],
    highlight: [178, 248, 188],
    cheeks: [255, 200, 180],
    eyeStyle: "wide",
    mouth: "o",
    tilt: -3,
    scaleY: 1,
    props: ["sparkles"]
  },
  groove: {
    body: [118, 208, 148],
    bodyDark: [62, 142, 82],
    highlight: [188, 255, 200],
    cheeks: [255, 170, 190],
    eyeStyle: "happy",
    mouth: "grin",
    tilt: -10,
    scaleY: 1.05,
    props: ["notes"]
  },
  dance: {
    body: [130, 210, 255],
    bodyDark: [72, 145, 215],
    highlight: [200, 240, 255],
    cheeks: [255, 180, 210],
    eyeStyle: "star",
    mouth: "grin",
    tilt: -14,
    scaleY: 1.1,
    props: ["sparkles", "notes"]
  },
  party: {
    body: [255, 205, 95],
    bodyDark: [225, 145, 45],
    highlight: [255, 240, 170],
    cheeks: [255, 140, 170],
    eyeStyle: "star",
    mouth: "grin",
    tilt: -8,
    scaleY: 1.12,
    props: ["sparkles", "hearts"]
  },
  curious: {
    body: [115, 205, 175],
    bodyDark: [60, 140, 110],
    highlight: [185, 245, 215],
    cheeks: null,
    eyeStyle: "wide",
    mouth: "o",
    tilt: 14,
    scaleY: 1,
    props: ["sparkles"]
  },
  love: {
    body: [255, 150, 175],
    bodyDark: [210, 90, 120],
    highlight: [255, 210, 225],
    cheeks: [255, 120, 150],
    eyeStyle: "gentle",
    mouth: "softSmile",
    tilt: -4,
    scaleY: 1.04,
    props: ["hearts"]
  }
};

const ALL_MOODS = Object.keys(MOOD_SPECS);
const EATING_VARIANT_COUNT = 12;

function renderEatingVariant(variantIndex = 1) {
  const index = clamp(Math.floor(toNumber(variantIndex, 1)), 1, EATING_VARIANT_COUNT);
  const seed = index - 1;
  return renderKojnozoutMood("eating", {
    seed,
    hueDeg: seed * 11 - 22,
    bowlOffsetX: 90 + seed * 14,
    bowlOffsetY: 62 + (seed % 2) * 8,
    chewPhase: seed
  });
}

function listEatingVariantFileKeys() {
  return Array.from({ length: EATING_VARIANT_COUNT }, (_, i) =>
    `eating-${String(i + 1).padStart(2, "0")}`
  );
}

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function rgba(r, g, b, a = 255) {
  return { r, g, b, a };
}

function blendPixel(existing, color) {
  const alpha = color.a / 255;
  if (alpha <= 0) return existing;
  if (alpha >= 1 || existing.a === 0) return color;
  const inv = 1 - alpha;
  return {
    r: Math.round(color.r * alpha + existing.r * inv),
    g: Math.round(color.g * alpha + existing.g * inv),
    b: Math.round(color.b * alpha + existing.b * inv),
    a: Math.round(255 * (alpha + inv * (existing.a / 255)))
  };
}

class SpriteCanvas {
  constructor(width = SIZE, height = SIZE) {
    this.width = width;
    this.height = height;
    this.pixels = new Array(width * height).fill(null).map(() => rgba(0, 0, 0, 0));
  }

  idx(x, y) {
    return y * this.width + x;
  }

  get(x, y) {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return rgba(0, 0, 0, 0);
    return this.pixels[this.idx(x, y)];
  }

  set(x, y, color) {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return;
    const i = this.idx(x, y);
    this.pixels[i] = blendPixel(this.pixels[i], color);
  }

  fill(fn) {
    for (let y = 0; y < this.height; y += 1) {
      for (let x = 0; x < this.width; x += 1) {
        const c = fn(x, y);
        if (c && c.a > 0) this.set(x, y, c);
      }
    }
  }

  fillDisk(cx, cy, radius, color) {
    const r2 = radius * radius;
    const minX = Math.floor(cx - radius - 2);
    const maxX = Math.ceil(cx + radius + 2);
    const minY = Math.floor(cy - radius - 2);
    const maxY = Math.ceil(cy + radius + 2);
    for (let y = minY; y <= maxY; y += 1) {
      for (let x = minX; x <= maxX; x += 1) {
        const dx = x - cx;
        const dy = y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const edge = clamp(1 - (dist - radius), 0, 1);
        if (edge <= 0) continue;
        this.set(x, y, rgba(color.r, color.g, color.b, Math.round(color.a * edge)));
      }
    }
  }

  fillEllipse(cx, cy, rx, ry, color, rotationDeg = 0) {
    const rad = (rotationDeg * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const maxR = Math.max(rx, ry) + 2;
    const minX = Math.floor(cx - maxR);
    const maxX = Math.ceil(cx + maxR);
    const minY = Math.floor(cy - maxR);
    const maxY = Math.ceil(cy + maxR);
    for (let y = minY; y <= maxY; y += 1) {
      for (let x = minX; x <= maxX; x += 1) {
        const dx = x - cx;
        const dy = y - cy;
        const lx = dx * cos + dy * sin;
        const ly = -dx * sin + dy * cos;
        const nx = lx / rx;
        const ny = ly / ry;
        const dist = Math.sqrt(nx * nx + ny * ny);
        const edge = clamp(1.25 - dist, 0, 1);
        if (edge <= 0) continue;
        this.set(x, y, rgba(color.r, color.g, color.b, Math.round(color.a * edge)));
      }
    }
  }

  strokeArc(cx, cy, radius, startDeg, endDeg, width, color) {
    const steps = Math.max(24, Math.round(Math.abs(endDeg - startDeg) * 1.5));
    for (let i = 0; i <= steps; i += 1) {
      const t = i / steps;
      const ang = lerp(startDeg, endDeg, t) * (Math.PI / 180);
      const px = cx + Math.cos(ang) * radius;
      const py = cy + Math.sin(ang) * radius;
      this.fillDisk(px, py, width / 2, color);
    }
  }

  strokeLine(x1, y1, x2, y2, width, color) {
    const dist = Math.hypot(x2 - x1, y2 - y1);
    const steps = Math.max(2, Math.ceil(dist));
    for (let i = 0; i <= steps; i += 1) {
      const t = i / steps;
      const x = lerp(x1, x2, t);
      const y = lerp(y1, y2, t);
      this.fillDisk(x, y, width / 2, color);
    }
  }

  toPngBuffer() {
    const png = new PNG({ width: this.width, height: this.height });
    for (let i = 0; i < this.pixels.length; i += 1) {
      const p = this.pixels[i];
      const o = i << 2;
      png.data[o] = p.r;
      png.data[o + 1] = p.g;
      png.data[o + 2] = p.b;
      png.data[o + 3] = p.a;
    }
    return PNG.sync.write(png);
  }
}

function drawBody(canvas, spec, cx, cy) {
  const scaleY = spec.scaleY || 1;
  const body = rgba(...spec.body, 255);
  const dark = rgba(...spec.bodyDark, 255);
  const hi = rgba(...spec.highlight, 220);

  canvas.fillEllipse(cx, cy + 18 * scaleY, 118, 132 * scaleY, body, spec.tilt || 0);
  canvas.fillEllipse(cx - 88, cy + 40, 28, 34, body, spec.tilt || 0);
  canvas.fillEllipse(cx + 88, cy + 40, 28, 34, body, spec.tilt || 0);
  canvas.fillEllipse(cx - 72, cy + 118, 34, 22, dark, spec.tilt || 0);
  canvas.fillEllipse(cx + 72, cy + 118, 34, 22, dark, spec.tilt || 0);
  canvas.fillEllipse(cx - 40, cy - 10, 52, 58, hi, spec.tilt || 0);

  if (spec.cheeks) {
    const cheek = rgba(...spec.cheeks, 170);
    canvas.fillEllipse(cx - 62, cy + 36, 24, 16, cheek, spec.tilt || 0);
    canvas.fillEllipse(cx + 62, cy + 36, 24, 16, cheek, spec.tilt || 0);
  }
}

function drawEyes(canvas, style, cx, cy) {
  const white = rgba(255, 255, 255, 255);
  const pupil = rgba(35, 35, 50, 255);
  const lash = rgba(40, 40, 55, 255);
  const left = cx - 44;
  const right = cx + 44;
  const eyeY = cy - 8;

  if (style === "closed" || style === "content") {
    canvas.strokeLine(left - 14, eyeY, left + 14, eyeY, 6, lash);
    canvas.strokeLine(right - 14, eyeY, right + 14, eyeY, 6, lash);
    if (style === "content") {
      canvas.strokeArc(left, eyeY + 6, 10, 200, 340, 4, rgba(80, 80, 100, 200));
      canvas.strokeArc(right, eyeY + 6, 10, 200, 340, 4, rgba(80, 80, 100, 200));
    }
    return;
  }

  canvas.fillEllipse(left, eyeY, 28, 32, white);
  canvas.fillEllipse(right, eyeY, 28, 32, white);

  if (style === "open") {
    canvas.fillDisk(left, eyeY + 4, 9, pupil);
    canvas.fillDisk(right, eyeY + 4, 9, pupil);
    canvas.fillDisk(left + 4, eyeY - 2, 4, rgba(255, 255, 255, 220));
    canvas.fillDisk(right + 4, eyeY - 2, 4, rgba(255, 255, 255, 220));
  } else if (style === "gentle" || style === "happy") {
    canvas.fillDisk(left, eyeY + 6, 8, pupil);
    canvas.fillDisk(right, eyeY + 6, 8, pupil);
    canvas.strokeArc(left, eyeY - 4, 18, 200, 340, 4, lash);
    canvas.strokeArc(right, eyeY - 4, 18, 200, 340, 4, lash);
  } else if (style === "sparkle" || style === "star") {
    const star = rgba(255, 220, 80, 255);
    for (const ex of [left, right]) {
      canvas.fillDisk(ex, eyeY + 4, 10, star);
      canvas.strokeLine(ex, eyeY - 8, ex, eyeY + 16, 3, star);
      canvas.strokeLine(ex - 10, eyeY + 4, ex + 10, eyeY + 4, 3, star);
    }
  } else if (style === "wide") {
    canvas.fillEllipse(left, eyeY + 2, 12, 16, pupil);
    canvas.fillEllipse(right, eyeY + 2, 12, 16, pupil);
    canvas.fillDisk(left + 5, eyeY - 6, 5, rgba(255, 255, 255, 220));
    canvas.fillDisk(right + 5, eyeY - 6, 5, rgba(255, 255, 255, 220));
  } else if (style === "sad") {
    canvas.fillDisk(left, eyeY + 8, 8, pupil);
    canvas.fillDisk(right, eyeY + 8, 8, pupil);
    canvas.strokeArc(left, eyeY - 8, 20, 160, 320, 4, lash);
    canvas.strokeArc(right, eyeY - 8, 20, 160, 320, 4, lash);
  } else if (style === "angry") {
    canvas.fillDisk(left, eyeY + 6, 7, pupil);
    canvas.fillDisk(right, eyeY + 6, 7, pupil);
    canvas.strokeLine(left - 16, eyeY - 14, left + 10, eyeY - 6, 5, lash);
    canvas.strokeLine(right + 16, eyeY - 14, right - 10, eyeY - 6, 5, lash);
  } else if (style === "dizzy") {
    const spiral = rgba(90, 90, 120, 255);
    for (const ex of [left, right]) {
      canvas.strokeArc(ex, eyeY + 4, 8, 0, 300, 3, spiral);
      canvas.strokeArc(ex, eyeY + 4, 4, 120, 420, 2, spiral);
    }
  }
}

function drawMouth(canvas, kind, cx, cy) {
  const lip = rgba(60, 40, 45, 255);
  const inner = rgba(180, 70, 90, 230);
  const mouthY = cy + 42;

  if (kind === "smile") {
    canvas.strokeArc(cx, mouthY - 8, 22, 200, 340, 5, lip);
  } else if (kind === "softSmile" || kind === "fullSmile") {
    canvas.strokeArc(cx, mouthY - 4, 26, 190, 350, 6, lip);
  } else if (kind === "grin") {
    canvas.fillEllipse(cx, mouthY + 2, 34, 20, inner);
    canvas.strokeArc(cx, mouthY - 2, 30, 185, 355, 5, lip);
  } else if (kind === "open") {
    canvas.fillEllipse(cx, mouthY + 8, 28, 34, inner);
    canvas.fillEllipse(cx, mouthY + 8, 22, 28, rgba(120, 40, 55, 220));
  } else if (kind === "chew") {
    canvas.fillEllipse(cx, mouthY + 4, 30, 22, inner);
    canvas.strokeLine(cx - 18, mouthY + 2, cx + 18, mouthY + 10, 4, lip);
  } else if (kind === "o") {
    canvas.fillEllipse(cx, mouthY + 6, 14, 18, inner);
  } else if (kind === "frown") {
    canvas.strokeArc(cx, mouthY + 18, 22, 20, 160, 5, lip);
  } else if (kind === "flat") {
    canvas.strokeLine(cx - 22, mouthY + 6, cx + 22, mouthY + 8, 5, lip);
  } else if (kind === "wavy") {
    canvas.strokeArc(cx - 12, mouthY + 8, 10, 200, 340, 4, lip);
    canvas.strokeArc(cx + 12, mouthY + 8, 10, 200, 340, 4, lip);
  }
}

function drawProps(canvas, props, cx, cy, spec) {
  if (!props || !props.length) return;

  if (props.includes("zzz")) {
    const z = rgba(180, 200, 255, 240);
    canvas.strokeLine(cx + 70, cy - 90, cx + 88, cy - 102, 5, z);
    canvas.strokeLine(cx + 88, cy - 102, cx + 96, cy - 94, 5, z);
    canvas.fillDisk(cx + 100, cy - 118, 14, z);
    canvas.fillDisk(cx + 118, cy - 138, 10, rgba(180, 200, 255, 180));
  }

  if (props.includes("tear")) {
    const tear = rgba(120, 180, 255, 220);
    canvas.fillEllipse(cx - 52, cy + 18, 8, 14, tear);
    canvas.fillEllipse(cx + 52, cy + 22, 8, 14, tear);
  }

  if (props.includes("steam")) {
    const steam = rgba(255, 255, 255, 180);
    canvas.fillEllipse(cx - 90, cy - 70, 18, 28, steam);
    canvas.fillEllipse(cx - 72, cy - 98, 14, 22, rgba(255, 255, 255, 140));
    canvas.fillEllipse(cx + 92, cy - 66, 16, 26, steam);
  }

  if (props.includes("thermometer")) {
    const red = rgba(230, 70, 70, 255);
    canvas.fillEllipse(cx + 96, cy + 10, 10, 48, rgba(240, 240, 250, 255));
    canvas.fillDisk(cx + 96, cy + 48, 14, red);
    canvas.fillEllipse(cx + 96, cy + 20, 4, 22, red);
  }

  if (props.includes("bandage")) {
    canvas.fillEllipse(cx - 8, cy - 36, 36, 16, rgba(240, 220, 180, 240));
    canvas.strokeLine(cx - 24, cy - 36, cx + 8, cy - 36, 3, rgba(220, 180, 140, 255));
  }

  if (props.includes("drool")) {
    canvas.fillEllipse(cx + 18, cy + 62, 8, 18, rgba(140, 210, 255, 200));
  }

  if (props.includes("rumble")) {
    const w = rgba(120, 90, 60, 180);
    canvas.strokeArc(cx - 90, cy + 70, 12, 220, 320, 3, w);
    canvas.strokeArc(cx - 72, cy + 82, 10, 230, 310, 3, w);
  }

  if (props.includes("sparkles")) {
    const s = rgba(255, 240, 120, 240);
    canvas.fillDisk(cx - 110, cy - 40, 6, s);
    canvas.fillDisk(cx + 118, cy - 20, 5, s);
    canvas.fillDisk(cx + 100, cy + 90, 4, s);
  }

  if (props.includes("bowl")) {
    const bowl = rgba(180, 100, 60, 255);
    const bowlX = toNumber(spec.bowlOffsetX, 108);
    const bowlY = toNumber(spec.bowlOffsetY, 72);
    canvas.fillEllipse(cx + bowlX, cy + bowlY, 48, 22, bowl);
    canvas.fillEllipse(cx + bowlX, cy + bowlY - 10, 40, 16, rgba(240, 200, 120, 255));
  }

  if (props.includes("spoon")) {
    canvas.fillEllipse(cx + 72, cy + 48, 8, 28, rgba(200, 200, 210, 255));
    canvas.fillEllipse(cx + 72, cy + 28, 16, 12, rgba(220, 220, 230, 255));
  }

  if (props.includes("belly")) {
    canvas.fillEllipse(cx, cy + 58, 72, 58, rgba(...spec.bodyDark, 120));
  }

  if (props.includes("crumbs")) {
    const c = rgba(210, 170, 90, 255);
    canvas.fillDisk(cx - 40, cy + 88, 5, c);
    canvas.fillDisk(cx + 30, cy + 92, 4, c);
    canvas.fillDisk(cx + 8, cy + 98, 3, c);
  }

  if (props.includes("hearts")) {
    const h = rgba(255, 90, 130, 235);
    canvas.fillEllipse(cx - 78, cy - 58, 14, 12, h);
    canvas.fillEllipse(cx - 66, cy - 66, 14, 12, h);
    canvas.fillEllipse(cx + 72, cy - 48, 12, 10, h);
    canvas.fillEllipse(cx + 82, cy - 54, 12, 10, h);
  }

  if (props.includes("notes")) {
    const n = rgba(255, 225, 110, 245);
    canvas.fillDisk(cx + 104, cy - 82, 7, n);
    canvas.fillDisk(cx + 118, cy - 58, 5, n);
    canvas.fillDisk(cx - 108, cy - 24, 5, rgba(255, 225, 110, 200));
  }
}

function renderKojnozoutMood(moodKey, options = {}) {
  const spec = cloneSpecWithVariant(MOOD_SPECS[moodKey] || MOOD_SPECS.idle, options);
  const canvas = new SpriteCanvas(SIZE, SIZE);
  const cx = SIZE / 2;
  const cy = SIZE / 2 + 20;

  drawBody(canvas, spec, cx, cy);
  drawEyes(canvas, spec.eyeStyle, cx, cy);
  drawMouth(canvas, spec.mouth, cx, cy);
  drawProps(canvas, spec.props, cx, cy, spec);

  return canvas.toPngBuffer();
}

function shiftRgb(rgb, hueDeg = 0, satMul = 1, lightMul = 1) {
  const [r0, g0, b0] = rgb;
  const r = r0 / 255;
  const g = g0 / 255;
  const b = b0 / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = max === 0 ? 0 : (max - min) / max;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  h = (h + hueDeg / 360 + 1) % 1;
  s = clamp(s * satMul, 0, 1);
  const l2 = clamp(l * lightMul, 0, 1);
  if (s === 0) {
    const v = Math.round(l2 * 255);
    return [v, v, v];
  }
  const q = l2 < 0.5 ? l2 * (1 + s) : l2 + s - l2 * s;
  const p = 2 * l2 - q;
  const hue2rgb = (t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [
    Math.round(hue2rgb(h + 1 / 3) * 255),
    Math.round(hue2rgb(h) * 255),
    Math.round(hue2rgb(h - 1 / 3) * 255)
  ];
}

function cloneSpecWithVariant(baseSpec, options = {}) {
  const seed = Math.max(0, toNumber(options.seed, 0));
  const hue = toNumber(options.hueDeg, (seed % 17) * 4 - 32);
  const sat = 1 + ((seed % 5) - 2) * 0.04;
  const light = 1 + ((seed % 7) - 3) * 0.03;
  const chewPhase = toNumber(options.chewPhase, seed % 3);
  const spec = {
    ...baseSpec,
    body: shiftRgb(baseSpec.body, hue, sat, light),
    bodyDark: shiftRgb(baseSpec.bodyDark, hue, sat * 0.95, light * 0.92),
    highlight: shiftRgb(baseSpec.highlight, hue, sat * 1.05, light * 1.06),
    tilt: (baseSpec.tilt || 0) + ((seed % 9) - 4) * 0.6,
    scaleY: clamp((baseSpec.scaleY || 1) + ((seed % 5) - 2) * 0.015, 0.88, 1.14),
    bowlOffsetX: toNumber(options.bowlOffsetX, 108),
    bowlOffsetY: toNumber(options.bowlOffsetY, 72),
    chewPhase
  };
  if (baseSpec.cheeks) {
    spec.cheeks = shiftRgb(baseSpec.cheeks, hue * 0.5, sat, light);
  }
  if (spec.mouth === "chew") {
    spec.mouth = chewPhase === 1 ? "open" : chewPhase === 2 ? "grin" : "chew";
  }
  return spec;
}

function resolveVariantPlan(variantIndex = 1) {
  const index = clamp(Math.floor(toNumber(variantIndex, 1)), 1, 100);
  const mood = ALL_MOODS[(index - 1) % ALL_MOODS.length];
  const seed = Math.floor((index - 1) / ALL_MOODS.length);
  return { index, mood, seed };
}

function renderKojnozoutVariant(variantIndex = 1) {
  const plan = resolveVariantPlan(variantIndex);
  return renderKojnozoutMood(plan.mood, { seed: plan.seed, hueDeg: (plan.index * 7) % 40 - 20 });
}

function blitPngBuffer(canvas, pngBuffer, dx, dy, scale = 1) {
  const src = PNG.sync.read(pngBuffer);
  const sw = src.width;
  const sh = src.height;
  const tw = Math.max(1, Math.round(sw * scale));
  const th = Math.max(1, Math.round(sh * scale));
  for (let y = 0; y < th; y += 1) {
    for (let x = 0; x < tw; x += 1) {
      const sx = Math.min(sw - 1, Math.floor(((x + 0.5) / tw) * sw));
      const sy = Math.min(sh - 1, Math.floor(((y + 0.5) / th) * sh));
      const o = (sy * sw + sx) << 2;
      const a = src.data[o + 3];
      if (a <= 8) continue;
      canvas.set(dx + x, dy + y, rgba(src.data[o], src.data[o + 1], src.data[o + 2], a));
    }
  }
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function listKojnozoutMoods() {
  return ALL_MOODS.slice();
}

module.exports = {
  SIZE,
  MOOD_SPECS,
  ALL_MOODS,
  EATING_VARIANT_COUNT,
  listKojnozoutMoods,
  listEatingVariantFileKeys,
  renderKojnozoutMood,
  renderEatingVariant,
  renderKojnozoutVariant,
  resolveVariantPlan,
  cloneSpecWithVariant,
  blitPngBuffer,
  SpriteCanvas
};
