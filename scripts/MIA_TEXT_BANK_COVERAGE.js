"use strict";

/**
 * Runtime text-bank coverage registry.
 * Used by tests/text_bank_coverage_contract.js to fail CI when production
 * code references bank keys that are missing from text-bank/packs/.
 */

const fs = require("fs");
const path = require("path");

const PROJECT_ROOT = path.resolve(__dirname, "..");
const SPEAKERS = ["mia", "kojnozout"];

const SCAN_SOURCES = [
  "scripts/MIA_RESPONSE_ENGINE.js",
  "scripts/MIA_PROACTIVE_HOST.js",
  "shared/platform_runtime/action_builder.js"
];

/** Keys read directly (no speaker suffix). */
const DIRECT_BANK_KEYS = [
  "direct_kojnozout",
  "direct_mia",
  "koj_direct_engagement",
  "koj_direct_engagement_sensitive",
  "koj_direct_generic",
  "koj_direct_greeting",
  "koj_direct_question",
  "koj_direct_status",
  "koj_direct_status_repeat",
  "koj_direct_thanks",
  "koj_feed_medium",
  "koj_feed_small",
  "mia_care",
  "mia_direct_engagement",
  "mia_direct_engagement_playful",
  "mia_direct_engagement_sensitive",
  "mia_direct_generic",
  "mia_direct_generic_return",
  "mia_direct_greeting",
  "mia_direct_greeting_status",
  "mia_direct_question_named",
  "mia_direct_statement",
  "mia_direct_status",
  "mia_direct_status_repeat",
  "mia_direct_status_sensitive",
  "mia_direct_thanks",
  "mia_learned_voice",
  "mia_learned_voice_echo",
  "mia_learned_voice_spicy",
  "koj_learned_voice",
  "koj_learned_voice_spicy",
  "mia_proactive_bored",
  "mia_proactive_laugh",
  "mia_proactive_spicy",
  "mia_proactive_wake",
  "mia_story_fallback",
  "mia_solo_stream_beat",
  "mia_solo_stream_story",
  "mia_solo_stream_deep",
  "idle_bored",
  "wake_up_chat_mia",
  "sadness_report_mia",
  "sadness_report_kojnozout",
  "loss_report_mia",
  "loss_report_kojnozout",
  "pet_loss_report_mia",
  "pet_loss_kojnozout",
  "emotion_stress_mia_health",
  "emotion_stress_mia_school",
  "emotion_stress_mia_finance",
  "emotion_stress_mia_general",
  "emotion_frustration_mia_general",
  "emotion_joy_mia_general",
  "emotion_relief_mia_general",
  "emotion_stress_kojnozout_general",
  "emotion_frustration_kojnozout_general",
  "emotion_joy_kojnozout_general",
  "emotion_relief_kojnozout_general",
  "mia_returning_ack",
  "koj_returning_ack",
  "koj_evolution_hatchling",
  "koj_evolution_sprout",
  "koj_evolution_guardian",
  "koj_evolution_legend",
  "mia_evolution_hatchling",
  "mia_evolution_sprout",
  "mia_evolution_guardian",
  "mia_evolution_legend"
];

/** Base keys expanded to _mia / _kojnozout in buildCommunityResponseText. */
const COMMUNITY_BANK_BASES = [
  "community_ping",
  "milestone_chat"
];

/** Resolved explicitly in buildCommunityResponseText. */
const COMMUNITY_GREETING_KEYS = [
  "community_greeting_mia",
  "community_greeting_kojnozout"
];

/** resolveSupportBankKey() → resolveSupportSpeakerBankKey() in response engine. */
const SUPPORT_BANK_BASES = [
  "support_small",
  "support_medium",
  "support_big",
  "support_full_bowl",
  "support_spam_success",
  "support_spam_fail"
];

function expandSpeakerKeys(baseKey) {
  return SPEAKERS.map((speaker) => `${baseKey}_${speaker}`);
}

function getRegistryBankKeys() {
  const keys = new Set(DIRECT_BANK_KEYS);

  for (const base of COMMUNITY_BANK_BASES) {
    for (const key of expandSpeakerKeys(base)) {
      keys.add(key);
    }
  }

  for (const key of COMMUNITY_GREETING_KEYS) {
    keys.add(key);
  }

  for (const base of SUPPORT_BANK_BASES) {
    for (const key of expandSpeakerKeys(base)) {
      keys.add(key);
    }
  }

  return [...keys].sort();
}

function extractStringLiterals(chunk = "") {
  const keys = [];
  for (const match of chunk.matchAll(/["']([a-z][a-z0-9_]*)["']/g)) {
    keys.push(match[1]);
  }
  return keys;
}

function isSupportBankBase(key = "") {
  return SUPPORT_BANK_BASES.includes(key);
}

function addBankKey(keys, rawKey = "") {
  const key = safeString(rawKey);
  if (!key) return;

  if (isSupportBankBase(key)) {
    for (const expanded of expandSpeakerKeys(key)) {
      keys.add(expanded);
    }
    return;
  }

  for (const expanded of expandCommunityBankKey(key)) {
    keys.add(expanded);
  }
}

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function scanResponseEngineLiterals(content, keys) {
  for (const match of content.matchAll(
    /["']((?:(?:mia|koj)_[a-z0-9_]+)|direct_(?:mia|kojnozout))["']/g
  )) {
    addBankKey(keys, match[1]);
  }

  for (const match of content.matchAll(
    /["']((?:sadness_report|loss_report|pet_loss(?:_report)?|emotion_[a-z0-9_]+)_(?:mia|kojnozout|general|health|school|finance))["']/g
  )) {
    addBankKey(keys, match[1]);
  }

  for (const match of content.matchAll(/["']((?:mia|koj)_returning_ack)["']/g)) {
    addBankKey(keys, match[1]);
  }

  for (const base of SUPPORT_BANK_BASES) {
    if (content.includes(`"${base}"`) || content.includes(`'${base}'`)) {
      addBankKey(keys, base);
    }
  }
}

function expandCommunityBankKey(baseKey) {
  if (baseKey === "community_greeting") {
    return COMMUNITY_GREETING_KEYS.slice();
  }

  if (baseKey === "community_illness") {
    return [];
  }

  if (
    baseKey.startsWith("community_") ||
    baseKey.startsWith("milestone_") ||
    baseKey.startsWith("wake_up_")
  ) {
    if (baseKey.endsWith("_mia") || baseKey.endsWith("_kojnozout")) {
      return [baseKey];
    }
    return expandSpeakerKeys(baseKey);
  }

  return [baseKey];
}

function scanSourceFile(relativePath) {
  const filePath = path.join(PROJECT_ROOT, relativePath);
  const content = fs.readFileSync(filePath, "utf8");
  const keys = new Set();

  for (const match of content.matchAll(/getBankVariants\(\s*["']([a-z][a-z0-9_]*)["']\s*\)/g)) {
    addBankKey(keys, match[1]);
  }

  for (const match of content.matchAll(
    /pickNamedBankText\(\s*[^,]+,\s*["']([a-z][a-z0-9_]*)["']/g
  )) {
    addBankKey(keys, match[1]);
  }

  for (const match of content.matchAll(
    /pickNamedBankText\(\s*[^,]+,\s*\[([^\]]+)\]/g
  )) {
    for (const key of extractStringLiterals(match[1])) {
      addBankKey(keys, key);
    }
  }

  for (const match of content.matchAll(/bankKey:\s*["']([a-z][a-z0-9_]*)["']/g)) {
    addBankKey(keys, match[1]);
  }

  if (relativePath.endsWith("MIA_RESPONSE_ENGINE.js")) {
    scanResponseEngineLiterals(content, keys);
  }

  if (relativePath.includes("action_builder.js")) {
    for (const match of content.matchAll(
      /["'](community_ping|milestone_chat|community_greeting|community_illness)["']/g
    )) {
      addBankKey(keys, match[1]);
    }
  }

  if (relativePath.endsWith("MIA_PROACTIVE_HOST.js")) {
    for (const match of content.matchAll(/\[([^\]]+)\]/g)) {
      for (const key of extractStringLiterals(match[1])) {
        if (
          key.includes("proactive") ||
          key.includes("idle_") ||
          key.startsWith("wake_up_") ||
          key.startsWith("mia_solo_stream_")
        ) {
          addBankKey(keys, key);
        }
      }
    }
  }

  return keys;
}

function scanProductionBankKeys() {
  const keys = new Set();

  for (const source of SCAN_SOURCES) {
    for (const key of scanSourceFile(source)) {
      keys.add(key);
    }
  }

  return [...keys].sort();
}

function collectRequiredBankKeys() {
  const keys = new Set([...getRegistryBankKeys(), ...scanProductionBankKeys()]);
  return [...keys].sort();
}

function validateTextBankCoverage(textBank = {}) {
  const required = collectRequiredBankKeys();
  const missing = [];
  const empty = [];

  for (const key of required) {
    const variants = textBank[key];
    if (!Array.isArray(variants)) {
      missing.push(key);
      continue;
    }
    if (variants.length === 0) {
      empty.push(key);
    }
  }

  const scanned = new Set(scanProductionBankKeys());
  const registry = new Set(getRegistryBankKeys());
  const unscannedRegistry = [...registry].filter((key) => !scanned.has(key));

  return {
    required,
    missing,
    empty,
    scanned: [...scanned].sort(),
    registry: [...registry].sort(),
    unscannedRegistry
  };
}

module.exports = {
  DIRECT_BANK_KEYS,
  COMMUNITY_BANK_BASES,
  SUPPORT_BANK_BASES,
  SCAN_SOURCES,
  getRegistryBankKeys,
  scanProductionBankKeys,
  collectRequiredBankKeys,
  validateTextBankCoverage
};
