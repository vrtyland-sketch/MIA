"use strict";

/**
 * Odvození mood PNG z kanonických masterů — každá nálada má vlastní transformaci.
 */

const MASTER_MOODS = [
  "idle",
  "warm",
  "happy",
  "hungry",
  "excited",
  "eating",
  "full",
  "sleepy",
  "sick",
  "sad",
  "annoyed",
  "laugh",
  "stressed"
];

const EATING_VARIANT_COUNT = 16;

const EATING_VARIANT_SPECS = [
  { source: "eating", scale: 1, rotateDeg: 0 },
  { source: "happy", flipX: true, scale: 1.04, rotateDeg: -8 },
  { source: "excited", scale: 1.08, rotateDeg: 6, offsetY: -18 },
  { source: "full", scale: 0.96, rotateDeg: -4, offsetY: 12 },
  { source: "warm", scale: 0.98, rotateDeg: 5, offsetX: -20 },
  { source: "laugh", flipX: true, scale: 1.06, rotateDeg: -10 },
  { source: "hungry", scale: 1.02, rotateDeg: 8, offsetY: 8 },
  { source: "idle", scale: 0.94, rotateDeg: -6, offsetY: 20 },
  { source: "eating", flipX: true, scale: 1.05, rotateDeg: 12 },
  { source: "excited", flipX: true, scale: 1.1, offsetY: -28, hueDeg: 8 },
  { source: "happy", scale: 1.03, rotateDeg: -14, offsetX: 24 },
  { source: "full", flipX: true, scale: 1.02, rotateDeg: 7 },
  { source: "eating", scale: 0.92, rotateDeg: -5, offsetY: 16 },
  { source: "warm", flipX: true, scale: 1.01, rotateDeg: 9 },
  { source: "laugh", scale: 1.07, rotateDeg: -11, hueDeg: 12 },
  { source: "hungry", flipX: true, scale: 1.04, rotateDeg: 15, offsetY: -10 }
];

const DERIVED_MOODS = {
  watch: { source: "warm", scale: 0.92, rotateDeg: -7, offsetY: 10 },
  groove: { source: "happy", flipX: true, rotateDeg: -15, scale: 1.06 },
  dance: { source: "excited", rotateDeg: 11, scale: 1.1, offsetX: -35, offsetY: -20 },
  party: { source: "laugh", scale: 1.12, hueDeg: 18, offsetY: -15 },
  curious: { source: "idle", rotateDeg: 14, scale: 1.04, offsetY: -18 },
  love: { source: "happy", scale: 1.05, hueDeg: -22, satMul: 1.08 },
  celebrate: { source: "laugh", scale: 1.1, rotateDeg: -9, hueDeg: 14 },
  cheer: { source: "excited", flipX: true, scale: 1.08, hueDeg: 10 },
  hype: { source: "excited", scale: 1.14, offsetY: -32, hueDeg: 24, rotateDeg: -6 },
  wave: { source: "happy", rotateDeg: -11, scale: 1.03, offsetX: 30 },
  proud: { source: "full", scale: 1.02, rotateDeg: -5, offsetY: -8 },
  shy: { source: "warm", scale: 0.86, rotateDeg: 12, offsetY: 28, offsetX: 18 },
  surprised: { source: "excited", scale: 1.13, offsetY: -36, rotateDeg: 4 },
  thinking: { source: "idle", rotateDeg: 9, scale: 0.94, offsetX: -22 },
  calm: { source: "warm", scale: 0.96, hueDeg: -12, satMul: 0.92, rotateDeg: 3 },
  cozy: { source: "sleepy", scale: 0.95, offsetY: 22, hueDeg: -8 },
  gift: { source: "happy", scale: 1.05, rotateDeg: -8, hueDeg: 6 },
  thanks: { source: "warm", rotateDeg: 10, scale: 0.95, offsetY: 8 },
  combo: { source: "excited", hueDeg: 28, scale: 1.1, flipX: true, rotateDeg: -12 },
  duel: { source: "annoyed", flipX: true, scale: 1.06, rotateDeg: -8 },
  story: { source: "warm", scale: 0.9, rotateDeg: -6, offsetY: 14 },
  flyby: { source: "happy", scale: 1.12, offsetX: 55, rotateDeg: -14, offsetY: -12 },
  feeding: { source: "eating", scale: 1.02, rotateDeg: -4 },
  perch: { source: "idle", scale: 0.88, offsetY: 42 },
  hop: { source: "excited", scale: 1.12, rotateDeg: -9, offsetY: -28 },
  sit: { source: "warm", scale: 0.9, offsetY: 58, rotateDeg: 4 },
  curl: { source: "sleepy", scale: 0.94, rotateDeg: 16, offsetY: 18 },
  stretch: { source: "full", scale: 1.06, rotateDeg: -11, offsetY: -18 },
  yawn: { source: "sleepy", flipX: true, scale: 0.93, rotateDeg: 9 },
  peek: { source: "idle", scale: 1.16, offsetY: -48 },
  wink: { source: "happy", flipX: true, scale: 0.98, rotateDeg: 6 },
  "lean-left": { source: "idle", rotateDeg: 19, offsetX: 44 },
  "lean-right": { source: "idle", rotateDeg: -19, offsetX: -44 },
  bounce: { source: "excited", scale: 1.09, offsetY: -24, rotateDeg: 5 },
  munch: { source: "eating", rotateDeg: -6, scale: 1.03, offsetX: -12 },
  sip: { source: "eating", flipX: true, scale: 0.94, rotateDeg: 7 },
  "cheer-loud": { source: "laugh", scale: 1.14, hueDeg: 15, offsetY: -10 },
  "cheer-soft": { source: "warm", scale: 0.97, hueDeg: -10 },
  "gift-open": { source: "happy", scale: 1.06, rotateDeg: -10, offsetY: -6 },
  "gift-hold": { source: "warm", scale: 0.97, offsetY: 12, rotateDeg: -3 },
  "thanks-bow": { source: "warm", rotateDeg: 13, scale: 0.94, offsetY: 10 },
  "wave-left": { source: "happy", flipX: true, rotateDeg: 12, scale: 1.02 },
  "wave-right": { source: "happy", rotateDeg: -12, scale: 1.02 },
  "hype-jump": { source: "excited", scale: 1.16, offsetY: -40, hueDeg: 22 },
  "party-pop": { source: "laugh", scale: 1.11, hueDeg: 26, flipX: true },
  "duel-ready": { source: "annoyed", flipX: true, scale: 1.07, rotateDeg: -10 },
  "duel-win": { source: "laugh", scale: 1.09, hueDeg: 18, offsetY: -14 },
  "duel-lose": { source: "sad", scale: 0.91, offsetY: 24, rotateDeg: 8 },
  "combo-fire": { source: "excited", hueDeg: 32, scale: 1.11, rotateDeg: -14 },
  "story-read": { source: "warm", scale: 0.91, rotateDeg: -7, offsetY: 16 },
  "flyby-fast": { source: "happy", scale: 1.13, offsetX: 62, rotateDeg: -16 },
  "calm-deep": { source: "sleepy", scale: 0.95, hueDeg: -18, satMul: 0.88 },
  "cozy-blanket": { source: "warm", scale: 0.93, offsetY: 30, hueDeg: -12 },
  "proud-stand": { source: "full", scale: 1.03, rotateDeg: -5, offsetY: -10 },
  "shy-hide": { source: "warm", scale: 0.84, offsetY: 34, rotateDeg: 15, offsetX: 20 },
  "surprised-pop": { source: "excited", scale: 1.15, offsetY: -38, rotateDeg: 3 },
  "thinking-hmm": { source: "idle", rotateDeg: 10, scale: 0.93, offsetX: -18 },
  "love-hug": { source: "happy", scale: 1.07, hueDeg: -18, satMul: 1.1 },
  "chaos-spin": { source: "annoyed", rotateDeg: 21, scale: 1.09 },
  "neglect-droop": { source: "sad", scale: 0.87, offsetY: 38, rotateDeg: 7 },
  "bond-warm": { source: "happy", scale: 0.99, hueDeg: -14 },
  "quest-focus": { source: "idle", scale: 1.05, offsetY: -12, rotateDeg: -4 },
  "react-chat": { source: "warm", flipX: true, scale: 0.97, rotateDeg: 5 },
  "react-gift": { source: "excited", scale: 1.07, hueDeg: 12, offsetY: -8 },
  "react-video": { source: "warm", scale: 0.94, rotateDeg: -5, offsetY: 6 },
  "egg-rest": { source: "idle", scale: 0.78, offsetY: 55 },
  "hatch-wiggle": { source: "idle", scale: 0.82, rotateDeg: -8, offsetY: 48 },
  guard: { source: "annoyed", scale: 1.04, rotateDeg: 6, offsetX: -16 },
  "heal-glow": { source: "sick", scale: 0.98, hueDeg: 35, satMul: 0.85 },
  comfort: { source: "sad", scale: 0.96, hueDeg: -8, offsetY: 10 },
  play: { source: "happy", scale: 1.08, rotateDeg: -13, offsetY: -16 },
  rest: { source: "sleepy", scale: 0.92, offsetY: 26 },
  alert: { source: "hungry", scale: 1.05, rotateDeg: -7, offsetY: -6 },
  snack: { source: "eating", scale: 0.9, rotateDeg: 4, offsetY: 18 }
};

function pad2(n) {
  return String(n).padStart(2, "0");
}

function buildEatingDeriveMap() {
  const map = {};
  for (let i = 1; i <= EATING_VARIANT_COUNT; i += 1) {
    map[`eating-${pad2(i)}`] = EATING_VARIANT_SPECS[i - 1] || { source: "eating" };
  }
  return map;
}

function buildFullDeriveMap() {
  return { ...DERIVED_MOODS, ...buildEatingDeriveMap() };
}

const FULL_DERIVE_MAP = buildFullDeriveMap();
const DERIVED_MOOD_KEYS = Object.keys(FULL_DERIVE_MAP);

function resolveDeriveSpec(targetMood) {
  const raw = FULL_DERIVE_MAP[targetMood];
  if (!raw) return { source: "idle" };
  if (typeof raw === "string") return { source: raw };
  return { ...raw };
}

function listEatingVariantKeys(count = EATING_VARIANT_COUNT) {
  return Array.from({ length: count }, (_, i) => `eating-${pad2(i + 1)}`);
}

module.exports = {
  MASTER_MOODS,
  EATING_VARIANT_COUNT,
  EATING_VARIANT_SPECS,
  DERIVED_MOODS,
  FULL_DERIVE_MAP,
  DERIVED_MOOD_KEYS,
  buildEatingDeriveMap,
  buildFullDeriveMap,
  resolveDeriveSpec,
  listEatingVariantKeys
};
