"use strict";

const fs = require("fs");
const path = require("path");

const TARGET_LINES = 500;
/** Baseline at E5a start — progress measured against this, not live drift. */
const BASELINE_LINES = 3900;

const NEXT_CANDIDATE_HINTS = Object.freeze([
  "collectHealthHost / initHealthRuntime",
  "collectObsBootstrapHost / initObsBootstrapRuntime",
  "collectDeliveryHost / initDeliveryRuntime",
  "collectStreamStateHost / initStreamStateRuntime"
]);

function countLines(filePath) {
  const source = fs.readFileSync(filePath, "utf8");
  if (source.length === 0) return 0;
  return source.split(/\r?\n/).length;
}

function countScriptSafeRequires(source) {
  const matches = source.match(/safeRequire\s*\(\s*["']\.\/scripts\//g);
  return matches ? matches.length : 0;
}

function discoverHostRuntimeCandidates(source) {
  const names = [];
  const re = /function (collect\w+(?:Bindings)?Host|init\w+Runtime)\s*\(/g;
  let m;
  while ((m = re.exec(source)) !== null) {
    names.push(m[1]);
  }
  return names;
}

function getCompositionStatus({ indexPath } = {}) {
  const resolved =
    indexPath && String(indexPath).trim()
      ? path.resolve(indexPath)
      : path.join(__dirname, "..", "..", "index.js");

  const source = fs.readFileSync(resolved, "utf8");
  const indexLines = countLines(resolved);
  const modulesRequiredApprox = countScriptSafeRequires(source);
  const discovered = discoverHostRuntimeCandidates(source);

  const nextCandidates = [];
  for (const hint of NEXT_CANDIDATE_HINTS) {
    const [collectName] = hint.split(" / ");
    if (discovered.includes(collectName)) {
      nextCandidates.push(hint);
    }
  }
  if (nextCandidates.length === 0) {
    nextCandidates.push(...NEXT_CANDIDATE_HINTS.slice(0, 3));
  }

  const span = Math.max(BASELINE_LINES - TARGET_LINES, 1);
  const removed = Math.max(0, BASELINE_LINES - indexLines);
  const progressPct = Math.min(100, Math.round((removed / span) * 100));

  return {
    phase: "E5b",
    indexLines,
    targetLines: TARGET_LINES,
    progressPct,
    modulesRequiredApprox,
    nextCandidates,
    note: "E5b route-context boot shipped; full shrink deferred — thin slices only"
  };
}

module.exports = {
  getCompositionStatus,
  TARGET_LINES,
  BASELINE_LINES
};
