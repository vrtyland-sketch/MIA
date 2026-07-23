"use strict";

async function phaseCommandGate(ctx, deps) {
  if (ctx.meta.halted) return ctx;

  const commandRegistry = deps.commandRegistry;
  if (!commandRegistry || typeof commandRegistry.runCommandGate !== "function") {
    return ctx;
  }

  await commandRegistry.runCommandGate(ctx, deps);
  return ctx;
}

module.exports = { phaseCommandGate };
