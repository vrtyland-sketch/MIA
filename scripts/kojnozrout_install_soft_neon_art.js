"use strict";

/**
 * Install Soft Neon Koj mood art (idle/happy/warm) with true alpha.
 * Sources: Cursor GenerateImage assets or .tmp-audit raws.
 *
 *   node scripts/kojnozrout_install_soft_neon_art.js
 */

const fs = require("fs");
const path = require("path");
const { convertSprite } = require("./kojnozrout_prepare_sprite");

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
const ARCHIVE = path.join(resolveArchiveDir(), "v17-soft-neon");

const JOBS = [
  {
    key: "idle",
    candidates: [
      path.join(CURSOR_ASSETS, "koj-soft-neon-idle-raw.png"),
      path.join(TMP, "koj-soft-neon-idle-raw.png"),
      path.join(ARCHIVE, "cursor-koj-soft-neon-idle-raw.png"),
      path.join(ARCHIVE, "koj-soft-neon-idle-raw.png"),
      path.join(ARCHIVE, "kojnozout-idle.png")
    ],
    also: ["warm"]
  },
  {
    key: "happy",
    candidates: [
      path.join(CURSOR_ASSETS, "koj-soft-neon-happy-raw.png"),
      path.join(TMP, "koj-soft-neon-happy-raw.png"),
      path.join(ARCHIVE, "cursor-koj-soft-neon-happy-raw.png"),
      path.join(ARCHIVE, "koj-soft-neon-happy-raw.png"),
      path.join(ARCHIVE, "kojnozout-happy.png")
    ],
    also: []
  }
];

function findSource(candidates) {
  for (const p of candidates) {
    if (p && fs.existsSync(p)) return p;
  }
  return null;
}

async function main() {
  fs.mkdirSync(MOODS, { recursive: true });
  fs.mkdirSync(TMP, { recursive: true });

  const results = [];
  for (const job of JOBS) {
    const src = findSource(job.candidates);
    if (!src) {
      throw new Error(`Missing raw for ${job.key}:\n${job.candidates.join("\n")}`);
    }

    // Keep raw proof copy
    const rawProof = path.join(TMP, path.basename(src));
    if (path.resolve(src) !== path.resolve(rawProof)) {
      fs.copyFileSync(src, rawProof);
    }

    const keys = [job.key, ...(job.also || [])];
    for (const key of keys) {
      const out = path.join(MOODS, `kojnozout-${key}.png`);
      const bak = path.join(MOODS, `kojnozout-${key}.pre-soft-neon-v17.png`);
      if (fs.existsSync(out) && !fs.existsSync(bak)) {
        fs.copyFileSync(out, bak);
      }
      const converted = await convertSprite(src, out, { mode: "auto" });
      results.push({ key, ...converted, source: src });
    }
  }

  console.log(JSON.stringify({ ok: true, count: results.length, results }, null, 2));
}

main().catch((err) => {
  console.error("[KOJ_SOFT_NEON_ART]", err && err.stack ? err.stack : err);
  process.exit(1);
});
