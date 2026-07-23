"use strict";

const eventNormalizer = require("../../core/event-normalizer");
const eventLog = require("../../core/event-log");
const runtimeState = require("../../core/runtime-state");
const actionQueue = require("../../core/action-queue");
const miaDirector = require("../../core/mia-director");
const comboMoments = require("../../core/combo-moments");
const viewerMemory = require("../../core/viewer-memory");

async function phaseEnrich(ctx, deps) {
  const {
    supportResolver,
    enrichGiftEconomyContext,
    nowIso,
    giftUserLedgerModule,
    pushRecentParticipant,
    applyRuntimeStateImpact,
    applyWorldLayer,
    streamAudienceModule,
    runtimeConfig,
    writeLog,
    getKojnozoutState,
    getStreamState
  } = deps;

  const { normalized, eventType, raw } = ctx;

  if (
    eventType === "GIFT" &&
    typeof supportResolver.enrichNormalizedSupport === "function"
  ) {
    try {
      supportResolver.enrichNormalizedSupport(normalized, normalized.raw || {});
      enrichGiftEconomyContext(normalized);
      ctx.runtime.lastGiftMapping = {
        giftName: normalized.support?.giftName || null,
        giftKey: normalized.support?.giftKey || null,
        category: normalized.support?.giftCategory || null,
        priority: normalized.support?.giftPriority || null,
        care: normalized.support?.giftCare || null,
        totalCoins: normalized.support?.totalCoins || 0,
        miaPoints: normalized.support?.miaPoints || 0,
        streamTier: normalized.support?.streamTier || null,
        coinTier: normalized.support?.coinTier || null,
        mapTier: normalized.support?.giftMap?.tier || null,
        obsTier: normalized.support?.obsTier || null,
        overlayText: normalized.support?.giftOverlay?.text || null,
        canonicalKey: normalized.support?.giftProfile?.canonicalKey || null,
        mappingSource:
          normalized.support?.giftMappingSource ||
          normalized.support?.giftProfile?.mappingSource ||
          "MIA_SUPPORT_RESOLVER+shared/gifts",
        mappingConfidence:
          normalized.support?.giftMappingConfidence ||
          normalized.support?.giftProfile?.mappingConfidence ||
          null,
        at: Date.now(),
        atIso: nowIso()
      };
      writeLog("gift-mapping", {
        giftName: ctx.runtime.lastGiftMapping.giftName,
        giftKey: ctx.runtime.lastGiftMapping.giftKey,
        category: ctx.runtime.lastGiftMapping.category,
        priority: ctx.runtime.lastGiftMapping.priority,
        care: ctx.runtime.lastGiftMapping.care,
        totalCoins: ctx.runtime.lastGiftMapping.totalCoins,
        miaPoints: ctx.runtime.lastGiftMapping.miaPoints,
        streamTier: ctx.runtime.lastGiftMapping.streamTier,
        coinTier: ctx.runtime.lastGiftMapping.coinTier,
        mapTier: ctx.runtime.lastGiftMapping.mapTier,
        obsTier: ctx.runtime.lastGiftMapping.obsTier,
        overlayText: ctx.runtime.lastGiftMapping.overlayText,
        canonicalKey: ctx.runtime.lastGiftMapping.canonicalKey,
        mappingSource: ctx.runtime.lastGiftMapping.mappingSource,
        mappingConfidence: ctx.runtime.lastGiftMapping.mappingConfidence
      });
    } catch (err) {
      writeLog("mia-errors", { source: "support_resolver", error: err.message });
    }
  }

  if (eventType === "GIFT") {
    pushRecentParticipant(normalized, "gift");
    if (typeof giftUserLedgerModule.recordGiftUser === "function") {
      ctx.runtime.giftUserLedger = giftUserLedgerModule.recordGiftUser(
        ctx.runtime.giftUserLedger,
        normalized,
        { maxAgeMs: runtimeConfig?.overlay?.giftLedgerMaxAgeMs || 1800000 }
      );
    }
  }

  // Phase 1: attach unified runtime event + append replay log (gift + chat).
  try {
    const miaRuntimeEvent = eventNormalizer.fromLegacyNormalized(normalized, {
      includeLegacy: false
    });
    normalized.miaRuntimeEvent = miaRuntimeEvent;
    if (eventType === "GIFT" || eventType === "COMMENT") {
      eventLog.appendRuntimeEvent(miaRuntimeEvent, {
        source: "phase_enrich",
        lane: ctx.lane || null
      });
    }
  } catch (err) {
    writeLog("mia-errors", { source: "phase1_event_normalizer", error: err.message });
  }

  // Phase 2: viewer memory + combo moments + director plan (advisory).
  try {
    const runtimeEvent = normalized.miaRuntimeEvent || null;
    let memoryResult = null;

    if (runtimeEvent && eventType === "GIFT") {
      memoryResult = viewerMemory.recordGift(runtimeEvent, { runtimeConfig });
    } else if (runtimeEvent && eventType === "COMMENT") {
      memoryResult = viewerMemory.recordChat(runtimeEvent, { runtimeConfig });
    }

    if (memoryResult?.viewer) {
      normalized.viewerMemory = memoryResult.viewer;
      normalized.viewerMemoryShape = viewerMemory.toGiftMemoryShape(
        memoryResult.viewer,
        runtimeEvent?.gift?.name || normalized.support?.giftKey
      );
      if (memoryResult.leveledUp) {
        normalized.viewerLeveledUp = true;
        if (normalized.viewerMemoryShape) {
          normalized.viewerMemoryShape.leveledUp = true;
        }
      }
    }

    // Phase 3: optional inventory stub on first support / bowl-ish gift.
    try {
      const viewerInventory = require("../../core/viewer-inventory");
      if (
        memoryResult?.wasNew &&
        runtimeEvent &&
        eventType === "GIFT" &&
        viewerInventory.isInventoryEnabled(runtimeConfig)
      ) {
        viewerInventory.grantItem(
          {
            userId: runtimeEvent.user?.id,
            name: runtimeEvent.user?.name
          },
          "koj_sticker",
          { source: "first_support", runtimeConfig }
        );
      }
    } catch (_invErr) {
      /* non-fatal */
    }

    // Phase 3: Tech Forms expiry tick (flagged).
    try {
      const techForms = require("../../core/tech-forms-runtime");
      if (techForms.isTechFormsEnabled(runtimeConfig) && typeof getKojnozoutState === "function") {
        const koj = getKojnozoutState();
        const tick = techForms.tickTechForms(koj, { runtimeConfig });
        if (tick.changed && tick.state && ctx.refs?.kojnozoutState) {
          Object.assign(ctx.refs.kojnozoutState, tick.state);
          normalized.techFormHint = tick.overlayHint || null;
        }
      }
    } catch (_tfErr) {
      /* non-fatal */
    }

    let comboResult = { moment: null, all: [] };
    if (
      runtimeEvent &&
      comboMoments.isComboMomentsEnabled(runtimeConfig) &&
      eventType === "GIFT"
    ) {
      const koj =
        typeof getKojnozoutState === "function"
          ? getKojnozoutState()
          : ctx.refs?.kojnozoutState || {};
      comboResult = comboMoments
        .getSharedComboMomentDetector()
        .observe(runtimeEvent, {
          viewerMemory: memoryResult?.viewer || null,
          viewerMemoryWasNew: memoryResult?.wasNew === true,
          isFirstSupport: memoryResult?.wasNew === true,
          bowlPercent: Number(koj.bowlPercent ?? koj.bowlFillPercent)
        });
      if (comboResult.moment) {
        normalized.phase2ComboMoment = comboResult.moment;
        try {
          if (actionQueue.isActionQueueEnabled(runtimeConfig)) {
            const shell = comboMoments.momentToQueueAction(comboResult.moment);
            if (shell) {
              actionQueue.getSharedActionQueue().enqueue(shell);
            }
          }
        } catch (_aqErr) {
          /* non-fatal */
        }
      }
    }

    if (runtimeEvent && miaDirector.isDirectorEnabled(runtimeConfig)) {
      const koj =
        typeof getKojnozoutState === "function"
          ? getKojnozoutState()
          : ctx.refs?.kojnozoutState || {};
      const direction = miaDirector.planDirection({
        event: runtimeEvent,
        runtimeConfig,
        kojVitals: koj,
        runtimeState: runtimeState.loadRuntimeState() || {},
        comboMoment: comboResult.moment,
        viewerMemory: memoryResult?.viewer || null
      });
      normalized.miaDirection = direction;
      ctx.scratch.miaDirection = direction;
    }
  } catch (err) {
    writeLog("mia-errors", { source: "phase2_director_memory", error: err.message });
  }

  ctx.scratch.runtimeImpact = applyRuntimeStateImpact(normalized);

  try {
    applyWorldLayer(normalized);
  } catch (err) {
    writeLog("mia-errors", { source: "world_layer", error: err.message });
  }

  if (typeof streamAudienceModule.updateStreamAudience === "function") {
    ctx.runtime.streamState = streamAudienceModule.updateStreamAudience(
      ctx.runtime.streamState,
      raw || normalized.raw || normalized
    );
  }

  // Phase 1: persist bowl/Koj + queue snapshot (composes with kojnozout-state.json).
  try {
    const koj =
      typeof getKojnozoutState === "function"
        ? getKojnozoutState()
        : ctx.refs?.kojnozoutState || {};
    const stream =
      typeof getStreamState === "function"
        ? getStreamState()
        : ctx.runtime?.streamState || {};
    runtimeState.scheduleSaveRuntimeState({
      koj,
      streamState: stream,
      queueSnapshot: actionQueue.getSharedActionQueue().snapshot()
    });
  } catch (err) {
    writeLog("mia-errors", { source: "phase1_runtime_state", error: err.message });
  }

  return ctx;
}

module.exports = { phaseEnrich };
