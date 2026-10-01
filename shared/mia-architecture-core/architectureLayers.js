"use strict";

/**
 * Master Canon 0005 — architecture layer taxonomy (§2, §13).
 */

const ARCHITECTURE_LAYER = Object.freeze({
  PLATFORM: "platform",
  SYSTEM: "system",
  SUBSYSTEM: "subsystem",
  MODULE: "module",
  ENGINE: "engine",
  SERVICE: "service",
  COMPONENT: "component",
  ENTITY: "entity"
});

/** Bottom-up order for dependency rules (§12). */
const ARCHITECTURE_LAYER_ORDER = Object.freeze([
  ARCHITECTURE_LAYER.ENTITY,
  ARCHITECTURE_LAYER.COMPONENT,
  ARCHITECTURE_LAYER.SERVICE,
  ARCHITECTURE_LAYER.ENGINE,
  ARCHITECTURE_LAYER.MODULE,
  ARCHITECTURE_LAYER.SUBSYSTEM,
  ARCHITECTURE_LAYER.SYSTEM,
  ARCHITECTURE_LAYER.PLATFORM
]);

const LAYER_RESPONSIBILITY = Object.freeze({
  [ARCHITECTURE_LAYER.ENTITY]: "Data a stav",
  [ARCHITECTURE_LAYER.COMPONENT]: "Jedna jednoduchá činnost",
  [ARCHITECTURE_LAYER.SERVICE]: "Poskytování služby",
  [ARCHITECTURE_LAYER.ENGINE]: "Řízení logiky",
  [ARCHITECTURE_LAYER.MODULE]: "Jedna funkční oblast",
  [ARCHITECTURE_LAYER.SUBSYSTEM]: "Sdružení modulů",
  [ARCHITECTURE_LAYER.SYSTEM]: "Koordinace celé oblasti",
  [ARCHITECTURE_LAYER.PLATFORM]: "Celá MIA"
});

function isArchitectureLayer(value) {
  return typeof value === "string" && ARCHITECTURE_LAYER_ORDER.includes(value);
}

function layerRank(layer) {
  const idx = ARCHITECTURE_LAYER_ORDER.indexOf(layer);
  return idx >= 0 ? idx : -1;
}

module.exports = {
  ARCHITECTURE_LAYER,
  ARCHITECTURE_LAYER_ORDER,
  LAYER_RESPONSIBILITY,
  isArchitectureLayer,
  layerRank
};
