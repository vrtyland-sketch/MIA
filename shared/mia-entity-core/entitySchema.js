"use strict";

/**
 * Master Canon 0002 — mandatory entity fields (§5) + validation.
 */

const { ENTITY_LIFECYCLE, isEntityLifecycleState } = require("./entityLifecycle");
const { ENTITY_CATEGORY, isEntityCategory } = require("./entityCategories");

const REQUIRED_ENTITY_FIELDS = Object.freeze([
  "entityId",
  "entityType",
  "name",
  "createdAt",
  "updatedAt",
  "createdBy",
  "version",
  "state",
  "metadata"
]);

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function normalizeEntityId(value) {
  const id = safeString(value);
  if (!id) return "";
  return id.replace(/\s+/g, ".");
}

function validateEntityRecord(record = {}) {
  const errors = [];
  if (!record || typeof record !== "object") {
    return { ok: false, errors: ["not_an_object"], normalized: null };
  }

  const entityId = normalizeEntityId(record.entityId);
  if (!entityId) errors.push("missing_entityId");

  const entityType = safeString(record.entityType);
  if (!entityType) errors.push("missing_entityType");

  const name = safeString(record.name);
  if (!name) errors.push("missing_name");

  const createdAt = safeString(record.createdAt);
  if (!createdAt) errors.push("missing_createdAt");

  const updatedAt = safeString(record.updatedAt);
  if (!updatedAt) errors.push("missing_updatedAt");

  const createdBy = safeString(record.createdBy);
  if (!createdBy) errors.push("missing_createdBy");

  const version = safeString(record.version);
  if (!version) errors.push("missing_version");

  const state = safeString(record.state);
  if (!isEntityLifecycleState(state)) errors.push("invalid_state");

  const metadata = record.metadata;
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    errors.push("invalid_metadata");
  }

  const category = record.category != null ? safeString(record.category) : "";
  if (category && !isEntityCategory(category)) errors.push("invalid_category");

  const normalized =
    errors.length === 0
      ? {
          entityId,
          entityType,
          name,
          createdAt,
          updatedAt,
          createdBy,
          version,
          state,
          metadata: { ...metadata },
          ...(category ? { category } : {})
        }
      : null;

  return { ok: errors.length === 0, errors, normalized };
}

function createEntityRecord(input = {}) {
  const now = new Date().toISOString();
  const draft = {
    entityId: input.entityId,
    entityType: input.entityType,
    name: input.name,
    createdAt: input.createdAt || now,
    updatedAt: input.updatedAt || input.createdAt || now,
    createdBy: input.createdBy || "system",
    version: input.version || "1.0",
    state: input.state || ENTITY_LIFECYCLE.CREATED,
    metadata: input.metadata && typeof input.metadata === "object" ? input.metadata : {},
    ...(input.category ? { category: input.category } : {})
  };
  return validateEntityRecord(draft);
}

function assertUniqueEntityIds(records = []) {
  const seen = new Set();
  const duplicates = [];
  for (const row of records) {
    const id = normalizeEntityId(row && row.entityId);
    if (!id) continue;
    if (seen.has(id)) duplicates.push(id);
    seen.add(id);
  }
  return { ok: duplicates.length === 0, duplicates, count: seen.size };
}

module.exports = {
  REQUIRED_ENTITY_FIELDS,
  ENTITY_LIFECYCLE,
  ENTITY_CATEGORY,
  normalizeEntityId,
  validateEntityRecord,
  createEntityRecord,
  assertUniqueEntityIds
};
