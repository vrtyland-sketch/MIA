"use strict";

/**
 * Read-only TEXT BANK inventory → docs/TEXT_BANK_INVENTORY.md
 * Usage: node scripts/generate_text_bank_inventory.js
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "docs", "TEXT_BANK_INVENTORY.md");
const { loadTextBank } = require("./MIA_TEXT_BANK_LOADER");
const { collectRequiredBankKeys } = require("./MIA_TEXT_BANK_COVERAGE");

const HIGH_FREQ = new Set([
  "support_small_mia",
  "support_small_kojnozout",
  "idle_bored",
  "wake_up_chat_mia",
  "mia_proactive_wake",
  "mia_proactive_bored",
  "mia_proactive_laugh",
  "mia_proactive_spicy",
  "mia_direct_greeting",
  "mia_direct_greeting_status",
  "koj_direct_greeting",
  "community_greeting_mia",
  "community_greeting_kojnozout",
  "mia_direct_generic",
  "mia_direct_generic_return",
  "koj_direct_generic",
  "support_spam_success_mia",
  "support_spam_success_kojnozout",
  "support_spam_fail_mia",
  "support_spam_fail_kojnozout"
]);

const SPECIAL_LOW = new Set([
  "loss_report_mia",
  "loss_report_kojnozout",
  "pet_loss_report_mia",
  "pet_loss_kojnozout",
  "sadness_report_mia",
  "sadness_report_kojnozout",
  "koj_evolution_legend",
  "mia_evolution_legend",
  "mia_solo_stream_deep",
  "mia_story_fallback",
  "mia_learned_voice_spicy",
  "koj_learned_voice_spicy",
  "support_big_mia",
  "support_big_kojnozout"
]);

const SPECIAL_MID = new Set([
  "koj_evolution_hatchling",
  "koj_evolution_sprout",
  "koj_evolution_guardian",
  "mia_evolution_hatchling",
  "mia_evolution_sprout",
  "mia_evolution_guardian",
  "support_full_bowl_mia",
  "support_full_bowl_kojnozout",
  "mia_solo_stream_story",
  "mia_solo_stream_beat",
  "emotion_stress_mia_health",
  "emotion_stress_mia_school",
  "emotion_stress_mia_finance"
]);

function targetFor(key) {
  if (HIGH_FREQ.has(key)) return 18;
  if (SPECIAL_LOW.has(key)) return 6;
  if (SPECIAL_MID.has(key)) return 8;
  if (
    key.includes("evolution_") ||
    key.includes("loss_") ||
    key.includes("sadness") ||
    key.includes("pet_loss")
  ) {
    return 7;
  }
  if (key.startsWith("support_big")) return 8;
  if (key.startsWith("support_medium")) return 12;
  if (key.startsWith("emotion_")) return 8;
  if (key.includes("returning")) return 10;
  if (key.includes("learned_voice")) return 8;
  if (key.includes("direct_") || key.includes("community_") || key.includes("milestone_")) {
    return 10;
  }
  if (key.startsWith("support_")) return 10;
  return 10;
}

function band(count) {
  if (count === 0) return "EMPTY";
  if (count <= 4) return "CRITICAL";
  if (count <= 9) return "LOW";
  if (count <= 14) return "OK";
  return "STRONG";
}

function fixPriority(chybi, key, stav) {
  if (stav === "EMPTY") return "P0";
  if (HIGH_FREQ.has(key) && chybi > 0) return "P1";
  if (stav === "CRITICAL") return "P1";
  if (stav === "LOW" && chybi >= 5) return "P2";
  if (chybi > 0) return "P3";
  return "—";
}

function tierLabel(key) {
  if (HIGH_FREQ.has(key)) return "HIGH (15–20)";
  if (SPECIAL_LOW.has(key) || SPECIAL_MID.has(key)) return "SPECIAL (5–10)";
  if (key.startsWith("support_medium")) return "MEDIUM (12)";
  if (key.startsWith("emotion_") || key.includes("evolution")) return "SPECIAL (7–8)";
  return "NORMAL (10)";
}

function runCoverageTest() {
  try {
    return execSync("npm run test:bank-coverage", {
      cwd: ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
  } catch (err) {
    const out = (err.stdout || "") + (err.stderr || "");
    return out || String(err.message || err);
  }
}

function main() {
  const { TEXT_BANK, TEXT_BANK_META, stats } = loadTextBank();
  const required = new Set(collectRequiredBankKeys());
  const allKeys = [...new Set([...Object.keys(TEXT_BANK), ...required])].sort();

  const rows = allKeys.map((key) => {
    const count = Array.isArray(TEXT_BANK[key]) ? TEXT_BANK[key].length : 0;
    const target = targetFor(key);
    const chybi = Math.max(0, target - count);
    const stav = band(count);
    return {
      key,
      count,
      target,
      chybi,
      stav,
      fix: fixPriority(chybi, key, stav),
      tier: tierLabel(key),
      required: required.has(key),
      speaker: TEXT_BANK_META[key]?.speaker || "—"
    };
  });

  const summary = {
    totalKeys: allKeys.length,
    requiredKeys: required.size,
    packVariants: stats.variants,
    packFiles: stats.packFiles,
    empty: rows.filter((r) => r.stav === "EMPTY").length,
    critical: rows.filter((r) => r.stav === "CRITICAL").length,
    low: rows.filter((r) => r.stav === "LOW").length,
    ok: rows.filter((r) => r.stav === "OK").length,
    strong: rows.filter((r) => r.stav === "STRONG").length,
    missingVariants: rows.reduce((s, r) => s + r.chybi, 0),
    atTarget: rows.filter((r) => r.chybi === 0).length
  };

  const p1 = rows.filter((r) => r.fix === "P1").sort((a, b) => b.chybi - a.chybi);
  const coverageOutput = runCoverageTest();

  const lines = [];
  lines.push("# TEXT BANK INVENTORY");
  lines.push("");
  lines.push("**Generováno:** read-only inventura (`node scripts/generate_text_bank_inventory.js`)");
  lines.push("**Feature freeze:** žádné texty zatím nedoplňovat — jen měření.");
  lines.push("");
  lines.push("## Souhrn");
  lines.push("");
  lines.push("| Metrika | Hodnota |");
  lines.push("|---------|---------|");
  lines.push(`| Pack souborů | ${summary.packFiles} |`);
  lines.push(`| Klíčů celkem | ${summary.totalKeys} |`);
  lines.push(`| Runtime required keys | ${summary.requiredKeys} |`);
  lines.push(`| Variant celkem | ${summary.packVariants} |`);
  lines.push(`| Na cíli (chybí 0) | ${summary.atTarget} |`);
  lines.push(`| Chybí variant celkem | **${summary.missingVariants}** |`);
  lines.push("");
  lines.push("### Stav podle pásem");
  lines.push("");
  lines.push("| Pásmo | Počet klíčů | Význam |");
  lines.push("|-------|-------------|--------|");
  lines.push(`| **EMPTY** (0) | ${summary.empty} | žádná varianta |`);
  lines.push(`| **CRITICAL** (1–4) | ${summary.critical} | nutné doplnit ASAP |`);
  lines.push(`| **LOW** (5–9) | ${summary.low} | pod cílem |`);
  lines.push(`| **OK** (10–14) | ${summary.ok} | běžné minimum splněno |`);
  lines.push(`| **STRONG** (15+) | ${summary.strong} | bohatá rotace |`);
  lines.push("");
  lines.push("### Cílové počty");
  lines.push("");
  lines.push("- **HIGH** (small gift, pozdrav, idle, spam…): **18** variant");
  lines.push("- **MEDIUM** (support_medium): **12**");
  lines.push("- **NORMAL** (většina direct/community): **10**");
  lines.push("- **SPECIAL** (grief, evolution, big gift…): **6–8**");
  lines.push("");
  lines.push("## P1 — nejdřív doplnit (HIGH freq + CRITICAL)");
  lines.push("");
  lines.push("| KEY | nyní | cíl | CHYBÍ | STAV | runtime |");
  lines.push("|-----|------|-----|-------|------|---------|");
  for (const r of p1) {
    lines.push(
      `| \`${r.key}\` | ${r.count} | ${r.target} | **${r.chybi}** | ${r.stav} | ${r.required ? "yes" : "pack-only"} |`
    );
  }
  lines.push("");
  lines.push("## Kompletní inventura (všechny klíče)");
  lines.push("");
  lines.push("| KEY | variants | cíl | CHYBÍ | STAV | tier | fix | RT |");
  lines.push("|-----|----------|-----|-------|------|------|-----|-----|");
  for (const r of rows) {
    lines.push(
      `| \`${r.key}\` | ${r.count} | ${r.target} | ${r.chybi} | ${r.stav} | ${r.tier} | ${r.fix} | ${r.required ? "✓" : ""} |`
    );
  }
  lines.push("");
  lines.push("## Runtime-only keys (required, 0 v packu)");
  lines.push("");
  const missing = rows.filter((r) => r.required && r.count === 0);
  if (missing.length === 0) {
    lines.push("_Žádné — všechny required keys mají alespoň 1 variantu._");
  } else {
    for (const r of missing) {
      lines.push(`- \`${r.key}\``);
    }
  }
  lines.push("");
  lines.push("## Pack-only keys (ne v runtime registry)");
  lines.push("");
  const packOnly = rows.filter((r) => !r.required);
  lines.push(`Počet: **${packOnly.length}** (expansion/legacy — doplnit až po domluvě)`);
  lines.push("");
  lines.push("## npm run test:bank-coverage");
  lines.push("");
  lines.push("```text");
  lines.push(coverageOutput.trim());
  lines.push("```");
  lines.push("");

  fs.writeFileSync(OUT, lines.join("\n"), "utf8");
  console.log(`Wrote ${OUT}`);
  console.log(JSON.stringify(summary, null, 2));
}

main();
