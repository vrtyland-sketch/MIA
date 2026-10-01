"use strict";

/**
 * Master Canon 0037 — Visual Rendering System: display layer for MIA platform.
 */

const crypto = require("crypto");

const VR_COMPONENT = Object.freeze({
  RENDER_MANAGER: "render_manager",
  SCENE_MANAGER: "scene_manager",
  LAYER_RENDERER: "layer_renderer",
  CAMERA_MANAGER: "camera_manager",
  OVERLAY_RENDERER: "overlay_renderer",
  EFFECT_RENDERER: "effect_renderer",
  RUNTIME_RENDERER: "runtime_renderer",
  OBS_RENDERER: "obs_renderer",
  GPU_MANAGER: "gpu_manager",
  RENDER_OPTIMIZER: "render_optimizer",
  RENDER_METRICS: "render_metrics",
  RENDER_API: "render_api"
});

const VR_COMPONENT_ORDER = Object.freeze(Object.values(VR_COMPONENT));

const VR_SCENE = Object.freeze({
  MAIN_STREAM: "main_stream",
  BATTLE: "battle",
  INTRO: "intro",
  ENDING: "ending",
  SETTINGS: "settings",
  EDITOR: "editor"
});

const VR_LAYER = Object.freeze({
  BACKGROUND: "background",
  ENVIRONMENT: "environment",
  MIA: "mia",
  KOJNOZROUT: "kojnozout",
  BATTLE: "battle",
  OVERLAY: "overlay",
  PARTICLES: "particles",
  HUD: "hud"
});

const VR_LAYER_ORDER = Object.freeze(Object.values(VR_LAYER));

const VR_OVERLAY = Object.freeze({
  BOWL: "bowl_overlay",
  CHAT: "chat_overlay",
  SPEECH: "speech_overlay",
  GIFT: "gift_overlay",
  BATTLE: "battle_overlay"
});

const VR_RUNTIME = Object.freeze({
  HTML: "html",
  CANVAS: "canvas",
  PIXIJS: "pixijs",
  WEBGL: "webgl",
  PNG_RUNTIME: "png_runtime"
});

const VR_FORBIDDEN_ACTIVITIES = Object.freeze([
  "mutate_decision_engine",
  "mutate_animation_engine",
  "mutate_emotion_engine",
  "create_own_logic",
  "execute_ai"
]);

const VR_RUNTIME_ANCHORS = Object.freeze([
  "shared/mia-render-core/visualRenderingSystem.js",
  "shared/mia-animation-core/animationEngine.js",
  "mia-output-overlay/speech-overlay.html",
  "mia-output-overlay/mia-paint/index.html",
  "scripts/MIA_OBS_OVERLAY_SYNC.js",
  "scripts/MIA_OBS_BOOTSTRAP.js"
]);

function manageRender(options = {}) {
  return Object.freeze({
    ok: true,
    fps: options.fps != null ? Number(options.fps) : 60,
    frameMs: options.frameMs != null ? Number(options.frameMs) : 16,
    sync: true,
    component: VR_COMPONENT.RENDER_MANAGER
  });
}

function resolveScene(context = {}) {
  if (context.editor) return VR_SCENE.EDITOR;
  if (context.intro) return VR_SCENE.INTRO;
  if (context.ending) return VR_SCENE.ENDING;
  if (context.settings) return VR_SCENE.SETTINGS;
  if (context.battleActive) return VR_SCENE.BATTLE;
  return VR_SCENE.MAIN_STREAM;
}

function getSceneConfig(scene = VR_SCENE.MAIN_STREAM) {
  const configs = {
    [VR_SCENE.MAIN_STREAM]: { overlays: [VR_OVERLAY.SPEECH, VR_OVERLAY.CHAT, VR_OVERLAY.BOWL], camera: "static" },
    [VR_SCENE.BATTLE]: { overlays: [VR_OVERLAY.BATTLE, VR_OVERLAY.SPEECH], camera: "static" },
    [VR_SCENE.EDITOR]: { overlays: [], camera: "static" },
    [VR_SCENE.INTRO]: { overlays: [VR_OVERLAY.SPEECH], camera: "static" },
    [VR_SCENE.ENDING]: { overlays: [VR_OVERLAY.SPEECH], camera: "static" },
    [VR_SCENE.SETTINGS]: { overlays: [], camera: "static" }
  };
  const config = configs[scene] || configs[VR_SCENE.MAIN_STREAM];
  return Object.freeze({ ok: true, scene, config: Object.freeze(config), component: VR_COMPONENT.SCENE_MANAGER });
}

function renderLayers(scene = VR_SCENE.MAIN_STREAM, visibility = {}) {
  const layers = VR_LAYER_ORDER.map((layer, index) =>
    Object.freeze({
      layer,
      zIndex: index,
      visible: visibility[layer] !== false,
      drawOrder: index
    })
  );
  return Object.freeze({
    ok: true,
    scene,
    layers: Object.freeze(layers),
    component: VR_COMPONENT.LAYER_RENDERER
  });
}

function manageCamera(scene = VR_SCENE.MAIN_STREAM, options = {}) {
  return Object.freeze({
    ok: true,
    scene,
    mode: options.mode || "static",
    zoom: options.zoom != null ? Number(options.zoom) : 1,
    panX: options.panX || 0,
    panY: options.panY || 0,
    rotation: options.rotation || 0,
    component: VR_COMPONENT.CAMERA_MANAGER
  });
}

function renderOverlays(sceneConfig = {}, animation = {}) {
  const active = (sceneConfig.overlays || []).map((overlayId) =>
    Object.freeze({
      overlayId,
      url: overlayId === VR_OVERLAY.SPEECH ? "/speech-overlay.html" : `/${overlayId.replace(/_/g, "-")}.html`,
      visible: overlayId !== VR_OVERLAY.BATTLE || animation.battleAnim != null,
      unit: "browser_source"
    })
  );
  return Object.freeze({
    ok: true,
    overlays: Object.freeze(active),
    component: VR_COMPONENT.OVERLAY_RENDERER
  });
}

function renderEffects(animation = {}, emotion = {}) {
  const effects = [];
  if (animation.battleAnim) effects.push({ type: "battle_flash", priority: 90 });
  if (emotion.primary === "joy") effects.push({ type: "confetti", priority: 40 });
  if (emotion.primary === "tension") effects.push({ type: "smoke", priority: 30 });
  return Object.freeze({
    ok: true,
    effects: Object.freeze(effects),
    component: VR_COMPONENT.EFFECT_RENDERER
  });
}

function selectRuntimeRenderer(preferred = VR_RUNTIME.PNG_RUNTIME) {
  const supported = Object.values(VR_RUNTIME);
  const runtime = supported.includes(preferred) ? preferred : VR_RUNTIME.HTML;
  return Object.freeze({
    ok: true,
    runtime,
    technologyIndependent: true,
    component: VR_COMPONENT.RUNTIME_RENDERER
  });
}

function planObsRender(scene = VR_SCENE.MAIN_STREAM, layers = [], overlays = []) {
  return Object.freeze({
    ok: true,
    scene,
    activeScene: scene === VR_SCENE.BATTLE ? "battle" : "main",
    sources: Object.freeze(
      overlays.map((o) => ({
        id: o.overlayId,
        visible: o.visible !== false,
        transform: { scale: 1, x: 0, y: 0 }
      }))
    ),
    layerOrder: Object.freeze(layers.map((l) => l.layer)),
    websocket: true,
    component: VR_COMPONENT.OBS_RENDERER
  });
}

function manageGpu(load = {}) {
  const gpuLoad = load.gpuLoad != null ? Number(load.gpuLoad) : 0.35;
  const vramMb = load.vramMb != null ? Number(load.vramMb) : 256;
  const throttle = gpuLoad > 0.85;

  return Object.freeze({
    ok: true,
    gpuLoad,
    vramMb,
    shaderCache: true,
    textureCache: true,
    throttle,
    component: VR_COMPONENT.GPU_MANAGER
  });
}

function optimizeRender(layers = [], gpu = {}) {
  const hidden = layers.filter((l) => l.visible === false).map((l) => l.layer);
  const merged = layers.length > 4 && !gpu.throttle ? ["background", "environment"] : [];

  return Object.freeze({
    ok: true,
    skipLayers: Object.freeze(hidden),
    mergedLayers: Object.freeze(merged),
    redrawReduced: hidden.length > 0,
    visualUnchanged: true,
    component: VR_COMPONENT.RENDER_OPTIMIZER
  });
}

function collectRenderMetrics(run = {}) {
  return Object.freeze({
    fps: run.fps || 60,
    frameTimeMs: run.frameTimeMs || 16,
    gpuLoad: run.gpuLoad || 0,
    cpuLoad: run.cpuLoad || 0,
    objectCount: run.objectCount || 0,
    drawCalls: run.drawCalls || 0,
    vramMb: run.vramMb || 0,
    component: VR_COMPONENT.RENDER_METRICS
  });
}

function validateRenderInput(input = {}) {
  const errors = [];
  if (!input.fromAnimation && !input.animation) errors.push("animation_required");
  if (input.mutatesInput === true) errors.push("input_mutation_forbidden");
  if (input.decides === true) errors.push("render_must_not_decide");
  if (input.executesAi === true) errors.push("ai_execution_forbidden");
  return Object.freeze({
    ok: errors.length === 0,
    errors: Object.freeze(errors),
    component: VR_COMPONENT.RENDER_API
  });
}

function buildRenderPipeline(stages = {}) {
  return Object.freeze({
    ok: true,
    pipeline: Object.freeze([
      { step: "decision_engine", done: Boolean(stages.decision) },
      { step: "emotion_engine", done: Boolean(stages.emotion) },
      { step: "animation_engine", done: Boolean(stages.animation) },
      { step: "speech_sync", done: Boolean(stages.speech) },
      { step: "scene_manager", done: Boolean(stages.scene) },
      { step: "layer_renderer", done: Boolean(stages.layers) },
      { step: "effects", done: Boolean(stages.effects) },
      { step: "gpu", done: Boolean(stages.gpu) },
      { step: "obs", done: Boolean(stages.obs) },
      { step: "stream", done: Boolean(stages.stream) }
    ]),
    component: VR_COMPONENT.RENDER_MANAGER
  });
}

function assertRenderForbiddenActivity(activity) {
  const key = String(activity || "");
  return { ok: !VR_FORBIDDEN_ACTIVITIES.includes(key), activity: key };
}

function createVisualRenderingSystem(options = {}) {
  const history = [];
  let frameId = 0;

  return {
    render(input = {}) {
      const startedAt = Date.now();
      const validation = validateRenderInput({
        fromAnimation: input.fromAnimation === true || Boolean(input.animation),
        animation: input.animation,
        mutatesInput: input.mutatesInput === true,
        decides: input.decides,
        executesAi: input.executesAi
      });

      if (!validation.ok) {
        return Object.freeze({
          ok: false,
          error: "invalid_render_input",
          validation,
          decides: false,
          component: VR_COMPONENT.RENDER_API
        });
      }

      frameId += 1;
      const animation = input.animation || {};
      const emotion = input.emotion || animation.emotionAnim || {};
      const speech = input.speech || null;

      const renderMgr = manageRender({ fps: options.fps || 60 });
      const scene = resolveScene({
        battleActive: Boolean(input.battleActive || animation.battleAnim),
        editor: Boolean(input.editor),
        intro: Boolean(input.intro),
        ending: Boolean(input.ending),
        settings: Boolean(input.settings)
      });
      const sceneConfig = getSceneConfig(scene);
      const camera = manageCamera(scene);
      const runtime = selectRuntimeRenderer(input.runtime || options.runtime || VR_RUNTIME.PNG_RUNTIME);

      const layerVisibility = {
        [VR_LAYER.MIA]: animation.character !== "kojnozout",
        [VR_LAYER.KOJNOZROUT]: animation.character === "kojnozout" || Boolean(input.showKoj),
        [VR_LAYER.BATTLE]: scene === VR_SCENE.BATTLE,
        [VR_LAYER.OVERLAY]: true,
        [VR_LAYER.PARTICLES]: Boolean(animation.battleAnim)
      };
      const layers = renderLayers(scene, layerVisibility);
      const overlays = renderOverlays(sceneConfig.config, animation);
      const effects = renderEffects(animation, emotion);
      const gpu = manageGpu(input.gpu || {});
      const optimized = optimizeRender(layers.layers, gpu);
      const obs = planObsRender(scene, layers.layers, overlays.overlays);

      const metrics = collectRenderMetrics({
        fps: renderMgr.fps,
        frameTimeMs: Date.now() - startedAt,
        gpuLoad: gpu.gpuLoad,
        objectCount: layers.layers.filter((l) => l.visible).length + overlays.overlays.length,
        drawCalls: layers.layers.filter((l) => l.visible).length,
        vramMb: gpu.vramMb
      });

      const pipeline = buildRenderPipeline({
        decision: input.decision,
        emotion,
        animation,
        speech,
        scene,
        layers: layers.layers,
        effects: effects.effects,
        gpu,
        obs,
        stream: true
      });

      const allPipelineDone = pipeline.pipeline.every((step) => step.done);
      const frame = Object.freeze({
        frameId: `frame-${frameId}`,
        scene,
        runtime: runtime.runtime,
        layers: layers.layers,
        overlays: overlays.overlays,
        effects: effects.effects,
        camera,
        obs
      });

      const result = Object.freeze({
        ok: allPipelineDone,
        frame,
        pipeline,
        optimized,
        metrics,
        decides: false,
        mutatesInput: false,
        executesAi: false,
        forObs: true,
        forStream: true,
        component: VR_COMPONENT.RENDER_API
      });

      history.push(Object.freeze({ ...result, renderedAt: Date.now() }));
      return result;
    },
    history() {
      return Object.freeze([...history]);
    }
  };
}

function createRenderApiResponse(data = {}, options = {}) {
  return Object.freeze({
    ok: true,
    decides: false,
    executes: options.executes === true,
    data,
    component: VR_COMPONENT.RENDER_API
  });
}

module.exports = {
  VR_COMPONENT,
  VR_COMPONENT_ORDER,
  VR_SCENE,
  VR_LAYER,
  VR_LAYER_ORDER,
  VR_OVERLAY,
  VR_RUNTIME,
  VR_FORBIDDEN_ACTIVITIES,
  VR_RUNTIME_ANCHORS,
  manageRender,
  resolveScene,
  getSceneConfig,
  renderLayers,
  manageCamera,
  renderOverlays,
  renderEffects,
  selectRuntimeRenderer,
  planObsRender,
  manageGpu,
  optimizeRender,
  collectRenderMetrics,
  validateRenderInput,
  buildRenderPipeline,
  createVisualRenderingSystem,
  createRenderApiResponse,
  assertRenderForbiddenActivity
};
