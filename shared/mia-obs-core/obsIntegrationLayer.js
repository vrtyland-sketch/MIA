"use strict";

/**
 * Master Canon 0038 — OBS Integration Layer: sole gateway to OBS Studio.
 */

const crypto = require("crypto");

const OIL_COMPONENT = Object.freeze({
  CONNECTION_MANAGER: "obs_connection_manager",
  WEBSOCKET_CLIENT: "websocket_client",
  SCENE_MANAGER: "scene_manager",
  SOURCE_MANAGER: "source_manager",
  MEDIA_MANAGER: "media_manager",
  OVERLAY_MANAGER: "overlay_manager",
  FILTER_MANAGER: "filter_manager",
  TRANSFORM_MANAGER: "transform_manager",
  EVENT_LISTENER: "event_listener",
  RECOVERY_MANAGER: "recovery_manager",
  OBS_METRICS: "obs_metrics",
  OBS_API: "obs_api"
});

const OIL_COMPONENT_ORDER = Object.freeze(Object.values(OIL_COMPONENT));

const OIL_SCENE = Object.freeze({
  MAIN: "MAIN",
  STARTING: "STARTING",
  ENDING: "ENDING",
  BATTLE: "BATTLE",
  SETTINGS: "SETTINGS"
});

const OIL_SOURCE = Object.freeze({
  MIA: "MIA",
  KOJNOZROUT: "KOJNOZROUT",
  BOWL: "BOWL",
  CHAT: "CHAT",
  SPEECH: "SPEECH",
  CAMERA: "CAMERA",
  VIDEO: "VIDEO",
  GIF: "GIF"
});

const OIL_OVERLAY = Object.freeze({
  BOWL_OVERLAY: "BOWL_OVERLAY",
  CHAT_OVERLAY: "CHAT_OVERLAY",
  MIA_BUBBLE: "MIA_BUBBLE",
  KOJNOZROUT_BUBBLE: "KOJNOZROUT_BUBBLE",
  GIFT_MOMENT: "GIFT_MOMENT",
  KOJNOZROUT_RUNTIME: "KOJNOZROUT_RUNTIME",
  BATTLE_OVERLAY: "BATTLE_OVERLAY"
});

const OIL_BODY_LAYER = Object.freeze({
  MIA_HEAD: "MIA_HEAD",
  MIA_EYES: "MIA_EYES",
  MIA_HANDS: "MIA_HANDS",
  MIA_FEET: "MIA_FEET"
});

const OIL_MEDIA_TIER = Object.freeze({
  T1: ["T1_VIDEO_01", "T1_VIDEO_02", "T1_VIDEO_03", "T1_VIDEO_04"],
  T2: ["T2_VIDEO_05", "T2_VIDEO_06", "T2_VIDEO_07", "T2_VIDEO_08"],
  T3: ["T3_VIDEO_09", "T3_VIDEO_10", "T3_VIDEO_11", "T3_VIDEO_12"],
  T4: ["T4_VIDEO_13", "T4_VIDEO_14", "T4_VIDEO_15"]
});

const OIL_MEDIA_ACTION = Object.freeze({
  PLAY: "play",
  STOP: "stop",
  PAUSE: "pause",
  RESTART: "restart",
  LOOP: "loop"
});

const OIL_CONNECTION_STATE = Object.freeze({
  INITIALIZING: "initializing",
  HANDSHAKE: "handshake",
  AUTHENTICATED: "authenticated",
  SYNCHRONIZED: "synchronized",
  ACTIVE: "active",
  HEARTBEAT: "heartbeat",
  DISCONNECTED: "disconnected",
  RECONNECTING: "reconnecting",
  RESTORED: "restored"
});

const OIL_WS_MESSAGE = Object.freeze({
  REQUEST: "request",
  RESPONSE: "response",
  EVENT: "event",
  BATCH: "batch_request"
});

const OIL_FORBIDDEN_ACTIVITIES = Object.freeze([
  "decide_battle",
  "mutate_economy",
  "mutate_memory",
  "generate_ai_responses",
  "mutate_personality"
]);

const OIL_RUNTIME_ANCHORS = Object.freeze([
  "shared/mia-obs-core/obsIntegrationLayer.js",
  "scripts/MIA_OBS_BOOTSTRAP.js",
  "scripts/MIA_OBS_OVERLAY_SYNC.js",
  "scripts/MIA_OBS_HANDS.js",
  "shared/mia-action-core/actionOrchestrator.js",
  "shared/mia-render-core/visualRenderingSystem.js"
]);

function manageConnection(config = {}) {
  return Object.freeze({
    ok: true,
    host: config.host || "127.0.0.1",
    port: config.port != null ? Number(config.port) : 4455,
    password: Boolean(config.password),
    protocol: "obs-websocket-5.x",
    state: config.state || OIL_CONNECTION_STATE.INITIALIZING,
    heartbeatMs: config.heartbeatMs != null ? Number(config.heartbeatMs) : 3000,
    component: OIL_COMPONENT.CONNECTION_MANAGER
  });
}

function buildWebSocketMessage(type = OIL_WS_MESSAGE.REQUEST, payload = {}) {
  const supported = Object.values(OIL_WS_MESSAGE).includes(type);
  return Object.freeze({
    ok: supported,
    type: supported ? type : OIL_WS_MESSAGE.REQUEST,
    requestId: payload.requestId || `req-${crypto.randomUUID()}`,
    op: payload.op || null,
    data: Object.freeze(payload.data || {}),
    async: true,
    component: OIL_COMPONENT.WEBSOCKET_CLIENT
  });
}

function resolveScene(context = {}) {
  if (context.battleActive) return OIL_SCENE.BATTLE;
  if (context.starting) return OIL_SCENE.STARTING;
  if (context.ending) return OIL_SCENE.ENDING;
  if (context.settings) return OIL_SCENE.SETTINGS;
  return OIL_SCENE.MAIN;
}

function getSceneConfig(sceneId = OIL_SCENE.MAIN) {
  return Object.freeze({
    ok: true,
    sceneId,
    sceneName: sceneId,
    component: OIL_COMPONENT.SCENE_MANAGER
  });
}

function manageSource(sourceId = OIL_SOURCE.MIA, options = {}) {
  return Object.freeze({
    ok: true,
    sourceId,
    visible: options.visible !== false,
    kind: options.kind || "browser_source",
    component: OIL_COMPONENT.SOURCE_MANAGER
  });
}

function controlMedia(sourceId = "T1_VIDEO_01", action = OIL_MEDIA_ACTION.PLAY, options = {}) {
  const allSources = Object.values(OIL_MEDIA_TIER).flat();
  const valid = allSources.includes(sourceId);
  return Object.freeze({
    ok: valid,
    sourceId,
    action,
    loop: action === OIL_MEDIA_ACTION.LOOP || options.loop === true,
    component: OIL_COMPONENT.MEDIA_MANAGER
  });
}

function manageOverlay(overlayId = OIL_OVERLAY.SPEECH_OVERLAY, options = {}) {
  const overlays = Object.values(OIL_OVERLAY);
  const valid = overlays.includes(overlayId);
  const urls = {
    [OIL_OVERLAY.BOWL_OVERLAY]: "/bowl-overlay.html",
    [OIL_OVERLAY.CHAT_OVERLAY]: "/chat-overlay.html",
    [OIL_OVERLAY.MIA_BUBBLE]: "/speech-overlay.html",
    [OIL_OVERLAY.KOJNOZROUT_BUBBLE]: "/speech-overlay.html",
    [OIL_OVERLAY.GIFT_MOMENT]: "/gift-moment-overlay.html",
    [OIL_OVERLAY.KOJNOZROUT_RUNTIME]: "/kojnozrout-runtime.html",
    [OIL_OVERLAY.BATTLE_OVERLAY]: "/duel-overlay.html"
  };

  return Object.freeze({
    ok: valid,
    overlayId,
    url: urls[overlayId] || null,
    visible: options.visible !== false,
    independent: true,
    component: OIL_COMPONENT.OVERLAY_MANAGER
  });
}

function manageFilter(sourceId = OIL_SOURCE.MIA, filter = "blur", options = {}) {
  const allowed = ["blur", "color_correction", "chroma_key", "crop", "glow", "shadow"];
  const key = String(filter || "").toLowerCase();
  return Object.freeze({
    ok: allowed.includes(key),
    sourceId,
    filter: key,
    enabled: options.enabled !== false,
    runtimeMutable: true,
    component: OIL_COMPONENT.FILTER_MANAGER
  });
}

function manageTransform(sourceId = OIL_SOURCE.MIA, transform = {}) {
  return Object.freeze({
    ok: true,
    sourceId,
    x: transform.x || 0,
    y: transform.y || 0,
    scaleX: transform.scaleX != null ? transform.scaleX : 1,
    scaleY: transform.scaleY != null ? transform.scaleY : 1,
    rotation: transform.rotation || 0,
    opacity: transform.opacity != null ? transform.opacity : 1,
    mirror: Boolean(transform.mirror),
    animatable: true,
    component: OIL_COMPONENT.TRANSFORM_MANAGER
  });
}

function forwardObsEvent(event = {}) {
  const allowed = [
    "scene_changed",
    "media_ended",
    "connection_closed",
    "media_error",
    "source_changed"
  ];
  const type = String(event.type || "");
  return Object.freeze({
    ok: allowed.includes(type),
    type,
    eventBusTarget: "mia_event_bus",
    payload: Object.freeze(event.payload || {}),
    component: OIL_COMPONENT.EVENT_LISTENER
  });
}

function planRecovery(state = OIL_CONNECTION_STATE.DISCONNECTED) {
  return Object.freeze({
    ok: true,
    from: state,
    steps: Object.freeze([
      "outage_detected",
      "reconnect",
      "verify_scenes",
      "restore_overlays",
      "synchronize_state"
    ]),
    targetState: OIL_CONNECTION_STATE.RESTORED,
    component: OIL_COMPONENT.RECOVERY_MANAGER
  });
}

function collectObsMetrics(snapshot = {}) {
  return Object.freeze({
    connected: snapshot.connected !== false,
    fps: snapshot.fps || 60,
    droppedFrames: snapshot.droppedFrames || 0,
    cpu: snapshot.cpu || 0,
    renderTimeMs: snapshot.renderTimeMs || 0,
    activeScene: snapshot.activeScene || OIL_SCENE.MAIN,
    activeSources: snapshot.activeSources || 0,
    component: OIL_COMPONENT.OBS_METRICS
  });
}

function buildConnectionLifecycle(current = OIL_CONNECTION_STATE.INITIALIZING) {
  const order = [
    OIL_CONNECTION_STATE.INITIALIZING,
    OIL_CONNECTION_STATE.HANDSHAKE,
    OIL_CONNECTION_STATE.AUTHENTICATED,
    OIL_CONNECTION_STATE.SYNCHRONIZED,
    OIL_CONNECTION_STATE.ACTIVE,
    OIL_CONNECTION_STATE.HEARTBEAT
  ];
  const index = order.indexOf(current);
  return Object.freeze({
    ok: index >= 0,
    current,
    next: index >= 0 && index < order.length - 1 ? order[index + 1] : OIL_CONNECTION_STATE.HEARTBEAT,
    lifecycle: Object.freeze([
      ...order,
      OIL_CONNECTION_STATE.DISCONNECTED,
      OIL_CONNECTION_STATE.RECONNECTING,
      OIL_CONNECTION_STATE.RESTORED
    ]),
    component: OIL_COMPONENT.CONNECTION_MANAGER
  });
}

function planBattleObsSequence() {
  return Object.freeze({
    ok: true,
    sequence: Object.freeze([
      { step: "battle_start", target: OIL_SCENE.BATTLE },
      { step: "battle_overlay", target: OIL_OVERLAY.BATTLE_OVERLAY },
      { step: "battle_video", target: OIL_MEDIA_TIER.T3[0] },
      { step: "battle_speech", target: OIL_OVERLAY.MIA_BUBBLE },
      { step: "battle_runtime", target: OIL_OVERLAY.KOJNOZROUT_RUNTIME },
      { step: "battle_end", target: OIL_SCENE.MAIN }
    ]),
    component: OIL_COMPONENT.OBS_API
  });
}

function validateObsCommand(input = {}) {
  const errors = [];
  if (input.bypassObsLayer === true) errors.push("direct_obs_control_forbidden");
  if (input.decides === true) errors.push("obs_layer_must_not_decide");
  if (!input.fromActionOrchestrator && !input.fromRender && !input.command) {
    errors.push("upstream_command_required");
  }
  return Object.freeze({
    ok: errors.length === 0,
    errors: Object.freeze(errors),
    component: OIL_COMPONENT.OBS_API
  });
}

function assertObsForbiddenActivity(activity) {
  const key = String(activity || "");
  return { ok: !OIL_FORBIDDEN_ACTIVITIES.includes(key), activity: key };
}

function createObsIntegrationLayer(options = {}) {
  const history = [];
  let connection = manageConnection({
    host: options.host,
    port: options.port,
    password: options.password
  });

  return {
    connect() {
      connection = manageConnection({
        ...connection,
        state: OIL_CONNECTION_STATE.HANDSHAKE
      });
      const lifecycle = buildConnectionLifecycle(OIL_CONNECTION_STATE.HANDSHAKE);
      connection = manageConnection({
        host: connection.host,
        port: connection.port,
        state: OIL_CONNECTION_STATE.ACTIVE
      });
      return Object.freeze({
        ok: true,
        connection,
        lifecycle,
        component: OIL_COMPONENT.CONNECTION_MANAGER
      });
    },
    execute(input = {}, adapters = {}) {
      const validation = validateObsCommand({
        fromActionOrchestrator: input.fromActionOrchestrator === true,
        fromRender: input.fromRender === true,
        command: input.command,
        bypassObsLayer: input.bypassObsLayer,
        decides: input.decides
      });

      if (!validation.ok) {
        return Object.freeze({
          ok: false,
          error: "invalid_obs_command",
          validation,
          decides: false,
          component: OIL_COMPONENT.OBS_API
        });
      }

      const command = input.command || {};
      const scene = resolveScene({
        battleActive: Boolean(input.battleActive || command.battleActive),
        starting: Boolean(command.starting),
        ending: Boolean(command.ending),
        settings: Boolean(command.settings)
      });
      const sceneConfig = getSceneConfig(scene);
      const wsRequest = buildWebSocketMessage(OIL_WS_MESSAGE.REQUEST, {
        op: command.op || "SetCurrentProgramScene",
        data: { sceneName: sceneConfig.sceneName }
      });

      const sources = (command.sources || [OIL_SOURCE.MIA]).map((id) => manageSource(id, command.sourceOptions || {}));
      const overlay = command.overlayId
        ? manageOverlay(command.overlayId, command.overlayOptions || {})
        : manageOverlay(OIL_OVERLAY.MIA_BUBBLE, { visible: Boolean(input.renderFrame) });

      const media = command.mediaSource
        ? controlMedia(command.mediaSource, command.mediaAction || OIL_MEDIA_ACTION.PLAY, command.mediaOptions || {})
        : null;

      const filter = command.filter
        ? manageFilter(command.sourceId || OIL_SOURCE.MIA, command.filter, command.filterOptions || {})
        : null;

      const transform = manageTransform(command.sourceId || OIL_SOURCE.MIA, command.transform || {});
      const battle = input.battleActive ? planBattleObsSequence() : null;
      const recovery = input.recover ? planRecovery(OIL_CONNECTION_STATE.DISCONNECTED) : null;

      const obsEvent = input.obsEvent ? forwardObsEvent(input.obsEvent) : null;
      const metrics = collectObsMetrics({
        connected: connection.state === OIL_CONNECTION_STATE.ACTIVE,
        activeScene: scene,
        activeSources: sources.length + (overlay.ok ? 1 : 0)
      });

      let deferred = { ok: true, provider: "runtime" };
      if (adapters.websocket && typeof adapters.websocket.send === "function") {
        deferred = { ok: false, reason: "websocket_deferred_to_runtime" };
      }

      const result = Object.freeze({
        ok: true,
        commandId: command.commandId || `obs-${crypto.randomUUID()}`,
        scene: sceneConfig,
        wsRequest,
        sources: Object.freeze(sources),
        overlay,
        media,
        filter,
        transform,
        battle,
        recovery,
        obsEvent,
        metrics,
        bodyLayers: Object.freeze(Object.values(OIL_BODY_LAYER)),
        deferred,
        decides: false,
        forStream: true,
        component: OIL_COMPONENT.OBS_API
      });

      history.push(Object.freeze({ ...result, executedAt: Date.now() }));
      return result;
    },
    recover() {
      const plan = planRecovery(OIL_CONNECTION_STATE.DISCONNECTED);
      connection = manageConnection({
        host: connection.host,
        port: connection.port,
        state: OIL_CONNECTION_STATE.RESTORED
      });
      return Object.freeze({ ok: true, plan, connection, component: OIL_COMPONENT.RECOVERY_MANAGER });
    },
    connection() {
      return connection;
    },
    history() {
      return Object.freeze([...history]);
    }
  };
}

function createObsApiResponse(data = {}, options = {}) {
  return Object.freeze({
    ok: true,
    decides: false,
    executes: options.executes === true,
    data,
    component: OIL_COMPONENT.OBS_API
  });
}

module.exports = {
  OIL_COMPONENT,
  OIL_COMPONENT_ORDER,
  OIL_SCENE,
  OIL_SOURCE,
  OIL_OVERLAY,
  OIL_BODY_LAYER,
  OIL_MEDIA_TIER,
  OIL_MEDIA_ACTION,
  OIL_CONNECTION_STATE,
  OIL_WS_MESSAGE,
  OIL_FORBIDDEN_ACTIVITIES,
  OIL_RUNTIME_ANCHORS,
  manageConnection,
  buildWebSocketMessage,
  resolveScene,
  getSceneConfig,
  manageSource,
  controlMedia,
  manageOverlay,
  manageFilter,
  manageTransform,
  forwardObsEvent,
  planRecovery,
  collectObsMetrics,
  buildConnectionLifecycle,
  planBattleObsSequence,
  validateObsCommand,
  createObsIntegrationLayer,
  createObsApiResponse,
  assertObsForbiddenActivity
};
