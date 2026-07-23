"use strict";

/**
 * Streamer boss media chat commands — gated playback with ack/reject overlays.
 */

function createStreamerMediaRuntime(deps = {}) {
  const {
    streamerMediaCommandModule,
    streamerAccessModule,
    safeString,
    getUserLabel,
    videoEngine,
    getOutputState,
    runtimeConfig,
    mediaCatalogModule,
    executeOverlay,
    maybeDeliverMiaVoice,
    ecosystemState,
    getEcosystemState,
    streamState,
    getStreamState,
    soloStreamModule,
    writeLog
  } = deps;

  function resolveEcosystemState() {
    if (typeof getEcosystemState === "function") return getEcosystemState();
    return ecosystemState || {};
  }

  function resolveStreamState() {
    if (typeof getStreamState === "function") return getStreamState();
    if (typeof streamState === "function") return streamState();
    return streamState || {};
  }

  function readNormalizedMessage(normalized = {}) {
    return safeString(
      normalized.message ||
        normalized.comment ||
        normalized.content ||
        normalized.text
    );
  }

  async function tryHandleStreamerMediaCommand(normalized = {}) {
    if (typeof streamerMediaCommandModule?.parseStreamerMediaCommand !== "function") {
      return null;
    }

    const parsed = streamerMediaCommandModule.parseStreamerMediaCommand(
      readNormalizedMessage(normalized)
    );
    if (!parsed) return null;

    const userLabel = getUserLabel(normalized);
    const outputState = typeof getOutputState === "function" ? getOutputState() : {};
    const videoSnapshot =
      videoEngine && typeof videoEngine.getSnapshot === "function"
        ? videoEngine.getSnapshot()
        : {};

    const gate =
      typeof streamerMediaCommandModule.canPlayNow === "function"
        ? streamerMediaCommandModule.canPlayNow(outputState, videoSnapshot)
        : { ok: true };

    const access =
      typeof streamerAccessModule?.resolveStreamerAccess === "function"
        ? streamerAccessModule.resolveStreamerAccess(userLabel, runtimeConfig)
        : { isStreamerBoss: false };

    if (!access.isStreamerBoss) {
      const overlay = streamerMediaCommandModule.buildRejectOverlay("streamer_only", userLabel);
      await executeOverlay(overlay, { source: "streamer_media_command" });
      return {
        handled: true,
        body: { ok: true, handled: true, rejected: "streamer_only" }
      };
    }

    if (!gate.ok) {
      const overlay = streamerMediaCommandModule.buildRejectOverlay(gate.reason, userLabel);
      await executeOverlay(overlay, { source: "streamer_media_command" });
      return {
        handled: true,
        body: { ok: true, handled: true, rejected: gate.reason }
      };
    }

    const catalog =
      typeof mediaCatalogModule?.loadCatalog === "function"
        ? mediaCatalogModule.loadCatalog()
        : null;
    const media =
      typeof streamerMediaCommandModule.pickRotatedMedia === "function"
        ? streamerMediaCommandModule.pickRotatedMedia(catalog, parsed.kind, outputState)
        : null;

    if (!media?.abs) {
      const overlay = streamerMediaCommandModule.buildRejectOverlay("no_media", userLabel);
      await executeOverlay(overlay, { source: "streamer_media_command" });
      return {
        handled: true,
        body: { ok: true, handled: true, rejected: "no_media" }
      };
    }

    const ack = streamerMediaCommandModule.buildAckOverlay(parsed.kind, media, userLabel);
    await executeOverlay(ack, { source: "streamer_media_command", force: false, priority: 3 });
    await maybeDeliverMiaVoice({
      ok: true,
      route: "community",
      overlayPayload: ack,
      speech_text: ack.text,
      responseContract: { speaker: "mia", intent: "streamer_media_ack" }
    });

    void streamerMediaCommandModule
      .executeStreamerMediaPlay({
        parsed,
        normalized,
        media,
        outputState,
        runtimeConfig,
        ecosystemState: resolveEcosystemState(),
        streamState: resolveStreamState(),
        soloStreamModule,
        videoEngine,
        writeLog
      })
      .then(async (result) => {
        if (result?.ok) {
          return;
        }

        const rejectReason =
          result?.reason === "forced_source_not_found"
            ? "forced_source_not_found"
            : result?.reason === "obs_unavailable"
              ? "obs_unavailable"
              : result?.reason === "cooldown" || result?.reason === "video_busy"
                ? result.reason
                : "playback_failed";

        const overlay = streamerMediaCommandModule.buildRejectOverlay(rejectReason, userLabel);
        await executeOverlay(overlay, { source: "streamer_media_command" });
        await maybeDeliverMiaVoice({
          ok: true,
          route: "community",
          overlayPayload: overlay,
          speech_text: overlay.text,
          responseContract: { speaker: "mia", intent: "streamer_media_reject" }
        });
      })
      .catch((err) => {
        writeLog("mia-errors", {
          source: "streamer_media_play_async",
          error: err.message
        });
      });

    return {
      handled: true,
      body: {
        ok: true,
        handled: true,
        kind: parsed.kind,
        media: {
          rel: media.rel,
          durationMs: media.durationMs,
          contentKind: media.contentKind
        },
        queued: true
      }
    };
  }

  return { tryHandleStreamerMediaCommand };
}

module.exports = { createStreamerMediaRuntime };
