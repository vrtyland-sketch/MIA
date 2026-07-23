"use strict";

/**
 * Vizuální review pipeline pro gift videa — ffprobe + snímek + tagy pro tier.
 * Cíl: každé OBS pinned video + nové intake soubory projít stejným workflow.
 *
 * Použití:
 *   node scripts/media_visual_review.js pinned     # jen OBS sloty z overrides
 *   node scripts/media_visual_review.js all        # videos/ + videos_2/
 *   node scripts/media_visual_review.js report     # vytiskne uložený manifest
 */

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const catalog = require("./MIA_MEDIA_CATALOG");
const { probeVideoMedia, resolveFfprobeBinary } = require("./MIA_MEDIA_PROBE");

const PROJECT_ROOT = path.resolve(__dirname, "..");
const INBOX = path.join(PROJECT_ROOT, "incoming-images");
const REVIEW_PATH = path.join(PROJECT_ROOT, "config", "media-visual-review.json");
const FRAMES_DIR = path.join(PROJECT_ROOT, "data", "media-review-frames");

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function resolveFfmpeg() {
  const ffprobe = resolveFfprobeBinary();
  if (ffprobe.includes(path.sep) || ffprobe.includes("/")) {
    return ffprobe.replace(/ffprobe(\.exe)?$/i, "ffmpeg$1");
  }
  return "ffmpeg";
}

function loadOverrides() {
  const p = path.join(PROJECT_ROOT, "config", "stream-media-overrides.json");
  if (!fs.existsSync(p)) return { pinnedSlots: {} };
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function listMp4Files(dir, relPrefix) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((name) => /\.(mp4|mov|webm|mkv|m4v)$/i.test(name))
    .map((name) => ({
      rel: `${relPrefix}/${name}`.replace(/\\/g, "/"),
      abs: path.join(dir, name),
      name
    }));
}

function collectTargets(mode = "pinned") {
  const targets = new Map();

  if (mode === "pinned" || mode === "all") {
    const overrides = loadOverrides();
    for (const [slot, rel] of Object.entries(overrides.pinnedSlots || {})) {
      const relNorm = safeString(rel).replace(/\\/g, "/");
      const abs = path.join(INBOX, ...relNorm.split("/"));
      if (!fs.existsSync(abs)) continue;
      targets.set(relNorm, { rel: relNorm, abs, obsSlot: slot, source: "pinned" });
    }
  }

  if (mode === "all") {
    for (const row of catalog.listVideoScanDirs(INBOX)) {
      for (const file of listMp4Files(row.absDir, row.relPrefix)) {
        if (!targets.has(file.rel)) {
          targets.set(file.rel, { rel: file.rel, abs: file.abs, obsSlot: null, source: "library" });
        }
      }
    }
  }

  return [...targets.values()].sort((a, b) => a.rel.localeCompare(b.rel));
}

function extractFrame(absPath, framePath, durationSec) {
  const ffmpeg = resolveFfmpeg();
  const ts = Math.max(0.5, Math.min(durationSec * 0.35, Math.max(0.5, durationSec - 1)));
  const result = spawnSync(
    ffmpeg,
    ["-y", "-ss", String(ts), "-i", absPath, "-frames:v", "1", "-q:v", "3", framePath],
    { windowsHide: true, timeout: 120000 }
  );
  return result.status === 0 && fs.existsSync(framePath);
}

function inferVisualTags(name = "", pattern = "") {
  const tags = [];
  const n = name.toLowerCase();
  if (/^lv_/.test(n)) tags.push("lv_edit");
  if (/^hailuo_/.test(n)) tags.push("hailuo_ai");
  if (/^vid-/.test(n)) tags.push("whatsapp");
  if (/^\d{4}-\d{2}-\d{2}-/.test(n)) tags.push("photos_export");
  if (pattern === "lv_edit") tags.push("stream_mascot_candidate");
  if (pattern === "hailuo_ai") tags.push("cute_ai");
  if (pattern === "whatsapp" || pattern === "wa_desktop_video") tags.push("community_clip");
  if (pattern === "photos_export") tags.push("google_photos_export");
  return tags;
}

function reviewFile(entry = {}) {
  const probe = probeVideoMedia(entry.abs);
  const pattern = catalog.detectSourcePattern(entry.name || path.basename(entry.abs));
  const classified = catalog.classifyVideo({
    name: path.basename(entry.abs),
    abs: entry.abs,
    rel: entry.rel,
    sizeBytes: fs.statSync(entry.abs).size,
    pattern,
    durationMs: probe.durationMs,
    hasEmbeddedAudio: probe.hasEmbeddedAudio,
    width: probe.width,
    height: probe.height
  });

  const intake = catalog.loadVideos2Intake?.() || { assignments: [] };
  const override = (intake.assignments || []).find((row) => safeString(row.rel) === entry.rel);

  const frameName = entry.rel.replace(/[\\/]/g, "__") + ".jpg";
  const framePath = path.join(FRAMES_DIR, frameName);
  fs.mkdirSync(FRAMES_DIR, { recursive: true });

  const durationSec = probe.durationMs ? probe.durationMs / 1000 : null;
  const frameOk =
    durationSec != null
      ? extractFrame(entry.abs, framePath, durationSec)
      : extractFrame(entry.abs, framePath, 3);

  return {
    rel: entry.rel,
    abs: entry.abs,
    obsSlot: entry.obsSlot || null,
    source: entry.source || "library",
    name: path.basename(entry.abs),
    pattern,
    sizeBytes: fs.statSync(entry.abs).size,
    durationSec: durationSec != null ? Math.round(durationSec * 10) / 10 : null,
    width: probe.width,
    height: probe.height,
    hasAudio: probe.hasEmbeddedAudio,
    probeOk: probe.probeOk,
    autoKind: classified.contentKind,
    autoTier: classified.suggestedTier,
    tier: override?.tier || classified.suggestedTier,
    contentKind: override?.contentKind || classified.contentKind,
    qualityScore: classified.qualityScore,
    tags: inferVisualTags(entry.name || path.basename(entry.abs), pattern),
    framePath: frameOk ? framePath.replace(/\\/g, "/") : null,
    visualReviewed: false,
    visualSummary: override?.note || null,
    reviewedAt: null
  };
}

function saveManifest(rows = [], meta = {}) {
  const payload = {
    version: 1,
    updatedAt: new Date().toISOString(),
    framesDir: FRAMES_DIR.replace(/\\/g, "/"),
    note: "visualSummary doplň po prohlédnutí snímku; tier = finální OBS/gift video tier",
    ...meta,
    items: rows
  };
  fs.writeFileSync(REVIEW_PATH, JSON.stringify(payload, null, 2), "utf8");
  return payload;
}

function loadManifest() {
  if (!fs.existsSync(REVIEW_PATH)) return null;
  return JSON.parse(fs.readFileSync(REVIEW_PATH, "utf8"));
}

function main() {
  const cmd = process.argv[2] || "pinned";
  if (cmd === "report") {
    const manifest = loadManifest();
    if (!manifest) {
      console.log(JSON.stringify({ ok: false, reason: "manifest_missing" }, null, 2));
      process.exitCode = 1;
      return;
    }
    console.log(JSON.stringify(manifest, null, 2));
    return;
  }

  const mode = cmd === "all" ? "all" : "pinned";
  const targets = collectTargets(mode);
  if (!targets.length) {
    console.log(JSON.stringify({ ok: false, reason: "no_targets", mode }, null, 2));
    process.exitCode = 1;
    return;
  }

  const rows = targets.map(reviewFile);
  const manifest = saveManifest(rows, {
    mode,
    count: rows.length,
    probed: rows.filter((r) => r.probeOk).length,
    framed: rows.filter((r) => r.framePath).length
  });

  console.log(
    JSON.stringify(
      {
        ok: true,
        mode,
        count: manifest.count,
        probed: manifest.probed,
        framed: manifest.framed,
        path: REVIEW_PATH,
        framesDir: manifest.framesDir
      },
      null,
      2
    )
  );
}

if (require.main === module) {
  main();
}

module.exports = {
  REVIEW_PATH,
  FRAMES_DIR,
  collectTargets,
  reviewFile,
  saveManifest,
  loadManifest
};
