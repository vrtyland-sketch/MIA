"use strict";

/**
 * One-time / repeatable exporter: inline TEXT_BANK -> text-bank/packs/*.json
 * Run: node scripts/MIA_TEXT_BANK_EXPORT.js
 */

const fs = require("fs");
const path = require("path");

const { TEXT_BANK } = require("./MIA_TEXT_BANK_LEGACY_INLINE");
const { dedupeVariants } = require("./MIA_TEXT_BANK_LOADER");

const OUT_ROOT = path.resolve(__dirname, "..", "text-bank", "packs");

const GROUPS = {
  "legacy/direct.json": ["direct_mia", "direct_kojnozout"],
  "idle/idle.json": ["idle_hungry", "idle_bored"],
  "community/wake.json": ["wake_up_chat_mia", "wake_up_chat_kojnozout"],
  "community/ping-milestone.json": [
    "community_ping_mia",
    "community_ping_kojnozout",
    "milestone_chat_mia",
    "milestone_chat_kojnozout"
  ],
  "community/presence-audience.json": [
    "viewer_notice_mia",
    "viewer_notice_kojnozout",
    "audience_push_mia",
    "audience_push_kojnozout",
    "chat_presence_mia",
    "chat_presence_kojnozout"
  ],
  "support/support-mia-koj.json": [
    "support_small_mia",
    "support_medium_mia",
    "support_big_mia",
    "support_small_kojnozout",
    "support_medium_kojnozout",
    "support_big_kojnozout"
  ],
  "support/support-spam-bowl.json": [
    "support_spam_success_mia",
    "support_spam_fail_mia",
    "support_spam_success_kojnozout",
    "support_spam_fail_kojnozout",
    "support_full_bowl_mia",
    "support_full_bowl_kojnozout",
    "support_combo"
  ],
  "koj/feed-care.json": [
    "koj_feed_small",
    "koj_feed_medium",
    "koj_feed_big",
    "koj_full_bowl",
    "mia_care"
  ],
  "mia/direct-core.json": [
    "mia_direct_greeting",
    "mia_direct_greeting_status",
    "mia_direct_status",
    "mia_direct_status_sensitive",
    "mia_direct_status_repeat",
    "mia_direct_praise",
    "mia_direct_praise_repeat",
    "mia_direct_thanks",
    "mia_direct_question",
    "mia_direct_question_named",
    "mia_direct_fact_question",
    "mia_direct_food_side",
    "mia_direct_generic",
    "mia_direct_generic_return"
  ],
  "koj/direct-core.json": [
    "koj_direct_greeting",
    "koj_direct_greeting_status",
    "koj_direct_status",
    "koj_direct_status_repeat",
    "koj_direct_food",
    "koj_direct_food_repeat",
    "koj_direct_praise",
    "koj_direct_thanks",
    "koj_direct_question",
    "koj_direct_question_named",
    "koj_direct_fact_question",
    "koj_direct_generic",
    "koj_direct_generic_return"
  ],
  "community/social.json": [
    "community_greeting_mia",
    "community_greeting_kojnozout",
    "community_illness_mia",
    "community_illness_kojnozout"
  ],
  "shared/templates.json": [
    "template_named_soft_mia",
    "template_named_soft_koj"
  ]
};

function inferMeta(key) {
  const meta = { key };

  if (key.startsWith("mia_") || key.endsWith("_mia")) meta.speaker = "mia";
  if (key.startsWith("koj_") || key.endsWith("_kojnozout") || key.startsWith("kojno")) {
    meta.speaker = "kojnozout";
  }

  if (key.includes("direct_status")) meta.intent = "direct_status_question";
  if (key.includes("direct_greeting")) meta.intent = "direct_greeting";
  if (key.includes("direct_praise")) meta.intent = "praise";
  if (key.includes("direct_thanks")) meta.intent = "thanks";
  if (key.includes("direct_question")) meta.intent = "question";
  if (key.includes("support_")) meta.intent = "support";
  if (key.includes("community_")) meta.intent = "community";
  if (key.includes("idle_")) meta.intent = "idle";
  if (key.includes("wake_up")) meta.intent = "wake_up";

  if (key.includes("sensitive")) meta.tone = "sensitive";
  if (key.includes("_repeat")) meta.repeat = true;

  return meta;
}

function buildPack(keys) {
  const packs = {};

  for (const key of keys) {
    const variants = dedupeVariants(TEXT_BANK[key] || []);
    if (variants.length === 0) continue;

    packs[key] = {
      meta: inferMeta(key),
      variants
    };
  }

  return {
    version: 1,
    packs
  };
}

function writeJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function main() {
  let files = 0;
  let keys = 0;
  let variants = 0;

  for (const [relPath, keyList] of Object.entries(GROUPS)) {
    const payload = buildPack(keyList);
    const packKeys = Object.keys(payload.packs);
    if (packKeys.length === 0) continue;

    writeJson(path.join(OUT_ROOT, relPath), payload);
    files += 1;
    keys += packKeys.length;
    variants += packKeys.reduce(
      (sum, key) => sum + payload.packs[key].variants.length,
      0
    );
  }

  console.log(`Exported ${keys} keys / ${variants} variants into ${files} pack files under ${OUT_ROOT}`);
}

main();
