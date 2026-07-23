"use strict";

const fs = require("fs");
const path = require("path");

const DEFAULT_STORE_PATH = path.resolve(__dirname, "..", "data", "mia-chat-lexicon.json");
const SAVE_EVERY_OBSERVATIONS = 12;

const STOPWORDS = new Set([
  "a", "i", "u", "v", "ve", "na", "do", "od", "ze", "za", "po", "pro", "pri", "se", "si", "je",
  "jsem", "jsi", "jsme", "jsou", "by", "byt", "to", "ten", "ta", "tohle", "tady", "tam", "co",
  "jak", "kdy", "kde", "proc", "ne", "ano", "jo", "ok", "tak", "ale", "nebo", "kdyz", "uz",
  "jeste", "jen", "mi", "me", "te", "ti", "ty", "vy", "my", "on", "ona", "ono", "the", "is",
  "this", "that", "ahoj", "cau", "nazdar", "mia", "mio", "mii", "maio", "mijo", "mojo"
]);

const SPICY_PHRASES = [
  "do prdele",
  "do pici",
  "do hajzlu",
  "do prdele",
  "na hovno",
  "kurva fix",
  "do bordelu",
  "seru na",
  "jebe mi",
  "jebat",
  "nasrat",
  "nasrany",
  "nasrana",
  "v pici",
  "v prdeli"
];

const SPICY_WORDS = [
  "kurva",
  "kurvy",
  "sračka",
  "sracka",
  "hovno",
  "kokot",
  "kokote",
  "debil",
  "debile",
  "pica",
  "picovina",
  "prdel",
  "prdele",
  "vole",
  "sakra",
  "hovno",
  "zmrd",
  "svine",
  "svine",
  "do prdele",
  "nasrat",
  "seru",
  "ser",
  "jebat",
  "jebe",
  "pica",
  "hajzl",
  "bordel"
];

const BLOCKED_VOICE_INTENTS = new Set([
  "pet_loss_report",
  "loss_report",
  "sadness_report",
  "stress_report"
]);

const BLOCKED_VOICE_TONES = new Set(["sensitive", "serious"]);

const META_TEST_PATTERNS = [
  /^this is a test$/,
  /^it works!?$/,
  /^it works this is a test$/,
  /^test$/,
  /^testing$/,
  /^hello world$/,
  /^tikfinity test$/,
  /^test message$/,
  /^test chat$/,
  /^ping$/,
  /^pong$/,
  /testuser\d*$/
];

let store = null;
let observationsSinceSave = 0;
let configuredStorePath = DEFAULT_STORE_PATH;

function getStorePath() {
  return configuredStorePath;
}

function configureLexicon(options = {}) {
  if (options.storePath) {
    configuredStorePath = path.resolve(options.storePath);
  }
  store = null;
  observationsSinceSave = 0;
}

function normalize(text = "") {
  return String(text || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s?!]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function isMetaTestPhrase(text = "") {
  const normalized = normalize(text);
  if (!normalized) return true;
  if (normalized.length <= 48 && META_TEST_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return true;
  }
  if (normalized.includes("this is a test") && normalized.length <= 64) {
    return true;
  }
  if (/^test\s*\d*$/.test(normalized)) {
    return true;
  }
  return false;
}

function isUsableCatchphrase(text = "") {
  const normalized = normalize(text);
  if (!normalized || normalized.length < 4 || normalized.length > 64) {
    return false;
  }
  if (isMetaTestPhrase(normalized)) {
    return false;
  }
  if (STOPWORDS.has(normalized)) {
    return false;
  }
  return !isSpicyText(normalized);
}

function purgeMetaTestEntries(current = {}) {
  let changed = false;

  for (const key of Object.keys(current.phrases || {})) {
    if (isMetaTestPhrase(key)) {
      delete current.phrases[key];
      changed = true;
    }
  }

  for (const userKey of Object.keys(current.users || {})) {
    const userEntry = current.users[userKey];
    if (!userEntry?.favoritePhrases) continue;

    for (const phraseKey of Object.keys(userEntry.favoritePhrases)) {
      if (isMetaTestPhrase(phraseKey)) {
        delete userEntry.favoritePhrases[phraseKey];
        changed = true;
      }
    }
  }

  if (Array.isArray(current.recentSamples)) {
    const filtered = current.recentSamples.filter(
      (sample) => !isMetaTestPhrase(sample?.text)
    );
    if (filtered.length !== current.recentSamples.length) {
      current.recentSamples = filtered;
      changed = true;
    }
  }

  return changed;
}

function nowTs() {
  return Date.now();
}

function createEmptyStore() {
  return {
    version: 1,
    updatedAt: nowTs(),
    stats: {
      messagesSeen: 0,
      uniqueWords: 0,
      uniquePhrases: 0,
      spicyHits: 0
    },
    tone: {
      spiceLevel: 0,
      casualLevel: 0,
      energyLevel: 0,
      lastUpdated: 0
    },
    words: {},
    phrases: {},
    spicy: {},
    users: {},
    recentSamples: []
  };
}

function ensureStore() {
  if (store) return store;
  store = loadStoreFromDisk();
  if (purgeMetaTestEntries(store)) {
    saveStoreToDisk();
  }
  return store;
}

function loadStoreFromDisk(storePath = getStorePath()) {
  try {
    if (!fs.existsSync(storePath)) {
      return createEmptyStore();
    }

    const parsed = JSON.parse(fs.readFileSync(storePath, "utf8"));
    return {
      ...createEmptyStore(),
      ...parsed,
      stats: { ...createEmptyStore().stats, ...(parsed.stats || {}) },
      tone: { ...createEmptyStore().tone, ...(parsed.tone || {}) },
      words: parsed.words && typeof parsed.words === "object" ? parsed.words : {},
      phrases: parsed.phrases && typeof parsed.phrases === "object" ? parsed.phrases : {},
      spicy: parsed.spicy && typeof parsed.spicy === "object" ? parsed.spicy : {},
      users: parsed.users && typeof parsed.users === "object" ? parsed.users : {},
      recentSamples: Array.isArray(parsed.recentSamples) ? parsed.recentSamples.slice(-40) : []
    };
  } catch (_err) {
    return createEmptyStore();
  }
}

function saveStoreToDisk(storePath = getStorePath()) {
  const current = ensureStore();
  current.updatedAt = nowTs();
  fs.mkdirSync(path.dirname(storePath), { recursive: true });
  fs.writeFileSync(storePath, `${JSON.stringify(current, null, 2)}\n`, "utf8");
  observationsSinceSave = 0;
}

function maybePersist() {
  observationsSinceSave += 1;
  if (observationsSinceSave >= SAVE_EVERY_OBSERVATIONS) {
    saveStoreToDisk();
  }
}

function bumpCounter(bucket, key, rawSample = "") {
  if (!key) return;

  const existing = bucket[key] || {
    count: 0,
    firstSeen: nowTs(),
    lastSeen: 0,
    lastRaw: ""
  };

  existing.count += 1;
  existing.lastSeen = nowTs();
  if (rawSample) {
    existing.lastRaw = rawSample.slice(0, 120);
  }

  bucket[key] = existing;
}

function tokenize(message = "") {
  return normalize(message).split(" ").filter(Boolean);
}

function isUsefulToken(token = "") {
  if (!token || token.length < 3) return false;
  if (STOPWORDS.has(token)) return false;
  if (/^\d+$/.test(token)) return false;
  return true;
}

function extractNgrams(tokens = [], size = 2) {
  const out = [];
  for (let i = 0; i <= tokens.length - size; i += 1) {
    const slice = tokens.slice(i, i + size);
    if (slice.every(isUsefulToken)) {
      out.push(slice.join(" "));
    }
  }
  return out;
}

function extractSpicyHits(normalizedMessage = "", rawMessage = "") {
  const hits = [];

  for (const phrase of SPICY_PHRASES) {
    if (normalizedMessage.includes(normalize(phrase))) {
      hits.push({
        key: normalize(phrase),
        raw: extractRawMatch(rawMessage, phrase)
      });
    }
  }

  for (const word of SPICY_WORDS) {
    const pattern = new RegExp(`\\b${word}\\b`, "i");
    if (pattern.test(normalizedMessage)) {
      hits.push({
        key: word,
        raw: extractRawMatch(rawMessage, word)
      });
    }
  }

  const seen = new Set();
  return hits.filter((hit) => {
    if (seen.has(hit.key)) return false;
    seen.add(hit.key);
    return true;
  });
}

function extractRawMatch(rawMessage = "", needle = "") {
  const raw = safeString(rawMessage);
  if (!raw) return needle;

  const lowerRaw = raw.toLowerCase();
  const lowerNeedle = needle.toLowerCase();
  const index = lowerRaw.indexOf(lowerNeedle);

  if (index >= 0) {
    return raw.slice(index, index + Math.max(lowerNeedle.length, 3));
  }

  return needle;
}

function updateTone(current, { spicyCount = 0, tokenCount = 0, exclamation = false }) {
  const next = { ...current, lastUpdated: nowTs() };

  if (spicyCount > 0) {
    next.spiceLevel = Math.min(100, next.spiceLevel + spicyCount * 8 + 4);
  } else {
    next.spiceLevel = Math.max(0, next.spiceLevel - 2);
  }

  if (tokenCount >= 4) {
    next.casualLevel = Math.min(100, next.casualLevel + 2);
  } else {
    next.casualLevel = Math.max(0, next.casualLevel - 1);
  }

  if (exclamation) {
    next.energyLevel = Math.min(100, next.energyLevel + 5);
  } else {
    next.energyLevel = Math.max(0, next.energyLevel - 1);
  }

  return next;
}

function observeChatMessage(input = {}) {
  const rawMessage = safeString(input.message);
  const normalizedMessage = normalize(rawMessage);
  const userLabel = safeString(input.userLabel, "divak");
  const platform = safeString(input.platform, "unknown");

  if (!normalizedMessage || normalizedMessage.length < 2) {
    return getLexiconSnapshot();
  }

  if (isMetaTestPhrase(normalizedMessage)) {
    return getLexiconSnapshot();
  }

  const current = ensureStore();
  const tokens = tokenize(rawMessage);
  const spicyHits = extractSpicyHits(normalizedMessage, rawMessage);

  current.stats.messagesSeen += 1;

  for (const token of tokens) {
    if (!isUsefulToken(token)) continue;
    bumpCounter(current.words, token, token);
  }

  for (const size of [2, 3, 4]) {
    for (const phrase of extractNgrams(tokens, size)) {
      bumpCounter(current.phrases, phrase, phrase);
    }
  }

  if (normalizedMessage.length >= 4 && normalizedMessage.length <= 72) {
    bumpCounter(current.phrases, normalizedMessage, rawMessage);
  }

  for (const hit of spicyHits) {
    bumpCounter(current.spicy, hit.key, hit.raw || hit.key);
    current.stats.spicyHits += 1;
  }

  const userKey = normalize(userLabel) || "divak";
  const userEntry = current.users[userKey] || {
    label: userLabel,
    count: 0,
    spicyCount: 0,
    lastSeen: 0,
    favoritePhrases: {}
  };

  userEntry.count += 1;
  userEntry.lastSeen = nowTs();
  userEntry.spicyCount += spicyHits.length;

  if (normalizedMessage.length <= 72) {
    bumpCounter(userEntry.favoritePhrases, normalizedMessage, rawMessage);
  }

  current.users[userKey] = userEntry;

  current.recentSamples = [
    {
      ts: nowTs(),
      userLabel,
      platform,
      text: rawMessage.slice(0, 120),
      spicy: spicyHits.length > 0
    }
  ].concat(current.recentSamples || []).slice(0, 40);

  current.tone = updateTone(current.tone, {
    spicyCount: spicyHits.length,
    tokenCount: tokens.length,
    exclamation: /!/.test(rawMessage)
  });

  current.stats.uniqueWords = Object.keys(current.words).length;
  current.stats.uniquePhrases = Object.keys(current.phrases).length;

  maybePersist();
  return getLexiconSnapshot();
}

function sortByCountDesc(bucket = {}) {
  return Object.entries(bucket)
    .sort((a, b) => {
      const countDiff = (b[1]?.count || 0) - (a[1]?.count || 0);
      if (countDiff !== 0) return countDiff;
      return (b[1]?.lastSeen || 0) - (a[1]?.lastSeen || 0);
    });
}

function pickTopPhrase(minCount = 3, excludeSpicy = true) {
  const current = ensureStore();

  for (const [key, entry] of sortByCountDesc(current.phrases)) {
    if ((entry?.count || 0) < minCount) break;
    if (key.length < 4 || key.length > 64) continue;
    if (isMetaTestPhrase(key) || isMetaTestPhrase(entry?.lastRaw)) continue;
    if (excludeSpicy && isSpicyText(key)) continue;
    if (STOPWORDS.has(key)) continue;
    return {
      key,
      text: safeString(entry?.lastRaw, key),
      count: entry?.count || 0
    };
  }

  return null;
}

function pickTopSpicy(minCount = 2) {
  const current = ensureStore();

  for (const [key, entry] of sortByCountDesc(current.spicy)) {
    if ((entry?.count || 0) < minCount) break;
    return {
      key,
      text: safeString(entry?.lastRaw, key),
      count: entry?.count || 0
    };
  }

  return null;
}

function isSpicyText(text = "") {
  const normalized = normalize(text);
  if (!normalized) return false;

  if (SPICY_WORDS.some((word) => new RegExp(`\\b${word}\\b`).test(normalized))) {
    return true;
  }

  return SPICY_PHRASES.some((phrase) => normalized.includes(normalize(phrase)));
}

function getLexiconSnapshot() {
  const current = ensureStore();
  const topPhrase = pickTopPhrase(3, true);
  const topSpicy = pickTopSpicy(2);

  return {
    stats: { ...current.stats },
    tone: { ...current.tone },
    topPhrase,
    topSpicy,
    recentSamples: (current.recentSamples || []).slice(0, 6),
    storePath: getStorePath()
  };
}

function firstName(userLabel = "") {
  return safeString(userLabel).split(/\s+/).filter(Boolean)[0] || "někdo";
}

function shouldUseCommunityVoice(intent = null, snapshot = null) {
  if (!snapshot) return false;
  if (BLOCKED_VOICE_INTENTS.has(safeString(intent?.type))) return false;
  if (BLOCKED_VOICE_TONES.has(safeString(intent?.tone))) return false;
  if ((snapshot.stats?.messagesSeen || 0) < 12) return false;

  const catchphrase = snapshot.topPhrase?.text || snapshot.topPhrase?.key || "";
  const hasUsableCatchphrase =
    Boolean(snapshot.topPhrase) &&
    isUsableCatchphrase(catchphrase) &&
    (snapshot.topPhrase?.count || 0) >= 6;

  if (hasUsableCatchphrase) {
    return true;
  }

  return Boolean(snapshot.topSpicy && snapshot.tone?.spiceLevel >= 28);
}

function applyTemplate(template, ctx = {}) {
  return safeString(template)
    .replace(/\{name\}/g, firstName(ctx.userLabel))
    .replace(/\{catchphrase\}/g, safeString(ctx.catchphrase, "tenhle styl"))
    .replace(/\{spicy\}/g, safeString(ctx.spicy, "sakra"))
    .replace(/\{word\}/g, safeString(ctx.word, "to"))
    .replace(/\{base\}/g, safeString(ctx.baseText))
    .replace(/\s+/g, " ")
    .trim();
}

function buildCommunityVoiceLine(input = {}) {
  const baseText = safeString(input.baseText);
  const userLabel = safeString(input.userLabel, "někdo");
  const templates = Array.isArray(input.templates) ? input.templates : [];
  const snapshot = input.snapshot || getLexiconSnapshot();

  if (templates.length === 0) {
    return baseText;
  }

  const rotationKey = safeString(input.rotationKey, "community_voice");
  const slot = Number.isFinite(Number(input.slot))
    ? Number(input.slot)
    : 0;
  const template = templates[slot % templates.length] || templates[0];
  const topWordEntry = sortByCountDesc(ensureStore().words)[0];

  const rendered = applyTemplate(template, {
    userLabel,
    baseText,
    catchphrase: snapshot.topPhrase?.text || snapshot.topPhrase?.key || "",
    spicy: snapshot.topSpicy?.text || snapshot.topSpicy?.key || "sakra",
    word: topWordEntry?.[1]?.lastRaw || topWordEntry?.[0] || "to"
  });

  if (!rendered || rendered.length < 8) {
    return baseText;
  }

  if (input.outputState?.rotationIndex) {
    input.outputState.rotationIndex[rotationKey] = slot + 1;
  }

  return rendered;
}

function resetLexicon(storePath = getStorePath()) {
  store = createEmptyStore();
  saveStoreToDisk(storePath);
  return getLexiconSnapshot();
}

module.exports = {
  DEFAULT_STORE_PATH,
  configureLexicon,
  observeChatMessage,
  getLexiconSnapshot,
  buildCommunityVoiceLine,
  shouldUseCommunityVoice,
  resetLexicon,
  loadStoreFromDisk,
  saveStoreToDisk,
  normalize,
  isMetaTestPhrase,
  isUsableCatchphrase
};
