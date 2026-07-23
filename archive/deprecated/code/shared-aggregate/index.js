"use strict";

const { createGreetingAggregator } = require("../../scripts/MIA_GREETING_AGGREGATOR");
const { createCareAggregator } = require("./modules/care");

function createAggregateModules(deps = {}) {
  const nowTs = typeof deps.nowTs === "function" ? deps.nowTs : () => Date.now();
  const appendJsonLog =
    typeof deps.appendJsonLog === "function" ? deps.appendJsonLog : () => {};

  const greetingAggregator = createGreetingAggregator({
    nowTs,
    appendJsonLog,
    windowMs: deps?.runtimeConfig?.aggregate?.greetingWindowMs,
    maxBuffer: deps?.runtimeConfig?.aggregate?.greetingMaxBuffer
  });

  const careAggregator = createCareAggregator({
    nowTs,
    appendJsonLog,
    windowMs: deps?.runtimeConfig?.aggregate?.careWindowMs,
    maxBuffer: deps?.runtimeConfig?.aggregate?.careMaxBuffer
  });

  const modules = [
    {
      key: "greeting",
      aggregator: greetingAggregator
    },
    {
      key: "care",
      aggregator: careAggregator
    }
  ];

  async function processEvent(context = {}) {
    const normalizedEvent = context?.normalizedEvent;

    if (!normalizedEvent || typeof normalizedEvent !== "object") {
      return buildResult({
        handled: false,
        passthroughEvents: [],
        meta: {
          aggregateType: "none",
          mode: "missing_normalized_event"
        },
        snapshots: getModuleSnapshots(modules)
      });
    }

    const overlaysToEmit = [];
    const syntheticEvents = [];

    for (const moduleEntry of modules) {
      const captureResult = moduleEntry.aggregator.capture(normalizedEvent);

      if (captureResult?.captured) {
        if (moduleEntry.aggregator.shouldFlush()) {
          const flushResult = moduleEntry.aggregator.flush();

          if (flushResult?.overlayPayload) {
            overlaysToEmit.push(flushResult.overlayPayload);
          }

          if (Array.isArray(flushResult?.syntheticEvents)) {
            syntheticEvents.push(...flushResult.syntheticEvents.filter(Boolean));
          }

          return buildResult({
            handled: true,
            passthroughEvents: [],
            overlayPayloads: overlaysToEmit,
            syntheticEvents,
            meta: {
              aggregateType: moduleEntry.key,
              mode: "capture_and_flush",
              captureResult,
              flushResult
            },
            snapshots: getModuleSnapshots(modules)
          });
        }

        return buildResult({
          handled: true,
          passthroughEvents: [],
          meta: {
            aggregateType: moduleEntry.key,
            mode: "captured_waiting",
            captureResult
          },
          snapshots: getModuleSnapshots(modules)
        });
      }
    }

    for (const moduleEntry of modules) {
      if (moduleEntry.aggregator.shouldFlush()) {
        const flushResult = moduleEntry.aggregator.flush();

        if (flushResult?.overlayPayload) {
          overlaysToEmit.push(flushResult.overlayPayload);
        }

        if (Array.isArray(flushResult?.syntheticEvents)) {
          syntheticEvents.push(...flushResult.syntheticEvents.filter(Boolean));
        }
      }
    }

    return buildResult({
      handled: false,
      passthroughEvents: [normalizedEvent],
      overlayPayloads: overlaysToEmit,
      syntheticEvents,
      meta: {
        aggregateType: overlaysToEmit.length > 0 || syntheticEvents.length > 0
          ? "flush_on_followup"
          : "none",
        mode: overlaysToEmit.length > 0 || syntheticEvents.length > 0
          ? "flush_on_followup"
          : "passthrough"
      },
      snapshots: getModuleSnapshots(modules)
    });
  }

  function getSnapshot() {
    return {
      ok: true,
      modules: getModuleSnapshots(modules)
    };
  }

  return {
    processEvent,
    getSnapshot
  };
}

function getModuleSnapshots(modules) {
  const out = {};

  for (const moduleEntry of modules) {
    out[moduleEntry.key] =
      typeof moduleEntry.aggregator?.getSnapshot === "function"
        ? moduleEntry.aggregator.getSnapshot()
        : {};
  }

  return out;
}

function buildResult(input = {}) {
  return {
    ok: true,
    handled: Boolean(input.handled),
    passthroughEvents: Array.isArray(input.passthroughEvents)
      ? input.passthroughEvents
      : [],
    syntheticEvents: Array.isArray(input.syntheticEvents)
      ? input.syntheticEvents
      : [],
    overlayPayloads: Array.isArray(input.overlayPayloads)
      ? input.overlayPayloads
      : [],
    actionResults: Array.isArray(input.actionResults)
      ? input.actionResults
      : [],
    meta: input.meta || {},
    snapshot: input.snapshots || {}
  };
}

module.exports = {
  createAggregateModules
};