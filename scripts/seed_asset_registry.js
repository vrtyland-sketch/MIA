"use strict";

/**
 * ASSET PASS 03B — seed content-pass/ASSET_REGISTRY.json (paths unchanged)
 * Usage: node scripts/seed_asset_registry.js
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = path.resolve(__dirname, "..");
const REGISTRY_PATH = path.join(ROOT, "content-pass", "ASSET_REGISTRY.json");
const REPORT_PATH = path.join(ROOT, "docs", "ASSET_PASS_03B_REGISTRY_SEED.md");

const ASSET_EXT = new Set([
  ".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg",
  ".mp4", ".webm", ".mov", ".avi", ".mkv",
  ".mp3", ".wav", ".ogg", ".m4a",
  ".html"
]);

const CODE_GLOBS = [
  path.join(ROOT, "index.js"),
  path.join(ROOT, "scripts"),
  path.join(ROOT, "shared"),
  path.join(ROOT, "mia-output-overlay"),
  path.join(ROOT, "config"),
  path.join(ROOT, "core"),
  path.join(ROOT, "routes")
];

const TEST_PATH_RE = /[/\\]tests[/\\]/;

function relPosix(abs) {
  return path.relative(ROOT, abs).split(path.sep).join("/");
}

function normalizeKey(s) {
  return s.replace(/\\/g, "/").replace(/^\.\//, "").replace(/^\/+/, "").toLowerCase();
}

function formatBytes(n) {
  if (n >= 1024 ** 3) return `${(n / 1024 ** 3).toFixed(2)} GB`;
  if (n >= 1024 ** 2) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  if (n >= 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${n} B`;
}

function walkFiles(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === "node_modules" || e.name === ".git") continue;
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
    if (st.isFile() && /\.(js|json|html|css)$/i.test(p)) files.push(p);
    else if (st.isDirectory()) {
      for (const e of fs.readdirSync(p, { withFileTypes: true })) {
        const full = path.join(p, e.name);
        if (e.isDirectory() && e.name !== "node_modules" && e.name !== "tests") add(full);
        else if (e.isFile() && /\.(js|json|html|css)$/i.test(full)) files.push(full);
      }
    }
  }
  for (const g of CODE_GLOBS) add(g);
  return files;
}

function resolveRefToRel(ref) {
  const r = ref.replace(/\\/g, "/").replace(/^\.\//, "");
  const candidates = [
    r.replace(/^\//, ""),
    path.join("mia-output-overlay", r.replace(/^\//, "")).replace(/\\/g, "/"),
    r.startsWith("/assets/")
      ? path.join("mia-output-overlay", r.slice(1)).replace(/\\/g, "/")
      : null,
    r.startsWith("assets/")
      ? path.join("mia-output-overlay", r).replace(/\\/g, "/")
      : null,
    r.startsWith("/generated/")
      ? path.join("mia-output-overlay", r.slice(1)).replace(/\\/g, "/")
      : null,
    r.startsWith("generated/")
      ? path.join("mia-output-overlay", r).replace(/\\/g, "/")
      : null
  ].filter(Boolean);

  for (const c of candidates) {
    if (fs.existsSync(path.join(ROOT, c))) return c;
  }
  return null;
}

function isCachePath(rel) {
  const r = rel.replace(/\\/g, "/");
  if (r.includes("mia-output-overlay/generated/eyes/")) return true;
  if (r.includes("mia-output-overlay/audio-cache/")) return true;
  if (r.includes("mia-output-overlay/generated/gift-animations/")) return true;
  return false;
}

function branchB(rel) {
  const r = rel.replace(/\\/g, "/");
  if (isCachePath(r)) return null;
  if (r.startsWith("mia-output-overlay/assets/")) return "overlay";
  if (r.startsWith("incoming-images/")) return "video";
  if (r.startsWith("archive/")) return "legacy";
  if (/^mia-output-overlay\/[^/]+\.html$/i.test(r)) return "overlay";
  if (
    r.includes("mia-output-overlay/generated/gift-moments/") ||
    r.includes("mia-output-overlay/generated/story-moments/") ||
    r.includes("mia-output-overlay/generated/media-templates/")
  ) {
    return "generated-content";
  }
  if (r.startsWith("downloads/") || r.startsWith("generated/")) return null;
  return null;
}

function assetType(rel) {
  const ext = path.extname(rel).toLowerCase();
  if ([".mp4", ".webm", ".mov", ".avi", ".mkv"].includes(ext)) return "video";
  if ([".mp3", ".wav", ".ogg", ".m4a"].includes(ext)) return "audio";
  if (ext === ".html") return "html-overlay";
  if (ext === ".svg") return "svg";
  return "image";
}

function inferRole(rel, type) {
  const r = rel.replace(/\\/g, "/").toLowerCase();
  if (type === "html-overlay") return "overlay-shell";
  if (r.includes("/kojnozrout/items/")) return "koj-item-icon";
  if (r.includes("/kojnozrout/forms/")) return "koj-form-sprite";
  if (r.includes("/kojnozrout/scenes/")) return "koj-scene-bg";
  if (r.includes("/kojnozrout/evolution/")) return "koj-evolution-art";
  if (r.includes("/kojnozrout/moods/") || r.includes("/kojnozrout/stages/")) return "koj-mood-sprite";
  if (r.includes("/kojnozrout/battle/")) return "koj-battle-art";
  if (r.includes("/kojnozrout/custom/")) return "koj-custom-avatar";
  if (r.includes("/gifts/") || r.includes("/gift-")) return "gift-visual";
  if (r.includes("incoming-images/videos")) return "stream-video";
  if (r.includes("generated/gift-moments")) return "gift-moment-frame";
  if (r.includes("generated/story-moments")) return "story-moment-frame";
  if (r.includes("generated/media-templates")) return "media-template-frame";
  if (r.startsWith("archive/")) return "legacy-deprecated";
  if (r.includes("/animation-bank/")) return "animation-bank-sheet";
  if (r.includes("/boss-cinematic/")) return "boss-cinematic-art";
  return "";
}

function inferSource(rel, branch) {
  if (branch === "legacy") return "legacy-archive";
  if (rel.startsWith("incoming-images/")) return "ingest-manual";
  if (branch === "generated-content") return "runtime-generated-content";
  if (rel.includes("mia-output-overlay/assets/")) return "content-pack";
  return "unknown";
}

function sanitizeIdPart(s) {
  return String(s)
    .replace(/[^\w.-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase()
    .slice(0, 48);
}

function stableId(rel) {
  const r = rel.replace(/\\/g, "/");
  let m;

  m = r.match(/assets\/kojnozrout\/items\/([^/.]+)\./i);
  if (m) return `KOJ_ITEM_${sanitizeIdPart(m[1])}`;

  m = r.match(/assets\/kojnozrout\/forms\/([^/]+)\/([^/.]+)\./i);
  if (m) return `KOJ_FORM_${sanitizeIdPart(m[1])}_${sanitizeIdPart(m[2])}`;

  m = r.match(/assets\/kojnozrout\/scenes\/scene-([^/.]+)\./i);
  if (m) return `KOJ_SCENE_${sanitizeIdPart(m[1])}`;

  m = r.match(/assets\/kojnozrout\/evolution\/([^/.]+)\./i);
  if (m) return `KOJ_EVO_${sanitizeIdPart(m[1])}`;

  m = r.match(/assets\/gifts\/([^/.]+)\./i);
  if (m) return `GIFT_${sanitizeIdPart(m[1])}_OVL_01`;

  m = r.match(/assets\/gift-videos\/([^/.]+)\./i);
  if (m) return `GIFT_${sanitizeIdPart(m[1])}_VIS_01`;

  m = r.match(/incoming-images\/videos\/([^/.]+)\./i);
  if (m) return `VID_${sanitizeIdPart(m[1])}`;

  m = r.match(/generated\/gift-moments\/([^/.]+)\./i);
  if (m) return `GIFT_MOMENT_${sanitizeIdPart(m[1])}`;

  m = r.match(/generated\/story-moments\/([^/.]+)\./i);
  if (m) return `STORY_MOMENT_${sanitizeIdPart(m[1])}`;

  m = r.match(/generated\/media-templates\/([^/.]+)\./i);
  if (m) return `MEDIA_TPL_${sanitizeIdPart(m[1])}`;

  m = r.match(/mia-output-overlay\/([^/.]+)\.html$/i);
  if (m) return `MIA_OVERLAY_${sanitizeIdPart(m[1])}_01`;

  const hash = crypto.createHash("sha1").update(r.toLowerCase()).digest("hex").slice(0, 12).toUpperCase();
  return `MIA_ASSET_${hash}`;
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

function md5FileSync(filePath, maxBytes = 4 * 1024 * 1024) {
  const hash = crypto.createHash("md5");
  const st = fs.statSync(filePath);
  const len = Math.min(st.size, maxBytes);
  const buf = Buffer.alloc(len);
  const fd = fs.openSync(filePath, "r");
  try {
    fs.readSync(fd, buf, 0, len, 0);
    hash.update(buf);
    if (st.size > len) hash.update(String(st.size));
  } finally {
    fs.closeSync(fd);
  }
  return hash.digest("hex");
}

function buildRuntimeRefIndex(codeFiles) {
  const byRel = new Map();
  const unresolved = [];
  const corpusParts = [];
  const mediaRefRe =
    /(?:incoming-images|\/assets\/|mia-output-overlay\/|\/generated\/|generated\/)[^\s"'`<>]+\.(?:png|jpe?g|webp|gif|svg|mp4|webm|mov|mp3|wav|html)/gi;

  for (const file of codeFiles) {
    if (TEST_PATH_RE.test(file)) continue;
    const relFile = relPosix(file);
    let content;
    try {
      content = fs.readFileSync(file, "utf8");
    } catch {
      continue;
    }
    corpusParts.push(content);
    const lines = content.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      mediaRefRe.lastIndex = 0;
      let m;
      while ((m = mediaRefRe.exec(line)) !== null) {
        const rawRef = m[0].replace(/\\/g, "/");
        const codePath = `${relFile}:${i + 1}`;
        if (/\$\{/.test(rawRef)) {
          unresolved.push({ codePath, missingAsset: rawRef, isTemplate: true });
          continue;
        }
        const resolved = resolveRefToRel(rawRef);
        if (!resolved) {
          if (!isCachePath(rawRef) && !rawRef.includes("audio-cache")) {
            unresolved.push({ codePath, missingAsset: rawRef, isTemplate: false });
          }
          continue;
        }
        if (isCachePath(resolved)) continue;
        const key = normalizeKey(resolved);
        if (!byRel.has(key)) byRel.set(key, new Set());
        byRel.get(key).add(codePath);
      }
    }
  }

  return { byRel, unresolved, corpus: corpusParts.join("\n").toLowerCase() };
}

function refKeysForFile(rel) {
  const keys = new Set();
  const r = rel.replace(/\\/g, "/");
  keys.add(normalizeKey(r));
  const base = path.basename(r).toLowerCase();
  if (base.length > 4) keys.add(base);
  if (r.includes("assets/")) {
    const suffix = r.split("assets/")[1];
    keys.add(normalizeKey(suffix));
    keys.add(normalizeKey("/assets/" + suffix));
    keys.add(normalizeKey("assets/" + suffix));
  }
  if (r.startsWith("incoming-images/")) {
    keys.add(normalizeKey(r.replace(/^incoming-images\//, "")));
  }
  if (r.includes("generated/")) {
    keys.add(normalizeKey("/" + r.replace(/^mia-output-overlay\//, "")));
  }
  return keys;
}

function findRuntimeRefsForFile(rel, codeFiles, byRel) {
  const keys = refKeysForFile(rel);
  const fromIndex = new Set();
  for (const k of keys) {
    if (byRel.has(k)) for (const r of byRel.get(k)) fromIndex.add(r);
  }
  if (fromIndex.size) return [...fromIndex].sort();

  const refs = new Set();
  const base = path.basename(rel).toLowerCase();
  const suffixes = [];
  if (rel.includes("assets/")) suffixes.push(rel.split("assets/")[1].toLowerCase());
  if (rel.startsWith("incoming-images/")) suffixes.push(rel.replace(/^incoming-images\//, "").toLowerCase());
  suffixes.push(normalizeKey(rel));

  for (const file of codeFiles) {
    if (TEST_PATH_RE.test(file)) continue;
    let content;
    try {
      content = fs.readFileSync(file, "utf8");
    } catch {
      continue;
    }
    const relFile = relPosix(file);
    const lower = content.toLowerCase();
    const lines = content.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toLowerCase();
      const hit =
        suffixes.some((s) => s.length > 4 && line.includes(s)) ||
        (base.length > 4 && line.includes(base));
      if (hit) refs.add(`${relFile}:${i + 1}`);
    }
  }
  return [...refs].sort().slice(0, 12);
}

function hasActiveRef(rel, byRel, corpus) {
  for (const k of refKeysForFile(rel)) {
    if (byRel.has(k)) return true;
  }
  const r = rel.replace(/\\/g, "/").toLowerCase();
  if (corpus.includes(r)) return true;
  const base = path.basename(r);
  if (base.length > 4 && corpus.includes(base)) return true;
  if (r.includes("assets/")) {
    const s = r.split("assets/")[1];
    if (corpus.includes(s) || corpus.includes("/assets/" + s)) return true;
  }
  if (r.startsWith("incoming-images/")) {
    const s = r.replace(/^incoming-images\//, "");
    if (corpus.includes(s)) return true;
  }
  return false;
}

function collectCandidateFiles() {
  const files = [];
  walkFiles(path.join(ROOT, "incoming-images"), files);
  walkFiles(path.join(ROOT, "mia-output-overlay", "assets"), files);
  walkFiles(path.join(ROOT, "archive"), files);
  for (const sub of ["gift-moments", "story-moments", "media-templates"]) {
    walkFiles(path.join(ROOT, "mia-output-overlay", "generated", sub), files);
  }
  const overlayDir = path.join(ROOT, "mia-output-overlay");
  if (fs.existsSync(overlayDir)) {
    for (const e of fs.readdirSync(overlayDir, { withFileTypes: true })) {
      if (e.isFile() && e.name.endsWith(".html")) {
        files.push(path.join(overlayDir, e.name));
      }
    }
  }
  return [...new Set(files.map((f) => path.resolve(f)))];
}

function main() {
  console.error("Indexing runtime references…");
  const codeFiles = walkCodeFiles();
  const { byRel, unresolved, corpus } = buildRuntimeRefIndex(codeFiles);

  console.error("Collecting branch-B candidate files…");
  const candidates = collectCandidateFiles();

  const entries = [];
  const idUsed = new Map();
  const hashGroups = new Map();
  const missingMeta = [];

  for (const abs of candidates) {
    const rel = relPosix(abs);
    const b = branchB(rel);
    if (!b) continue;

    const key = normalizeKey(rel);
    if (!hasActiveRef(rel, byRel, corpus)) continue;

    const runtimeRefs = findRuntimeRefsForFile(rel, codeFiles, byRel);
    if (runtimeRefs.length === 0) continue;

    const st = fs.statSync(abs);
    const type = assetType(rel);
    const role = inferRole(rel, type);
    const source = inferSource(rel, b);
    let id = stableId(rel);
    if (idUsed.has(id)) {
      const n = idUsed.get(id) + 1;
      idUsed.set(id, n);
      id = `${id}_${n}`;
    } else {
      idUsed.set(id, 1);
    }

    let dimensions = null;
    if (type === "image" && /\.png$/i.test(rel)) {
      dimensions = readPngDimensions(abs);
    }

    let contentHash = null;
    if (st.size > 0 && st.size <= 50 * 1024 * 1024) {
      try {
        contentHash = md5FileSync(abs);
      } catch {
        contentHash = null;
      }
    }

    const entry = {
      id,
      path: rel,
      type,
      role: role || null,
      source,
      branch: b,
      runtimeRefs,
      status: "active",
      sizeBytes: st.size,
      dimensions,
      contentHash
    };

    if (!role) missingMeta.push({ id, path: rel, field: "role" });
    if (type === "image" && !dimensions && /\.(png|jpe?g|webp)$/i.test(rel)) {
      missingMeta.push({ id, path: rel, field: "dimensions" });
    }

    entries.push(entry);

    if (contentHash) {
      if (!hashGroups.has(contentHash)) hashGroups.set(contentHash, []);
      hashGroups.get(contentHash).push({ id, path: rel, sizeBytes: st.size });
    }
  }

  entries.sort((a, b) => a.path.localeCompare(b.path));

  const duplicateGroups = [...hashGroups.values()].filter((g) => g.length > 1);
  const branchBCandidates = candidates.filter((abs) => branchB(relPosix(abs)));
  const activeOnDisk = branchBCandidates.filter((abs) =>
    hasActiveRef(relPosix(abs), byRel, corpus)
  ).length;

  const coveragePct =
    activeOnDisk > 0 ? ((entries.length / activeOnDisk) * 100).toFixed(1) : "100.0";

  const unresolvedConcrete = unresolved.filter((u) => !u.isTemplate);
  const unresolvedTemplates = unresolved.filter((u) => u.isTemplate);

  const registry = {
    version: "1.0.0",
    status: "seeded",
    seedPass: "03B",
    seededAt: new Date().toISOString(),
    note: "Content branch B + ACTIVE runtime refs only. Cache paths excluded (generated/eyes, audio-cache, gift-animations jobs).",
    conventions: {
      giftVideo: "GIFT_<GIFTKEY>_VIS_<NN>",
      giftOverlay: "GIFT_<GIFTKEY>_OVL_<NN>",
      miaOverlay: "MIA_OVERLAY_<NAME>_<NN>",
      sharedSeries: "GIFT_<CATEGORY>_SHARED_<NN>",
      fallback: "MIA_ASSET_<SHA1_12>"
    },
    stats: {
      entries: entries.length,
      activeCoveragePct: Number(coveragePct),
      branchCounts: entries.reduce((acc, e) => {
        acc[e.branch] = (acc[e.branch] || 0) + 1;
        return acc;
      }, {}),
      unresolvedConcrete: unresolvedConcrete.length,
      unresolvedTemplates: unresolvedTemplates.length,
      duplicateContentGroups: duplicateGroups.length,
      missingMetadata: missingMeta.length
    },
    assets: entries.map(({ contentHash, ...rest }) => {
      const out = { ...rest };
      if (contentHash) out.contentHash = contentHash;
      return out;
    })
  };

  fs.writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2) + "\n", "utf8");

  const lines = [];
  lines.push("# ASSET PASS 03B — REGISTRY SEED");
  lines.push("");
  lines.push("**Režim:** READ/WRITE pouze `content-pass/ASSET_REGISTRY.json` + docs · paths beze změny.");
  lines.push("**Generováno:** `node scripts/seed_asset_registry.js`");
  lines.push("");
  lines.push("## Souhrn");
  lines.push("");
  lines.push("| Metrika | Hodnota |");
  lines.push("|---------|---------|");
  lines.push(`| **Registry entries** | **${entries.length}** |`);
  lines.push(`| ACTIVE pokrytí (branch B s ref / seeded) | **${coveragePct}%** |`);
  lines.push(`| Vyloučeno (cache) | \`generated/eyes\`, \`audio-cache\`, \`gift-animations/*\` |`);
  lines.push(`| Unresolved paths (konkrétní) | **${unresolvedConcrete.length}** |`);
  lines.push(`| Unresolved paths (template) | ${unresolvedTemplates.length} |`);
  lines.push(`| Duplicate-content groups (MD5) | **${duplicateGroups.length}** |`);
  lines.push(`| Missing metadata | **${missingMeta.length}** |`);
  lines.push("");
  lines.push("### Branch breakdown");
  lines.push("");
  for (const [b, n] of Object.entries(registry.stats.branchCounts).sort((a, b) => b[1] - a[1])) {
    lines.push(`- \`${b}\`: ${n}`);
  }
  lines.push("");
  lines.push("## Retention policy (schváleno, neimplementováno)");
  lines.push("");
  lines.push("**RETENTION POLICY = APPROVED AS DESIGNED** (viz `docs/ASSET_PASS_03A_RETENTION_DESIGN.md`). RET-01…RET-05 = post-freeze backlog.");
  lines.push("");
  lines.push("## Duplicate-content groups (top 15 by size)");
  lines.push("");
  const dupSorted = duplicateGroups
    .map((g) => ({ g, bytes: g[0].sizeBytes }))
    .sort((a, b) => b.bytes - a.bytes)
    .slice(0, 15);
  if (!dupSorted.length) {
    lines.push("_Žádné duplicate skupiny v seeded setu._");
  } else {
    for (const { g, bytes } of dupSorted) {
      lines.push(`- **${g.length}×** ${formatBytes(bytes)} — \`${g[0].path}\``);
      for (const x of g.slice(1, 4)) lines.push(`  - dup: \`${x.path}\` (${x.id})`);
      if (g.length > 4) lines.push(`  - … +${g.length - 4} další`);
    }
  }
  lines.push("");
  lines.push("## Unresolved paths (konkrétní, ne-template)");
  lines.push("");
  lines.push("| Code path | Missing asset |");
  lines.push("|-----------|---------------|");
  for (const u of unresolvedConcrete.slice(0, 30)) {
    lines.push(`| \`${u.codePath}\` | \`${u.missingAsset}\` |`);
  }
  if (unresolvedConcrete.length > 30) {
    lines.push("");
    lines.push(`… +${unresolvedConcrete.length - 30} dalších (grep v kódu).`);
  }
  lines.push("");
  lines.push("## Missing metadata (vzorek)");
  lines.push("");
  for (const m of missingMeta.slice(0, 25)) {
    lines.push(`- \`${m.id}\` · \`${m.path}\` · chybí \`${m.field}\``);
  }
  if (missingMeta.length > 25) lines.push(`- … +${missingMeta.length - 25} dalších`);
  lines.push("");
  lines.push("## Mapa");
  lines.push("");
  lines.push("Poprvé v jednom místě: **filesystem path** + **registry ID** + **runtimeRefs** (code path:line).");
  lines.push("Další krok: asset cleanup s referencí na registry, ne na raw paths.");

  fs.writeFileSync(REPORT_PATH, lines.join("\n") + "\n", "utf8");

  console.log(
    JSON.stringify(
      {
        entries: entries.length,
        coveragePct,
        duplicateGroups: duplicateGroups.length,
        unresolvedConcrete: unresolvedConcrete.length,
        missingMeta: missingMeta.length,
        registry: REGISTRY_PATH,
        report: REPORT_PATH
      },
      null,
      2
    )
  );
}

main();
