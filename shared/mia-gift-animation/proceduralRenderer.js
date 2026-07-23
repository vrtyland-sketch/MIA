"use strict";

/**
 * Procedural gift animation packager (v2 — MIA soft-neon stage).
 *
 * LIMIT: This is NOT a true AI video model (Runway/Sora/Tom&Jerry). It packages:
 *   - cached profile avatar
 *   - gift motif metadata + caption + art refs (MIA cyber / Koj)
 *   - animation manifest for OBS browser overlay (HTML/CSS/Canvas ~10s)
 *   - optional poster PNG
 *   - optional WEBM via ffmpeg ken-burns if available (overlay prefers canvas)
 *
 * Future: swap provider to "ai_video" and write mp4/webm from model output
 * while keeping the same manifest shape + OBS overlay contract.
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const axios = require("axios");
const { spawnSync } = require("child_process");
const { buildPromptBrief } = require("./promptBuilder");
const { getConfig } = require("./config");

const ROOT = path.resolve(__dirname, "..", "..");
const OUT_DIR = path.join(ROOT, "mia-output-overlay", "generated", "gift-animations");
const AVATAR_CACHE = path.join(ROOT, "data", "avatar-cache");

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function hashKey(input = "") {
  return crypto.createHash("sha1").update(String(input)).digest("hex").slice(0, 12);
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function resolveFfmpeg() {
  const candidates = [process.env.MIA_FFMPEG_PATH, process.env.FFMPEG_PATH, "ffmpeg"].filter(Boolean);
  for (const bin of candidates) {
    const probe = spawnSync(bin, ["-version"], { encoding: "utf8" });
    if (probe.status === 0) return bin;
  }
  return null;
}

async function fetchAvatarToFile(avatarUrl, destPath) {
  const url = safeString(avatarUrl);
  if (!url.startsWith("http")) return null;
  ensureDir(AVATAR_CACHE);
  const cachePath = path.join(AVATAR_CACHE, `${hashKey(url)}.bin`);
  let buf = null;
  if (fs.existsSync(cachePath) && Date.now() - fs.statSync(cachePath).mtimeMs < 86400000) {
    buf = fs.readFileSync(cachePath);
  } else {
    try {
      const response = await axios.get(url, {
        responseType: "arraybuffer",
        timeout: 5000,
        maxContentLength: 2 * 1024 * 1024,
        headers: { "User-Agent": "MIA-GiftAnimation/1.0" }
      });
      buf = Buffer.from(response.data);
      if (buf.length < 32) return null;
      fs.writeFileSync(cachePath, buf);
    } catch (_err) {
      return null;
    }
  }
  ensureDir(path.dirname(destPath));
  // Normalize to PNG via sharp when possible.
  try {
    const sharp = require("sharp");
    await sharp(buf).resize(512, 512, { fit: "cover" }).png().toFile(destPath);
    return destPath;
  } catch (_err) {
    fs.writeFileSync(destPath, buf);
    return destPath;
  }
}

async function writePosterPng(jobDir, brief, avatarPath) {
  const outPath = path.join(jobDir, "poster.png");
  try {
    const sharp = require("sharp");
    const W = 1280;
    const H = 720;
    const color = brief.motif.color || "#7ee0ff";
    const svg = Buffer.from(`
      <svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#0a1020"/>
            <stop offset="55%" stop-color="#121a32"/>
            <stop offset="100%" stop-color="${color}" stop-opacity="0.35"/>
          </linearGradient>
          <radialGradient id="glow" cx="70%" cy="40%" r="40%">
            <stop offset="0%" stop-color="${color}" stop-opacity="0.55"/>
            <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
          </radialGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#g)"/>
        <rect width="100%" height="100%" fill="url(#glow)"/>
        <circle cx="980" cy="300" r="140" fill="${color}" fill-opacity="0.18" stroke="${color}" stroke-width="4"/>
        <text x="980" y="330" text-anchor="middle" font-size="96">${brief.motif.emoji}</text>
        <text x="64" y="560" fill="#ffffff" font-family="Segoe UI, sans-serif" font-size="42" font-weight="700">${escapeXml(
          brief.caption
        )}</text>
        <text x="64" y="620" fill="#c8e7ff" font-family="Segoe UI, sans-serif" font-size="28">${escapeXml(
          brief.improvLine
        )}</text>
      </svg>
    `);

    let base = sharp(svg).png();
    if (avatarPath && fs.existsSync(avatarPath)) {
      const avatar = await sharp(avatarPath)
        .resize(220, 220)
        .composite([
          {
            input: Buffer.from(
              `<svg><circle cx="110" cy="110" r="110" fill="white"/></svg>`
            ),
            blend: "dest-in"
          }
        ])
        .png()
        .toBuffer();
      const ring = Buffer.from(
        `<svg width="236" height="236"><circle cx="118" cy="118" r="116" fill="none" stroke="${color}" stroke-width="6"/></svg>`
      );
      base = sharp(await base.toBuffer()).composite([
        { input: ring, left: 52, top: 140 },
        { input: avatar, left: 60, top: 148 }
      ]);
    }
    await base.png().toFile(outPath);
    return outPath;
  } catch (_err) {
    return null;
  }
}

function escapeXml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function tryEncodeKenBurnsWebm(jobDir, posterPath, durationSec) {
  const ffmpeg = resolveFfmpeg();
  if (!ffmpeg || !posterPath || !fs.existsSync(posterPath)) {
    return { ok: false, error: "ffmpeg_or_poster_missing" };
  }
  const outPath = path.join(jobDir, "clip.webm");
  // Soft zoom + pan from still (stream-safe fallback when no AI video).
  const args = [
    "-y",
    "-loop",
    "1",
    "-i",
    posterPath,
    "-t",
    String(durationSec),
    "-vf",
    `scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720,zoompan=z='min(zoom+0.0015,1.12)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${Math.round(
      durationSec * 30
    )}:s=1280x720:fps=30`,
    "-c:v",
    "libvpx-vp9",
    "-pix_fmt",
    "yuva420p",
    "-auto-alt-ref",
    "0",
    "-b:v",
    "1.5M",
    outPath
  ];
  const result = spawnSync(ffmpeg, args, { encoding: "utf8", maxBuffer: 8 * 1024 * 1024 });
  if (result.status !== 0 || !fs.existsSync(outPath)) {
    return { ok: false, error: "ffmpeg_failed", detail: String(result.stderr || "").slice(0, 400) };
  }
  return { ok: true, path: outPath, format: "webm", provider: "ffmpeg_kenburns" };
}

/**
 * Create a playable gift animation job.
 * @returns {{ ok, jobId, manifestUrl, overlayUrl, posterUrl?, videoUrl?, brief, provider }}
 */
async function generateProceduralAnimation(input = {}) {
  const cfg = getConfig();
  const durationMs = Math.max(6000, Number(input.durationMs) || cfg.durationMs);
  const brief = buildPromptBrief({ ...input, wordsTimeoutMs: cfg.wordsTimeoutMs });
  const jobId = `${Date.now()}-${hashKey(`${brief.username}:${brief.giftLabel}:${brief.extraWords || ""}`)}`;
  const jobDir = path.join(OUT_DIR, jobId);
  ensureDir(jobDir);

  let avatarRel = null;
  const avatarAbs = path.join(jobDir, "avatar.png");
  if (await fetchAvatarToFile(input.profileImageUrl || input.avatarUrl, avatarAbs)) {
    avatarRel = `avatar.png`;
  }

  const posterAbs = await writePosterPng(jobDir, brief, avatarRel ? avatarAbs : null);
  const posterRel = posterAbs ? "poster.png" : null;

  let videoRel = null;
  let videoMeta = null;
  if (input.encodeVideo !== false) {
    const enc = tryEncodeKenBurnsWebm(jobDir, posterAbs, durationMs / 1000);
    if (enc.ok) {
      videoRel = "clip.webm";
      videoMeta = { format: enc.format, provider: enc.provider };
    } else {
      videoMeta = { skipped: true, reason: enc.error };
    }
  }

  const publicBase = `/generated/gift-animations/${jobId}`;
  const manifest = {
    version: 1,
    jobId,
    provider: "procedural_v2",
    // Honest capability flag for UI / future AI plug-in:
    trueAiVideo: false,
    qualityTier: brief.motif?.qualityTier || "mia_soft_neon_v2",
    createdAt: Date.now(),
    durationMs,
    giftKey: brief.giftKey,
    giftLabel: brief.giftLabel,
    username: brief.username,
    extraWords: brief.extraWords,
    motif: brief.motif,
    caption: brief.caption,
    improvLine: brief.improvLine,
    sceneLine: brief.sceneLine,
    aiVideoPrompt: brief.aiVideoPrompt,
    assets: {
      avatarUrl: avatarRel ? `${publicBase}/${avatarRel}` : null,
      posterUrl: posterRel ? `${publicBase}/${posterRel}` : null,
      videoUrl: videoRel ? `${publicBase}/${videoRel}` : null
    },
    videoMeta,
    play: {
      // OBS browser source should prefer canvas player (richer motion).
      preferred: "overlay_canvas",
      overlayPath: "/gift-animation-overlay.html",
      holdMs: durationMs + 800
    }
  };

  fs.writeFileSync(path.join(jobDir, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");

  return {
    ok: true,
    jobId,
    provider: "procedural_v2",
    trueAiVideo: false,
    durationMs,
    brief,
    manifest,
    manifestUrl: `${publicBase}/manifest.json`,
    overlayUrl: `/gift-animation-overlay.html?job=${encodeURIComponent(jobId)}`,
    posterUrl: manifest.assets.posterUrl,
    videoUrl: manifest.assets.videoUrl,
    avatarUrl: manifest.assets.avatarUrl,
    publicBase
  };
}

module.exports = {
  OUT_DIR,
  generateProceduralAnimation,
  fetchAvatarToFile,
  resolveFfmpeg
};
