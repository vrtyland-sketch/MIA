"use strict";

/**
 * ASSET INVENTORY 02 — CLASSIFY ONLY (read-only)
 * → docs/ASSET_INVENTORY_02_CLASSIFY.md
 * Usage: node scripts/generate_asset_classify.js
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "docs", "ASSET_INVENTORY_02_CLASSIFY.md");

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
  "node_modules", ".git", "_canon_import", "text-bank", "logs"
]);

const GENERATOR_SCRIPTS = {
  "generated/eyes": {
    writers: ["scripts/MIA_EYES.js"],
    callers: [
      "routes/eyes.js",
      "scripts/MIA_OBS_VISION.js",
      "scripts/mia_guided_walkthrough.js",
      "scripts/obs_apply_away_eyes.js",
      "scripts/MIA_MATTING_INGEST_BRIDGE.js"
    ],
    runtime: true,
    cache: true,
    retention: "none — write-only, no cleanup in codebase"
  },
  "generated/gifts": {
    writers: [
      "shared/mia-gift-animation/proceduralRenderer.js",
      "scripts/MIA_GIFT_VISUAL_COMPOSER.js",
      "scripts/MIA_STORY_ANIMATION_ENGINE.js",
      "scripts/MIA_MEDIA_TEMPLATE_RENDERER.js"
    ],
    subdirs: ["gift-animations", "gift-moments", "story-moments", "media-templates"],
    runtime: true,
    cache: "partial — job outputs, may be re-generated",
    retention: "none found"
  },
  "audio": {
    writers: ["scripts/MIA_TTS_ENGINE.js"],
    runtime: true,
    cache: true,
    retention: "none found"
  }
};

function relPosix(abs) {
  return path.relative(ROOT, abs).split(path.sep).join("/");
}

function formatBytes(n) {
  if (n >= 1024 ** 3) return `${(n / 1024 ** 3).toFixed(2)} GB`;
  if (n >= 1024 ** 2) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  if (n >= 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${n} B`;
}

function formatDate(ms) {
  if (!ms) return "—";
  return new Date(ms).toISOString().slice(0, 19).replace("T", " ");
}

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
        else if (e.isFile() && /\.(js|json|html|md|css)$/i.test(e.name)) {
          files.push(path.join(p, e.name));
        }
      }
    }
  }
  for (const g of CODE_GLOBS) add(g);
  return files;
}

function normalizeRef(s) {
  return s.replace(/\\/g, "/").replace(/^\.\//, "").replace(/^\/+/, "");
}

function assetExists(ref) {
  const r = normalizeRef(ref);
  const candidates = [
    path.join(ROOT, r),
    path.join(ROOT, "mia-output-overlay", r),
    path.join(ROOT, "mia-output-overlay", r.replace(/^assets\//, "assets/"))
  ];
  if (r.startsWith("/assets/")) candidates.push(path.join(ROOT, "mia-output-overlay", r.slice(1)));
  if (r.startsWith("assets/")) candidates.push(path.join(ROOT, "mia-output-overlay", r));
  return candidates.some((c) => fs.existsSync(c));
}

function buildReferenceIndex(codeFiles) {
  const byPath = new Map();
  const byBasename = new Map();
  const mediaRe =
    /(?:incoming-images|\/assets\/|mia-output-overlay\/|\/generated\/|\/audio-cache\/)[^\s"'`<>]+\.(?:png|jpe?g|webp|gif|svg|mp4|webm|mov|mp3|wav|ogg|m4a|html)/gi;

  for (const file of codeFiles) {
    let content;
    try {
      content = fs.readFileSync(file, "utf8");
    } catch {
      continue;
    }
    const relFile = relPosix(file);
    let m;
    mediaRe.lastIndex = 0;
    while ((m = mediaRe.exec(content)) !== null) {
      const ref = normalizeRef(m[0]);
      if (!byPath.has(ref)) byPath.set(ref, new Set());
      byPath.get(ref).add(relFile);
      const base = path.basename(ref);
      if (!byBasename.has(base)) byBasename.set(base, new Set());
      byBasename.get(base).add(relFile);
    }
  }
  return { byPath, byBasename };
}

function classifyOrphan(rel) {
  const r = rel.replace(/\\/g, "/");

  if (r.includes("mia-output-overlay/generated/eyes/") || r.endsWith("/generated/eyes")) {
    return "generated/eyes";
  }
  if (
    r.includes("mia-output-overlay/generated/gift-") ||
    r.includes("mia-output-overlay/generated/story-moments/") ||
    r.includes("mia-output-overlay/generated/media-templates/")
  ) {
    return "generated/gifts";
  }
  if (r.includes("mia-output-overlay/audio-cache/")) return "audio";
  if (/\.(mp3|wav|ogg|m4a)$/i.test(r) && !r.includes("audio-cache")) return "audio";
  if (
    r.includes("mia-output-overlay/assets/") ||
    r.endsWith(".html") && r.includes("mia-output-overlay/")
  ) {
    return "overlay";
  }
  if (r.startsWith("archive/")) return "legacy";
  if (
    r.includes("incoming-images/videos") ||
    /\.(mp4|webm|mov|avi|mkv)$/i.test(r)
  ) {
    return "video";
  }
  if (r.startsWith("downloads/") || r.includes("/generated/") && !r.includes("mia-output-overlay/generated")) {
    return "temp/cache";
  }
  if (r.includes("mia-output-overlay/generated/")) return "generated/gifts";
  return "unknown";
}

function isGeneratedByScript(group) {
  return ["generated/eyes", "generated/gifts", "audio"].includes(group);
}

function branchForGroup(group) {
  if (group === "generated/eyes" || group === "temp/cache" || group === "audio") {
    return "A — cache/temp (automatický cleanup kandidát)";
  }
  if (group === "generated/gifts") return "A/B — runtime výstupy; část cache, část content";
  if (group === "overlay" || group === "video" || group === "legacy") {
    return "B — content asset (registry ID)";
  }
  return "TBD";
}

function md5FileSync(filePath, maxBytes = 512 * 1024) {
  const hash = crypto.createHash("md5");
  const buf = Buffer.allocUnsafe(Math.min(maxBytes, fs.statSync(filePath).size));
  const fd = fs.openSync(filePath, "r");
  try {
    const n = fs.readSync(fd, buf, 0, buf.length, 0);
    hash.update(buf.subarray(0, n));
  } finally {
    fs.closeSync(fd);
  }
  return hash.digest("hex");
}

function analyzeEyesDir(eyesDir, refIndex) {
  const stats = {
    count: 0,
    bytes: 0,
    oldest: Infinity,
    newest: 0,
    sourcePrefixes: new Map(),
    sizeGroups: new Map(),
    codeRefBasenames: 0
  };

  if (!fs.existsSync(eyesDir)) return stats;

  const files = walkFiles(eyesDir, []);
  for (const abs of files) {
    const st = fs.statSync(abs);
    const base = path.basename(abs);
    stats.count++;
    stats.bytes += st.size;
    stats.oldest = Math.min(stats.oldest, st.mtimeMs);
    stats.newest = Math.max(stats.newest, st.mtimeMs);

    const m = base.match(/^eyes-(.+)-(\d+)\.(png|jpg|jpeg|webp)$/i);
    const prefix = m ? m[1] : base.replace(/\.\w+$/, "");
    stats.sourcePrefixes.set(prefix, (stats.sourcePrefixes.get(prefix) || 0) + 1);

    if (!stats.sizeGroups.has(st.size)) stats.sizeGroups.set(st.size, []);
    stats.sizeGroups.get(st.size).push(abs);

    if (refIndex.byBasename.has(base)) stats.codeRefBasenames++;
  }

  let duplicateFiles = 0;
  let uniqueByPartialHash = 0;
  const partialHashGroups = new Map();

  for (const [, group] of stats.sizeGroups) {
    if (group.length === 1) {
      uniqueByPartialHash++;
      continue;
    }
    const hashBuckets = new Map();
    for (const abs of group) {
      let h;
      try {
        h = md5FileSync(abs);
      } catch {
        continue;
      }
      if (!hashBuckets.has(h)) hashBuckets.set(h, []);
      hashBuckets.get(h).push(abs);
    }
    for (const bucket of hashBuckets.values()) {
      uniqueByPartialHash++;
      if (bucket.length > 1) duplicateFiles += bucket.length;
    }
  }

  const topSources = [...stats.sourcePrefixes.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15);

  return {
    ...stats,
    duplicateFiles,
    uniqueByPartialHash,
    uniqueFilenames: stats.count,
    topSources,
    sizeGroupsWithDupes: [...stats.sizeGroups.values()].filter((g) => g.length > 1).length
  };
}

function findMissingRefs(codeFiles) {
  const mediaRefRe =
    /(?:incoming-images|\/assets\/|mia-output-overlay\/|\/generated\/|\/audio-cache\/)[^\s"'`<>]+\.(?:png|jpe?g|webp|gif|svg|mp4|webm|mov|mp3|wav|ogg|m4a|html)/gi;
  const rows = [];
  const seen = new Set();

  for (const file of codeFiles) {
    let content;
    try {
      content = fs.readFileSync(file, "utf8");
    } catch {
      continue;
    }
    const relFile = relPosix(file);
    const lines = content.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      mediaRefRe.lastIndex = 0;
      let m;
      while ((m = mediaRefRe.exec(line)) !== null) {
        const ref = normalizeRef(m[0]);
        const key = `${relFile}:${i + 1}:${ref}`;
        if (seen.has(key)) continue;
        seen.add(key);
        if (!assetExists(ref)) {
          rows.push({
            codePath: `${relFile}:${i + 1}`,
            missingAsset: ref,
            isTemplate: /\$\{/.test(ref)
          });
        }
      }
    }
  }

  rows.sort((a, b) => a.codePath.localeCompare(b.codePath));
  return rows;
}

async function main() {
  console.error("Building code reference index…");
  const codeFiles = walkCodeFiles();
  const refIndex = buildReferenceIndex(codeFiles);

  console.error("Scanning asset files…");
  const allFiles = [];
  for (const r of SCAN_ROOTS) walkFiles(path.join(ROOT, r), allFiles);
  for (const e of fs.readdirSync(path.join(ROOT, "mia-output-overlay"), { withFileTypes: true })) {
    if (e.isFile() && e.name.endsWith(".html")) {
      allFiles.push(path.join(ROOT, "mia-output-overlay", e.name));
    }
  }

  const unique = [...new Set(allFiles.map((f) => path.resolve(f)))];
  const orphans = [];
  const active = [];

  for (const abs of unique) {
    const rel = relPosix(abs);
    let st;
    try {
      st = fs.statSync(abs);
    } catch {
      continue;
    }

    const base = path.basename(abs);
    const refs = new Set();
    if (refIndex.byPath.has(rel)) for (const x of refIndex.byPath.get(rel)) refs.add(x);
    if (refIndex.byPath.has(`/${rel}`)) for (const x of refIndex.byPath.get(`/${rel}`)) refs.add(x);
    if (refIndex.byBasename.has(base)) for (const x of refIndex.byBasename.get(base)) refs.add(x);

    const row = { rel, size: st.size, mtime: st.mtimeMs, refs: [...refs] };
    if (refs.size > 0) active.push(row);
    else orphans.push(row);
  }

  const groups = new Map();
  for (const g of [
    "generated/eyes", "generated/gifts", "overlay", "video",
    "audio", "legacy", "temp/cache", "unknown"
  ]) {
    groups.set(g, { count: 0, bytes: 0, oldest: Infinity, newest: 0, codeRef: 0, generated: isGeneratedByScript(g) });
  }

  for (const o of orphans) {
    const g = classifyOrphan(o.rel);
    if (!groups.has(g)) groups.set(g, { count: 0, bytes: 0, oldest: Infinity, newest: 0, codeRef: 0, generated: false });
    const bucket = groups.get(g);
    bucket.count++;
    bucket.bytes += o.size;
    bucket.oldest = Math.min(bucket.oldest, o.mtime);
    bucket.newest = Math.max(bucket.newest, o.mtime);
  }

  const unknownSamples = orphans
    .filter((o) => classifyOrphan(o.rel) === "unknown")
    .slice(0, 20)
    .map((o) => o.rel);

  for (const a of active) {
    const g = classifyOrphan(a.rel);
    if (groups.has(g)) groups.get(g).codeRef += 1;
  }

  console.error("Analyzing generated/eyes…");
  const eyesAnalysis = analyzeEyesDir(
    path.join(ROOT, "mia-output-overlay", "generated", "eyes"),
    refIndex
  );

  console.error("Finding missing code refs…");
  const missingRows = findMissingRefs(codeFiles);

  const totalOrphan = orphans.length;
  const totalOrphanBytes = orphans.reduce((s, o) => s + o.size, 0);

  const lines = [];
  lines.push("# ASSET INVENTORY 02 — CLASSIFY");
  lines.push("");
  lines.push("**Režim:** CLASSIFY ONLY — žádné mazání, přesuny ani generování.");
  lines.push("**Generováno:** `node scripts/generate_asset_classify.js`");
  lines.push("");
  lines.push("## Executive summary");
  lines.push("");
  lines.push(`- **ORPHAN celkem:** ${totalOrphan.toLocaleString()} souborů · ${formatBytes(totalOrphanBytes)}`);
  lines.push(`- **ACTIVE (má code ref):** ${active.length.toLocaleString()}`);
  lines.push(`- **Hlavní sediment:** \`generated/eyes/\` = ${eyesAnalysis.count.toLocaleString()} souborů (${formatBytes(eyesAnalysis.bytes)})`);
  lines.push("- **Registry:** `ASSET_REGISTRY.json` stále prázdný — klasifikace je filesystem + code grep");
  lines.push("- **Doporučené větve:** A = cache/temp · B = content → registry");
  lines.push("");
  lines.push("## ORPHAN klasifikace");
  lines.push("");
  lines.push("| Skupina | COUNT | SIZE | oldest | newest | referenced-by-code? | generated-by-script? | Větev |");
  lines.push("|---------|-------|------|--------|--------|---------------------|----------------------|-------|");

  for (const [name, g] of groups) {
    if (g.count === 0 && g.codeRef === 0) continue;
    lines.push(
      `| \`${name}\` | ${g.count.toLocaleString()} | ${formatBytes(g.bytes)} | ${formatDate(g.oldest)} | ${formatDate(g.newest)} | ${g.codeRef > 0 ? `ano (${g.codeRef} ACTIVE v kategorii)` : "ne"} | ${g.generated ? "**ano**" : "ne"} | ${branchForGroup(name)} |`
    );
  }

  lines.push("");
  lines.push("### Poznámky ke skupinám");
  lines.push("");
  lines.push("- **`generated/eyes`** — OBS screenshot cache z MIA Eyes (`captureScreenshot`, default `save: true`). Každý tick/endpoint = nový PNG s timestampem.");
  lines.push("- **`generated/gifts`** — `gift-animations/`, `gift-moments/`, `story-moments/`, `media-templates/` z procedural/story/template rendererů.");
  lines.push("- **`audio`** — `mia-output-overlay/audio-cache/` (TTS MP3 z `MIA_TTS_ENGINE.js`); ORPHAN = staré hlasy bez aktuální reference.");
  lines.push("- **`overlay`** — `mia-output-overlay/assets/` a root HTML overlaye bez přímé code cesty.");
  lines.push("- **`video`** — `incoming-images/videos*` + root video soubory.");
  lines.push("- **`legacy`** — `archive/deprecated/` — historický obsah.");
  if (unknownSamples.length) {
    lines.push(`- **unknown** — ${groups.get("unknown")?.count || 0} souborů mimo pravidla (viz vzorky níže).`);
  }
  lines.push("");
  if (unknownSamples.length) {
    lines.push("### `unknown` — vzorky cest");
    lines.push("");
    for (const s of unknownSamples) lines.push(`- \`${s}\``);
    lines.push("");
  }
  lines.push("## A vs B — rozhodovací matice");
  lines.push("");
  lines.push("| Větev | Skupiny | Akce (až po schválení) |");
  lines.push("|-------|---------|------------------------|");
  lines.push("| **A** cache/temp | `generated/eyes`, `audio-cache`, část `generated/gifts` | retention policy + automatický cleanup |");
  lines.push("| **B** content | `overlay`, `video`, `legacy`, unikátní gift outputs | `ASSET_REGISTRY.json` ID + audit ACTIVE |");
  lines.push("");
  lines.push("## Deep dive: `generated/eyes/`");
  lines.push("");
  const gen = GENERATOR_SCRIPTS["generated/eyes"];
  lines.push("| Otázka | Odpověď |");
  lines.push("|--------|---------|");
  lines.push(`| Který skript vytváří? | \`${gen.writers.join("`, `")}\` |`);
  lines.push(`| Kdo volá (runtime)? | ${gen.callers.map((c) => `\`${c}\``).join(", ")} |`);
  lines.push("| Generuje se za běhu? | **Ano** — OBS `GetSourceScreenshot` → `fs.writeFileSync` |");
  lines.push("| Je to cache? | **Ano** — diagnostické screenshoty scény/zdrojů |");
  lines.push(`| Retention/cleanup? | **${gen.retention}** |`);
  lines.push(`| Souborů | **${eyesAnalysis.count.toLocaleString()}** |`);
  lines.push(`| Objem | **${formatBytes(eyesAnalysis.bytes)}** |`);
  lines.push(`| Nejstarší | ${formatDate(eyesAnalysis.oldest)} |`);
  lines.push(`| Nejnovější | ${formatDate(eyesAnalysis.newest)} |`);
  lines.push(`| Unikátních jmen souborů | ${eyesAnalysis.uniqueFilenames.toLocaleString()} (timestamp v názvu) |`);
  lines.push(`| Size skupin s >1 souborem | ${eyesAnalysis.sizeGroupsWithDupes.toLocaleString()} |`);
  lines.push(`| Binárně duplicitní (partial MD5 při shodné velikosti) | **${eyesAnalysis.duplicateFiles.toLocaleString()}** souborů |`);
  lines.push(`| Unikátních binárních (partial hash) | **${eyesAnalysis.uniqueByPartialHash.toLocaleString()}** |`);
  lines.push(`| Basename s code ref | ${eyesAnalysis.codeRefBasenames} (téměř vždy 0 — refs jsou pattern/template) |`);
  lines.push("");
  lines.push("### Top OBS source prefixy (z názvu souboru)");
  lines.push("");
  lines.push("| Source prefix | Počet PNG |");
  lines.push("|---------------|-----------|");
  for (const [prefix, cnt] of eyesAnalysis.topSources) {
    lines.push(`| \`${prefix}\` | ${cnt.toLocaleString()} |`);
  }
  lines.push("");
  lines.push("### Generátory ostatních `generated/*`");
  lines.push("");
  const gg = GENERATOR_SCRIPTS["generated/gifts"];
  lines.push("| Subdir | Writer script | Runtime |");
  lines.push("|--------|---------------|---------|");
  lines.push("| `gift-animations/` | `shared/mia-gift-animation/proceduralRenderer.js` | ano |");
  lines.push("| `gift-moments/` | `scripts/MIA_GIFT_VISUAL_COMPOSER.js` | ano |");
  lines.push("| `story-moments/` | `scripts/MIA_STORY_ANIMATION_ENGINE.js` | ano |");
  lines.push("| `media-templates/` | `scripts/MIA_MEDIA_TEMPLATE_RENDERER.js` | ano |");
  lines.push("");
  lines.push("## MISSING refs — code path → asset");
  lines.push("");
  lines.push(`**${missingRows.length}** řádků (nic neopraveno).`);
  lines.push("");
  lines.push("| Code path | Missing asset path | Template? |");
  lines.push("|-----------|-------------------|-----------|");
  for (const row of missingRows) {
    lines.push(`| \`${row.codePath}\` | \`${row.missingAsset}\` | ${row.isTemplate ? "ano" : "ne"} |`);
  }

  fs.writeFileSync(OUT, lines.join("\n") + "\n", "utf8");

  console.log(JSON.stringify({
    orphanTotal: totalOrphan,
    orphanGB: (totalOrphanBytes / 1024 ** 3).toFixed(2),
    groups: Object.fromEntries([...groups.entries()].map(([k, v]) => [k, { count: v.count, bytes: v.bytes }])),
    eyes: {
      count: eyesAnalysis.count,
      duplicateFiles: eyesAnalysis.duplicateFiles,
      uniquePartial: eyesAnalysis.uniqueByPartialHash
    },
    missingRefs: missingRows.length,
    out: OUT
  }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
