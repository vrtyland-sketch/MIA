"use strict";

/**
 * Public tělo pro GET /overlay-state — sestavení snapshotu + kánon sanitizace.
 * Overlay nikdy neexpozuje coins/hodnotu giftů — jen MIA body (miaPoints).
 */

const PUBLIC_OVERLAY_FORBIDDEN_KEYS = new Set([
  "giftvalue",
  "coins",
  "totalcoins",
  "lastcoins",
  "rawvalue",
  "totalfedcoins",
  "coinsbucket",
  "diamonds",
  "diamondcount",
  "coinvalue",
  "coin_value",
  "valuecoins",
  "diamondvalue"
]);

function stripValueFieldsForPublic(value) {
  if (Array.isArray(value)) {
    return value.map((item) => stripValueFieldsForPublic(item));
  }
  if (value && typeof value === "object") {
    const out = {};
    for (const key of Object.keys(value)) {
      if (PUBLIC_OVERLAY_FORBIDDEN_KEYS.has(key.toLowerCase())) continue;
      out[key] = stripValueFieldsForPublic(value[key]);
    }
    return out;
  }
  return value;
}

/** Veřejný / admin-safe Koj snapshot — stejný strip jako /overlay-state. */
function getPublicKojSnapshot(rawSnapshot) {
  if (!rawSnapshot || typeof rawSnapshot !== "object") {
    return {};
  }
  return stripValueFieldsForPublic(rawSnapshot);
}

function createOverlayPublicResponse(deps = {}) {
  const {
    cloneJson,
    overlayStateModule,
    getOverlayState,
    kojnozoutModule,
    getKojnozoutStateForSnapshot,
    getKojnozoutState,
    streamState,
    getStreamState,
    kojnozoutDuelModule,
    getDuelState,
    kojnozoutBackpackModule,
    getBackpackState,
    kojnozoutItemCommandModule,
    getItemDisplayState,
    setItemDisplayState,
    videoEngine,
    spamSessionEngine,
    careOpportunitiesModule,
    kojnozoutBondModule,
    platformArenaModule,
    getArenaState,
    kojDisplayModule,
    giftUserLedgerModule,
    getGiftUserLedger,
    capybaraFlowModule,
    getOutputState,
    giftSupporterProfileModule,
    getGiftSupporterProfile,
    kojnozoutVitalsModule,
    ecosystemOrchestratorModule,
    getEcosystemState,
    runtimeConfig,
    obsConnected,
    getVoicePlaybackSnapshot,
    translationRuntime,
    getVoicePlaybackSeq,
    getVoiceSpeakQueueLength,
    getOverlayLastAcceptedAt,
    getOutputLastStreamerMediaAt
  } = deps;

  function buildOverlayStateCacheKey() {
    const videoSnap =
      videoEngine && typeof videoEngine.getSnapshot === "function"
        ? videoEngine.getSnapshot()
        : {};
    return [
      typeof getVoicePlaybackSeq === "function" ? getVoicePlaybackSeq() : 0,
      typeof getVoiceSpeakQueueLength === "function" ? getVoiceSpeakQueueLength() : 0,
      typeof getOverlayLastAcceptedAt === "function" ? getOverlayLastAcceptedAt() : 0,
      typeof getOutputLastStreamerMediaAt === "function" ? getOutputLastStreamerMediaAt() : 0,
      videoSnap?.currentPlayback?.playbackId || "",
      videoSnap?.processing ? "1" : "0"
    ].join("|");
  }

  function buildPublicOverlayStateResponse() {
    const overlayState = typeof getOverlayState === "function" ? getOverlayState() : {};
    const kojnozoutState = typeof getKojnozoutState === "function" ? getKojnozoutState() : {};
    const kojnozoutDuelState = typeof getDuelState === "function" ? getDuelState() : null;
    const kojnozoutBackpackState =
      typeof getBackpackState === "function" ? getBackpackState() : null;
    const platformArenaState = typeof getArenaState === "function" ? getArenaState() : null;
    const outputState = typeof getOutputState === "function" ? getOutputState() : {};
    const ecosystemState =
      typeof getEcosystemState === "function" ? getEcosystemState() : null;
    const giftUserLedger =
      typeof getGiftUserLedger === "function" ? getGiftUserLedger() : null;
    const giftSupporterProfile =
      typeof getGiftSupporterProfile === "function" ? getGiftSupporterProfile() : null;
    const liveStreamState =
      typeof getStreamState === "function"
        ? getStreamState()
        : streamState || {};

    const snapshot =
      typeof overlayStateModule.getOverlaySnapshot === "function"
        ? overlayStateModule.getOverlaySnapshot(overlayState, {
            maxChatFeedItems: runtimeConfig?.overlay?.maxChatFeedItems || 6,
            chatFeedMaxAgeMs: runtimeConfig?.overlay?.chatFeedMaxAgeMs || 15000
          })
        : overlayState;

    const kojnozoutSnapshot =
      typeof kojnozoutModule.getKojnozoutSnapshot === "function"
        ? kojnozoutModule.getKojnozoutSnapshot(
            typeof getKojnozoutStateForSnapshot === "function"
              ? getKojnozoutStateForSnapshot()
              : kojnozoutState,
            liveStreamState
          )
        : typeof cloneJson === "function"
          ? cloneJson(kojnozoutState, kojnozoutState)
          : kojnozoutState;

    const duelSnapshot =
      typeof kojnozoutDuelModule.getDuelSnapshot === "function"
        ? kojnozoutDuelModule.getDuelSnapshot(kojnozoutDuelState)
        : null;

    const backpackSnapshot =
      typeof kojnozoutBackpackModule.getBackpackSnapshot === "function"
        ? kojnozoutBackpackModule.getBackpackSnapshot(kojnozoutBackpackState)
        : null;

    if (
      backpackSnapshot &&
      typeof kojnozoutItemCommandModule.resolveCurrentDisplay === "function" &&
      typeof getItemDisplayState === "function" &&
      typeof setItemDisplayState === "function"
    ) {
      const nextDisplay = kojnozoutItemCommandModule.resolveCurrentDisplay(
        getItemDisplayState(),
        kojnozoutBackpackState
      );
      setItemDisplayState(nextDisplay);
      backpackSnapshot.display =
        typeof kojnozoutItemCommandModule.getItemDisplaySnapshot === "function"
          ? kojnozoutItemCommandModule.getItemDisplaySnapshot(
              nextDisplay,
              kojnozoutBackpackState
            )
          : null;
    }

    const videoSnapshot =
      videoEngine && typeof videoEngine.getSnapshot === "function"
        ? videoEngine.getSnapshot()
        : {};

    const spamSession =
      typeof spamSessionEngine.getSpamSessionState === "function"
        ? spamSessionEngine.getSpamSessionState()
        : null;

    const careOpportunities =
      typeof careOpportunitiesModule.buildCareOpportunities === "function"
        ? careOpportunitiesModule.buildCareOpportunities({
            kojnozoutState: kojnozoutSnapshot,
            backpackState: kojnozoutBackpackState,
            duelState: kojnozoutDuelState
          })
        : null;

    const bondSnapshot =
      typeof kojnozoutBondModule.getBondSnapshot === "function"
        ? kojnozoutBondModule.getBondSnapshot(kojnozoutSnapshot)
        : null;

    const arenaSnapForPose =
      platformArenaState && typeof platformArenaModule.getArenaSnapshot === "function"
        ? platformArenaModule.getArenaSnapshot(platformArenaState)
        : null;

    const kojDisplay =
      typeof kojDisplayModule.buildKojDisplaySnapshot === "function"
        ? kojDisplayModule.buildKojDisplaySnapshot(
            kojnozoutSnapshot,
            careOpportunities || {},
            Date.now(),
            {
              video: videoSnapshot,
              duel: duelSnapshot,
              comboMoment: snapshot.comboMoment || null,
              bossCinematic: snapshot.bossCinematic || null,
              t0Flyby: snapshot.t0Flyby || null,
              storyVisual: snapshot.storyVisual || null,
              giftVisual: snapshot.giftVisual || null,
              animationReaction: snapshot.animationReaction || null,
              communityMood: snapshot.communityMood || null,
              spamSession,
              arena: arenaSnapForPose
            }
          )
        : null;

    const giftLedgerSnapshot =
      typeof giftUserLedgerModule.getGiftUserLedgerSnapshot === "function"
        ? giftUserLedgerModule.getGiftUserLedgerSnapshot(giftUserLedger, {
            limit: runtimeConfig?.overlay?.maxGiftLedgerEntries || 24,
            maxAgeMs: runtimeConfig?.overlay?.giftLedgerMaxAgeMs || 1800000
          })
        : null;

    const body = stripValueFieldsForPublic({
      ...snapshot,
      recentGifts: giftLedgerSnapshot?.entries || [],
      giftLedger: giftLedgerSnapshot,
      capybaraFlow:
        typeof capybaraFlowModule.getCapybaraSnapshot === "function"
          ? capybaraFlowModule.getCapybaraSnapshot(outputState)
          : null,
      giftEconomy:
        typeof giftSupporterProfileModule.getSupporterSnapshot === "function"
          ? giftSupporterProfileModule.getSupporterSnapshot(giftSupporterProfile)
          : null,
      kojnozoutState: kojnozoutSnapshot,
      streamState:
        typeof cloneJson === "function"
          ? cloneJson(liveStreamState, liveStreamState)
          : liveStreamState,
      spamSession,
      duel: duelSnapshot,
      arena: arenaSnapForPose,
      backpack: backpackSnapshot,
      careOpportunities: careOpportunities
        ? {
            need: careOpportunities.need,
            needLabel: careOpportunities.needLabel,
            needEmoji: careOpportunities.needEmoji,
            needDescription: careOpportunities.needDescription,
            behaviorHint: careOpportunities.behaviorHint,
            options: careOpportunities.options,
            quest: careOpportunities.quest,
            hunger: careOpportunities.hunger,
            bowlPercent: careOpportunities.bowlPercent,
            bond: careOpportunities.bond || bondSnapshot
          }
        : null,
      kojDisplay,
      bond: bondSnapshot,
      vitalsSummary:
        typeof kojnozoutVitalsModule.describeVitals === "function"
          ? kojnozoutVitalsModule.describeVitals(kojnozoutSnapshot)
          : null,
      video: videoSnapshot,
      ecosystem:
        typeof ecosystemOrchestratorModule.getEcosystemSnapshot === "function"
          ? ecosystemOrchestratorModule.getEcosystemSnapshot(ecosystemState, runtimeConfig)
          : null,
      obsConnected,
      voicePlayback:
        typeof getVoicePlaybackSnapshot === "function" ? getVoicePlaybackSnapshot() : null,
      liveCaption:
        typeof translationRuntime?.getLiveCaption === "function"
          ? translationRuntime.getLiveCaption()
          : null,
      interpreter:
        typeof translationRuntime?.getState === "function"
          ? {
              enabled: translationRuntime.isInterpreterEnabled?.() !== false,
              duel: Boolean(kojnozoutDuelState?.active),
              foreignLang: translationRuntime.getState()?.lastForeignLanguage || "en",
              roles: translationRuntime.getState()?.roles || null
            }
          : null,
      ui: {
        miaBubbleEnabled: !Boolean(
          runtimeConfig?.tts?.enabled && runtimeConfig?.outputPolicy?.ttsEnabled
        ),
        speechOwners: ["kojnozout"]
      },
      theme: (() => {
        try {
          const themeManager = require("../core/theme-manager");
          return themeManager.getOverlayThemeHint(runtimeConfig || {});
        } catch (_err) {
          return { enabled: false, id: "cyber", cssVars: null };
        }
      })(),
      updatedAt: Date.now()
    });

    try {
      const bodyLiveSync = require("../shared/mia-graphics-studio/bodyLiveSync");
      if (typeof bodyLiveSync.syncFromOverlayPublic === "function") {
        bodyLiveSync.syncFromOverlayPublic(body);
      }
    } catch (_err) {
      // Graphics studio optional during bootstrap/tests without full module graph.
    }

    return body;
  }

  return {
    buildOverlayStateCacheKey,
    buildPublicOverlayStateResponse,
    stripValueFieldsForPublic
  };
}

module.exports = {
  PUBLIC_OVERLAY_FORBIDDEN_KEYS,
  stripValueFieldsForPublic,
  getPublicKojSnapshot,
  createOverlayPublicResponse
};
