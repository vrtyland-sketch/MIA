"use strict";

const fs = require("fs");
const path = require("path");

const DEFAULT_ROOT = path.resolve(__dirname, "..", "text-bank", "packs");

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function normalizeVariant(text) {
  return safeString(text).replace(/\s+/g, " ").trim();
}

function dedupeVariants(list = []) {
  const seen = new Set();
  const out = [];

  for (const item of list) {
    const normalized = normalizeVariant(item);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized);
  }

  return out;
}

function isPackFile(filePath) {
  return filePath.endsWith(".json") && !path.basename(filePath).startsWith("_");
}

function walkJsonFiles(rootDir) {
  const files = [];

  if (!fs.existsSync(rootDir)) {
    return files;
  }

  const stack = [rootDir];
  while (stack.length > 0) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
        continue;
      }
      if (entry.isFile() && isPackFile(fullPath)) {
        files.push(fullPath);
      }
    }
  }

  return files.sort();
}

function readPackFile(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  let parsed;

  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(`Invalid JSON in text bank pack: ${filePath} (${err.message})`);
  }

  return parsed;
}

function extractEntriesFromPack(parsed, filePath) {
  if (!parsed || typeof parsed !== "object") {
    throw new Error(`Text bank pack must be an object: ${filePath}`);
  }

  if (parsed.key && Array.isArray(parsed.variants)) {
    return [[parsed.key, parsed]];
  }

  if (parsed.packs && typeof parsed.packs === "object") {
    return Object.entries(parsed.packs).map(([key, entry]) => {
      if (!entry || typeof entry !== "object") {
        throw new Error(`Invalid pack entry "${key}" in ${filePath}`);
      }
      return [key, { ...entry, key }];
    });
  }

  throw new Error(
    `Text bank pack must use { key, variants } or { packs: { ... } }: ${filePath}`
  );
}

function normalizeEntry(key, entry = {}) {
  const variants = Array.isArray(entry.variants)
    ? entry.variants.map(normalizeVariant).filter(Boolean)
    : [];

  return {
    key: safeString(entry.key, key),
    meta: entry.meta && typeof entry.meta === "object" ? { ...entry.meta } : {},
    variants
  };
}

function loadTextBank(options = {}) {
  const rootDir = safeString(options.rootDir, DEFAULT_ROOT);
  const files = walkJsonFiles(rootDir);
  const bank = {};
  const meta = {};
  const sources = {};

  for (const filePath of files) {
    const parsed = readPackFile(filePath);
    const entries = extractEntriesFromPack(parsed, filePath);

    for (const [key, entry] of entries) {
      const normalized = normalizeEntry(key, entry);
      if (normalized.variants.length === 0) continue;

      bank[normalized.key] = dedupeVariants([
        ...(bank[normalized.key] || []),
        ...normalized.variants
      ]);

      meta[normalized.key] = {
        ...(meta[normalized.key] || {}),
        ...normalized.meta,
        variantCount: bank[normalized.key].length
      };

      sources[normalized.key] = [...(sources[normalized.key] || []), filePath];
    }
  }

  return {
    TEXT_BANK: bank,
    TEXT_BANK_META: meta,
    TEXT_BANK_SOURCES: sources,
    stats: {
      packFiles: files.length,
      keys: Object.keys(bank).length,
      variants: Object.values(bank).reduce((sum, list) => sum + list.length, 0)
    }
  };
}

module.exports = {
  DEFAULT_ROOT,
  loadTextBank,
  dedupeVariants,
  walkJsonFiles
};
