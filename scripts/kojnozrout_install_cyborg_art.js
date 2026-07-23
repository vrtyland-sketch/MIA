"use strict";

/**
 * Install Soft Neon cyborg Koj mood art (idle/warm/happy) with true alpha,
 * and overwrite rest-cycle sprites so purple curl never shows.
 *
 *   node scripts/kojnozrout_install_cyborg_art.js
 */

const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const ROOT = path.resolve(__dirname, "..");
const MOODS = path.join(ROOT, "mia-output-overlay", "assets", "kojnozrout", "moods");
const TMP = path.join(ROOT, ".tmp-audit");
const CURSOR_ASSETS = path.join(
  process.env.USERPROFILE || process.env.HOME || "",
  ".cursor",
  "projects",
  "c-MIA",
  "assets"
);

const { resolveArchiveDir } = require("./kojnozrout_offline_paths");
const ARCHIVE = path.join(resolveArchiveDir(), "v19-cyborg");

const MOOD_SOURCES = [
  {
    key: "idle",
    candidates: [
      path.join(CURSOR_ASSETS, "koj-cyborg-idle-raw.png"),
      path.join(TMP, "koj-cyborg-idle-raw.png"),
      path.join(ARCHIVE, "koj-cyborg-idle-raw.png"),
      path.join(ARCHIVE, "kojnozout-idle.png")
    ]
  },
  {
    key: "warm",
    candidates: [
      path.join(CURSOR_ASSETS, "koj-cyborg-warm-v2-raw.png"),
      path.join(CURSOR_ASSETS, "koj-cyborg-warm-raw.png"),
      path.join(TMP, "koj-cyborg-warm-v2-raw.png"),
      path.join(TMP, "koj-cyborg-warm-raw.png"),
      path.join(ARCHIVE, "cursor-koj-cyborg-warm-v2-raw.png"),
      path.join(ARCHIVE, "koj-cyborg-warm-raw.png"),
      path.join(ARCHIVE, "kojnozout-warm.png")
    ]
  },
  {
    key: "happy",
    candidates: [
      path.join(CURSOR_ASSETS, "koj-cyborg-happy-raw.png"),
      path.join(TMP, "koj-cyborg-happy-raw.png"),
      path.join(ARCHIVE, "koj-cyborg-happy-raw.png"),
      path.join(ARCHIVE, "kojnozout-happy.png")
    ]
  }
];

/** Rest / sleep / cozy bank — keep all on cyborg set (no purple curl fallback). */
const REST_ALIASES = {
  idle: [
    "rest", "rest-a", "rest-f2",
    "curl", "curl-a", "curl-f2",
    "sleepy", "sleepy-a", "sleepy-f2",
    "yawn", "yawn-a", "yawn-f2",
    "cozy", "cozy-a", "cozy-f2",
    "cozy-blanket", "cozy-blanket-a", "cozy-blanket-f2",
    "calm-deep", "calm-deep-a", "calm-deep-f2",
    "egg-rest", "egg-rest-a", "egg-rest-f2",
    "idle-f2", "warm-a", "sit", "sit-a", "calm", "calm-a"
  ],
  warm: [
    "rest-b", "curl-b", "sleepy-b", "yawn-b",
    "cozy-b", "cozy-blanket-b", "calm-deep-b", "egg-rest-b",
    "warm-b", "warm-f2", "sit-b", "calm-b"
  ],
  happy: [
    "happy-a", "happy-b", "happy-f2"
  ]
};

function findSource(candidates) {
  for (const p of candidates) {
    if (p && fs.existsSync(p)) return p;
  }
  return null;
}

function isBgCandidate(r, g, b, a, hardLuma) {
  if (a < 12) return true;
  const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const maxC = Math.max(r, g, b);
  const minC = Math.min(r, g, b);
  const sat = maxC - minC;
  const cyanBias = g > r + 8 && b > r + 8;

  // Near-black plate
  if (luma <= hardLuma && maxC <= hardLuma + 10) return true;

  // Near-white / light gray plate
  if (luma >= 232 && sat <= 18) return true;
  if (luma >= 220 && sat <= 10) return true;

  // Soft neon glow fringe (edge-connected cyan bloom / aura) — NOT solid plating
  // Dim translucent cyan haze around character
  if (cyanBias && luma < 95 && sat < 110) return true;
  if (cyanBias && luma < 140 && sat < 55 && maxC < 170) return true;
  // Very dark blue-black with weak cyan tint
  if (luma < 40 && maxC < 55) return true;

  return false;
}

/**
 * Edge flood-fill alpha + soft glow strip (chrome panels stay opaque).
 */
async function toTrueAlpha(inputPath, outputPath, opts = {}) {
  const maxDim = opts.maxDim || 1024;
  const hardLuma = opts.hardLuma ?? 28;
  const softPad = opts.softPad ?? 2;

  const base = sharp(inputPath).ensureAlpha();
  const meta = await base.metadata();
  let pipeline = base;
  if ((meta.width || 0) > maxDim || (meta.height || 0) > maxDim) {
    pipeline = pipeline.resize({
      width: maxDim,
      height: maxDim,
      fit: "inside",
      withoutEnlargement: true
    });
  }

  const { data, info } = await pipeline.raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  if (channels < 4) throw new Error(`expected RGBA, got ${channels}`);

  const n = width * height;
  const mark = new Uint8Array(n);
  const queue = new Int32Array(n);
  let qh = 0;
  let qt = 0;

  const push = (x, y) => {
    const i = y * width + x;
    if (mark[i]) return;
    const o = i * 4;
    if (!isBgCandidate(data[o], data[o + 1], data[o + 2], data[o + 3], hardLuma)) return;
    mark[i] = 1;
    queue[qt++] = i;
  };

  for (let x = 0; x < width; x++) {
    push(x, 0);
    push(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    push(0, y);
    push(width - 1, y);
  }

  while (qh < qt) {
    const i = queue[qh++];
    const x = i % width;
    const y = (i / width) | 0;
    if (x > 0) push(x - 1, y);
    if (x + 1 < width) push(x + 1, y);
    if (y > 0) push(x, y - 1);
    if (y + 1 < height) push(x, y + 1);
  }

  if (softPad > 0) {
    const fringe = new Uint8Array(n);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = y * width + x;
        if (mark[i]) continue;
        let near = false;
        for (let dy = -softPad; dy <= softPad && !near; dy++) {
          for (let dx = -softPad; dx <= softPad; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
            if (mark[ny * width + nx]) near = true;
          }
        }
        if (!near) continue;
        const o = i * 4;
        if (
          isBgCandidate(data[o], data[o + 1], data[o + 2], data[o + 3], hardLuma + 22) ||
          isBgCandidate(data[o], data[o + 1], data[o + 2], data[o + 3], hardLuma)
        ) {
          fringe[i] = 1;
        }
      }
    }
    for (let i = 0; i < n; i++) if (fringe[i]) mark[i] = 2;
  }

  let cleared = 0;
  for (let i = 0; i < n; i++) {
    if (!mark[i]) continue;
    const o = i * 4;
    cleared += 1;
    if (mark[i] === 1) {
      data[o + 3] = 0;
    } else {
      data[o + 3] = Math.round(data[o + 3] * 0.28);
    }
  }

  await sharp(data, { raw: { width, height, channels: 4 } })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(outputPath);

  const outMeta = await sharp(outputPath).metadata();
  return {
    input: inputPath,
    output: outputPath,
    width: outMeta.width,
    height: outMeta.height,
    hasAlpha: outMeta.hasAlpha === true,
    cleared
  };
}

function backupIfNeeded(filePath, suffix) {
  if (!fs.existsSync(filePath)) return;
  const bak = filePath.replace(/\.png$/i, suffix);
  if (!fs.existsSync(bak)) fs.copyFileSync(filePath, bak);
}

async function main() {
  fs.mkdirSync(MOODS, { recursive: true });
  fs.mkdirSync(TMP, { recursive: true });

  const installed = {};
  const results = [];

  for (const job of MOOD_SOURCES) {
    const src = findSource(job.candidates);
    if (!src) {
      throw new Error(`Missing raw for ${job.key}:\n${job.candidates.join("\n")}`);
    }
    const rawProof = path.join(TMP, `koj-cyborg-${job.key}-raw.png`);
    if (path.resolve(src) !== path.resolve(rawProof)) {
      fs.copyFileSync(src, rawProof);
    }

    const out = path.join(MOODS, `kojnozout-${job.key}.png`);
    backupIfNeeded(out, ".pre-cyborg-v19.png");
    const converted = await toTrueAlpha(src, out);
    installed[job.key] = out;
    results.push({ key: job.key, ...converted, source: src });

    // Proof copy with transparent checker-friendly path
    fs.copyFileSync(out, path.join(TMP, `koj-cyborg-${job.key}-alpha.png`));
  }

  // Overwrite rest bank from cyborg masters
  const aliasResults = [];
  for (const [masterKey, aliases] of Object.entries(REST_ALIASES)) {
    const master = installed[masterKey];
    if (!master) continue;
    for (const alias of aliases) {
      const out = path.join(MOODS, `kojnozout-${alias}.png`);
      backupIfNeeded(out, ".pre-cyborg-v19.png");
      fs.copyFileSync(master, out);
      aliasResults.push(alias);
    }
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        moods: results,
        restAliases: aliasResults.length,
        aliasKeys: aliasResults
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error("[KOJ_CYBORG_ART]", err && err.stack ? err.stack : err);
  process.exit(1);
});
