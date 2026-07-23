"use strict";

/**
 * Gift economy runtime — enrich context, gift map, presentation plan.
 */

function createGiftRuntime(deps = {}) {
  const {
    runtimeConfig,
    writeLog,
    giftSupporterProfileModule,
    giftEconomyModule,
    awayModeModule,
    hostTeamPointsModule,
    giftMapEnterprise,
    giftPresentationModule,
    getGiftSupporterProfile,
    setGiftSupporterProfile,
    getLastGiftMapping,
    setLastGiftMapping,
    getHostTeamScoreState,
    setHostTeamScoreState,
    getOutputState,
    getEcosystemState
  } = deps;

  function enrichGiftEconomyContext(normalized = {}) {
    if (!normalized?.support || typeof normalized.support !== "object") {
      return;
    }

    let supporterForContext = {};

    if (typeof giftSupporterProfileModule?.recordGiftSupport === "function") {
      const recorded = giftSupporterProfileModule.recordGiftSupport(
        getGiftSupporterProfile?.(),
        normalized,
        normalized.support
      );
      setGiftSupporterProfile?.(recorded.state);
      supporterForContext = recorded.supporter;
      normalized.support.xpBase = recorded.xpBase;
      normalized.support.xp = recorded.xpAward;
      normalized.support.streakBonusPct = recorded.streakBonusPct;
      normalized.support.cumulativeXp = recorded.supporter.cumulativeXp;
      normalized.support.giftLevel = recorded.supporter.giftLevel;
      normalized.support.giftLevelLabel = recorded.supporter.giftLevelLabel;
      normalized.support.streakDays = recorded.supporter.streakDays;
    }

    if (typeof giftEconomyModule?.buildResolvedGiftContext === "function") {
      const outputState = getOutputState?.() || {};
      const ecosystemState = getEcosystemState?.() || {};

      normalized.support.giftContext = giftEconomyModule.buildResolvedGiftContext({
        support: normalized.support,
        giftProfile: normalized.support.giftProfile,
        supporter: supporterForContext
      });

      const hostModeSnap =
        typeof awayModeModule?.buildHostModeSnapshot === "function"
          ? awayModeModule.buildHostModeSnapshot({
              outputState,
              ecosystemState,
              runtimeConfig
            })
          : null;

      if (typeof hostTeamPointsModule?.resolveHostTeamSplit === "function") {
        const teamSplit = hostTeamPointsModule.resolveHostTeamSplit(
          normalized.support.giftContext.teamPoints,
          {
            hostModeActive: Boolean(hostModeSnap?.active || hostModeSnap?.badge === "HOST"),
            hostBadge: hostModeSnap?.badge,
            worldMode: hostModeSnap?.worldMode || outputState.worldMode
          }
        );
        normalized.support.giftContext.teamSplit = teamSplit;
        normalized.support.giftContext.teamId = teamSplit.teamId;

        if (typeof hostTeamPointsModule.applyHostTeamScore === "function") {
          setHostTeamScoreState?.(
            hostTeamPointsModule.applyHostTeamScore(getHostTeamScoreState?.(), teamSplit)
          );
        }
      }
    }
  }

  function recordGiftMapRuntime(normalized = {}) {
    if (!normalized?.support || typeof giftMapEnterprise?.ingest !== "function") {
      return null;
    }

    try {
      const giftMapRuntime = giftMapEnterprise.ingest({
        platform: normalized.platform,
        giftId: normalized.support.giftId,
        giftName: normalized.support.giftName,
        displayName:
          normalized.user?.nickname ||
          normalized.user?.displayName ||
          normalized.nickname ||
          "Viewer",
        coins: normalized.support.coins,
        totalCoins: normalized.support.totalCoins,
        count: normalized.support.repeatCount || 1
      });

      if (giftMapRuntime?.gift) {
        normalized.support.giftMapRuntime = giftMapRuntime.gift;
        normalized.support.giftStats = giftMapRuntime.stats;
        normalized.support.giftQueueLength = giftMapRuntime.queueLength;
        if (giftMapRuntime.gift.overlay?.text) {
          normalized.support.giftOverlay = {
            ...(normalized.support.giftOverlay || {}),
            ...giftMapRuntime.gift.overlay
          };
        }
        if (normalized.support.giftContext && typeof normalized.support.giftContext === "object") {
          normalized.support.giftContext.overlayText =
            giftMapRuntime.gift.overlay?.text || normalized.support.giftContext.overlayText;
        }

        const lastGiftMapping = getLastGiftMapping?.();
        if (lastGiftMapping && typeof lastGiftMapping === "object") {
          setLastGiftMapping?.({
            ...lastGiftMapping,
            streak: giftMapRuntime.gift.streak || null,
            overlayText: giftMapRuntime.gift.overlay?.text || lastGiftMapping.overlayText,
            queueLength: giftMapRuntime.queueLength,
            achievements: giftMapRuntime.stats?.achievements || []
          });
        }

        if (
          giftMapRuntime.stats?.achievements?.length &&
          typeof giftSupporterProfileModule?.attachGiftMapAchievements === "function"
        ) {
          const attached = giftSupporterProfileModule.attachGiftMapAchievements(
            getGiftSupporterProfile?.(),
            normalized,
            giftMapRuntime.stats.achievements
          );
          setGiftSupporterProfile?.(attached.state);
        }
      }

      return giftMapRuntime;
    } catch (err) {
      writeLog("mia-errors", {
        source: "gift_map_runtime",
        error: err?.message || String(err)
      });
      return null;
    }
  }

  function applyGiftEconomyPresentationLegacy(normalized = {}, actionResult = {}) {
    const ctx = normalized?.support?.giftContext;
    if (!ctx || typeof ctx !== "object") {
      return actionResult;
    }

    let next = { ...actionResult };
    next.meta = {
      ...(next.meta || {}),
      giftContext: ctx,
      streamTier: ctx.streamTier,
      giftLevel: ctx.giftLevel,
      giftLevelLabel: ctx.giftLevelLabel,
      comboTier: ctx.comboTier || null
    };

    if (ctx.obsTier) {
      next.tier = ctx.obsTier;
      next.meta.videoTier = ctx.obsTier;
    } else if (ctx.streamTier) {
      next.tier = ctx.streamTier;
    }

    if (typeof giftPresentationModule?.applyBossSpeechPatch === "function") {
      next = giftPresentationModule.applyBossSpeechPatch(next, ctx);
    }

    return next;
  }

  function prepareGiftEconomyPresentation(normalized = {}, actionResult = {}, shadowResult = null) {
    recordGiftMapRuntime(normalized);

    if (typeof giftPresentationModule?.prepareGiftPresentation === "function") {
      return giftPresentationModule.prepareGiftPresentation(
        normalized,
        actionResult,
        shadowResult
      );
    }

    return {
      actionResult: applyGiftEconomyPresentationLegacy(normalized, actionResult),
      plan: null
    };
  }

  return {
    enrichGiftEconomyContext,
    recordGiftMapRuntime,
    prepareGiftEconomyPresentation,
    applyGiftEconomyPresentationLegacy
  };
}

module.exports = { createGiftRuntime };
