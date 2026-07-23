/**
 * MIA Graphics Studio — browser client (Phase 12b AI API).
 */
(function (global) {
  "use strict";

  function apiBase(origin) {
    return origin || (global.location?.origin && global.location.protocol.startsWith("http")
      ? global.location.origin
      : "http://127.0.0.1:3000");
  }

  async function postJson(path, body, origin) {
    const resp = await fetch(`${apiBase(origin)}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body || {})
    });
    const data = await resp.json();
    if (!resp.ok && !data.error) data.error = `http_${resp.status}`;
    return data;
  }

  async function generateImage(args, origin) {
    return postJson("/mia/graphics/ai/generate", args, origin);
  }

  async function generateAnimation(args, origin) {
    return postJson("/mia/graphics/ai/animation/generate", args, origin);
  }

  async function promoteAnimation(args, origin) {
    return postJson("/mia/graphics/ai/animation/promote", args, origin);
  }

  async function fetchStagingClip(stagingId, opts = {}, origin) {
    const id = encodeURIComponent(String(stagingId || "").trim());
    if (!id) return { ok: false, error: "missing_staging_id" };
    const frames = opts.includeFramesBase64 === false ? "0" : "1";
    const max = opts.maxFrames ? `&maxFrames=${encodeURIComponent(opts.maxFrames)}` : "";
    const resp = await fetch(
      `${apiBase(origin)}/mia/animation/staging/${id}?frames=${frames}${max}`
    );
    const data = await resp.json();
    if (!resp.ok && !data.error) data.error = `http_${resp.status}`;
    return data;
  }

  async function saveStagingFrames(stagingId, args = {}, origin) {
    const id = encodeURIComponent(String(stagingId || args.stagingId || "").trim());
    if (!id) return { ok: false, error: "missing_staging_id" };
    return postJson(`/mia/animation/staging/${id}/save`, { ...args, stagingId: stagingId || args.stagingId }, origin);
  }

  async function trueAlpha(args, origin) {
    return postJson("/mia/graphics/ai/true-alpha", args, origin);
  }

  async function editRegion(args, origin) {
    return postJson("/mia/graphics/ai/edit", args, origin);
  }

  async function removeBackground(args, origin) {
    return postJson("/mia/graphics/ai/remove-background", args, origin);
  }

  async function upscale(args, origin) {
    return postJson("/mia/graphics/ai/upscale", args, origin);
  }

  async function restore(args, origin) {
    return postJson("/mia/graphics/ai/restore", args, origin);
  }

  async function recolor(args, origin) {
    return postJson("/mia/graphics/ai/recolor", args, origin);
  }

  async function motionLayerKeyframe(args, origin) {
    return postJson("/mia/graphics/motion/layer-keyframe", args, origin);
  }

  async function motionCameraKeyframe(args, origin) {
    return postJson("/mia/graphics/motion/camera-keyframe", args, origin);
  }

  async function motionBonesRig(args, origin) {
    return postJson("/mia/graphics/motion/bones-rig", args, origin);
  }

  async function motionSample(args, origin) {
    return postJson("/mia/graphics/motion/sample", args, origin);
  }

  async function motionAiGenerate(args, origin) {
    return postJson("/mia/graphics/motion/ai-generate", args, origin);
  }

  async function motionLipSync(args, origin) {
    return postJson("/mia/graphics/motion/lip-sync", args, origin);
  }

  async function motionIkSolve(args, origin) {
    return postJson("/mia/graphics/motion/ik-solve", args, origin);
  }

  async function createParticles(args, origin) {
    return postJson("/mia/graphics/fx/particles", args, origin);
  }

  async function exportGif(args, origin) {
    return postJson("/mia/graphics/export/gif", args, origin);
  }

  async function exportWebm(args, origin) {
    return postJson("/mia/graphics/export/webm", args, origin);
  }

  async function exportMp4(args, origin) {
    return postJson("/mia/graphics/export/mp4", args, origin);
  }

  async function createAvatar(args, origin) {
    return postJson("/mia/graphics/avatar/create", args, origin);
  }

  async function publishPreview(args, origin) {
    return postJson("/mia/graphics/preview/publish", args, origin);
  }

  async function runPipeline(body, origin) {
    return postJson("/mia/graphics/pipeline", body, origin);
  }

  function buildRectMaskBase64(rect, docWidth, docHeight) {
    const w = Math.max(1, Math.round(Number(docWidth) || 512));
    const h = Math.max(1, Math.round(Number(docHeight) || 512));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#fff";
    const x = Math.max(0, Math.round(Number(rect?.x) || 0));
    const y = Math.max(0, Math.round(Number(rect?.y) || 0));
    const rw = Math.max(1, Math.round(Number(rect?.width) || 1));
    const rh = Math.max(1, Math.round(Number(rect?.height) || 1));
    ctx.fillRect(x, y, rw, rh);
    const dataUrl = canvas.toDataURL("image/png");
    return dataUrl.split(",")[1] || "";
  }

  function buildSelectionMaskBase64(selection, core, doc) {
    if (!selection || !core?.selectionBounds) return null;
    const b = core.selectionBounds(selection);
    if (!b || b.width < 1 || b.height < 1) return null;
    const w = doc.width;
    const h = doc.height;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#fff";
    if (selection.kind === "rect") {
      ctx.fillRect(b.x, b.y, b.width, b.height);
    } else if (selection.kind === "mask" && selection.maskRows) {
      const img = ctx.getImageData(0, 0, w, h);
      for (let ly = 0; ly < selection.maskRows.length; ly++) {
        const row = selection.maskRows[ly];
        for (let lx = 0; lx < row.length; lx++) {
          if (row[lx]) {
            const px = b.x + lx;
            const py = b.y + ly;
            if (px >= 0 && py >= 0 && px < w && py < h) {
              const i = (py * w + px) * 4;
              img.data[i] = 255;
              img.data[i + 1] = 255;
              img.data[i + 2] = 255;
              img.data[i + 3] = 255;
            }
          }
        }
      }
      ctx.putImageData(img, 0, 0);
    } else {
      ctx.fillRect(b.x, b.y, b.width, b.height);
    }
    return canvas.toDataURL("image/png").split(",")[1] || "";
  }

  async function importPngBase64ToLayer(ctx, pngBase64, layerName, opts) {
    const { core, paintDoc, engine, bindDocument, renderLayerList, markDirty, draw, docSizeEl, fitDocument } = ctx;
    if (!pngBase64 || !engine) return { ok: false, error: "missing_context" };

    if (opts?.replaceDocumentSize && opts.width && opts.height) {
      paintDoc.width = opts.width;
      paintDoc.height = opts.height;
      core.touchDocument(paintDoc);
      if (docSizeEl) docSizeEl.textContent = `${opts.width}×${opts.height}`;
    }

    core.addLayer(paintDoc, { name: layerName || "AI vrstva" });
    bindDocument();
    renderLayerList();
    const layer = core.getActiveLayer(paintDoc);
    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = `data:image/png;base64,${pngBase64}`;
    });
    const importOpts =
      opts?.replaceDocumentSize && opts.width && opts.height
        ? { fit: false, x: 0, y: 0 }
        : opts?.fit === false
          ? { fit: false, x: 0, y: 0 }
          : { fit: true };
    await engine.importImageToLayer(layer.id, img, importOpts);
    markDirty();
    draw();
    if (opts?.replaceDocumentSize && typeof fitDocument === "function") fitDocument();
    return { ok: true, layerId: layer.id };
  }

  function clearRasterLayers(engine, paintDoc) {
    if (!engine?.rasters || !paintDoc?.layers) return;
    for (const layer of paintDoc.layers) {
      if (layer.kind !== "raster") continue;
      const raster = engine.rasters.get(layer.id);
      raster?.clearAllTiles?.();
    }
  }

  async function loadPngBase64Image(pngBase64) {
    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = `data:image/png;base64,${pngBase64}`;
    });
    return img;
  }

  /**
   * Phase 13i — import AI animation PNG frames into paint timeline.
   */
  async function importAnimationFramesToTimeline(ctx, args = {}) {
    const {
      core,
      paintDoc,
      engine,
      bindDocument,
      renderLayerList,
      renderFrameList,
      markDirty,
      draw,
      syncMotionUi,
      timelineEditor
    } = ctx;
    const framesBase64 = Array.isArray(args.framesBase64) ? args.framesBase64.filter(Boolean) : [];
    if (!framesBase64.length || !engine || !paintDoc || !core) {
      return { ok: false, error: "missing_frames_or_context" };
    }

    const fps = Math.max(1, Math.min(30, Number(args.fps) || paintDoc.timeline?.fps || 12));
    const durationMs = Math.round(1000 / fps);
    const fit = args.fit !== false;
    const replaceTimeline = args.replaceTimeline !== false;
    const layerName = args.layerName || `AI anim: ${args.clipId || "clip"}`;

    if (!paintDoc.timeline) {
      paintDoc.timeline = core.createTimeline({ fps });
    }
    const tl = paintDoc.timeline;
    tl.fps = fps;
    core.ensureMotion?.(tl);

    if (replaceTimeline) {
      tl.frames = [core.createFrame({ label: "1", durationMs })];
      tl.activeFrameIndex = 0;
    }

    let layer = core.getActiveLayer(paintDoc);
    if (!layer || layer.kind !== "raster") {
      core.addLayer(paintDoc, { name: layerName });
      bindDocument?.();
      renderLayerList?.();
      layer = core.getActiveLayer(paintDoc);
    } else if (args.renameLayer !== false) {
      layer.name = layerName;
      renderLayerList?.();
    }

    for (let i = 0; i < framesBase64.length; i += 1) {
      if (i === 0) {
        engine.applyTimelineFrame?.(0);
      } else {
        engine.addTimelineFrame?.();
        const frame = tl.frames[tl.activeFrameIndex];
        if (frame) {
          frame.label = String(i + 1);
          frame.durationMs = durationMs;
        }
      }

      clearRasterLayers(engine, paintDoc);
      const img = await loadPngBase64Image(framesBase64[i]);
      await engine.importImageToLayer(layer.id, img, fit ? { fit: true } : { fit: false, x: 0, y: 0 });
      engine.captureTimelineFrame?.();
    }

    tl.motion.durationMs = Math.max(
      Number(tl.motion.durationMs) || 0,
      framesBase64.length * durationMs
    );
    core.setUnifiedPlayhead?.(tl, 0) || core.setPlayhead?.(tl, 0);
    engine.applyTimelineFrame?.(0);
    engine.setMotionPlayhead?.(0);

    markDirty?.();
    renderFrameList?.();
    syncMotionUi?.();
    timelineEditor?.refresh?.();
    draw?.();

    return {
      ok: true,
      frameCount: framesBase64.length,
      fps,
      layerId: layer.id,
      clipId: args.clipId || null
    };
  }

  async function applyMotionClientStep(step, ctx) {
    const { core, paintDoc, engine, markDirty, draw } = ctx;
    if (!step?.command || !core || !paintDoc?.timeline) return { ok: false, error: "missing_context" };
    const args = step.args || {};
    const tl = paintDoc.timeline;
    core.ensureMotion?.(tl);

    switch (step.command) {
      case "motion_add_layer_keyframe":
        core.addLayerKeyframe(tl, args.layerId || paintDoc.activeLayerId, args);
        break;
      case "motion_add_camera_keyframe":
        core.addCameraKeyframe(tl, args);
        break;
      case "motion_create_bones_rig":
        core.createBonesRig(tl, { ...args, layerId: args.layerId || paintDoc.activeLayerId });
        break;
      case "motion_add_bone_keyframe":
        core.addBoneKeyframe(tl, args.rigId, args.boneId || "root", args.timeMs, args.angle);
        break;
      case "motion_ai_generate":
        core.ensureMotion?.(tl);
        if (global.MIA_GRAPHICS_CLIENT?._generateAiMotionLocal) {
          global.MIA_GRAPHICS_CLIENT._generateAiMotionLocal(core, tl, args);
        } else {
          const layerId = args.layerId || paintDoc.activeLayerId;
          const styleRaw = String(args.style || "hair_eyes").toLowerCase();
          const style =
            styleRaw === "hair_eyes_subtle" || styleRaw === "vlasy"
              ? "hair_eyes"
              : styleRaw === "nod"
                ? "nod_gesture"
                : styleRaw;
          const intensity = Number(args.intensity ?? 0.6);
          const durationMs = Number(args.durationMs || tl.motion.durationMs || 1200);
          const startMs = Number(args.startMs ?? tl.motion.playheadMs ?? 0);
          const recipes = {
            pulse: [
              { t: 0, y: 0, sx: 1, sy: 1, rot: 0 },
              { t: 0.45, y: -4 * intensity, sx: 1.08, sy: 1.08, rot: 0 },
              { t: 1, y: 0, sx: 1, sy: 1, rot: 0 }
            ],
            zoom_pulse: [
              { t: 0, y: 0, sx: 1, sy: 1, rot: 0 },
              { t: 0.45, y: -4 * intensity, sx: 1.08, sy: 1.08, rot: 0 },
              { t: 1, y: 0, sx: 1, sy: 1, rot: 0 }
            ],
            shake: [
              { t: 0, y: 0, sx: 1, sy: 1, rot: 0 },
              { t: 0.25, y: 0, sx: 1, sy: 1, rot: -8 * intensity },
              { t: 0.5, y: 0, sx: 1, sy: 1, rot: 8 * intensity },
              { t: 1, y: 0, sx: 1, sy: 1, rot: 0 }
            ],
            hair_eyes: [
              { t: 0, y: 0, sx: 1, sy: 1, rot: 0 },
              { t: 0.18, y: -1, sx: 1.01, sy: 0.99, rot: -2 * intensity },
              { t: 0.36, y: 1, sx: 0.995, sy: 1.01, rot: 3 * intensity },
              { t: 0.55, y: -3 * intensity, sx: 1.015, sy: 0.985, rot: -1 * intensity },
              { t: 1, y: 0, sx: 1, sy: 1, rot: 0 }
            ],
            blink: [
              { t: 0, y: 0, sx: 1, sy: 1, rot: 0 },
              { t: 0.12, y: 1, sx: 1.02, sy: 0.85, rot: 0 },
              { t: 0.22, y: 0, sx: 1, sy: 1, rot: 0 },
              { t: 1, y: 0, sx: 1, sy: 1, rot: 0 }
            ],
            breath: [
              { t: 0, y: 0, sx: 1, sy: 1, rot: 0 },
              { t: 0.5, y: -4 * intensity, sx: 1.03, sy: 1.03, rot: 0 },
              { t: 1, y: 0, sx: 1, sy: 1, rot: 0 }
            ],
            nod_gesture: [
              { t: 0, y: 0, sx: 1, sy: 1, rot: 0 },
              { t: 0.28, y: 8 * intensity, sx: 1.01, sy: 0.97, rot: 6 * intensity },
              { t: 1, y: 0, sx: 1, sy: 1, rot: 0 }
            ],
            sway: [
              { t: 0, y: 0, sx: 1, sy: 1, rot: 0 },
              { t: 0.25, y: -1, sx: 1, sy: 1, rot: -8 * intensity },
              { t: 0.75, y: -1, sx: 1, sy: 1, rot: 8 * intensity },
              { t: 1, y: 0, sx: 1, sy: 1, rot: 0 }
            ],
            bounce: [
              { t: 0, y: 0, sx: 1, sy: 1, rot: 0 },
              { t: 0.32, y: -Math.round(6 + 12 * intensity), sx: 1, sy: 1.05, rot: -2 * intensity },
              { t: 0.72, y: Math.round(3 * intensity), sx: 1, sy: 0.98, rot: 0 },
              { t: 1, y: 0, sx: 1, sy: 1, rot: 0 }
            ]
          };
          const steps = recipes[style] || recipes.hair_eyes;
          for (const kf of steps) {
            core.addLayerKeyframe(tl, layerId, {
              timeMs: Math.round(startMs + kf.t * durationMs),
              y: kf.y,
              scaleX: kf.sx,
              scaleY: kf.sy,
              rotation: kf.rot
            });
          }
          tl.motion.durationMs = Math.max(tl.motion.durationMs, startMs + durationMs);
        }
        break;
      case "motion_lip_sync":
        if (Array.isArray(args.keyframes) && args.keyframes.length) {
          core.applyVisemeTrack?.(tl, args.keyframes, args.layerId || paintDoc.activeLayerId);
        } else if (args.text) {
          const layerId = args.layerId || paintDoc.activeLayerId;
          const keyframes = core.buildVisemeTrackFromText?.(
            args.text,
            Number(args.startMs ?? tl.motion.playheadMs ?? 0),
            Number(args.msPerChar) || 85
          );
          core.applyVisemeTrack?.(tl, keyframes, layerId);
        } else {
          core.addVisemeKeyframe?.(tl, { layerId: args.layerId || paintDoc.activeLayerId, ...args });
        }
        break;
      case "motion_ik_solve":
        core.applyIkToRig?.(
          tl,
          args.rigId || tl.motion?.rigs?.[0]?.id,
          args.targetX ?? args.x ?? 48,
          args.targetY ?? args.y ?? -32,
          args.timeMs
        );
        break;
      case "motion_set_playhead":
        core.setPlayhead(tl, args.timeMs);
        engine?.setMotionPlayhead?.(args.timeMs);
        break;
      default:
        return { ok: false, error: "unknown_motion_step" };
    }
    markDirty?.();
    draw?.();
    return { ok: true };
  }

  function downloadBase64File(dataBase64, filename, mime) {
    if (!dataBase64) return false;
    const a = document.createElement("a");
    a.href = `data:${mime};base64,${dataBase64}`;
    a.download = filename;
    a.click();
    return true;
  }

  async function collectTimelineFrameBase64(engine, canvasToBase64) {
    const canvases = engine?.collectTimelineExportCanvases?.() || [];
    const frames = [];
    for (const canvas of canvases) {
      const b64 = await canvasToBase64(canvas);
      if (b64) frames.push(b64);
    }
    return frames;
  }

  async function applyParticleClientStep(step, ctx) {
    const { core, paintDoc, markDirty, draw, playParticleEmitter } = ctx;
    if (!step?.command || step.command !== "particle_spawn") return { ok: false, error: "unknown_particle_step" };
    const args = step.args || {};
    if (args.emitter) {
      const list = core.ensureFxParticles?.(paintDoc) || paintDoc.fxParticles;
      if (list && !list.some((e) => e.id === args.emitter.id)) list.push(args.emitter);
    } else {
      core.createParticleEmitter?.(paintDoc, args);
    }
    if (typeof playParticleEmitter === "function") {
      const list = core.listFxParticles?.(paintDoc) || [];
      const emitter = list[list.length - 1];
      if (emitter) playParticleEmitter(emitter);
    }
    markDirty?.();
    draw?.();
    return { ok: true };
  }

  async function applyExportClientStep(step, ctx) {
    const { engine, paintDoc, canvasToBase64, exportAnimationDownload } = ctx;
    if (!step || step.command !== "export_collect_frames") return { ok: false, error: "unknown_export_step" };
    const args = step.args || {};
    if (typeof exportAnimationDownload === "function") {
      await exportAnimationDownload(args.format || "gif", args.fps);
      return { ok: true };
    }
    const frames = await collectTimelineFrameBase64(engine, canvasToBase64);
    return { ok: true, frameCount: frames.length, documentId: paintDoc?.id };
  }

  async function applyPreviewClientStep(step, ctx) {
    if (!step || step.command !== "preview_sync") return { ok: false, error: "unknown_preview_step" };
    const args = step.args || {};
    if (args.pngBase64 && args.enabled !== false) {
      await importPngBase64ToLayer(ctx, args.pngBase64, args.name || "Avatar", {
        fit: true,
        replaceDocumentSize: !!(args.width && args.height),
        width: args.width,
        height: args.height
      });
    }
    await publishPreview({
      enabled: args.enabled !== false,
      mode: args.mode || "avatar",
      name: args.name,
      width: args.width,
      height: args.height,
      assetUrl: args.assetUrl,
      kojPath: args.kojPath,
      dataBase64: args.pngBase64
    });
    return { ok: true };
  }

  async function applyClientStep(step, ctx) {
    if (step?.command === "preview_sync") {
      return applyPreviewClientStep(step, ctx);
    }
    if (step?.command === "particle_spawn") {
      return applyParticleClientStep(step, ctx);
    }
    if (step?.command === "export_collect_frames") {
      return applyExportClientStep(step, ctx);
    }
    if (step?.command === "import_animation_frames") {
      return importAnimationFramesToTimeline(ctx, step.args || {});
    }
    if (step?.command?.startsWith("motion_")) {
      return applyMotionClientStep(step, ctx);
    }
    if (!step || step.command !== "import_image") return { ok: false, error: "unknown_client_step" };
    const args = step.args || {};
    const opts = {
      fit: args.fit !== false,
      replaceDocumentSize: !!args.replaceDocumentSize,
      width: args.width,
      height: args.height
    };
    return importPngBase64ToLayer(ctx, args.dataBase64, args.name, opts);
  }

  async function applyClientSteps(steps, ctx) {
    const results = [];
    for (const step of steps || []) {
      results.push(await applyClientStep(step, ctx));
    }
    return results;
  }

  global.MIA_GRAPHICS_CLIENT = {
    generateImage,
    generateAnimation,
    promoteAnimation,
    fetchStagingClip,
    saveStagingFrames,
    trueAlpha,
    editRegion,
    removeBackground,
    upscale,
    restore,
    recolor,
    motionLayerKeyframe,
    motionCameraKeyframe,
    motionBonesRig,
    motionSample,
    motionAiGenerate,
    motionLipSync,
    motionIkSolve,
    createParticles,
    exportGif,
    exportWebm,
    exportMp4,
    createAvatar,
    publishPreview,
    runPipeline,
    downloadBase64File,
    collectTimelineFrameBase64,
    applyParticleClientStep,
    applyExportClientStep,
    applyPreviewClientStep,
    buildRectMaskBase64,
    buildSelectionMaskBase64,
    importPngBase64ToLayer,
    importAnimationFramesToTimeline,
    applyMotionClientStep,
    applyClientStep,
    applyClientSteps
  };
})(typeof globalThis !== "undefined" ? globalThis : window);
