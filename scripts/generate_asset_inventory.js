"use strict";

/**
 * READ-ONLY asset inventory → docs/ASSET_INVENTORY.md
 * Usage: node scripts/generate_asset_inventory.js
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "docs", "ASSET_INVENTORY.md");
const REGISTRY_PATH = path.join(ROOT, "content-pass", "ASSET_REGISTRY.json");

const ASSET_EXT = new Set([
  ".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg",
  ".mp4", ".webm", ".mov", ".avi", ".mkv",
  ".mp3", ".wav", ".ogg", ".m4a",
  ".html"
]);

const SCAN_ROOTS = [
  "incoming-images",
  "mia-output-overlay/assets",
  "mia-output-overlay/audio-cache",
  "mia-output-overlay/generated",
  "archive",
  "generated",
  "downloads"
];

const OVERLAY_HTML_DIR = path.join(ROOT, "mia-output-overlay");

const CODE_GLOBS = [
  path.join(ROOT, "index.js"),
  path.join(ROOT, "scripts"),
  path.join(ROOT, "shared"),
  path.join(ROOT, "mia-output-overlay"),
  path.join(ROOT, "config"),
  path.join(ROOT, "core"),
  path.join(ROOT, "routes"),
  path.join(ROOT, "tests")
];

const SKIP_DIR_NAMES = new Set([
  "node_modules",
  ".git",
  "_canon_import",
  "text-bank",
  "logs"
]);

function walkFiles(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    if (SKIP_DIR_NAMES.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walkFiles(p, out);
    else if (e.isFile()) {
      const ext = path.extname(e.name).toLowerCase();
      if (ASSET_EXT.has(ext)) out.push(p);
    }
  }
  return out;
}

function walkCodeFiles() {
  const files = [];
  function add(p) {
    if (!fs.existsSync(p)) return;
    const st = fs.statSync(p);
    if (st.isFile() && /\.(js|json|html|md|css)$/i.test(p)) files.push(p);
    else if (st.isDirectory()) {
      for (const e of fs.readdirSync(p, { withFileTypes: true })) {
        if (e.isDirectory() && !SKIP_DIR_NAMES.has(e.name)) add(path.join(p, e.name));
        else if (e.isFile() && /\.(js|json|html|md|css)$/i.test(e.name)) files.push(path.join(p, e.name));
      }
    }
  }
  for (const g of CODE_GLOBS) add(g);
  return files;
}

function md5File(filePath, maxBytes = 64 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash("md5");
    let bytes = 0;
    const stream = fs.createReadStream(filePath);
    stream.on("data", (chunk) => {
      bytes += chunk.length;
      if (bytes <= maxBytes) hash.update(chunk);
    });
    stream.on("end", () => resolve(hash.digest("hex")));
    stream.on("error", reject);
  });
}

function readPngDimensions(filePath) {
  try {
    const buf = Buffer.alloc(24);
    const fd = fs.openSync(filePath, "r");
    fs.readSync(fd, buf, 0, 24, 0);
    fs.closeSync(fd);
    if (buf.toString("ascii", 1, 4) !== "PNG") return null;
    return `${buf.readUInt32BE(16)}×${buf.readUInt32BE(20)}`;
  } catch {
    return null;
  }
}

function readJpegDimensions(filePath) {
  try {
    const buf = Buffer.alloc(512);
    const fd = fs.openSync(filePath, "r");
    const n = fs.readSync(fd, buf, 0, 512, 0);
    fs.closeSync(fd);
    if (buf[0] !== 0xff || buf[1] !== 0xd8) return null;
    let i = 2;
    while (i < n - 8) {
      if (buf[i] !== 0xff) break;
      const marker = buf[i + 1];
      const len = buf.readUInt16BE(i + 2);
      if ([0xc0, 0xc1, 0xc2].includes(marker)) {
        return `${buf.readUInt16BE(i + 7)}×${buf.readUInt16BE(i + 5)}`;
      }
      i += 2 + len;
    }
  } catch {
    /* ignore */
  }
  return null;
}

function imageDimensions(filePath, ext) {
  if (ext === ".png") return readPngDimensions(filePath);
  if (ext === ".jpg" || ext === ".jpeg") return readJpegDimensions(filePath);
  return null;
}

function formatBytes(n) {
  if (n >= 1024 ** 3) return `${(n / 1024 ** 3).toFixed(2)} GB`;
  if (n >= 1024 ** 2) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  if (n >= 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${n} B`;
}

function relPosix(p) {
  return path.relative(ROOT, p).split(path.sep).join("/");
}

function normalizeRef(s) {
  return s.replace(/\\/g, "/").toLowerCase();
}

function buildReferenceIndex(codeFiles) {
  const corpus = [];
  for (const f of codeFiles) {
    try {
      corpus.push(fs.readFileSync(f, "utf8"));
    } catch {
      /* skip */
    }
  }
  const joined = corpus.join("\n").toLowerCase();
  return {
    has(ref) {
      const r = normalizeRef(ref);
      if (joined.includes(r)) return true;
      const base = path.basename(ref).toLowerCase();
      return base.length > 4 && joined.includes(base);
    },
    findRefs(basename) {
      const hits = [];
      const b = basename.toLowerCase();
      for (let i = 0; i < corpus.length; i++) {
        if (corpus[i].toLowerCase().includes(b)) hits.push(codeFiles[i]);
      }
      return hits.slice(0, 2).map(relPosix);
    }
  };
}

function loadRegistry() {
  try {
    const j = JSON.parse(fs.readFileSync(REGISTRY_PATH, "utf8"));
    const map = new Map();
    for (const a of j.assets || []) {
      if (a.path) map.set(normalizeRef(a.path), a.id || "");
      if (a.file) map.set(normalizeRef(a.file), a.id || "");
    }
    return { raw: j, byPath: map };
  } catch {
    return { raw: { assets: [] }, byPath: new Map() };
  }
}

function basenameStem(name) {
  return name
    .replace(/\.[^.]+$/, "")
    .replace(/\s*\(\d+\)$/, "")
    .replace(/_\d{6,}$/, "")
    .toLowerCase();
}

function rollupGenerated(genRoot) {
  const out = { totalFiles: 0, totalBytes: 0, categories: [] };
  if (!fs.existsSync(genRoot)) return out;

  for (const cat of fs.readdirSync(genRoot, { withFileTypes: true })) {
    if (!cat.isDirectory()) continue;
    const catPath = path.join(genRoot, cat.name);
    const fileList = walkFiles(catPath, []);
    let count = 0;
    let bytes = 0;
    for (const f of fileList) {
      try {
        const st = fs.statSync(f);
        count++;
        bytes += st.size;
      } catch {
        /* skip */
      }
    }
    out.categories.push({
      name: cat.name,
      rel: relPosix(catPath),
      count,
      bytes
    });
    out.totalFiles += count;
    out.totalBytes += bytes;
  }
  out.categories.sort((a, b) => b.bytes - a.bytes);
  return out;
}

async function main() {
  const registry = loadRegistry();
  const codeFiles = walkCodeFiles();
  const refIndex = buildReferenceIndex(codeFiles);

  const files = [];
  for (const r of SCAN_ROOTS) {
    const rootPath = path.join(ROOT, r);
    if (r === "mia-output-overlay/generated") {
      continue; // handled separately as rollup only
    }
    walkFiles(rootPath, files);
  }

  const generatedRollup = rollupGenerated(path.join(ROOT, "mia-output-overlay", "generated"));

  for (const e of fs.readdirSync(OVERLAY_HTML_DIR, { withFileTypes: true })) {
    if (e.isFile() && e.name.endsWith(".html")) {
      files.push(path.join(OVERLAY_HTML_DIR, e.name));
    }
  }

  const unique = [...new Set(files.map((f) => path.resolve(f)))].sort();
  console.error(`Scanning ${unique.length} asset files…`);

  const records = [];
  const hashGroups = new Map();
  const sizeStemGroups = new Map();

  for (let i = 0; i < unique.length; i++) {
    const abs = unique[i];
    if (i > 0 && i % 10000 === 0) console.error(`  ${i}/${unique.length}…`);

    const rel = relPosix(abs);
    const ext = path.extname(abs).toLowerCase();
    let st;
    try {
      st = fs.statSync(abs);
    } catch {
      continue;
    }

    const type =
      [".mp4", ".webm", ".mov", ".avi", ".mkv"].includes(ext) ? "video" :
      [".mp3", ".wav", ".ogg", ".m4a"].includes(ext) ? "audio" :
      ext === ".html" ? "html-overlay" :
      ext === ".svg" ? "svg" : "image";

    const dimensions =
      type === "image" ? imageDimensions(abs, ext) || "—" : "—";

    const refs = [];
    if (refIndex.has(rel)) refs.push("code");
    const base = path.basename(abs);
    if (refIndex.has(base)) refs.push(...refIndex.findRefs(base));

    const registryId = registry.byPath.get(normalizeRef(rel)) || "—";
    const hasCodeRef = refs.length > 0;

    let status = hasCodeRef ? "ACTIVE" : registryId !== "—" ? "REGISTERED" : "ORPHAN";

    let hash = null;
    const isGenerated = rel.startsWith("mia-output-overlay/generated/");
    if (!isGenerated && st.size <= 50 * 1024 * 1024 && st.size > 0) {
      try {
        hash = await md5File(abs);
      } catch {
        hash = null;
      }
    }

    if (hash) {
      if (!hashGroups.has(hash)) hashGroups.set(hash, []);
      hashGroups.get(hash).push(rel);
    }

    const stem = basenameStem(base);
    const sizeStemKey = `${st.size}|${stem}`;
    if (!sizeStemGroups.has(sizeStemKey)) sizeStemGroups.set(sizeStemKey, []);
    sizeStemGroups.get(sizeStemKey).push(rel);

    records.push({
      rel,
      type,
      size: st.size,
      dimensions,
      refs: [...new Set(refs)].join("; ") || "—",
      registryId,
      status,
      hash
    });
  }

  const duplicateSets = [...hashGroups.values()].filter((g) => g.length > 1);
  const duplicatePaths = new Set(duplicateSets.flat());

  const possibleDupPaths = new Set();
  for (const g of sizeStemGroups.values()) {
    if (g.length > 1 && new Set(g.map((p) => path.basename(p))).size > 1) {
      for (const p of g) possibleDupPaths.add(p);
    }
  }

  for (const r of records) {
    if (r.hash && duplicatePaths.has(r.rel)) {
      const group = hashGroups.get(r.hash);
      if (group && group.length > 1) r.status = "DUPLICATE";
    } else if (possibleDupPaths.has(r.rel) && (r.status === "ORPHAN" || r.status === "REGISTERED")) {
      r.status = "POSSIBLE-DUPLICATE";
    }
  }

  const missing = [];
  for (const [p] of registry.byPath.entries()) {
    const abs = path.join(ROOT, p.replace(/^\//, ""));
    if (!fs.existsSync(abs)) missing.push(p);
  }

  const mediaRefRe = /(?:incoming-images|\/assets\/|mia-output-overlay\/)[^\s"'`<>]+\.(?:png|jpe?g|webp|gif|mp4|webm|mp3|wav|html)/gi;
  const joinedCode = codeFiles.map((f) => {
    try { return fs.readFileSync(f, "utf8"); } catch { return ""; }
  }).join("\n");
  const missingFromCode = [];
  const seenMissing = new Set();
  let match;
  while ((match = mediaRefRe.exec(joinedCode)) !== null) {
    const ref = match[0].replace(/\\/g, "/");
    if (seenMissing.has(ref)) continue;
    seenMissing.add(ref);
    const candidates = [
      path.join(ROOT, ref.replace(/^\//, "")),
      path.join(ROOT, "mia-output-overlay", ref.replace(/^\//, ""))
    ];
    if (ref.startsWith("/assets/")) candidates.push(path.join(ROOT, "mia-output-overlay", ref.slice(1)));
    if (!candidates.some((c) => fs.existsSync(c))) missingFromCode.push(ref);
  }

  const statusCounts = {};
  for (const r of records) statusCounts[r.status] = (statusCounts[r.status] || 0) + 1;

  const dirSizes = new Map();
  for (const r of records) {
    const parts = r.rel.split("/");
    const top = parts.length >= 2 ? `${parts[0]}/${parts[1]}` : parts[0];
    dirSizes.set(top, (dirSizes.get(top) || 0) + r.size);
  }
  const topDirs = [...dirSizes.entries()].sort((a, b) => b[1] - a[1]);

  const totalBytes =
    records.reduce((s, r) => s + r.size, 0) + generatedRollup.totalBytes;
  const totalFiles = records.length + generatedRollup.totalFiles;
  const registryAssets = registry.raw.assets || [];

  const primaryRecords = records;

  const orphanGenerated = generatedRollup.totalFiles;
  const orphanPrimary = statusCounts.ORPHAN || 0;

  const lines = [];
  lines.push("# ASSET INVENTORY");
  lines.push("");
  lines.push("**Generováno:** read-only inventura (`node scripts/generate_asset_inventory.js`)");
  lines.push("**Feature freeze:** žádné přesuny/mazání — jen měření.");
  lines.push("");
  lines.push("## Souhrn");
  lines.push("");
  lines.push("| Metrika | Hodnota |");
  lines.push("|---------|---------|");
  lines.push(`| Souborů celkem | **${totalFiles.toLocaleString()}** |`);
  lines.push(`| Primární (bez \`generated/\`) | **${primaryRecords.length.toLocaleString()}** |`);
  lines.push(`| \`generated/\` subtree | **${generatedRollup.totalFiles.toLocaleString()}** |`);
  lines.push(`| Objem celkem | **${formatBytes(totalBytes)}** |`);
  lines.push(`| ACTIVE | **${statusCounts.ACTIVE || 0}** |`);
  lines.push(`| REGISTERED | **${statusCounts.REGISTERED || 0}** |`);
  lines.push(`| ORPHAN (primární) | **${orphanPrimary}** |`);
  lines.push(`| ORPHAN (\`generated/\` rollup) | **${orphanGenerated.toLocaleString()}** |`);
  lines.push(`| ORPHAN celkem (odhad) | **${(orphanPrimary + orphanGenerated).toLocaleString()}** |`);
  lines.push(`| DUPLICATE | **${statusCounts.DUPLICATE || 0}** |`);
  lines.push(`| POSSIBLE-DUPLICATE | **${statusCounts["POSSIBLE-DUPLICATE"] || 0}** |`);
  lines.push(`| MISSING (registry) | **${missing.length}** |`);
  lines.push(`| MISSING (code ref) | **${missingFromCode.length}** |`);
  lines.push("");
  lines.push("### Registry vs realita");
  lines.push("");
  lines.push("| Položka | Hodnota |");
  lines.push("|---------|---------|");
  lines.push(`| \`ASSET_REGISTRY.json\` status | \`${registry.raw.status || "?"}\` |`);
  lines.push(`| Položek v \`assets[]\` | **${registryAssets.length}** |`);
  lines.push(`| Mapování soubor → registry ID | **0%** (draft, prázdné \`assets\`) |`);
  lines.push("");
  lines.push("### Největší adresáře");
  lines.push("");
  lines.push("| Adresář | Souborů | Objem |");
  lines.push("|---------|---------|-------|");
  for (const [d, sz] of topDirs.slice(0, 12)) {
    if (d.startsWith("mia-output-overlay/generated")) continue;
    const cnt = records.filter((r) => {
      const top = r.rel.split("/").slice(0, 2).join("/");
      return top === d;
    }).length;
    lines.push(`| \`${d}/\` | ${cnt.toLocaleString()} | ${formatBytes(sz)} |`);
  }
  if (generatedRollup.totalFiles) {
    lines.push(`| \`mia-output-overlay/generated/\` | ${generatedRollup.totalFiles.toLocaleString()} | ${formatBytes(generatedRollup.totalBytes)} |`);
  }
  lines.push("");
  lines.push("### DUPLICATE skupiny (MD5, top 15 by velikost souboru)");
  lines.push("");
  const dupSorted = duplicateSets
    .map((g) => ({ g, sz: records.find((r) => r.rel === g[0])?.size || 0 }))
    .sort((a, b) => b.sz - a.sz)
    .slice(0, 15);
  for (const { g, sz } of dupSorted) {
    lines.push(`- **${g.length}×** ${formatBytes(sz)} — \`${g[0]}\` (+${g.length - 1} kopie)`);
  }
  if (!dupSorted.length) lines.push("_Žádné binární duplicity._");
  lines.push("");

  if (missingFromCode.length) {
    lines.push("### MISSING — kód odkazuje, soubor neexistuje");
    lines.push("");
    for (const ref of missingFromCode.slice(0, 25)) lines.push(`- \`${ref}\``);
    if (missingFromCode.length > 25) lines.push(`- … +${missingFromCode.length - 25} dalších`);
    lines.push("");
  }

  lines.push("## `mia-output-overlay/generated/` — rollup (assetový hřbitov?)");
  lines.push("");
  lines.push(`**${generatedRollup.totalFiles.toLocaleString()}** souborů · **${formatBytes(generatedRollup.totalBytes)}** — kategorie níže (bez řádkové tabulky per job).`);
  lines.push("");
  lines.push("| Kategorie (`generated/<cat>/`) | Počet | Objem | Poznámka |");
  lines.push("|---------|-------|-------|----------|");
  for (const c of generatedRollup.categories) {
    const note =
      c.name === "eyes" ? "101k+ PNG cache — hlavní hřbitov (~12 GB)" :
      c.name === "gift-animations" ? "runtime job výstupy" : "—";
    lines.push(`| \`${c.name}/\` | ${c.count.toLocaleString()} | ${formatBytes(c.bytes)} | ${note} |`);
  }
  lines.push("");

  lines.push("## Kompletní inventura — primární assety");
  lines.push("");
  lines.push("Bez `mia-output-overlay/generated/*`. Sloupce: PATH | TYPE | SIZE | DIM | RUNTIME REF | REGISTRY ID | STATUS");
  lines.push("");
  lines.push("| PATH | TYPE | SIZE | DIM/DUR | RUNTIME REF | REGISTRY ID | STATUS |");
  lines.push("|------|------|------|---------|-------------|-------------|--------|");
  for (const r of primaryRecords.sort((a, b) => a.rel.localeCompare(b.rel))) {
    const refShort = r.refs.length > 50 ? r.refs.slice(0, 47) + "…" : r.refs;
    lines.push(`| \`${r.rel}\` | ${r.type} | ${formatBytes(r.size)} | ${r.dimensions} | ${refShort} | ${r.registryId} | **${r.status}** |`);
  }

  fs.writeFileSync(OUT, lines.join("\n") + "\n", "utf8");
  console.log(JSON.stringify({
    total: totalFiles,
    primary: primaryRecords.length,
    generated: generatedRollup.totalFiles,
    totalGB: (totalBytes / 1024 ** 3).toFixed(2),
    statusCounts,
    missingCode: missingFromCode.length,
    duplicateGroups: duplicateSets.length,
    out: OUT
  }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
