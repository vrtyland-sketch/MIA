"use strict";

/**
 * Kanonické šablony exportu / plátna pro sociální platformy.
 * Používá agent API — ne mění stream runtime.
 */

const EXPORT_TEMPLATES = {
  tiktok: {
    id: "tiktok",
    label: "TikTok",
    width: 1080,
    height: 1920,
    fps: 30,
    safeMargin: 0.08,
    notes: "Vertikální 9:16, bez coins v overlay"
  },
  youtube_shorts: {
    id: "youtube_shorts",
    label: "YouTube Shorts",
    width: 1080,
    height: 1920,
    fps: 30,
    safeMargin: 0.1
  },
  twitch: {
    id: "twitch",
    label: "Twitch",
    width: 1920,
    height: 1080,
    fps: 60,
    safeMargin: 0.05
  },
  obs_overlay: {
    id: "obs_overlay",
    label: "OBS overlay",
    width: 1920,
    height: 1080,
    fps: 30,
    safeMargin: 0
  },
  koj_sprite: {
    id: "koj_sprite",
    label: "Koj sprite sheet",
    width: 512,
    height: 512,
    fps: 12,
    safeMargin: 0
  }
};

const EXPORT_FORMATS = ["png", "jpg", "webp", "gif", "webm", "mp4", "svg", "miapaint"];

function getTemplate(id) {
  return EXPORT_TEMPLATES[String(id || "").toLowerCase()] || null;
}

function listTemplates() {
  return Object.values(EXPORT_TEMPLATES);
}

module.exports = {
  EXPORT_TEMPLATES,
  EXPORT_FORMATS,
  getTemplate,
  listTemplates
};
