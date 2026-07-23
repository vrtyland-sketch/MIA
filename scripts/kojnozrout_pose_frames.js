"use strict";

/**
 * Katalog vícesnímkových animací Kojnožrouta.
 * Každý cyklus = sekvence existujících PNG klíčů + kadence.
 *
 * Pravidla pojmenování:
 *   walk-a / walk-b     — skutečné krokové snímky (AI z kánonu)
 *   hop-a / hop-b       — skokové snímky
 *   {mood}-f2           — druhá pozice odvozená z kánonu (transform)
 */

/** Druhý snímek pro master nálady — jemný posun těla (squash/lean). */
const MOOD_F2_SPECS = {
  idle: { scale: 1, scaleY: 0.96, offsetY: 10, rotateDeg: -2 },
  warm: { scale: 0.98, scaleY: 0.97, offsetY: 8, rotateDeg: 2 },
  happy: { scale: 1.02, scaleY: 0.98, offsetY: -14, rotateDeg: 3 },
  hungry: { scale: 1.03, scaleY: 0.94, offsetY: 8, rotateDeg: 4 },
  excited: { scale: 1.04, scaleY: 0.97, offsetY: -18, rotateDeg: -5 },
  eating: { scale: 1.02, scaleY: 0.95, offsetY: 6, rotateDeg: -3 },
  full: { scale: 1.01, scaleY: 0.96, offsetY: 12, rotateDeg: 2 },
  sleepy: { scale: 0.97, scaleY: 0.98, offsetY: 14, rotateDeg: 5 },
  sick: { scale: 0.98, scaleY: 0.97, offsetY: 10, rotateDeg: -4 },
  sad: { scale: 0.96, scaleY: 0.98, offsetY: 16, rotateDeg: 6 },
  annoyed: { scale: 1.02, scaleY: 0.96, offsetY: 4, rotateDeg: -6 },
  laugh: { scale: 1.03, scaleY: 0.97, offsetY: -16, rotateDeg: -4 },
  stressed: { scale: 1.01, scaleY: 0.95, offsetY: 6, rotateDeg: 5 }
};

/** Druhý snímek pro derived nálady — transform z existujícího derived PNG. */
const DERIVED_F2_SPECS = {
  sit: { scale: 0.98, scaleY: 0.97, offsetY: 6, rotateDeg: -3 },
  curl: { scale: 0.97, scaleY: 0.99, offsetY: 8, rotateDeg: 4 },
  stretch: { scale: 1.02, scaleY: 0.98, offsetY: -10, rotateDeg: 5 },
  play: { scale: 1.03, scaleY: 0.97, offsetY: -12, rotateDeg: -4 },
  munch: { scale: 1.01, scaleY: 0.96, offsetY: 4, rotateDeg: 3 },
  guard: { scale: 1.02, scaleY: 0.98, offsetY: 2, rotateDeg: -5 },
  hop: { scale: 1.02, scaleY: 0.96, offsetY: -8, rotateDeg: 4 },
  bounce: { scale: 1.03, scaleY: 0.95, offsetY: -14, rotateDeg: -3 },
  wave: { scale: 1.01, scaleY: 0.99, offsetY: -4, rotateDeg: 6 },
  dance: { scale: 1.02, scaleY: 0.98, offsetY: -8, rotateDeg: -6 },
  celebrate: { scale: 1.03, scaleY: 0.97, offsetY: -10, rotateDeg: 4 },
  gift: { scale: 1.02, scaleY: 0.98, offsetY: -6, rotateDeg: -4 },
  love: { scale: 1.02, scaleY: 0.99, offsetY: -8, rotateDeg: 3 },
  cozy: { scale: 0.98, scaleY: 0.99, offsetY: 10, rotateDeg: 3 },
  "cozy-blanket": { scale: 0.97, scaleY: 1, offsetY: 12, rotateDeg: 5 },
  rest: { scale: 0.98, scaleY: 0.99, offsetY: 8, rotateDeg: 4 },
  yawn: { scale: 0.99, scaleY: 0.98, offsetY: 6, rotateDeg: -4 },
  perch: { scale: 0.99, scaleY: 0.98, offsetY: 4, rotateDeg: -3 },
  peek: { scale: 1.02, scaleY: 0.99, offsetY: -6, rotateDeg: 5 },
  wink: { scale: 1.01, scaleY: 0.99, offsetY: -4, rotateDeg: -5 },
  alert: { scale: 1.02, scaleY: 0.97, offsetY: -4, rotateDeg: 4 },
  snack: { scale: 1.01, scaleY: 0.96, offsetY: 5, rotateDeg: -3 },
  sip: { scale: 0.99, scaleY: 0.97, offsetY: 4, rotateDeg: 3 },
  proud: { scale: 1.02, scaleY: 0.98, offsetY: -8, rotateDeg: -4 },
  "proud-stand": { scale: 1.01, scaleY: 0.99, offsetY: -6, rotateDeg: 3 },
  thinking: { scale: 0.99, scaleY: 0.98, offsetY: 4, rotateDeg: 5 },
  calm: { scale: 0.99, scaleY: 0.99, offsetY: 6, rotateDeg: -2 },
  "calm-deep": { scale: 0.98, scaleY: 1, offsetY: 10, rotateDeg: 3 },
  "bond-warm": { scale: 1.01, scaleY: 0.99, offsetY: -4, rotateDeg: 2 },
  "thanks-bow": { scale: 0.99, scaleY: 0.98, offsetY: 8, rotateDeg: 6 },
  "react-gift": { scale: 1.03, scaleY: 0.97, offsetY: -10, rotateDeg: -5 },
  "react-video": { scale: 0.99, scaleY: 0.99, offsetY: 4, rotateDeg: -3 },
  "react-chat": { scale: 1, scaleY: 0.99, offsetY: -2, rotateDeg: 4 },
  "duel-ready": { scale: 1.02, scaleY: 0.98, offsetY: -4, rotateDeg: -6 },
  "combo-fire": { scale: 1.03, scaleY: 0.96, offsetY: -12, rotateDeg: 5 },
  "party-pop": { scale: 1.03, scaleY: 0.97, offsetY: -10, rotateDeg: -4 },
  "hype-jump": { scale: 1.04, scaleY: 0.95, offsetY: -16, rotateDeg: 4 },
  "love-hug": { scale: 1.02, scaleY: 0.98, offsetY: -6, rotateDeg: 3 },
  comfort: { scale: 0.99, scaleY: 0.99, offsetY: 8, rotateDeg: 4 },
  "heal-glow": { scale: 0.99, scaleY: 0.99, offsetY: 6, rotateDeg: -3 },
  "neglect-droop": { scale: 0.98, scaleY: 1, offsetY: 10, rotateDeg: 5 },
  shy: { scale: 0.99, scaleY: 0.99, offsetY: 6, rotateDeg: 6 },
  "shy-hide": { scale: 0.98, scaleY: 1, offsetY: 8, rotateDeg: 8 },
  watch: { scale: 0.99, scaleY: 0.99, offsetY: 2, rotateDeg: -4 },
  groove: { scale: 1.02, scaleY: 0.98, offsetY: -8, rotateDeg: -5 },
  party: { scale: 1.03, scaleY: 0.97, offsetY: -10, rotateDeg: 4 },
  curious: { scale: 1.01, scaleY: 0.99, offsetY: -6, rotateDeg: 6 },
  "egg-rest": { scale: 0.99, scaleY: 0.99, offsetY: 8, rotateDeg: 3 },
  "hatch-wiggle": { scale: 1.02, scaleY: 0.97, offsetY: -6, rotateDeg: -5 }
};

/**
 * Klidné nálady bez vlastní lokomoční pózy — smí dostat CSS traverse + walk-a/b.
 * Explicitní ambient (hop, wave, sit, play, watch…) zůstane stát a hraje svůj cyklus.
 */
const WANDER_WALK_MOODS = new Set([
  "idle",
  "calm",
  "warm",
  "happy",
  "curious",
  "thinking",
  "story",
  "story-read",
  "lean-left",
  "lean-right"
]);

/** Stejná sada pro applyStageMood — kdy zapnout wander CSS traverse. */
const CALM_WANDER_MOODS = WANDER_WALK_MOODS;

/** Při wander + tyto nálady → walk-a/b místo idle/lean cyklu (skutečná chůze). */
const WANDER_WALK_FRAME_MOODS = new Set([
  "idle",
  "lean-left",
  "lean-right",
  "story",
  "story-read"
]);

/** Cykly přehrávání v runtime overlayi. */
const POSE_CYCLES = [
  {
    id: "walk",
    frames: ["walk-a", "walk-b"],
    halfMs: 390
  },
  {
    id: "hop",
    frames: ["hop-a", "hop-b"],
    halfMs: 400,
    moods: ["hop", "bounce"]
  },
  {
    id: "dance",
    frames: ["dance-a", "dance-b", "dance-c"],
    halfMs: 320,
    moods: ["dance"]
  },
  {
    id: "wave",
    frames: ["wave-a", "wave-b"],
    halfMs: 480,
    moods: ["wave", "wave-left", "wave-right"]
  },
  {
    id: "eat",
    frames: [
      "eating-01",
      "eating-02",
      "eating-03",
      "eating-04"
    ],
    halfMs: 460,
    moods: ["eating", "feeding"],
    prefixes: ["eating-"]
  },
  {
    id: "rest",
    frames: ["sleepy-a", "sleepy-b", "curl-a", "curl-b"],
    halfMs: 1100,
    moods: ["sleepy", "curl"]
  },
  {
    id: "thinking",
    frames: ["thinking-a", "thinking-b", "thinking"],
    halfMs: 900,
    moods: ["thinking", "thinking-hmm", "quest-focus"]
  },
  {
    id: "proud",
    frames: ["proud-a", "proud-b", "proud"],
    halfMs: 720,
    moods: ["proud"]
  },
  {
    id: "curious",
    frames: ["curious-a", "curious-b", "curious"],
    halfMs: 820,
    moods: ["curious"]
  },
  {
    id: "shy",
    frames: ["shy-a", "shy-b", "shy"],
    halfMs: 1000,
    moods: ["shy"]
  },
  {
    id: "peek",
    frames: ["peek-a", "peek-b", "peek"],
    halfMs: 700,
    moods: ["peek"]
  },
  {
    id: "wink",
    frames: ["wink-a", "wink-b", "wink"],
    halfMs: 520,
    moods: ["wink"]
  },
  {
    id: "calm",
    frames: ["calm-a", "calm-b", "calm"],
    halfMs: 1200,
    moods: ["calm"]
  },
  {
    id: "comfort",
    frames: ["comfort-a", "comfort-b", "comfort"],
    halfMs: 950,
    moods: ["comfort"]
  },
  {
    id: "surprised",
    frames: ["surprised-a", "surprised-b", "surprised"],
    halfMs: 340,
    moods: ["surprised", "surprised-pop"]
  },
  {
    id: "react-gift",
    frames: ["react-gift-a", "react-gift-b", "react-gift"],
    halfMs: 400,
    moods: ["react-gift"]
  },
  {
    id: "thanks-bow",
    frames: ["thanks-bow-a", "thanks-bow-b", "thanks-bow"],
    halfMs: 480,
    moods: ["thanks", "thanks-bow"]
  },
  {
    id: "react-video",
    frames: ["react-video-a", "react-video-b", "react-video"],
    halfMs: 450,
    moods: ["react-video"]
  },
  {
    id: "hatch-wiggle",
    frames: ["hatch-wiggle-a", "hatch-wiggle-b", "hatch-wiggle"],
    halfMs: 300,
    moods: ["hatch-wiggle"]
  },
  {
    id: "neglect-droop",
    frames: ["neglect-droop-a", "neglect-droop-b", "neglect-droop"],
    halfMs: 1400,
    moods: ["neglect-droop"]
  },
  {
    id: "party-pop",
    frames: ["party-pop-a", "party-pop-b", "party-pop"],
    halfMs: 320,
    moods: ["party-pop"]
  },
  {
    id: "hype-jump",
    frames: ["hype-jump-a", "hype-jump-b", "hype-jump"],
    halfMs: 300,
    moods: ["hype-jump"]
  },
  {
    id: "heal-glow",
    frames: ["heal-glow-a", "heal-glow-b", "heal-glow"],
    halfMs: 1000,
    moods: ["heal-glow"]
  },
  {
    id: "react-chat",
    frames: ["react-chat-a", "react-chat-b", "react-chat"],
    halfMs: 460,
    moods: ["react-chat"]
  },
  {
    id: "duel-ready",
    frames: ["duel-ready-a", "duel-ready-b", "duel-ready"],
    halfMs: 340,
    moods: ["duel-ready", "taunt"]
  },
  {
    id: "battle-attack",
    frames: ["duel-ready-a", "duel-ready-b", "excited-a", "excited-b"],
    halfMs: 280,
    moods: ["attack", "attack2", "item_box"]
  },
  {
    id: "battle-hit",
    frames: ["annoyed-a", "annoyed-b", "stressed-a", "stressed-b"],
    halfMs: 220,
    moods: ["hit", "hit2"]
  },
  {
    id: "battle-defend",
    frames: ["guard-a", "guard-b", "alert-a"],
    halfMs: 320,
    moods: ["defend", "item_heal"]
  },
  {
    id: "battle-buff",
    frames: ["happy-a", "happy-b", "love-a", "love-b"],
    halfMs: 360,
    moods: ["item_buff", "item_heal"]
  },
  {
    id: "battle-win",
    frames: ["celebrate-a", "celebrate-b", "proud-stand-a", "proud-stand-b"],
    halfMs: 400,
    moods: ["win", "duel-win"]
  },
  {
    id: "battle-faint",
    frames: ["sad-a", "sad-b", "neglect-droop-a", "neglect-droop-b"],
    halfMs: 500,
    moods: ["faint", "duel-lose"]
  },
  {
    id: "battle-taunt",
    frames: ["duel-ready-a", "duel-ready-b", "guard-a"],
    halfMs: 300,
    moods: ["taunt"]
  },
  {
    id: "combo-fire",
    frames: ["combo-fire-a", "combo-fire-b", "combo-fire"],
    halfMs: 300,
    moods: ["combo-fire"]
  },
  {
    id: "cozy",
    frames: ["cozy-a", "cozy-b", "cozy"],
    halfMs: 1200,
    moods: ["cozy"]
  },
  {
    id: "cozy-blanket",
    frames: ["cozy-blanket-a", "cozy-blanket-b", "cozy-blanket"],
    halfMs: 1300,
    moods: ["cozy-blanket"]
  },
  {
    id: "shy-hide",
    frames: ["shy-hide-a", "shy-hide-b", "shy-hide"],
    halfMs: 900,
    moods: ["shy-hide"]
  },
  {
    id: "calm-deep",
    frames: ["calm-deep-a", "calm-deep-b", "calm-deep"],
    halfMs: 1400,
    moods: ["calm-deep"]
  },
  {
    id: "egg-rest",
    frames: ["egg-rest-a", "egg-rest-b", "egg-rest"],
    halfMs: 1200,
    moods: ["egg-rest"]
  },
  {
    id: "stressed",
    frames: ["stressed-a", "stressed-b", "stressed"],
    halfMs: 520,
    moods: ["stressed"]
  },
  {
    id: "rest-nap",
    frames: ["rest-a", "rest-b", "rest"],
    halfMs: 1100,
    moods: ["rest"]
  },
  {
    id: "yawn",
    frames: ["yawn-a", "yawn-b", "yawn"],
    halfMs: 900,
    moods: ["yawn"]
  },
  {
    id: "love-hug",
    frames: ["love-hug-a", "love-hug-b", "love-hug"],
    halfMs: 900,
    moods: ["love-hug"]
  },
  {
    id: "bond-warm",
    frames: ["bond-warm-a", "bond-warm-b", "bond-warm"],
    halfMs: 1000,
    moods: ["bond-warm"]
  },
  {
    id: "groove",
    frames: ["groove-a", "groove-b", "groove"],
    halfMs: 360,
    moods: ["groove"]
  },
  {
    id: "party",
    frames: ["party-a", "party-b", "party"],
    halfMs: 340,
    moods: ["party"]
  },
  {
    id: "snack",
    frames: ["snack-a", "snack-b", "snack"],
    halfMs: 460,
    moods: ["snack", "sip"]
  },
  {
    id: "alert",
    frames: ["alert-a", "alert-b", "alert"],
    halfMs: 480,
    moods: ["alert"]
  },
  {
    id: "proud-stand",
    frames: ["proud-stand-a", "proud-stand-b", "proud-stand"],
    halfMs: 900,
    moods: ["proud-stand"]
  },
  {
    id: "sit",
    frames: ["sit-a", "sit-b", "sit"],
    halfMs: 1300,
    moods: ["sit", "perch"]
  },
  {
    id: "play",
    frames: ["play-a", "play-b", "play"],
    halfMs: 420,
    moods: ["play", "bounce"]
  },
  {
    id: "munch",
    frames: ["munch-a", "munch-b", "munch", "snack"],
    halfMs: 440,
    moods: ["munch"]
  },
  {
    id: "stretch",
    frames: ["stretch-a", "stretch-b", "stretch"],
    halfMs: 1000,
    moods: ["stretch"]
  },
  {
    id: "guard",
    frames: ["guard-a", "guard-b", "guard"],
    halfMs: 750,
    moods: ["guard"]
  },
  {
    id: "love",
    frames: ["love-a", "love-b", "love-hug", "bond-warm"],
    halfMs: 900,
    moods: ["love"]
  },
  {
    id: "excited",
    frames: ["excited-a", "excited-b", "excited"],
    halfMs: 380,
    moods: ["excited", "flyby", "flyby-fast"]
  },
  {
    id: "warm",
    frames: ["warm-a", "warm-b", "warm"],
    halfMs: 1400,
    moods: ["warm"]
  },
  {
    id: "full",
    frames: ["full-a", "full-b", "full"],
    halfMs: 1500,
    moods: ["full"]
  },
  {
    id: "idle",
    frames: ["idle", "idle-f2", "lean-left", "lean-right"],
    halfMs: 1400,
    moods: ["idle", "perch", "story", "story-read"]
  },
  {
    id: "happy",
    frames: ["happy-a", "happy-b", "happy"],
    halfMs: 600,
    moods: ["happy", "play", "love"]
  },
  {
    id: "laugh",
    frames: ["laugh-a", "laugh-b", "laugh"],
    halfMs: 360,
    moods: ["laugh", "lol", "giggle"]
  },
  {
    id: "celebrate",
    frames: ["celebrate-a", "celebrate-b", "celebrate"],
    halfMs: 380,
    moods: ["celebrate", "cheer", "cheer-loud", "cheer-soft"]
  },
  {
    id: "hungry",
    frames: ["hungry-a", "hungry-b", "hungry", "alert"],
    halfMs: 760,
    moods: ["hungry"]
  },
  {
    id: "gift",
    frames: ["gift-a", "gift-b", "gift"],
    halfMs: 420,
    moods: ["gift", "gift-hold", "gift-open"]
  },
  {
    id: "duel",
    frames: ["duel-a", "duel-b", "duel"],
    halfMs: 360,
    moods: ["duel", "duel-win", "duel-lose", "chaos-spin"]
  },
  {
    id: "combo",
    frames: ["combo-a", "combo-b", "hype"],
    halfMs: 320,
    moods: ["combo", "hype"]
  },
  {
    id: "sad",
    frames: ["sad-a", "sad-b", "sad"],
    halfMs: 1300,
    moods: ["sad"]
  },
  {
    id: "sick",
    frames: ["sick-a", "sick-b", "sick"],
    halfMs: 900,
    moods: ["sick"]
  },
  {
    id: "annoyed",
    frames: ["annoyed-a", "annoyed-b", "annoyed"],
    halfMs: 700,
    moods: ["annoyed"]
  },
  {
    id: "watch",
    frames: ["watch-a", "watch-b", "watch"],
    halfMs: 480,
    moods: ["watch", "story-read", "flyby", "flyby-fast"]
  }
];

/** AI / ruční párové snímky — druhý snímek z referenčního PNG. */
const PAIRED_FRAME_SOURCES = {
  "hop-a": { ref: "excited", pose: "hop mid-air, both feet off ground, arms up" },
  "hop-b": { ref: "excited", pose: "landing from hop, knees bent, arms down for balance" },
  "dance-a": { ref: "dance", pose: "dancing left step, one foot lifted, arms out" },
  "dance-b": { ref: "dance", pose: "dancing right step, opposite foot lifted, arms swayed" },
  "wave-a": { ref: "wave", pose: "waving with right hand raised high, friendly smile" },
  "wave-b": { ref: "wave", pose: "waving with left hand raised, body leaning slightly" },
  "sit-a": { ref: "sit", pose: "sitting down on ground, knees bent, hands on knees, relaxed" },
  "sit-b": { ref: "sit", pose: "sitting idle, slight lean forward, comfortable pose" },
  "curl-a": { ref: "curl", pose: "curled up lying on side by bowl, eyes closed, cozy" },
  "curl-b": { ref: "curl", pose: "curled ball shape resting, tail tucked, sleeping peacefully" },
  "play-a": { ref: "play", pose: "reaching down to play with ball, one paw forward, happy" },
  "play-b": { ref: "play", pose: "both paws on imaginary ball, playful bounce pose" },
  "munch-a": { ref: "munch", pose: "eating from bowl, mouth open chewing, leaning to bowl" },
  "munch-b": { ref: "munch", pose: "chewing with cheeks full, eyes happy, at bowl" },
  "stretch-a": { ref: "stretch", pose: "stretching arms up high, standing on tiptoes, yawn stretch" },
  "stretch-b": { ref: "stretch", pose: "stretching to side, one arm up, satisfied after meal" },
  "guard-a": { ref: "guard", pose: "standing guard by bowl, alert eyes, protective stance" },
  "guard-b": { ref: "guard", pose: "watching bowl intently, slight crouch, guarding food" },
  "love-a": { ref: "love", pose: "hugging self with both arms, heart eyes, warm smile" },
  "love-b": { ref: "love", pose: "arms open for hug, loving expression, leaning forward" },
  "excited-a": { ref: "excited", pose: "jumping with joy, both feet off ground, arms up" },
  "excited-b": { ref: "excited", pose: "landing from excited jump, big grin, energetic" },
  "sad-a": { ref: "sad", pose: "shoulders drooped, head down, watery downcast eyes, small frown" },
  "sad-b": { ref: "sad", pose: "wiping one eye with paw, slumped to side, single tear" },
  "sleepy-a": { ref: "sleepy", pose: "eyes half-closed drowsy, one paw rubbing eye, slight slump" },
  "sleepy-b": { ref: "sleepy", pose: "big wide yawn, arms stretching up tired, eyes shut" },
  "hungry-a": { ref: "hungry", pose: "one paw on belly, mouth open, pleading hungry eyes, leaning forward" },
  "hungry-b": { ref: "hungry", pose: "both paws rubbing belly, drooling, eager hungry look" },
  "warm-a": { ref: "warm", pose: "gentle smile, one paw raised in small friendly wave" },
  "warm-b": { ref: "warm", pose: "head tilted, paws clasped near chest, content cozy smile" },
  "full-a": { ref: "full", pose: "both paws on rounder full belly, satisfied sleepy smile" },
  "full-b": { ref: "full", pose: "leaning back, patting belly, eyes closed satisfied" },
  "annoyed-a": { ref: "annoyed", pose: "arms crossed, eyebrows furrowed, grumpy pout, head turned away" },
  "annoyed-b": { ref: "annoyed", pose: "one paw on hip, gesturing frustration, narrowed eyes" },
  "laugh-a": { ref: "laugh", pose: "head tilted back, mouth wide laughing, paw on belly" },
  "laugh-b": { ref: "laugh", pose: "leaning forward slapping knee, big open laugh, body shaking" },
  "celebrate-a": { ref: "celebrate", pose: "both arms raised high in victory, big joyful grin, jumping on toes" },
  "celebrate-b": { ref: "celebrate", pose: "one fist pumped up, proud victorious smile, winner stance" },
  "gift-a": { ref: "gift", pose: "both paws open raised happily, eyes sparkling, catching gift" },
  "gift-b": { ref: "gift", pose: "holding imaginary gift at chest, grateful thankful smile" },
  "duel-a": { ref: "duel", pose: "fighting stance, fists raised, determined fierce eyes, slight crouch" },
  "duel-b": { ref: "duel-win", pose: "one fist pumped high, triumphant grin, winner stance" },
  "combo-a": { ref: "combo", pose: "both arms pumping, mouth open cheering, hype bounce" },
  "combo-b": { ref: "combo-fire", pose: "arms spread wide, head back laughing, maximum hype" },
  "watch-a": { ref: "watch", pose: "leaning forward attentively, eyes wide focused, paws clasped" },
  "watch-b": { ref: "surprised", pose: "eyes huge, mouth open wow, both paws on cheeks, shocked" },
  "sick-a": { ref: "sick", pose: "paw on forehead, droopy eyes, unwell slump" },
  "sick-b": { ref: "heal-glow", pose: "eyes closed peacefully, paws at chest, recovering calm smile" },
  "happy-a": { ref: "happy", pose: "bright cheerful smile, arms slightly raised and open, light bounce on toes" },
  "happy-b": { ref: "happy", pose: "one paw cheerful wave near head, other on hip, big grin closed eyes" },
  "dance-c": { ref: "dance", pose: "dancing spin step, body twisted mid-turn, arms swung to one side, one foot lifted" },
  "thinking-a": { ref: "thinking", pose: "one paw raised to chin, eyes looking up pondering, small thoughtful hmm" },
  "thinking-b": { ref: "thinking", pose: "aha moment, one claw raised high, eyes wide, big idea smile" },
  "proud-a": { ref: "proud", pose: "chest puffed, both paws on hips, chin up, beaming proud closed-eyes smile" },
  "proud-b": { ref: "proud", pose: "confident thumbs-up, other paw on hip, self-satisfied grin, one eye winking" },
  "curious-a": { ref: "curious", pose: "head tilted, one paw near chin, wide inquisitive eyes, wondering hmm" },
  "curious-b": { ref: "curious", pose: "leaning forward eagerly, paws clasped, huge sparkling wonder eyes" },
  "shy-a": { ref: "shy", pose: "paws partially covering face, pink blush, eyes looking away embarrassed" },
  "shy-b": { ref: "shy", pose: "one paw covering half face peeking with one eye, bashful blush smile" },
  "peek-a": { ref: "peek", pose: "peeking from side, one paw and head visible, sneaky curious smile" },
  "peek-b": { ref: "peek", pose: "stepped out peeking around corner, mischievous grin, sparkling eyes" },
  "wink-a": { ref: "wink", pose: "one eye winking, other open, paw raised in small wave, friendly smile" },
  "wink-b": { ref: "wink", pose: "both eyes in happy wink arcs, paws clasped, adorable flirty smile" },
  "calm-a": { ref: "calm", pose: "eyes gently closed serene smile, paws at sides, peaceful still pose" },
  "calm-b": { ref: "calm", pose: "relaxed squat, paws on knees, half-closed eyes meditating peacefully" },
  "comfort-a": { ref: "comfort", pose: "paws open in gentle hug gesture, warm caring eyes, reassuring smile" },
  "comfort-b": { ref: "comfort", pose: "one paw on heart, other extended offering support, empathetic smile" },
  "surprised-a": { ref: "surprised", pose: "eyes huge, mouth O shape, paws raised near cheeks shocked" },
  "surprised-b": { ref: "surprised", pose: "jumping back, arms spread, enormous eyes, gasping startled" },
  "react-gift-a": { ref: "react-gift", pose: "paws raised catching gift, sparkling joyful eyes, grateful excitement" },
  "react-gift-b": { ref: "react-gift", pose: "holding gift at chest, eyes closed grateful bliss, thankful smile" },
  "react-video-a": { ref: "react-video", pose: "leaning forward watching, eyes wide focused, absorbed attentive" },
  "react-video-b": { ref: "react-video", pose: "leaning back wow, paws near mouth, enormous impressed eyes" },
  "thanks-bow-a": { ref: "thanks-bow", pose: "polite bow forward, paws together, respectful grateful smile" },
  "thanks-bow-b": { ref: "thanks-bow", pose: "deep grateful bow, head lowered, humble thank you pose" },
  "hatch-wiggle-a": { ref: "hatch-wiggle", pose: "wiggling in cracked eggshell, determined cute hatch face" },
  "hatch-wiggle-b": { ref: "hatch-wiggle", pose: "just hatched, shell pieces at feet, arms raised celebrating" },
  "neglect-droop-a": { ref: "neglect-droop", pose: "slumped lonely, head low, empty sad eyes, dejected droop" },
  "neglect-droop-b": { ref: "neglect-droop", pose: "curled inward hugging self, looking at ground, deeply neglected" },
  "party-pop-a": { ref: "celebrate", pose: "both arms up celebrating, big open grin, festive jump on toes" },
  "party-pop-b": { ref: "celebrate", pose: "party dance spin, one arm up one out, one foot lifted, joyful" },
  "hype-jump-a": { ref: "excited", pose: "crouch ready to leap, arms back, eager friendly coiled energy" },
  "hype-jump-b": { ref: "excited", pose: "peak of jump airborne, arms raised triumphant, cheering" },
  "heal-glow-a": { ref: "heal-glow", pose: "eyes closed, paws together at chest, serene healing gesture, glow" },
  "heal-glow-b": { ref: "heal-glow", pose: "arms opening restored, bright refreshed eyes, healthy smile" },
  "react-chat-a": { ref: "react-chat", pose: "one paw chat wave, other gesturing talking, engaged friendly smile" },
  "react-chat-b": { ref: "react-chat", pose: "leaning forward, both paws gesturing enthusiastically, lively chat" },
  "duel-ready-a": { ref: "duel-ready", pose: "fists raised fighting stance, determined friendly duel ready" },
  "duel-ready-b": { ref: "duel-ready", pose: "lunging forward fist pumped, battle cry team duel charge" },
  "combo-fire-a": { ref: "combo-fire", pose: "arms pumping rapidly, mouth cheering, building combo hype" },
  "combo-fire-b": { ref: "combo-fire", pose: "arms spread wide head back, peak combo celebration laugh" },
  "cozy-a": { ref: "cozy", pose: "sitting comfortably paws on knees, half-closed eyes content cozy smile" },
  "cozy-b": { ref: "cozy", pose: "hugging self eyes closed, gentle blissful snuggled cozy pose" },
  "yawn-a": { ref: "yawn", pose: "paw covering mouth starting yawn, eyes squeezing shut tired" },
  "yawn-b": { ref: "yawn", pose: "wide open yawn arms stretching up, eyes closed big tired stretch" },
  "love-hug-a": { ref: "love", pose: "both arms wrapped around self in cozy self-hug, eyes closed happily" },
  "love-hug-b": { ref: "love", pose: "both arms wide open inviting a hug, warm loving smile, leaning forward" },
  "bond-warm-a": { ref: "warm", pose: "one paw on heart, other paw raised in gentle greeting, warm caring eyes" },
  "bond-warm-b": { ref: "warm", pose: "head tilted, paws clasped near chest, eyes closed content bonding smile" },
  "groove-a": { ref: "dance", pose: "swaying left, arms grooving to one side, hips swayed, enjoying music" },
  "groove-b": { ref: "dance", pose: "swaying right, arms grooving opposite side, joyful music groove" },
  "party-a": { ref: "celebrate", pose: "both arms up waving festively, big party grin, one foot tapping" },
  "party-b": { ref: "celebrate", pose: "spinning mid-twirl, arms out wide, joyful festive face, one foot lifted" },
  "snack-a": { ref: "munch", pose: "holding small snack to mouth with one paw, cheek puffed chewing" },
  "snack-b": { ref: "munch", pose: "both paws near mouth, cheeks full chewing happily, eyes closed" },
  "sip-a": { ref: "munch", pose: "holding cup to mouth with both paws, eyes content sipping" },
  "sip-b": { ref: "munch", pose: "one paw wiping mouth, refreshed content smile after a drink" },
  "alert-a": { ref: "guard", pose: "body upright tense, tuft perked, eyes wide watchful, one paw raised alert" },
  "alert-b": { ref: "guard", pose: "head turned sharply to side, body alert ready, eyes focused wide" },
  "proud-stand-a": { ref: "proud", pose: "standing very tall upright, chest out, paws at sides, chin up proud" },
  "proud-stand-b": { ref: "proud", pose: "standing tall, one paw in proud salute to forehead, confident smile" },
  "cozy-blanket-a": { ref: "cozy", pose: "snuggled in soft blanket, face peeking out, eyes half-closed blissful" },
  "cozy-blanket-b": { ref: "cozy", pose: "blanket pulled up to chin with both paws, only eyes and tuft visible" },
  "shy-hide-a": { ref: "shy", pose: "both paws covering face shyly, peeking through fingers with one eye" },
  "shy-hide-b": { ref: "shy", pose: "crouched, both paws over eyes hiding face, timid embarrassed smile" },
  "calm-deep-a": { ref: "calm", pose: "eyes closed peacefully, paws on knees, serene deep calm zen pose" },
  "calm-deep-b": { ref: "calm", pose: "eyes gently closed, one paw on belly breathing deeply, tranquil calm" },
  "egg-rest-a": { ref: "hatch-wiggle", pose: "resting inside cracked eggshell, eyes half-closed sleepy content" },
  "egg-rest-b": { ref: "hatch-wiggle", pose: "head on edge of cracked eggshell, body nestled in egg, drowsy peek" },
  "stressed-a": { ref: "annoyed", pose: "both paws on head, worried wide eyes, tense hunched stressed shoulders" },
  "stressed-b": { ref: "annoyed", pose: "one paw on forehead, other clenched, eyes squeezed shut anxious" },
  "rest-a": { ref: "curl", pose: "lying on side curled slightly, eyes closed sleeping, paws tucked peaceful nap" },
  "rest-b": { ref: "curl", pose: "sitting eyes closed nodding off, paws in lap, gentle rest doze slump" }
};

function resolvePoseCycle(ctx = {}) {
  const key = String(ctx.assetKey || ctx.displayMood || "idle").toLowerCase();
  const walkCycle = () => POSE_CYCLES.find((c) => c.id === "walk") || null;

  for (const cycle of POSE_CYCLES) {
    if (cycle.id === "walk") continue;
    if (Array.isArray(cycle.moods) && cycle.moods.includes(key)) {
      if (ctx.wandering && WANDER_WALK_FRAME_MOODS.has(key)) return walkCycle();
      return cycle;
    }
    if (Array.isArray(cycle.prefixes) && cycle.prefixes.some((p) => key.startsWith(p))) {
      return cycle;
    }
  }

  if (ctx.wandering && WANDER_WALK_FRAME_MOODS.has(key)) return walkCycle();

  if (MOOD_F2_SPECS[key]) {
    return { id: `${key}-pair`, frames: [key, `${key}-f2`], halfMs: 900 };
  }
  if (DERIVED_F2_SPECS[key]) {
    return { id: `${key}-pair`, frames: [key, `${key}-f2`], halfMs: 850 };
  }

  return null;
}

module.exports = {
  MOOD_F2_SPECS,
  DERIVED_F2_SPECS,
  WANDER_WALK_MOODS,
  CALM_WANDER_MOODS,
  WANDER_WALK_FRAME_MOODS,
  POSE_CYCLES,
  PAIRED_FRAME_SOURCES,
  resolvePoseCycle
};
