"use strict";

/**
 * Master Canon 0004 — dependency graph validation (§13).
 */

function buildDependencyGraph(components = []) {
  const graph = new Map();
  for (const row of components) {
    if (!row || !row.componentId) continue;
    graph.set(row.componentId, normalizeStringList(row.dependencies));
  }
  return graph;
}

function normalizeStringList(values) {
  if (!Array.isArray(values)) return [];
  return values.map((v) => String(v || "").trim()).filter(Boolean);
}

function assertAcyclicDependencies(components = []) {
  const graph = buildDependencyGraph(components);
  const visiting = new Set();
  const visited = new Set();
  const cycle = [];

  function dfs(node, stack) {
    if (visiting.has(node)) {
      cycle.push(...stack.slice(stack.indexOf(node)), node);
      return false;
    }
    if (visited.has(node)) return true;

    visiting.add(node);
    stack.push(node);

    const deps = graph.get(node) || [];
    for (const dep of deps) {
      if (!graph.has(dep)) continue;
      if (!dfs(dep, stack)) return false;
    }

    stack.pop();
    visiting.delete(node);
    visited.add(node);
    return true;
  }

  for (const node of graph.keys()) {
    if (!dfs(node, [])) {
      return { ok: false, cycle: [...new Set(cycle)] };
    }
  }

  return { ok: true, cycle: [] };
}

module.exports = {
  buildDependencyGraph,
  assertAcyclicDependencies
};
