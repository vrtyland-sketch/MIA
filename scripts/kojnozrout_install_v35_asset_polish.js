"use strict";

/**
 * Install v35 asset-polish Koj core frames (happy family + warm-b).
 * Backs up live PNGs into offline archive (does not delete offline backups).
 *
 *   node scripts/kojnozrout_install_v35_asset_polish.js
 */

const fs = require("fs");
const path = require("path");
const { convertSprite } = require("./kojnozrout_prepare_sprite");
const { resolveArchiveDir } = require("./kojnozrout_offline_paths");

const ROOT = path.resolve(__dirname, "..");
const MOODS = path.join(ROOT, "mia-output-overlay", "assets", "kojnozrout", "moods");
const CURSOR_ASSETS = path.join(
  process.env.USERPROFILE || process.env.HOME || "",
  ".cursor",
  "projects",
  "c-MIA",
  "assets"
);
const ARCHIVE = path.join(resolveArchiveDir(), "v35-asset-polish");

const JOBS = [
  {
    key: "happy",
    src: path.join(CURSOR_ASSETS, "koj-v35-happy-arms-down.png")
  },
  {
    key: "happy-a",
    src: path.join(CURSOR_ASSETS, "koj-v35-happy-a.png")
  },
  {
    key: "happy-b",
    src: path.join(CURSOR_ASSETS, "koj-v35-happy-b.png")
  },
  {
    key: "happy-f2",
    src: path.join(CURSOR_ASSETS, "koj-v35-happy-f2.png")
  },
  {
    key: "warm-b",
    src: path.join(CURSOR_ASSETS, "koj-v35-warm-b-fix.png")
  }
];

async function main() {
  fs.mkdirSync(MOODS, { recursive: true });
  fs.mkdirSync(ARCHIVE, { recursive: true });

  const results = [];
  for (const job of JOBS) {
    if (!fs.existsSync(job.src)) {
      throw new Error(`Missing source for ${job.key}: ${job.src}`);
    }
    const out = path.join(MOODS, `kojnozout-${job.key}.png`);
    if (fs.existsSync(out)) {
      const bak = path.join(ARCHIVE, `kojnozout-${job.key}.pre-v35.png`);
      if (!fs.existsSync(bak)) fs.copyFileSync(out, bak);
    }
    const rawProof = path.join(ARCHIVE, path.basename(job.src));
    fs.copyFileSync(job.src, rawProof);
    const converted = await convertSprite(job.src, out, { mode: "auto" });
    results.push({ key: job.key, ...converted, source: job.src, archive: ARCHIVE });
  }

  console.log(JSON.stringify({ ok: true, bust: "35-asset-polish", count: results.length, results }, null, 2));
}

main().catch((err) => {
  console.error("[V35_ASSET_POLISH]", err && err.stack ? err.stack : err);
  process.exit(1);
});
