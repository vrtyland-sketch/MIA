"use strict";

const { MASTER_MOODS, DERIVED_MOOD_KEYS } = require("./KOJNOZROUT_MOOD_DERIVE");

const MOOD_EMOJI = {
  idle: "🐣",
  warm: "😊",
  happy: "😄",
  hungry: "🍽️",
  excited: "🤩",
  eating: "😋",
  full: "🫃",
  sleepy: "😴",
  sick: "🤢",
  sad: "😢",
  annoyed: "😤",
  laugh: "😂",
  stressed: "😰",
  watch: "👀",
  groove: "🕺",
  dance: "💃",
  party: "🥳",
  curious: "🧐",
  love: "💚",
  celebrate: "🎉",
  cheer: "📣",
  hype: "🔥",
  wave: "👋",
  proud: "🏆",
  shy: "😳",
  surprised: "😲",
  thinking: "🤔",
  calm: "😌",
  cozy: "☕",
  gift: "🎁",
  thanks: "🙏",
  combo: "⚡",
  duel: "⚔️",
  story: "📖",
  flyby: "🚀",
  feeding: "🍽️",
  perch: "🪺",
  hop: "🐸",
  sit: "🪑",
  curl: "🛌",
  stretch: "🙆",
  yawn: "🥱",
  peek: "👁️",
  wink: "😉",
  "lean-left": "↖️",
  "lean-right": "↗️",
  bounce: "⬆️",
  munch: "🍿",
  sip: "🥤",
  "cheer-loud": "📢",
  "cheer-soft": "💛",
  "gift-open": "🎀",
  "gift-hold": "🎁",
  "thanks-bow": "🙇",
  "wave-left": "👋",
  "wave-right": "🤚",
  "hype-jump": "🚀",
  "party-pop": "🎊",
  "duel-ready": "⚔️",
  "duel-win": "🏅",
  "duel-lose": "😵",
  "combo-fire": "🔥",
  "story-read": "📚",
  "flyby-fast": "💨",
  "calm-deep": "🧘",
  "cozy-blanket": "🛋️",
  "proud-stand": "🦁",
  "shy-hide": "🫣",
  "surprised-pop": "😱",
  "thinking-hmm": "💭",
  "love-hug": "🤗",
  "chaos-spin": "🌪️",
  "neglect-droop": "💧",
  "bond-warm": "💞",
  "quest-focus": "🎯",
  "react-chat": "💬",
  "react-gift": "🎁",
  "react-video": "📺",
  "egg-rest": "🥚",
  "hatch-wiggle": "🐣",
  guard: "🛡️",
  "heal-glow": "✨",
  comfort: "🫂",
  play: "🎮",
  rest: "💤",
  alert: "❗",
  snack: "🍪",
  "eating-01": "😋",
  "eating-02": "🍴",
  "eating-03": "🤤",
  "eating-04": "🫃",
  "eating-05": "☕",
  "eating-06": "😂",
  "eating-07": "🍽️",
  "eating-08": "🐣",
  "eating-09": "😋",
  "eating-10": "🤩",
  "eating-11": "😄",
  "eating-12": "🫃",
  "eating-13": "🥄",
  "eating-14": "🍵",
  "eating-15": "😆",
  "eating-16": "🍖"
};

const FAMILY_EMOJI = [
  [/^eating-\d{2}$/, "😋"],
  [/^combo/, "⚡"],
  [/^duel/, "⚔️"],
  [/^cheer/, "📣"],
  [/^gift/, "🎁"],
  [/^thanks/, "🙏"],
  [/^wave/, "👋"],
  [/^party/, "🥳"],
  [/^celebrate/, "🎉"],
  [/^proud/, "🏆"],
  [/^calm/, "😌"],
  [/^cozy/, "☕"],
  [/^story/, "📖"],
  [/^flyby/, "🚀"],
  [/^hype/, "🔥"],
  [/^react-/, "💬"],
  [/^egg-/, "🥚"],
  [/^hatch/, "🐣"],
  [/^heal/, "✨"],
  [/^neglect/, "💧"]
];

function safeKey(value, fallback = "idle") {
  const key = String(value || "").trim().toLowerCase();
  return key || fallback;
}

function resolveMoodEmoji(moodOrAsset, fallback = "🐣") {
  const key = safeKey(moodOrAsset);
  if (MOOD_EMOJI[key]) return MOOD_EMOJI[key];

  for (const [pattern, emoji] of FAMILY_EMOJI) {
    if (pattern.test(key)) return emoji;
  }

  const dashBase = key.split("-")[0];
  if (MOOD_EMOJI[dashBase]) return MOOD_EMOJI[dashBase];

  if (MASTER_MOODS.includes(key)) return MOOD_EMOJI[key] || fallback;
  if (DERIVED_MOOD_KEYS.includes(key)) return fallback;

  return fallback;
}

function buildBrowserMoodEmojiScript() {
  return `/* auto: scripts/MIA_KOJNOZROUT_MOOD_EMOJI.js */
window.KOJ_MOOD_EMOJI=${JSON.stringify(MOOD_EMOJI)};
window.resolveKojMoodEmoji=function(key,fb){key=String(key||"").toLowerCase();if(window.KOJ_MOOD_EMOJI[key])return window.KOJ_MOOD_EMOJI[key];if(/^eating-\\d{2}$/.test(key))return"😋";if(key.startsWith("combo"))return"⚡";if(key.startsWith("duel"))return"⚔️";if(key.startsWith("cheer"))return"📣";if(key.startsWith("gift")||key==="react-gift")return"🎁";if(key.startsWith("thanks"))return"🙏";if(key.startsWith("wave"))return"👋";if(key.startsWith("party")||key.startsWith("celebrate"))return"🎉";if(key.startsWith("hype"))return"🔥";if(key.startsWith("flyby"))return"🚀";if(key.startsWith("egg"))return"🥚";if(key.startsWith("react-"))return"💬";var b=key.split("-")[0];return window.KOJ_MOOD_EMOJI[b]||(fb||"🐣");};
`;
}

module.exports = {
  MOOD_EMOJI,
  resolveMoodEmoji,
  buildBrowserMoodEmojiScript
};
