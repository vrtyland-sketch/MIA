"use strict";

/**
 * Roster Kojnožroutů — od slova coiny / peníze (žrout), NE hrášek, NE roztomilé postavičky.
 *
 * Každá platforma = vlastní žrout s logikou: boj · hravost · láska · itemy · chat.
 * Speciální funkce: dárek interně zvyšuje šanci na odměnu (veřejně nikdy „zaplaceno“).
 *
 * YouTube / Kisstube: motiv Radio Kiss jen na YT (Patrik = Koj, Barbora = MIA).
 */

const ROSTER = {
  tiktok: {
    id: "tiktok",
    name: "Tokžrout",
    title: "Žrout clipů a coinů",
    species: "coin_eater",
    animal: "neonový trojoký mimozemšťan — cyan/pink skvrny, rohy, TikTok note coin",
    formDir: "/assets/kojnozrout/forms/tiktok",
    styleRef: "tok_neon",
    accent: "#00f2ea",
    accent2: "#ff0050",
    temperament: ["boj", "hravost", "chaos"],
    voiceHint: "rychlý, drzý, neon",
    focus: "Viral coin-bite — žere dárky jako clipy, tlačí tempo chatu.",
    chatHooks: [
      "tok boj",
      "tok výzva",
      "clip žrát",
      "tok love",
      "tok item"
    ],
    functions: {
      combat: "Výzva / mini-duel v chatu, drzá reakce",
      play: "Rychlé hry (hádej, ano/ne, tempo)",
      love: "Krátký love-bite pro diváka",
      items: "Snack / boost / útok do batohu",
      special: "Clip moment — vyšší šance po dárku"
    },
    giftBias: ["utok", "boost", "spark", "snack", "energie"],
    previewPng: "/assets/kojnozrout/roster/tokzrout-preview.png"
  },
  kick: {
    id: "kick",
    name: "Stackžrout",
    title: "Žrout stacků",
    species: "coin_eater",
    animal: "acid zelený stackovaný trojoký — svislé oči, černé stack pláty",
    formDir: "/assets/kojnozrout/forms/kick",
    styleRef: "stack_acid",
    accent: "#53fc18",
    accent2: "#0b0b0b",
    temperament: ["boj", "tlak", "hravost"],
    voiceHint: "tvrdší, acid, přímý",
    focus: "Stackuje sílu z dárků — aréna a duel first.",
    chatHooks: [
      "stack boj",
      "stack duel",
      "stack push",
      "kick love",
      "stack item"
    ],
    functions: {
      combat: "Tlak na soupeře, power bar arény",
      play: "Stack challenge (kolik dárek = vyšší stack)",
      love: "Respekt-love (ne roztomilost)",
      items: "Posílení / koruna / prapor",
      special: "Stack burst — šance na dvojitou odměnu po dárku"
    },
    giftBias: ["box", "posileni", "koruna", "prapor", "utok", "feast"],
    previewPng: "/assets/kojnozrout/roster/stackzrout-preview.png"
  },
  twitch: {
    id: "twitch",
    name: "Bitsžrout",
    title: "Žrout bitů a vazby",
    species: "coin_eater",
    animal: "fialový bond strážce — křídla, srdce, bit gem",
    formDir: "/assets/kojnozrout/forms/twitch",
    styleRef: "bits_purple",
    accent: "#9146ff",
    accent2: "#efeff1",
    temperament: ["láska", "komunita", "hravost"],
    voiceHint: "hlubší, loajální, purple",
    focus: "Žere coiny jako bits — buduje bond a péči, ne roztomilost.",
    chatHooks: [
      "bits love",
      "bits bond",
      "bits péče",
      "bits boj",
      "bits item"
    ],
    functions: {
      combat: "Obranný boj (štít / balzám)",
      play: "Bond hry, raid-style chat vlny",
      love: "Silnější love/bond linky",
      items: "Lektvar / obvaz / talisman / hvězda",
      special: "Bond pulse — šance na péči/item po dárku"
    },
    giftBias: ["lektvar", "obvaz", "talisman", "hvezda", "shield"],
    previewPng: "/assets/kojnozrout/roster/bitszrout-preview.png"
  },
  youtube: {
    id: "youtube",
    name: "Kisstube",
    title: "Žrout éteru a coinů",
    species: "coin_eater",
    animal: "kiss radio pink — anténa srdce, éter hvězda",
    formDir: "/assets/kojnozrout/forms/youtube",
    styleRef: "kiss_radio",
    accent: "#e6007e",
    accent2: "#ff8dc7",
    temperament: ["láska", "éter", "hravost"],
    voiceHint: "radio, vřelý, diskrétní pocta",
    focus:
      "POUZE YouTube: motiv Radio Kiss. Koj = Patrik Hezucký, MIA = Barbora Tlučhořová. Pořád coin-žrout, ne hrášek.",
    memorial: {
      koj: "Patrik Hezucký",
      mia: "Barbora Tlučhořová",
      station: "Radio Kiss"
    },
    chatHooks: [
      "kiss love",
      "éter",
      "kisstube item",
      "kiss boj",
      "kiss péče"
    ],
    functions: {
      combat: "Jemný tlak / aréna YT",
      play: "Radio-style hry (naladění, pusinka do éteru)",
      love: "Vřelost bez patosu",
      items: "Hvězda / talisman / koláč",
      special: "Éter drop — šance na odměnu po dárku (jen YT)"
    },
    giftBias: ["hvezda", "talisman", "kolac", "cheer", "balzam"],
    previewPng: "/assets/kojnozrout/kisstube/koj-kisstube-preview.png"
  }
};

/** Interaktivní chat funkce — dárek zvyšuje šanci (interně weight, veřejně „odměna“). */
const CHAT_REWARDS = {
  combat_bite: {
    id: "combat_bite",
    label: "Bojový kousanec",
    domain: "combat",
    baseChance: 0.08,
    publicHint: "Dárek zvyšuje šanci na bojovou odměnu."
  },
  play_spark: {
    id: "play_spark",
    label: "Hravý jiskřič",
    domain: "play",
    baseChance: 0.1,
    publicHint: "Dárek zvyšuje šanci na herní odměnu."
  },
  love_pulse: {
    id: "love_pulse",
    label: "Love pulse",
    domain: "love",
    baseChance: 0.09,
    publicHint: "Dárek zvyšuje šanci na love odměnu."
  },
  item_drop: {
    id: "item_drop",
    label: "Item do batohu",
    domain: "items",
    baseChance: 0.12,
    publicHint: "Dárek zvyšuje šanci na item."
  },
  arena_boost: {
    id: "arena_boost",
    label: "Boost arény",
    domain: "arena",
    baseChance: 0.07,
    publicHint: "Dárek zvyšuje šanci na boost týmu platformy."
  },
  special_lane: {
    id: "special_lane",
    label: "Speciál platformy",
    domain: "special",
    baseChance: 0.05,
    publicHint: "Dárek zvyšuje šanci na speciální odměnu."
  }
};

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function getKojProfile(platform = "tiktok") {
  const key = safeString(platform, "tiktok").toLowerCase();
  return ROSTER[key] || ROSTER.tiktok;
}

const FORM_MOOD_FILES = new Set([
  "idle",
  "happy",
  "warm",
  "love",
  "excited",
  "laugh",
  "hungry",
  "full",
  "sleepy",
  "sick",
  "sad",
  "annoyed",
  "stressed",
  "curious",
  "proud",
  "attack",
  "attack2",
  "hit",
  "hit2",
  "win",
  "faint",
  "defend",
  "item_box",
  "item_heal",
  "item_buff",
  "hop",
  "wave",
  "lean_left",
  "lean_right",
  "taunt"
]);

/** Platformní forma: forms/{platform}/{mood}.png, fallback idle. */
function resolveFormSprite(platform = "tiktok", mood = "idle") {
  const profile = getKojProfile(platform);
  const dir = safeString(profile.formDir, `/assets/kojnozrout/forms/${profile.id}`);
  const key = safeString(mood, "idle").toLowerCase();
  const file = FORM_MOOD_FILES.has(key) ? key : "idle";
  return `${dir}/${file}.png`;
}

function listRoster() {
  return Object.values(ROSTER).map((row) => ({
    id: row.id,
    name: row.name,
    title: row.title,
    species: row.species,
    animal: row.animal || null,
    formDir: row.formDir || null,
    temperament: row.temperament,
    focus: row.focus,
    functions: row.functions,
    chatHooks: row.chatHooks,
    memorial: row.memorial || null,
    previewPng: row.previewPng || null,
    battleSpriteUrl:
      row.battleSpriteUrl ||
      row.previewPng ||
      `/assets/kojnozrout/battle/${row.id}-battle.png`,
    accent: row.accent || null,
    moods: [...FORM_MOOD_FILES]
  }));
}

/**
 * Šance na odměnu: base + gift weight.
 * Veřejně nikdy neříkat „zaplaceno“ — jen že dárek zvyšuje šanci.
 */
function resolveRewardChance({
  rewardId = "item_drop",
  miaPoints = 0,
  eventType = "COMMENT",
  recentGifts = 0
} = {}) {
  const reward = CHAT_REWARDS[rewardId] || CHAT_REWARDS.item_drop;
  let chance = reward.baseChance;
  const type = safeString(eventType).toUpperCase();
  const points = Math.max(0, toNumber(miaPoints, 0));
  const gifts = Math.max(0, toNumber(recentGifts, 0));

  if (type === "GIFT") {
    // Interní váha dárku — čím víc MIA bodů, tím vyšší šance (cap).
    chance += Math.min(0.45, points / 400);
    chance += Math.min(0.15, gifts * 0.03);
  } else if (type === "LIKE") {
    chance *= 0.35;
  } else if (type === "COMMENT") {
    chance *= 0.55;
  } else if (type === "FOLLOW" || type === "SHARE") {
    chance *= 0.7;
  }

  return {
    rewardId: reward.id,
    label: reward.label,
    domain: reward.domain,
    chance: Math.max(0.01, Math.min(0.85, chance)),
    publicHint: reward.publicHint
  };
}

function rollReward(options = {}) {
  const plan = resolveRewardChance(options);
  const hit = Math.random() < plan.chance;
  return {
    ...plan,
    hit,
    // Interní flag — nikdy neposílat do overlay textu.
    _internalGiftWeight: safeString(options.eventType).toUpperCase() === "GIFT"
  };
}

function pickBiasedItemId(platform = "tiktok") {
  const profile = getKojProfile(platform);
  const bias = profile.giftBias || ["snack"];
  return bias[Math.floor(Math.random() * bias.length)] || "snack";
}

function matchChatHook(message = "", platform = "tiktok") {
  const text = safeString(message).toLowerCase();
  if (!text) return null;
  const profile = getKojProfile(platform);
  for (const hook of profile.chatHooks || []) {
    const parts = hook.split(/\s+/);
    if (parts.every((p) => text.includes(p))) {
      return hook;
    }
  }
  // generické háčky
  if (/\b(boj|duel|výzva|vyzva|fight)\b/i.test(text)) return "combat";
  if (/\b(love|láska|laska|pusinka|bond)\b/i.test(text)) return "love";
  if (/\b(item|batoh|odměna|odmena|reward)\b/i.test(text)) return "items";
  if (/\b(hra|play|game|hádej|hadej)\b/i.test(text)) return "play";
  return null;
}

function resolveHookDomain(hook = "") {
  const h = safeString(hook).toLowerCase();
  if (!h) return "play";
  if (h === "combat" || h.includes("boj") || h.includes("duel") || h.includes("fight")) {
    return "combat_bite";
  }
  if (h === "love" || h.includes("love") || h.includes("bond") || h.includes("pusinka")) {
    return "love_pulse";
  }
  if (h === "items" || h.includes("item") || h.includes("batoh") || h.includes("odměna")) {
    return "item_drop";
  }
  if (h.includes("stack") || h.includes("push") || h.includes("arena")) {
    return "arena_boost";
  }
  if (h.includes("éter") || h.includes("kiss") || h.includes("clip") || h.includes("special")) {
    return "special_lane";
  }
  return "play_spark";
}

module.exports = {
  ROSTER,
  CHAT_REWARDS,
  FORM_MOOD_FILES,
  getKojProfile,
  resolveFormSprite,
  listRoster,
  resolveRewardChance,
  rollReward,
  pickBiasedItemId,
  matchChatHook,
  resolveHookDomain
};
