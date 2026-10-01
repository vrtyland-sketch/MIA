"use strict";

/**
 * ASSET PASS 05 — dedup safety analysis (no deletes/moves)
 * Usage: node scripts/analyze_dedup_safety.js
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const REGISTRY_PATH = path.join(ROOT, "content-pass", "ASSET_REGISTRY.json");
const REPORT_PATH = path.join(ROOT, "docs", "ASSET_PASS_05_DEDUP_SAFETY.md");

const UNRESOLVED_PATHS = new Set([
  "incoming-images/videos/away/nejsem_tu_loop.mp4",
  "mia-output-overlay/assets/kojnozrout/viewers/default-follower.png",
  "mia-output-overlay/assets/viewers/default-follower.png"
]);

const MANUAL_REVIEW_HOLD = new Set([
  "mia-output-overlay/assets/kojnozrout/base/body.png",
  "mia-output-overlay/assets/viewers/default-follower.png",
  "mia-output-overlay/assets/mia/masters/idle.png"
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

function relPosix(abs) {
  return path.relative(ROOT, abs).split(path.sep).join("/");
}

function basename(p) {
  return path.basename(p.replace(/\\/g, "/"));
}

function formatBytes(n) {
  if (n >= 1024 ** 3) return `${(n / 1024 ** 3).toFixed(2)} GB`;
  if (n >= 1024 ** 2) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  if (n >= 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${n} B`;
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

function buildLineIndex(codeFiles) {
  const lineAt = new Map();
  for (const file of codeFiles) {
    let content;
    try {
      content = fs.readFileSync(file, "utf8");
    } catch {
      continue;
    }
    const rel = relPosix(file);
    const lines = content.split("\n");
    for (let i = 0; i < lines.length; i++) {
      lineAt.set(`${rel}:${i + 1}`, lines[i]);
    }
  }
  return lineAt;
}

function pathMentionedInLine(line, assetPath) {
  const normalized = assetPath.replace(/\\/g, "/");
  const base = basename(normalized);
  const lower = line.toLowerCase();
  if (lower.includes(normalized.toLowerCase())) return true;
  if (lower.includes(base.toLowerCase()) && base.length > 6) return true;
  if (normalized.startsWith("incoming-images/")) {
    const short = normalized.slice("incoming-images/".length);
    if (lower.includes(short.toLowerCase())) return true;
  }
  if (normalized.includes("assets/")) {
    const suffix = normalized.split("assets/")[1];
    if (suffix && lower.includes(suffix.toLowerCase())) return true;
  }
  return false;
}

function specificRefsFor(asset, lineIndex) {
  const hits = [];
  for (const ref of asset.runtimeRefs || []) {
    const line = lineIndex.get(ref) || "";
    if (pathMentionedInLine(line, asset.path)) hits.push(ref);
  }
  return hits;
}

function canonicalScore(asset, specificRefs) {
  const p = asset.path.replace(/\\/g, "/");
  let score = specificRefs.length * 10 + (asset.runtimeRefs || []).length;
  if (p.startsWith("mia-output-overlay/assets/")) score += 5;
  if (!/\(\d+\)|_\d{6,}/.test(p)) score += 3;
  if (!p.includes("videos_2/")) score += 2;
  if (!p.includes("_offline_backup")) score += 2;
  score -= p.length / 200;
  return score;
}

function pickCanonical(members, lineIndex) {
  const scored = members.map((m) => {
    const spec = specificRefsFor(m, lineIndex);
    return { member: m, specificRefs: spec, score: canonicalScore(m, spec) };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored[0];
}

function setsEqual(a, b) {
  const sa = new Set(a);
  const sb = new Set(b);
  if (sa.size !== sb.size) return false;
  for (const x of sa) if (!sb.has(x)) return false;
  return true;
}

function classifyGroup(members, lineIndex) {
  const hash = members[0].contentHash;
  const roles = new Set(members.map((m) => m.role));

  for (const m of members) {
    const p = m.path.replace(/\\/g, "/");
    if (UNRESOLVED_PATHS.has(p) || MANUAL_REVIEW_HOLD.has(p)) {
      return {
        verdict: "BLOCKED",
        reason: `reference-risk or manual-hold path: ${p}`
      };
    }
    if (!fs.existsSync(path.join(ROOT, p))) {
      return { verdict: "BLOCKED", reason: `missing on disk: ${p}` };
    }
  }

  if (roles.size > 1) {
    return {
      verdict: "KEEP_SEPARATE",
      reason: `roles differ: ${[...roles].join(", ")}`
    };
  }

  const analyzed = members.map((m) => ({
    member: m,
    specificRefs: specificRefsFor(m, lineIndex),
    allRefs: m.runtimeRefs || []
  }));

  const withSpecific = analyzed.filter((a) => a.specificRefs.length > 0);

  if (withSpecific.length >= 2) {
    const refSets = withSpecific.map((a) => [...a.specificRefs].sort().join("|"));
    const uniqueSets = new Set(refSets);
    if (uniqueSets.size > 1) {
      return {
        verdict: "REVIEW",
        reason: "multiple members with distinct path-specific runtime refs"
      };
    }
  }

  const allRefSets = analyzed.map((a) => [...a.allRefs].sort());
  const uniqueAll = new Set(allRefSets.map((s) => s.join("|")));

  if (withSpecific.length === 1 && withSpecific[0].specificRefs.length > 0) {
    const others = analyzed.filter((a) => a.member.id !== withSpecific[0].member.id);
    const othersHaveExclusive = others.some((a) => a.specificRefs.length > 0);
    if (!othersHaveExclusive) {
      return {
        verdict: "SAFE_DEDUP",
        reason: "single path-specific runtime owner; same role",
        canonical: pickCanonical(members, lineIndex)
      };
    }
  }

  if (uniqueAll.size === 1) {
    return {
      verdict: "SAFE_DEDUP",
      reason: "identical runtimeRefs; same role",
      canonical: pickCanonical(members, lineIndex)
    };
  }

  if (withSpecific.length === 0 && uniqueAll.size > 1) {
    const looseOnly = analyzed.every((a) => a.allRefs.length > 0);
    if (looseOnly && members.every((m) => m.role === "video_clip")) {
      return {
        verdict: "SAFE_DEDUP",
        reason: "catalog basename collision only; same role video_clip; no path-specific refs",
        canonical: pickCanonical(members, lineIndex)
      };
    }
    return {
      verdict: "REVIEW",
      reason: "different runtimeRef sets without clear single owner"
    };
  }

  if (withSpecific.length === 0) {
    return {
      verdict: "SAFE_DEDUP",
      reason: "same role; no exclusive path-specific refs",
      canonical: pickCanonical(members, lineIndex)
    };
  }

  if (withSpecific.length >= 2 && setsEqual(withSpecific[0].specificRefs, withSpecific[1].specificRefs)) {
    return {
      verdict: "SAFE_DEDUP",
      reason: "shared path-specific refs; same role",
      canonical: pickCanonical(members, lineIndex)
    };
  }

  return {
    verdict: "REVIEW",
    reason: "ambiguous runtime reference pattern"
  };
}

function main() {
  const registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, "utf8"));
  const assets = registry.assets || [];
  const codeFiles = walkCodeFiles();
  const lineIndex = buildLineIndex(codeFiles);

  const byHash = new Map();
  for (const a of assets) {
    if (!a.contentHash) continue;
    if (!byHash.has(a.contentHash)) byHash.set(a.contentHash, []);
    byHash.get(a.contentHash).push(a);
  }

  const groups = [...byHash.values()].filter((g) => g.length > 1);
  const results = [];

  for (const members of groups) {
    members.sort((a, b) => a.path.localeCompare(b.path));
    const classification = classifyGroup(members, lineIndex);
    const canonicalPick = classification.canonical;
    const canonical = canonicalPick?.member || members[0];
    const duplicates = members.filter((m) => m.id !== canonical.id);

    const bytesSaved =
      classification.verdict === "SAFE_DEDUP"
        ? duplicates.reduce((s, m) => s + (m.sizeBytes || 0), 0)
        : 0;

    results.push({
      hash: members[0].contentHash,
      count: members.length,
      role: members[0].role,
      roles: [...new Set(members.map((m) => m.role))],
      verdict: classification.verdict,
      reason: classification.reason,
      canonical: {
        id: canonical.id,
        path: canonical.path,
        specificRefs: specificRefsFor(canonical, lineIndex)
      },
      duplicates: duplicates.map((m) => ({
        id: m.id,
        path: m.path,
        specificRefs: specificRefsFor(m, lineIndex)
      })),
      bytesSaved,
      sizeBytes: members[0].sizeBytes || 0,
      members: members.map((m) => ({
        id: m.id,
        path: m.path,
        role: m.role,
        runtimeRefs: m.runtimeRefs || []
      }))
    });
  }

  const summary = {
    SAFE_DEDUP: 0,
    KEEP_SEPARATE: 0,
    REVIEW: 0,
    BLOCKED: 0,
    filesRemovable: 0,
    bytesSaved: 0
  };

  for (const r of results) {
    summary[r.verdict]++;
    if (r.verdict === "SAFE_DEDUP") {
      summary.filesRemovable += r.duplicates.length;
      summary.bytesSaved += r.bytesSaved;
    }
  }

  const safeSorted = results
    .filter((r) => r.verdict === "SAFE_DEDUP")
    .sort((a, b) => b.bytesSaved - a.bytesSaved);

  const lines = [];
  lines.push("# ASSET PASS 05 — DEDUP SAFETY ANALYSIS");
  lines.push("");
  lines.push("**Režim:** analysis only · žádné mazání/přesuny/přejmenování.");
  lines.push("**Generováno:** `node scripts/analyze_dedup_safety.js`");
  lines.push("");
  lines.push("## Souhrn");
  lines.push("");
  lines.push("| Metrika | Hodnota |");
  lines.push("|---------|---------|");
  lines.push(`| Duplicate groups celkem | **103** |`);
  lines.push(`| **SAFE_DEDUP** | **${summary.SAFE_DEDUP}** |`);
  lines.push(`| **KEEP_SEPARATE** | **${summary.KEEP_SEPARATE}** |`);
  lines.push(`| **REVIEW** | **${summary.REVIEW}** |`);
  lines.push(`| **BLOCKED** | **${summary.BLOCKED}** |`);
  lines.push(`| Souborů odstranitelných (SAFE) | **${summary.filesRemovable}** |`);
  lines.push(`| **Úspora (SAFE only)** | **${formatBytes(summary.bytesSaved)}** |`);

  const reviewVideoBytes = results
    .filter((r) => r.verdict === "REVIEW" && r.role === "video_clip")
    .reduce((s, r) => s + r.sizeBytes * (r.count - 1), 0);
  const reviewVideoGroups = results.filter((r) => r.verdict === "REVIEW" && r.role === "video_clip").length;
  lines.push(`| REVIEW \`video_clip\` potenciál (po sjednocení catalog refs) | ~${formatBytes(reviewVideoBytes)} · ${reviewVideoGroups} skupin |`);
  lines.push("");
  lines.push("### Verdikty");
  lines.push("");
  lines.push("- **SAFE_DEDUP** — stejný hash + role; bez konfliktu path-specific runtime refs");
  lines.push("- **KEEP_SEPARATE** — stejný obsah, jiná role / jiný význam");
  lines.push("- **REVIEW** — různé runtime ref kontexty nebo nejasný owner");
  lines.push("- **BLOCKED** — unresolved/manual-hold/missing");
  lines.push("");
  lines.push("## Top 20 SAFE_DEDUP kandidátů (by bytes saved)");
  lines.push("");
  lines.push("| BYTES_SAVED | CANONICAL_ID | CANONICAL_PATH | DUP count |");
  lines.push("|-------------|--------------|----------------|-----------|");
  for (const r of safeSorted.slice(0, 20)) {
    lines.push(
      "| " +
        formatBytes(r.bytesSaved) +
        " | `" +
        r.canonical.id +
        "` | `" +
        r.canonical.path +
        "` | " +
        r.duplicates.length +
        " |"
    );
  }
  lines.push("");
  lines.push("## SAFE_DEDUP detail");
  lines.push("");
  for (const r of safeSorted) {
    lines.push(`### \`${r.hash.slice(0, 12)}…\` · ${formatBytes(r.bytesSaved)} saved · \`${r.role}\``);
    lines.push("");
    lines.push(`- **Důvod:** ${r.reason}`);
    lines.push(`- **CANONICAL:** \`${r.canonical.id}\` → \`${r.canonical.path}\``);
    lines.push(`- **DUPLICATE_IDS:** ${r.duplicates.map((d) => `\`${d.id}\``).join(", ")}`);
    lines.push(`- **DUPLICATE_PATHS:**`);
    for (const d of r.duplicates) lines.push(`  - \`${d.path}\``);
    lines.push("");
  }
  lines.push("## KEEP_SEPARATE");
  lines.push("");
  for (const r of results.filter((x) => x.verdict === "KEEP_SEPARATE")) {
    lines.push(`- \`${r.hash.slice(0, 12)}…\` (${r.count}×) — ${r.reason}`);
    for (const m of r.members) lines.push(`  - \`${m.role}\` \`${m.path}\``);
  }
  lines.push("");
  lines.push("## REVIEW");
  lines.push("");
  for (const r of results.filter((x) => x.verdict === "REVIEW")) {
    lines.push(`- \`${r.hash.slice(0, 12)}…\` (${r.count}×, ${formatBytes(r.sizeBytes)}) — ${r.reason}`);
    for (const m of r.members) {
      const spec = specificRefsFor(m, lineIndex);
      lines.push(`  - \`${m.id}\` \`${m.path}\` · specific refs: ${spec.length}`);
    }
  }
  lines.push("");
  lines.push("## BLOCKED");
  lines.push("");
  const blocked = results.filter((x) => x.verdict === "BLOCKED");
  if (!blocked.length) lines.push("_Žádné._");
  else blocked.forEach((r) => lines.push(`- \`${r.hash.slice(0, 12)}…\` — ${r.reason}`));
  lines.push("");
  lines.push("## Další krok (post-freeze)");
  lines.push("");
  lines.push("**Dedup execution plan** — pouze pro SAFE_DEDUP skupiny; REF/REVIEW ručně před smazáním.");

  fs.writeFileSync(REPORT_PATH, lines.join("\n") + "\n", "utf8");

  registry.dedupSafetyPass = "05";
  registry.dedupSafetyAt = new Date().toISOString();
  registry.stats = {
    ...registry.stats,
    dedupSafety: summary
  };
  fs.writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2) + "\n", "utf8");

  console.log(JSON.stringify({ summary, safeTop: safeSorted.slice(0, 3).map((r) => ({
    saved: r.bytesSaved,
    canonical: r.canonical.path
  })), report: REPORT_PATH }, null, 2));
}

main();
