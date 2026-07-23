"use strict";

const { createEventContext } = require("./MIA_EVENT_CONTEXT");
const {
  createCommandRegistry,
  buildDefaultCommandHandlers
} = require("./MIA_COMMAND_REGISTRY");
const { runEventPipeline } = require("./pipeline/run");

/**
 * Hlavní ingest orchestrátor — fázový pipeline s EventContext.
 */

function createEventPipeline(deps = {}) {
  const commandHandlers = buildDefaultCommandHandlers(deps).filter(
    (h) => typeof h.handle === "function"
  );
  const commandRegistry = createCommandRegistry(commandHandlers);
  const pipelineDeps = { ...deps, commandRegistry };

  async function processEvent(rawEvent = {}) {
    const ctx = createEventContext(rawEvent, deps);
    return runEventPipeline(ctx, pipelineDeps);
  }

  return { processEvent, commandRegistry };
}

module.exports = { createEventPipeline };
