"use strict";

const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function toNumber(value, fallback = null) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function resolveFfprobeBinary() {
  const fromEnv = safeString(process.env.MIA_FFPROBE_PATH || process.env.FFPROBE_PATH);
  if (fromEnv && fs.existsSync(fromEnv)) {
    return fromEnv;
  }

  const ffmpegPath = safeString(process.env.MIA_FFMPEG_PATH || process.env.FFMPEG_PATH);
  if (ffmpegPath) {
    const sibling = path.join(path.dirname(ffmpegPath), process.platform === "win32" ? "ffprobe.exe" : "ffprobe");
    if (fs.existsSync(sibling)) {
      return sibling;
    }
  }

  const candidates = [
    "C:\\ffmpeg\\bin\\ffprobe.exe",
    "C:\\Program Files\\ffmpeg\\bin\\ffprobe.exe",
    path.join(process.env.LOCALAPPDATA || "", "Microsoft\\WinGet\\Links\\ffprobe.exe")
  ].filter(Boolean);

  const wingetRoot = path.join(
    process.env.LOCALAPPDATA || "",
    "Microsoft",
    "WinGet",
    "Packages"
  );
  if (fs.existsSync(wingetRoot)) {
    try {
      for (const pkg of fs.readdirSync(wingetRoot)) {
        if (!/ffmpeg/i.test(pkg)) continue;
        const bin = path.join(wingetRoot, pkg, "ffmpeg-8.1.2-full_build", "bin", "ffprobe.exe");
        if (fs.existsSync(bin)) candidates.unshift(bin);
        const alt = path.join(wingetRoot, pkg);
        if (fs.existsSync(alt)) {
          for (const sub of fs.readdirSync(alt)) {
            const probe = path.join(alt, sub, "bin", "ffprobe.exe");
            if (fs.existsSync(probe)) candidates.unshift(probe);
          }
        }
      }
    } catch (_err) {
      /* ignore */
    }
  }

  for (const candidate of candidates) {
    if (candidate && fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return "ffprobe";
}

function probeVideoMedia(absPath = "", options = {}) {
  const safePath = safeString(absPath);
  if (!safePath || !fs.existsSync(safePath)) {
    return {
      durationMs: null,
      width: null,
      height: null,
      hasEmbeddedAudio: null,
      probeOk: false
    };
  }

  const timeoutMs = toNumber(options.timeoutMs, 4000);
  const ffprobeBin = options.ffprobeBin || resolveFfprobeBinary();

  try {
    const result = spawnSync(
      ffprobeBin,
      [
        "-v",
        "error",
        "-show_entries",
        "format=duration:stream=codec_type,width,height",
        "-of",
        "json",
        safePath
      ],
      { encoding: "utf8", timeout: timeoutMs, windowsHide: true }
    );

    if (result.error || result.status !== 0) {
      return {
        durationMs: null,
        width: null,
        height: null,
        hasEmbeddedAudio: null,
        probeOk: false
      };
    }

    const parsed = JSON.parse(result.stdout || "{}");
    const streams = Array.isArray(parsed.streams) ? parsed.streams : [];
    const durationSec = toNumber(parsed.format?.duration, null);
    const videoStream = streams.find((s) => s.codec_type === "video") || streams[0] || {};
    const hasAudio = streams.some((s) => s.codec_type === "audio");

    return {
      durationMs: durationSec != null ? Math.round(durationSec * 1000) : null,
      width: toNumber(videoStream.width, null),
      height: toNumber(videoStream.height, null),
      hasEmbeddedAudio: hasAudio,
      probeOk: true
    };
  } catch (_err) {
    return {
      durationMs: null,
      width: null,
      height: null,
      hasEmbeddedAudio: null,
      probeOk: false
    };
  }
}

function durationBucket(durationMs = null) {
  if (durationMs == null || durationMs === "") {
    return "unknown";
  }
  const ms = Number(durationMs);
  if (!Number.isFinite(ms) || ms < 0) {
    return "unknown";
  }
  if (ms < 5000) return "micro";
  if (ms < 15000) return "short";
  if (ms < 45000) return "medium";
  if (ms < 90000) return "long";
  return "epic";
}

function durationBucketLabel(bucket = "") {
  const labels = {
    micro: "< 5 s",
    short: "5–15 s",
    medium: "15–45 s",
    long: "45–90 s",
    epic: "> 90 s",
    unknown: "neznámá"
  };
  return labels[bucket] || bucket;
}

function estimateDurationMsFromSize(entry = {}) {
  const sizeBytes = toNumber(entry.sizeBytes, 0);
  if (!sizeBytes) return null;

  const pattern = safeString(entry.pattern);
  const bytesPerSecond =
    pattern === "hailuo_ai"
      ? 180_000
      : pattern === "lv_edit"
        ? 240_000
        : pattern === "photos_export"
          ? 220_000
        : pattern === "whatsapp_video" || pattern === "wa_desktop_video"
          ? 170_000
          : 200_000;

  return Math.max(2000, Math.round((sizeBytes / bytesPerSecond) * 1000));
}

module.exports = {
  probeVideoMedia,
  durationBucket,
  durationBucketLabel,
  resolveFfprobeBinary,
  estimateDurationMsFromSize
};
