"use strict";

/**
 * Stream/gift session state accessors — stream session, ledger, mapping, streamState.
 */

function createStreamStateRuntime(deps = {}) {
  const {
    streamSessionModule,
    giftUserLedgerModule,
    giftSupporterProfileModule,
    streamStateModule,
    mediaCatalogModule,
    writeLog,
    serverStartedAt = Date.now()
  } = deps;

  let streamSession =
    typeof streamSessionModule?.createStreamSession === "function"
      ? streamSessionModule.createStreamSession()
      : { phase: "PRELIVE", startedAt: serverStartedAt };

  let giftUserLedger =
    typeof giftUserLedgerModule?.createGiftUserLedger === "function"
      ? giftUserLedgerModule.createGiftUserLedger()
      : { entries: [] };

  let giftSupporterProfile =
    typeof giftSupporterProfileModule?.createGiftSupporterProfile === "function"
      ? giftSupporterProfileModule.createGiftSupporterProfile()
      : { supporters: {} };

  let lastGiftMapping = null;

  let streamState =
    typeof streamStateModule?.createStreamState === "function"
      ? streamStateModule.createStreamState()
      : {};

  let obsSourceAudioMapCache = null;

  function getStreamSession() {
    return streamSession;
  }

  function setStreamSession(next) {
    if (next && typeof next === "object") {
      streamSession = next;
    }
    return streamSession;
  }

  function markStreamSessionEnded(reason = "shutdown") {
    if (typeof streamSessionModule?.markEnded !== "function") {
      return streamSession;
    }
    streamSession = streamSessionModule.markEnded(streamSession, reason);
    if (typeof writeLog === "function") {
      writeLog("mia-events", {
        stage: "stream_session_end",
        reason,
        phase: streamSession?.phase || "ENDED"
      });
    }
    return streamSession;
  }

  function getGiftSupporterProfile() {
    return giftSupporterProfile;
  }

  function setGiftSupporterProfile(next) {
    if (next && typeof next === "object") {
      giftSupporterProfile = next;
    }
    return giftSupporterProfile;
  }

  function getGiftUserLedger() {
    return giftUserLedger;
  }

  function setGiftUserLedger(next) {
    giftUserLedger = next;
    return giftUserLedger;
  }

  function getLastGiftMapping() {
    return lastGiftMapping;
  }

  function setLastGiftMapping(next) {
    lastGiftMapping = next;
    return lastGiftMapping;
  }

  function getStreamState() {
    return streamState;
  }

  function setStreamState(next) {
    if (next && typeof next === "object") {
      streamState = next;
    }
    return streamState;
  }

  function getObsSourceAudioMap() {
    if (obsSourceAudioMapCache) {
      return obsSourceAudioMapCache;
    }

    const catalog =
      typeof mediaCatalogModule?.loadCatalog === "function"
        ? mediaCatalogModule.loadCatalog()
        : null;

    obsSourceAudioMapCache =
      typeof mediaCatalogModule?.buildObsSourceAudioMap === "function"
        ? mediaCatalogModule.buildObsSourceAudioMap(catalog)
        : {};

    return obsSourceAudioMapCache;
  }

  return {
    getServerStartedAt: () => serverStartedAt,
    getStreamSession,
    setStreamSession,
    markStreamSessionEnded,
    getGiftSupporterProfile,
    setGiftSupporterProfile,
    getGiftUserLedger,
    setGiftUserLedger,
    getLastGiftMapping,
    setLastGiftMapping,
    getStreamState,
    setStreamState,
    getObsSourceAudioMap
  };
}

module.exports = { createStreamStateRuntime };
