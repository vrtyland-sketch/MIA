"use strict";

/**
 * ASSET PASS 04 — role classification (registry + docs only)
 * Usage: node scripts/classify_asset_roles.js
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const REGISTRY_PATH = path.join(ROOT, "content-pass", "ASSET_REGISTRY.json");
const REPORT_PATH = path.join(ROOT, "docs", "ASSET_PASS_04_ROLE_CLASSIFICATION.md");

const CONTROLLED_ROLES = [
  "gift_visual",
  "character_form",
  "character_mood",
  "overlay_ui",
  "overlay_background",
  "video_clip",
  "reference_image",
  "preview",
  "logo_brand",
  "unknown"
];

const LEGACY_MAP = {
  "gift-visual": "gift_visual",
  "stream-video": "video_clip",
  "overlay-shell": "overlay_ui",
  "koj-mood-sprite": "character_mood",
  "koj-form-sprite": "character_form",
  "koj-item-icon": "gift_visual",
  "animation-bank-sheet": "character_form",
  "koj-scene-bg": "overlay_background",
  "koj-evolution-art": "character_form",
  "koj-battle-art": "overlay_ui",
  "koj-custom-avatar": "character_form",
  "gift-moment-frame": "gift_visual",
  "story-moment-frame": "overlay_ui",
  "media-template-frame": "overlay_ui",
  "legacy-deprecated": "reference_image",
  "boss-cinematic-art": "overlay_ui"
};

function basename(p) {
  return path.basename(p.replace(/\\/g, "/"));
}

function addCandidate(list, role, weight, source, reason) {
  if (!CONTROLLED_ROLES.includes(role)) return;
  list.push({ role, weight, source, reason });
}

function classifyCandidates(asset) {
  const p = asset.path.replace(/\\/g, "/").toLowerCase();
  const base = basename(p).toLowerCase();
  const refs = (asset.runtimeRefs || []).join(" ").toLowerCase();
  const type = asset.type || "";
  const c = [];

  if (type === "html-overlay" || p.endsWith(".html")) {
    addCandidate(c, "overlay_ui", 5, "type", "html-overlay");
  }

  if (p.includes("gift-map-screenshots") || base.startsWith("screenshot_")) {
    addCandidate(c, "reference_image", 5, "path", "gift-map-screenshot");
  }
  if (p.includes("/gifts/") || p.includes("/gift-videos/") || p.includes("/items/")) {
    addCandidate(c, "gift_visual", 4, "path", "gift-path");
  }
  if (p.includes("/forms/") || p.includes("/variants/") || p.includes("/evolution/")) {
    addCandidate(c, "character_form", p.includes("/variants/") ? 5 : 4, "path", "character-form-path");
  }
  if (p.includes("/moods/") || p.includes("/stages/")) {
    addCandidate(c, "character_mood", 4, "path", "mood-path");
  } else if (base.includes("kojnozout-") && !p.includes("/variants/")) {
    addCandidate(c, "character_mood", 4, "path", "kojnozout-name");
  }
  if (p.includes("/backgrounds/") || p.includes("/scenes/") || /\/bg[-_]/.test(p)) {
    addCandidate(c, "overlay_background", 4, "path", "background-path");
  }
  if (base.includes("preview") || p.includes("/roster/") && base.includes("preview")) {
    addCandidate(c, "preview", 4, "filename", "preview-name");
  }
  if (p.includes("/masters/") || p.includes("_offline_backup")) {
    addCandidate(c, "reference_image", 3, "path", "master-or-backup");
  }
  if (p.includes("/mia/parts") || p.includes("body-part") || p.includes("/cyber/lip")) {
    addCandidate(c, "overlay_ui", 4, "path", "mia-body-ui");
  }
  if (p.includes("/fx/") || p.includes("/arena/") || p.includes("/props/")) {
    addCandidate(c, "overlay_ui", 3, "path", "fx-arena-props");
  }
  if (p.includes("animation-bank")) {
    addCandidate(c, "character_form", 3, "path", "animation-bank");
  }
  if (p.includes("incoming-images/videos") || type === "video") {
    addCandidate(c, "video_clip", 4, "path", "video-path");
  }
  if (p.includes("incoming-images/photos") && (base.endsWith(".gif") || base.endsWith(".mp4"))) {
    addCandidate(c, "video_clip", 4, "path", "photo-gif-clip");
  }
  if (p.includes("incoming-images/photos") && !base.endsWith(".gif")) {
    addCandidate(c, "reference_image", 2, "path", "photo-still");
  }
  if (
    /\/(tiktok|kick|twitch|youtube|discord)\//.test(p) ||
    base.includes("logo") ||
    p.includes("/brand/")
  ) {
    addCandidate(c, "logo_brand", 3, "path", "platform-brand");
  }

  if (refs.includes("stream-media-catalog")) {
    addCandidate(c, "video_clip", 5, "runtimeRef", "stream-media-catalog");
  }
  if (refs.includes("tiktok-gift-panel")) {
    addCandidate(c, "reference_image", 3, "runtimeRef", "gift-panel-intake");
  }
  if (refs.includes("overlay.html") || refs.includes("-overlay.html")) {
    addCandidate(c, "overlay_ui", 2, "runtimeRef", "overlay-html-ref");
  }
  if (refs.includes("kojnozrout") && p.includes("/forms/")) {
    addCandidate(c, "character_form", 2, "runtimeRef", "koj-form-ref");
  }

  if (asset.branch === "video" && !p.includes("screenshot") && type !== "image") {
    addCandidate(c, "video_clip", 1, "branch", "video-branch");
  }

  return c;
}

function pickRole(candidates) {
  if (!candidates.length) {
    return {
      role: "unknown",
      roleStatus: "unknown",
      roleConfidence: "low",
      roleSource: "none",
      roleReason: "no matching rules"
    };
  }

  const byRole = new Map();
  for (const x of candidates) {
    if (!byRole.has(x.role)) byRole.set(x.role, { score: 0, sources: new Set(), reasons: [] });
    const b = byRole.get(x.role);
    b.score += x.weight;
    b.sources.add(x.source);
    b.reasons.push(x.reason);
  }

  const ranked = [...byRole.entries()].sort((a, b) => b[1].score - a[1].score);
  const [topRole, top] = ranked[0];
  const second = ranked[1];

  if (second && second[1].score === top.score) {
    return {
      role: topRole,
      roleStatus: "conflict",
      roleConfidence: "low",
      roleSource: [...top.sources].join("+"),
      roleReason: `tie ${topRole} vs ${second[0]} (score ${top.score})`,
      conflictWith: second[0]
    };
  }

  if (second && second[1].score >= top.score - 1 && top.score <= 3) {
    return {
      role: topRole,
      roleStatus: "manual-review",
      roleConfidence: "medium",
      roleSource: [...top.sources].join("+"),
      roleReason: `narrow lead over ${second[0]} (${top.score} vs ${second[1].score})`,
      conflictWith: second[0]
    };
  }

  const confidence = top.score >= 4 ? "high" : top.score >= 2 ? "medium" : "low";
  return {
    role: topRole,
    roleStatus: "auto-classified",
    roleConfidence: confidence,
    roleSource: [...top.sources].join("+"),
    roleReason: top.reasons.slice(0, 3).join("; ")
  };
}

function normalizeLegacyRole(role) {
  if (!role) return null;
  if (CONTROLLED_ROLES.includes(role)) return role;
  return LEGACY_MAP[role] || null;
}

function buildHashGroups(assets) {
  const groups = new Map();
  for (const a of assets) {
    if (!a.contentHash) continue;
    if (!groups.has(a.contentHash)) groups.set(a.contentHash, []);
    groups.get(a.contentHash).push(a);
  }
  return [...groups.values()].filter((g) => g.length > 1);
}

function neighborRoleVote(asset, hashGroups, roleLookup) {
  const group = hashGroups.find((g) => g.some((x) => x.id === asset.id));
  if (!group) return null;
  const votes = new Map();
  for (const m of group) {
    if (m.id === asset.id) continue;
    const r = roleLookup.get(m.id);
    if (r && r !== "unknown") votes.set(r, (votes.get(r) || 0) + 1);
  }
  if (!votes.size) return null;
  return [...votes.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

function main() {
  const registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, "utf8"));
  const assets = registry.assets || [];

  const beforeNull = assets.filter((a) => !a.role || !normalizeLegacyRole(a.role)).length;
  const hashGroups = buildHashGroups(assets);
  const roleById = new Map();
  const stats = {
    pass: "04",
    beforeNullRole: assets.filter((a) => !a.role).length,
    legacyNormalized: 0,
    autoClassified: 0,
    unknown: 0,
    conflict: 0,
    manualReview: 0,
    hashNeighborApplied: 0,
    nullInput: 0,
    nullAutoClassified: 0,
    nullUnknown: 0,
    nullConflict: 0,
    nullManualReview: 0
  };

  const originallyNull = new Set(assets.filter((a) => !a.role).map((a) => a.id));
  stats.nullInput = originallyNull.size || stats.beforeNullRole;

  // Pass 1: classify / normalize
  for (const asset of assets) {
    const hadLegacy = asset.role && LEGACY_MAP[asset.role];
    const hadNull = !asset.role;
    const needsWork =
      hadNull ||
      hadLegacy ||
      !CONTROLLED_ROLES.includes(asset.role || "") ||
      ["conflict", "manual-review", "unknown"].includes(asset.roleStatus || "");

    let result;
    if (!needsWork) {
      result = {
        role: asset.role,
        roleStatus: asset.roleStatus || "auto-classified",
        roleConfidence: asset.roleConfidence || "high",
        roleSource: asset.roleSource || "existing",
        roleReason: asset.roleReason || "unchanged"
      };
    } else if (hadLegacy && !hadNull) {
      result = {
        role: LEGACY_MAP[asset.role],
        roleStatus: "auto-classified",
        roleConfidence: "high",
        roleSource: "legacy-map",
        roleReason: `normalized from ${asset.role}`
      };
      stats.legacyNormalized++;
    } else {
      const candidates = classifyCandidates(asset);
      result = pickRole(candidates);
      if (hadNull && result.roleStatus === "unknown") {
        /* keep unknown */
      }
    }

    asset._pending = result;
  }

  const pendingRoles = new Map(assets.map((a) => [a.id, a._pending.role]));

  // Pass 2: hash neighbor for unknown/conflict
  for (const asset of assets) {
    let result = asset._pending;
    if (result.roleStatus === "unknown" || result.roleStatus === "conflict") {
      const neighbor = neighborRoleVote(asset, hashGroups, pendingRoles);
      if (neighbor) {
        result = {
          role: neighbor,
          roleStatus: "auto-classified",
          roleConfidence: "medium",
          roleSource: "hash-neighbor",
          roleReason: `duplicate group majority → ${neighbor}`
        };
        stats.hashNeighborApplied++;
      }
    }

    asset.role = result.role;
    asset.roleStatus = result.roleStatus;
    asset.roleConfidence = result.roleConfidence;
    asset.roleSource = result.roleSource;
    asset.roleReason = result.roleReason;
    if (result.conflictWith) asset.roleConflictWith = result.conflictWith;
    else delete asset.roleConflictWith;
    delete asset._pending;

    if (result.roleStatus === "auto-classified") stats.autoClassified++;
    else if (result.roleStatus === "unknown") stats.unknown++;
    else if (result.roleStatus === "conflict") stats.conflict++;
    else if (result.roleStatus === "manual-review") stats.manualReview++;

    if (originallyNull.has(asset.id)) {
      if (result.roleStatus === "auto-classified") stats.nullAutoClassified++;
      else if (result.roleStatus === "unknown") stats.nullUnknown++;
      else if (result.roleStatus === "conflict") stats.nullConflict++;
      else if (result.roleStatus === "manual-review") stats.nullManualReview++;
    }
  }

  const roleCounts = {};
  for (const a of assets) roleCounts[a.role] = (roleCounts[a.role] || 0) + 1;

  registry.status = "role-classified";
  registry.rolePass = "04";
  registry.roleClassifiedAt = new Date().toISOString();
  registry.stats = {
    ...registry.stats,
    roleCounts,
    roleClassification: stats
  };

  fs.writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2) + "\n", "utf8");

  const dupReport = hashGroups
    .map((g) => ({
      hash: g[0].contentHash,
      sizeBytes: g[0].sizeBytes,
      members: g.map((a) => ({
        id: a.id,
        path: a.path,
        role: a.role,
        roleStatus: a.roleStatus,
        runtimeRefs: a.runtimeRefs || []
      }))
    }))
    .sort((a, b) => b.sizeBytes - a.sizeBytes);

  const lines = [];
  lines.push("# ASSET PASS 04 — ROLE CLASSIFICATION");
  lines.push("");
  lines.push("**Režim:** registry + docs only · žádné přesuny/mazání/runtime.");
  lines.push("**Generováno:** `node scripts/classify_asset_roles.js`");
  lines.push("");
  lines.push("## Souhrn");
  lines.push("");
  lines.push("| Metrika | Hodnota |");
  lines.push("|---------|---------|");
  lines.push(`| Vstup: prázdné \`role\` (03B) | **${stats.beforeNullRole}** |`);
  lines.push(`| Null-only: auto / unknown / conflict / manual | **${stats.nullAutoClassified} / ${stats.nullUnknown} / ${stats.nullConflict} / ${stats.nullManualReview}** |`);
  lines.push(`| (03B missing metadata celkem) | 496 — z toho \`role\` null bylo 421 |`);
  lines.push(`| Legacy hyphen roles normalizováno | ${stats.legacyNormalized} |`);
  lines.push(`| **auto-classified** | **${stats.autoClassified}** |`);
  lines.push(`| **unknown** | **${stats.unknown}** |`);
  lines.push(`| **conflict** | **${stats.conflict}** |`);
  lines.push(`| **manual-review** | **${stats.manualReview}** |`);
  lines.push(`| Hash-neighbor doplnění | ${stats.hashNeighborApplied} |`);
  lines.push("");
  lines.push("### Role distribuce (všechny záznamy)");
  lines.push("");
  for (const [role, n] of Object.entries(roleCounts).sort((a, b) => b[1] - a[1])) {
    lines.push(`- \`${role}\`: ${n}`);
  }
  lines.push("");
  lines.push("## Řízené kategorie");
  lines.push("");
  lines.push(CONTROLLED_ROLES.map((r) => `\`${r}\``).join(" · "));
  lines.push("");
  lines.push("## Unknown / conflict / manual-review");
  lines.push("");
  const review = assets.filter((a) =>
    ["unknown", "conflict", "manual-review"].includes(a.roleStatus)
  );
  if (!review.length) {
    lines.push("_Žádné — vše auto-classified._");
  } else {
    lines.push("| ID | Path | Role | Status | Důvod |");
    lines.push("|----|------|------|--------|-------|");
    for (const a of review.slice(0, 60)) {
      lines.push(
        `| \`${a.id}\` | \`${a.path}\` | ${a.role} | ${a.roleStatus} | ${a.roleReason || "—"} |`
      );
    }
    if (review.length > 60) lines.push(`| … | +${review.length - 60} dalších | | | |`);
  }
  lines.push("");
  lines.push("## Duplicate-content groups (103)");
  lines.push("");
  lines.push("Skupiny se stejným `contentHash` — pro budoucí dedup safety pass.");
  lines.push("");
  for (const g of dupReport.slice(0, 103)) {
    lines.push(`### \`${g.hash.slice(0, 12)}…\` · ${g.members.length}× · ${(g.sizeBytes / 1024).toFixed(0)} KB`);
    lines.push("");
    lines.push("| Registry ID | Role | Path | Runtime refs |");
    lines.push("|-------------|------|------|--------------|");
    for (const m of g.members) {
      const refs = m.runtimeRefs.slice(0, 2).join("; ") || "—";
      const more = m.runtimeRefs.length > 2 ? ` (+${m.runtimeRefs.length - 2})` : "";
      lines.push(`| \`${m.id}\` | \`${m.role}\` | \`${m.path}\` | ${refs}${more} |`);
    }
    lines.push("");
  }
  lines.push("## Unresolved refs (held — freeze)");
  lines.push("");
  lines.push("4 konkrétní MISSING z 03B — **neopravovat** během asset passu. Viz `docs/ASSET_PASS_03B_REGISTRY_SEED.md`.");
  lines.push("");
  lines.push("## Další krok");
  lines.push("");
  lines.push("**Dedup safety pass** — až s role metadata: rozlišit záměrné duplicity (preview vs form) od skutečného bordelu.");

  fs.writeFileSync(REPORT_PATH, lines.join("\n") + "\n", "utf8");

  console.log(JSON.stringify({ stats, roleCounts, duplicateGroups: dupReport.length, report: REPORT_PATH }, null, 2));
}

main();
