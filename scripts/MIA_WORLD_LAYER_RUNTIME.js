"use strict";

/**
 * World layer — backpack, duel, platform arena, chat rewards; persists via scheduleWorldSave.
 */

function createWorldLayerRuntime(deps = {}) {
  const {
    upper,
    getUserLabel,
    extractSupportPayload,
    safeString,
    kojnozoutModule,
    kojnozoutBackpackModule,
    getKojnozoutBackpackState,
    setKojnozoutBackpackState,
    getDuelState,
    setDuelState,
    kojnozoutDuelModule,
    platformArenaModule,
    getArenaState,
    setArenaState,
    chatRewardModule,
    kojRosterModule,
    setOverlay,
    invalidateOverlayStateCache,
    writeLog,
    scheduleWorldSave
  } = deps;

  function applyWorldLayer(normalized = {}) {
    const eventType = upper(normalized.eventType || normalized.type);
    const userLabel = getUserLabel(normalized);
    const support = extractSupportPayload(normalized);
    const miaPoints =
      typeof kojnozoutModule?.getEffectiveFeedValue === "function"
        ? kojnozoutModule.getEffectiveFeedValue(support)
        : Number(support?.miaPoints || 0);

    let kojnozoutBackpackState =
      typeof getKojnozoutBackpackState === "function" ? getKojnozoutBackpackState() : {};
    let kojnozoutDuelState = typeof getDuelState === "function" ? getDuelState() : {};
    let platformArenaState = typeof getArenaState === "function" ? getArenaState() : null;

    if (typeof kojnozoutBackpackModule?.resolveItemFromEvent === "function") {
      const item = kojnozoutBackpackModule.resolveItemFromEvent(eventType, support);
      if (item && typeof kojnozoutBackpackModule.addItemToBackpack === "function") {
        kojnozoutBackpackState = kojnozoutBackpackModule.addItemToBackpack(
          kojnozoutBackpackState,
          userLabel,
          item,
          {
            source:
              safeString(item.source) === "gift_map"
                ? "gift_map"
                : eventType.toLowerCase()
          }
        );
        if (typeof setKojnozoutBackpackState === "function") {
          setKojnozoutBackpackState(kojnozoutBackpackState);
        }
        if (eventType === "GIFT" && normalized?.support) {
          normalized.support.grantedItem = {
            id: item.id,
            label: item.label,
            giftKey: item.giftKey || support.giftKey || null,
            source: item.source || "gift"
          };
        }
      }
    }

    if (
      kojnozoutDuelState?.active &&
      typeof kojnozoutDuelModule?.ingestDuelContribution === "function"
    ) {
      const item =
        typeof kojnozoutBackpackModule?.resolveItemFromEvent === "function"
          ? kojnozoutBackpackModule.resolveItemFromEvent(eventType, support)
          : null;
      const duelResult = kojnozoutDuelModule.ingestDuelContribution(kojnozoutDuelState, {
        eventType,
        userLabel,
        miaPoints,
        itemPower: item ? item.power : 0,
        side: "local"
      });
      if (duelResult?.state) {
        kojnozoutDuelState = duelResult.state;
        if (typeof setDuelState === "function") setDuelState(kojnozoutDuelState);
      }
    } else if (typeof kojnozoutDuelModule?.tickDuel === "function") {
      kojnozoutDuelState = kojnozoutDuelModule.tickDuel(kojnozoutDuelState);
      if (typeof setDuelState === "function") setDuelState(kojnozoutDuelState);
    }

    const platformKey = safeString(
      normalized.platform || normalized.source || "tiktok",
      "tiktok"
    ).toLowerCase();

    if (
      platformArenaState &&
      typeof platformArenaModule?.ingestArenaActivity === "function" &&
      ["GIFT", "COMMENT", "LIKE", "FOLLOW", "SHARE"].includes(eventType)
    ) {
      try {
        const item =
          typeof kojnozoutBackpackModule?.resolveItemFromEvent === "function"
            ? kojnozoutBackpackModule.resolveItemFromEvent(eventType, support)
            : null;
        const arenaResult = platformArenaModule.ingestArenaActivity(platformArenaState, {
          platform: platformKey,
          eventType,
          userLabel,
          miaPoints: miaPoints + (item ? Number(item.power) || 0 : 0)
        });
        if (arenaResult?.state) {
          platformArenaState = arenaResult.state;
        }
        if (
          eventType === "GIFT" &&
          platformArenaState &&
          (platformArenaState.duel?.active || platformArenaState.tournament?.active) &&
          typeof platformArenaModule.pushPlatformBattleAction === "function"
        ) {
          const giftItem =
            typeof kojnozoutBackpackModule?.resolveItemFromEvent === "function"
              ? kojnozoutBackpackModule.resolveItemFromEvent(eventType, support)
              : null;
          const battlePush = platformArenaModule.pushPlatformBattleAction(platformArenaState, {
            platform: platformKey,
            eventType,
            userLabel,
            miaPoints,
            item: giftItem
          });
          if (battlePush?.state) platformArenaState = battlePush.state;
        }
        if (
          platformArenaState &&
          typeof platformArenaModule.saveArenaState === "function"
        ) {
          platformArenaModule.saveArenaState(platformArenaState);
        }
        if (typeof setArenaState === "function") setArenaState(platformArenaState);
      } catch (err) {
        writeLog("mia-errors", {
          source: "platform_arena",
          error: err.message
        });
      }
    } else if (
      platformArenaState &&
      typeof platformArenaModule?.tickArena === "function"
    ) {
      platformArenaState = platformArenaModule.tickArena(platformArenaState);
      if (typeof setArenaState === "function") setArenaState(platformArenaState);
    }

    if (
      typeof chatRewardModule?.evaluateChatReward === "function" &&
      ["GIFT", "COMMENT", "LIKE"].includes(eventType)
    ) {
      try {
        const reward = chatRewardModule.evaluateChatReward({
          platform: platformKey,
          eventType,
          message: safeString(normalized.message),
          userLabel,
          miaPoints,
          backpackModule: kojnozoutBackpackModule,
          backpackState: kojnozoutBackpackState
        });
        if (reward?.hit) {
          if (reward.backpackState) {
            kojnozoutBackpackState = reward.backpackState;
            if (typeof setKojnozoutBackpackState === "function") {
              setKojnozoutBackpackState(kojnozoutBackpackState);
            }
          }
          if (
            reward.arenaBoost > 0 &&
            platformArenaState &&
            typeof platformArenaModule?.ingestArenaActivity === "function"
          ) {
            const boost = platformArenaModule.ingestArenaActivity(platformArenaState, {
              platform: platformKey,
              eventType: "COMMENT",
              userLabel,
              miaPoints: reward.arenaBoost
            });
            if (boost?.state) {
              platformArenaState = boost.state;
              platformArenaModule.saveArenaState?.(platformArenaState);
              if (typeof setArenaState === "function") setArenaState(platformArenaState);
            }
          }
          if (
            platformArenaState &&
            typeof platformArenaModule?.pushPlatformBattleAction === "function" &&
            (platformArenaState.duel?.active || platformArenaState.tournament?.active)
          ) {
            const battlePush = platformArenaModule.pushPlatformBattleAction(platformArenaState, {
              platform: platformKey,
              eventType,
              userLabel,
              miaPoints,
              item: reward.item || null
            });
            if (battlePush?.state) {
              platformArenaState = battlePush.state;
              platformArenaModule.saveArenaState?.(platformArenaState);
              if (typeof setArenaState === "function") setArenaState(platformArenaState);
            }
          }
          if (reward.line) {
            setOverlay(
              {
                owner: "kojnozout",
                speaker: "kojnozout",
                route: "community",
                title:
                  (typeof kojRosterModule?.getKojProfile === "function"
                    ? kojRosterModule.getKojProfile(platformKey).name
                    : "Kojnožrout") + " · odměna",
                text: reward.line,
                subtext: "Dárek zvyšuje šanci na odměnu",
                stage: "chat_reward",
                mood: "playful",
                holdMs: 9000,
                priority: 3,
                meta: {
                  rewardId: reward.reward?.rewardId,
                  platform: platformKey,
                  publicHint: reward.reward?.publicHint
                }
              },
              { force: true, priority: 3 }
            );
            invalidateOverlayStateCache();
          }
          writeLog("mia-events", {
            ts: Date.now(),
            stage: "chat_reward",
            platform: platformKey,
            rewardId: reward.reward?.rewardId,
            hit: true,
            userLabel
          });
        }
      } catch (err) {
        writeLog("mia-errors", {
          source: "chat_reward",
          error: err.message
        });
      }
    }

    if (typeof scheduleWorldSave === "function") {
      scheduleWorldSave();
    }
  }

  return { applyWorldLayer };
}

module.exports = { createWorldLayerRuntime };
