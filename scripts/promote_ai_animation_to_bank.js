"use strict";

/**
 * CLI: promote AI staging clip → Animation Bank (Phase 12w).
 *
 *   node scripts/promote_ai_animation_to_bank.js <stagingId> [--category ai] [--clip-id ai/foo]
 *   node scripts/promote_ai_animation_to_bank.js <stagingId> --mark-production --confirm
 */

const {
  promoteAiAnimationToBank,
  markBankClipProduction
} = require("../shared/mia-animation-engine/promoteAiAnimation");

async function main() {
  const args = process.argv.slice(2);
  if (!args.length || args.includes("--help")) {
    console.log(`Usage:
  node scripts/promote_ai_animation_to_bank.js <stagingId> [options]
  Options:
    --category <name>     bank category (default: ai)
    --clip-id <id>        bank clip id (default: ai/<stagingId>)
    --emotion <name>
    --gift-key <key>      repeatable via comma list
    --min-alpha <0-1>     reject if staging avgAlphaRatio below
    --mark-production     after promote, mark as production (requires --confirm)
    --confirm             required for production
`);
    process.exit(args.includes("--help") ? 0 : 1);
  }

  const stagingId = args.find((a) => !a.startsWith("--"));
  const getOpt = (name) => {
    const i = args.indexOf(name);
    return i >= 0 ? args[i + 1] : null;
  };

  const giftKeysRaw = getOpt("--gift-key") || getOpt("--gift-keys");
  const result = await promoteAiAnimationToBank({
    stagingId,
    category: getOpt("--category") || "ai",
    bankClipId: getOpt("--clip-id") || getOpt("--clipId"),
    emotion: getOpt("--emotion"),
    giftKeys: giftKeysRaw ? giftKeysRaw.split(",").map((s) => s.trim()).filter(Boolean) : undefined,
    minAlphaRatio: getOpt("--min-alpha") != null ? Number(getOpt("--min-alpha")) : undefined,
    confirmProduction: false
  });

  if (!result.ok) {
    console.error(JSON.stringify(result, null, 2));
    process.exit(1);
  }

  let finalResult = result;
  if (args.includes("--mark-production")) {
    if (!args.includes("--confirm")) {
      console.error(JSON.stringify({ ok: false, error: "production_requires_confirm" }, null, 2));
      process.exit(1);
    }
    finalResult = await markBankClipProduction({
      clipId: result.clipId,
      confirmProduction: true
    });
    if (!finalResult.ok) {
      console.error(JSON.stringify(finalResult, null, 2));
      process.exit(1);
    }
    finalResult.promoted = result;
  }

  console.log(JSON.stringify(finalResult, null, 2));
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err && err.stack ? err.stack : err);
    process.exit(1);
  });
}

module.exports = { main };
