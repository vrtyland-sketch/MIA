"use strict";

const { ARCHITECTURE_LAYER } = require("./architectureLayers");

/**
 * Master Canon 0005 — MIA platform architecture map (§2, §8–§10).
 * Each node: { id, layer, name, purpose?, runtime?, docs?, children? }
 */

const MIA_PLATFORM_MAP = Object.freeze({
  id: "mia.platform",
  layer: ARCHITECTURE_LAYER.PLATFORM,
  name: "MIA Platform",
  purpose: "Modulární AI stream platforma — není aplikace, je platforma.",
  runtime: "C:/MIA",
  docs: "docs/master-canon/README.md",
  children: [
    {
      id: "system.runtime",
      layer: ARCHITECTURE_LAYER.SYSTEM,
      name: "Runtime System",
      runtime: "index.js, server.js",
      children: [
        {
          id: "subsystem.streaming",
          layer: ARCHITECTURE_LAYER.SUBSYSTEM,
          name: "Streaming Subsystem",
          children: [
            {
              id: "module.stream",
              layer: ARCHITECTURE_LAYER.MODULE,
              name: "Stream Module",
              docs: "docs/KANON_SOUCASNY_PREHLED.md",
              runtime: "scripts/MIA_EVENT_PIPELINE.js, routes/ingest",
              children: [
                { id: "engine.event_pipeline", layer: ARCHITECTURE_LAYER.ENGINE, name: "Event Pipeline Engine", runtime: "scripts/pipeline/run.js" },
                { id: "component.ingest_queue", layer: ARCHITECTURE_LAYER.COMPONENT, name: "Ingest Queue", runtime: "scripts/MIA_INGEST_QUEUE.js" },
                { id: "module.tiktok", layer: ARCHITECTURE_LAYER.MODULE, name: "TikTok Adapter", runtime: "TikFinity → /ingest" },
                { id: "module.kick", layer: ARCHITECTURE_LAYER.MODULE, name: "Kick Adapter", runtime: "scripts/MIA_KICK_BRIDGE.js" },
                { id: "module.obs", layer: ARCHITECTURE_LAYER.MODULE, name: "OBS Module", runtime: "scripts/MIA_OBS_OVERLAY_SYNC.js" },
                { id: "module.chat", layer: ARCHITECTURE_LAYER.MODULE, name: "Chat Module", runtime: "mia-output-overlay/chat-overlay.html" },
                { id: "module.overlay", layer: ARCHITECTURE_LAYER.MODULE, name: "Overlay Module", runtime: "scripts/MIA_OVERLAY_STATE.js" }
              ]
            }
          ]
        }
      ]
    },
    {
      id: "system.ai",
      layer: ARCHITECTURE_LAYER.SYSTEM,
      name: "AI System",
      children: [
        {
          id: "subsystem.ai",
          layer: ARCHITECTURE_LAYER.SUBSYSTEM,
          name: "AI Subsystem",
          children: [
            {
              id: "module.ai",
              layer: ARCHITECTURE_LAYER.MODULE,
              name: "AI Module",
              runtime: "MIA_NEXT/, scripts/MIA_INTERPRETER_HOST.js",
              children: [
                { id: "engine.decision", layer: ARCHITECTURE_LAYER.ENGINE, name: "Decision Engine", runtime: "MIA_NEXT/engine_shadow_runtime.js" },
                { id: "engine.conversation", layer: ARCHITECTURE_LAYER.ENGINE, name: "Conversation Engine", runtime: "shared/platform_runtime_rules/decision_engine.js" },
                { id: "module.memory", layer: ARCHITECTURE_LAYER.MODULE, name: "Memory Module", runtime: "data/mia-session-memory.json, lexicon" },
                { id: "service.audio", layer: ARCHITECTURE_LAYER.SERVICE, name: "Audio Service", runtime: "scripts/MIA_TTS_ENGINE.js" }
              ]
            }
          ]
        }
      ]
    },
    {
      id: "system.graphics",
      layer: ARCHITECTURE_LAYER.SYSTEM,
      name: "Graphics System",
      children: [
        {
          id: "subsystem.graphics",
          layer: ARCHITECTURE_LAYER.SUBSYSTEM,
          name: "Graphics Subsystem",
          docs: "docs/MIA_GRAPHICS_STUDIO.md",
          children: [
            {
              id: "module.graphics",
              layer: ARCHITECTURE_LAYER.MODULE,
              name: "Graphics Module",
              runtime: "shared/mia-graphics-studio/",
              children: [
                { id: "engine.animation", layer: ARCHITECTURE_LAYER.ENGINE, name: "Animation Engine", runtime: "shared/mia-animation-engine/" },
                { id: "engine.video", layer: ARCHITECTURE_LAYER.ENGINE, name: "Video Engine", runtime: "scripts/MIA_VIDEO_ENGINE.js" },
                { id: "module.paint", layer: ARCHITECTURE_LAYER.MODULE, name: "Paint / UI Module", runtime: "mia-output-overlay/mia-paint/" },
                { id: "module.body", layer: ARCHITECTURE_LAYER.MODULE, name: "Body / Sprite Module", runtime: "shared/mia-graphics-studio/bodyLiveSync.js" }
              ]
            }
          ]
        }
      ]
    },
    {
      id: "system.data",
      layer: ARCHITECTURE_LAYER.SYSTEM,
      name: "Data System",
      children: [
        {
          id: "service.storage",
          layer: ARCHITECTURE_LAYER.SERVICE,
          name: "Storage Service",
          runtime: "data/*.json persistence"
        },
        {
          id: "component.config_reader",
          layer: ARCHITECTURE_LAYER.COMPONENT,
          name: "Configuration Reader",
          runtime: "scripts/MIA_CONFIG.js"
        },
        {
          id: "component.logger",
          layer: ARCHITECTURE_LAYER.COMPONENT,
          name: "Logger",
          runtime: "writeLog, logs/"
        }
      ]
    },
    {
      id: "system.administration",
      layer: ARCHITECTURE_LAYER.SYSTEM,
      name: "Administration System",
      children: [
        {
          id: "module.admin",
          layer: ARCHITECTURE_LAYER.MODULE,
          name: "Admin Module",
          runtime: "routes/status, /health, mia-streamer-dashboard.html",
          docs: "docs/MIA_REMOTE_DEV_MODE.md"
        }
      ]
    },
    {
      id: "module.economy",
      layer: ARCHITECTURE_LAYER.MODULE,
      name: "Economy Module",
      docs: "docs/MIA_GIFT_ECONOMY.md",
      runtime: "shared/gifts/, scripts/MIA_GIFT_RUNTIME.js",
      children: [
        { id: "engine.economy", layer: ARCHITECTURE_LAYER.ENGINE, name: "Economy Engine", runtime: "scripts/MIA_GIFT_TIERS.js" },
        { id: "module.game", layer: ARCHITECTURE_LAYER.MODULE, name: "Game Module (Koj)", docs: "docs/KOJNOZROUT_KANON.md", runtime: "scripts/MIA_KOJNOZROUT_ENGINE.js" }
      ]
    }
  ]
});

/** Maps 0004 operational component IDs → 0005 architecture layer. */
const MAP_0004_COMPONENT_TO_LAYER = Object.freeze({
  "runtime.ingest_queue": ARCHITECTURE_LAYER.COMPONENT,
  "runtime.event_pipeline": ARCHITECTURE_LAYER.ENGINE,
  "runtime.scheduler": ARCHITECTURE_LAYER.COMPONENT,
  "ai.decision_layer": ARCHITECTURE_LAYER.ENGINE,
  "ai.tts_engine": ARCHITECTURE_LAYER.SERVICE,
  "stream.delivery": ARCHITECTURE_LAYER.ENGINE,
  "stream.obs_controller": ARCHITECTURE_LAYER.MODULE,
  "stream.platform_bridges": ARCHITECTURE_LAYER.MODULE,
  "game.kojnozout_engine": ARCHITECTURE_LAYER.ENGINE,
  "game.gift_runtime": ARCHITECTURE_LAYER.ENGINE,
  "graphic.animation_engine": ARCHITECTURE_LAYER.ENGINE,
  "graphic.video_engine": ARCHITECTURE_LAYER.ENGINE,
  "data.config_loader": ARCHITECTURE_LAYER.COMPONENT
});

function walkPlatformMap(node, visitor, path = []) {
  if (!node) return;
  const nextPath = [...path, node.id];
  visitor(node, nextPath);
  const children = node.children || [];
  for (const child of children) {
    walkPlatformMap(child, visitor, nextPath);
  }
}

function flattenPlatformMap(root = MIA_PLATFORM_MAP) {
  const out = [];
  walkPlatformMap(root, (node) => out.push(node));
  return out;
}

function findPlatformNode(nodeId, root = MIA_PLATFORM_MAP) {
  let found = null;
  walkPlatformMap(root, (node) => {
    if (node.id === nodeId) found = node;
  });
  return found;
}

function listNodesByLayer(layer, root = MIA_PLATFORM_MAP) {
  return flattenPlatformMap(root).filter((n) => n.layer === layer);
}

module.exports = {
  MIA_PLATFORM_MAP,
  MAP_0004_COMPONENT_TO_LAYER,
  walkPlatformMap,
  flattenPlatformMap,
  findPlatformNode,
  listNodesByLayer
};
