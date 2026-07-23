"use strict";

/**
 * Propojí config/tiktok-gift-panel-intake.json → gift_aliases.json
 * (CZ názvy z TikTok panelu; coiny jen interní reference, overlay je neukazuje).
 */

const fs = require("fs");
const path = require("path");

const PROJECT_ROOT = path.resolve(__dirname, "..");
const INTAKE_PATH = path.join(PROJECT_ROOT, "config", "tiktok-gift-panel-intake.json");
const ALIASES_PATH = path.join(PROJECT_ROOT, "shared", "gifts", "gift_map", "gift_aliases.json");
const REF_PATH = path.join(PROJECT_ROOT, "config", "tiktok-gift-panel-reference.json");

function normalizeAlias(value = "") {
  return String(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function uniqueAliases(list = []) {
  const seen = new Set();
  const out = [];
  for (const raw of list) {
    const alias = String(raw).trim();
    if (!alias) continue;
    const key = normalizeAlias(alias);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(alias);
  }
  return out;
}

function main() {
  if (!fs.existsSync(INTAKE_PATH)) {
    console.error(JSON.stringify({ ok: false, reason: "intake_missing" }));
    process.exitCode = 1;
    return;
  }

  const intake = JSON.parse(fs.readFileSync(INTAKE_PATH, "utf8"));
  const aliasesDoc = JSON.parse(fs.readFileSync(ALIASES_PATH, "utf8"));
  const aliasMap = aliasesDoc.aliases || {};

  const panelRef = [];
  let merged = 0;
  let skipped = 0;

  for (const gift of intake.gifts || []) {
    const label = String(gift.label || "").trim();
    if (!label) continue;

    panelRef.push({
      label,
      labelEn: gift.labelEn || null,
      coins: gift.coins,
      streamTier: gift.streamTier,
      catalogKey: gift.catalogKey || null,
      note: gift.note || null
    });

    const catalogKey = gift.catalogKey;
    if (!catalogKey) {
      skipped += 1;
      continue;
    }

    if (!aliasMap[catalogKey]) {
      aliasMap[catalogKey] = [];
    }

    const before = aliasMap[catalogKey].length;
    aliasMap[catalogKey] = uniqueAliases([...aliasMap[catalogKey], label]);
    if (gift.labelEn) {
      aliasMap[catalogKey] = uniqueAliases([...aliasMap[catalogKey], gift.labelEn]);
    }
    if (aliasMap[catalogKey].length > before) merged += 1;
  }

  aliasesDoc.aliases = aliasMap;
  aliasesDoc.updatedAt = new Date().toISOString();
  fs.writeFileSync(ALIASES_PATH, JSON.stringify(aliasesDoc, null, 2), "utf8");

  const refPayload = {
    version: 1,
    updatedAt: new Date().toISOString(),
    purpose: "tiktok_panel_coin_reference",
    note: "Interní reference z TikTok LIVE panelu — overlay nikdy neukazuje coiny.",
    tierFromCoins: intake.tierFromCoins || null,
    gifts: panelRef
  };
  fs.writeFileSync(REF_PATH, JSON.stringify(refPayload, null, 2), "utf8");

  console.log(
    JSON.stringify(
      {
        ok: true,
        aliasesPath: ALIASES_PATH,
        referencePath: REF_PATH,
        panelGifts: panelRef.length,
        aliasRowsMerged: merged,
        skippedNoCatalogKey: skipped
      },
      null,
      2
    )
  );
}

if (require.main === module) {
  main();
}

module.exports = { main };
