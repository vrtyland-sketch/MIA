"use strict";

/**
 * Master Canon 0002 — entity lifecycle states.
 * Immutable identity after creation; deleted entities stay in archive only.
 */

const ENTITY_LIFECYCLE = Object.freeze({
  CONCEPT: "concept",
  CREATED: "created",
  INITIALIZED: "initialized",
  ACTIVE: "active",
  SUSPENDED: "suspended",
  ARCHIVED: "archived",
  DELETED: "deleted"
});

const ENTITY_LIFECYCLE_ORDER = Object.freeze([
  ENTITY_LIFECYCLE.CONCEPT,
  ENTITY_LIFECYCLE.CREATED,
  ENTITY_LIFECYCLE.INITIALIZED,
  ENTITY_LIFECYCLE.ACTIVE,
  ENTITY_LIFECYCLE.SUSPENDED,
  ENTITY_LIFECYCLE.ARCHIVED,
  ENTITY_LIFECYCLE.DELETED
]);

const TERMINAL_LIFECYCLE = new Set([
  ENTITY_LIFECYCLE.ARCHIVED,
  ENTITY_LIFECYCLE.DELETED
]);

const USABLE_LIFECYCLE = new Set([
  ENTITY_LIFECYCLE.INITIALIZED,
  ENTITY_LIFECYCLE.ACTIVE,
  ENTITY_LIFECYCLE.SUSPENDED
]);

function isEntityLifecycleState(value) {
  return typeof value === "string" && ENTITY_LIFECYCLE_ORDER.includes(value);
}

function isEntityUsable(state) {
  return USABLE_LIFECYCLE.has(state);
}

function isEntityTerminal(state) {
  return TERMINAL_LIFECYCLE.has(state);
}

module.exports = {
  ENTITY_LIFECYCLE,
  ENTITY_LIFECYCLE_ORDER,
  TERMINAL_LIFECYCLE,
  USABLE_LIFECYCLE,
  isEntityLifecycleState,
  isEntityUsable,
  isEntityTerminal
};
