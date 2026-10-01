"use strict";

/**
 * ASSET PASS 05B — video catalog ref consolidation plan (analysis only)
 * Usage: node scripts/analyze_video_catalog_refs.js
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const REGISTRY_PATH = path.join(ROOT, "content-pass", "ASSET_REGISTRY.json");
const REPORT_PATH = path.join(ROOT, "docs", "ASSET_PASS_05B_VIDEO_CATALOG_PLAN.md");

const CATALOG_FILES = [
  "config/media-intake-overrides.json",
  "config/stream-media-catalog.json",
  "config/media-visual-review.json",
  "config/videos_2-intake.json",
  "config/stream-media-overrides.json",
  "shared/host_mode_config.json"
];

const TEST_PATH_RE = /[/\\]tests[/\\]/;

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

function toIncomingRel(pathOrRel) {
  const p = pathOrRel.replace(/\\/g, "/").replace(/^\.\//, "");
  if (p.startsWith("incoming-images/")) return p;
  if (p.startsWith("videos/") || p.startsWith("videos_2/")) {
    return `incoming-images/${p}`;
  }
  return p;
}

function toCatalogRel(incomingPath) {
  return incomingPath.replace(/^incoming-images\//, "");
}

function walkCodeFiles() {
  const files = [];
  const roots = [
    path.join(ROOT, "index.js"),
    path.join(ROOT, "scripts"),
    path.join(ROOT, "shared"),
    path.join(ROOT, "config"),
    path.join(ROOT, "core"),
    path.join(ROOT, "routes")
  ];
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
  for (const r of roots) add(r);
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
    content.split("\n").forEach((line, i) => {
      lineAt.set(`${rel}:${i + 1}`, line);
    });
  }
  return lineAt;
}

function pathMentionedInLine(line, assetPath) {
  const normalized = assetPath.replace(/\\/g, "/");
  const base = basename(normalized);
  const lower = line.toLowerCase();
  if (lower.includes(normalized.toLowerCase())) return true;
  if (base.length > 6 && lower.includes(base.toLowerCase())) return true;
  const catRel = toCatalogRel(normalized);
  if (lower.includes(catRel.toLowerCase())) return true;
  return false;
}

function specificRefsFor(asset, lineIndex) {
  return (asset.runtimeRefs || []).filter((ref) => {
    if (TEST_PATH_RE.test(ref)) return false;
    return pathMentionedInLine(lineIndex.get(ref) || "", asset.path);
  });
}

function loadPinnedSlots() {
  const p = path.join(ROOT, "config", "stream-media-overrides.json");
  if (!fs.existsSync(p)) return new Map();
  const j = JSON.parse(fs.readFileSync(p, "utf8"));
  const map = new Map();
  for (const [slot, rel] of Object.entries(j.pinnedSlots || {})) {
    map.set(toIncomingRel(rel), { file: "config/stream-media-overrides.json", slot, rel });
  }
  return map;
}

function scanCatalogMentions() {
  const byIncoming = new Map();

  function add(incomingRel, entry) {
    const key = toIncomingRel(incomingRel);
    if (!byIncoming.has(key)) byIncoming.set(key, []);
    byIncoming.get(key).push(entry);
  }

  for (const file of CATALOG_FILES) {
    const abs = path.join(ROOT, file);
    if (!fs.existsSync(abs)) continue;
    let raw;
    try {
      raw = fs.readFileSync(abs, "utf8");
    } catch {
      continue;
    }
    const lines = raw.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const relMatch = line.match(/"rel"\s*:\s*"((?:videos_2\/|videos\/)[^"]+)"/);
      if (relMatch) {
        add(toIncomingRel(relMatch[1]), {
          file: file.replace(/\\/g, "/"),
          line: i + 1,
          rel: relMatch[1],
          kind: "rel-field"
        });
      }
      const pinnedMatch = line.match(/"(T[1-5]_VIDEO_\d+|PROFILE_VIDEO_\d+)"\s*:\s*"((?:videos_2\/|videos\/)[^"]+)"/);
      if (pinnedMatch) {
        add(toIncomingRel(pinnedMatch[2]), {
          file: file.replace(/\\/g, "/"),
          line: i + 1,
          rel: pinnedMatch[2],
          kind: "pinned-slot",
          slot: pinnedMatch[1]
        });
      }
    }
  }

  const pinned = loadPinnedSlots();
  for (const [incoming, meta] of pinned) {
    add(incoming, {
      file: meta.file,
      line: null,
      rel: toCatalogRel(incoming),
      kind: "pinned-slot",
      slot: meta.slot
    });
  }

  return byIncoming;
}

function loadIntakeSemantics() {
  const p = path.join(ROOT, "config", "media-intake-overrides.json");
  if (!fs.existsSync(p)) return new Map();
  const j = JSON.parse(fs.readFileSync(p, "utf8"));
  const map = new Map();
  for (const item of j.assignments || j.overrides || j.items || j.entries || []) {
    if (!item?.rel) continue;
    const incoming = toIncomingRel(item.rel);
    map.set(incoming, {
      tier: item.tier || "",
      contentKind: item.contentKind || "",
      theme: item.theme || "",
      obsSlot: item.obsSlot || "",
      note: item.note || ""
    });
  }
  return map;
}

function officialnessScore(incomingPath, catalogMentions, intakeSemantics, pinnedSlots) {
  const p = incomingPath.replace(/\\/g, "/");
  const catRel = toCatalogRel(p);
  let score = 0;
  const mentions = catalogMentions.get(p) || [];

  for (const m of mentions) {
    if (m.file.includes("media-intake-overrides")) score += 25;
    else if (m.file.includes("stream-media-overrides")) score += 22;
    else if (m.file.includes("stream-media-catalog")) score += 12;
    else if (m.file.includes("media-visual-review")) score += 6;
    else score += 4;
    if (m.kind === "pinned-slot") score += 15;
  }

  const sem = intakeSemantics.get(p);
  if (sem) {
    score += 20;
    if (sem.obsSlot) score += 12;
  }

  if (pinnedSlots.has(p)) score += 18;

  if (catRel.startsWith("videos/") && !catRel.startsWith("videos_2/")) score += 8;
  if (/\(\d+\)/.test(catRel)) score -= 12;
  if (/_\d{5,}/.test(catRel)) score -= 8;
  if (catRel.includes("videos_2/")) score -= 3;

  return { score, mentions, semantics: sem };
}

function semanticSignature(sem) {
  if (!sem) return "";
  return [sem.tier, sem.contentKind, sem.obsSlot, sem.theme].join("|");
}

function classifyDedupVerdict(members, lineIndex) {
  const analyzed = members.map((m) => ({
    member: m,
    specificRefs: specificRefsFor(m, lineIndex)
  }));
  const withSpecific = analyzed.filter((a) => a.specificRefs.length > 0);
  if (withSpecific.length >= 2) {
    const refSets = withSpecific.map((a) => [...a.specificRefs].sort().join("|"));
    if (new Set(refSets).size > 1) {
      return "REVIEW";
    }
  }
  const allRefSets = analyzed.map((a) => [...(a.member.runtimeRefs || [])].sort().join("|"));
  if (new Set(allRefSets).size === 1) return "SAFE_DEDUP";
  if (withSpecific.length === 1) return "SAFE_DEDUP";
  return "REVIEW";
}

function classifyConsolidation(group, catalogMentions, intakeSemantics, pinnedSlots, lineIndex) {
  const paths = group.members.map((m) => m.path);
  const semantics = paths.map((p) => ({
    path: p,
    sem: intakeSemantics.get(p),
    sig: semanticSignature(intakeSemantics.get(p))
  }));
  const nonEmptySigs = [...new Set(semantics.map((s) => s.sig).filter(Boolean))];

  const scores = paths.map((p) => ({
    path: p,
    ...officialnessScore(p, catalogMentions, intakeSemantics, pinnedSlots)
  }));
  scores.sort((a, b) => b.score - a.score);
  const canonical = scores[0];
  const second = scores[1];

  for (const p of paths) {
    if (!fs.existsSync(path.join(ROOT, p))) {
      return {
        verdict: "BLOCKED",
        reason: "missing on disk",
        canonical,
        scores
      };
    }
  }

  const refsToRewrite = [];
  for (const m of group.members) {
    if (m.path === canonical.path) continue;
    const catRel = toCatalogRel(m.path);
    for (const ref of m.runtimeRefs || []) {
      if (TEST_PATH_RE.test(ref)) {
        return { verdict: "BLOCKED", reason: `test ref ${ref}`, canonical, scores };
      }
      refsToRewrite.push({ from: ref, path: m.path, suggestCanonical: canonical.path });
    }
    const mentions = catalogMentions.get(m.path) || [];
    for (const mention of mentions) {
      refsToRewrite.push({
        file: mention.file,
        line: mention.line,
        fromRel: mention.rel,
        path: m.path,
        suggestCanonical: canonical.path,
        suggestRel: toCatalogRel(canonical.path)
      });
    }
  }

  if (nonEmptySigs.length > 1) {
    const hasObsConflict = semantics.some((s) => s.sem?.obsSlot) &&
      new Set(semantics.filter((s) => s.sem?.obsSlot).map((s) => s.sem.obsSlot)).size > 1;
    if (hasObsConflict || nonEmptySigs.length >= 2) {
      return {
        verdict: "SEMANTIC_SPLIT",
        reason: `distinct intake semantics: ${nonEmptySigs.join(" · ")}`,
        canonical,
        scores,
        refsToRewrite,
        semantics
      };
    }
  }

  if (second && second.score > 0 && canonical.score - second.score <= 5) {
    return {
      verdict: "AMBIGUOUS",
      reason: `officialness tie ${canonical.score} vs ${second.score}`,
      canonical,
      scores,
      refsToRewrite,
      semantics
    };
  }

  return {
    verdict: "CANONICALIZABLE",
    reason: "same content; path-only catalog duplication",
    canonical,
    scores,
    refsToRewrite,
    semantics,
    postCanonicalVerdict: "SAFE_DEDUP"
  };
}

function main() {
  const registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, "utf8"));
  const assets = registry.assets || [];
  const codeFiles = walkCodeFiles();
  const lineIndex = buildLineIndex(codeFiles);
  const catalogMentions = scanCatalogMentions();
  const intakeSemantics = loadIntakeSemantics();
  const pinnedSlots = loadPinnedSlots();

  const byHash = new Map();
  for (const a of assets) {
    if (!a.contentHash || a.role !== "video_clip") continue;
    if (!byHash.has(a.contentHash)) byHash.set(a.contentHash, []);
    byHash.get(a.contentHash).push(a);
  }

  const dupGroups = [...byHash.values()].filter((g) => g.length > 1);
  const reviewGroups = [];

  for (const members of dupGroups) {
    const dedupVerdict = classifyDedupVerdict(members, lineIndex);
    if (dedupVerdict !== "REVIEW") continue;
    reviewGroups.push({ members, hash: members[0].contentHash });
  }

  const results = [];
  const summary = {
    groups: reviewGroups.length,
    CANONICALIZABLE: 0,
    SEMANTIC_SPLIT: 0,
    AMBIGUOUS: 0,
    BLOCKED: 0,
    bytesCanonicalizable: 0,
    bytesSemanticSplit: 0,
    refsToRewrite: 0,
    postSafeGroups: 0,
    postSafeBytes: 0
  };

  for (const g of reviewGroups) {
    const members = g.members;
    const bytesSaved = (members[0].sizeBytes || 0) * (members.length - 1);
    const consolidation = classifyConsolidation(
      { members },
      catalogMentions,
      intakeSemantics,
      pinnedSlots,
      lineIndex
    );

    const intakeRefs = [];
    const catalogRefs = [];
    for (const m of members) {
      for (const c of catalogMentions.get(m.path) || []) {
        if (c.file.includes("media-intake-overrides")) intakeRefs.push(`${c.file}:${c.line}`);
        else catalogRefs.push(`${c.file}:${c.line || "?"}`);
      }
    }

    const allRuntimeRefs = [...new Set(members.flatMap((m) => m.runtimeRefs || []))];

    summary[consolidation.verdict]++;
    summary.refsToRewrite += consolidation.refsToRewrite?.length || 0;

    if (consolidation.verdict === "CANONICALIZABLE") {
      summary.bytesCanonicalizable += bytesSaved;
      summary.postSafeGroups++;
      summary.postSafeBytes += bytesSaved;
    } else if (consolidation.verdict === "SEMANTIC_SPLIT") {
      summary.bytesSemanticSplit += bytesSaved;
    } else if (consolidation.verdict === "AMBIGUOUS" && consolidation.canonical) {
      /* potential partial */
    }

    results.push({
      hash: g.hash,
      paths: members.map((m) => m.path),
      ids: members.map((m) => m.id),
      runtimeRefs: allRuntimeRefs,
      intakeRefs: [...new Set(intakeRefs)],
      catalogRefs: [...new Set(catalogRefs)],
      proposedCanonical: consolidation.canonical?.path,
      canonicalScore: consolidation.canonical?.score,
      officialnessRanking: consolidation.scores?.map((s) => ({
        path: s.path,
        score: s.score
      })),
      refsToRewrite: consolidation.refsToRewrite || [],
      bytesSaved,
      risk:
        consolidation.verdict === "CANONICALIZABLE"
          ? "low"
          : consolidation.verdict === "SEMANTIC_SPLIT"
            ? "medium — merge catalog semantics first"
            : consolidation.verdict === "BLOCKED"
              ? "high"
              : "medium",
      verdict: consolidation.verdict,
      reason: consolidation.reason,
      postCanonicalVerdict: consolidation.postCanonicalVerdict || "—",
      semantics: consolidation.semantics
    });
  }

  results.sort((a, b) => b.bytesSaved - a.bytesSaved);

  const lines = [];
  lines.push("# ASSET PASS 05B — VIDEO CATALOG REF CONSOLIDATION PLAN");
  lines.push("");
  lines.push("**Režim:** analysis only · žádné změny refs/runtime.");
  lines.push("**Scope:** REVIEW duplicate groups · `role = video_clip`");
  lines.push("**Generováno:** `node scripts/analyze_video_catalog_refs.js`");
  lines.push("");
  lines.push("## Souhrn");
  lines.push("");
  lines.push("| Metrika | Hodnota |");
  lines.push("|---------|---------|");
  lines.push(`| REVIEW \`video_clip\` skupin | **${summary.groups}** |`);
  lines.push(`| **CANONICALIZABLE** | **${summary.CANONICALIZABLE}** |`);
  lines.push(`| **SEMANTIC_SPLIT** | **${summary.SEMANTIC_SPLIT}** |`);
  lines.push(`| **AMBIGUOUS** | **${summary.AMBIGUOUS}** |`);
  lines.push(`| **BLOCKED** | **${summary.BLOCKED}** |`);
  lines.push(`| **Canonicalizable bytes** | **${formatBytes(summary.bytesCanonicalizable)}** |`);
  lines.push(`| Semantic-split bytes (needs catalog merge) | ${formatBytes(summary.bytesSemanticSplit)} |`);
  lines.push(`| **Refs k přepsání (estimate)** | **${summary.refsToRewrite}** |`);
  lines.push(`| Po canonicalizaci → SAFE_DEDUP | **${summary.postSafeGroups}** skupin · ${formatBytes(summary.postSafeBytes)} |`);
  lines.push("");
  lines.push("### Canonical path pravidlo");
  lines.push("");
  lines.push("Nejkratší název ≠ canonical. Skóre: `media-intake-overrides` > `stream-media-overrides` pinned slot > `stream-media-catalog` > visual-review; penalizace `(1)`/`_211904` kopií.");
  lines.push("");
  lines.push("## Top canonical path návrhy");
  lines.push("");
  const topCanon = results
    .filter((r) => r.proposedCanonical)
    .slice(0, 15);
  lines.push("| Skupina hash | Verdict | Proposed canonical | Score | Bytes saved |");
  lines.push("|--------------|---------|-------------------|-------|-------------|");
  for (const r of topCanon) {
    lines.push(
      "| `" + r.hash.slice(0, 12) + "…` | " + r.verdict + " | `" + r.proposedCanonical + "` | " + r.canonicalScore + " | " + formatBytes(r.bytesSaved) + " |"
    );
  }
  lines.push("");
  lines.push("## Skupiny detail");
  lines.push("");

  for (const r of results) {
    lines.push(`### \`${r.hash.slice(0, 12)}…\` · ${r.verdict} · ${formatBytes(r.bytesSaved)}`);
    lines.push("");
    lines.push("| Pole | Hodnota |");
    lines.push("|------|---------|");
    lines.push(`| **HASH** | \`${r.hash}\` |`);
    lines.push(`| **ALL PATHS** | ${r.paths.map((p) => "`" + p + "`").join(" · ")} |`);
    lines.push(`| **Proposed canonical** | \`${r.proposedCanonical}\` (score ${r.canonicalScore}) |`);
    lines.push(`| **Expected bytes saved** | ${formatBytes(r.bytesSaved)} |`);
    lines.push(`| **Risk** | ${r.risk} |`);
    lines.push(`| **Post-canonical** | ${r.postCanonicalVerdict} |`);
    lines.push(`| **Důvod** | ${r.reason} |`);
    lines.push("");
    if (r.officialnessRanking?.length) {
      lines.push("**Officialness ranking:**");
      for (const o of r.officialnessRanking) {
        lines.push(`- \`${o.path}\` → ${o.score}`);
      }
      lines.push("");
    }
    lines.push("**Runtime refs (union):**");
    for (const ref of r.runtimeRefs.slice(0, 8)) lines.push(`- \`${ref}\``);
    if (r.runtimeRefs.length > 8) lines.push(`- … +${r.runtimeRefs.length - 8}`);
    lines.push("");
    lines.push("**media-intake-overrides refs:** " + (r.intakeRefs.length ? r.intakeRefs.join(", ") : "—"));
    lines.push("");
    lines.push("**Other catalog refs:** " + (r.catalogRefs.slice(0, 6).join(", ") || "—"));
    lines.push("");
    lines.push("**Refs to rewrite:** " + r.refsToRewrite.length);
    for (const rw of r.refsToRewrite.slice(0, 10)) {
      if (rw.file) {
        lines.push(`- \`${rw.file}:${rw.line}\` \`${rw.fromRel}\` → \`${rw.suggestRel}\``);
      } else {
        lines.push(`- \`${rw.from}\` (path \`${rw.path}\`) → canonical \`${rw.suggestCanonical}\``);
      }
    }
    if (r.refsToRewrite.length > 10) lines.push(`- … +${r.refsToRewrite.length - 10}`);
    lines.push("");
  }

  lines.push("## Post-freeze execution order");
  lines.push("");
  lines.push("1. Přepsat **CANONICALIZABLE** catalog refs na proposed canonical paths");
  lines.push("2. Re-run ASSET PASS 05 → REVIEW → SAFE_DEDUP");
  lines.push("3. Execute SAFE dedup (soubory, ne refs)");
  lines.push("4. **SEMANTIC_SPLIT** — ruční rozhodnutí tier/obsSlot před jakýmkoli mazáním");

  fs.writeFileSync(REPORT_PATH, lines.join("\n") + "\n", "utf8");

  registry.stats = {
    ...registry.stats,
    videoCatalogPlan05B: summary
  };
  registry.videoCatalogPlanPass = "05B";
  registry.videoCatalogPlanAt = new Date().toISOString();
  fs.writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2) + "\n", "utf8");

  console.log(JSON.stringify({ summary, report: REPORT_PATH }, null, 2));
}

main();
