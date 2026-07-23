#!/usr/bin/env node
"use strict";

/**
 * Vygeneruje ambient MP4 smyčku pro NEJSEM TU scénu (ffmpeg lavfi).
 * Výstup: incoming-images/videos/away/nejsem_tu_loop.mp4
 */

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const PROJECT_ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(PROJECT_ROOT, "incoming-images", "videos", "away");
const OUT_FILE = path.join(OUT_DIR, "nejsem_tu_loop.mp4");

function resolveFfmpeg() {
  const candidates = [
    process.env.MIA_FFMPEG_PATH,
    process.env.FFMPEG_PATH,
    "ffmpeg"
  ].filter(Boolean);

  for (const bin of candidates) {
    const probe = spawnSync(bin, ["-version"], { encoding: "utf8" });
    if (probe.status === 0) return bin;
  }
  return null;
}

function generateAwayLoopVideo(options = {}) {
  const ffmpeg = resolveFfmpeg();
  if (!ffmpeg) {
    return {
      ok: false,
      reason: "ffmpeg_missing",
      hint: "Nainstaluj ffmpeg nebo nastav MIA_FFMPEG_PATH. Dočasně: MIA_AWAY_LOOP_MODE=browser"
    };
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });

  const duration = Math.max(8, Number(options.duration || 20));
  const width = Number(options.width || 1920);
  const height = Number(options.height || 1080);

  const attempts = [
    [
      "-y",
      "-f",
      "lavfi",
      "-i",
      `gradients=s=${width}x${height}:nb_colors=3:seed=42:duration=${duration}`,
      "-vf",
      `hue=h='10*sin(2*PI*t/${duration})',vignette=PI/5`,
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      "-t",
      String(duration),
      OUT_FILE
    ],
    [
      "-y",
      "-f",
      "lavfi",
      "-i",
      `color=c=0x120820:s=${width}x${height}:d=${duration}:r=30`,
      "-vf",
      `hue=h='12*sin(2*PI*t/${duration})',vignette=PI/5`,
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      "-t",
      String(duration),
      OUT_FILE
    ]
  ];

  let lastErr = "";
  for (const args of attempts) {
    const result = spawnSync(ffmpeg, args, { encoding: "utf8" });
    if (result.status === 0 && fs.existsSync(OUT_FILE)) {
      const stat = fs.statSync(OUT_FILE);
      return {
        ok: true,
        output: OUT_FILE,
        rel: path.relative(PROJECT_ROOT, OUT_FILE).replace(/\\/g, "/"),
        bytes: stat.size,
        durationSec: duration,
        next: "npm run obs:apply-away-scene"
      };
    }
    lastErr = (result.stderr || result.stdout || "").slice(-1200);
  }

  return {
    ok: false,
    reason: "ffmpeg_failed",
    stderr: lastErr,
    hint: "Zkus MIA_AWAY_LOOP_MODE=browser — CSS smyčka funguje bez MP4"
  };
}

function main() {
  const report = generateAwayLoopVideo();
  console.log(JSON.stringify(report, null, 2));
  process.exitCode = report.ok ? 0 : 1;
}

if (require.main === module) {
  main();
}

module.exports = { generateAwayLoopVideo, OUT_FILE, OUT_DIR };
