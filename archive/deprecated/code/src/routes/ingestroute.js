"use strict";

function registerIngestRoute(app, deps) {
  const {
    normalizeEvent,
    applySupportImpact,
    applyCommunityImpact,
    decide,
    buildAction,
    buildMiaResponse,
    setOverlay,
    getOverlaySnapshot,
    getOutputPolicySnapshot,
    canEmitOutput,
    markOutputEmitted,
    createOutputState,
    getStreamStateSnapshot,
    getKojnozoutSnapshot,
    outputState
  } = deps;

  async function handleIngest(req, res) {
    try {
      const query = req.query || {};
      const body = req.body || {};

      console.log("[MIA_INGEST_ROUTE] Incoming request", {
        method: req.method,
        query,
        body
      });

      const normalizedEvent = normalizeEvent(body, query);

      console.log("[MIA_INGEST_ROUTE] Normalized event", normalizedEvent);

      if (!normalizedEvent || !normalizedEvent.eventType || normalizedEvent.eventType === "UNKNOWN") {
        return res.status(400).json({
          ok: false,
          error: "INVALID_EVENT",
          reason: "Event could not be normalized"
        });
      }

      if (normalizedEvent.route === "support" && normalizedEvent.support) {
        applySupportImpact(deps.streamState, normalizedEvent.support);
      }

      if (normalizedEvent.communityImpact) {
        applyCommunityImpact(deps.streamState, normalizedEvent.communityImpact);
      }

      const decision = decide(normalizedEvent);

      console.log("[MIA_INGEST_ROUTE] Decision", decision);

      const action = buildAction(decision, normalizedEvent);

      console.log("[MIA_INGEST_ROUTE] Action", action);

      let miaResponse = null;

      if (decision && decision.mode === "ACT" && decision.recommendedAction) {
        miaResponse = buildMiaResponse({
          route: decision.route,
          decision,
          outputState
        });

        console.log("[MIA_INGEST_ROUTE] MIA response", miaResponse);
      }

      if (miaResponse && miaResponse.overlay) {
        const outputPolicy = getOutputPolicySnapshot(deps.outputPolicyState);
        const gate = canEmitOutput(deps.outputPolicyState);

        console.log("[MIA_INGEST_ROUTE] Output policy", outputPolicy);
        console.log("[MIA_INGEST_ROUTE] Output gate", gate);

        if (gate && gate.allowed) {
          setOverlay(deps.overlayState, miaResponse.overlay);
          markOutputEmitted(deps.outputPolicyState);

          if (outputState) {
            outputState.lastEvent = normalizedEvent;
            outputState.lastOverlay = miaResponse.overlay;
            outputState.lastChatMessage = miaResponse.text || null;
          }
        }
      }

      return res.json({
        ok: true,
        normalizedEvent,
        decision,
        action,
        miaResponse,
        overlay: getOverlaySnapshot(deps.overlayState),
        streamState: getStreamStateSnapshot(deps.streamState),
        kojnozoutState: getKojnozoutSnapshot(deps.kojnozoutState)
      });
    } catch (error) {
      console.error("[MIA_INGEST_ROUTE] ERROR", error);

      return res.status(500).json({
        ok: false,
        error: "INGEST_ROUTE_FAILED",
        message: error.message
      });
    }
  }

  app.post("/ingest", handleIngest);

  app.get("/ingest", (req, res) => {
    return res.json({
      ok: true,
      message: "MIA ingest route is alive. Use POST for event payloads.",
      query: req.query || {}
    });
  });
}

module.exports = {
  registerIngestRoute
};