(function () {
  "use strict";

  const core = globalThis.MIA_PAINT_CORE;
  const gpuLib = globalThis.MIA_PAINT_GPU;
  const ioLib = globalThis.MIA_PAINT_IO_BROWSER;
  const pluginHostLib = globalThis.MIA_PAINT_PLUGIN_HOST;
  const gfxClient = globalThis.MIA_GRAPHICS_CLIENT;
  const graphicsClient = globalThis.MIA_GRAPHICS_CLIENT;
  if (!core || !gpuLib || !ioLib) {
    console.error("MIA Paint modules missing — npm run build:mia-paint");
    return;
  }

  const API_BASE = window.location.origin && window.location.protocol.startsWith("http")
    ? window.location.origin
    : "http://127.0.0.1:3000";

  const gpuCanvas = document.getElementById("gpuCanvas");
  const overlayCanvas = document.getElementById("overlayCanvas");
  const host = document.getElementById("canvasHost");
  const layerList = document.getElementById("layerList");
  const docNameInput = document.getElementById("docName");
  const docSizeEl = document.getElementById("docSize");
  const zoomLabel = document.getElementById("zoomLabel");
  const gpuBackendEl = document.getElementById("gpuBackend");
  const statusCoords = document.getElementById("statusCoords");
  const statusTool = document.getElementById("statusTool");
  const statusTiles = document.getElementById("statusTiles");
  const statusHistory = document.getElementById("statusHistory");
  const statusFrame = document.getElementById("statusFrame");
  const frameList = document.getElementById("frameList");
  const onionSkinInput = document.getElementById("onionSkin");
  const onionDepthInput = document.getElementById("onionDepth");
  const onionDepthVal = document.getElementById("onionDepthVal");
  const brushSizeInput = document.getElementById("brushSize");
  const brushSizeLabel = document.getElementById("brushSizeLabel");
  const brushColorInput = document.getElementById("brushColor");
  const pressureCurveSelect = document.getElementById("pressureCurve");
  const wandToleranceInput = document.getElementById("wandTolerance");
  const wandToleranceLabel = document.getElementById("wandToleranceLabel");

  let paintDoc = core.createDocument({ name: "Nový projekt" });
  let viewport = core.createViewport();
  let engine = null;
  let activeTool = "move";
  let theme = localStorage.getItem("mia-paint-theme") || "dark";
  let spaceDown = false;
  let panning = false;
  let painting = false;
  let selecting = false;
  let vectoring = false;
  let movingFloat = false;
  let floatStart = null;
  let panStart = null;
  let lastPaint = null;
  let dirty = false;
  let syncTimer = null;
  let paintWsClient = null;
  let paintWsRetryTimer = null;
  let marqueeAnim = null;
  let playTimer = null;
  let playRaf = null;
  let playStartedAt = 0;
  let playStartMs = 0;
  let timelineEditor = null;
  let currentStagingId = null;
  let pluginHost = null;
  let shellMode = false;
  let nativeDialogs = false;
  let nativeRuntime = "browser";
  let nativeCaps = null;
  let obsPreviewEnabled = false;
  let obsPreviewTimer = null;
  let ikDragging = false;

  function applyTheme() {
    document.body.setAttribute("data-theme", theme);
    localStorage.setItem("mia-paint-theme", theme);
  }

  function isPaintTool(tool) {
    return tool === "brush" || tool === "eraser";
  }

  function isSelectTool(tool) {
    return tool === "select-rect" || tool === "select-lasso" || tool === "select-wand";
  }

  function usesBrushProps(tool) {
    return tool === "brush" || tool === "eraser" || tool === "fill" || tool === "vector-rect";
  }

  function updateHostCursor() {
    host.classList.toggle("tool-move", activeTool === "move" && !spaceDown && !panning);
    host.classList.toggle("tool-eraser", activeTool === "eraser" && !spaceDown && !panning);
  }

  function bindDocument() {
    if (engine) engine.bindDocument(paintDoc);
    syncMotionUi();
  }

  function applyOnionSettingsFromUi() {
    if (!paintDoc?.timeline) return;
    const on = !!onionSkinInput?.checked;
    const depth = Math.max(1, Math.min(3, Number(onionDepthInput?.value) || 1));
    if (onionDepthVal) onionDepthVal.textContent = String(depth);
    paintDoc.timeline.onionBefore = on ? depth : 0;
    paintDoc.timeline.onionAfter = on ? depth : 0;
    engine?.invalidateOnionCache?.();
  }

  function syncMotionUi() {
    if (onionSkinInput && paintDoc?.timeline) {
      const depth = Math.max(
        Number(paintDoc.timeline.onionBefore) || 0,
        Number(paintDoc.timeline.onionAfter) || 0
      );
      const on = depth > 0;
      onionSkinInput.checked = on;
      if (onionDepthInput && on) {
        onionDepthInput.value = String(Math.max(1, Math.min(3, depth)));
        if (onionDepthVal) onionDepthVal.textContent = onionDepthInput.value;
      }
    }
    const slider = document.getElementById("motionPlayhead");
    if (!slider || !paintDoc?.timeline) return;
    core.ensureMotion?.(paintDoc.timeline);
    const motion = paintDoc.timeline.motion;
    const duration = core.unifiedDurationMs?.(paintDoc.timeline) || motion.durationMs || 2000;
    motion.durationMs = Math.max(motion.durationMs || 0, duration);
    slider.max = String(Math.max(1000, duration));
    slider.value = String(motion.playheadMs || 0);
    timelineEditor?.refresh?.();
  }

  function scrubToMotionMs(ms) {
    if (!paintDoc?.timeline) return;
    core.setUnifiedPlayhead?.(paintDoc.timeline, ms) || core.setPlayhead?.(paintDoc.timeline, ms);
    const idx = paintDoc.timeline.activeFrameIndex || 0;
    engine?.setMotionPlayhead?.(ms);
    engine?.applyTimelineFrame?.(idx);
    syncMotionUi();
    renderFrameList();
    markDirty();
    draw();
  }

  function motionTimeMs() {
    return Number(paintDoc.timeline?.motion?.playheadMs) || 0;
  }

  async function applyMotionResult(data) {
    if (data?.clientStep && gfxClient) {
      await gfxClient.applyMotionClientStep(data.clientStep, graphicsEditorCtx());
      return;
    }
    markDirty();
    draw();
  }

  async function motionAddLayerKeyframe() {
    const layer = core.getActiveLayer(paintDoc);
    if (!layer) return;
    core.ensureMotion?.(paintDoc.timeline);
    const timeMs = motionTimeMs();
    const track = paintDoc.timeline.motion.layerTracks?.[layer.id];
    const body = {
      layerId: layer.id,
      timeMs,
      x: track?.keyframes?.length ? 64 : 0,
      y: 0,
      opacity: 1
    };
    try {
      if (gfxClient) {
        const data = await gfxClient.motionLayerKeyframe(body);
        if (data?.ok === false) {
          showNotice(data.error || "motion chyba");
          return;
        }
        await applyMotionResult(data);
      } else {
        core.addLayerKeyframe(paintDoc.timeline, layer.id, body);
      }
      engine?.setMotionPlayhead?.(timeMs);
      syncMotionUi();
      showNotice(`KF vrstva @ ${timeMs}ms`);
    } catch (_err) {
      core.addLayerKeyframe(paintDoc.timeline, layer.id, body);
      engine?.setMotionPlayhead?.(timeMs);
      syncMotionUi();
      markDirty();
      draw();
    }
  }

  async function motionAddCameraKeyframe() {
    core.ensureMotion?.(paintDoc.timeline);
    const timeMs = motionTimeMs();
    const camTrack = paintDoc.timeline.motion.cameraTrack;
    const body = {
      timeMs,
      panX: 0,
      panY: 0,
      zoom: camTrack?.keyframes?.length ? 1.15 : 1
    };
    try {
      if (gfxClient) {
        const data = await gfxClient.motionCameraKeyframe(body);
        if (data?.ok === false) {
          showNotice(data.error || "motion chyba");
          return;
        }
        await applyMotionResult(data);
      } else {
        core.addCameraKeyframe(paintDoc.timeline, body);
      }
      engine?.setMotionPlayhead?.(timeMs);
      syncMotionUi();
      showNotice(`KF kamera @ ${timeMs}ms`);
    } catch (_err) {
      core.addCameraKeyframe(paintDoc.timeline, body);
      engine?.setMotionPlayhead?.(timeMs);
      syncMotionUi();
      markDirty();
      draw();
    }
  }

  async function motionCreateBonesRig() {
    const layer = core.getActiveLayer(paintDoc);
    if (!layer) return;
    core.ensureMotion?.(paintDoc.timeline);
    const body = { layerId: layer.id };
    try {
      if (gfxClient) {
        const data = await gfxClient.motionBonesRig(body);
        if (data?.ok === false) {
          showNotice(data.error || "motion chyba");
          return;
        }
        await applyMotionResult(data);
      } else {
        core.createBonesRig(paintDoc.timeline, body);
      }
      syncMotionUi();
      showNotice("Bones rig vytvořen");
    } catch (_err) {
      core.createBonesRig(paintDoc.timeline, body);
      syncMotionUi();
      markDirty();
      draw();
    }
  }

  async function motionAiGenerate() {
    const layer = core.getActiveLayer(paintDoc);
    if (!layer) return;
    const style = document.getElementById("motionAiStyle")?.value || "hair_eyes";
    const body = { layerId: layer.id, style, intensity: 0.65, durationMs: 1200 };
    try {
      if (gfxClient) {
        const data = await gfxClient.motionAiGenerate(body);
        if (data?.ok === false) {
          showNotice(data.error || "AI motion chyba");
          return;
        }
        await applyMotionResult(data);
      } else {
        // Offline: server-shaped procedural via local keyframe recipes
        const intensity = body.intensity ?? 0.65;
        const durationMs = body.durationMs || 1200;
        const startMs = motionTimeMs();
        const recipes = {
          pulse: [
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
          core.addLayerKeyframe(paintDoc.timeline, layer.id, {
            timeMs: Math.round(startMs + kf.t * durationMs),
            y: kf.y,
            scaleX: kf.sx,
            scaleY: kf.sy,
            rotation: kf.rot,
            easing: "ease"
          });
        }
        paintDoc.timeline.motion.durationMs = Math.max(
          paintDoc.timeline.motion.durationMs,
          startMs + durationMs
        );
      }
      engine?.setMotionPlayhead?.(motionTimeMs());
      syncMotionUi();
      markDirty();
      draw();
      showNotice(`AI motion: ${style}`);
    } catch (_err) {
      showNotice("AI motion selhalo — lokální fallback");
    }
  }

  async function motionLipSync() {
    const layer = core.getActiveLayer(paintDoc);
    if (!layer) return;
    const text = window.prompt("Text pro viseme track:", "Ahoj MIA") || "Ahoj";
    const body = { layerId: layer.id, text, startMs: motionTimeMs() };
    try {
      if (gfxClient) {
        const data = await gfxClient.motionLipSync(body);
        if (data?.ok === false) {
          showNotice(data.error || "lip sync chyba");
          return;
        }
        await applyMotionResult(data);
      } else {
        const keyframes = core.buildVisemeTrackFromText?.(text, body.startMs, 85);
        core.applyVisemeTrack?.(paintDoc.timeline, keyframes, layer.id);
      }
      syncMotionUi();
      markDirty();
      draw();
      showNotice(`Viseme: ${text.slice(0, 24)}`);
    } catch (_err) {
      showNotice("Lip sync selhalo");
    }
  }

  async function motionLipSyncFromAudioFile(file) {
    const layer = core.getActiveLayer(paintDoc);
    if (!layer || !file) return;
    const startMs = motionTimeMs();
    showNotice("Lip audio…");
    try {
      const ab = await file.arrayBuffer();
      const bytes = new Uint8Array(ab);
      let binary = "";
      for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
      const audioBase64 = btoa(binary);

      if (gfxClient) {
        const data = await gfxClient.motionLipSync({
          layerId: layer.id,
          audioBase64,
          audioExt: (file.name.split(".").pop() || "wav").toLowerCase(),
          startMs,
          stepMs: 50
        });
        if (data?.ok === false) {
          showNotice(data.error || data.hint || "lip audio chyba");
          return;
        }
        await applyMotionResult(data);
        const via = data.provider === "whisper_viseme_v1" ? "Whisper" : "amp";
        const hint = data.transcript ? ` „${String(data.transcript).slice(0, 28)}“` : "";
        showNotice(`Lip♪ ${data.visemeCount || "?"} KF (${via})${hint}`);
      } else {
        // Offline: Web Audio decode → samples
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) {
          showNotice("AudioContext nedostupný");
          return;
        }
        const actx = new Ctx();
        const decoded = await actx.decodeAudioData(ab.slice(0));
        const samples = decoded.getChannelData(0);
        const built = core.buildVisemeTrackFromSamples?.(samples, decoded.sampleRate, {
          startMs,
          stepMs: 50
        });
        if (!built?.ok) {
          showNotice(built?.error || "lip audio fail");
          return;
        }
        core.applyVisemeTrack?.(paintDoc.timeline, built.keyframes, layer.id);
        showNotice(`Lip♪ ${built.keyframes.length} KF (offline)`);
      }
      syncMotionUi();
      markDirty();
      draw();
    } catch (_err) {
      showNotice("Lip audio selhalo");
    }
  }

  async function motionIkSolve() {
    core.ensureMotion?.(paintDoc.timeline);
    const rig = paintDoc.timeline.motion?.rigs?.[0];
    if (!rig) {
      showNotice("Nejdřív vytvoř Bones rig");
      return;
    }
    const body = {
      rigId: rig.id,
      targetX: rig.ikTarget?.x ?? 64,
      targetY: rig.ikTarget?.y ?? -48,
      timeMs: motionTimeMs()
    };
    try {
      if (gfxClient) {
        const data = await gfxClient.motionIkSolve(body);
        if (data?.ok === false) {
          showNotice(data.error || "IK chyba");
          return;
        }
        await applyMotionResult(data);
      } else {
        core.applyIkToRig?.(paintDoc.timeline, body.rigId, body.targetX, body.targetY, body.timeMs);
      }
      syncMotionUi();
      markDirty();
      draw();
      showNotice("IK solved");
    } catch (_err) {
      core.applyIkToRig?.(paintDoc.timeline, body.rigId, body.targetX, body.targetY, body.timeMs);
      syncMotionUi();
      markDirty();
      draw();
    }
  }

  function worldToRigLocal(w) {
    return {
      x: w.x - paintDoc.width / 2,
      y: w.y - paintDoc.height / 2
    };
  }

  async function applyIkAtWorld(w, opts = {}) {
    core.ensureMotion?.(paintDoc.timeline);
    const rig = paintDoc.timeline.motion?.rigs?.[0];
    if (!rig) {
      if (!opts.silent) showNotice("Nejdřív vytvoř Bones rig");
      return false;
    }
    const local = worldToRigLocal(w);
    const body = {
      rigId: rig.id,
      targetX: local.x,
      targetY: local.y,
      timeMs: motionTimeMs()
    };
    try {
      if (gfxClient && !opts.localOnly) {
        const data = await gfxClient.motionIkSolve(body);
        if (data?.ok === false) return false;
        await applyMotionResult(data);
      } else {
        core.applyIkToRig?.(paintDoc.timeline, body.rigId, body.targetX, body.targetY, body.timeMs);
        markDirty();
        draw();
      }
      syncMotionUi();
      return true;
    } catch (_err) {
      core.applyIkToRig?.(paintDoc.timeline, body.rigId, body.targetX, body.targetY, body.timeMs);
      syncMotionUi();
      markDirty();
      draw();
      return true;
    }
  }

  function paintWorldToScreen(wx, wy) {
    const z = viewport.state.zoom || 1;
    return {
      x: wx * z + (viewport.state.panX || 0),
      y: wy * z + (viewport.state.panY || 0)
    };
  }

  function playParticleEmitter(emitter) {
    const fx = globalThis.MIA_2D_FX;
    const hostEl = document.getElementById("fxOverlayHost");
    if (!fx?.spawnBurst || !hostEl || !emitter) return;
    const p = paintWorldToScreen(emitter.x, emitter.y);
    fx.spawnBurst(hostEl, {
      x: p.x,
      y: p.y,
      preset: emitter.burst,
      kind: emitter.burstConfig?.frame || "star",
      accent: emitter.accent || "#4cc9ff"
    });
  }

  async function addParticles() {
    const preset = document.getElementById("fxPreset")?.value || "sparkle_blue";
    const body = {
      preset,
      x: Math.round(paintDoc.width / 2),
      y: Math.round(paintDoc.height / 2)
    };
    try {
      if (gfxClient) {
        const data = await gfxClient.createParticles(body);
        if (data?.ok === false) {
          showNotice(data.error || "fx chyba");
          return;
        }
        if (data?.clientStep) {
          await gfxClient.applyParticleClientStep(data.clientStep, {
            ...graphicsEditorCtx(),
            playParticleEmitter
          });
        }
      } else {
        const result = core.createParticleEmitter(paintDoc, body);
        if (result.emitter) playParticleEmitter(result.emitter);
        markDirty();
        draw();
      }
      showNotice(`Částice: ${preset}`);
    } catch (_err) {
      const result = core.createParticleEmitter(paintDoc, body);
      if (result.emitter) playParticleEmitter(result.emitter);
      markDirty();
      draw();
    }
  }

  async function collectExportFrames(opts = {}) {
    const canvases =
      engine?.collectMotionExportCanvases?.(opts) || engine?.collectTimelineExportCanvases?.() || [];
    const frames = [];
    for (const canvas of canvases) {
      const b64 = await canvasToBase64(canvas);
      if (b64) frames.push(b64);
    }
    if (!frames.length) {
      const single = await canvasToBase64(engine.compositeDocumentToCanvas());
      if (single) frames.push(single);
    }
    draw();
    return frames;
  }

  async function collectMultiCameraExportFrames() {
    const presets = core.listCameraPresets?.() || [];
    const framesByCamera = {};
    for (const preset of presets) {
      framesByCamera[preset.id] = await collectExportFrames({ cameraPresetId: preset.id });
    }
    return framesByCamera;
  }

  async function exportToAnimationBank() {
    const clipId = prompt("Clip ID (např. gift/rose nebo idle/idle_003):", "custom/clip_001");
    if (!clipId) return;
    const label = prompt("Label:", clipId.split("/").pop() || "clip");
    const multiCamera = window.confirm(
      "Exportovat všechny záběry C1–C6?\n\nOK = 6 clipů (multi-angle)\nStorno = jen aktivní záběr z selectu"
    );
    try {
      const body = {
        clipId,
        label,
        fps: paintDoc.timeline?.fps || 12,
        emotion: "idle",
        multiCamera
      };
      if (multiCamera) {
        body.framesByCamera = await collectMultiCameraExportFrames();
      } else {
        const activeCam = document.getElementById("cameraPresetSelect")?.value || "C1";
        core.setActiveCameraPreset?.(paintDoc.timeline, activeCam);
        body.cameraId = activeCam;
        body.frames = await collectExportFrames({ cameraPresetId: activeCam });
      }
      const res = await fetch(`${API_BASE}/mia/animation/export-paint`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!data?.ok) {
        showNotice(data.error || "export bank selhal");
        return;
      }
      if (data.multiCamera) {
        showNotice(`Bank: ${data.count} clipů (${data.clipIds?.join(", ") || "multi"})`);
      } else {
        showNotice(`Bank: ${data.clipId} [${data.cameraId || "—"}] (${data.frameCount} snímků)`);
      }
    } catch (err) {
      showNotice(err.message || "export bank chyba");
    }
  }

  async function saveToStaging() {
    const suggested =
      currentStagingId ||
      new URLSearchParams(window.location.search).get("aiStaging") ||
      `paint-${Date.now().toString(36)}`;
    const stagingId = prompt("Staging ID (AI draft — ne live bank):", suggested);
    if (!stagingId) return;
    setAiStatus("ukládám staging…");
    try {
      const frames = await collectExportFrames();
      if (!frames.length) {
        showNotice("žádné snímky");
        setAiStatus("staging: empty");
        return;
      }
      const payload = {
        framesBase64: frames,
        fps: paintDoc.timeline?.fps || 12,
        prompt: document.getElementById("aiPrompt")?.value?.trim() || undefined,
        motion: document.getElementById("aiAnimMotion")?.value || undefined,
        encodeGif: false
      };
      const data = gfxClient
        ? await gfxClient.saveStagingFrames(stagingId, payload)
        : await (
            await fetch(`${API_BASE}/mia/animation/staging/${encodeURIComponent(stagingId)}/save`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ...payload, stagingId })
            })
          ).json();
      if (!data?.ok) {
        showNotice(data?.error || "staging save selhal");
        setAiStatus(data?.error || "staging fail");
        return;
      }
      currentStagingId = data.stagingId || stagingId;
      const alpha =
        data.avgAlphaRatio != null ? ` · α${Math.round(data.avgAlphaRatio * 100)}%` : "";
      setAiStatus(`staging ${currentStagingId} · ${data.frameCount}fr${alpha}`);
      showNotice(`Staging uložen: ${currentStagingId} — Promote na dashboardu`);
    } catch (err) {
      showNotice(err.message || "staging save chyba");
      setAiStatus("staging offline");
    }
  }

  function downloadExportResult(data, fallbackMime) {
    if (!data?.dataBase64) return false;
    const formatNorm = String(data.format || "gif").toLowerCase();
    const mime = data.mime || fallbackMime;
    const name = `${(paintDoc.name || "mia-export").replace(/[^\w\-]+/g, "_")}.${formatNorm}`;
    if (gfxClient?.downloadBase64File) {
      return gfxClient.downloadBase64File(data.dataBase64, name, mime);
    }
    const a = document.createElement("a");
    a.href = `data:${mime};base64,${data.dataBase64}`;
    a.download = name;
    a.click();
    return true;
  }

  async function exportAnimationDownload(format, fpsOverride) {
    const formatNorm = String(format || "gif").toLowerCase();
    const fps = fpsOverride || (formatNorm === "gif" ? paintDoc.timeline?.fps || 12 : 30);
    setAiStatus(`export ${formatNorm}…`);
    const frames = await collectExportFrames();
    if (!frames.length) {
      setAiStatus("žádné snímky");
      return;
    }
    try {
      let data;
      if (gfxClient) {
        if (formatNorm === "gif") data = await gfxClient.exportGif({ frames, fps });
        else if (formatNorm === "mp4") data = await gfxClient.exportMp4({ frames, fps, format: "mp4" });
        else data = await gfxClient.exportWebm({ frames, fps, format: "webm" });
      } else {
        const path =
          formatNorm === "gif"
            ? "/mia/graphics/export/gif"
            : formatNorm === "mp4"
              ? "/mia/graphics/export/mp4"
              : "/mia/graphics/export/webm";
        const resp = await fetch(`${API_BASE}${path}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ frames, fps, format: formatNorm })
        });
        data = await resp.json();
      }
      if (data?.clientStep && gfxClient) {
        await gfxClient.applyExportClientStep(data.clientStep, {
          ...graphicsEditorCtx(),
          canvasToBase64,
          exportAnimationDownload
        });
        return;
      }
      if (!data?.ok) {
        setAiStatus(data?.error || data?.hint || "export chyba");
        return;
      }
      const mime =
        data.mime ||
        (formatNorm === "gif" ? "image/gif" : formatNorm === "mp4" ? "video/mp4" : "video/webm");
      downloadExportResult(data, mime);
      setAiStatus(`${formatNorm.toUpperCase()} · ${data.byteLength || "?"} B · ${data.provider || ""}`);
    } catch (_err) {
      setAiStatus("export offline");
    }
  }

  async function exportGifAnimation() {
    await exportAnimationDownload("gif");
  }

  async function exportWebmAnimation() {
    await exportAnimationDownload("webm");
  }

  async function exportMp4Animation() {
    await exportAnimationDownload("mp4");
  }

  function updateStatusBar() {
    if (!engine) return;
    const stats = engine.tileStats();
    statusTiles.textContent = `tiles: ${stats.painted} · ${engine.backend}`;
    statusHistory.textContent = engine.canUndo()
      ? `undo: ${engine.getStatus().undoDepth}`
      : "undo: —";
    const tl = paintDoc.timeline;
    if (tl?.frames?.length) {
      const ms = Math.round(tl.motion?.playheadMs || 0);
      const onionOn = (Number(tl.onionBefore) || 0) > 0 || (Number(tl.onionAfter) || 0) > 0;
      const onionBit = onionOn
        ? ` · onion −${tl.onionBefore || 0}/+${tl.onionAfter || 0}`
        : "";
      statusFrame.textContent = `frame: ${(tl.activeFrameIndex || 0) + 1}/${tl.frames.length} · ${ms}ms${onionBit}`;
    } else {
      statusFrame.textContent = "frame: —";
    }
  }

  function renderFrameList() {
    if (!paintDoc.timeline) return;
    frameList.innerHTML = "";
    const onions = core.onionFrameIndices?.(paintDoc.timeline) || { before: [], after: [] };
    const before = new Set(onions.before || []);
    const after = new Set(onions.after || []);
    paintDoc.timeline.frames.forEach((frame, index) => {
      const li = document.createElement("li");
      li.textContent = frame.label || String(index + 1);
      let cls = index === paintDoc.timeline.activeFrameIndex ? "active" : "";
      if (before.has(index)) cls += " onion-before";
      if (after.has(index)) cls += " onion-after";
      li.className = cls.trim();
      li.addEventListener("click", () => selectFrame(index));
      frameList.appendChild(li);
    });
  }

  function selectFrame(index) {
    if (!engine?.applyTimelineFrame(index)) return;
    core.syncPlayheadFromFrame?.(paintDoc.timeline, "start");
    engine?.setMotionPlayhead?.(paintDoc.timeline.motion.playheadMs);
    renderFrameList();
    syncMotionUi();
    markDirty();
    draw();
  }

  function captureFrame() {
    if (!engine?.captureTimelineFrame()) return;
    markDirty();
    renderFrameList();
    draw();
  }

  function addFrame() {
    if (!engine?.addTimelineFrame()) return;
    markDirty();
    renderFrameList();
    draw();
  }

  function stopPlayback() {
    if (playTimer) {
      clearInterval(playTimer);
      playTimer = null;
    }
    if (playRaf) {
      cancelAnimationFrame(playRaf);
      playRaf = null;
    }
    document.getElementById("btnTimelinePlay").textContent = "▶";
  }

  function togglePlayback() {
    const tl = paintDoc.timeline;
    if (!tl?.frames?.length) return;
    if (playRaf || playTimer) {
      stopPlayback();
      return;
    }
    document.getElementById("btnTimelinePlay").textContent = "⏸";
    const duration = core.unifiedDurationMs?.(tl) || tl.motion?.durationMs || 2000;
    playStartMs = tl.motion?.playheadMs || 0;
    playStartedAt = performance.now();

    const tick = (now) => {
      if (!playRaf && !playTimer) return;
      const elapsed = now - playStartedAt;
      let ms = playStartMs + elapsed;
      if (ms >= duration) {
        if (tl.motion?.loop !== false) {
          ms = 0;
          playStartMs = 0;
          playStartedAt = now;
        } else {
          ms = duration;
          scrubToMotionMs(ms);
          stopPlayback();
          return;
        }
      }
      scrubToMotionMs(ms);
      playRaf = requestAnimationFrame(tick);
    };
    playRaf = requestAnimationFrame(tick);
  }

  function exportSheetManifest() {
    const json = engine?.exportSpriteSheetManifest();
    if (!json) return;
    const blob = new Blob([json], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(paintDoc.name || "mia-paint").replace(/[^\w\-]+/g, "_")}-sheet.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function draw() {
    if (!engine) return;
    engine.render(viewport.state, theme);
    if (pluginHost) {
      pluginHost.emitAfterRender({
        overlayCtx: engine.overlayCtx,
        viewportState: viewport.state,
        theme,
        document: paintDoc
      });
    }
    zoomLabel.textContent = `${Math.round(viewport.state.zoom * 100)}%`;
    docSizeEl.textContent = `${paintDoc.width} × ${paintDoc.height}`;
    updateStatusBar();
  }

  function scheduleMarqueeAnim() {
    if (marqueeAnim) return;
    const loop = () => {
      if (!engine?.selection && !engine?.draftSelection && !engine?.floating && !engine?.lassoPoints && !engine?.vectorDraft) {
        marqueeAnim = null;
        return;
      }
      draw();
      marqueeAnim = requestAnimationFrame(loop);
    };
    marqueeAnim = requestAnimationFrame(loop);
  }

  function resizeCanvas() {
    const rect = host.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (engine) engine.resize(rect.width, rect.height, dpr);
    viewport.resize(rect.width, rect.height);
    draw();
  }

  function renderLayerList() {
    layerList.innerHTML = "";
    const layers = [...paintDoc.layers].reverse();
    for (const layer of layers) {
      const li = document.createElement("li");
      li.className = "layer-item" + (layer.id === paintDoc.activeLayerId ? " active" : "");
      li.innerHTML = `<span class="eye">${layer.visible ? "👁" : "—"}</span><span>${layer.kind === "vector" ? "▢ " : ""}${layer.name}</span>`;
      li.addEventListener("click", () => {
        core.setActiveLayer(paintDoc, layer.id);
        markDirty();
        renderLayerList();
        draw();
      });
      layerList.appendChild(li);
    }
  }

  function markDirty() {
    dirty = true;
    scheduleSync();
    scheduleObsPreview();
  }

  function scheduleObsPreview() {
    if (!obsPreviewEnabled) return;
    if (obsPreviewTimer) clearTimeout(obsPreviewTimer);
    obsPreviewTimer = setTimeout(() => {
      publishObsPreview().catch(() => {});
    }, 800);
  }

  async function publishObsPreview() {
    if (!obsPreviewEnabled || !engine) return;
    const dataBase64 = await canvasToBase64(engine.compositeDocumentToCanvas());
    if (!dataBase64) return;
    const payload = {
      enabled: true,
      mode: "document",
      name: paintDoc.name,
      width: paintDoc.width,
      height: paintDoc.height,
      dataBase64
    };
    if (gfxClient?.publishPreview) {
      await gfxClient.publishPreview(payload);
      return;
    }
    await fetch(`${API_BASE}/mia/graphics/preview/publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
  }

  async function toggleObsPreview() {
    obsPreviewEnabled = !obsPreviewEnabled;
    const btn = document.getElementById("btnObsPreview");
    if (btn) btn.classList.toggle("active", obsPreviewEnabled);
    showNotice(obsPreviewEnabled ? "OBS náhled zapnut" : "OBS náhled vypnut");
    if (obsPreviewEnabled) {
      await publishObsPreview();
    } else {
      const payload = { enabled: false };
      if (gfxClient?.publishPreview) await gfxClient.publishPreview(payload);
      else {
        await fetch(`${API_BASE}/mia/graphics/preview/publish`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      }
    }
  }

  async function createAvatar() {
    const preset = document.getElementById("avatarPreset")?.value || "mia";
    const prompt = document.getElementById("aiPrompt")?.value?.trim();
    setAiStatus("avatar…");
    const body = { preset, name: paintDoc.name || preset };
    if (prompt) body.prompt = prompt;
    try {
      const data = gfxClient
        ? await gfxClient.createAvatar(body)
        : await (
            await fetch(`${API_BASE}/mia/graphics/avatar/create`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(body)
            })
          ).json();
      if (!data?.ok) {
        setAiStatus(data?.error || "chyba");
        return;
      }
      for (const step of data.clientSteps || []) {
        if (step.command === "preview_sync" && gfxClient?.applyPreviewClientStep) {
          await gfxClient.applyPreviewClientStep(step, graphicsEditorCtx());
        } else if (step.command === "import_image") {
          await gfxClient.applyClientStep(step, graphicsEditorCtx());
        } else if (step.command === "avatar_export_notice") {
          showNotice(`Koj export: ${step.args?.assetUrl || "hotovo"}`);
        }
      }
      obsPreviewEnabled = true;
      document.getElementById("btnObsPreview")?.classList.add("active");
      const detail = [data.assetUrl, data.previewUrl, data.obs?.inputName].filter(Boolean).join(" · ");
      setAiStatus(detail || "avatar hotovo");
      markDirty();
      draw();
    } catch (_err) {
      setAiStatus("offline");
    }
  }

  function scheduleSync() {
    if (syncTimer) clearTimeout(syncTimer);
    syncTimer = setTimeout(syncToServer, 1200);
  }

  function buildSyncPayload() {
    return {
      theme,
      activeTool,
      dirty,
      documentName: paintDoc.name,
      viewport: viewport.state,
      gpu: engine ? engine.getStatus() : null,
      selection: paintDoc.selection
        ? { kind: paintDoc.selection.kind, ...core.selectionBounds(paintDoc.selection) }
        : null
    };
  }

  function paintWsUrl() {
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host || "127.0.0.1:3000";
    return `${proto}//${host}/mia/paint/ws`;
  }

  function sendPaintWs(type, payload) {
    if (!paintWsClient || paintWsClient.readyState !== WebSocket.OPEN) return false;
    try {
      paintWsClient.send(JSON.stringify({ type, ...(payload != null ? { payload } : {}) }));
      return true;
    } catch (_err) {
      return false;
    }
  }

  function schedulePaintWsReconnect() {
    if (paintWsRetryTimer) return;
    paintWsRetryTimer = setTimeout(() => {
      paintWsRetryTimer = null;
      connectPaintWs();
    }, 3000);
  }

  function connectPaintWs() {
    if (typeof WebSocket === "undefined") return;
    try {
      if (paintWsClient) {
        paintWsClient.onclose = null;
        paintWsClient.close();
      }
      paintWsClient = new WebSocket(paintWsUrl());
      paintWsClient.addEventListener("open", () => {
        paintWsClient.send(JSON.stringify({ type: "connect", clientId: "browser" }));
        sendPaintWs("sync", buildSyncPayload());
      });
      paintWsClient.addEventListener("close", schedulePaintWsReconnect);
      paintWsClient.addEventListener("error", schedulePaintWsReconnect);
    } catch (_err) {
      schedulePaintWsReconnect();
    }
  }

  async function syncToServer() {
    if (!engine) return;
    const payload = buildSyncPayload();
    if (sendPaintWs("sync", payload)) {
      dirty = false;
      return;
    }
    try {
      await fetch(`${API_BASE}/mia/paint/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      dirty = false;
    } catch (_err) {
      /* offline */
    }
  }

  async function connectServer() {
    connectPaintWs();
    try {
      await fetch(`${API_BASE}/mia/paint/connect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: "browser" })
      });
      await syncToServer();
    } catch (_err) {
      /* ok */
    }
  }

  function setTool(tool) {
    if (painting) finishPaintStroke();
    if (movingFloat) cancelFloatMove();
    activeTool = tool;
    document.querySelectorAll(".tool").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.tool === tool);
    });
    const labels = {
      move: "Posun",
      brush: "Štětec",
      eraser: "Guma",
      fill: "Výplň",
      "vector-rect": "Vektor obdélník",
      "select-rect": "Výběr obdélník",
      "select-lasso": "Laso",
      "select-wand": "Kouzelná hůlka",
      transform: "Posun výběru",
      crop: "Ořez",
      "bone-ik": "Bones IK"
    };
    statusTool.textContent = `Nástroj: ${labels[tool] || tool}`;
    document.getElementById("brushProps").hidden = !usesBrushProps(tool);
    document.getElementById("selectProps").hidden = !isSelectTool(tool) && tool !== "transform";
    updateHostCursor();
    markDirty();
  }

  function fitDocument() {
    viewport.fitToBounds({ x: -40, y: -40, width: paintDoc.width + 80, height: paintDoc.height + 80 });
    draw();
    markDirty();
  }

  function screenToWorld(e) {
    const rect = host.getBoundingClientRect();
    return viewport.screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
  }

  function readPressure(e) {
    const bridge = globalThis.MIA_PAINT_SHELL_BRIDGE || globalThis.MIA_PAINT_NATIVE;
    if (bridge?.readPressure) return bridge.readPressure(e);
    if (e.pointerType === "pen" && e.pressure > 0) return e.pressure;
    if (e.pointerType === "mouse") return 1;
    return e.pressure > 0 ? e.pressure : 1;
  }

  function syncBrushFromUi() {
    if (!engine) return;
    engine.brush.size = Number(brushSizeInput.value) || 24;
    engine.brush.color = brushColorInput.value || "#1a1a2e";
    engine.brush.pressureCurve = pressureCurveSelect.value || "firm";
    brushSizeLabel.textContent = `${engine.brush.size} px`;
    engine.wandTolerance = Number(wandToleranceInput.value) || 32;
    wandToleranceLabel.textContent = String(engine.wandTolerance);
  }

  function activeLayer() {
    return core.getActiveLayer(paintDoc);
  }

  function startPaintStroke(e) {
    const layer = activeLayer();
    if (!layer || layer.locked) return;
    painting = true;
    lastPaint = null;
    engine.beginStroke(layer.id, activeTool);
    paintAt(e, false);
    host.setPointerCapture(e.pointerId);
  }

  function finishPaintStroke() {
    if (!painting) return;
    painting = false;
    lastPaint = null;
    engine.endStroke();
    markDirty();
    draw();
  }

  function paintAt(e, cont) {
    const layer = activeLayer();
    if (!layer || layer.locked) return;
    const w = screenToWorld(e);
    const pressure = readPressure(e);
    if (cont && lastPaint) {
      engine.paintStroke(layer.id, lastPaint.x, lastPaint.y, w.x, w.y, pressure, activeTool);
    } else {
      engine.paintDab(layer.id, w.x, w.y, pressure, activeTool);
    }
    lastPaint = w;
    draw();
  }

  function fillAt(e) {
    const layer = activeLayer();
    if (!layer || layer.locked || layer.kind === "vector") return;
    const w = screenToWorld(e);
    syncBrushFromUi();
    if (engine.fillAt(layer.id, w.x, w.y)) {
      markDirty();
      draw();
    }
  }

  function startVectorDrag(e) {
    const w = screenToWorld(e);
    vectoring = true;
    syncBrushFromUi();
    engine.beginVectorRectDraft(w.x, w.y);
    host.setPointerCapture(e.pointerId);
    scheduleMarqueeAnim();
  }

  function updateVectorDrag(e) {
    const w = screenToWorld(e);
    engine.updateVectorRectDraft(w.x, w.y);
    draw();
  }

  function finishVectorDrag() {
    if (!vectoring) return;
    vectoring = false;
    syncBrushFromUi();
    engine.commitVectorRectDraft();
    markDirty();
    renderLayerList();
    draw();
    scheduleMarqueeAnim();
  }

  function exportSvgDownload() {
    if (!engine) return;
    const svg = engine.exportSvgString();
    if (!svg) return;
    const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(paintDoc.name || "mia-paint").replace(/[^\w\-]+/g, "_")}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function scaleFloatingSelection(factor) {
    if (!engine?.floating) return;
    engine.scaleFloating(factor);
    draw();
    scheduleMarqueeAnim();
  }

  function startSelectDrag(e) {
    const w = screenToWorld(e);
    selecting = true;
    if (activeTool === "select-rect") engine.beginRectDraft(w.x, w.y);
    if (activeTool === "select-lasso") engine.beginLassoDraft(w.x, w.y);
    if (activeTool === "crop") engine.beginCropDraft(w.x, w.y);
    host.setPointerCapture(e.pointerId);
    scheduleMarqueeAnim();
  }

  function updateSelectDrag(e) {
    const w = screenToWorld(e);
    if (activeTool === "select-rect") engine.updateRectDraft(w.x, w.y);
    if (activeTool === "select-lasso") engine.updateLassoDraft(w.x, w.y);
    if (activeTool === "crop") engine.updateCropDraft(w.x, w.y);
    draw();
  }

  function finishSelectDrag() {
    if (!selecting) return;
    selecting = false;
    if (activeTool === "select-rect") engine.commitRectDraft();
    if (activeTool === "select-lasso") engine.commitLassoDraft();
    if (activeTool === "crop") engine.applyCropDraft();
    markDirty();
    draw();
    scheduleMarqueeAnim();
  }

  function wandAt(e) {
    const layer = activeLayer();
    if (!layer || layer.locked) return;
    const w = screenToWorld(e);
    syncBrushFromUi();
    engine.wandSelect(layer.id, w.x, w.y, engine.wandTolerance);
    markDirty();
    draw();
    scheduleMarqueeAnim();
  }

  function startFloatMove(e) {
    const layer = activeLayer();
    if (!layer || layer.locked || !engine.selection) return;
    const w = screenToWorld(e);
    if (!core.pointInSelection(w.x, w.y, engine.selection)) return;
    if (!engine.beginFloatingMove(layer.id)) return;
    movingFloat = true;
    floatStart = { x: w.x, y: w.y };
    host.setPointerCapture(e.pointerId);
    scheduleMarqueeAnim();
  }

  function updateFloatMove(e) {
    if (!movingFloat || !floatStart) return;
    const w = screenToWorld(e);
    engine.updateFloatingOffset(w.x - floatStart.x, w.y - floatStart.y);
    draw();
  }

  function finishFloatMove() {
    if (!movingFloat) return;
    movingFloat = false;
    floatStart = null;
    engine.commitFloatingMove();
    markDirty();
    draw();
  }

  function cancelFloatMove() {
    if (!movingFloat) return;
    movingFloat = false;
    floatStart = null;
    engine.cancelFloatingMove();
    draw();
  }

  function doUndo() {
    if (engine?.undo()) {
      markDirty();
      draw();
    }
  }

  function doRedo() {
    if (engine?.redo()) {
      markDirty();
      draw();
    }
  }

  function clearSelectionUi() {
    engine?.clearSelection();
    markDirty();
    draw();
  }

  function deleteSelection() {
    const layer = activeLayer();
    if (!layer || !engine?.selection) return;
    if (engine.deleteSelectionPixels(layer.id)) {
      markDirty();
      draw();
    }
  }

  function deleteSelection() {
    const layer = activeLayer();
    if (!layer || !engine?.selection) return;
    if (engine.deleteSelectionPixels(layer.id)) {
      markDirty();
      draw();
    }
  }

  function documentFromBundle(bundle) {
    const raw = bundle.document;
    return core.createDocument({
      id: raw.id,
      name: raw.name,
      width: raw.width,
      height: raw.height,
      dpi: raw.dpi,
      background: raw.background,
      activeLayerId: raw.activeLayerId,
      selection: raw.selection,
      meta: raw.meta,
      timeline: raw.timeline,
      layers: (raw.layers || []).map((l) =>
        l.kind === "vector" ? core.createVectorLayer(l) : core.createLayer(l)
      )
    });
  }

  async function buildSaveBundle() {
    const tiles = engine.collectTilePayload();
    return ioLib.packBundle(paintDoc, tiles);
  }

  async function saveProject(remote) {
    const bundle = await buildSaveBundle();
    if (remote) {
      try {
        await fetch(`${API_BASE}/mia/paint/command`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "save_project", bundle })
        });
      } catch (_err) {
        /* offline */
      }
    }
    if (nativeDialogs && window.parent !== window) {
      const blob = await ioLib.gzipBlobFromJson(bundle);
      const buf = await blob.arrayBuffer();
      const bytes = new Uint8Array(buf);
      const bridge = globalThis.MIA_PAINT_SHELL_BRIDGE;
      const bytesBase64 = bridge?.bytesToBase64
        ? bridge.bytesToBase64(bytes)
        : (() => {
            let bin = "";
            for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
            return btoa(bin);
          })();
      const defaultName = `${(paintDoc.name || "projekt").replace(/[^\w\-]+/g, "_")}.miapaint`;
      window.parent.postMessage(
        {
          source: "mia-paint-editor",
          type: "native-save",
          payload: { defaultName, bytesBase64 }
        },
        "*"
      );
      dirty = false;
      return;
    }
    const blob = await ioLib.gzipBlobFromJson(bundle);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(paintDoc.name || "projekt").replace(/[^\w\-]+/g, "_")}.miapaint`;
    a.click();
    URL.revokeObjectURL(url);
    dirty = false;
  }

  async function openProjectNative() {
    if (!nativeDialogs || window.parent === window) return false;
    window.parent.postMessage({ source: "mia-paint-editor", type: "native-open", payload: {} }, "*");
    return true;
  }

  async function loadProjectFile(file) {
    const bundle = await ioLib.parseMiapaintFile(file);
    paintDoc = documentFromBundle(bundle);
    docNameInput.value = paintDoc.name;
    bindDocument();
    await engine.applyTilePayload(bundle.tiles || {});
    renderLayerList();
    renderFrameList();
    markDirty();
    draw();
    fitDocument();
  }

  async function exportRaster(mime, ext, quality) {
    const blob = await engine.exportDocumentImageBlob(mime, quality);
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(paintDoc.name || "export").replace(/[^\w\-]+/g, "_")}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function importImageFile(file) {
    const layer = activeLayer();
    if (!layer || layer.locked || layer.kind !== "raster") {
      core.addLayer(paintDoc, { name: "Import" });
      bindDocument();
      renderLayerList();
    }
    const target = activeLayer();
    const ext = (file.name.split(".").pop() || "").toLowerCase();
    if (ext === "psd") {
      const b64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const resp = await fetch(`${API_BASE}/mia/paint/command`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "import_image", dataBase64: b64, ext: "psd", layerName: "PSD" })
      });
      const data = await resp.json();
      if (!data.ok || !data.pngBase64) return;
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = `data:image/png;base64,${data.pngBase64}`;
      });
      await engine.importImageToLayer(target.id, img, { fit: true });
    } else {
      const bmp = await createImageBitmap(file);
      await engine.importImageToLayer(target.id, bmp, { fit: true });
      bmp.close?.();
    }
    markDirty();
    draw();
  }

  async function exportKojFactory() {
    const bundle = await buildSaveBundle();
    try {
      const resp = await fetch(`${API_BASE}/mia/paint/command`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "export_koj_factory", bundle, name: paintDoc.name })
      });
      const data = await resp.json();
      if (data.ok) {
        showNotice(`Koj Factory: ${data.relativePath}`);
        setAiStatus(`export · ${data.byteLength} B`);
      } else {
        showNotice(`Export selhal: ${data.error || "?"}`);
      }
    } catch (_err) {
      showNotice("Export selhal — server offline?");
    }
  }

  function setAiStatus(text) {
    const el = document.getElementById("aiStatus");
    if (el) el.textContent = `AI: ${text}`;
  }

  async function canvasToBase64(canvas) {
    return new Promise((resolve) => {
      canvas.toBlob(async (blob) => {
        if (!blob) return resolve("");
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
        reader.readAsDataURL(blob);
      }, "image/png");
    });
  }

  function graphicsEditorCtx(opts) {
    return {
      core,
      paintDoc,
      engine,
      bindDocument,
      renderLayerList,
      renderFrameList,
      syncMotionUi,
      timelineEditor,
      markDirty,
      draw,
      docSizeEl,
      fitDocument,
      canvasToBase64,
      exportAnimationDownload,
      playParticleEmitter,
      ...opts
    };
  }

  async function aiRunOnDocument(path, body, statusLabel) {
    setAiStatus(statusLabel);
    const canvas = engine.compositeDocumentToCanvas();
    const dataBase64 = await canvasToBase64(canvas);
    if (!dataBase64) {
      setAiStatus("chyba");
      return null;
    }
    const payload = { ...body, dataBase64, documentId: paintDoc.id };
    if (gfxClient) {
      const fn =
        path === "upscale"
          ? gfxClient.upscale
          : path === "restore"
            ? gfxClient.restore
            : path === "recolor"
              ? gfxClient.recolor
              : null;
      if (fn) return fn(payload);
    }
    const resp = await fetch(`${API_BASE}/mia/graphics/ai/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    return resp.json();
  }

  async function aiApplyGraphicsResult(data, fallbackName) {
    if (!data?.ok || !data.pngBase64) {
      setAiStatus(data?.error || "chyba");
      return;
    }
    const step = data.clientStep || {
      command: "import_image",
      args: { dataBase64: data.pngBase64, name: fallbackName }
    };
    if (gfxClient) {
      await gfxClient.applyClientStep(step, graphicsEditorCtx());
    }
    const detail = [data.api, data.note || data.provider, data.byteLength ? `${data.byteLength} B` : ""]
      .filter(Boolean)
      .join(" · ");
    setAiStatus(detail);
  }

  async function aiGenerateLayer() {
    const prompt = document.getElementById("aiPrompt")?.value?.trim() || "MIA Paint asset";
    setAiStatus("generuji…");
    try {
      const data = gfxClient
        ? await gfxClient.generateImage({
            prompt,
            width: paintDoc.width,
            height: paintDoc.height,
            documentId: paintDoc.id
          })
        : await (
            await fetch(`${API_BASE}/mia/graphics/ai/generate`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                prompt,
                width: paintDoc.width,
                height: paintDoc.height,
                documentId: paintDoc.id
              })
            })
          ).json();
      if (!data.ok || !data.pngBase64) {
        setAiStatus("chyba");
        return;
      }
      if (gfxClient) {
        await gfxClient.importPngBase64ToLayer(
          graphicsEditorCtx(),
          data.pngBase64,
          `AI: ${prompt.slice(0, 24)}`
        );
      } else {
        core.addLayer(paintDoc, { name: `AI: ${prompt.slice(0, 24)}` });
        bindDocument();
        renderLayerList();
        const layer = activeLayer();
        const img = new Image();
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = `data:image/png;base64,${data.pngBase64}`;
        });
        await engine.importImageToLayer(layer.id, img, { fit: true });
        markDirty();
        draw();
      }
      setAiStatus(`${data.api || "generate"} · ${data.provider || "ok"} · ${data.byteLength} B`);
    } catch (_err) {
      setAiStatus("offline");
    }
  }

  async function aiGenerateAnimation() {
    const prompt = document.getElementById("aiPrompt")?.value?.trim() || "MIA mascot animation";
    const motion = document.getElementById("aiAnimMotion")?.value || "idle";
    const frameCount = Math.max(2, Math.min(12, Number(document.getElementById("aiAnimFrames")?.value) || 6));
    setAiStatus(`AI anim ${motion}…`);
    try {
      const payload = {
        prompt,
        motion,
        frameCount,
        width: Math.min(512, paintDoc.width || 512),
        height: Math.min(512, paintDoc.height || 512),
        fps: paintDoc.timeline?.fps || 12,
        packSheet: true,
        persist: true,
        forPaintTimeline: true,
        includeFramesBase64: true,
        encodeGif: false,
        encodeWebm: false,
        documentId: paintDoc.id
      };
      const data = gfxClient
        ? await gfxClient.generateAnimation(payload)
        : await (
            await fetch(`${API_BASE}/mia/graphics/ai/animation/generate`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload)
            })
          ).json();
      if (!data?.ok) {
        setAiStatus(data?.error || "anim chyba");
        return;
      }
      const step =
        data.clientStep?.command === "import_animation_frames"
          ? data.clientStep
          : {
              command: "import_animation_frames",
              args: {
                framesBase64: data.framesBase64 || [],
                fps: data.fps || payload.fps,
                clipId: data.clipId,
                motion: data.motion,
                replaceTimeline: true,
                layerName: `AI anim: ${data.clipId || motion}`
              }
            };
      if (!step.args?.framesBase64?.length) {
        setAiStatus("anim: žádné snímky");
        return;
      }
      if (gfxClient) {
        await gfxClient.applyClientStep(step, graphicsEditorCtx());
      }
      currentStagingId = data.clipId || currentStagingId;
      const alpha = data.avgAlphaRatio != null ? ` · α${Math.round(data.avgAlphaRatio * 100)}%` : "";
      setAiStatus(
        `${data.api || "generateAnimation"} · ${data.provider || "ok"} · ${data.frameCount}fr${alpha} · → Staging`
      );
      showNotice(`AI anim ${data.motion}: ${data.frameCount} snímků — uprav a → Staging`);
    } catch (_err) {
      setAiStatus("anim offline");
    }
  }

  async function loadAiStagingFromQuery() {
    const params = new URLSearchParams(window.location.search);
    const stagingId = params.get("aiStaging") || params.get("staging");
    if (!stagingId) return;
    setAiStatus(`staging ${stagingId}…`);
    try {
      const data = gfxClient
        ? await gfxClient.fetchStagingClip(stagingId)
        : await (
            await fetch(
              `${API_BASE}/mia/animation/staging/${encodeURIComponent(stagingId)}?frames=1`
            )
          ).json();
      if (!data?.ok || !data.framesBase64?.length) {
        setAiStatus(data?.error || "staging fail");
        return;
      }
      if (data.prompt && document.getElementById("aiPrompt")) {
        document.getElementById("aiPrompt").value = data.prompt;
      }
      if (data.motion && document.getElementById("aiAnimMotion")) {
        document.getElementById("aiAnimMotion").value = data.motion;
      }
      if (gfxClient) {
        await gfxClient.importAnimationFramesToTimeline(graphicsEditorCtx(), {
          framesBase64: data.framesBase64,
          fps: data.fps || 12,
          clipId: data.stagingId,
          motion: data.motion,
          replaceTimeline: true,
          layerName: `AI staging: ${data.stagingId}`
        });
      }
      currentStagingId = data.stagingId || stagingId;
      setAiStatus(`staging ${data.stagingId} · ${data.frameCount}fr · → Staging`);
      showNotice(`Načten staging ${data.stagingId}`);
    } catch (_err) {
      setAiStatus("staging offline");
    }
  }

  async function aiEditRegion() {
    if (!paintDoc.selection) {
      setAiStatus("vyber oblast");
      return;
    }
    setAiStatus("AI edit…");
    const canvas = engine.compositeDocumentToCanvas();
    const dataBase64 = await canvasToBase64(canvas);
    const maskBase64 = gfxClient
      ? gfxClient.buildSelectionMaskBase64(paintDoc.selection, core, paintDoc)
      : null;
    if (!dataBase64 || !maskBase64) {
      setAiStatus("chyba masky");
      return;
    }
    try {
      const data = gfxClient
        ? await gfxClient.editRegion({
            dataBase64,
            maskBase64,
            docWidth: paintDoc.width,
            docHeight: paintDoc.height,
            documentId: paintDoc.id
          })
        : await (
            await fetch(`${API_BASE}/mia/graphics/ai/edit`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                dataBase64,
                maskBase64,
                docWidth: paintDoc.width,
                docHeight: paintDoc.height,
                documentId: paintDoc.id
              })
            })
          ).json();
      if (!data.ok || !data.pngBase64) {
        setAiStatus(data.error || "chyba");
        return;
      }
      const step = data.clientStep || {
        command: "import_image",
        args: { dataBase64: data.pngBase64, name: "AI edit" }
      };
      if (gfxClient) {
        await gfxClient.applyClientStep(step, graphicsEditorCtx());
      }
      setAiStatus(`${data.api || "edit"} · ${data.note || "ok"}`);
    } catch (_err) {
      setAiStatus("offline");
    }
  }

  async function aiRemoveBackground() {
    setAiStatus("remove-bg…");
    const canvas = engine.compositeDocumentToCanvas();
    const dataBase64 = await canvasToBase64(canvas);
    if (!dataBase64) {
      setAiStatus("chyba");
      return;
    }
    try {
      const data = gfxClient
        ? await gfxClient.removeBackground({
            dataBase64,
            tolerance: 32,
            documentId: paintDoc.id
          })
        : await (
            await fetch(`${API_BASE}/mia/graphics/ai/remove-background`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ dataBase64, tolerance: 32, documentId: paintDoc.id })
            })
          ).json();
      if (!data.ok || !data.pngBase64) {
        setAiStatus("chyba");
        return;
      }
      if (gfxClient) {
        await gfxClient.importPngBase64ToLayer(
          graphicsEditorCtx(),
          data.pngBase64,
          "Bez pozadí",
          { fit: false, x: 0, y: 0 }
        );
      } else {
        core.addLayer(paintDoc, { name: "Bez pozadí" });
        bindDocument();
        renderLayerList();
        const layer = activeLayer();
        const img = new Image();
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = `data:image/png;base64,${data.pngBase64}`;
        });
        await engine.importImageToLayer(layer.id, img, { fit: false, x: 0, y: 0 });
        markDirty();
        draw();
      }
      setAiStatus(`${data.api || "remove-bg"} · ${data.byteLength} B`);
    } catch (_err) {
      setAiStatus("offline");
    }
  }

  async function aiTrueAlpha() {
    setAiStatus("true-alpha…");
    const canvas = engine.compositeDocumentToCanvas();
    const dataBase64 = await canvasToBase64(canvas);
    if (!dataBase64) {
      setAiStatus("chyba");
      return;
    }
    try {
      const data = gfxClient
        ? await gfxClient.trueAlpha({
            dataBase64,
            mode: "auto",
            documentId: paintDoc.id
          })
        : await (
            await fetch(`${API_BASE}/mia/graphics/ai/true-alpha`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ dataBase64, mode: "auto", documentId: paintDoc.id })
            })
          ).json();
      if (!data.ok || !data.pngBase64) {
        setAiStatus(data?.error || "true-alpha chyba");
        return;
      }
      if (gfxClient) {
        const step = data.clientStep || {
          command: "import_image",
          args: { dataBase64: data.pngBase64, name: "True alpha", fit: true }
        };
        await gfxClient.applyClientStep(step, graphicsEditorCtx());
      } else {
        core.addLayer(paintDoc, { name: "True alpha" });
        bindDocument();
        renderLayerList();
        const layer = activeLayer();
        const img = new Image();
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = `data:image/png;base64,${data.pngBase64}`;
        });
        await engine.importImageToLayer(layer.id, img, { fit: true });
        markDirty();
        draw();
      }
      const alpha =
        data.alphaRatio != null ? ` · α${Math.round(data.alphaRatio * 100)}%` : "";
      setAiStatus(`${data.api || "trueAlpha"} · ${data.mode || "auto"}${alpha}`);
      showNotice("True Alpha hotovo — zkontroluj okraje před → Staging / Bank");
    } catch (_err) {
      setAiStatus("true-alpha offline");
    }
  }

  async function aiUpscale() {
    try {
      const data = await aiRunOnDocument("upscale", { scale: 2, sharpen: true }, "upscale 2×…");
      await aiApplyGraphicsResult(data, "Upscale 2×");
    } catch (_err) {
      setAiStatus("offline");
    }
  }

  async function aiRestore() {
    try {
      const data = await aiRunOnDocument("restore", { strength: 0.65 }, "obnovuji…");
      await aiApplyGraphicsResult(data, "Obnoveno");
    } catch (_err) {
      setAiStatus("offline");
    }
  }

  async function aiRecolor() {
    const palette = document.getElementById("aiPalette")?.value || "cyberpunk";
    try {
      const data = await aiRunOnDocument("recolor", { palette }, `paleta ${palette}…`);
      await aiApplyGraphicsResult(data, `Paleta: ${palette}`);
    } catch (_err) {
      setAiStatus("offline");
    }
  }

  function showNotice(text) {
    const el = document.getElementById("statusHint");
    if (!el) return;
    const prev = el.textContent;
    el.textContent = text;
    setTimeout(() => {
      el.textContent = prev;
    }, 4000);
  }

  function renderPluginMenu() {
    const container = document.getElementById("pluginMenuItems");
    if (!container || !pluginHost) return;
    container.innerHTML = "";
    for (const item of pluginHost.getMenuItems()) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = item.label;
      btn.addEventListener("click", () => {
        document.getElementById("fileMenu").hidden = true;
        const ctx = {
          exportPng: () => exportRaster("image/png", "png"),
          notify: showNotice,
          document: paintDoc,
          shellMode
        };
        if (typeof item.run === "function") item.run(ctx);
      });
      container.appendChild(btn);
    }
  }

  async function initNativeBridge() {
    const params = new URLSearchParams(window.location.search);
    shellMode =
      params.get("shell") === "1" ||
      params.get("native") === "tauri" ||
      !!globalThis.MIA_PAINT_NATIVE?.shell;
    try {
      const q = shellMode ? `?shell=1&native=${params.get("native") || ""}` : "";
      const resp = await fetch(`${API_BASE}/mia/paint/native/status${q}`);
      nativeCaps = await resp.json();
    } catch (_err) {
      nativeCaps = { runtime: "browser", capabilities: {} };
    }
    nativeRuntime =
      globalThis.MIA_PAINT_NATIVE?.runtime ||
      nativeCaps?.runtime ||
      (params.get("native") === "tauri" ? "mia-paint-tauri" : shellMode ? "mia-paint-shell" : "browser");
    nativeDialogs =
      !!nativeCaps?.capabilities?.tauriNative ||
      params.get("native") === "tauri" ||
      !!globalThis.MIA_PAINT_NATIVE?.tauri;
    const nativeEl = document.getElementById("nativeBackend");
    if (nativeEl) {
      const caps = nativeCaps?.capabilities || {};
      const ink = caps.windowsInk ? "Ink" : "web";
      const rt = nativeRuntime === "mia-paint-tauri" ? "tauri" : shellMode ? "shell" : "browser";
      nativeEl.textContent = `${rt} · ${ink}`;
    }
    window.addEventListener("message", async (e) => {
      if (!e.data || e.data.source !== "mia-paint-native") return;
      if (e.data.type === "capabilities") {
        nativeCaps = { ...nativeCaps, capabilities: e.data.payload };
        nativeDialogs = !!e.data.payload?.tauriNative;
      }
      if (e.data.type === "native-open-result" && e.data.payload?.ok && e.data.payload.bytesBase64) {
        const bridge = globalThis.MIA_PAINT_SHELL_BRIDGE;
        const bytes = bridge?.base64ToBytes
          ? bridge.base64ToBytes(e.data.payload.bytesBase64)
          : Uint8Array.from(atob(e.data.payload.bytesBase64), (c) => c.charCodeAt(0));
        const file = new File([bytes], "project.miapaint", { type: "application/gzip" });
        await loadProjectFile(file);
        showNotice(`Otevřeno: ${e.data.payload.path || "projekt"}`);
      }
      if (e.data.type === "native-save-result" && e.data.payload?.ok) {
        showNotice(`Uloženo: ${e.data.payload.path || "projekt"}`);
      }
    });
    if (window.parent !== window) {
      window.parent.postMessage({ source: "mia-paint-editor", type: "ready" }, "*");
    }
  }

  async function initPlugins() {
    if (!pluginHostLib?.createBrowserPluginHost) return;
    pluginHost = pluginHostLib.createBrowserPluginHost(core, {
      getContext: () => ({
        exportPng: () => exportRaster("image/png", "png"),
        exportKojFactory,
        notify: showNotice,
        document: paintDoc,
        shellMode,
        native: nativeCaps
      })
    });
    try {
      await pluginHost.loadFromServer(API_BASE);
      renderPluginMenu();
    } catch (err) {
      console.warn("Plugin load failed", err);
    }
  }

  function toggleFileMenu() {
    const menu = document.getElementById("fileMenu");
    menu.hidden = !menu.hidden;
  }

  docNameInput.value = paintDoc.name;
  docNameInput.addEventListener("input", () => {
    paintDoc.name = docNameInput.value.trim() || "Bez názvu";
    core.touchDocument(paintDoc);
    markDirty();
  });

  brushSizeInput.addEventListener("input", syncBrushFromUi);
  brushColorInput.addEventListener("input", syncBrushFromUi);
  pressureCurveSelect.addEventListener("change", syncBrushFromUi);
  wandToleranceInput.addEventListener("input", syncBrushFromUi);
  document.getElementById("btnClearSelection").addEventListener("click", clearSelectionUi);

  document.getElementById("btnAddLayer").addEventListener("click", () => {
    core.addLayer(paintDoc, { name: `Vrstva ${paintDoc.layers.length + 1}` });
    bindDocument();
    markDirty();
    renderLayerList();
    draw();
  });

  document.getElementById("btnAddVector").addEventListener("click", () => {
    core.addVectorLayer(paintDoc, { name: `Vektor ${paintDoc.layers.filter((l) => l.kind === "vector").length + 1}` });
    bindDocument();
    markDirty();
    renderLayerList();
    draw();
  });

  document.getElementById("btnExportSvg").addEventListener("click", exportSvgDownload);
  document.getElementById("btnTimelinePlay").addEventListener("click", togglePlayback);
  document.getElementById("btnTimelineAdd").addEventListener("click", addFrame);
  document.getElementById("btnTimelineCapture").addEventListener("click", captureFrame);
  document.getElementById("btnMotionKf").addEventListener("click", motionAddLayerKeyframe);
  document.getElementById("btnMotionCamera").addEventListener("click", motionAddCameraKeyframe);
  document.getElementById("btnMotionBones").addEventListener("click", motionCreateBonesRig);
  document.getElementById("btnMotionAi")?.addEventListener("click", motionAiGenerate);
  document.getElementById("btnMotionLip")?.addEventListener("click", motionLipSync);
  document.getElementById("btnMotionLipAudio")?.addEventListener("click", () => {
    document.getElementById("fileLipAudio")?.click();
  });
  document.getElementById("fileLipAudio")?.addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) motionLipSyncFromAudioFile(file);
  });
  document.getElementById("btnMotionIk")?.addEventListener("click", motionIkSolve);
  document.getElementById("boneOverlayToggle")?.addEventListener("change", (e) => {
    if (engine) engine.showBoneOverlay = !!e.target.checked;
    draw();
  });
  document.getElementById("cameraPresetSelect")?.addEventListener("change", (e) => {
    if (!paintDoc?.timeline) return;
    core.setActiveCameraPreset?.(paintDoc.timeline, e.target.value);
    engine?.setMotionPlayhead?.(motionTimeMs());
    syncMotionUi();
    markDirty();
    draw();
    showNotice(`Záběr ${e.target.value}`);
  });
  document.getElementById("motionPlayhead").addEventListener("input", (e) => {
    scrubToMotionMs(Number(e.target.value) || 0);
  });
  document.getElementById("btnExportSheet").addEventListener("click", exportSheetManifest);
  document.getElementById("btnExportStaging").addEventListener("click", saveToStaging);
  document.getElementById("btnExportBank").addEventListener("click", exportToAnimationBank);
  document.getElementById("btnExportGif").addEventListener("click", exportGifAnimation);
  document.getElementById("btnExportWebm").addEventListener("click", exportWebmAnimation);
  document.getElementById("btnExportMp4").addEventListener("click", exportMp4Animation);
  document.getElementById("btnAddParticles").addEventListener("click", addParticles);
  document.getElementById("btnCreateAvatar").addEventListener("click", createAvatar);
  document.getElementById("btnObsPreview").addEventListener("click", toggleObsPreview);
  document.getElementById("btnMenuFile").addEventListener("click", toggleFileMenu);
  document.getElementById("btnSave").addEventListener("click", () => {
    document.getElementById("fileMenu").hidden = true;
    saveProject(true);
  });
  document.getElementById("btnSaveAs").addEventListener("click", () => {
    document.getElementById("fileMenu").hidden = true;
    saveProject(false);
  });
  document.getElementById("btnOpen").addEventListener("click", async () => {
    document.getElementById("fileMenu").hidden = true;
    if (!(await openProjectNative())) {
      document.getElementById("fileOpenMiapaint").click();
    }
  });
  document.getElementById("btnImportImage").addEventListener("click", () => {
    document.getElementById("fileMenu").hidden = true;
    document.getElementById("fileImportImage").click();
  });
  document.getElementById("btnExportPng").addEventListener("click", () => {
    document.getElementById("fileMenu").hidden = true;
    exportRaster("image/png", "png");
  });
  document.getElementById("btnExportJpg").addEventListener("click", () => {
    document.getElementById("fileMenu").hidden = true;
    exportRaster("image/jpeg", "jpg", 0.92);
  });
  document.getElementById("btnExportWebp").addEventListener("click", () => {
    document.getElementById("fileMenu").hidden = true;
    exportRaster("image/webp", "webp", 0.9);
  });
  document.getElementById("fileOpenMiapaint").addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) loadProjectFile(file);
  });
  document.getElementById("fileImportImage").addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) importImageFile(file);
  });
  document.getElementById("btnExportKojMenu").addEventListener("click", () => {
    document.getElementById("fileMenu").hidden = true;
    exportKojFactory();
  });
  document.getElementById("btnAiGenerate").addEventListener("click", aiGenerateLayer);
  document.getElementById("btnAiGenerateAnim").addEventListener("click", aiGenerateAnimation);
  document.getElementById("btnAiEdit").addEventListener("click", aiEditRegion);
  document.getElementById("btnAiRemoveBg").addEventListener("click", aiRemoveBackground);
  document.getElementById("btnAiTrueAlpha").addEventListener("click", aiTrueAlpha);
  document.getElementById("btnAiUpscale").addEventListener("click", aiUpscale);
  document.getElementById("btnAiRestore").addEventListener("click", aiRestore);
  document.getElementById("btnAiRecolor").addEventListener("click", aiRecolor);
  document.getElementById("btnExportKoj").addEventListener("click", exportKojFactory);
  document.addEventListener("click", (e) => {
    const menu = document.getElementById("fileMenu");
    if (!menu.hidden && !e.target.closest("#fileMenu") && !e.target.closest("#btnMenuFile")) {
      menu.hidden = true;
    }
  });
  onionSkinInput.addEventListener("change", () => {
    applyOnionSettingsFromUi();
    draw();
  });
  onionDepthInput?.addEventListener("input", () => {
    if (onionSkinInput && !onionSkinInput.checked) onionSkinInput.checked = true;
    applyOnionSettingsFromUi();
    draw();
  });

  document.getElementById("btnTheme").addEventListener("click", () => {
    theme = theme === "dark" ? "light" : "dark";
    applyTheme();
    draw();
    markDirty();
  });

  document.getElementById("btnFit").addEventListener("click", fitDocument);
  document.getElementById("btnZoom100").addEventListener("click", () => {
    viewport.setState({ zoom: 1 });
    draw();
    markDirty();
  });
  document.getElementById("btnSync").addEventListener("click", () => {
    connectServer();
    syncToServer();
  });

  document.querySelectorAll(".tool:not([disabled])").forEach((btn) => {
    btn.addEventListener("click", () => setTool(btn.dataset.tool));
  });

  host.addEventListener("wheel", (e) => {
    e.preventDefault();
    const rect = host.getBoundingClientRect();
    viewport.zoomAt(e.deltaY > 0 ? 0.9 : 1.1, e.clientX - rect.left, e.clientY - rect.top);
    draw();
    markDirty();
  }, { passive: false });

  host.addEventListener("pointerdown", (e) => {
    if (activeTool === "fill" && !spaceDown) {
      fillAt(e);
      return;
    }
    if (activeTool === "select-wand" && !spaceDown) {
      wandAt(e);
      return;
    }
    if (isPaintTool(activeTool) && !spaceDown) {
      startPaintStroke(e);
      return;
    }
    if ((activeTool === "select-rect" || activeTool === "select-lasso" || activeTool === "crop") && !spaceDown) {
      startSelectDrag(e);
      return;
    }
    if (activeTool === "vector-rect" && !spaceDown) {
      startVectorDrag(e);
      return;
    }
    if (activeTool === "transform" && !spaceDown) {
      startFloatMove(e);
      return;
    }
    if (activeTool === "bone-ik" && !spaceDown) {
      ikDragging = true;
      host.setPointerCapture(e.pointerId);
      applyIkAtWorld(screenToWorld(e), { localOnly: true, silent: true });
      return;
    }
    if (activeTool !== "move" && !spaceDown) return;
    panning = true;
    host.classList.add("panning");
    panStart = { x: e.clientX, y: e.clientY, panX: viewport.state.panX, panY: viewport.state.panY };
    host.setPointerCapture(e.pointerId);
  });

  host.addEventListener("pointermove", (e) => {
    const w = screenToWorld(e);
    statusCoords.textContent = `${Math.round(w.x)}, ${Math.round(w.y)}`;
    if (ikDragging && activeTool === "bone-ik") {
      applyIkAtWorld(w, { localOnly: true, silent: true });
      return;
    }
    if (painting && isPaintTool(activeTool)) {
      paintAt(e, true);
      return;
    }
    if (selecting) {
      updateSelectDrag(e);
      return;
    }
    if (vectoring) {
      updateVectorDrag(e);
      return;
    }
    if (movingFloat) {
      updateFloatMove(e);
      return;
    }
    if (!panning || !panStart) return;
    viewport.setState({
      panX: panStart.panX + (e.clientX - panStart.x),
      panY: panStart.panY + (e.clientY - panStart.y)
    });
    draw();
  });

  host.addEventListener("pointerup", (e) => {
    if (ikDragging) {
      ikDragging = false;
      applyIkAtWorld(screenToWorld(e), { silent: true });
    }
    if (painting) finishPaintStroke();
    if (selecting) finishSelectDrag();
    if (vectoring) finishVectorDrag();
    if (movingFloat) finishFloatMove();
    if (panning) {
      panning = false;
      host.classList.remove("panning");
      panStart = null;
      markDirty();
    }
    updateHostCursor();
    try { host.releasePointerCapture(e.pointerId); } catch (_err) { /* ok */ }
  });

  host.addEventListener("pointercancel", () => {
    ikDragging = false;
    if (painting) {
      engine.cancelStroke();
      painting = false;
      lastPaint = null;
      draw();
    }
    if (selecting) {
      selecting = false;
      engine.draftSelection = null;
      engine.lassoPoints = null;
      engine.cropDraft = null;
      draw();
    }
    if (vectoring) {
      vectoring = false;
      engine.vectorDraft = null;
      draw();
    }
    if (movingFloat) cancelFloatMove();
  });

  window.addEventListener("keydown", (e) => {
    if (e.code === "Space") {
      spaceDown = true;
      updateHostCursor();
      e.preventDefault();
    }
    if (e.key === "v" || e.key === "V") setTool("move");
    if (e.key === "b" || e.key === "B") setTool("brush");
    if (e.key === "e" || e.key === "E") setTool("eraser");
    if (e.key === "g" || e.key === "G") setTool("fill");
    if (e.key === "r" || e.key === "R") setTool("vector-rect");
    if (e.key === "m" || e.key === "M") setTool("select-rect");
    if (e.key === "l" || e.key === "L") setTool("select-lasso");
    if (e.key === "w" || e.key === "W") setTool("select-wand");
    if (e.key === "t" || e.key === "T") setTool("transform");
    if (e.key === "c" || e.key === "C") setTool("crop");
    if (e.key === "i" || e.key === "I") setTool("bone-ik");
    if (e.key === "Escape") {
      if (movingFloat) cancelFloatMove();
      else clearSelectionUi();
    }
    if (e.key === "Delete" || e.key === "Backspace") {
      deleteSelection();
      e.preventDefault();
    }
    if (e.key === "[" && activeTool === "transform") {
      scaleFloatingSelection(0.9);
      e.preventDefault();
    }
    if (e.key === "]" && activeTool === "transform") {
      scaleFloatingSelection(1.1);
      e.preventDefault();
    }
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === "s") {
      e.preventDefault();
      saveProject(true);
    }
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "s") {
      e.preventDefault();
      exportRaster("image/png", "png");
    }
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === "z") {
      e.preventDefault();
      doUndo();
    }
    if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === "y" || (e.shiftKey && e.key.toLowerCase() === "z"))) {
      e.preventDefault();
      doRedo();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === "0") {
      e.preventDefault();
      fitDocument();
    }
  });

  window.addEventListener("keyup", (e) => {
    if (e.code === "Space") {
      spaceDown = false;
      updateHostCursor();
    }
  });

  window.addEventListener("resize", resizeCanvas);

  async function boot() {
    applyTheme();
    engine = await gpuLib.createPaintEngine({
      gpuCanvas,
      overlayCanvas,
      tileSize: core.DEFAULT_TILE_SIZE || 512
    });
    gpuBackendEl.textContent = `${engine.backend}${engine.webgpuAvailable ? " · WebGPU detekováno" : ""}`;
    await initNativeBridge();
    bindDocument();
    const tlHost = document.getElementById("motionTimelineHost");
    if (tlHost && globalThis.MIA_TIMELINE_EDITOR?.MiaTimelineEditor) {
      timelineEditor = new globalThis.MIA_TIMELINE_EDITOR.MiaTimelineEditor(tlHost, {
        getContext: () => ({
          paintDoc,
          core,
          engine,
          onScrub: (ms) => scrubToMotionMs(ms),
          onChange: () => {
            markDirty();
            draw();
            syncMotionUi();
          }
        })
      });
    }
    syncBrushFromUi();
    setTool("move");
    await initPlugins();
    renderLayerList();
    renderFrameList();
    resizeCanvas();
    fitDocument();
    connectServer();
    await loadAiStagingFromQuery();
  }

  boot().catch((err) => {
    console.error("MIA Paint boot failed", err);
    gpuBackendEl.textContent = "init failed";
  });
})();
