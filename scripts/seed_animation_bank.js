"use strict";

/**
 * Seed Animation Bank 2.0 frames from production Koj mood/pose PNGs
 * (not procedural blob renderer).
 *
 *   node scripts/seed_animation_bank.js
 *   node scripts/seed_animation_bank.js --force
 */

const fs = require("fs");
const path = require("path");

const BANK_ROOT = path.resolve(__dirname, "..", "mia-output-overlay", "assets", "animation-bank");
const MOODS_DIR = path.resolve(
  __dirname,
  "..",
  "mia-output-overlay",
  "assets",
  "kojnozrout",
  "moods"
);

const CLIP_DEFINITIONS = [
  {
    id: "idle/idle_001",
    metadata: {
      label: "Idle breathe",
      fps: 8,
      loop: true,
      emotion: "idle",
      tags: ["idle", "ambient", "koj", "production"],
      anchor: { x: 0.5, y: 1 }
    },
    frames: [{ mood: "idle" }, { mood: "warm" }, { mood: "idle" }, { mood: "calm" }]
  },
  {
    id: "idle/idle_002",
    metadata: {
      label: "Warm idle",
      fps: 8,
      loop: true,
      emotion: "warm",
      tags: ["idle", "warm", "koj", "production"],
      anchor: { x: 0.5, y: 1 }
    },
    frames: [{ mood: "warm" }, { mood: "bond-warm" }, { mood: "idle" }, { mood: "warm" }]
  },
  {
    id: "wave/wave_001",
    metadata: {
      label: "Wave hello",
      fps: 10,
      loop: false,
      emotion: "wave",
      tags: ["wave", "greeting", "koj", "production"],
      anchor: { x: 0.5, y: 1 }
    },
    frames: [
      { mood: "wave" },
      { mood: "wave-left" },
      { mood: "happy" },
      { mood: "wave-right" },
      { mood: "wave" },
      { mood: "happy" }
    ]
  },
  {
    id: "happy/happy_001",
    metadata: {
      label: "Happy bounce",
      fps: 12,
      loop: false,
      emotion: "happy",
      tags: ["happy", "celebrate", "koj", "production"],
      anchor: { x: 0.5, y: 1 }
    },
    frames: [
      { mood: "happy" },
      { mood: "excited" },
      { mood: "laugh" },
      { mood: "happy" },
      { mood: "celebrate" },
      { mood: "happy" }
    ]
  },
  {
    id: "sad/sad_001",
    metadata: {
      label: "Sad droop",
      fps: 8,
      loop: true,
      emotion: "sad",
      tags: ["sad", "comfort", "koj", "production"],
      anchor: { x: 0.5, y: 1 }
    },
    frames: [{ mood: "sad" }, { mood: "comfort" }, { mood: "sad" }, { mood: "comfort" }]
  },
  {
    id: "dance/dance_001",
    metadata: {
      label: "Dance groove",
      fps: 14,
      loop: true,
      emotion: "dance",
      tags: ["dance", "party", "koj", "production"],
      anchor: { x: 0.5, y: 1 }
    },
    frames: [
      { mood: "dance" },
      { mood: "groove" },
      { mood: "party" },
      { mood: "dance" },
      { mood: "party-pop" },
      { mood: "groove" },
      { mood: "dance" },
      { mood: "party" }
    ]
  },
  {
    id: "gift/rose",
    metadata: {
      label: "Rose gift reaction",
      fps: 12,
      loop: false,
      emotion: "warm",
      effectProgram: "flower_support",
      giftKeys: ["rose", "flowers_bouquet"],
      tags: ["gift", "rose", "romance", "flower", "production"],
      tiers: ["T1", "T2", "T3"],
      anchor: { x: 0.5, y: 1 },
      spriteHint: "react-gift"
    },
    frames: [
      { mood: "react-gift" },
      { mood: "love" },
      { mood: "happy" },
      { mood: "react-gift" },
      { mood: "love" },
      { mood: "thanks-bow" }
    ]
  },
  {
    id: "gift/heart",
    metadata: {
      label: "Heart gift reaction",
      fps: 12,
      loop: false,
      emotion: "love",
      effectProgram: "heart_ping",
      giftKeys: ["heart_small", "heart_big"],
      tags: ["gift", "heart", "romance", "production"],
      anchor: { x: 0.5, y: 1 },
      spriteHint: "love"
    },
    frames: [
      { mood: "love" },
      { mood: "love-hug" },
      { mood: "happy" },
      { mood: "love" },
      { mood: "react-gift" },
      { mood: "warm" }
    ]
  },
  {
    id: "gift/lion",
    metadata: {
      label: "Lion pet react",
      fps: 12,
      loop: false,
      emotion: "excited",
      effectProgram: "pet_react",
      giftKeys: ["lion"],
      tags: ["gift", "animal", "pet", "production"],
      anchor: { x: 0.5, y: 1 },
      spriteHint: "excited"
    },
    frames: [
      { mood: "curious" },
      { mood: "excited" },
      { mood: "happy" },
      { mood: "react-gift" },
      { mood: "laugh" },
      { mood: "happy" }
    ]
  },
  {
    id: "gift/perfume",
    metadata: {
      label: "Perfume sparkle",
      fps: 10,
      loop: false,
      emotion: "warm",
      effectProgram: "flower_burst",
      giftKeys: ["perfume"],
      tags: ["gift", "perfume", "sparkle", "production"],
      anchor: { x: 0.5, y: 1 },
      spriteHint: "warm"
    },
    frames: [
      { mood: "warm" },
      { mood: "curious" },
      { mood: "love" },
      { mood: "happy" },
      { mood: "thanks-bow" }
    ]
  },
  {
    id: "gift/galaxy",
    metadata: {
      label: "Galaxy cosmic",
      fps: 14,
      loop: false,
      emotion: "excited",
      effectProgram: "power_strike",
      giftKeys: ["galaxy", "universe"],
      tags: ["gift", "boss", "cosmic", "production"],
      tiers: ["T4", "T5", "T6"],
      anchor: { x: 0.5, y: 1 },
      spriteHint: "party-pop"
    },
    frames: [
      { mood: "excited" },
      { mood: "party" },
      { mood: "dance" },
      { mood: "party-pop" },
      { mood: "celebrate" },
      { mood: "excited" },
      { mood: "party" }
    ]
  }
];

const MOOD_ALIASES = {
  warm: ["warm", "bond-warm"],
  "bond-warm": ["bond-warm", "warm"],
  groove: ["groove", "dance"],
  celebrate: ["celebrate", "party", "happy"],
  comfort: ["comfort", "sad"],
  "party-pop": ["party-pop", "party", "celebrate"],
  "love-hug": ["love-hug", "love"],
  "thanks-bow": ["thanks-bow", "thanks", "react-gift"],
  "wave-left": ["wave-left", "wave"],
  "wave-right": ["wave-right", "wave"],
  "react-gift": ["react-gift", "happy", "love"]
};

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function moodCandidateNames(mood) {
  const key = String(mood || "idle").toLowerCase();
  const aliases = MOOD_ALIASES[key] || [key];
  const names = [];
  for (const alias of aliases) {
    names.push(
      `kojnozout-${alias}-a.png`,
      `kojnozout-${alias}-b.png`,
      `kojnozout-${alias}-f2.png`,
      `kojnozout-${alias}.png`
    );
  }
  names.push("kojnozout-idle.png");
  return names;
}

function resolveMoodSourceFile(mood, frameIndex = 0) {
  const names = moodCandidateNames(mood);
  const existing = names
    .map((name) => ({ name, full: path.join(MOODS_DIR, name) }))
    .filter((row) => fs.existsSync(row.full));
  if (!existing.length) {
    throw new Error(`missing_production_mood:${mood}`);
  }
  return existing[frameIndex % existing.length];
}

function seedClip(definition, options = {}) {
  const clipDir = path.join(BANK_ROOT, ...definition.id.split("/"));
  const framesDir = path.join(clipDir, "frames");
  const metadataPath = path.join(clipDir, "metadata.json");

  if (fs.existsSync(metadataPath) && !options.force) {
    return { id: definition.id, skipped: true };
  }

  ensureDir(framesDir);

  const sources = [];
  definition.frames.forEach((frame, index) => {
    const source = resolveMoodSourceFile(frame.mood || frame.file, index);
    const fileName = `${String(index + 1).padStart(4, "0")}.png`;
    fs.copyFileSync(source.full, path.join(framesDir, fileName));
    sources.push({ frame: fileName, mood: frame.mood || null, source: source.name });
  });

  const metadata = {
    id: definition.id,
    category: definition.id.split("/")[0],
    frameCount: definition.frames.length,
    source: "production_moods",
    quality: "production",
    ...definition.metadata
  };
  fs.writeFileSync(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`);

  return {
    id: definition.id,
    frameCount: definition.frames.length,
    seeded: true,
    quality: "production",
    sources
  };
}

function seedAnimationBank(options = {}) {
  ensureDir(BANK_ROOT);
  const results = CLIP_DEFINITIONS.map((def) => seedClip(def, options));
  return {
    bankRoot: BANK_ROOT,
    clipCount: CLIP_DEFINITIONS.length,
    source: "production_moods",
    results
  };
}

if (require.main === module) {
  const force = process.argv.includes("--force");
  try {
    const result = seedAnimationBank({ force });
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error(err?.stack || err);
    process.exitCode = 1;
  }
}

module.exports = {
  CLIP_DEFINITIONS,
  seedAnimationBank,
  seedClip,
  BANK_ROOT,
  MOODS_DIR,
  resolveMoodSourceFile,
  moodCandidateNames
};
