"use strict";

/**
 * Koj chat commands (item, péče, CARE) — extrahováno z index.js (P2 architektura).
 */

const userAckThrottle = require("../scripts/MIA_USER_ACK_THROTTLE");

function pushArenaItemBattle(ctx = {}, itemResult = {}, userLabel = "") {
  if (!itemResult?.ok || !itemResult?.item) return;
  if (itemResult.action !== "use" && itemResult.action !== "feed") return;

  const platformArenaModule = ctx.modules?.platformArenaModule;
  const getArenaState = ctx.getPlatformArenaState;
  const setArenaState = ctx.setPlatformArenaState;
  if (
    !platformArenaModule ||
    typeof platformArenaModule.pushPlatformBattleAction !== "function" ||
    typeof getArenaState !== "function" ||
    typeof setArenaState !== "function"
  ) {
    return;
  }

  let arenaState = getArenaState();
  if (!arenaState?.duel?.active && !arenaState?.tournament?.active) return;

  const platformKey =
    typeof ctx.getStreamPlatformKey === "function"
      ? ctx.getStreamPlatformKey()
      : "tiktok";

  const battlePush = platformArenaModule.pushPlatformBattleAction(arenaState, {
    platform: platformKey,
    eventType: "ITEM_USE",
    userLabel,
    miaPoints: 0,
    item: itemResult.item
  });

  if (battlePush?.state) {
    setArenaState(battlePush.state);
    if (typeof platformArenaModule.saveArenaState === "function") {
      platformArenaModule.saveArenaState(battlePush.state);
    }
  }
}

function createCareCommandHandler(ctx = {}) {
  const {
    safeString,
    upper,
    getUserLabel,
    getRuntimeConfig,
    getStreamState,
    getOutputState,
    setOutputState,
    getKojnozoutState,
    setKojnozoutState,
    getKojnozoutBackpackState,
    setKojnozoutBackpackState,
    getItemDisplayState,
    setItemDisplayState,
    getKojnozoutDuelState,
    setKojnozoutDuelState,
    executeOverlay,
    deliverQuestCompleteMoment,
    scheduleWorldSave,
    scheduleStoryAnimationAfterFeed,
    writeLog,
    giftMapEnterprise,
    modules = {}
  } = ctx;

  const {
    kojTestModeModule,
    kojnozoutVitalsModule,
    kojnozoutPersistenceModule,
    kojnozoutDuelModule,
    kojnozoutItemCommandModule,
    careOpportunitiesModule,
    careQuestModule,
    kojnozoutCareModule,
    kojnozoutCareValidationModule,
    careRewardModule,
    responseEngine,
    kojWalkModule
  } = modules;

  return async function tryHandleKojnozoutCommands(normalized = {}) {
    const eventType = upper(normalized.eventType || normalized.type);
    if (eventType !== "COMMENT") return null;

    const message = safeString(normalized.message);
    const userLabel = getUserLabel(normalized);
    let kojnozoutState = getKojnozoutState();
    let kojnozoutBackpackState = getKojnozoutBackpackState();
    let itemDisplayState = getItemDisplayState();
    let kojnozoutDuelState = getKojnozoutDuelState();
    const runtimeConfig = getRuntimeConfig();
    const streamState = getStreamState();
    const outputState = getOutputState();

    if (typeof kojTestModeModule.parseKojStreamerCommand === "function") {
      const streamCmd = kojTestModeModule.parseKojStreamerCommand(message);

      if (streamCmd?.type === "probud") {
        kojnozoutState =
          typeof kojTestModeModule.wakeKojState === "function"
            ? kojTestModeModule.wakeKojState(kojnozoutState, kojnozoutVitalsModule)
            : kojnozoutState;
        setKojnozoutState(kojnozoutState);

        if (typeof kojnozoutPersistenceModule.scheduleSaveKojnozoutState === "function") {
          kojnozoutPersistenceModule.scheduleSaveKojnozoutState(kojnozoutState);
        }

        return {
          ok: true,
          handled: true,
          kind: "koj_wake",
          body: {
            ok: true,
            handled: true,
            kind: "koj_wake",
            speech: "Kojnožrout je vzhůru a připravený testovat.",
            bowlPercent: kojnozoutState.bowlPercent,
            isSleeping: kojnozoutState.isSleeping
          }
        };
      }

      if (streamCmd?.type === "duel_start") {
        if (typeof kojnozoutDuelModule.startDuel !== "function") {
          return {
            ok: false,
            handled: true,
            kind: "duel_start",
            reason: "duel_module_missing"
          };
        }

        const duelConfig = runtimeConfig?.duel || {};
        kojnozoutDuelState = kojnozoutDuelModule.startDuel(kojnozoutDuelState, {
          opponentLabel: safeString(normalized.opponentLabel, "Soupeř"),
          opponentStreamId: safeString(normalized.opponentStreamId, "opponent"),
          localLabel: safeString(duelConfig.localLabel, "Náš Kojnožrout"),
          localStreamId: safeString(duelConfig.localStreamId, "local"),
          durationMs: Math.max(30000, Number(duelConfig.defaultDurationSec || 300) * 1000),
          opponentSeedPoints: 0,
          peerUrl: safeString(duelConfig.peerUrl, "")
        });
        setKojnozoutDuelState(kojnozoutDuelState);
        scheduleWorldSave();

        return {
          ok: true,
          handled: true,
          kind: "duel_start",
          body: {
            ok: true,
            handled: true,
            kind: "duel_start",
            speech: "Duel začíná — pošlete dárky pro body!",
            duel: kojnozoutDuelModule.getDuelSnapshot(kojnozoutDuelState)
          }
        };
      }
    }

    const parsedItem =
      typeof kojnozoutItemCommandModule.parseItemCommand === "function"
        ? kojnozoutItemCommandModule.parseItemCommand(message)
        : null;

    if (parsedItem?.action === "pece") {
      const need =
        typeof careOpportunitiesModule.resolvePrimaryNeed === "function"
          ? careOpportunitiesModule.resolvePrimaryNeed(kojnozoutState)
          : "";

      if (typeof careQuestModule.ensureCareQuest === "function") {
        const ensured = careQuestModule.ensureCareQuest(kojnozoutState, need);
        kojnozoutState = ensured.state || kojnozoutState;
        setKojnozoutState(kojnozoutState);
        if (typeof kojnozoutPersistenceModule.scheduleSaveKojnozoutState === "function") {
          kojnozoutPersistenceModule.scheduleSaveKojnozoutState(kojnozoutState);
        }
      }

      const opportunities =
        typeof careOpportunitiesModule.buildCareOpportunities === "function"
          ? careOpportunitiesModule.buildCareOpportunities({
              kojnozoutState,
              backpackState: kojnozoutBackpackState,
              userLabel,
              duelState: kojnozoutDuelState
            })
          : null;

      const overlayPayload =
        typeof careOpportunitiesModule.buildPeceOverlayPayload === "function"
          ? careOpportunitiesModule.buildPeceOverlayPayload(opportunities, userLabel)
          : null;

      if (overlayPayload) {
        await executeOverlay(overlayPayload, { source: "pece_command" });
      }

      return {
        ok: true,
        handled: true,
        kind: "pece",
        body: {
          ok: true,
          handled: true,
          kind: "pece",
          care: opportunities
        }
      };
    }

    if (typeof kojnozoutItemCommandModule.handleItemCommand === "function") {
      const need =
        typeof careOpportunitiesModule.resolvePrimaryNeed === "function"
          ? careOpportunitiesModule.resolvePrimaryNeed(kojnozoutState)
          : "";

      const itemResult = kojnozoutItemCommandModule.handleItemCommand({
        message,
        userLabel,
        backpackState: kojnozoutBackpackState,
        displayState: itemDisplayState,
        duelState: kojnozoutDuelState,
        kojnozoutState,
        duelModule: kojnozoutDuelModule,
        noteQuestFeed: (state) =>
          typeof careQuestModule.noteQuestItemFeedComplete === "function"
            ? careQuestModule.noteQuestItemFeedComplete(state, need)
            : { state, completed: false }
      });

      if (itemResult?.handled) {
        kojnozoutBackpackState = itemResult.backpackState || kojnozoutBackpackState;
        itemDisplayState = itemResult.displayState || itemDisplayState;
        kojnozoutDuelState = itemResult.duelState || kojnozoutDuelState;
        kojnozoutState = itemResult.kojnozoutState || kojnozoutState;
        setKojnozoutBackpackState(kojnozoutBackpackState);
        setItemDisplayState(itemDisplayState);
        setKojnozoutDuelState(kojnozoutDuelState);
        setKojnozoutState(kojnozoutState);
        scheduleWorldSave();

        if (typeof kojnozoutPersistenceModule.scheduleSaveKojnozoutState === "function") {
          kojnozoutPersistenceModule.scheduleSaveKojnozoutState(kojnozoutState);
        }

        if (itemResult.overlayPayload) {
          await executeOverlay(itemResult.overlayPayload, {
            source: "item_command",
            action: itemResult.action
          });
        }

        pushArenaItemBattle(ctx, itemResult, userLabel);

        if (itemResult.questCompleted) {
          await deliverQuestCompleteMoment({ label: "Krmení z batohu" });
        }

        return {
          ok: itemResult.ok !== false,
          handled: true,
          kind: "item",
          action: itemResult.action || "show",
          reason: itemResult.reason || null,
          body: {
            ok: itemResult.ok !== false,
            handled: true,
            kind: "item",
            action: itemResult.action || "show",
            speech: itemResult.speech || "",
            item: itemResult.item || null
          }
        };
      }
    }

    if (typeof kojnozoutCareModule.parseCareCommand === "function") {
      const careParsed = kojnozoutCareModule.parseCareCommand(message);
      if (careParsed?.config) {
        const careUserKey =
          typeof userAckThrottle.resolveUserKey === "function"
            ? userAckThrottle.resolveUserKey(normalized)
            : `nick:${userLabel.toLowerCase()}`;
        const careBand =
          typeof userAckThrottle.resolveBandFromStreamState === "function"
            ? userAckThrottle.resolveBandFromStreamState(streamState)
            : "medium";

        let careValidation = { ok: true, reason: "ok" };
        if (typeof kojnozoutCareValidationModule.validateCareAttempt === "function") {
          careValidation = kojnozoutCareValidationModule.validateCareAttempt({
            userLabel,
            userKey: careUserKey,
            audienceBand: careBand,
            outputState,
            action: careParsed.action,
            kojnozoutState,
            now: Date.now()
          });
        }

        if (!careValidation.ok) {
          return {
            ok: true,
            handled: true,
            kind: "care",
            action: "care_rejected",
            body: {
              ok: true,
              handled: true,
              kind: "care",
              action: "care_rejected",
              silent: true,
              reason: careValidation.reason || "care_user_cooldown"
            }
          };
        }

        if (careParsed.action === "vencit" && typeof kojWalkModule.applyWalkCare === "function") {
          kojnozoutState = kojWalkModule.applyWalkCare(kojnozoutState, process.env);
        } else {
          kojnozoutState = kojnozoutCareModule.applyCareAction(
            kojnozoutState,
            careParsed.config
          );
        }

        let careRewardItem = null;
        if (typeof careRewardModule.applyCareReward === "function") {
          const reward = careRewardModule.applyCareReward(
            kojnozoutBackpackState,
            userLabel,
            careParsed.action
          );
          if (reward.granted) {
            kojnozoutBackpackState = reward.state;
            careRewardItem = reward.item;
            setKojnozoutBackpackState(kojnozoutBackpackState);
            scheduleWorldSave();
          }
        }

        setKojnozoutState(kojnozoutState);
        if (typeof kojnozoutPersistenceModule.scheduleSaveKojnozoutState === "function") {
          kojnozoutPersistenceModule.scheduleSaveKojnozoutState(kojnozoutState);
        }

        const firstName = userLabel.split(/\s+/).filter(Boolean)[0] || "někdo";
        let speechText = `${firstName}, díky za péči.`;
        let giftMemory = null;
        if (typeof giftMapEnterprise.getViewerMemory === "function") {
          giftMemory = giftMapEnterprise.getViewerMemory({
            platform: normalized.platform,
            displayName: userLabel
          });
        }

        if (giftMemory?.careRole === "feeder" && giftMemory.totalGifts >= 3) {
          speechText =
            careParsed.action === "nakrmit"
              ? `${firstName}, zase krmíš? Miska to miluje.`
              : `${firstName}, zase pečuješ — já už to čekal.`;
        } else if (
          careRewardItem &&
          typeof careRewardModule.buildCareRewardSpeech === "function"
        ) {
          speechText = careRewardModule.buildCareRewardSpeech(userLabel, careRewardItem);
        } else if (typeof responseEngine.buildCareOfferResponse === "function") {
          outputState.kojnozoutSnapshot = kojnozoutState;
          setOutputState(outputState);
          speechText = responseEngine.buildCareOfferResponse(
            outputState,
            "kojnozout",
            userLabel,
            {
              type: "care_offer",
              careBankKey: careParsed.config.bankKey
            }
          );
        }

        const overlayPayload =
          careParsed.action === "vencit" &&
          typeof kojWalkModule.buildWalkOverlayPayload === "function"
            ? kojWalkModule.buildWalkOverlayPayload(userLabel, speechText)
            : typeof kojnozoutCareModule.buildCareOverlayPayload === "function"
              ? kojnozoutCareModule.buildCareOverlayPayload(
                  userLabel,
                  speechText,
                  careParsed.config
                )
              : {
                  owner: "kojnozout",
                  route: "community",
                  stage: "care",
                  text: speechText,
                  user: userLabel
                };

        const careLabel = safeString(careParsed.config.label, careParsed.action);
        overlayPayload.subtext = careRewardItem
          ? `CARE odměna · ${careRewardItem.label} v batohu`
          : careValidation.hint
            ? `${careLabel} · ${careValidation.hint}`
            : `CARE · ${careLabel}`;
        overlayPayload.meta = {
          ...(overlayPayload.meta || {}),
          careAction: careParsed.action,
          careReward: careRewardItem?.id || null,
          giftMemoryFeeder: giftMemory?.careRole === "feeder"
        };

        kojnozoutState.lastGiftCareAction = careParsed.action;
        kojnozoutState.lastGiftCareGroup =
          careParsed.action === "nakrmit"
            ? "CARE"
            : careParsed.action === "lecit"
              ? "HEAL"
              : careParsed.action === "podrbat"
                ? "PET"
                : "SUPPORT";
        setKojnozoutState(kojnozoutState);

        await executeOverlay(overlayPayload, { source: "care_command" });

        if (careParsed.action === "nakrmit") {
          scheduleStoryAnimationAfterFeed(normalized, { feedType: "care" }).catch((err) => {
            writeLog("mia-errors", {
              source: "story_animation_care_async",
              error: err?.message || String(err)
            });
          });
        }

        return {
          ok: true,
          handled: true,
          kind: "care",
          action: careParsed.action,
          body: {
            ok: true,
            handled: true,
            kind: "care",
            action: careParsed.action,
            speech: speechText
          }
        };
      }
    }

    return null;
  };
}

module.exports = {
  createCareCommandHandler
};
