"use strict";

/**
 * Koj care quests, evolution moments, and duel peer sync.
 */

function createKojMomentsRuntime(deps = {}) {
  const {
    upper,
    safeString,
    getUserLabel,
    careQuestModule,
    careOpportunitiesModule,
    getKojnozoutState,
    setKojnozoutState,
    kojnozoutPersistenceModule,
    executeOverlay,
    runtimeConfig,
    kojnozoutDuelBridgeModule,
    getDuelState,
    setDuelState,
    kojnozoutDuelModule,
    scheduleWorldSave,
    setLastDuelSyncSummary,
    kojnozoutEvolutionModule,
    getOutputState,
    writeLog
  } = deps;

  let duelPeerSyncInFlight = false;

  function applyCareQuestProgress(normalized = {}) {
    const eventType = upper(normalized.eventType || normalized.type);
    if (!["COMMENT", "GIFT", "LIKE", "FOLLOW", "SHARE"].includes(eventType)) {
      return { questCompleted: false };
    }

    if (typeof careQuestModule?.progressCareQuest !== "function") {
      return { questCompleted: false };
    }

    let kojnozoutState = typeof getKojnozoutState === "function" ? getKojnozoutState() : {};
    const need =
      typeof careOpportunitiesModule?.resolvePrimaryNeed === "function"
        ? careOpportunitiesModule.resolvePrimaryNeed(kojnozoutState)
        : "";

    if (typeof careOpportunitiesModule?.syncCareContext === "function") {
      const synced = careOpportunitiesModule.syncCareContext(kojnozoutState, need);
      kojnozoutState = synced.state || kojnozoutState;
    }

    const result = careQuestModule.progressCareQuest(
      kojnozoutState,
      normalized,
      eventType,
      getUserLabel(normalized)
    );

    kojnozoutState = result.state || kojnozoutState;
    if (typeof setKojnozoutState === "function") setKojnozoutState(kojnozoutState);

    if (result.completed) {
      if (typeof kojnozoutPersistenceModule?.scheduleSaveKojnozoutState === "function") {
        kojnozoutPersistenceModule.scheduleSaveKojnozoutState(kojnozoutState);
      }
    }

    return {
      questCompleted: Boolean(result.completed),
      questDef: result.questDef || null
    };
  }

  async function deliverQuestCompleteMoment(questDef = {}) {
    const label = safeString(questDef.label, "Komunitní úkol");
    await executeOverlay(
      {
        owner: "kojnozout",
        route: "community",
        stage: "care_quest",
        title: "Úkol splněn",
        text: `Komunita splnila úkol: ${label}. Kojnožrout je spokojenější!`,
        subtext: "CARE · mise dokončena",
        mood: "happy",
        holdMs: 9000
      },
      { source: "care_quest_complete" }
    );

    await executeOverlay(
      {
        owner: "mia",
        route: "community",
        stage: "care_quest_companion",
        title: "MIA",
        text: "Krásná spolupráce — přesně takhle se stará celá komunita.",
        subtext: "CARE companion",
        mood: "warm",
        holdMs: 6500
      },
      { source: "care_quest_complete" }
    );
  }

  async function runDuelPeerSync() {
    const duelConfig = runtimeConfig?.duel || {};
    let kojnozoutDuelState = typeof getDuelState === "function" ? getDuelState() : {};
    const peerUrl = safeString(kojnozoutDuelState?.peerUrl || duelConfig.peerUrl);

    if (!duelConfig.enabled || !peerUrl || !kojnozoutDuelState?.active) {
      return null;
    }
    if (duelPeerSyncInFlight) return null;

    duelPeerSyncInFlight = true;

    try {
      const result = await kojnozoutDuelBridgeModule.syncDuelWithPeer({
        peerUrl,
        duelState: kojnozoutDuelState,
        exportLocalSide: kojnozoutDuelModule.exportLocalSide,
        syncOpponentFromPeer: kojnozoutDuelModule.syncOpponentFromPeer,
        timeoutMs: 4000
      });

      if (typeof setLastDuelSyncSummary === "function") {
        setLastDuelSyncSummary({
          at: Date.now(),
          ok: Boolean(result?.ok),
          reason: result?.reason || null,
          error: result?.error || null,
          peerUrl
        });
      }

      if (result?.state) {
        if (typeof setDuelState === "function") setDuelState(result.state);
        if (typeof scheduleWorldSave === "function") scheduleWorldSave();
      }

      return result;
    } catch (err) {
      if (typeof setLastDuelSyncSummary === "function") {
        setLastDuelSyncSummary({
          at: Date.now(),
          ok: false,
          reason: "sync_exception",
          error: err.message,
          peerUrl
        });
      }
      return null;
    } finally {
      duelPeerSyncInFlight = false;
    }
  }

  async function deliverEvolutionMoment(evolutionLevelUp, normalized = {}, eventType = "") {
    if (
      !evolutionLevelUp ||
      typeof kojnozoutEvolutionModule?.buildEvolutionDelivery !== "function"
    ) {
      return null;
    }

    let kojnozoutState = typeof getKojnozoutState === "function" ? getKojnozoutState() : {};
    const outputState = typeof getOutputState === "function" ? getOutputState() : {};

    const delivery = kojnozoutEvolutionModule.buildEvolutionDelivery(evolutionLevelUp, {
      userLabel: getUserLabel(normalized),
      eventType,
      outputState,
      kojnozoutState
    });

    kojnozoutState.lastEvolutionMoment = delivery.moment;
    if (typeof setKojnozoutState === "function") setKojnozoutState(kojnozoutState);

    writeLog("mia-events", {
      stage: "evolution_level_up",
      fromTier: evolutionLevelUp.fromTier,
      toTier: evolutionLevelUp.toTier,
      label: evolutionLevelUp.label,
      actor: getUserLabel(normalized),
      eventType,
      feedPoints: evolutionLevelUp.feedPoints
    });

    const emitted = [];

    if (delivery.kojPrimary) {
      const accepted = await executeOverlay(delivery.kojPrimary, {
        source: "evolution_moment",
        priority: delivery.kojPrimary.priority,
        holdMs: delivery.kojPrimary.holdMs
      });
      emitted.push({
        owner: "kojnozout",
        accepted: Boolean(accepted?.accepted),
        text: delivery.kojPrimary.text
      });
    }

    if (delivery.miaCompanion) {
      const accepted = await executeOverlay(delivery.miaCompanion, {
        source: "evolution_moment",
        priority: delivery.miaCompanion.priority,
        holdMs: delivery.miaCompanion.holdMs
      });
      emitted.push({
        owner: "mia",
        accepted: Boolean(accepted?.accepted),
        text: delivery.miaCompanion.text
      });
    }

    if (typeof kojnozoutPersistenceModule?.scheduleSaveKojnozoutState === "function") {
      kojnozoutPersistenceModule.scheduleSaveKojnozoutState(kojnozoutState);
    }

    return {
      moment: delivery.moment,
      emitted
    };
  }

  return {
    applyCareQuestProgress,
    deliverQuestCompleteMoment,
    runDuelPeerSync,
    deliverEvolutionMoment
  };
}

module.exports = { createKojMomentsRuntime };
