"use strict";

/**
 * MIA_GIFT_MAP.js
 *
 * Legacy metadata vrstva giftů (effectProgram, visualFamily, moodHint).
 *
 * **Enterprise Gift mapa (zdroj pravdy pro sémantiku dárku):**
 *   shared/gifts/  — resolver.js + gift_map/*.json + runtime.js
 *
 * Plná specifikace: docs/MIA_GIFT_ECONOMY.md
 *
 * Tento modul dnes:
 * - NEMĚNÍ ekonomiku ani tier (→ MIA_SUPPORT_RESOLVER + shared/gifts)
 * - NEMĚNÍ video queue (→ MIA_VIDEO_ENGINE, řízeno tierem z gift mapy)
 * - vrací giftProfile pro animační program Kojnožrout / MIA
 */

const GIFT_MAP_VERSION = "1.0.0";
const giftTiers = require("./MIA_GIFT_TIERS");

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeText(value) {
  return safeString(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function normalizePlatform(value, fallback = "unknown") {
  const platform = safeString(value, fallback).toLowerCase();
  if (platform === "tiktok" || platform === "kick") {
    return platform;
  }
  return fallback;
}

function normalizeCoinsBucket(totalCoins) {
  return giftTiers.resolveCoinValueBucket(totalCoins);
}

const COIN_TIER_AUTO = {
  mid: {
    key: "coin_mid",
    label: "Mid Support Gift",
    visualFamily: "generic",
    effectProgram: "warm_support",
    animationOwner: "both",
    moodHint: "warm",
    mappingConfidence: 0.62
  },
  big: {
    key: "coin_big",
    label: "Big Support Gift",
    visualFamily: "celebration",
    effectProgram: "cinematic_support",
    animationOwner: "both",
    moodHint: "happy",
    mappingConfidence: 0.72
  },
  epic: {
    key: "coin_epic",
    label: "Epic Support Gift",
    visualFamily: "celebration",
    effectProgram: "cinematic_support",
    animationOwner: "both",
    moodHint: "epic",
    mappingConfidence: 0.8
  },
  legendary: {
    key: "coin_legendary",
    label: "Legendary Support Gift",
    visualFamily: "celebration",
    effectProgram: "legend_burst",
    animationOwner: "both",
    moodHint: "epic",
    mappingConfidence: 0.85
  }
};

function resolveMappingSource(entry, input = {}) {
  if (!entry) {
    return "unknown";
  }

  const normalizedId = normalizeText(input.giftId);
  const normalizedName = normalizeText(input.giftName);

  if (entry.exactIds.some((id) => normalizeText(id) === normalizedId && normalizedId)) {
    return "exact_id";
  }

  if (entry.exactNames.some((name) => normalizeText(name) === normalizedName && normalizedName)) {
    return "exact_name";
  }

  return "alias";
}

function uniqueStrings(values = []) {
  const seen = new Set();
  const out = [];

  for (const value of values) {
    const safe = safeString(value).trim();
    if (!safe) continue;

    const key = safe.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    out.push(safe);
  }

  return out;
}

function buildGiftEntry(input = {}) {
  return {
    key: safeString(input.key, "unknown_gift"),
    label: safeString(input.label, "Unknown Gift"),
    aliases: uniqueStrings(input.aliases || []),
    exactNames: uniqueStrings(input.exactNames || []),
    exactIds: uniqueStrings(input.exactIds || []),
    minCoins: Math.max(0, toNumber(input.minCoins, 0)),
    maxCoins:
      input.maxCoins === undefined || input.maxCoins === null
        ? null
        : Math.max(0, toNumber(input.maxCoins, 0)),
    animationOwner: safeString(input.animationOwner, "both"), // mia | kojnozout | both
    visualFamily: safeString(input.visualFamily, "generic"),
    effectProgram: safeString(input.effectProgram, "generic_support"),
    moodHint: safeString(input.moodHint, "warm"),
    recommendedSceneModes: uniqueStrings(input.recommendedSceneModes || ["MAIN"]),
    tags: uniqueStrings(input.tags || [])
  };
}

const GIFT_ENTRIES = [
  buildGiftEntry({
    key: "rose",
    label: "Rose",
    exactNames: ["Rose", "Růže", "Bílá růže"],
    visualFamily: "flowers",
    effectProgram: "flower_support",
    animationOwner: "mia",
    moodHint: "warm",
    recommendedSceneModes: ["MAIN", "AFK"],
    tags: ["romance", "gift", "support", "flower"]
  }),

  buildGiftEntry({
    key: "flowers_bouquet",
    label: "Flowers Bouquet",
    exactNames: ["S Květiny", "Výstava květin", "XXXL Květiny", "Ranní květ", "Kytice"],
    aliases: ["kytiny", "kvetiny", "bouquet", "flowers"],
    visualFamily: "flowers",
    effectProgram: "flower_burst",
    animationOwner: "mia",
    moodHint: "warm",
    recommendedSceneModes: ["MAIN", "AFK", "COMMUNITY"],
    tags: ["romance", "flower", "premium", "support"]
  }),

  buildGiftEntry({
    key: "heart_small",
    label: "Heart Small",
    exactNames: [
      "Palec nahoru",
      "Pošli polibek",
      "Miluju tě tak moc",
      "Srdce z prstů",
      "Mrk mrk",
      "Osrdíčkovat",
      "Povídání od srdce",
      "Srdíčkový obláček",
      "Srdíčková čepice"
    ],
    aliases: ["heart", "love", "kiss", "thumb", "palec", "srdce", "srdicko"],
    visualFamily: "romance",
    effectProgram: "heart_ping",
    animationOwner: "mia",
    moodHint: "cute",
    recommendedSceneModes: ["MAIN", "AFK"],
    tags: ["heart", "love", "cute", "light_support"]
  }),

  buildGiftEntry({
    key: "heart_big",
    label: "Heart Big",
    exactNames: ["Srdíčková kytara", "Koala-amorek", "Brýle lásky", "Pošli Rosie polibek"],
    aliases: ["amorek", "kytara", "romance", "love guitar"],
    minCoins: 400,
    visualFamily: "romance",
    effectProgram: "heart_burst",
    animationOwner: "both",
    moodHint: "romantic",
    recommendedSceneModes: ["MAIN", "AFK", "COMMUNITY"],
    tags: ["heart", "romance", "music", "premium_support"]
  }),

  buildGiftEntry({
    key: "food_care",
    label: "Food Care",
    exactNames: [
      "Kobliha",
      "Jedeš jako roláda",
      "Jsi můj džem",
      "Děláš miso radost",
      "Bagel",
      "Zmrzlina v kornoutu",
      "Citronový stánek"
    ],
    aliases: ["food", "jam", "donut", "bagel", "ice cream", "miso", "dzem"],
    visualFamily: "food",
    effectProgram: "care_feed",
    animationOwner: "kojnozout",
    moodHint: "playful",
    recommendedSceneModes: ["MAIN", "AFK", "COMMUNITY"],
    tags: ["food", "care", "pet", "cute"]
  }),

  buildGiftEntry({
    key: "music_small",
    label: "Music Small",
    exactNames: [
      "Retro",
      "Freestyle",
      "Pop",
      "TikTok",
      "Hudební společník",
      "Snové struny",
      "Městský pop",
      "Zpívající saxofon"
    ],
    aliases: ["music", "song", "retro", "dj", "freestyle", "pop", "sax", "hudebni"],
    visualFamily: "music",
    effectProgram: "music_pulse",
    animationOwner: "both",
    moodHint: "energetic",
    recommendedSceneModes: ["MAIN", "AFK", "COMMUNITY"],
    tags: ["music", "playlist", "rhythm", "support"]
  }),

  buildGiftEntry({
    key: "music_big",
    label: "Music Big",
    exactNames: [
      "Disko světla",
      "Rocková fazolka",
      "Radostná fazolka",
      "Chytrý fazolák",
      "Rockerská houba",
      "Zpívající medvěd",
      "Klaun Boogie",
      "DJský vinyl",
      "Kaktusový mix"
    ],
    aliases: ["disko", "dj", "vinyl", "rock", "boogie", "playlist", "music premium"],
    minCoins: 349,
    visualFamily: "music",
    effectProgram: "music_showcase",
    animationOwner: "both",
    moodHint: "celebration",
    recommendedSceneModes: ["MAIN", "AFK", "COMMUNITY"],
    tags: ["music", "show", "premium", "playlist"]
  }),

  buildGiftEntry({
    key: "animal_small",
    label: "Animal Small",
    exactNames: [
      "Tofu",
      "Kapybara",
      "Mimozemšťánek",
      "Steven Wingman",
      "Jsi úžasný",
      "Creeper"
    ],
    aliases: ["cat", "pet", "animal", "kapybara", "tofu", "creeper"],
    visualFamily: "animals",
    effectProgram: "pet_react",
    animationOwner: "kojnozout",
    moodHint: "cute",
    recommendedSceneModes: ["MAIN", "AFK", "COMMUNITY"],
    tags: ["pet", "cute", "animal", "community"],
    chatLoop: true
  }),

  buildGiftEntry({
    key: "animal_premium",
    label: "Animal Premium",
    exactNames: [
      "Černý tygr",
      "Bílý tygr",
      "Černý vlk",
      "Černá labuť",
      "Vesmírný pes",
      "Mladé Benny",
      "Koala-amorek"
    ],
    aliases: ["tygr", "wolf", "labut", "space dog", "animal premium"],
    minCoins: 2000,
    visualFamily: "animals",
    effectProgram: "beast_summon",
    animationOwner: "kojnozout",
    moodHint: "epic",
    recommendedSceneModes: ["MAIN", "COMMUNITY", "AFK"],
    tags: ["animal", "epic", "battle_feel", "support"]
  }),

  buildGiftEntry({
    key: "travel_vehicle",
    label: "Travel Vehicle",
    exactNames: [
      "Jarní vlak",
      "Párty autobus",
      "Cílová rovinka",
      "Go Big alfa drift",
      "Cestovní průkaz",
      "Hrdinova vesmírná loď"
    ],
    aliases: ["vlak", "bus", "drift", "race", "travel", "ship", "vesmirna lod"],
    minCoins: 399,
    visualFamily: "travel",
    effectProgram: "travel_motion",
    animationOwner: "both",
    moodHint: "dynamic",
    recommendedSceneModes: ["MAIN", "AFK", "COMMUNITY"],
    tags: ["travel", "vehicle", "race", "movement"]
  }),

  buildGiftEntry({
    key: "celebration",
    label: "Celebration",
    exactNames: [
      "Ohňostroj",
      "GG",
      "Bravo!",
      "Dobrý večer",
      "Exkluzivní jiskra",
      "Pod kontrolou",
      "Do toho!",
      "Dát do toho vše",
      "Tvrdá práce a je..."
    ],
    aliases: ["celebration", "gg", "fireworks", "bravo", "jiskra", "good evening"],
    visualFamily: "celebration",
    effectProgram: "celebration_burst",
    animationOwner: "both",
    moodHint: "happy",
    recommendedSceneModes: ["MAIN", "AFK", "COMMUNITY", "COMBAT_FX"],
    tags: ["celebration", "reward", "community", "hype"]
  }),

  buildGiftEntry({
    key: "battle_power",
    label: "Battle Power",
    exactNames: [
      "Rockyho úder",
      "Basketbalový míč",
      "Superhvězda",
      "Sokol",
      "Manifesting",
      "Diamantová zbraň",
      "Tuleň a Velryba",
      "Nosorožec ochránce",
      "Podpora komunity"
    ],
    aliases: ["power", "battle", "rocky", "superstar", "falcon", "weapon", "support community"],
    minCoins: 399,
    visualFamily: "battle",
    effectProgram: "power_strike",
    animationOwner: "kojnozout",
    moodHint: "intense",
    recommendedSceneModes: ["COMMUNITY", "MAIN", "COMBAT_FX"],
    tags: ["battle", "power", "hype", "combat_feel"]
  }),

  buildGiftEntry({
    key: "magic_space",
    label: "Magic Space",
    exactNames: [
      "Magický džin",
      "Vesmírný pes",
      "Pirátský poklad",
      "Hledání vajíček",
      "Manifesting",
      "Mimozemšťánek"
    ],
    aliases: ["magic", "space", "djinn", "treasure", "alien", "cosmic"],
    minCoins: 399,
    visualFamily: "magic",
    effectProgram: "magic_orbit",
    animationOwner: "both",
    moodHint: "mystic",
    recommendedSceneModes: ["AFK", "MAIN", "COMMUNITY"],
    tags: ["magic", "space", "fantasy", "story"]
  }),

  buildGiftEntry({
    key: "premium_vehicle_show",
    label: "Premium Vehicle Show",
    exactNames: [
      "Párty autobus",
      "Jarní vlak",
      "Go Big alfa drift",
      "Cílová rovinka"
    ],
    aliases: ["premium vehicle", "show vehicle"],
    minCoins: 2000,
    visualFamily: "travel",
    effectProgram: "cinematic_vehicle",
    animationOwner: "both",
    moodHint: "epic",
    recommendedSceneModes: ["MAIN", "AFK", "COMMUNITY"],
    tags: ["premium", "cinematic", "vehicle", "event"]
  })
];

function keywordProfile(tokens = [], original = "") {
  const has = (needle) => tokens.includes(needle) || original.includes(needle);

  if (has("ruze") || has("kvet") || has("kytin") || has("flower")) {
    return {
      visualFamily: "flowers",
      effectProgram: "flower_support",
      animationOwner: "mia",
      moodHint: "warm",
      tags: ["flower", "romance"]
    };
  }

  if (
    has("srd") ||
    has("polib") ||
    has("love") ||
    has("kiss") ||
    has("palec") ||
    has("amor")
  ) {
    return {
      visualFamily: "romance",
      effectProgram: "heart_ping",
      animationOwner: "mia",
      moodHint: "cute",
      tags: ["heart", "romance"]
    };
  }

  if (
    has("koblih") ||
    has("bagel") ||
    has("zmrzlin") ||
    has("dzem") ||
    has("miso") ||
    has("food")
  ) {
    return {
      visualFamily: "food",
      effectProgram: "care_feed",
      animationOwner: "kojnozout",
      moodHint: "playful",
      tags: ["food", "care"]
    };
  }

  if (
    has("hudeb") ||
    has("retro") ||
    has("freestyle") ||
    has("vinyl") ||
    has("music") ||
    has("sax") ||
    has("dj") ||
    has("pop")
  ) {
    return {
      visualFamily: "music",
      effectProgram: "music_pulse",
      animationOwner: "both",
      moodHint: "energetic",
      tags: ["music", "playlist"]
    };
  }

  if (
    has("tygr") ||
    has("vlk") ||
    has("pes") ||
    has("kapybara") ||
    has("benny") ||
    has("animal") ||
    has("cat") ||
    has("tofu")
  ) {
    return {
      visualFamily: "animals",
      effectProgram: "pet_react",
      animationOwner: "kojnozout",
      moodHint: "cute",
      tags: ["animal", "pet"]
    };
  }

  if (
    has("vlak") ||
    has("autobus") ||
    has("drift") ||
    has("lod") ||
    has("vesmir") ||
    has("travel") ||
    has("bus")
  ) {
    return {
      visualFamily: "travel",
      effectProgram: "travel_motion",
      animationOwner: "both",
      moodHint: "dynamic",
      tags: ["travel", "vehicle"]
    };
  }

  if (
    has("rocky") ||
    has("uder") ||
    has("zbran") ||
    has("superhvezda") ||
    has("sokol") ||
    has("power") ||
    has("battle")
  ) {
    return {
      visualFamily: "battle",
      effectProgram: "power_strike",
      animationOwner: "kojnozout",
      moodHint: "intense",
      tags: ["battle", "power"]
    };
  }

  if (
    has("mag") ||
    has("dzin") ||
    has("pirat") ||
    has("poklad") ||
    has("mimozem") ||
    has("vesmir") ||
    has("manifest")
  ) {
    return {
      visualFamily: "magic",
      effectProgram: "magic_orbit",
      animationOwner: "both",
      moodHint: "mystic",
      tags: ["magic", "space"]
    };
  }

  if (
    has("gg") ||
    has("bravo") ||
    has("ohnostroj") ||
    has("jiskra") ||
    has("dobry vecer") ||
    has("celebration")
  ) {
    return {
      visualFamily: "celebration",
      effectProgram: "celebration_burst",
      animationOwner: "both",
      moodHint: "happy",
      tags: ["celebration", "hype"]
    };
  }

  return {
    visualFamily: "generic",
    effectProgram: "generic_support",
    animationOwner: "both",
    moodHint: "warm",
    tags: ["generic"]
  };
}

function matchEntry({ giftId, giftName, totalCoins }) {
  const normalizedId = normalizeText(giftId);
  const normalizedName = normalizeText(giftName);
  const bucketCoins = Math.max(0, toNumber(totalCoins, 0));

  for (const entry of GIFT_ENTRIES) {
    if (entry.exactIds.some((id) => normalizeText(id) === normalizedId && normalizedId)) {
      return entry;
    }

    if (entry.exactNames.some((name) => normalizeText(name) === normalizedName && normalizedName)) {
      if (entry.minCoins && bucketCoins < entry.minCoins) {
        continue;
      }

      if (entry.maxCoins !== null && bucketCoins > entry.maxCoins) {
        continue;
      }

      return entry;
    }
  }

  for (const entry of GIFT_ENTRIES) {
    const haystack = `${normalizedName} ${normalizedId}`.trim();

    const aliasMatched = entry.aliases.some((alias) => {
      const normalizedAlias = normalizeText(alias);
      return normalizedAlias && haystack.includes(normalizedAlias);
    });

    if (!aliasMatched) continue;

    if (entry.minCoins && bucketCoins < entry.minCoins) {
      continue;
    }

    if (entry.maxCoins !== null && bucketCoins > entry.maxCoins) {
      continue;
    }

    return entry;
  }

  return null;
}

function resolveGiftRewards(totalCoins = 0, bucket = "unknown") {
  const coins = Math.max(0, toNumber(totalCoins, 0));
  const rewards = [];

  if (coins >= 100) {
    rewards.push({ type: "team_points", amount: coins, label: "Team body" });
  }
  if (coins >= 1000) {
    rewards.push({ type: "xp_bonus", amount: Math.max(5, Math.floor(coins * 0.05)), label: "XP bonus" });
  }
  if (bucket === "epic" || bucket === "legendary") {
    rewards.push({ type: "combo_eligible", amount: 1, label: "Combo eligible" });
  }

  return rewards;
}

function attachEconomyFields(profile = {}, totalCoins = 0) {
  const bucket = safeString(profile.coinsBucket, normalizeCoinsBucket(totalCoins));
  return {
    ...profile,
    teamPoints: Math.max(0, toNumber(totalCoins, toNumber(profile.totalCoins, 0))),
    rewards: resolveGiftRewards(totalCoins, bucket)
  };
}

function buildProfileFromEntry(entry, input, mappingSource = "exact_name") {
  const totalCoins = Math.max(0, toNumber(input.totalCoins, 0));
  const bucket = normalizeCoinsBucket(totalCoins);

  return attachEconomyFields(
    {
      version: GIFT_MAP_VERSION,
      matched: true,
      canonicalKey: entry.key,
      label: entry.label,
      mappingSource,
      mappingConfidence: mappingSource === "exact_id" ? 0.98 : mappingSource === "exact_name" ? 0.95 : 0.88,
      platform: normalizePlatform(input.platform),
      giftId: safeString(input.giftId) || null,
      giftName: safeString(input.giftName) || null,
      coins: Math.max(0, toNumber(input.coins, 0)),
      totalCoins,
      coinsBucket: bucket,
      animationOwner: entry.animationOwner,
      visualFamily: entry.visualFamily,
      effectProgram: entry.effectProgram,
      moodHint: entry.moodHint,
      recommendedSceneModes: entry.recommendedSceneModes.slice(),
      chatLoop: entry.chatLoop === true,
      tags: uniqueStrings([
        ...entry.tags,
        bucket,
        normalizePlatform(input.platform)
      ])
    },
    totalCoins
  );
}

function buildCoinTierAutoProfile(input = {}) {
  const totalCoins = Math.max(0, toNumber(input.totalCoins, 0));
  const bucket = normalizeCoinsBucket(totalCoins);
  const tierDef = COIN_TIER_AUTO[bucket];

  if (!tierDef || totalCoins < 100) {
    return null;
  }

  return attachEconomyFields(
    {
      version: GIFT_MAP_VERSION,
      matched: true,
      canonicalKey: tierDef.key,
      label: safeString(input.giftName, tierDef.label),
      mappingSource: "coin_tier",
      mappingConfidence: tierDef.mappingConfidence,
      platform: normalizePlatform(input.platform),
      giftId: safeString(input.giftId) || null,
      giftName: safeString(input.giftName) || null,
      coins: Math.max(0, toNumber(input.coins, 0)),
      totalCoins,
      coinsBucket: bucket,
      animationOwner: tierDef.animationOwner,
      visualFamily: tierDef.visualFamily,
      effectProgram: tierDef.effectProgram,
      moodHint: tierDef.moodHint,
      recommendedSceneModes: ["MAIN", "AFK", "COMMUNITY"],
      tags: uniqueStrings([
        "auto_map",
        "coin_tier",
        bucket,
        normalizePlatform(input.platform)
      ])
    },
    totalCoins
  );
}

function buildFallbackProfile(input) {
  const totalCoins = Math.max(0, toNumber(input.totalCoins, 0));
  const normalizedName = normalizeText(input.giftName);
  const tokens = normalizedName ? normalizedName.split(/\s+/).filter(Boolean) : [];
  const keywordMatch = keywordProfile(tokens, normalizedName);
  const bucket = normalizeCoinsBucket(totalCoins);

  let effectProgram = keywordMatch.effectProgram;
  let animationOwner = keywordMatch.animationOwner;
  let visualFamily = keywordMatch.visualFamily;
  let moodHint = keywordMatch.moodHint;

  if (bucket === "legendary" || bucket === "epic") {
    if (visualFamily === "generic") {
      visualFamily = "celebration";
    }

    if (effectProgram === "generic_support") {
      effectProgram = "cinematic_support";
    }

    moodHint = "epic";
  }

  return attachEconomyFields(
    {
      version: GIFT_MAP_VERSION,
      matched: false,
      canonicalKey: "unknown_gift",
      label: safeString(input.giftName, "Unknown Gift"),
      mappingSource: "keyword_fallback",
      mappingConfidence: keywordMatch.effectProgram === "generic_support" ? 0.35 : 0.55,
      platform: normalizePlatform(input.platform),
      giftId: safeString(input.giftId) || null,
      giftName: safeString(input.giftName) || null,
      coins: Math.max(0, toNumber(input.coins, 0)),
      totalCoins,
      coinsBucket: bucket,
      animationOwner,
      visualFamily,
      effectProgram,
      moodHint,
      recommendedSceneModes: ["MAIN", "AFK", "COMMUNITY"],
      tags: uniqueStrings([
        "fallback",
        ...keywordMatch.tags,
        bucket,
        normalizePlatform(input.platform)
      ])
    },
    totalCoins
  );
}

function resolveGiftProfile(input = {}) {
  const safeInput = {
    platform: normalizePlatform(input.platform),
    giftId: safeString(input.giftId),
    giftName: safeString(input.giftName),
    coins: Math.max(0, toNumber(input.coins, 0)),
    totalCoins: Math.max(
      0,
      toNumber(
        input.totalCoins,
        toNumber(input.coins, 0) * Math.max(1, toNumber(input.repeatCount, 1))
      )
    )
  };

  const entry = matchEntry(safeInput);

  if (entry) {
    return buildProfileFromEntry(entry, safeInput, resolveMappingSource(entry, safeInput));
  }

  const coinTierProfile = buildCoinTierAutoProfile(safeInput);
  if (coinTierProfile) {
    return coinTierProfile;
  }

  return buildFallbackProfile(safeInput);
}

function resolveGiftMapping(input = {}) {
  const profile = resolveGiftProfile(input);
  return {
    profile,
    mappingSource: safeString(profile.mappingSource, profile.matched ? "catalog" : "unknown"),
    mappingConfidence: toNumber(profile.mappingConfidence, profile.matched ? 0.9 : 0.35),
    canonicalKey: safeString(profile.canonicalKey, "unknown_gift")
  };
}

module.exports = {
  GIFT_MAP_VERSION,
  GIFT_ENTRIES,
  COIN_TIER_AUTO,
  resolveGiftRewards,
  resolveGiftProfile,
  resolveGiftMapping
};