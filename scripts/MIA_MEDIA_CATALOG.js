"use strict";

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const MUSIC_VIDEO_CATEGORIES = new Set(["story_music", "story_epic", "story_legend"]);
const CONTENT_KIND_LABELS = {
  short_animation: "krátká animace",
  quote_clip: "citát / voice clip",
  donator_moment: "moment dárce",
  profile_reel: "profilové video",
  story_music: "příběh + hudba",
  story_epic: "epický příběh",
  story_legend: "legendární příběh",
  cute_clip: "cute clip",
  generic_video: "obecné video"
};
const ALL_GIFT_TIERS = ["T1", "T2", "T3", "T4", "T5", "PROFILE"];
const TIERS_REQUIRING_AUDIO = new Set(["T2", "T3", "T4", "T5"]);
const crypto = require("crypto");
const storyArcRegistry = require("./MIA_STORY_ARC_REGISTRY");
const graphicReference = require("./MIA_GRAPHIC_REFERENCE");
const { probeVideoMedia, durationBucket, estimateDurationMsFromSize } = require("./MIA_MEDIA_PROBE");

const PROJECT_ROOT = path.resolve(__dirname, "..");
const INBOX = path.join(PROJECT_ROOT, "incoming-images");
const TEMPLATES_PATH = path.join(PROJECT_ROOT, "config", "media-templates.json");
const CATALOG_PATH = path.join(PROJECT_ROOT, "config", "stream-media-catalog.json");
const OVERRIDES_PATH = path.join(PROJECT_ROOT, "config", "stream-media-overrides.json");

const PHOTO_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif", ".bmp", ".gif"]);
const VIDEO_EXT = new Set([".mp4", ".mov", ".webm", ".mkv", ".avi", ".3gp", ".m4v"]);

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function fileId(relPath) {
  return crypto.createHash("sha1").update(relPath).digest("hex").slice(0, 12);
}

function detectSourcePattern(name = "") {
  if (/^IMG-\d{8}-WA/i.test(name)) return "whatsapp_photo";
  if (/^VID-\d{8}-WA/i.test(name)) return "whatsapp_video";
  if (/^WhatsApp Image/i.test(name)) return "wa_desktop_photo";
  if (/^WhatsApp Video/i.test(name)) return "wa_desktop_video";
  if (/^file_/i.test(name)) return "contact_file";
  if (/^hailuo_/i.test(name)) return "hailuo_ai";
  if (/^lv_/i.test(name)) return "lv_edit";
  if (/^\d{4}-\d{2}-\d{2}-\d+\.mp4$/i.test(name)) return "photos_export";
  if (/^\d{13}\./.test(name)) return "timestamp_gif";
  if (/\.gif$/i.test(name)) return "gif";
  return "other";
}

function classifyPhoto(entry = {}) {
  const { name, sizeBytes, pattern } = entry;
  if (/\.gif$/i.test(name) || pattern === "timestamp_gif" || pattern === "gif") {
    return { category: "sticker_gif", streamRole: "overlay_asset", qualityScore: 40 };
  }
  if (pattern === "contact_file") {
    const score = sizeBytes >= 80_000 && sizeBytes <= 2_500_000 ? 92 : 70;
    return {
      category: sizeBytes > 900_000 ? "profile_hero" : "profile_photo",
      streamRole: "donator_avatar",
      qualityScore: score
    };
  }
  if (pattern === "whatsapp_photo" || pattern === "wa_desktop_photo") {
    const score = sizeBytes >= 50_000 && sizeBytes <= 800_000 ? 88 : 65;
    return { category: "profile_photo", streamRole: "donator_avatar", qualityScore: score };
  }
  if (pattern === "lv_edit") {
    return { category: "profile_hero", streamRole: "overlay_asset", qualityScore: 75 };
  }
  return {
    category: sizeBytes > 600_000 ? "profile_hero" : "photo_other",
    streamRole: "overlay_asset",
    qualityScore: 55
  };
}

function categorySuggestsEmbeddedAudio(category = "") {
  return MUSIC_VIDEO_CATEGORIES.has(safeString(category));
}

function tierRequiresEmbeddedAudio(tier = "") {
  return TIERS_REQUIRING_AUDIO.has(safeString(tier).toUpperCase());
}

function videoQualifiesForAudioTier(item = {}) {
  if (item.hasEmbeddedAudio === true) return true;
  if (item.hasEmbeddedAudio === false) return false;
  if (
    MUSIC_VIDEO_CATEGORIES.has(safeString(item.contentKind)) ||
    safeString(item.contentKind) === "quote_clip" ||
    safeString(item.contentKind) === "donator_moment"
  ) {
    return true;
  }
  return categorySuggestsEmbeddedAudio(item.category);
}

function applyTierAudioPolicy(item = {}, tier = "") {
  if (!item || typeof item !== "object") return item;
  if (!tierRequiresEmbeddedAudio(tier)) return item;
  return {
    ...item,
    hasEmbeddedAudio: true
  };
}

function filterVideosForAudioTier(items = [], tier = "") {
  if (!tierRequiresEmbeddedAudio(tier)) {
    return Array.isArray(items) ? items : [];
  }
  const list = Array.isArray(items) ? items : [];
  const withAudio = list.filter((item) => videoQualifiesForAudioTier(item));
  return withAudio.length ? withAudio : list;
}

function probeVideoHasEmbeddedAudio(absPath = "") {
  const safePath = safeString(absPath);
  if (!safePath || !fs.existsSync(safePath)) {
    return null;
  }

  try {
    const result = spawnSync(
      "ffprobe",
      [
        "-v",
        "error",
        "-select_streams",
        "a:0",
        "-show_entries",
        "stream=codec_type",
        "-of",
        "csv=p=0",
        safePath
      ],
      { encoding: "utf8", timeout: 2500, windowsHide: true }
    );

    if (result.error || result.status !== 0) {
      return null;
    }

    return safeString(result.stdout).toLowerCase() === "audio";
  } catch (_err) {
    return null;
  }
}

function resolveEmbeddedAudio(entry = {}) {
  if (typeof entry.hasEmbeddedAudio === "boolean") {
    return entry.hasEmbeddedAudio;
  }

  const probed = probeVideoHasEmbeddedAudio(entry.abs);
  if (probed !== null) {
    return probed;
  }

  return categorySuggestsEmbeddedAudio(entry.category);
}

function buildObsSourceAudioMap(catalog = null) {
  const map = {};
  for (const assignment of catalog?.obsAssignments || []) {
    const sourceName = safeString(assignment.obsSource);
    if (!sourceName) continue;
    map[sourceName] = resolveEmbeddedAudio(assignment);
  }
  return map;
}

function inferContentKind(entry = {}) {
  const { pattern, sizeBytes, durationMs, hasEmbeddedAudio } = entry;
  const dur = typeof durationMs === "number" ? durationMs : null;
  const audio = hasEmbeddedAudio === true;
  const silent = hasEmbeddedAudio === false;

  if (pattern === "hailuo_ai") {
    return "short_animation";
  }

  if (pattern === "lv_edit") {
    if ((dur != null && dur >= 75_000) || sizeBytes >= 12_000_000) {
      return "story_legend";
    }
    if ((dur != null && dur >= 45_000) || sizeBytes >= 8_000_000) {
      return "story_epic";
    }
    return "story_music";
  }

  if (pattern === "photos_export") {
    if ((dur != null && dur >= 75_000) || sizeBytes >= 25_000_000) {
      return "story_legend";
    }
    if ((dur != null && dur >= 45_000) || sizeBytes >= 12_000_000) {
      return "story_epic";
    }
    if ((dur != null && dur >= 15_000) || sizeBytes >= 4_000_000) {
      return "story_music";
    }
    return "donator_moment";
  }

  if (pattern === "whatsapp_video" || pattern === "wa_desktop_video") {
    if ((dur != null && dur >= 45_000) || sizeBytes >= 25_000_000) {
      return "story_legend";
    }
    if ((dur != null && dur >= 30_000) || sizeBytes >= 12_000_000) {
      return "story_epic";
    }
    if (dur != null && dur < 15_000 && sizeBytes < 2_500_000) {
      return "profile_reel";
    }
    if ((dur != null && dur < 12_000 && silent) || (sizeBytes < 1_200_000 && silent)) {
      return "short_animation";
    }
    if (sizeBytes < 5_000_000) {
      return "donator_moment";
    }
    return "story_music";
  }

  if (dur != null && dur < 8000 && silent) {
    return "short_animation";
  }
  if (dur != null && dur >= 3000 && dur <= 20_000 && audio && sizeBytes < 3_000_000) {
    return "quote_clip";
  }
  if (dur != null && dur >= 90_000) {
    return "story_legend";
  }
  if (dur != null && dur >= 45_000) {
    return audio ? "story_epic" : "story_music";
  }
  if (dur != null && dur >= 15_000 && audio) {
    return "story_music";
  }
  if (audio) {
    return "donator_moment";
  }
  return "short_animation";
}

function contentKindToCategory(contentKind = "") {
  const map = {
    short_animation: "cute_clip",
    quote_clip: "donator_moment",
    donator_moment: "donator_moment",
    profile_reel: "donator_moment",
    story_music: "story_music",
    story_epic: "story_epic",
    story_legend: "story_legend",
    cute_clip: "cute_clip",
    generic_video: "generic_video"
  };
  return map[contentKind] || "generic_video";
}

function contentKindToTier(contentKind = "", templates = null) {
  const tierDefaults = templates?.contentKindTierDefaults || {};
  if (tierDefaults[contentKind]) {
    return safeString(tierDefaults[contentKind]).toUpperCase();
  }
  const map = {
    short_animation: "T1",
    quote_clip: "T2",
    donator_moment: "T2",
    profile_reel: "PROFILE",
    story_music: "T3",
    story_epic: "T4",
    story_legend: "T5",
    cute_clip: "T1",
    generic_video: "T3"
  };
  return map[contentKind] || "T3";
}

function scoreVideoQuality(entry = {}) {
  let score = 60;
  const { sizeBytes, pattern, durationMs, hasEmbeddedAudio, contentKind } = entry;

  if (pattern === "hailuo_ai") score = 85;
  else if (pattern === "lv_edit") score = sizeBytes >= 12_000_000 ? 92 : sizeBytes >= 4_000_000 ? 88 : 82;
  else if (pattern === "photos_export") {
    score = sizeBytes >= 50_000_000 ? 94 : sizeBytes >= 20_000_000 ? 90 : sizeBytes >= 8_000_000 ? 86 : 78;
  }
  else if (pattern === "whatsapp_video" || pattern === "wa_desktop_video") {
    score = sizeBytes < 1_200_000 ? 80 : sizeBytes < 5_000_000 ? 86 : 84;
  } else if (sizeBytes >= 15_000_000) {
    score = 78;
  }

  if (typeof durationMs === "number") {
    if (durationMs >= 5000 && durationMs <= 60_000) score += 4;
    if (durationMs > 120_000) score -= 5;
  }
  if (contentKind === "story_legend") score += 6;
  if (contentKind === "profile_reel" && hasEmbeddedAudio) score += 3;
  return Math.max(40, Math.min(100, score));
}

function inferEmbeddedAudioHeuristic(entry = {}) {
  const { pattern, sizeBytes, contentKind } = entry;

  if (contentKind === "short_animation") return false;
  if (
    contentKind === "quote_clip" ||
    contentKind === "story_music" ||
    contentKind === "story_epic" ||
    contentKind === "story_legend" ||
    contentKind === "donator_moment" ||
    contentKind === "profile_reel"
  ) {
    return true;
  }
  if (pattern === "hailuo_ai") return false;
  if (pattern === "lv_edit" || pattern === "photos_export") return true;
  if ((pattern === "whatsapp_video" || pattern === "wa_desktop_video") && sizeBytes >= 800_000) {
    return true;
  }
  return null;
}

function enrichVideoItem(entry = {}, options = {}) {
  const cached = options.cachedProbe || null;
  const shouldProbe = options.probeVideos !== false;
  let probe = cached;

  if (!probe && shouldProbe) {
    probe = probeVideoMedia(entry.abs, options.probeOptions);
  }

  const durationMs =
    typeof probe?.durationMs === "number"
      ? probe.durationMs
      : typeof entry.durationMs === "number"
        ? entry.durationMs
        : estimateDurationMsFromSize(entry);

  const draft = {
    ...entry,
    durationMs,
    width: probe?.width ?? entry.width ?? null,
    height: probe?.height ?? entry.height ?? null,
    probeOk: probe?.probeOk === true
  };

  const contentKind = inferContentKind(draft);
  const templates = options.templates || loadTemplates();
  const suggestedTier = contentKindToTier(contentKind, templates);
  const category = contentKindToCategory(contentKind);

  let hasEmbeddedAudio = null;
  if (typeof probe?.hasEmbeddedAudio === "boolean") {
    hasEmbeddedAudio = probe.hasEmbeddedAudio;
  } else if (typeof entry.hasEmbeddedAudio === "boolean") {
    hasEmbeddedAudio = entry.hasEmbeddedAudio;
  } else {
    hasEmbeddedAudio = inferEmbeddedAudioHeuristic({ ...draft, contentKind });
  }
  if (hasEmbeddedAudio === null) {
    hasEmbeddedAudio = resolveEmbeddedAudio({ ...draft, category });
  }

  return {
    ...draft,
    hasEmbeddedAudio,
    durationBucket: durationBucket(durationMs),
    contentKind,
    contentKindLabel: CONTENT_KIND_LABELS[contentKind] || contentKind,
    category,
    streamRole: contentKind === "profile_reel" ? "profile_video" : "gift_video",
    suggestedTier,
    qualityScore: scoreVideoQuality({ ...draft, contentKind, hasEmbeddedAudio }),
    durationEstimated: probe?.probeOk !== true && typeof probe?.durationMs !== "number"
  };
}

function classifyVideo(entry = {}) {
  return enrichVideoItem(entry, { probeVideos: false, templates: loadTemplates() });
}

function loadTemplates() {
  if (!fs.existsSync(TEMPLATES_PATH)) return { tierSlots: {}, categoryTierDefaults: {} };
  return JSON.parse(fs.readFileSync(TEMPLATES_PATH, "utf8"));
}

const VIDEOS_2_INTAKE_PATH = path.join(PROJECT_ROOT, "config", "videos_2-intake.json");
const MEDIA_INTAKE_PATH = path.join(PROJECT_ROOT, "config", "media-intake-overrides.json");

function listVideoScanDirs(root = INBOX) {
  const dirs = [];
  const seen = new Set();

  const pushDir = (relPrefix, absDir) => {
    const key = safeString(relPrefix);
    if (!key || seen.has(key) || !fs.existsSync(absDir)) return;
    seen.add(key);
    dirs.push({ relPrefix: key, absDir });
  };

  pushDir("videos", path.join(root, "videos"));

  if (fs.existsSync(root)) {
    for (const name of fs.readdirSync(root)) {
      if (!/^videos_\d+$/i.test(name)) continue;
      pushDir(name, path.join(root, name));
    }
  }

  return dirs.sort((a, b) => a.relPrefix.localeCompare(b.relPrefix));
}

function loadVideos2Intake() {
  const assignments = [];
  const ignored = [];

  for (const filePath of [MEDIA_INTAKE_PATH, VIDEOS_2_INTAKE_PATH]) {
    if (!fs.existsSync(filePath)) continue;
    try {
      const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
      if (Array.isArray(parsed.assignments)) {
        assignments.push(...parsed.assignments);
      }
      if (Array.isArray(parsed.ignored)) {
        ignored.push(...parsed.ignored);
      }
    } catch (_err) {
      /* ignore */
    }
  }

  return { assignments, ignored };
}

function matchesIntakeIgnored(name = "", rel = "", ignored = []) {
  const base = safeString(name).toLowerCase();
  const full = safeString(rel).toLowerCase();
  for (const ruleRaw of ignored) {
    const rule = safeString(ruleRaw).toLowerCase();
    if (!rule) continue;
    if (rule.startsWith("*") && base.endsWith(rule.slice(1))) return true;
    if (base === rule || full === rule) return true;
  }
  return false;
}

function applyIntakeTierOverrides(items = []) {
  const intake = loadVideos2Intake();
  const byRel = new Map(
    intake.assignments
      .map((row) => [safeString(row.rel).replace(/\\/g, "/"), row])
      .filter(([rel]) => rel)
  );

  return items.map((item) => {
    const override = byRel.get(safeString(item.rel).replace(/\\/g, "/"));
    if (!override) return item;

    const tier = safeString(override.tier, item.suggestedTier).toUpperCase();
    const contentKind = safeString(override.contentKind, item.contentKind);
    return {
      ...item,
      contentKind,
      contentKindLabel: CONTENT_KIND_LABELS[contentKind] || contentKind,
      category: contentKindToCategory(contentKind),
      suggestedTier: tier,
      intakeOverride: true,
      intakeNote: safeString(override.note)
    };
  });
}

function scanMediaLibrary(options = {}) {
  const root = options.root || INBOX;
  const templates = options.templates || loadTemplates();
  const previousCatalog = options.previousCatalog || null;
  const probeCache = new Map();

  if (previousCatalog?.items) {
    for (const item of previousCatalog.items) {
      if (item.kind !== "videos") continue;
      probeCache.set(item.rel, {
        durationMs: item.durationMs,
        width: item.width,
        height: item.height,
        hasEmbeddedAudio: item.hasEmbeddedAudio,
        probeOk: item.probeOk,
        mtime: item.mtime
      });
    }
  }

  const items = [];

  for (const kind of ["photos"]) {
    const dir = path.join(root, kind);
    if (!fs.existsSync(dir)) continue;
    for (const name of fs.readdirSync(dir)) {
      const full = path.join(dir, name);
      if (!fs.statSync(full).isFile()) continue;
      if (name.startsWith(".")) continue;
      const ext = path.extname(name).toLowerCase();
      if (!PHOTO_EXT.has(ext)) continue;

      const st = fs.statSync(full);
      const rel = `${kind}/${name}`.replace(/\\/g, "/");
      const pattern = detectSourcePattern(name);
      const base = {
        id: fileId(rel),
        rel,
        abs: full,
        kind,
        name,
        pattern,
        sizeBytes: st.size,
        mtime: st.mtime.toISOString()
      };
      items.push({ ...base, ...classifyPhoto(base), streamAllowed: true });
    }
  }

  for (const videoRoot of listVideoScanDirs(root)) {
    for (const name of fs.readdirSync(videoRoot.absDir)) {
      const full = path.join(videoRoot.absDir, name);
      if (!fs.statSync(full).isFile()) continue;
      if (name.startsWith(".")) continue;
      const ext = path.extname(name).toLowerCase();
      if (!VIDEO_EXT.has(ext)) continue;
      const relKey = `${videoRoot.relPrefix}/${name}`.toLowerCase();
      if (matchesIntakeIgnored(name, relKey, loadVideos2Intake().ignored)) {
        continue;
      }

      const st = fs.statSync(full);
      const rel = `${videoRoot.relPrefix}/${name}`.replace(/\\/g, "/");
      const pattern = detectSourcePattern(name);
      const base = {
        id: fileId(rel),
        rel,
        abs: full,
        kind: "videos",
        name,
        pattern,
        sizeBytes: st.size,
        mtime: st.mtime.toISOString(),
        sourceFolder: videoRoot.relPrefix
      };

      const cached = probeCache.get(rel);
      const cachedProbe =
        cached && cached.mtime === base.mtime && cached.probeOk === true
          ? {
              durationMs: cached.durationMs,
              width: cached.width,
              height: cached.height,
              hasEmbeddedAudio: cached.hasEmbeddedAudio,
              probeOk: true
            }
          : null;

      items.push({
        ...enrichVideoItem(base, {
          templates,
          probeVideos: options.probeVideos !== false,
          cachedProbe,
          probeOptions: options.probeOptions
        }),
        streamAllowed: true
      });
    }
  }

  const withOverrides = applyIntakeTierOverrides(items);
  withOverrides.sort((a, b) => (b.qualityScore || 0) - (a.qualityScore || 0));
  return withOverrides;
}

function loadOverrides() {
  if (!fs.existsSync(OVERRIDES_PATH)) {
    return { pinnedSlots: {}, blockedRel: [] };
  }
  try {
    return JSON.parse(fs.readFileSync(OVERRIDES_PATH, "utf8"));
  } catch (_err) {
    return { pinnedSlots: {}, blockedRel: [] };
  }
}

function applyOverrides(items = [], assignments = []) {
  const overrides = loadOverrides();
  const blocked = new Set((overrides.blockedRel || []).map((r) => safeString(r)));
  const filteredItems = items.filter((i) => !blocked.has(i.rel));
  const filteredAssignments = assignments.filter((a) => !blocked.has(a.rel));

  const itemByRel = new Map(filteredItems.map((i) => [i.rel, i]));
  const pinned = overrides.pinnedSlots || {};

  for (const [obsSource, relPath] of Object.entries(pinned)) {
    const rel = safeString(relPath).replace(/\\/g, "/");
    const item = itemByRel.get(rel);
    if (!item || item.kind !== "videos") continue;

    const idx = filteredAssignments.findIndex((a) => a.obsSource === obsSource);
    const m = obsSource.match(/^(T[1-5]|PROFILE)_/i);
    const entry = {
      obsSource,
      tier: m ? (m[1].toUpperCase() === "PROFILE" ? "PROFILE" : m[1].toUpperCase()) : "T1",
      mediaId: item.id,
      rel: item.rel,
      abs: item.abs,
      category: item.category,
      contentKind: item.contentKind,
      pattern: item.pattern,
      durationMs: item.durationMs,
      durationBucket: item.durationBucket,
      hasEmbeddedAudio: item.hasEmbeddedAudio,
      qualityScore: item.qualityScore,
      pinned: true
    };

    if (idx >= 0) filteredAssignments[idx] = entry;
    else filteredAssignments.push(entry);
  }

  return { items: filteredItems, assignments: filteredAssignments };
}

const TIER_CONTENT_KINDS = {
  T1: ["short_animation"],
  T2: ["donator_moment", "quote_clip", "story_music"],
  T3: ["story_music", "donator_moment", "quote_clip"],
  T4: ["story_epic", "story_legend"],
  T5: ["story_legend", "story_epic"],
  PROFILE: ["profile_reel"]
};

function tierDurationWindow(tier = "T1") {
  const t = safeString(tier, "T1").toUpperCase();
  if (t === "T1") return { minMs: 3000, maxMs: 35_000 };
  if (t === "T2") return { minMs: 8000, maxMs: 35_000 };
  if (t === "T3") return { minMs: 12_000, maxMs: 75_000 };
  if (t === "T4") return { minMs: 35_000, maxMs: 120_000 };
  if (t === "T5") return { minMs: 55_000, maxMs: 240_000 };
  if (t === "PROFILE") return { minMs: 2000, maxMs: 18_000 };
  return { minMs: 0, maxMs: Number.MAX_SAFE_INTEGER };
}

function fitsTierDuration(tier, durationMs) {
  const dur = toNumber(durationMs, 0);
  if (!dur) return true;
  const { minMs, maxMs } = tierDurationWindow(tier);
  return dur >= minMs && dur <= maxMs;
}

function pickFallbackVideoForTier(tier, videos = [], usedRels = new Set()) {
  const safeTier = safeString(tier, "T3").toUpperCase();
  const kinds = TIER_CONTENT_KINDS[safeTier] || TIER_CONTENT_KINDS.T3;

  const candidates = videos.filter((item) => {
    if (item.kind !== "videos") return false;
    if (usedRels.has(item.rel)) return false;
    if (!kinds.includes(item.contentKind)) return false;
    if (tierRequiresEmbeddedAudio(safeTier) && !videoQualifiesForAudioTier(item)) {
      return false;
    }
    return fitsTierDuration(safeTier, item.durationMs);
  });

  candidates.sort((a, b) => {
    const q = (b.qualityScore || 0) - (a.qualityScore || 0);
    if (q !== 0) return q;
    return toNumber(a.durationMs, 0) - toNumber(b.durationMs, 0);
  });

  return candidates[0] || null;
}

function assignObsSlots(items = [], templates = loadTemplates()) {
  const tierSlots = templates.tierSlots || {};
  const tierDefaults = templates.categoryTierDefaults || {};
  const byTier = {};
  for (const tier of ALL_GIFT_TIERS) {
    byTier[tier] = [];
  }

  const videos = items.filter((i) => i.kind === "videos");
  for (const item of videos) {
    const tier = safeString(
      item.suggestedTier,
      tierDefaults[item.category] || contentKindToTier(item.contentKind, templates)
    ).toUpperCase();
    if (byTier[tier]) {
      byTier[tier].push(item);
    } else {
      byTier.T3.push(item);
    }
  }

  for (const tier of Object.keys(byTier)) {
    byTier[tier].sort((a, b) => (b.qualityScore || 0) - (a.qualityScore || 0));
    byTier[tier] = filterVideosForAudioTier(byTier[tier], tier);
  }

  const assignments = [];
  const usedRels = new Set();

  for (const tier of ALL_GIFT_TIERS) {
    const slots = tierSlots[tier] || [];
    if (!slots.length) continue;

    const pool = byTier[tier] || [];
    let poolIndex = 0;

    for (const slot of slots) {
      let pick = pool[poolIndex] || null;
      if (pick) {
        poolIndex += 1;
      } else {
        pick = pickFallbackVideoForTier(tier, videos, usedRels);
      }

      if (!pick) continue;

      usedRels.add(pick.rel);
      assignments.push(
        applyTierAudioPolicy(
          {
            obsSource: slot,
            tier,
            mediaId: pick.id,
            rel: pick.rel,
            abs: pick.abs,
            category: pick.category,
            contentKind: pick.contentKind,
            pattern: pick.pattern,
            durationMs: pick.durationMs,
            durationBucket: pick.durationBucket,
            hasEmbeddedAudio: pick.hasEmbeddedAudio,
            qualityScore: pick.qualityScore
          },
          tier
        )
      );
      pick.obsSlot = slot;
      pick.obsTier = tier;
    }
  }

  return assignments;
}

function buildTierRotationPools(items = [], templates = loadTemplates()) {
  const pools = {};
  for (const tier of ALL_GIFT_TIERS) {
    pools[tier] = [];
  }

  const videos = items
    .filter((i) => i.kind === "videos")
    .slice()
    .sort((a, b) => (b.qualityScore || 0) - (a.qualityScore || 0));

  for (const item of videos) {
    const tier = safeString(
      item.suggestedTier,
      contentKindToTier(item.contentKind, templates)
    ).toUpperCase();
    const targetTier = pools[tier] ? tier : "T3";
    if (tierRequiresEmbeddedAudio(targetTier) && !videoQualifiesForAudioTier(item)) {
      continue;
    }
    pools[targetTier].push({
      id: item.id,
      rel: item.rel,
      name: item.name,
      category: item.category,
      contentKind: item.contentKind,
      contentKindLabel: item.contentKindLabel,
      pattern: item.pattern,
      durationMs: item.durationMs,
      durationBucket: item.durationBucket,
      hasEmbeddedAudio: item.hasEmbeddedAudio,
      qualityScore: item.qualityScore,
      sizeBytes: item.sizeBytes
    });
  }

  return pools;
}

function buildIntelligenceSummary(items = []) {
  const videos = items.filter((i) => i.kind === "videos");
  const summary = {
    byContentKind: {},
    byDurationBucket: {},
    byAudio: { withAudio: 0, silent: 0, unknown: 0 },
    byTier: {},
    byPattern: {}
  };

  for (const item of videos) {
    summary.byContentKind[item.contentKind] = (summary.byContentKind[item.contentKind] || 0) + 1;
    summary.byDurationBucket[item.durationBucket] =
      (summary.byDurationBucket[item.durationBucket] || 0) + 1;
    summary.byTier[item.suggestedTier] = (summary.byTier[item.suggestedTier] || 0) + 1;
    summary.byPattern[item.pattern] = (summary.byPattern[item.pattern] || 0) + 1;

    if (item.hasEmbeddedAudio === true) summary.byAudio.withAudio += 1;
    else if (item.hasEmbeddedAudio === false) summary.byAudio.silent += 1;
    else summary.byAudio.unknown += 1;
  }

  return summary;
}

function pickProfilePhotos(items = [], limit = 24) {
  return items
    .filter((i) => i.kind === "photos")
    .filter((i) => i.category === "profile_photo" || i.category === "profile_hero")
    .filter((i) => (i.qualityScore || 0) >= 65)
    .slice(0, limit);
}

function buildCatalog(options = {}) {
  const templates = loadTemplates();
  const previousCatalog = options.previousCatalog || loadCatalog();
  let items = scanMediaLibrary({
    ...options,
    templates,
    previousCatalog
  });
  let assignments = assignObsSlots(items, templates);
  const merged = applyOverrides(items, assignments);
  items = merged.items;
  assignments = merged.assignments;
  const profiles = pickProfilePhotos(items);
  const tierRotationPools = buildTierRotationPools(items, templates);
  const intelligence = buildIntelligenceSummary(items);

  const summary = {};
  for (const item of items) {
    summary[item.category] = (summary[item.category] || 0) + 1;
  }

  const obsAssignments = assignments.map((assignment) => {
    const resolved = {
      ...assignment,
      hasEmbeddedAudio:
        typeof assignment.hasEmbeddedAudio === "boolean"
          ? assignment.hasEmbeddedAudio
          : resolveEmbeddedAudio(assignment)
    };
    return applyTierAudioPolicy(resolved, assignment.tier);
  });

  const videoItems = items.filter((i) => i.kind === "videos");
  const graphicReferencePool = graphicReference.buildGraphicReferencePool(videoItems);
  const narrativeArcs = storyArcRegistry.buildNarrativeArcs(videoItems, {
    graphicReferencePool
  });

  return {
    version: 2,
    generatedAt: new Date().toISOString(),
    root: options.root || INBOX,
    summary,
    intelligence,
    narrativeArcs,
    bossMissionArcs: narrativeArcs.filter((arc) => arc.bossMissionReady),
    graphicReferencePool,
    graphicReferencePolicy: {
      rule: "Pouze animovaná videa z Prahy jsou vzorem pro avatary a budoucí stream grafiku.",
      provider: "mia_graphic_reference_v1"
    },
    totalPhotos: items.filter((i) => i.kind === "photos").length,
    totalVideos: items.filter((i) => i.kind === "videos").length,
    profilePool: profiles.map((p) => ({
      id: p.id,
      rel: p.rel,
      category: p.category,
      qualityScore: p.qualityScore
    })),
    tierSlotNames: templates.tierSlots || {},
    tierRotationPools,
    obsAssignments,
    items: items.map(({ abs, ...rest }) => rest)
  };
}

function saveCatalog(catalog = buildCatalog(), outPath = CATALOG_PATH) {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(catalog, null, 2), "utf8");
  return outPath;
}

function loadCatalog(catalogPath = CATALOG_PATH) {
  if (!fs.existsSync(catalogPath)) return null;
  return JSON.parse(fs.readFileSync(catalogPath, "utf8"));
}

function resolveMediaAbs(catalog, mediaIdOrRel = "") {
  const key = safeString(mediaIdOrRel);
  if (!catalog) return null;

  const hit =
    catalog.items?.find((i) => i.id === key || i.rel === key) ||
    catalog.profilePool?.find((i) => i.id === key || i.rel === key);

  if (!hit) return null;
  return path.join(catalog.root || INBOX, hit.rel.replace(/^\//, ""));
}

function pickProfileForUser(catalog, userLabel = "") {
  const pool = catalog?.profilePool || [];
  if (!pool.length) return null;

  const label = safeString(userLabel, "guest");
  let hash = 0;
  for (let i = 0; i < label.length; i += 1) {
    hash = (hash * 31 + label.charCodeAt(i)) >>> 0;
  }
  const pick = pool[hash % pool.length];
  return resolveMediaAbs(catalog, pick.id);
}

function pickVideoForTier(catalog, tier = "T1") {
  const t = safeString(tier, "T1").toUpperCase();
  const hit = (catalog?.obsAssignments || []).find((a) => a.tier === t);
  if (!hit) return null;
  return path.join(catalog.root || INBOX, hit.rel.replace(/^\//, ""));
}

function pickNextMediaForTier(catalog, tier = "T1", rotationIndex = 0) {
  const safeTier = safeString(tier, "T1").toUpperCase();
  const pool = catalog?.tierRotationPools?.[safeTier] || [];
  const slots = catalog?.tierSlotNames?.[safeTier] || loadTemplates().tierSlots?.[safeTier] || [];

  if (!pool.length || !slots.length) {
    const fallback = (catalog?.obsAssignments || []).find((a) => a.tier === safeTier);
    if (!fallback) return null;
    return {
      obsSource: fallback.obsSource,
      tier: safeTier,
      mediaId: fallback.mediaId,
      rel: fallback.rel,
      abs: path.join(catalog.root || INBOX, fallback.rel.replace(/^\//, "")),
      category: fallback.category,
      contentKind: fallback.contentKind || "",
      durationMs: fallback.durationMs ?? null,
      hasEmbeddedAudio: fallback.hasEmbeddedAudio,
      rotationIndex,
      poolSize: 1,
      pickedBy: "obs_assignment_fallback"
    };
  }

  const idx = Math.max(0, Number(rotationIndex) || 0);
  const audioPool = filterVideosForAudioTier(pool, safeTier);
  const media = audioPool[idx % audioPool.length];
  const obsSource = slots[idx % slots.length];

  return applyTierAudioPolicy(
    {
      obsSource,
      tier: safeTier,
      mediaId: media.id,
      rel: media.rel,
      abs: path.join(catalog.root || INBOX, media.rel.replace(/^\//, "")),
      category: media.category,
      contentKind: media.contentKind,
      contentKindLabel: media.contentKindLabel,
      durationMs: media.durationMs,
      durationBucket: media.durationBucket,
      hasEmbeddedAudio: media.hasEmbeddedAudio,
      rotationIndex: idx,
      poolSize: audioPool.length,
      pickedBy: "tier_rotation_pool"
    },
    safeTier
  );
}

function buildStoryBeatPlan(story = {}, catalog = null, userLabel = "") {
  const beats = Array.isArray(story?.beats) ? story.beats : [];
  if (!catalog?.obsAssignments?.length) return [];

  const slotByTier = {};
  for (const assign of catalog.obsAssignments) {
    if (!slotByTier[assign.tier]) slotByTier[assign.tier] = assign;
  }

  const first = safeString(userLabel, "Divák").split(/\s+/)[0] || userLabel;

  return beats.map((beat, index) => {
    const tier = safeString(beat.videoTier, ["T1", "T1", "T2", "T3", "T4"][index] || "T1").toUpperCase();
    const explicit = safeString(beat.videoSource);
    const fromCatalog = catalog.obsAssignments.find((a) => a.obsSource === explicit) ||
      slotByTier[tier];

    return {
      id: safeString(beat.id, `beat_${index + 1}`),
      caption: safeString(beat.caption).replace(/\{user\}/g, first).replace(/\{fullUser\}/g, userLabel),
      subcaption: safeString(beat.subcaption).replace(/\{user\}/g, first).replace(/\{fullUser\}/g, userLabel),
      tier,
      sourceName: explicit || fromCatalog?.obsSource || "",
      pickedBy: explicit ? "story_manifest" : "media_catalog",
      catalogRel: fromCatalog?.rel || "",
      category: fromCatalog?.category || ""
    };
  }).filter((b) => b.sourceName);
}

module.exports = {
  INBOX,
  CATALOG_PATH,
  OVERRIDES_PATH,
  TEMPLATES_PATH,
  ALL_GIFT_TIERS,
  CONTENT_KIND_LABELS,
  detectSourcePattern,
  classifyPhoto,
  classifyVideo,
  inferContentKind,
  contentKindToTier,
  enrichVideoItem,
  scanMediaLibrary,
  listVideoScanDirs,
  loadVideos2Intake,
  assignObsSlots,
  buildTierRotationPools,
  buildIntelligenceSummary,
  applyOverrides,
  loadOverrides,
  pickProfilePhotos,
  buildCatalog,
  saveCatalog,
  loadCatalog,
  loadTemplates,
  resolveMediaAbs,
  pickProfileForUser,
  pickVideoForTier,
  pickNextMediaForTier,
  buildStoryBeatPlan,
  categorySuggestsEmbeddedAudio,
  probeVideoHasEmbeddedAudio,
  resolveEmbeddedAudio,
  buildObsSourceAudioMap,
  tierRequiresEmbeddedAudio,
  videoQualifiesForAudioTier,
  applyTierAudioPolicy,
  filterVideosForAudioTier,
  buildNarrativeArcs: storyArcRegistry.buildNarrativeArcs,
  pickBossMissionArc: storyArcRegistry.pickBossMissionArc,
  buildGraphicReferencePool: graphicReference.buildGraphicReferencePool,
  isGraphicReferenceVideo: graphicReference.isGraphicReferenceVideo
};
