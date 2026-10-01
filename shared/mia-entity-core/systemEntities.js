"use strict";

const { ENTITY_LIFECYCLE } = require("./entityLifecycle");
const { ENTITY_CATEGORY } = require("./entityCategories");
const { createEntityRecord } = require("./entitySchema");
const { ENTITY_RELATION } = require("./entityRelations");

const CANON_VERSION = "1.0";

function defineSystemEntity(input) {
  const result = createEntityRecord({
    ...input,
    createdBy: input.createdBy || "master-canon",
    version: input.version || CANON_VERSION,
    state: input.state || ENTITY_LIFECYCLE.ACTIVE
  });
  if (!result.ok) {
    throw new Error(`invalid system entity ${input.entityId}: ${result.errors.join(",")}`);
  }
  return result.normalized;
}

/** Canonical registry — unique entityId per Master Canon §3. */
const SYSTEM_ENTITY_REGISTRY = Object.freeze(
  [
    defineSystemEntity({
      entityId: "mia.main",
      entityType: "ai.speaker",
      category: ENTITY_CATEGORY.AI,
      name: "MIA",
      metadata: { role: "primary_speaker", overlay: "speech-overlay.html" }
    }),
    defineSystemEntity({
      entityId: "kojnozout.pet",
      entityType: "game.pet",
      category: ENTITY_CATEGORY.GAME,
      name: "Kojnožrout",
      metadata: { role: "community_pet", canon: "KOJNOZROUT_KANON.md" }
    }),
    defineSystemEntity({
      entityId: "runtime.stream",
      entityType: "system.runtime",
      category: ENTITY_CATEGORY.SYSTEM,
      name: "Stream Runtime",
      metadata: { entry: "index.js", mode: "stream" }
    }),
    defineSystemEntity({
      entityId: "runtime.memory",
      entityType: "system.memory",
      category: ENTITY_CATEGORY.SYSTEM,
      name: "Memory Engine",
      metadata: { stores: ["session", "lexicon", "story"] }
    }),
    defineSystemEntity({
      entityId: "graphics.body",
      entityType: "graphic.avatar",
      category: ENTITY_CATEGORY.GRAPHIC,
      name: "MIA Body Parts",
      metadata: { package: "mia-graphics-studio", layout: "hero" }
    }),
    defineSystemEntity({
      entityId: "graphics.animation_bank",
      entityType: "graphic.animation_bank",
      category: ENTITY_CATEGORY.GRAPHIC,
      name: "Animation Bank",
      metadata: { package: "mia-animation-engine" }
    })
  ].reduce((acc, row) => {
    acc[row.entityId] = row;
    return acc;
  }, {})
);

/** Documented runtime relations — audit trail anchor (§7). */
const CANON_ENTITY_RELATIONS = Object.freeze([
  {
    fromEntityId: "mia.main",
    toEntityId: "graphics.body",
    relation: ENTITY_RELATION.CONTROLS,
    metadata: { via: "MIA_OBS_OVERLAY_SYNC" }
  },
  {
    fromEntityId: "mia.main",
    toEntityId: "kojnozout.pet",
    relation: ENTITY_RELATION.COMMUNICATES_WITH,
    metadata: { via: "speaker_routing" }
  },
  {
    fromEntityId: "kojnozout.pet",
    toEntityId: "graphics.animation_bank",
    relation: ENTITY_RELATION.INHERITS_FROM,
    metadata: { via: "kojnozrout/moods" }
  },
  {
    fromEntityId: "runtime.stream",
    toEntityId: "mia.main",
    relation: ENTITY_RELATION.CONTAINS,
    metadata: { via: "shadow_pipeline" }
  },
  {
    fromEntityId: "runtime.memory",
    toEntityId: "mia.main",
    relation: ENTITY_RELATION.OBSERVES,
    metadata: { via: "data/mia-session-memory.json" }
  }
]);

function getSystemEntity(entityId) {
  return SYSTEM_ENTITY_REGISTRY[entityId] || null;
}

function listSystemEntities() {
  return Object.values(SYSTEM_ENTITY_REGISTRY);
}

module.exports = {
  CANON_VERSION,
  SYSTEM_ENTITY_REGISTRY,
  CANON_ENTITY_RELATIONS,
  getSystemEntity,
  listSystemEntities
};
