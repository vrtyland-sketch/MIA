"use strict";

/**
 * Install v36 Koj unify — Soft Neon purple half-robot masters + alias expansion.
 * Backs up live PNGs into offline archive (does not delete offline backups).
 *
 *   node scripts/kojnozrout_install_v36_koj_unify.js
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
const ARCHIVE = path.join(resolveArchiveDir(), "v36-koj-unify");
const BUST = "36-koj-unify";

const MASTERS = {
  idle: "koj-v36-idle-horns.png",
  wave: "koj-v36-wave.png",
  "wave-b": "koj-v36-wave-b.png",
  eating: "koj-v36-eating.png",
  hungry: "koj-v36-hungry.png",
  sad: "koj-v36-sad.png",
  sick: "koj-v36-sick.png",
  full: "koj-v36-full.png",
  excited: "koj-v36-excited.png",
  dance: "koj-v36-dance.png",
  celebrate: "koj-v36-celebrate.png",
  curious: "koj-v36-curious.png",
  annoyed: "koj-v36-annoyed.png",
  proud: "koj-v36-proud.png",
  laugh: "koj-v36-laugh.png",
  love: "koj-v36-love.png",
  hop: "koj-v36-hop.png",
  play: "koj-v36-play.png",
  guard: "koj-v36-guard.png",
  shy: "koj-v36-shy.png",
  stretch: "koj-v36-stretch.png"
};

/**
 * Rest / sleep / cozy aliases → copy from live idle/warm after idle horns install.
 * Do NOT overwrite warm-a/b/f2 or happy-a/b/f2 (v35 polished variants stay).
 */
const REST_FROM_LIVE = {
  idle: [
    "idle-f2",
    "rest",
    "rest-a",
    "rest-f2",
    "curl",
    "curl-a",
    "curl-f2",
    "sleepy",
    "sleepy-a",
    "sleepy-f2",
    "yawn",
    "yawn-a",
    "yawn-f2",
    "cozy",
    "cozy-a",
    "cozy-f2",
    "cozy-blanket",
    "cozy-blanket-a",
    "cozy-blanket-f2",
    "calm-deep",
    "calm-deep-a",
    "calm-deep-f2",
    "egg-rest",
    "egg-rest-a",
    "egg-rest-f2",
    "sit",
    "sit-a",
    "calm",
    "calm-a"
  ],
  warm: [
    "rest-b",
    "curl-b",
    "sleepy-b",
    "yawn-b",
    "cozy-b",
    "cozy-blanket-b",
    "calm-deep-b",
    "egg-rest-b",
    "sit-b",
    "calm-b"
  ]
};

/** New masters → mood keys (+ a/b/f2 and related action aliases). */
const EXPAND_ALIASES = {
  wave: [
    "wave",
    "wave-a",
    "wave-f2",
    "wave-left",
    "flyby",
    "flyby-fast"
  ],
  "wave-b": ["wave-b", "wave-right"],
  eating: [
    "eating",
    "eating-f2",
    "feeding",
    "munch",
    "munch-a",
    "munch-b",
    "munch-f2",
    "snack",
    "snack-a",
    "snack-b",
    "snack-f2",
    "sip",
    "sip-a",
    "sip-b",
    "sip-f2",
    ...Array.from({ length: 16 }, (_, i) => `eating-${String(i + 1).padStart(2, "0")}`)
  ],
  hungry: ["hungry", "hungry-a", "hungry-b", "hungry-f2"],
  sad: ["sad", "sad-a", "sad-b", "sad-f2", "neglect-droop", "neglect-droop-a", "neglect-droop-b", "neglect-droop-f2"],
  sick: ["sick", "sick-a", "sick-b", "sick-f2"],
  full: ["full", "full-a", "full-b", "full-f2"],
  excited: [
    "excited",
    "excited-a",
    "excited-b",
    "excited-f2",
    "hype",
    "hype-jump",
    "hype-jump-a",
    "hype-jump-b",
    "hype-jump-f2",
    "surprised",
    "surprised-a",
    "surprised-b",
    "surprised-pop"
  ],
  dance: [
    "dance",
    "dance-a",
    "dance-b",
    "dance-c",
    "dance-f2",
    "groove",
    "groove-a",
    "groove-b",
    "groove-f2",
    "party",
    "party-a",
    "party-b",
    "party-f2",
    "party-pop",
    "party-pop-a",
    "party-pop-b",
    "party-pop-f2"
  ],
  celebrate: [
    "celebrate",
    "celebrate-a",
    "celebrate-b",
    "celebrate-f2",
    "cheer",
    "cheer-loud",
    "cheer-soft",
    "combo",
    "combo-a",
    "combo-b",
    "combo-fire",
    "combo-fire-a",
    "combo-fire-b",
    "combo-fire-f2"
  ],
  curious: [
    "curious",
    "curious-a",
    "curious-b",
    "curious-f2",
    "thinking",
    "thinking-a",
    "thinking-b",
    "thinking-f2",
    "thinking-hmm",
    "peek",
    "peek-a",
    "peek-b",
    "peek-f2",
    "quest-focus",
    "story",
    "story-read",
    "watch",
    "watch-a",
    "watch-b",
    "watch-f2"
  ],
  annoyed: [
    "annoyed",
    "annoyed-a",
    "annoyed-b",
    "annoyed-f2",
    "stressed",
    "stressed-a",
    "stressed-b",
    "stressed-f2"
  ],
  proud: [
    "proud",
    "proud-a",
    "proud-b",
    "proud-f2",
    "proud-stand",
    "proud-stand-a",
    "proud-stand-b",
    "proud-stand-f2"
  ],
  laugh: ["laugh", "laugh-a", "laugh-b", "laugh-f2"],
  love: [
    "love",
    "love-a",
    "love-b",
    "love-f2",
    "love-hug",
    "love-hug-a",
    "love-hug-b",
    "love-hug-f2",
    "bond-warm",
    "bond-warm-a",
    "bond-warm-b",
    "bond-warm-f2",
    "comfort",
    "comfort-a",
    "comfort-b",
    "comfort-f2",
    "heal-glow",
    "heal-glow-a",
    "heal-glow-b",
    "heal-glow-f2",
    "thanks",
    "thanks-bow",
    "thanks-bow-a",
    "thanks-bow-b",
    "thanks-bow-f2",
    "gift",
    "gift-a",
    "gift-b",
    "gift-f2",
    "gift-hold",
    "gift-open",
    "react-gift",
    "react-gift-a",
    "react-gift-b",
    "react-gift-f2",
    "wink",
    "wink-a",
    "wink-b",
    "wink-f2"
  ],
  hop: ["hop", "hop-a", "hop-b", "hop-f2", "bounce", "bounce-f2"],
  play: ["play", "play-a", "play-b", "play-f2"],
  guard: ["guard", "guard-a", "guard-b", "guard-f2", "alert", "alert-a", "alert-b", "alert-f2"],
  shy: ["shy", "shy-a", "shy-b", "shy-f2", "shy-hide", "shy-hide-a", "shy-hide-b", "shy-hide-f2"],
  stretch: ["stretch", "stretch-a", "stretch-b", "stretch-f2"]
};

function srcPath(fileName) {
  return path.join(CURSOR_ASSETS, fileName);
}

function backupLive(key) {
  const out = path.join(MOODS, `kojnozout-${key}.png`);
  if (!fs.existsSync(out)) return null;
  const bak = path.join(ARCHIVE, `kojnozout-${key}.pre-v36.png`);
  if (!fs.existsSync(bak)) fs.copyFileSync(out, bak);
  return bak;
}

async function installFromFile(key, inputPath, results) {
  if (!fs.existsSync(inputPath)) {
    throw new Error(`Missing source for ${key}: ${inputPath}`);
  }
  backupLive(key);
  const rawProof = path.join(ARCHIVE, path.basename(inputPath));
  if (!fs.existsSync(rawProof)) fs.copyFileSync(inputPath, rawProof);
  const out = path.join(MOODS, `kojnozout-${key}.png`);
  const converted = await convertSprite(inputPath, out, { mode: "auto" });
  results.push({ key, source: inputPath, ...converted });
}

async function copyMood(fromKey, toKey, results) {
  const from = path.join(MOODS, `kojnozout-${fromKey}.png`);
  if (!fs.existsSync(from)) throw new Error(`Missing live master ${fromKey}`);
  backupLive(toKey);
  const to = path.join(MOODS, `kojnozout-${toKey}.png`);
  fs.copyFileSync(from, to);
  results.push({ key: toKey, copiedFrom: fromKey, output: to });
}

async function main() {
  fs.mkdirSync(MOODS, { recursive: true });
  fs.mkdirSync(ARCHIVE, { recursive: true });

  const results = [];

  // 1) Convert new masters into primary keys
  for (const [key, fileName] of Object.entries(MASTERS)) {
    await installFromFile(key, srcPath(fileName), results);
  }

  // 2) Expand action / CARE aliases from new masters
  for (const [masterKey, aliases] of Object.entries(EXPAND_ALIASES)) {
    for (const alias of aliases) {
      if (alias === masterKey) continue;
      await copyMood(masterKey, alias, results);
    }
  }

  // 3) Re-seed rest/sleep aliases from idle (horns) + warm (v35). Keep happy/warm variants.
  for (const [masterKey, aliases] of Object.entries(REST_FROM_LIVE)) {
    for (const alias of aliases) {
      await copyMood(masterKey, alias, results);
    }
  }

  const summary = {
    ok: true,
    bust: BUST,
    archive: ARCHIVE,
    masters: Object.keys(MASTERS),
    installedCount: results.length,
    hornsPolicy: "always-small-cream-horns-plus-purple-crest"
  };
  fs.writeFileSync(path.join(ARCHIVE, "INSTALL_SUMMARY.json"), JSON.stringify(summary, null, 2), "utf8");
  console.log(JSON.stringify({ ...summary, sample: results.slice(0, 12) }, null, 2));
}

main().catch((err) => {
  console.error("[V36_KOJ_UNIFY]", err && err.stack ? err.stack : err);
  process.exit(1);
});
