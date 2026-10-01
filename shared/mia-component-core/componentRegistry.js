"use strict";

const { COMPONENT_LIFECYCLE } = require("./componentLifecycle");
const { COMPONENT_TYPE } = require("./componentTypes");
const { createComponentRecord } = require("./componentSchema");

function defineComponent(input) {
  const result = createComponentRecord({
    state: COMPONENT_LIFECYCLE.RUNNING,
    ...input
  });
  if (!result.ok) {
    throw new Error(`invalid component ${input.componentId}: ${result.errors.join(",")}`);
  }
  return result.normalized;
}

/** Canon registry — maps Master Canon §7–§8 to runtime modules. */
const CANON_COMPONENT_DEFINITIONS = [
  defineComponent({
    componentId: "runtime.ingest_queue",
    componentType: COMPONENT_TYPE.RUNTIME,
    name: "Ingest Event Bus",
    purpose: "Přijímá ingest události a řadí je do lane front bez business logiky.",
    module: "scripts/MIA_INGEST_QUEUE.js",
    inputs: ["normalized_event", "lane"],
    outputs: ["queued_work"],
    dependencies: [],
    logging: "mia-errors",
    configuration: { sources: ["env", "MIA_CONFIG.js"], keys: ["MIA_INGEST_COMMUNITY_PARALLEL"] },
    listensTo: ["ingest.http"],
    emits: ["pipeline.process"],
    errors: ["queue_overflow", "lane_reject"]
  }),
  defineComponent({
    componentId: "runtime.event_pipeline",
    componentType: COMPONENT_TYPE.RUNTIME,
    name: "Event Pipeline",
    purpose: "Fázové zpracování událostí přes EventContext.",
    module: "scripts/MIA_EVENT_PIPELINE.js",
    inputs: ["raw_event"],
    outputs: ["action_result", "overlay_delta", "voice_plan"],
    dependencies: ["runtime.ingest_queue"],
    logging: "ingest",
    configuration: { sources: ["MIA_CONFIG.js", "shared/stream_economy_config.json"] },
    listensTo: ["pipeline.process"],
    emits: ["delivery.execute", "overlay.update"],
    errors: ["pipeline_halt", "dedupe_skip"]
  }),
  defineComponent({
    componentId: "ai.decision_layer",
    componentType: COMPONENT_TYPE.AI,
    name: "Decision Layer",
    purpose: "Shadow runtime a rozhodovací engine pro AI reakce.",
    module: "MIA_NEXT/engine_shadow_runtime.js",
    inputs: ["event_context", "stream_state"],
    outputs: ["decision", "speech_text", "overlay_text"],
    dependencies: ["runtime.event_pipeline"],
    logging: "shadow",
    configuration: { sources: ["env", ".env"] },
    listensTo: ["phase.decide"],
    emits: ["action.built"],
    errors: ["llm_timeout", "fallback_triggered"]
  }),
  defineComponent({
    componentId: "stream.delivery",
    componentType: COMPONENT_TYPE.STREAM,
    name: "Action Orchestrator",
    purpose: "Doručení overlay, TTS a videa do OBS.",
    module: "scripts/MIA_DELIVERY_RUNTIME.js",
    inputs: ["action_result", "normalized_event"],
    outputs: ["obs_commands", "tts_jobs"],
    dependencies: ["ai.decision_layer", "graphic.video_engine"],
    logging: "delivery",
    configuration: { sources: ["MIA_CONFIG.js", "env"] },
    listensTo: ["delivery.execute"],
    emits: ["obs.apply", "voice.enqueue"],
    errors: ["obs_unreachable", "voice_queue_full"]
  }),
  defineComponent({
    componentId: "stream.obs_controller",
    componentType: COMPONENT_TYPE.STREAM,
    name: "OBS Controller",
    purpose: "Synchronizace browser overlayů a OBS scén.",
    module: "scripts/MIA_OBS_OVERLAY_SYNC.js",
    inputs: ["overlay_state", "obs_ws"],
    outputs: ["scene_updates", "source_visibility"],
    dependencies: ["stream.delivery"],
    logging: "obs",
    configuration: { sources: ["env", "MIA_CONFIG.js"], keys: ["OBS_WS_URL", "OBS_WS_PASSWORD"] },
    listensTo: ["obs.apply"],
    emits: ["obs.synced"],
    errors: ["obs_ws_disconnect"]
  }),
  defineComponent({
    componentId: "stream.platform_bridges",
    componentType: COMPONENT_TYPE.STREAM,
    name: "Platform Bridges",
    purpose: "Kick/TikFinity adaptéry a síťové mosty.",
    module: "scripts/MIA_PLATFORM_BRIDGES.js",
    inputs: ["platform_socket", "http_ingest"],
    outputs: ["raw_ingest_payload"],
    dependencies: [],
    logging: "ingest",
    configuration: { sources: ["env", ".env"] },
    listensTo: ["network.message"],
    emits: ["ingest.http"],
    errors: ["bridge_disconnect"]
  }),
  defineComponent({
    componentId: "game.kojnozout_engine",
    componentType: COMPONENT_TYPE.GAME,
    name: "Kojnožrout Engine",
    purpose: "Vitals, CARE, evoluce a herní stav Kojnožrouta.",
    module: "scripts/MIA_KOJNOZROUT_ENGINE.js",
    inputs: ["care_command", "gift_impact"],
    outputs: ["koj_state_delta", "evolution_moment"],
    dependencies: ["runtime.event_pipeline"],
    logging: "koj",
    configuration: { sources: ["data/kojnozout-state.json", "KOJNOZROUT_KANON.md"] },
    listensTo: ["community.comment", "support.gift"],
    emits: ["koj.snapshot"],
    errors: ["invalid_care", "state_corrupt"]
  }),
  defineComponent({
    componentId: "game.gift_runtime",
    componentType: COMPONENT_TYPE.GAME,
    name: "Gift Economy Engine",
    purpose: "Gift mapa, tiering, rewards a MIA body.",
    module: "scripts/MIA_GIFT_RUNTIME.js",
    inputs: ["gift_event"],
    outputs: ["gift_mapping", "mia_points", "video_plan"],
    dependencies: ["runtime.event_pipeline"],
    logging: "gift-map",
    configuration: { sources: ["shared/gifts/", "shared/stream_economy_config.json"] },
    listensTo: ["support.gift"],
    emits: ["gift.mapped"],
    errors: ["unknown_gift", "tier_resolve_fail"]
  }),
  defineComponent({
    componentId: "graphic.animation_engine",
    componentType: COMPONENT_TYPE.GRAPHIC,
    name: "Animation Engine",
    purpose: "Animation Bank, sprite sheets a gift reaction orchestrace.",
    module: "shared/mia-animation-engine/",
    inputs: ["animation_request", "gift_context"],
    outputs: ["animation_program", "sprite_manifest"],
    dependencies: ["game.gift_runtime"],
    logging: "animation",
    configuration: { sources: ["assets/animation-bank/"] },
    listensTo: ["gift.mapped"],
    emits: ["animation.ready"],
    errors: ["bank_miss", "sheet_invalid"]
  }),
  defineComponent({
    componentId: "graphic.video_engine",
    componentType: COMPONENT_TYPE.GRAPHIC,
    name: "Video Engine",
    purpose: "Per-tier video rotace a media katalog.",
    module: "scripts/MIA_VIDEO_ENGINE.js",
    inputs: ["video_plan", "tier"],
    outputs: ["obs_media_input"],
    dependencies: ["game.gift_runtime"],
    logging: "video",
    configuration: { sources: ["MIA_MEDIA_CATALOG.js", "env"] },
    listensTo: ["gift.mapped"],
    emits: ["video.scheduled"],
    errors: ["catalog_miss", "tier_empty"]
  }),
  defineComponent({
    componentId: "ai.tts_engine",
    componentType: COMPONENT_TYPE.AI,
    name: "TTS Engine",
    purpose: "MIA a Koj hlasová syntéza.",
    module: "scripts/MIA_TTS_ENGINE.js",
    inputs: ["voice_plan", "speech_text"],
    outputs: ["audio_cache", "speak_job"],
    dependencies: ["stream.delivery"],
    logging: "tts",
    configuration: { sources: ["env", "MIA_CONFIG.js"] },
    listensTo: ["voice.enqueue"],
    emits: ["voice.spoken"],
    errors: ["tts_fail", "cache_write_fail"]
  }),
  defineComponent({
    componentId: "data.config_loader",
    componentType: COMPONENT_TYPE.DATA,
    name: "Configuration Loader",
    purpose: "Centralizované načítání runtime konfigurace.",
    module: "scripts/MIA_CONFIG.js",
    inputs: ["env", "json_configs"],
    outputs: ["runtime_config"],
    dependencies: [],
    logging: "startup",
    configuration: { sources: [".env", "MIA_CONFIG.js", "shared/stream_economy_config.json"] },
    listensTo: ["system.boot"],
    emits: ["config.ready"],
    errors: ["config_parse_fail"]
  }),
  defineComponent({
    componentId: "runtime.scheduler",
    componentType: COMPONENT_TYPE.RUNTIME,
    name: "Scheduler",
    purpose: "Runtime smyčky, watchdogy a časované úlohy.",
    module: "scripts/MIA_RUNTIME_LOOPS.js",
    inputs: ["timer_tick"],
    outputs: ["scheduled_job"],
    dependencies: ["data.config_loader"],
    logging: "runtime",
    configuration: { sources: ["MIA_CONFIG.js", "env"] },
    listensTo: ["scheduler.tick"],
    emits: ["overlay.refresh", "health.ping"],
    errors: ["loop_stall"]
  })
];

const CANON_COMPONENT_REGISTRY = Object.freeze(
  CANON_COMPONENT_DEFINITIONS.reduce((acc, row) => {
    acc[row.componentId] = row;
    return acc;
  }, {})
);

function getComponent(componentId) {
  return CANON_COMPONENT_REGISTRY[componentId] || null;
}

function listComponents() {
  return Object.values(CANON_COMPONENT_REGISTRY);
}

function listComponentsByType(componentType) {
  return listComponents().filter((row) => row.componentType === componentType);
}

module.exports = {
  CANON_COMPONENT_DEFINITIONS,
  CANON_COMPONENT_REGISTRY,
  getComponent,
  listComponents,
  listComponentsByType
};
