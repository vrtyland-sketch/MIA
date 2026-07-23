"use strict";

const { resolveLaneFromNormalized } = require("./MIA_INGEST_LANE");

function createEventContext(rawEvent = {}, deps = {}) {
  const {
    normalizeIncomingEvent,
    upper,
    safeString,
    getStreamSession,
    getGiftSupporterProfile,
    getGiftUserLedger,
    getLastGiftMapping,
    getStreamState,
    getOutputState,
    getOverlayState,
    getKojnozoutState,
    getEcosystemState
  } = deps;

  const normalized = normalizeIncomingEvent(rawEvent);
  const eventType = upper(normalized.eventType || normalized.type);
  const lane = resolveLaneFromNormalized(normalized, safeString);

  const ctx = {
    raw: rawEvent,
    normalized,
    eventType,
    route: safeString(normalized.route).toLowerCase() || (lane === "support" ? "support" : "community"),
    lane,
    runtime: {
      streamSession: getStreamSession(),
      giftSupporterProfile: getGiftSupporterProfile(),
      giftUserLedger: getGiftUserLedger(),
      lastGiftMapping: getLastGiftMapping(),
      streamState: getStreamState()
    },
    refs: {
      outputState: getOutputState(),
      overlayState: getOverlayState(),
      kojnozoutState: getKojnozoutState(),
      ecosystemState: getEcosystemState()
    },
    scratch: {
      bowlBeforeImpact: 0,
      runtimeImpact: null,
      shadowResult: null,
      actionResult: null,
      executionResult: null,
      animationTrace: null,
      evolutionMoment: null
    },
    meta: {
      deduped: false,
      commandHandled: false,
      halted: false,
      haltBody: null,
      warnings: []
    },

    applyPatch(patch = {}) {
      if (!patch || typeof patch !== "object") return ctx;
      if (patch.normalized) ctx.normalized = patch.normalized;
      if (patch.runtime && typeof patch.runtime === "object") {
        Object.assign(ctx.runtime, patch.runtime);
      }
      if (patch.scratch && typeof patch.scratch === "object") {
        Object.assign(ctx.scratch, patch.scratch);
      }
      if (patch.meta && typeof patch.meta === "object") {
        Object.assign(ctx.meta, patch.meta);
      }
      return ctx;
    },

    halt(body = {}) {
      ctx.meta.halted = true;
      ctx.meta.haltBody = body;
      return ctx;
    },

    commit(depsCommit) {
      const d = depsCommit || deps;
      if (typeof d.setStreamSession === "function") {
        d.setStreamSession(ctx.runtime.streamSession);
      }
      if (typeof d.setGiftSupporterProfile === "function") {
        d.setGiftSupporterProfile(ctx.runtime.giftSupporterProfile);
      }
      if (typeof d.setGiftUserLedger === "function") {
        d.setGiftUserLedger(ctx.runtime.giftUserLedger);
      }
      if (typeof d.setLastGiftMapping === "function") {
        d.setLastGiftMapping(ctx.runtime.lastGiftMapping);
      }
      if (typeof d.setStreamState === "function") {
        d.setStreamState(ctx.runtime.streamState);
      }
      return ctx;
    },

    buildOkResponse() {
      const { shadowResult, actionResult, executionResult, animationTrace, evolutionMoment } =
        ctx.scratch;

      return {
        status: 200,
        body: {
          ok: true,
          runtime: { selectedRuntime: "MIA_NEXT" },
          normalizedEvent: ctx.normalized,
          lane: ctx.lane,
          decision: shadowResult?.decisionResult ||
            shadowResult?.decision ||
            { source: "fallback", eventType: ctx.eventType },
          actionResult,
          executionResult,
          overlayEmit: executionResult?.overlay || {
            emitted: false,
            reason: "no_overlay"
          },
          videoResult: executionResult?.video || {
            ok: true,
            skipped: true,
            reason: "no_video"
          },
          animationTrace,
          evolutionMoment
        }
      };
    },

    buildDedupeResponse(eventId = null) {
      return {
        status: 200,
        body: {
          ok: true,
          accepted: true,
          deduped: true,
          reason: "duplicate_ingest_within_window",
          eventId
        }
      };
    }
  };

  ctx.scratch.bowlBeforeImpact = Number(ctx.refs.kojnozoutState?.bowlPercent ?? 0);

  return ctx;
}

module.exports = { createEventContext };
