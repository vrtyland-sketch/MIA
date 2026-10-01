"use strict";

/**
 * Master Canon 0004 — component types (§7).
 */

const COMPONENT_TYPE = Object.freeze({
  RUNTIME: "runtime",
  AI: "ai",
  GRAPHIC: "graphic",
  STREAM: "stream",
  DATA: "data",
  GAME: "game"
});

function isComponentType(value) {
  return typeof value === "string" && Object.values(COMPONENT_TYPE).includes(value);
}

module.exports = {
  COMPONENT_TYPE,
  isComponentType
};
