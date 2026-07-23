"use strict";

/**
 * Jednotná brána chat příkazů — nahrazuje sérii tryHandle* s early return.
 */

function createCommandRegistry(handlers = []) {
  const list = Array.isArray(handlers) ? handlers.filter(Boolean) : [];

  async function runCommandGate(ctx, deps = {}) {
    const writeLog =
      typeof deps.writeLog === "function" ? deps.writeLog : () => {};

    if (ctx.eventType !== "COMMENT") {
      return { handled: false };
    }

    for (const handler of list) {
      if (typeof handler.handle !== "function") continue;

      let matched = true;
      if (typeof handler.match === "function") {
        try {
          matched = Boolean(await handler.match(ctx, deps));
        } catch (err) {
          writeLog("mia-errors", {
            source: "command_registry_match",
            handler: handler.id || "unknown",
            error: err.message
          });
          matched = false;
        }
      }

      if (!matched) continue;

      try {
        const result = await handler.handle(ctx, deps);
        if (result?.handled) {
          ctx.meta.commandHandled = true;
          ctx.meta.commandId = handler.id || null;
          if (result.continueToShadow !== true) {
            ctx.halt(result.body || { ok: true, handled: true });
          }
          return {
            handled: true,
            continueToShadow: result.continueToShadow === true,
            handlerId: handler.id || null
          };
        }
      } catch (err) {
        writeLog("mia-errors", {
          source: handler.errorSource || handler.id || "command_registry",
          error: err.message
        });
      }
    }

    return { handled: false };
  }

  return { runCommandGate, handlers: list };
}

function buildDefaultCommandHandlers(deps = {}) {
  const entries = [
    {
      id: "koj_care",
      errorSource: "kojnozout_side_command",
      fn: deps.tryHandleKojnozoutCommands
    },
    {
      id: "koj_showcase",
      errorSource: "koj_state_showcase",
      fn: deps.tryHandleKojStateShowcaseCommand
    },
    {
      id: "streamer_showcase",
      errorSource: "streamer_showcase",
      fn: deps.tryHandleStreamerShowcaseCommand
    },
    {
      id: "streamer_media",
      errorSource: "streamer_media_command",
      fn: deps.tryHandleStreamerMediaCommand
    },
    {
      id: "capybara_waiting",
      errorSource: "capybara_waiting_comment",
      fn: deps.tryHandleCapybaraWaitingComment
    }
  ];

  return entries
    .filter((entry) => typeof entry.fn === "function")
    .map((entry) => ({
      id: entry.id,
      errorSource: entry.errorSource,
      handle: async (ctx) => entry.fn(ctx.normalized)
    }));
}

module.exports = {
  createCommandRegistry,
  buildDefaultCommandHandlers
};
