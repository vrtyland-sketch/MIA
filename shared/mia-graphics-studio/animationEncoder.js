"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

function resolveFfmpeg() {
  const candidates = [process.env.MIA_FFMPEG_PATH, process.env.FFMPEG_PATH, "ffmpeg"].filter(Boolean);
  for (const bin of candidates) {
    const probe = spawnSync(bin, ["-version"], { encoding: "utf8" });
    if (probe.status === 0) return bin;
  }
  return null;
}

function normalizeFrameBuffers(frames) {
  if (!Array.isArray(frames)) return [];
  return frames
    .map((f) => {
      if (Buffer.isBuffer(f)) return f;
      if (typeof f === "string") return Buffer.from(f, "base64");
      if (f?.dataBase64) return Buffer.from(String(f.dataBase64), "base64");
      return null;
    })
    .filter(Boolean);
}

async function encodeGifFromPngBuffers(frames, opts = {}) {
  const buffers = normalizeFrameBuffers(frames);
  if (!buffers.length) return { ok: false, error: "no_frames" };
  const fps = Math.max(1, Math.min(60, Number(opts.fps) || 12));
  const delay = Math.max(20, Math.round(1000 / fps));
  const sharp = require("sharp");
  const buffer = await sharp(buffers, { animated: true })
    .gif({
      loop: opts.loop == null ? 0 : Number(opts.loop),
      delay
    })
    .toBuffer();
  return {
    ok: true,
    buffer,
    format: "gif",
    frameCount: buffers.length,
    fps,
    byteLength: buffer.length,
    provider: "sharp_gif"
  };
}

function encodeVideoFromPngBuffers(frames, opts = {}) {
  const buffers = normalizeFrameBuffers(frames);
  if (!buffers.length) return { ok: false, error: "no_frames" };
  const ffmpeg = resolveFfmpeg();
  if (!ffmpeg) {
    return {
      ok: false,
      error: "ffmpeg_missing",
      hint: "Nainstaluj ffmpeg nebo nastav MIA_FFMPEG_PATH. WebM lze exportovat v prohlížeči přes clientStep."
    };
  }

  const format = String(opts.format || "webm").toLowerCase() === "mp4" ? "mp4" : "webm";
  const fps = Math.max(1, Math.min(60, Number(opts.fps) || 30));
  const audioPath =
    typeof opts.audioPath === "string" && opts.audioPath.trim() && fs.existsSync(opts.audioPath)
      ? opts.audioPath
      : null;
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "mia-gfx-export-"));
  const outPath = path.join(tmpDir, `out.${format}`);

  try {
    buffers.forEach((buf, i) => {
      fs.writeFileSync(path.join(tmpDir, `frame_${String(i).padStart(4, "0")}.png`), buf);
    });

    const args = [
      "-y",
      "-framerate",
      String(fps),
      "-i",
      path.join(tmpDir, "frame_%04d.png")
    ];
    if (audioPath) {
      args.push("-i", audioPath);
    }
    args.push(
      "-c:v",
      format === "mp4" ? "libx264" : "libvpx-vp9",
      "-pix_fmt",
      format === "mp4" ? "yuv420p" : "yuva420p"
    );
    if (format === "webm") args.push("-auto-alt-ref", "0");
    if (audioPath) {
      args.push("-c:a", format === "mp4" ? "aac" : "libopus", "-shortest");
    }
    args.push(outPath);

    const result = spawnSync(ffmpeg, args, { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
    if (result.status !== 0) {
      return { ok: false, error: "ffmpeg_failed", stderr: String(result.stderr || "").slice(0, 500) };
    }
    const buffer = fs.readFileSync(outPath);
    return {
      ok: true,
      buffer,
      format,
      frameCount: buffers.length,
      fps,
      byteLength: buffer.length,
      provider: "ffmpeg",
      hasAudio: !!audioPath
    };
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

module.exports = {
  resolveFfmpeg,
  normalizeFrameBuffers,
  encodeGifFromPngBuffers,
  encodeVideoFromPngBuffers
};
