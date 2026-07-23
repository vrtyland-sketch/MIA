"use strict";

/**
 * Audit gift-mapping + ingest logs → report names that still resolve to GENERIC.
 * Usage: npm run gift-map:audit-logs
 */

const fs = require("fs");
const path = require("path");
const gifts = require("../shared/gifts");

const ROOT = path.resolve(__dirname, "..");
const LOGS_DIR = path.join(ROOT, "logs");

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function listLogFiles(prefix) {
  if (!fs.existsSync(LOGS_DIR)) return [];
  return fs
    .readdirSync(LOGS_DIR)
    .filter((name) => name.startsWith(prefix) && name.endsWith(".jsonl"))
    .map((name) => path.join(LOGS_DIR, name))
    .sort();
}

function extractGiftName(row = {}) {
  return (
    safeString(row.giftName) ||
    safeString(row.rawEvent?.giftName) ||
    safeString(row.rawEvent?.gift?.name) ||
    safeString(row.support?.giftName) ||
    ""
  );
}

function collectNamesFromLogs(files = []) {
  const counts = new Map();
  for (const file of files) {
    for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
      if (!line.trim()) continue;
      try {
        const row = JSON.parse(line);
        const name = extractGiftName(row);
        if (!name) continue;
        counts.set(name, (counts.get(name) || 0) + 1);
      } catch {
        /* ignore bad lines */
      }
    }
  }
  return counts;
}

function auditNames(nameCounts = new Map()) {
  const mapped = [];
  const generic = [];
  const byKey = new Map();

  for (const [name, count] of nameCounts.entries()) {
    const giftKey = gifts.normalizeGiftKey(name);
    const row = { name, count, giftKey };
    if (giftKey === "GENERIC") {
      generic.push(row);
    } else {
      mapped.push(row);
      if (!byKey.has(giftKey)) byKey.set(giftKey, []);
      byKey.get(giftKey).push(row);
    }
  }

  mapped.sort((a, b) => b.count - a.count);
  generic.sort((a, b) => b.count - a.count);

  return { mapped, generic, byKey };
}

function main() {
  const mappingFiles = listLogFiles("gift-mapping-");
  const ingestFiles = listLogFiles("ingest-");

  const mappingCounts = collectNamesFromLogs(mappingFiles);
  const ingestCounts = collectNamesFromLogs(ingestFiles);

  const merged = new Map(mappingCounts);
  for (const [name, count] of ingestCounts.entries()) {
    merged.set(name, (merged.get(name) || 0) + count);
  }

  const audit = auditNames(merged);
  const coverage =
    audit.mapped.length + audit.generic.length > 0
      ? Math.round(
          (audit.mapped.length / (audit.mapped.length + audit.generic.length)) * 1000
        ) / 10
      : 100;

  const report = {
    ok: audit.generic.length === 0,
    generatedAt: new Date().toISOString(),
    sources: {
      giftMappingFiles: mappingFiles.length,
      ingestFiles: ingestFiles.length,
      uniqueNames: merged.size
    },
    coveragePercent: coverage,
    mapped: audit.mapped.slice(0, 40),
    generic: audit.generic,
    catalogKeys:
      typeof gifts.listCatalogKeys === "function" ? gifts.listCatalogKeys().length : null
  };

  console.log(JSON.stringify(report, null, 2));

  if (audit.generic.length) {
    console.error(
      `\n⚠ ${audit.generic.length} gift name(s) still map to GENERIC — add aliases in shared/gifts/gift_map/gift_aliases.json`
    );
    process.exit(1);
  }

  console.log(`\n✓ All ${merged.size} logged gift names resolve to catalog keys.`);
}

if (require.main === module) {
  main();
}

module.exports = {
  collectNamesFromLogs,
  auditNames,
  extractGiftName
};
