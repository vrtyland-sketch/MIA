"use strict";

/** Resolve live media singleton getter vs legacy snapshot binding. */
function resolveRuntimeGetter(getFn, snapshot) {
  return typeof getFn === "function" ? getFn() : snapshot;
}

module.exports = { resolveRuntimeGetter };
