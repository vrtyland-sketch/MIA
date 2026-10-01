"use strict";

/**
 * Master Canon 0002 — entity relationships (§7).
 */

const ENTITY_RELATION = Object.freeze({
  OWNS: "owns",
  CONTAINS: "contains",
  CREATES: "creates",
  CONTROLS: "controls",
  COMMUNICATES_WITH: "communicates_with",
  OBSERVES: "observes",
  INHERITS_FROM: "inherits_from"
});

function isEntityRelation(value) {
  return typeof value === "string" && Object.values(ENTITY_RELATION).includes(value);
}

/**
 * @param {object} edge
 * @param {string} edge.fromEntityId
 * @param {string} edge.toEntityId
 * @param {string} edge.relation
 * @param {object} [edge.metadata]
 */
function validateEntityRelation(edge = {}) {
  const errors = [];
  const fromEntityId = typeof edge.fromEntityId === "string" ? edge.fromEntityId.trim() : "";
  const toEntityId = typeof edge.toEntityId === "string" ? edge.toEntityId.trim() : "";
  const relation = typeof edge.relation === "string" ? edge.relation.trim() : "";

  if (!fromEntityId) errors.push("missing_fromEntityId");
  if (!toEntityId) errors.push("missing_toEntityId");
  if (!isEntityRelation(relation)) errors.push("invalid_relation");
  if (fromEntityId && toEntityId && fromEntityId === toEntityId) {
    errors.push("self_relation");
  }

  const metadata =
    edge.metadata && typeof edge.metadata === "object" && !Array.isArray(edge.metadata)
      ? { ...edge.metadata }
      : {};

  return {
    ok: errors.length === 0,
    errors,
    normalized:
      errors.length === 0
        ? { fromEntityId, toEntityId, relation, metadata }
        : null
  };
}

module.exports = {
  ENTITY_RELATION,
  isEntityRelation,
  validateEntityRelation
};
