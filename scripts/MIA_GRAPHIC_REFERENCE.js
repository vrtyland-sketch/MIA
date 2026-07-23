"use strict";

/**
 * Grafické reference — POUZE animovaná videa z Prahy jsou vzorem pro avatary
 * a budoucí vzhled grafiky na streamu (Paint, overlay, creature styl).
 *
 * Live-action klipy, meme, sport, komunitní WA bez PixVerse/Prahy → ne.
 */

const fs = require("fs");
const path = require("path");

const PROJECT_ROOT = path.resolve(__dirname, "..");
const INTAKE_PATH = path.join(PROJECT_ROOT, "config", "media-intake-overrides.json");
const REVIEW_PATH = path.join(PROJECT_ROOT, "config", "media-visual-review.json");

const PRAGUE_THEME_RE = /prague|praha/;
const PRAGUE_TEXT_RE =
  /praha|prague|karl[ůu]v most|charles bridge|malá strana|malastrana|pixverse.*praha/i;
const ANIMATED_THEME_RE =
  /pixverse|prague_pixverse|prague_romance|cute_ai|fantasy_animal|vfx_abstract|mia_koj_signature/;

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function normalizeTags(tags = []) {
  if (!Array.isArray(tags)) return [];
  return tags.map((tag) => safeString(tag).toLowerCase()).filter(Boolean);
}

function loadVisualMetadataIndex() {
  const index = new Map();

  if (fs.existsSync(INTAKE_PATH)) {
    try {
      const intake = JSON.parse(fs.readFileSync(INTAKE_PATH, "utf8"));
      for (const row of intake.assignments || []) {
        const rel = safeString(row.rel).replace(/\\/g, "/");
        if (!rel) continue;
        index.set(rel, {
          theme: safeString(row.theme),
          tags: normalizeTags(row.tags),
          visualSummary: safeString(row.note),
          note: safeString(row.note),
          source: "intake"
        });
      }
    } catch (_err) {
      // ignore
    }
  }

  if (fs.existsSync(REVIEW_PATH)) {
    try {
      const review = JSON.parse(fs.readFileSync(REVIEW_PATH, "utf8"));
      for (const row of review.items || []) {
        const rel = safeString(row.rel).replace(/\\/g, "/");
        if (!rel) continue;
        const prev = index.get(rel) || {};
        index.set(rel, {
          ...prev,
          theme: safeString(row.theme, prev.theme),
          tags: normalizeTags(row.tags).length ? normalizeTags(row.tags) : prev.tags || [],
          visualSummary: safeString(row.visualSummary, prev.visualSummary),
          visualReviewed: row.visualReviewed === true,
          source: "review"
        });
      }
    } catch (_err) {
      // ignore
    }
  }

  return index;
}

function enrichVideoWithVisualMeta(item = {}, metadataIndex = null) {
  const index = metadataIndex || loadVisualMetadataIndex();
  const rel = safeString(item.rel).replace(/\\/g, "/");
  const meta = index.get(rel) || {};
  return {
    ...item,
    theme: safeString(item.theme, meta.theme),
    tags: normalizeTags(item.tags?.length ? item.tags : meta.tags),
    visualSummary: safeString(item.visualSummary, meta.visualSummary),
    note: safeString(item.note, meta.note),
    visualReviewed: item.visualReviewed ?? meta.visualReviewed ?? false
  };
}

function isAnimatedVideo(item = {}) {
  const kind = safeString(item.contentKind).toLowerCase();
  const pattern = safeString(item.pattern).toLowerCase();
  const theme = safeString(item.theme).toLowerCase();
  const tags = normalizeTags(item.tags);

  if (pattern === "hailuo_ai") return true;
  if (kind === "short_animation") return true;
  if (ANIMATED_THEME_RE.test(theme)) return true;
  if (tags.some((tag) => /pixverse|hailuo|cute_ai|animated|vfx/.test(tag))) return true;

  if (kind === "donator_moment" || kind === "quote_clip") {
    return tags.includes("pixverse") || /pixverse|hailuo|cute_ai/.test(theme);
  }

  if (
    kind === "story_music" ||
    kind === "story_epic" ||
    kind === "story_legend" ||
    kind === "profile_reel"
  ) {
    return tags.includes("pixverse") || /pixverse|hailuo|prague_/.test(theme);
  }

  return false;
}

function isPragueThemed(item = {}) {
  const theme = safeString(item.theme).toLowerCase();
  if (PRAGUE_THEME_RE.test(theme)) return true;

  const tags = normalizeTags(item.tags);
  if (tags.includes("prague") || tags.includes("praha")) return true;

  const hay = `${item.visualSummary || ""} ${item.note || ""} ${item.name || ""}`;
  return PRAGUE_TEXT_RE.test(hay);
}

function isGraphicReferenceVideo(item = {}) {
  return isAnimatedVideo(item) && isPragueThemed(item);
}

function buildGraphicReferencePool(videos = [], options = {}) {
  const metadataIndex = options.metadataIndex || loadVisualMetadataIndex();
  const pool = [];

  for (const raw of videos) {
    if (raw?.kind !== "videos") continue;
    const item = enrichVideoWithVisualMeta(raw, metadataIndex);
    if (!isGraphicReferenceVideo(item)) continue;
    pool.push({
      id: item.id,
      rel: item.rel,
      name: item.name,
      contentKind: item.contentKind,
      theme: item.theme,
      tags: item.tags,
      visualSummary: item.visualSummary,
      durationMs: item.durationMs,
      qualityScore: item.qualityScore,
      graphicRole: item.contentKind === "profile_reel" ? "avatar_seed" : "stream_style",
      provider: "mia_graphic_reference_v1"
    });
  }

  return pool.sort((a, b) => (b.qualityScore || 0) - (a.qualityScore || 0));
}

function pickGraphicReference(pool = [], seed = "", role = "avatar") {
  const list = Array.isArray(pool) ? pool.filter((row) => row?.rel) : [];
  if (!list.length) return null;

  const roleFiltered =
    role === "avatar"
      ? list.filter((row) => row.graphicRole === "avatar_seed").concat(list)
      : list;

  let hash = 0;
  const label = safeString(seed, "prague_style");
  for (let i = 0; i < label.length; i += 1) {
    hash = (hash * 31 + label.charCodeAt(i)) >>> 0;
  }
  return roleFiltered[hash % roleFiltered.length];
}

function buildGraphicStyleBrief(item = {}) {
  if (!item?.rel) return null;
  return {
    rel: item.rel,
    theme: item.theme,
    tags: item.tags || [],
    visualSummary: item.visualSummary || "",
    graphicRole: item.graphicRole || "stream_style",
    usage: "avatar_and_stream_graphics_only",
    note: "Pouze animovaná Praha — vzor pro Paint avatar a budoucí stream grafiku."
  };
}

function resolveArcVisualReference(arc = {}, graphicPool = [], seed = "") {
  const picked =
    pickGraphicReference(graphicPool, seed, "avatar") ||
    pickGraphicReference(graphicPool, `${seed}_style`, "stream");
  if (!picked) {
    return {
      avatarFrom: null,
      bossStatueFrom: null,
      streamStyleFrom: null,
      note: "Žádné animované Praha reference v poolu — přidej PixVerse/Praha klipy."
    };
  }
  const style = pickGraphicReference(graphicPool, `${seed}_alt`, "stream") || picked;
  return {
    avatarFrom: picked.rel,
    bossStatueFrom: style.rel,
    streamStyleFrom: style.rel,
    theme: picked.theme,
    visualSummary: picked.visualSummary,
    note: "Pouze animovaná videa z Prahy — vzor pro avatar a stream grafiku."
  };
}

module.exports = {
  loadVisualMetadataIndex,
  enrichVideoWithVisualMeta,
  isAnimatedVideo,
  isPragueThemed,
  isGraphicReferenceVideo,
  buildGraphicReferencePool,
  pickGraphicReference,
  buildGraphicStyleBrief,
  resolveArcVisualReference
};
