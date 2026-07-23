"use strict";

/**
 * Phase 13l — operator staging preview (body + Koj studio sheets) before promote.
 * Staging sheets stay studio-only — never live gift eligible.
 */

const fs = require("fs");
const path = require("path");
const { getAiStagingClip, DEFAULT_STAGING_ROOT } = require("./promoteAiAnimation");

const ROOT = path.resolve(__dirname, "..", "..");

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function publicStagingSheetUrl(stagingId) {
  return `/assets/mia-ai-staging/${encodeURIComponent(stagingId)}/built/sprite_sheet.png`;
}

function publicStagingManifestUrl(stagingId) {
  return `/assets/mia-ai-staging/${encodeURIComponent(stagingId)}/built/sprite.json`;
}

function motionToEmotion(motion) {
  const key = String(motion || "idle").toLowerCase();
  if (key === "wave") return "wave";
  if (key === "bounce" || key === "speak") return "happy";
  if (key === "nod") return "idle";
  return key || "idle";
}

/**
 * Build studio preview payload from AI staging clip (no bank promote required).
 */
function previewStagingClip(input = {}) {
  const stagingId = safeString(input.stagingId || input.clipId || input.id);
  const detail = getAiStagingClip({
    stagingId,
    stagingRoot: input.stagingRoot,
    includeFramesBase64: false
  });
  if (!detail.ok) {
    return { ...detail, phase: "13l" };
  }

  const stagingRoot = input.stagingRoot || DEFAULT_STAGING_ROOT;
  const sheetPath = path.join(stagingRoot, detail.stagingId, "built", "sprite_sheet.png");
  const manifestPath = path.join(stagingRoot, detail.stagingId, "built", "sprite.json");
  if (!fs.existsSync(sheetPath)) {
    return {
      ok: false,
      error: "sheet_not_built",
      stagingId: detail.stagingId,
      phase: "13l",
      hint: "Generate or → Staging first (rebuilds sheet)"
    };
  }

  const fps = detail.fps || 12;
  const frameCount = detail.frameCount || 4;
  const holdMs = Math.max(
    1200,
    Math.round((frameCount / fps) * 1000 + 800),
    Number(input.holdMs) || 0
  );
  const motion = detail.motion || "idle";
  const emotion = safeString(input.mood || input.emotion, motionToEmotion(motion));
  const sheetUrl = publicStagingSheetUrl(detail.stagingId);
  const manifestUrl = fs.existsSync(manifestPath)
    ? publicStagingManifestUrl(detail.stagingId)
    : null;

  const clip = {
    id: `staging/${detail.stagingId}`,
    stagingId: detail.stagingId,
    category: "staging",
    label: detail.prompt || detail.stagingId,
    quality: detail.quality || "procedural",
    source: detail.metadata?.source || "ai_staging",
    liveSheetEligible: false,
    motion,
    emotion,
    spriteHint: motion,
    sheetUrl,
    manifestUrl,
    frameCount,
    fps,
    trueAlpha: detail.trueAlpha !== false,
    avgAlphaRatio: detail.avgAlphaRatio ?? null,
    phase: detail.metadata?.phase || "13l"
  };

  return {
    ok: true,
    phase: "13l",
    studioPreview: true,
    stagingPreview: true,
    liveSheetEligible: false,
    note: "staging_studio_only_not_used_by_live_gifts",
    clip,
    reaction: {
      animationId: clip.id,
      emotion,
      effectProgram: safeString(input.effectProgram, "generic_support"),
      giftKey: safeString(input.giftKey),
      tier: "T0",
      animationOwner: "kojnozout",
      sheetUrl,
      manifestUrl,
      bankQuality: clip.quality,
      preferProductionSprite: false,
      studioPreview: true,
      stagingPreview: true,
      spriteHint: motion,
      particles: null,
      soundCue: "",
      holdMs,
      overlay: { stageClass: "gift", scene: "party" }
    },
    sheetUrl,
    paintUrl: detail.paintUrl,
    path: detail.path
  };
}

function pushStagingClipPreview(input = {}, deps = {}) {
  const preview = previewStagingClip(input);
  if (!preview.ok) return preview;

  const overlayStateModule = deps.overlayStateModule;
  const getOverlayState = deps.getOverlayState;
  const overlayState =
    typeof getOverlayState === "function" ? getOverlayState() : deps.overlayState;

  if (!overlayStateModule || typeof overlayStateModule.setAnimationReaction !== "function") {
    return {
      ...preview,
      pushed: false,
      error: "overlay_state_unavailable",
      hint: "Open sheetUrl or Koj ?animBank=1 after MIA is running"
    };
  }
  if (!overlayState) {
    return { ...preview, pushed: false, error: "overlay_state_missing" };
  }

  const reaction = overlayStateModule.setAnimationReaction(overlayState, preview.reaction);
  if (typeof deps.invalidateOverlayStateCache === "function") {
    deps.invalidateOverlayStateCache();
  }

  let bodyPreview = null;
  let bodyMood = null;
  if (input.syncBody !== false) {
    try {
      const {
        resolveBodyMoodFromStudioPreview
      } = require("../mia-graphics-studio/bodyAnimationSync");
      const { publishBodyPreview } = require("../mia-graphics-studio/bodyPreviewCommands");
      bodyMood = resolveBodyMoodFromStudioPreview({
        clip: preview.clip,
        reaction: preview.reaction,
        mood: input.mood || preview.clip.motion,
        giftKey: input.giftKey
      });
      bodyPreview = publishBodyPreview({
        mood: bodyMood,
        speaking: input.speaking === true || preview.clip.motion === "speak",
        lockStudioMs: Number(input.holdMs) || preview.reaction.holdMs || 4000
      });
    } catch (_err) {
      bodyPreview = { ok: false, error: "body_preview_unavailable" };
    }
  }

  return {
    ...preview,
    pushed: true,
    reaction,
    bodyMood,
    bodyPreview,
    unifiedPreview: true,
    kojPreviewUrl: `/kojnozrout-runtime.html?animBank=1&staging=${encodeURIComponent(
      preview.clip.stagingId
    )}`
  };
}

/**
 * Phase 13m — encode playable GIF/WEBM from staging frames (video-generator UX, no cloud video AI).
 */
async function encodeAiStagingPreview(input = {}) {
  const stagingId = safeString(input.stagingId || input.clipId || input.id)
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  if (!stagingId) {
    return { ok: false, error: "missing_staging_id", phase: "13m" };
  }

  const formatRaw = String(input.format || "gif").toLowerCase();
  const format = formatRaw === "webm" || formatRaw === "mp4" ? formatRaw : "gif";
  const stagingRoot = input.stagingRoot || DEFAULT_STAGING_ROOT;
  const stagingDir = path.join(stagingRoot, stagingId);
  const framesDir = path.join(stagingDir, "frames");
  if (!fs.existsSync(framesDir)) {
    return { ok: false, error: "staging_not_found", stagingId, phase: "13m" };
  }

  const files = fs
    .readdirSync(framesDir)
    .filter((f) => /\.png$/i.test(f))
    .sort();
  if (!files.length) {
    return { ok: false, error: "no_frames", stagingId, phase: "13m" };
  }

  let meta = {};
  try {
    meta = JSON.parse(fs.readFileSync(path.join(stagingDir, "metadata.json"), "utf8"));
  } catch (_err) {
    meta = {};
  }

  const fps = Math.max(1, Math.min(30, Number(input.fps || meta.fps) || 12));
  const buffers = files.map((f) => fs.readFileSync(path.join(framesDir, f)));
  const builtDir = path.join(stagingDir, "built");
  fs.mkdirSync(builtDir, { recursive: true });

  const { encodeGifFromPngBuffers, encodeVideoFromPngBuffers } = require("../mia-graphics-studio/animationEncoder");

  if (format === "gif") {
    const gif = await encodeGifFromPngBuffers(buffers, { fps, loop: 0 });
    if (!gif.ok) return { ...gif, stagingId, phase: "13m" };
    const outPath = path.join(builtDir, "preview.gif");
    fs.writeFileSync(outPath, gif.buffer);
    const url = `/assets/mia-ai-staging/${encodeURIComponent(stagingId)}/built/preview.gif`;
    return {
      ok: true,
      phase: "13m",
      stagingId,
      format: "gif",
      frameCount: files.length,
      fps,
      byteLength: gif.buffer.length,
      provider: gif.provider,
      url,
      downloadUrl: url,
      path: path.relative(ROOT, outPath).replace(/\\/g, "/"),
      liveSheetEligible: false
    };
  }

  const video = encodeVideoFromPngBuffers(buffers, { fps, format });
  if (!video.ok) {
    return { ...video, stagingId, phase: "13m", format };
  }
  const outName = format === "mp4" ? "preview.mp4" : "preview.webm";
  const outPath = path.join(builtDir, outName);
  fs.writeFileSync(outPath, video.buffer);
  const url = `/assets/mia-ai-staging/${encodeURIComponent(stagingId)}/built/${outName}`;
  return {
    ok: true,
    phase: "13m",
    stagingId,
    format,
    frameCount: files.length,
    fps,
    byteLength: video.buffer.length,
    provider: video.provider || "ffmpeg",
    url,
    downloadUrl: url,
    path: path.relative(ROOT, outPath).replace(/\\/g, "/"),
    liveSheetEligible: false
  };
}

function listStagingMediaUrls(stagingId) {
  const id = safeString(stagingId);
  if (!id) return { ok: false, error: "missing_staging_id" };
  const built = path.join(DEFAULT_STAGING_ROOT, id, "built");
  const urls = {
    sheet: fs.existsSync(path.join(built, "sprite_sheet.png"))
      ? `/assets/mia-ai-staging/${encodeURIComponent(id)}/built/sprite_sheet.png`
      : null,
    gif: fs.existsSync(path.join(built, "preview.gif"))
      ? `/assets/mia-ai-staging/${encodeURIComponent(id)}/built/preview.gif`
      : null,
    webm: fs.existsSync(path.join(built, "preview.webm"))
      ? `/assets/mia-ai-staging/${encodeURIComponent(id)}/built/preview.webm`
      : null,
    mp4: fs.existsSync(path.join(built, "preview.mp4"))
      ? `/assets/mia-ai-staging/${encodeURIComponent(id)}/built/preview.mp4`
      : null
  };
  return { ok: true, stagingId: id, phase: "13m", ...urls };
}

function normalizeStagingId(raw) {
  return safeString(raw)
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function loadStagingFrameBuffers(stagingId, stagingRoot = DEFAULT_STAGING_ROOT) {
  const id = normalizeStagingId(stagingId);
  const framesDir = path.join(stagingRoot, id, "frames");
  if (!id || !fs.existsSync(framesDir)) {
    return { ok: false, error: "staging_not_found", stagingId: id };
  }
  const files = fs
    .readdirSync(framesDir)
    .filter((f) => /\.png$/i.test(f))
    .sort();
  if (!files.length) {
    return { ok: false, error: "no_frames", stagingId: id };
  }
  return {
    ok: true,
    stagingId: id,
    files,
    buffers: files.map((f) => fs.readFileSync(path.join(framesDir, f)))
  };
}

/**
 * Phase 13s/13t — light multi-clip NLE: concat staging frame folders → GIF/WEBM/MP4.
 * 13t: gapFrames · holdLast · optional audio mux (mp4/webm).
 * Studio-only (liveSheetEligible: false). No gift / promote side effects.
 */
async function makeBlankFrameLike(sampleBuffer) {
  const sharp = require("sharp");
  const meta = await sharp(sampleBuffer).metadata();
  const w = Math.max(8, Number(meta.width) || 64);
  const h = Math.max(8, Number(meta.height) || 64);
  return sharp({
    create: {
      width: w,
      height: h,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  })
    .png()
    .toBuffer();
}

function resolveAssembleAudioFile(input, outDir) {
  if (typeof input.audioPath === "string" && input.audioPath.trim()) {
    const p = path.isAbsolute(input.audioPath)
      ? input.audioPath
      : path.join(ROOT, input.audioPath);
    if (fs.existsSync(p)) return p;
  }
  if (typeof input.audioBase64 === "string" && input.audioBase64.trim()) {
    const ext = String(input.audioExt || "mp3")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "")
      .slice(0, 8) || "mp3";
    const dest = path.join(outDir, `narration.${ext}`);
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(dest, Buffer.from(input.audioBase64, "base64"));
    return dest;
  }
  return null;
}

async function assembleStagingClips(input = {}) {
  const stagingRoot = input.stagingRoot || DEFAULT_STAGING_ROOT;
  const clipIds = (Array.isArray(input.clips) ? input.clips : [])
    .map((c) => normalizeStagingId(c))
    .filter(Boolean);
  if (clipIds.length < 1) {
    return { ok: false, error: "missing_clips", phase: "13t" };
  }

  const gapFrames = Math.max(0, Math.min(24, Number(input.gapFrames) || 0));
  const holdLast = Math.max(0, Math.min(24, Number(input.holdLast) || 0));
  const buffers = [];
  const sources = [];
  let blankTemplate = null;

  for (let ci = 0; ci < clipIds.length; ci += 1) {
    const id = clipIds[ci];
    const loaded = loadStagingFrameBuffers(id, stagingRoot);
    if (!loaded.ok) {
      return { ...loaded, phase: "13t", clips: clipIds };
    }
    if (!blankTemplate && loaded.buffers[0]) blankTemplate = loaded.buffers[0];
    buffers.push(...loaded.buffers);
    if (holdLast > 0 && loaded.buffers.length) {
      const last = loaded.buffers[loaded.buffers.length - 1];
      for (let h = 0; h < holdLast; h += 1) buffers.push(last);
    }
    sources.push({
      stagingId: id,
      frameCount: loaded.files.length,
      holdLast
    });
    if (gapFrames > 0 && ci < clipIds.length - 1) {
      if (!blankTemplate) {
        return { ok: false, error: "no_frames", phase: "13t", clips: clipIds };
      }
      const blank = await makeBlankFrameLike(blankTemplate);
      for (let g = 0; g < gapFrames; g += 1) buffers.push(blank);
    }
  }
  if (!buffers.length) {
    return { ok: false, error: "no_frames", phase: "13t", clips: clipIds };
  }

  const formatRaw = String(input.format || "gif").toLowerCase();
  const format = formatRaw === "webm" || formatRaw === "mp4" ? formatRaw : "gif";
  const fps = Math.max(1, Math.min(30, Number(input.fps) || 12));
  const outId =
    normalizeStagingId(input.outId || input.stagingId || `assemble-${Date.now().toString(36)}`) ||
    `assemble-${Date.now().toString(36)}`;

  const outDir = path.join(stagingRoot, outId);
  const framesDir = path.join(outDir, "frames");
  const builtDir = path.join(outDir, "built");
  fs.mkdirSync(framesDir, { recursive: true });
  fs.mkdirSync(builtDir, { recursive: true });

  const audioPath = resolveAssembleAudioFile(input, builtDir);
  if (audioPath && format === "gif") {
    return {
      ok: false,
      error: "audio_requires_video_format",
      hint: "Audio mux funguje jen u WEBM/MP4",
      phase: "13t"
    };
  }

  for (const file of fs.readdirSync(framesDir).filter((f) => /\.png$/i.test(f))) {
    fs.unlinkSync(path.join(framesDir, file));
  }
  buffers.forEach((buf, i) => {
    fs.writeFileSync(path.join(framesDir, `${String(i).padStart(4, "0")}.png`), buf);
  });
  fs.writeFileSync(
    path.join(outDir, "metadata.json"),
    `${JSON.stringify(
      {
        id: outId,
        phase: "13t",
        source: "staging_assemble",
        clips: clipIds,
        sources,
        gapFrames,
        holdLast,
        hasAudio: !!audioPath,
        fps,
        frameCount: buffers.length,
        format,
        quality: "procedural",
        liveSheetEligible: false
      },
      null,
      2
    )}\n`
  );

  const { encodeGifFromPngBuffers, encodeVideoFromPngBuffers } = require("../mia-graphics-studio/animationEncoder");

  if (format === "gif") {
    const gif = await encodeGifFromPngBuffers(buffers, { fps, loop: 0 });
    if (!gif.ok) return { ...gif, stagingId: outId, phase: "13t", clips: clipIds };
    const outPath = path.join(builtDir, "preview.gif");
    fs.writeFileSync(outPath, gif.buffer);
    const url = `/assets/mia-ai-staging/${encodeURIComponent(outId)}/built/preview.gif`;
    return {
      ok: true,
      phase: "13t",
      stagingId: outId,
      clips: clipIds,
      sources,
      gapFrames,
      holdLast,
      hasAudio: false,
      format: "gif",
      frameCount: buffers.length,
      fps,
      byteLength: gif.buffer.length,
      provider: gif.provider,
      url,
      downloadUrl: url,
      path: path.relative(ROOT, outPath).replace(/\\/g, "/"),
      liveSheetEligible: false
    };
  }

  const video = encodeVideoFromPngBuffers(buffers, { fps, format, audioPath: audioPath || undefined });
  if (!video.ok) {
    return { ...video, stagingId: outId, phase: "13t", format, clips: clipIds };
  }
  const outName = format === "mp4" ? "preview.mp4" : "preview.webm";
  const outPath = path.join(builtDir, outName);
  fs.writeFileSync(outPath, video.buffer);
  const url = `/assets/mia-ai-staging/${encodeURIComponent(outId)}/built/${outName}`;
  return {
    ok: true,
    phase: "13t",
    stagingId: outId,
    clips: clipIds,
    sources,
    gapFrames,
    holdLast,
    hasAudio: !!audioPath,
    format,
    frameCount: buffers.length,
    fps,
    byteLength: video.buffer.length,
    provider: video.provider || "ffmpeg",
    url,
    downloadUrl: url,
    path: path.relative(ROOT, outPath).replace(/\\/g, "/"),
    liveSheetEligible: false
  };
}

module.exports = {
  publicStagingSheetUrl,
  publicStagingManifestUrl,
  previewStagingClip,
  pushStagingClipPreview,
  encodeAiStagingPreview,
  listStagingMediaUrls,
  assembleStagingClips,
  loadStagingFrameBuffers,
  makeBlankFrameLike,
  ROOT
};
