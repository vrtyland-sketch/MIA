"use strict";

/**
 * MIA_TEXT_BANK.js
 *
 * Modulární text banka — načítá balíčky z text-bank/packs/ (rekurzivně .json)
 * Starý monolitický obsah: scripts/MIA_TEXT_BANK_LEGACY_INLINE.js (export)
 *
 * Přidávání textů:
 * - edituj existující pack v text-bank/packs/
 * - nebo přidej nový .json (stejný formát)
 * - loader sloučí varianty pod stejným klíčem a deduplikuje
 */

const { loadTextBank } = require("./MIA_TEXT_BANK_LOADER");

const loaded = loadTextBank();

module.exports = {
  TEXT_BANK: loaded.TEXT_BANK,
  TEXT_BANK_META: loaded.TEXT_BANK_META,
  TEXT_BANK_SOURCES: loaded.TEXT_BANK_SOURCES,
  TEXT_BANK_STATS: loaded.stats,
  loadTextBank
};
