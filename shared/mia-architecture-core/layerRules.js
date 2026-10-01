"use strict";

const { ARCHITECTURE_LAYER, layerRank } = require("./architectureLayers");

/**
 * Master Canon 0005 — cross-layer dependency rules (§12).
 * Lower layers must not depend on higher layers (except via public interfaces).
 */

const LAYER_DEPENDENCY_RULES = Object.freeze({
  [ARCHITECTURE_LAYER.COMPONENT]: {
    mayDependOn: [ARCHITECTURE_LAYER.COMPONENT, ARCHITECTURE_LAYER.ENTITY],
    mustNotKnow: [ARCHITECTURE_LAYER.SYSTEM, ARCHITECTURE_LAYER.PLATFORM]
  },
  [ARCHITECTURE_LAYER.SERVICE]: {
    mayDependOn: [ARCHITECTURE_LAYER.COMPONENT, ARCHITECTURE_LAYER.ENTITY],
    mustNotKnow: [ARCHITECTURE_LAYER.MODULE, ARCHITECTURE_LAYER.SUBSYSTEM, ARCHITECTURE_LAYER.SYSTEM]
  },
  [ARCHITECTURE_LAYER.ENGINE]: {
    mayDependOn: [ARCHITECTURE_LAYER.SERVICE, ARCHITECTURE_LAYER.COMPONENT, ARCHITECTURE_LAYER.ENTITY],
    mustNotKnow: [ARCHITECTURE_LAYER.SUBSYSTEM, ARCHITECTURE_LAYER.SYSTEM]
  },
  [ARCHITECTURE_LAYER.MODULE]: {
    mayDependOn: [ARCHITECTURE_LAYER.ENGINE, ARCHITECTURE_LAYER.SERVICE, ARCHITECTURE_LAYER.COMPONENT],
    mustNotKnow: [ARCHITECTURE_LAYER.SYSTEM]
  },
  [ARCHITECTURE_LAYER.SUBSYSTEM]: {
    mayDependOn: [ARCHITECTURE_LAYER.MODULE, ARCHITECTURE_LAYER.ENGINE, ARCHITECTURE_LAYER.SERVICE],
    mustNotKnow: []
  },
  [ARCHITECTURE_LAYER.SYSTEM]: {
    mayDependOn: [ARCHITECTURE_LAYER.SUBSYSTEM, ARCHITECTURE_LAYER.MODULE],
    mustNotKnow: []
  }
});

function assertLayerDependencyAllowed(fromLayer, toLayer) {
  if (!fromLayer || !toLayer) {
    return { ok: false, reason: "missing_layer" };
  }
  const fromRank = layerRank(fromLayer);
  const toRank = layerRank(toLayer);
  if (fromRank < 0 || toRank < 0) {
    return { ok: false, reason: "invalid_layer" };
  }
  if (toRank > fromRank) {
    return { ok: false, reason: "upward_dependency", fromLayer, toLayer };
  }
  const rules = LAYER_DEPENDENCY_RULES[fromLayer];
  if (rules && rules.mustNotKnow.includes(toLayer)) {
    return { ok: false, reason: "forbidden_layer_knowledge", fromLayer, toLayer };
  }
  return { ok: true };
}

module.exports = {
  LAYER_DEPENDENCY_RULES,
  assertLayerDependencyAllowed
};
