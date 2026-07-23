"use strict";

/**
 * MIA Fold Library — chytré roztřídění obsahu z Galaxy Foldu.
 *
 * Princip BEZPEČNOST PRVNÍ: na stream pustíme jen JASNĚ bezpečný obsah
 * (AI/produkovaná videa). Všechno ostatní (osobní fotky, WhatsApp, kamera,
 * dokumenty) jde do soukromé/review zóny mimo dosah gift katalogu.
 *
 * Pozn.: MIA_MEDIA_CATALOG skenuje jen photos/ a videos/. Cokoli v private/
 * nebo review/ se na streamu nikdy neobjeví.
 */

const path = require("path");

const PHOTO_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif", ".bmp", ".gif", ".dng"]);
const VIDEO_EXT = new Set([".mp4", ".mov", ".webm", ".mkv", ".avi", ".3gp", ".m4v", ".mpeg", ".mpg"]);
const AUDIO_EXT = new Set([".mp3", ".wav", ".m4a", ".ogg", ".opus", ".flac", ".aac"]);
const DOC_EXT = new Set([".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".txt", ".csv", ".rtf", ".odt"]);

// Bezpečné pro stream — AI generovaný / produkovaný obsah.
const STREAM_SAFE_PATTERNS = [
  /^hailuo[_-]/i,
  /^lv_\d/i,
  /^sora[_-]/i,
  /^kling[_-]/i,
  /^runway[_-]/i,
  /^pika[_-]/i,
  /^veo[_-]/i,
  /^gen-?\d/i,
  /^mj[_-]/i,
  /^midjourney/i,
  /^ai[_-]/i,
  /^render[_-]/i,
  /^\d{13}\./ // timestamp gif/clip
];

// Osobní obsah — nikdy na stream bez ručního schválení.
const PRIVATE_PATTERNS = [
  /whatsapp/i,
  /^img-\d{8}-wa/i,
  /^vid-\d{8}-wa/i,
  /^img_\d/i,
  /^vid_\d/i,
  /^pxl_\d/i,
  /^dsc[_-]?\d/i,
  /^dji[_-]?\d/i,
  /^screenshot/i,
  /^snimek/i,
  /^scr_\d/i,
  /^\d{8}_\d{6}/, // 20260309_140145 (kamera)
  /^signal-/i,
  /^messenger/i,
  /^fb_img/i,
  /^telegram/i,
  /selfie/i,
  /^received_/i
];

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function mediaTypeFromExt(ext = "") {
  const e = safeString(ext).toLowerCase();
  if (VIDEO_EXT.has(e)) return "video";
  if (PHOTO_EXT.has(e)) return "photo";
  if (AUDIO_EXT.has(e)) return "audio";
  if (DOC_EXT.has(e)) return "document";
  return "other";
}

function matchesAny(name = "", patterns = []) {
  const n = safeString(name);
  return patterns.some((re) => re.test(n));
}

/**
 * Roztřídí jeden soubor.
 * @returns {{category, target, mediaType, streamSafe, confidence, reason}}
 */
function classifyFoldFile(name = "", meta = {}) {
  const fileName = safeString(name);
  const ext = safeString(meta.ext, path.extname(fileName)).toLowerCase();
  const sizeBytes = toNumber(meta.sizeBytes, 0);
  const mediaType = mediaTypeFromExt(ext);

  if (!fileName || fileName.startsWith(".")) {
    return {
      category: "ignored",
      target: null,
      mediaType,
      streamSafe: false,
      confidence: 1,
      reason: "skrytý/systémový soubor"
    };
  }

  if (mediaType === "document") {
    return {
      category: "document",
      target: "private/documents",
      mediaType,
      streamSafe: false,
      confidence: 0.95,
      reason: "dokument — soukromé"
    };
  }

  if (mediaType === "audio") {
    return {
      category: "audio",
      target: "private/audio",
      mediaType,
      streamSafe: false,
      confidence: 0.8,
      reason: "audio — ruční zařazení"
    };
  }

  const isPrivate = matchesAny(fileName, PRIVATE_PATTERNS);
  const isStreamSafe = matchesAny(fileName, STREAM_SAFE_PATTERNS);

  // Soukromý vzor má přednost před stream-safe (ochrana).
  if (isPrivate) {
    return {
      category: "private",
      target: mediaType === "video" ? "private/videos" : "private/photos",
      mediaType,
      streamSafe: false,
      confidence: 0.9,
      reason: "osobní zdroj (WhatsApp/kamera/screenshot)"
    };
  }

  if (mediaType === "video" && isStreamSafe) {
    return {
      category: "stream-video",
      target: "videos",
      mediaType,
      streamSafe: true,
      confidence: 0.85,
      reason: "AI/produkované video — vhodné pro stream"
    };
  }

  if (mediaType === "photo" && isStreamSafe) {
    return {
      category: "stream-photo",
      target: "photos",
      mediaType,
      streamSafe: true,
      confidence: 0.7,
      reason: "AI/produkovaná grafika"
    };
  }

  // Vše ostatní = nejisté → review zóna, default mimo stream.
  return {
    category: "review",
    target: mediaType === "video" ? "review/videos" : "review/photos",
    mediaType,
    streamSafe: false,
    confidence: 0.4,
    reason: "neznámý původ — k ručnímu schválení"
  };
}

function summarizeClassification(entries = []) {
  const summary = {
    total: entries.length,
    byCategory: {},
    byTarget: {},
    streamSafe: 0,
    private: 0,
    review: 0
  };

  for (const entry of entries) {
    const c = safeString(entry?.category, "other");
    const t = safeString(entry?.target, "(none)");
    summary.byCategory[c] = (summary.byCategory[c] || 0) + 1;
    summary.byTarget[t] = (summary.byTarget[t] || 0) + 1;
    if (entry?.streamSafe) summary.streamSafe += 1;
    if (c === "private" || c === "document" || c === "audio") summary.private += 1;
    if (c === "review") summary.review += 1;
  }

  return summary;
}

module.exports = {
  PHOTO_EXT,
  VIDEO_EXT,
  AUDIO_EXT,
  DOC_EXT,
  STREAM_SAFE_PATTERNS,
  PRIVATE_PATTERNS,
  mediaTypeFromExt,
  classifyFoldFile,
  summarizeClassification
};
