"use strict";

/**
 * Phase 12v — AI 2D animation generator focused on true-alpha PNG frames.
 * Flow: prompt → N stills (magenta BG contract) → edge-flood matte → sprite sheet / WEBM.
 */

const fs = require("fs");
const path = require("path");
const paintAi = require("../mia-paint-ai");
const { packSpriteSheet } = require("../mia-animation-engine/spriteSheetPack");
const { encodeGifFromPngBuffers, encodeVideoFromPngBuffers } = require("./animationEncoder");
const { getCommand } = require("./commandCatalog");

const ROOT = path.resolve(__dirname, "..", "..");
const OUT_ROOT = path.join(ROOT, "data", "mia-ai-animations");

const MOTION_POSE_SUFFIXES = {
  idle: ["standing calm", "soft breath in", "soft breath out", "tiny blink"],
  wave: ["arm down", "arm rising", "arm high wave", "arm mid wave", "arm down again"],
  bounce: ["feet planted", "knees bend", "jump peak", "landing"],
  nod: ["head center", "head tilt down", "head center", "head tilt up"],
  speak: ["mouth closed", "mouth slightly open", "mouth open", "mouth mid"]
};

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function safeId(value) {
  return String(value || "clip")
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "clip";
}

function resolveMotion(args = {}) {
  const key = String(args.motion || args.pose || args.mood || "idle").toLowerCase();
  if (MOTION_POSE_SUFFIXES[key]) return key;
  if (/wave|mava|máva/.test(key)) return "wave";
  if (/bounce|skok|jump/.test(key)) return "bounce";
  if (/nod|kyv/.test(key)) return "nod";
  if (/speak|mluv|talk/.test(key)) return "speak";
  return "idle";
}

function buildFramePrompt(basePrompt, motion, frameIndex, frameCount) {
  const suffixes = MOTION_POSE_SUFFIXES[motion] || MOTION_POSE_SUFFIXES.idle;
  const pose = suffixes[frameIndex % suffixes.length];
  const step = `animation frame ${frameIndex + 1} of ${frameCount}, pose: ${pose}, same character identity, consistent design`;
  const withIdentity = paintAi.withMiaIdentityPrompt(`${basePrompt}, ${step}`, { motion });
  return paintAi.withTrueAlphaPrompt(withIdentity);
}

function listAiAnimationModules() {
  const gen = getCommand("generate_animation");
  const promote = getCommand("promote_animation");
  const preview = getCommand("preview_bank_clip");
  const bind = getCommand("bind_gift_keys");
  const bridge = getCommand("paint_ai_timeline_bridge");
  const dash = getCommand("dashboard_ai_generate");
  const writeback = getCommand("paint_staging_writeback");
  const stagingPrev = getCommand("staging_studio_preview");
  const stagingEnc = getCommand("staging_video_encode");
  return [
    {
      id: "generate_animation",
      api: gen?.api || "MIA.generateAnimation",
      status: gen?.status || "implemented",
      phase: gen?.phase || "12v",
      description: gen?.description,
      route: "/mia/graphics/ai/animation/generate",
      trueAlphaRoute: "/mia/graphics/ai/true-alpha"
    },
    {
      id: "paint_ai_timeline_bridge",
      api: bridge?.api || "MIA.paintAiTimelineBridge",
      status: bridge?.status || "implemented",
      phase: bridge?.phase || "13i",
      description: bridge?.description,
      route: "/mia/graphics/ai/animation/generate",
      clientCommand: "import_animation_frames"
    },
    {
      id: "dashboard_ai_generate",
      api: dash?.api || "MIA.dashboardAiGenerate",
      status: dash?.status || "implemented",
      phase: dash?.phase || "13j",
      description: dash?.description,
      route: "/mia/graphics/ai/animation/generate",
      stagingRoute: "/mia/animation/staging/:stagingId",
      paintQuery: "aiStaging"
    },
    {
      id: "paint_staging_writeback",
      api: writeback?.api || "MIA.paintStagingWriteback",
      status: writeback?.status || "implemented",
      phase: writeback?.phase || "13k",
      description: writeback?.description,
      route: "/mia/animation/staging/:stagingId/save",
      clientCommand: "save_staging_frames"
    },
    {
      id: "staging_studio_preview",
      api: stagingPrev?.api || "MIA.stagingStudioPreview",
      status: stagingPrev?.status || "implemented",
      phase: stagingPrev?.phase || "13l",
      description: stagingPrev?.description,
      route: "/mia/animation/staging/:stagingId/preview",
      publicSheetPrefix: "/assets/mia-ai-staging/"
    },
    {
      id: "staging_video_encode",
      api: stagingEnc?.api || "MIA.stagingVideoEncode",
      status: stagingEnc?.status || "implemented",
      phase: stagingEnc?.phase || "13m",
      description: stagingEnc?.description,
      route: "/mia/animation/staging/:stagingId/encode",
      formats: ["gif", "webm", "mp4"]
    },
    {
      id: "operator_production_checklist",
      api: "MIA.operatorProductionChecklist",
      status: "implemented",
      phase: "13n",
      description: "Operator polish — docs · True Alpha/MP4 · production checklist",
      paintTrueAlpha: true,
      paintMp4: true,
      dashboardChecklist: true
    },
    {
      id: "character_motion_identity",
      api: "MIA.characterMotionIdentity",
      status: "implemented",
      phase: "13o",
      description: "Character motion presets + body-parts --identity",
      motionPresets: ["hair_eyes", "blink", "breath", "nod_gesture", "sway"],
      buildFlag: "--identity"
    },
    {
      id: "timeline_combo_maturity",
      api: "MIA.timelineComboMaturity",
      status: "implemented",
      phase: "13p",
      description: "Timeline onion/scrub snap/easing · head/combo.png",
      onionDefault: true,
      scrubSnapMs: 70,
      easing: "ease",
      comboHead: "/assets/mia/parts/head/combo.png"
    },
    {
      id: "timeline_pro_ux",
      api: "MIA.timelineProUx",
      status: "implemented",
      phase: "13q",
      description: "Onion ghosts + depth · easing UI · bone IK drag",
      onionGhosts: true,
      onionDepthMax: 3,
      easingModes: ["linear", "ease", "ease-in", "ease-out", "ease-in-out"],
      boneIkTool: "bone-ik"
    },
    {
      id: "ai_video_quality",
      api: "MIA.aiVideoQuality",
      status: "implemented",
      phase: "13r",
      description: "Staging MP4 + playback · temporal seed/ref/blend",
      stagingMp4: true,
      stagingMediaRoute: "/mia/animation/staging/:stagingId/media",
      temporalConsistency: true
    },
    {
      id: "body_art_assemble",
      api: "MIA.bodyArtAssemble",
      status: "implemented",
      phase: "13s",
      description: "Body crop polish + multi-clip staging assemble",
      assembleRoute: "/mia/animation/assemble",
      comboMaster: "faces/combo.png",
      cropPhase: "13s"
    },
    {
      id: "assemble_v2",
      api: "MIA.assembleV2",
      status: "implemented",
      phase: "13t",
      description: "Assemble gap/hold + audio mux + dashboard UX",
      assembleRoute: "/mia/animation/assemble",
      gapFrames: true,
      holdLast: true,
      audioMux: true
    },
    {
      id: "lip_audio_bone_deform",
      api: "MIA.lipAudioBoneDeform",
      status: "implemented",
      phase: "13u",
      description: "Lip sync from audio · bone tip deform",
      lipAudio: true,
      boneDeform: true,
      paintButton: "Lip♪"
    },
    {
      id: "whisper_lip_mesh_warp",
      api: "MIA.whisperLipMeshWarp",
      status: "implemented",
      phase: "13v",
      description: "Whisper STT lip · soft bone skew warp",
      whisperStt: true,
      amplitudeFallback: true,
      softSkewWarp: true,
      paintButton: "Lip♪"
    },
    {
      id: "live_viseme_speech",
      api: "MIA.liveVisemeSpeech",
      status: "implemented",
      phase: "13w",
      description: "Live speech overlay viseme lip from TTS text",
      voicePlaybackLipTrack: true,
      speakFrames: true,
      overlay: "speech-overlay.html"
    },
    {
      id: "live_audio_lip",
      api: "MIA.liveAudioLip",
      status: "implemented",
      phase: "13x",
      description: "Live lip amplitude from TTS audioUrl/file",
      audioAmplitude: true,
      asyncUpgrade: true,
      clientAudioContext: true
    },
    {
      id: "body_speak_lip_parity",
      api: "MIA.bodySpeakLipParity",
      status: "implemented",
      phase: "13y",
      description: "Body MIA_EYES lipTrack parity with speech holo",
      eyesLipTrack: true,
      bodyStateLipTrack: true
    },
    {
      id: "visible_speak_faces",
      api: "MIA.visibleSpeakFaces",
      status: "implemented",
      phase: "13z",
      description: "Face-crop speak-lip assets for readable live mouth",
      speakLipParts: true,
      speakFaceZoom: true,
      buildScript: "build_mia_speak_lip_faces.js"
    },
    {
      id: "live_presence",
      api: "MIA.livePresence",
      status: "implemented",
      phase: "14a",
      description: "Calm live entity — one face slot, hero-only avatar, natural lip cadence",
      sharedConfig: "mia-live-presence.js",
      heroHidesGhostHolo: true,
      idleFaceIsSpeakClosed: true
    },
    {
      id: "mood_brain",
      api: "MIA.moodBrain",
      status: "implemented",
      phase: "14b",
      description: "Chat room tone → communityMood slot → MIA + Koj natural reactions",
      observeHook: "MIA_MOOD_BRAIN.observeCommentMood",
      overlaySlot: "communityMood"
    },
    {
      id: "promote_animation",
      api: promote?.api || "MIA.promoteAnimation",
      status: promote?.status || "implemented",
      phase: promote?.phase || "12w",
      description: promote?.description,
      route: "/mia/graphics/ai/animation/promote",
      markProductionRoute: "/mia/graphics/ai/animation/mark-production"
    },
    {
      id: "preview_bank_clip",
      api: preview?.api || "MIA.previewBankClip",
      status: preview?.status || "implemented",
      phase: preview?.phase || "12x",
      description: preview?.description,
      route: "/mia/animation/bank/preview"
    },
    {
      id: "bind_gift_keys",
      api: bind?.api || "MIA.bindGiftKeys",
      status: bind?.status || "implemented",
      phase: bind?.phase || "12x",
      description: bind?.description,
      route: "/mia/animation/bank/bind-gift-keys"
    }
  ];
}

async function measureAlphaRatio(pngBuffer) {
  const sharp = require("sharp");
  const { data, info } = await sharp(pngBuffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let transparent = 0;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < 8) transparent += 1;
  }
  return transparent / (info.width * info.height);
}

async function generateAnimation(args = {}, ctx = {}) {
  const def = getCommand("generate_animation");
  const prompt = String(args.prompt || args.text || paintAi.DEFAULT_MIA_PROMPT).trim();
  const motion = resolveMotion(args);
  const frameCount = clamp(Number(args.frameCount || args.frames) || 8, 2, 24);
  const width = clamp(Number(args.width) || 512, 64, 1024);
  const height = clamp(Number(args.height) || 512, 64, 1024);
  const fps = clamp(Number(args.fps) || 12, 1, 30);
  const packSheet = args.packSheet !== false;
  const encodeGif = args.encodeGif === true;
  const encodeWebm = args.encodeWebm === true || String(args.format || "").toLowerCase() === "webm";
  const persist = args.persist !== false;
  const clipId = safeId(args.clipId || args.id || `${motion}-${Date.now().toString(36)}`);
  const alphaMode = args.alphaMode || "auto";

  const frames = [];
  const frameMeta = [];
  let provider = "procedural";
  const temporalConsistency = args.temporalConsistency !== false;
  const identitySeed = paintAi.hashPrompt(`${prompt}|${motion}|${width}x${height}`);
  let previousFrame = null;

  for (let i = 0; i < frameCount; i += 1) {
    const framePrompt = buildFramePrompt(prompt, motion, i, frameCount);
    const gen = await paintAi.generateImage({
      prompt: framePrompt,
      width,
      height,
      trueAlpha: true,
      applyMatte: true,
      alphaMode,
      frameIndex: i,
      frameCount,
      motion,
      identitySeed,
      referenceBuffer: temporalConsistency && previousFrame ? previousFrame : null,
      temporalBlend: temporalConsistency && previousFrame ? Number(args.temporalBlend ?? 0.2) : 0,
      useReferenceEdit: temporalConsistency && i > 0,
      env: ctx.env || process.env
    });
    if (!gen?.buffer) {
      return { ok: false, error: "frame_generate_failed", frameIndex: i, api: def?.api };
    }
    if (gen.provider === "openai" || gen.provider === "openai_edit") provider = "openai";
    const alphaRatio = gen.alpha?.alphaRatio ?? (await measureAlphaRatio(gen.buffer));
    frames.push(gen.buffer);
    previousFrame = gen.buffer;
    frameMeta.push({
      index: i,
      prompt: framePrompt,
      provider: gen.provider,
      alphaRatio,
      transparentPixels: gen.alpha?.transparentPixels ?? null,
      temporal: gen.temporal || null
    });
  }

  const avgAlpha =
    frameMeta.reduce((sum, row) => sum + Number(row.alphaRatio || 0), 0) / Math.max(1, frameMeta.length);

  let outDir = null;
  let framePaths = [];
  if (persist) {
    outDir = path.join(OUT_ROOT, clipId);
    const framesDir = path.join(outDir, "frames");
    fs.mkdirSync(framesDir, { recursive: true });
    framePaths = frames.map((buf, i) => {
      const file = path.join(framesDir, `${String(i).padStart(4, "0")}.png`);
      fs.writeFileSync(file, buf);
      return file;
    });
    fs.writeFileSync(
      path.join(outDir, "metadata.json"),
      `${JSON.stringify(
        {
          id: clipId,
          phase: "12v",
          prompt,
          motion,
          fps,
          frameCount,
          width,
          height,
          quality: provider === "openai" ? "ai" : "procedural",
          source: "ai_true_alpha_anim",
          trueAlpha: true,
          temporalConsistency,
          identitySeed,
          avgAlphaRatio: avgAlpha,
          frames: frameMeta
        },
        null,
        2
      )}\n`
    );
  }

  let sheet = null;
  if (packSheet && framePaths.length) {
    const packed = await packSpriteSheet(framePaths, {
      clipId,
      fps,
      metadata: {
        id: clipId,
        label: prompt.slice(0, 64),
        quality: provider === "openai" ? "ai" : "procedural",
        source: "ai_true_alpha_anim",
        trueAlpha: true
      }
    });
    if (packed.ok) {
      const builtDir = path.join(outDir, "built");
      fs.mkdirSync(builtDir, { recursive: true });
      const sheetPath = path.join(builtDir, "sprite_sheet.png");
      const manifestPath = path.join(builtDir, "sprite.json");
      fs.writeFileSync(sheetPath, packed.sheetBuffer);
      fs.writeFileSync(manifestPath, `${JSON.stringify(packed.manifest, null, 2)}\n`);
      sheet = {
        ok: true,
        sheetPath,
        manifestPath,
        sheetWidth: packed.sheetWidth,
        sheetHeight: packed.sheetHeight,
        frameCount: packed.frameCount,
        sheetBase64: packed.sheetBuffer.toString("base64"),
        manifest: packed.manifest
      };
    } else {
      sheet = packed;
    }
  } else if (packSheet && frames.length) {
    const tmpPaths = [];
    const tmpDir = fs.mkdtempSync(path.join(require("os").tmpdir(), "mia-ai-anim-"));
    try {
      for (let i = 0; i < frames.length; i += 1) {
        const p = path.join(tmpDir, `${String(i).padStart(4, "0")}.png`);
        fs.writeFileSync(p, frames[i]);
        tmpPaths.push(p);
      }
      const packed = await packSpriteSheet(tmpPaths, { clipId, fps });
      if (packed.ok) {
        sheet = {
          ok: true,
          sheetWidth: packed.sheetWidth,
          sheetHeight: packed.sheetHeight,
          frameCount: packed.frameCount,
          sheetBase64: packed.sheetBuffer.toString("base64"),
          manifest: packed.manifest
        };
      }
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }

  let gif = null;
  if (encodeGif) {
    gif = await encodeGifFromPngBuffers(frames, { fps, loop: 0 });
    if (gif.ok && outDir) {
      const gifPath = path.join(outDir, "built", "preview.gif");
      fs.mkdirSync(path.dirname(gifPath), { recursive: true });
      fs.writeFileSync(gifPath, gif.buffer);
      gif.path = gifPath;
      gif.gifBase64 = gif.buffer.toString("base64");
      delete gif.buffer;
    } else if (gif.ok) {
      gif.gifBase64 = gif.buffer.toString("base64");
      delete gif.buffer;
    }
  }

  let video = null;
  if (encodeWebm) {
    video = encodeVideoFromPngBuffers(frames, { fps, format: "webm" });
    if (video.ok && outDir) {
      const webmPath = path.join(outDir, "built", "preview.webm");
      fs.mkdirSync(path.dirname(webmPath), { recursive: true });
      fs.writeFileSync(webmPath, video.buffer);
      video.path = webmPath;
      video.webmBase64 = video.buffer.toString("base64");
      delete video.buffer;
    } else if (video.ok) {
      video.webmBase64 = video.buffer.toString("base64");
      delete video.buffer;
    }
  }

  if (typeof ctx.paintAi?.logPaintAi === "function") {
    ctx.paintAi.logPaintAi({
      kind: "graphics_generate_animation",
      clipId,
      frameCount,
      provider,
      avgAlphaRatio: avgAlpha
    });
  } else if (typeof paintAi.logPaintAi === "function") {
    paintAi.logPaintAi({
      kind: "graphics_generate_animation",
      clipId,
      frameCount,
      provider,
      avgAlphaRatio: avgAlpha
    });
  }

  let promote = null;
  if (args.promoteToBank === true && persist && outDir) {
    const { promoteAiAnimationToBank } = require("../mia-animation-engine/promoteAiAnimation");
    promote = await promoteAiAnimationToBank({
      stagingDir: outDir,
      category: args.bankCategory || "ai",
      bankClipId: args.bankClipId,
      emotion: args.emotion || motion,
      giftKeys: args.giftKeys,
      minAlphaRatio: args.minAlphaRatio,
      confirmProduction: false
    });
  }

  const includeFramesBase64 =
    args.includeFramesBase64 === true ||
    args.forPaintTimeline === true ||
    args.importToTimeline === true;
  const framesBase64 = includeFramesBase64
    ? frames.map((buf) => buf.toString("base64"))
    : null;

  const timelineStep =
    framesBase64 && framesBase64.length
      ? {
          command: "import_animation_frames",
          args: {
            framesBase64,
            fps,
            width,
            height,
            clipId,
            motion,
            prompt: prompt.slice(0, 64),
            replaceTimeline: args.replaceTimeline !== false,
            fit: args.fit !== false,
            layerName: `AI anim: ${clipId}`
          }
        }
      : null;

  return {
    ok: true,
    api: def?.api || "MIA.generateAnimation",
    module: "generate_animation",
    phase: temporalConsistency !== false ? "13r" : "12v",
    clipId,
    prompt,
    motion,
    provider,
    trueAlpha: true,
    temporalConsistency,
    identitySeed,
    alphaMode,
    frameCount,
    fps,
    width,
    height,
    avgAlphaRatio: avgAlpha,
    frames: frameMeta,
    framesBase64,
    previewFrameBase64: frames[0]?.toString("base64") || null,
    outDir: outDir
      ? path.relative(ROOT, outDir).replace(/\\/g, "/")
      : null,
    sheet,
    gif,
    video,
    promote,
    clientStep:
      timelineStep ||
      (sheet?.sheetBase64
        ? {
            command: "import_image",
            args: {
              dataBase64: sheet.sheetBase64,
              name: `AI anim: ${clipId}`,
              fit: true
            }
          }
        : null)
  };
}

async function applyTrueAlphaCommand(args = {}) {
  if (!args.dataBase64) return { ok: false, error: "missing_image_data", api: "MIA.trueAlpha" };
  const input = Buffer.from(String(args.dataBase64), "base64");
  const result = await paintAi.applyTrueAlphaBuffer(input, { mode: args.mode || "auto" });
  return {
    ok: true,
    api: "MIA.trueAlpha",
    module: "true_alpha",
    phase: "12v",
    width: result.width,
    height: result.height,
    transparentPixels: result.transparentPixels,
    alphaRatio: result.alphaRatio,
    mode: result.mode,
    provider: result.provider,
    pngBase64: result.buffer.toString("base64"),
    byteLength: result.buffer.length,
    clientStep: {
      command: "import_image",
      args: {
        dataBase64: result.buffer.toString("base64"),
        name: "True alpha",
        fit: true
      }
    }
  };
}

async function promoteAnimationCommand(args = {}) {
  const {
    promoteAiAnimationToBank,
    markBankClipProduction,
    bindGiftKeysToClip
  } = require("../mia-animation-engine/promoteAiAnimation");

  if (args.bindGiftKeys === true || args.action === "bind_gift_keys") {
    return {
      api: "MIA.bindGiftKeys",
      module: "bind_gift_keys",
      ...(await bindGiftKeysToClip(args))
    };
  }

  if (args.markProduction === true || args.action === "mark_production") {
    return {
      api: "MIA.promoteAnimation",
      module: "promote_animation",
      ...(await markBankClipProduction(args))
    };
  }

  const result = await promoteAiAnimationToBank(args);
  return {
    api: "MIA.promoteAnimation",
    module: "promote_animation",
    ...result
  };
}

module.exports = {
  MOTION_POSE_SUFFIXES,
  OUT_ROOT,
  listAiAnimationModules,
  generateAnimation,
  applyTrueAlphaCommand,
  promoteAnimationCommand,
  buildFramePrompt,
  resolveMotion
};
