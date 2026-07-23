"use strict";

/**
 * Kanonické asset cesty pro MIA body parts (ne CSS crop full-body masters).
 * Generuje: node scripts/build_mia_body_parts.js
 */

const PARTS_ROOT = "/assets/mia/parts";

const BODY_PART_ASSETS = {
  head: {
    mode: "mood",
    moods: {
      idle: `${PARTS_ROOT}/head/idle.png`,
      happy: `${PARTS_ROOT}/head/happy.png`,
      gift: `${PARTS_ROOT}/head/gift.png`,
      duel: `${PARTS_ROOT}/head/duel.png`,
      combo: `${PARTS_ROOT}/head/combo.png`,
      think: `${PARTS_ROOT}/head/think.png`,
      wave: `${PARTS_ROOT}/head/wave.png`
    },
    canvas: { width: 360, height: 360 }
  },
  eyes: {
    mode: "speak",
    speak: [
      `${PARTS_ROOT}/eyes/01.png`,
      `${PARTS_ROOT}/eyes/02.png`,
      `${PARTS_ROOT}/eyes/03.png`,
      `${PARTS_ROOT}/eyes/04.png`,
      `${PARTS_ROOT}/eyes/02.png`,
      `${PARTS_ROOT}/eyes/01.png`
    ],
    canvas: { width: 320, height: 180 }
  },
  hands: {
    mode: "gesture",
    idle: `${PARTS_ROOT}/hands/idle.png`,
    wave: `${PARTS_ROOT}/hands/wave.png`,
    canvas: { width: 420, height: 280 }
  },
  torso: {
    mode: "static",
    idle: `${PARTS_ROOT}/torso/idle.png`,
    canvas: { width: 360, height: 480 }
  },
  feet: {
    mode: "static",
    idle: `${PARTS_ROOT}/feet/idle.png`,
    canvas: { width: 360, height: 200 }
  }
};

const REQUIRED_PART_FILES = [
  "head/idle.png",
  "head/happy.png",
  "head/gift.png",
  "head/duel.png",
  "head/think.png",
  "head/combo.png",
  "head/wave.png",
  "eyes/01.png",
  "eyes/02.png",
  "eyes/03.png",
  "eyes/04.png",
  "hands/idle.png",
  "hands/wave.png",
  "torso/idle.png",
  "feet/idle.png"
];

/** Crop regiony jako podíl bbox postavy (auto-detect v build scriptu). Phase 13s polish. */
const PART_CROP_FRACTIONS = {
  head: { x: -0.03, y: 0.0, w: 1.06, h: 0.23 },
  eyes: { x: 0.2, y: 0.05, w: 0.6, h: 0.1 },
  torso: { x: 0.04, y: 0.2, w: 0.92, h: 0.4 },
  hands: { x: -0.38, y: 0.26, w: 1.76, h: 0.26 },
  feet: { x: 0.1, y: 0.78, w: 0.8, h: 0.2 }
};

function listBodyPartAssetFiles() {
  return REQUIRED_PART_FILES.map((rel) => `${PARTS_ROOT}/${rel}`);
}

function resolveHeadAsset(mood = "idle") {
  const key = String(mood || "idle").toLowerCase();
  return BODY_PART_ASSETS.head.moods[key] || BODY_PART_ASSETS.head.moods.idle;
}

function resolveHandsAsset(speaking = false) {
  return speaking ? BODY_PART_ASSETS.hands.wave : BODY_PART_ASSETS.hands.idle;
}

function getBodyPartAssetManifest() {
  return {
    ok: true,
    phase: "12u",
    root: PARTS_ROOT,
    parts: { ...BODY_PART_ASSETS },
    requiredFiles: listBodyPartAssetFiles(),
    cropFractions: { ...PART_CROP_FRACTIONS },
    cropPolish: "13s",
    note: "Dedicated part PNGs with alpha — not CSS crop of full-body masters. Crop polish 13s."
  };
}

module.exports = {
  PARTS_ROOT,
  BODY_PART_ASSETS,
  REQUIRED_PART_FILES,
  PART_CROP_FRACTIONS,
  listBodyPartAssetFiles,
  resolveHeadAsset,
  resolveHandsAsset,
  getBodyPartAssetManifest
};
