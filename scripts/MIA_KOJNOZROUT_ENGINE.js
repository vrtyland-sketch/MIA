"use strict";

/**
 * MIA_KOJNOZROUT_ENGINE.js
 *
 * Účel:
 * - drží runtime stav Kojnožrouta
 * - aplikuje support eventy do misky / nálady / statů
 * - aplikuje community pingy
 * - drží snapshot kompatibilní pro overlay + action layer
 *
 * AKTUÁLNÍ PRAVIDLA:
 * - 1 MIA bod = 0.01 % misky
 * - 1 minuta nečinnosti = -0.075 % misky
 * - chat delta přichází z MIA_ACTION_ENGINE jako pevná hodnota
 *
 * DŮLEŽITÉ:
 * - source-of-truth pro support gain = support.miaPoints
 * - když miaPoints chybí, fallback je supportIndex / 100
 * - raw coins slouží už jen jako metrika, ne jako přímý bowl gain
 */

const kojnozoutVitalsModule = (() => {
  try {
    return require("./MIA_KOJNOZROUT_VITALS");
  } catch (_err) {
    return {};
  }
})();

const kojnozoutBondModule = (() => {
  try {
    return require("./MIA_KOJNOZROUT_BOND");
  } catch (_err) {
    return {};
  }
})();

const kojRobotModesModule = (() => {
  try {
    return require("./MIA_KOJ_ROBOT_MODES");
  } catch (_err) {
    return {};
  }
})();

const kojLongTermNeedsModule = (() => {
  try {
    return require("../core/koj-long-term-needs");
  } catch (_err) {
    return {};
  }
})();

function nowTs() {
  return Date.now();
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function round2(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

const EVOLUTION_TIERS = [
  { id: "egg", minFeedPoints: 0, scale: 0.24, label: "Vejíčko" },
  { id: "hatchling", minFeedPoints: 25, scale: 0.28, label: "Mládě" },
  { id: "sprout", minFeedPoints: 250, scale: 0.32, label: "Pučící" },
  { id: "guardian", minFeedPoints: 2500, scale: 0.38, label: "Ochránce" },
  { id: "legend", minFeedPoints: 25000, scale: 0.44, label: "Legenda" }
];

function resolveEvolutionTier(feedPoints) {
  return getEvolutionMeta(feedPoints).tier;
}

function getEvolutionMeta(feedPoints) {
  const points = clamp(toNumber(feedPoints, 0), 0, 999999);
  let tier = EVOLUTION_TIERS[0];
  let next = null;

  for (let i = 0; i < EVOLUTION_TIERS.length; i += 1) {
    if (points >= EVOLUTION_TIERS[i].minFeedPoints) {
      tier = EVOLUTION_TIERS[i];
      next = EVOLUTION_TIERS[i + 1] || null;
    }
  }

  return {
    tier: tier.id,
    label: tier.label,
    scale: tier.scale,
    feedPoints: points,
    nextTier: next ? next.id : null,
    nextTierLabel: next ? next.label : null,
    pointsToNext: next ? Math.max(0, next.minFeedPoints - points) : 0
  };
}

function formatEvolutionSubtext(evolution = {}) {
  const label = safeString(evolution.label, "Vejíčko");
  const pointsToNext = toNumber(evolution.pointsToNext, 0);

  if (evolution.nextTier && pointsToNext > 0) {
    const nextLabel = safeString(evolution.nextTierLabel, evolution.nextTier);
    return `${label} · ${Math.ceil(pointsToNext)} bodů do ${nextLabel}`;
  }

  if (safeString(evolution.tier) === "legend") {
    return `${label} · max evoluce`;
  }

  return label;
}

function createKojnozoutState(seed = {}) {
  const ts = nowTs();

  return {
    hunger: clamp(toNumber(seed.hunger, 68), 0, 100),
    energy: clamp(toNumber(seed.energy, 58), 0, 100),
    socialState: clamp(toNumber(seed.socialState, 8), -100, 100),

    bowlPercent: clamp(toNumber(seed.bowlPercent, 0), 0, 100),
    bowlState: clamp(toNumber(seed.bowlState, seed.bowlPercent ?? 0), 0, 100),
    bowlFillPercent: clamp(
      toNumber(
        seed.bowlFillPercent,
        seed.bowlPercent !== undefined ? seed.bowlPercent : 0
      ),
      0,
      100
    ),
    bowlVisualLevel: safeString(seed.bowlVisualLevel, "low"),

    mood: safeString(seed.mood, "idle"),
    stage: safeString(seed.stage, "idle"),
    behavior: safeString(seed.behavior, "watching"),

    feedPoints: clamp(toNumber(seed.feedPoints, 0), 0, 999999),
    supportBurst: clamp(toNumber(seed.supportBurst, 0), 0, 999999),

    totalFedCoins: clamp(toNumber(seed.totalFedCoins, 0), 0, 999999999),
    totalFeedEvents: clamp(toNumber(seed.totalFeedEvents, 0), 0, 999999999),
    totalCommunityPings: clamp(toNumber(seed.totalCommunityPings, 0), 0, 999999999),

    lastFedAt: toNumber(seed.lastFedAt, 0),
    lastPingAt: toNumber(seed.lastPingAt, 0),
    lastDecayAt: toNumber(seed.lastDecayAt, ts),
    lastUpdatedAt: toNumber(seed.lastUpdatedAt, ts),

    lastActor: seed.lastActor || null,
    lastTrigger: safeString(seed.lastTrigger, ""),
    lastGiftCareAction: safeString(seed.lastGiftCareAction) || null,
    lastGiftCareGroup: safeString(seed.lastGiftCareGroup) || null,

    lastEvolutionMoment:
      seed.lastEvolutionMoment && typeof seed.lastEvolutionMoment === "object"
        ? seed.lastEvolutionMoment
        : null,

    vitals:
      typeof kojnozoutVitalsModule.createVitalsState === "function"
        ? kojnozoutVitalsModule.createVitalsState(seed.vitals || {})
        : seed.vitals || null,
    affliction: safeString(seed.affliction) || null,
    isSleeping: Boolean(seed.isSleeping),

    bowl: {
      percent: clamp(
        toNumber(
          seed?.bowl?.percent,
          seed.bowlPercent !== undefined ? seed.bowlPercent : 0
        ),
        0,
        100
      ),
      visualLevel: safeString(
        seed?.bowl?.visualLevel,
        safeString(seed.bowlVisualLevel, "low")
      ),
      stage: safeString(seed?.bowl?.stage, safeString(seed.stage, "idle"))
    },

    metrics: {
      hunger: clamp(
        toNumber(seed?.metrics?.hunger, seed.hunger !== undefined ? seed.hunger : 56),
        0,
        100
      ),
      energy: clamp(
        toNumber(seed?.metrics?.energy, seed.energy !== undefined ? seed.energy : 72),
        0,
        100
      ),
      socialState: clamp(
        toNumber(
          seed?.metrics?.socialState,
          seed.socialState !== undefined ? seed.socialState : 12
        ),
        -100,
        100
      ),
      supportBurst: clamp(
        toNumber(
          seed?.metrics?.supportBurst,
          seed.supportBurst !== undefined ? seed.supportBurst : 0
        ),
        0,
        999999
      ),
      totalFedCoins: clamp(
        toNumber(
          seed?.metrics?.totalFedCoins,
          seed.totalFedCoins !== undefined ? seed.totalFedCoins : 0
        ),
        0,
        999999999
      ),
      totalFeedEvents: clamp(
        toNumber(
          seed?.metrics?.totalFeedEvents,
          seed.totalFeedEvents !== undefined ? seed.totalFeedEvents : 0
        ),
        0,
        999999999
      ),
      totalCommunityPings: clamp(
        toNumber(
          seed?.metrics?.totalCommunityPings,
          seed.totalCommunityPings !== undefined ? seed.totalCommunityPings : 0
        ),
        0,
        999999999
      )
    },

    bond:
      typeof kojnozoutBondModule.createBondState === "function"
        ? kojnozoutBondModule.createBondState(seed.bond || {})
        : seed.bond || null,

    careQuest: seed.careQuest || null,
    lastCareAt: toNumber(seed.lastCareAt, 0),

    // Tech Forms layer (Pet Core always on). Pure defaults — no gift/OBS side effects.
    robotModes:
      typeof kojRobotModesModule.createRobotModesState === "function"
        ? kojRobotModesModule.createRobotModesState(seed.robotModes || {})
        : seed.robotModes || {
            activeForm: "pet",
            unlockedForms: ["pet"],
            miaSync: 0,
            combatPower: 0,
            formExpiresAt: 0,
            formCooldownUntil: 0,
            lastFormId: null,
            lastFormChangedAt: 0
          },

    // Phase 3 long-term needs (persist across streams; bowl CARE untouched).
    fatigue: clamp(
      toNumber(
        seed.fatigue,
        typeof kojLongTermNeedsModule.createLongTermNeeds === "function"
          ? kojLongTermNeedsModule.createLongTermNeeds(seed).fatigue
          : 18
      ),
      0,
      100
    ),
    techCharge: clamp(
      toNumber(
        seed.techCharge,
        typeof kojLongTermNeedsModule.createLongTermNeeds === "function"
          ? kojLongTermNeedsModule.createLongTermNeeds(seed).techCharge
          : 35
      ),
      0,
      100
    )
  };
}

function resolveBowlVisualLevel(percent) {
  const p = clamp(toNumber(percent, 0), 0, 100);

  if (p >= 95) return "full";
  if (p >= 60) return "high";
  if (p >= 30) return "mid";
  return "low";
}

function resolveMood(state) {
  const percent = clamp(toNumber(state.bowlPercent, 0), 0, 100);
  const hunger = clamp(toNumber(state.hunger, 0), 0, 100);
  const supportBurst = clamp(toNumber(state.supportBurst, 0), 0, 999999);
  const socialState = clamp(toNumber(state.socialState, 0), -100, 100);

  if (percent >= 95) return "full";
  if (supportBurst >= 8 || percent >= 60) return "excited";
  if (socialState >= 50) return "happy";
  if (hunger >= 75 && percent < 20) return "hungry";
  if (percent > 0) return "warm";
  return "idle";
}

function resolveStage(state) {
  const percent = clamp(toNumber(state.bowlPercent, 0), 0, 100);
  const supportBurst = clamp(toNumber(state.supportBurst, 0), 0, 999999);

  if (percent >= 95) return "fed";
  if (supportBurst >= 5) return "feeding";
  if (percent > 0) return "active";
  return "idle";
}

function syncDerivedState(state) {
  state.bowlPercent = clamp(round2(state.bowlPercent), 0, 100);
  state.bowlState = state.bowlPercent;
  state.bowlFillPercent = state.bowlPercent;
  state.bowlVisualLevel = resolveBowlVisualLevel(state.bowlPercent);

  state.mood = resolveMood(state);
  state.stage = resolveStage(state);
  state.evolution = getEvolutionMeta(state.feedPoints);
  state.evolutionTier = state.evolution.tier;

  if (state.vitals && typeof kojnozoutVitalsModule.resolveExpressiveMood === "function") {
    state.mood = kojnozoutVitalsModule.resolveExpressiveMood(state, state.vitals);
    state.affliction = state.vitals.affliction || null;
    state.isSleeping =
      typeof kojnozoutVitalsModule.isSleeping === "function"
        ? kojnozoutVitalsModule.isSleeping(state.vitals)
        : false;
  }

  state.bowl = {
    percent: state.bowlPercent,
    visualLevel: state.bowlVisualLevel,
    stage: state.stage
  };

  state.metrics = {
    hunger: clamp(round2(state.hunger), 0, 100),
    energy: clamp(round2(state.energy), 0, 100),
    socialState: clamp(round2(state.socialState), -100, 100),
    supportBurst: clamp(toNumber(state.supportBurst, 0), 0, 999999),
    totalFedCoins: clamp(toNumber(state.totalFedCoins, 0), 0, 999999999),
    totalFeedEvents: clamp(toNumber(state.totalFeedEvents, 0), 0, 999999999),
    totalCommunityPings: clamp(toNumber(state.totalCommunityPings, 0), 0, 999999999)
  };

  state.lastUpdatedAt = nowTs();
  return state;
}

function getSupportCoins(support = {}) {
  const totalCoins = toNumber(support.totalCoins, NaN);
  if (Number.isFinite(totalCoins) && totalCoins > 0) return totalCoins;

  const coins = toNumber(support.coins, NaN);
  if (Number.isFinite(coins) && coins > 0) return coins;

  const rawValue = toNumber(support.rawValue, NaN);
  if (Number.isFinite(rawValue) && rawValue > 0) return rawValue;

  const value = toNumber(support.value, NaN);
  if (Number.isFinite(value) && value > 0) return value;

  return 0;
}

function getSupportRepeatCount(support = {}) {
  return Math.max(
    1,
    toNumber(support.repeatCount, NaN) ||
      toNumber(support.quantity, NaN) ||
      toNumber(support.count, NaN) ||
      1
  );
}

function getEffectiveFeedValue(support = {}) {
  /**
   * SOURCE OF TRUTH:
   * - 1 MIA bod = 0.01 %
   * - support.miaPoints má přednost
   * - fallback: supportIndex / 100
   * - giftMap.bowl.fillMul násobí péči (Donut/Lion hostina)
   */
  let value = 0;
  const miaPoints = toNumber(support.miaPoints, NaN);
  if (Number.isFinite(miaPoints) && miaPoints > 0) {
    value = miaPoints;
  } else {
    const supportIndex = toNumber(support.supportIndex, NaN);
    if (Number.isFinite(supportIndex) && supportIndex > 0) {
      value = supportIndex / 100;
    }
  }

  if (value <= 0) return 0;

  const fillMul = toNumber(
    support.giftBowl?.fillMul ?? support.giftMap?.bowl?.fillMul,
    1
  );
  const safeMul = Number.isFinite(fillMul) && fillMul > 0 ? fillMul : 1;
  return value * safeMul;
}

function computeSupportBowlGain(effectiveFeedValue) {
  /**
   * 1 MIA bod = 0.01 % misky
   */
  const safeValue = Math.max(0, toNumber(effectiveFeedValue, 0));
  if (safeValue <= 0) return 0;

  return round2(safeValue * 0.01);
}

function applyGiftMapCareEffects(state, support = {}) {
  const effects =
    support.giftMap?.careEffects ||
    support.giftMapRuntime?.careEffects ||
    null;
  if (!effects || typeof effects !== "object") {
    return state;
  }

  const hungerDelta = toNumber(effects.hunger, 0);
  const joyDelta = toNumber(effects.joy, 0);
  const energyDelta = toNumber(effects.energy, 0);
  const bondDelta = toNumber(effects.bond, 0);

  if (hungerDelta) {
    state.hunger = clamp(state.hunger + hungerDelta, 0, 100);
  }
  if (energyDelta) {
    state.energy = clamp(state.energy + energyDelta, 0, 100);
  }
  if (joyDelta || bondDelta) {
    state.socialState = clamp(
      state.socialState + joyDelta * 0.35 + bondDelta * 0.5,
      -100,
      100
    );
  }

  return state;
}

function applyPassiveDecay(state, ctx = {}) {
  const now = nowTs();
  const lastDecayAt = toNumber(state.lastDecayAt, now);
  const elapsedMs = Math.max(0, now - lastDecayAt);

  if (elapsedMs <= 0) {
    state.lastDecayAt = now;
    if (
      !ctx.skipVitalsSync &&
      typeof kojnozoutVitalsModule.syncVitals === "function"
    ) {
      kojnozoutVitalsModule.syncVitals(state, ctx.streamState || {}, { minutesElapsed: 0 });
    } else if (ctx.skipVitalsSync) {
      syncDerivedState(state);
    } else {
      syncDerivedState(state);
    }
    return state;
  }

  const minutes = elapsedMs / 60000;

  /**
   * 1 minuta neaktivity = -0.075 % misky
   */
  const bowlDecayPerMinute = 0.075;
  const hungerRisePerMinute = 0.35;
  const energyDecayPerMinute = 0.08;
  const socialDecayPerMinute = 0.10;

  state.bowlPercent = clamp(
    state.bowlPercent - minutes * bowlDecayPerMinute,
    0,
    100
  );

  state.hunger = clamp(state.hunger + minutes * hungerRisePerMinute, 0, 100);
  state.energy = clamp(state.energy - minutes * energyDecayPerMinute, 0, 100);
  state.socialState = clamp(
    state.socialState - minutes * socialDecayPerMinute,
    -100,
    100
  );

  if (typeof kojLongTermNeedsModule.tickLongTermNeeds === "function") {
    kojLongTermNeedsModule.tickLongTermNeeds(state, { minutesElapsed: minutes });
  }

  state.supportBurst = clamp(
    state.supportBurst - minutes * 0.6,
    0,
    999999
  );

  state.lastDecayAt = now;

  if (
    !ctx.skipVitalsSync &&
    typeof kojnozoutVitalsModule.syncVitals === "function"
  ) {
    kojnozoutVitalsModule.syncVitals(state, ctx.streamState || {}, { minutesElapsed: minutes });
  }

  if (typeof kojnozoutBondModule.applyPassiveBondDecay === "function") {
    const decayed = kojnozoutBondModule.applyPassiveBondDecay(state, ctx.streamState || {}, {
      minutesElapsed: minutes
    });
    state.bond = decayed.bond;
    state.socialState = decayed.socialState;
  }

  return syncDerivedState(state);
}

function resolveSupportInput(supportOrEvent = {}) {
  if (
    supportOrEvent?.support &&
    typeof supportOrEvent.support === "object"
  ) {
    return {
      ...supportOrEvent.support,
      user: supportOrEvent.support.user || supportOrEvent.user || null
    };
  }

  return supportOrEvent || {};
}

function applySupportToKojnozout(currentState, support = {}, ctx = {}) {
  const supportPayload = resolveSupportInput(support);
  const state = createKojnozoutState(currentState || {});
  applyPassiveDecay(state, { ...ctx, skipVitalsSync: true });

  const coins = getSupportCoins(supportPayload);
  const repeatCount = getSupportRepeatCount(supportPayload);
  const effectiveFeedValue = getEffectiveFeedValue(supportPayload);
  const bowlGain = computeSupportBowlGain(effectiveFeedValue);
  const previousTier = resolveEvolutionTier(state.feedPoints);

  if (typeof kojnozoutVitalsModule.applyActivityWake === "function") {
    const wakeStrength = bowlGain >= 1 ? 2.4 : effectiveFeedValue > 0 ? 1.6 : 1;
    kojnozoutVitalsModule.applyActivityWake(state, wakeStrength);
  }

  state.bowlPercent = clamp(state.bowlPercent + bowlGain, 0, 100);
  applyGiftMapCareEffects(state, supportPayload);

  // Gift mapa CARE skupina → lehká CARE akce (podrbat / nakrmit / léčit…), ne jen vitals delta.
  let giftCareAction = null;
  try {
    const careModule = require("./MIA_KOJNOZROUT_CARE");
    if (typeof careModule.applyGiftMapCareAction === "function") {
      const careResult = careModule.applyGiftMapCareAction(state, supportPayload);
      if (careResult?.applied && careResult.state) {
        Object.assign(state, careResult.state);
        giftCareAction = careResult.action;
      }
    }
  } catch (_err) {
    // CARE modul je volitelný pro support feed
  }

  state.hunger = clamp(
    state.hunger - Math.max(0.8, effectiveFeedValue * 0.07),
    0,
    100
  );
  state.energy = clamp(state.energy + bowlGain * 0.55, 0, 100);
  state.socialState = clamp(
    state.socialState + Math.max(0.05, bowlGain * 0.18),
    -100,
    100
  );

  /**
   * feedPoints držíme jako compat pole, ale teď jsou to MIA body
   */
  state.feedPoints = clamp(
    toNumber(state.feedPoints, 0) + effectiveFeedValue,
    0,
    999999
  );

  /**
   * supportBurst necháváme jen jako behavior metodu počtu support eventů,
   * ne jako výpočet bowl %
   */
  state.supportBurst = clamp(
    toNumber(state.supportBurst, 0) + Math.max(1, repeatCount),
    0,
    999999
  );

  state.totalFedCoins = clamp(
    toNumber(state.totalFedCoins, 0) + coins,
    0,
    999999999
  );

  state.totalFeedEvents = clamp(
    toNumber(state.totalFeedEvents, 0) + 1,
    0,
    999999999
  );

  state.lastFedAt = nowTs();
  state.lastActor = supportPayload.user || null;
  state.lastTrigger = safeString(supportPayload.giftName, "support_feed");

  // CARE akce z gift mapy má vlastní behavior (display mood), feed ji nepřepisuje.
  const careBehaviorByAction = {
    podrbat: "care_react",
    uklidnit: "care_react",
    lecit: "care_react",
    pozornost: "care_react",
    vencit: "walking",
    nakrmit: bowlGain >= 1 ? "big_feed" : "feed_react"
  };
  if (giftCareAction && careBehaviorByAction[giftCareAction]) {
    state.behavior = careBehaviorByAction[giftCareAction];
  } else {
    state.behavior = bowlGain >= 1 ? "big_feed" : "support_feed";
  }
  if (state.isSleeping || toNumber(state.vitals?.sleepDepth, 0) >= 40) {
    state.behavior = giftCareAction ? "sleepy_react" : "sleepy_feed";
  }

  if (typeof kojnozoutVitalsModule.applySupportHealing === "function") {
    kojnozoutVitalsModule.applySupportHealing(state, {
      miaPoints: effectiveFeedValue,
      tier: safeString(supportPayload.tier || supportPayload.support?.tier, "T1")
    });
  }
  if (typeof kojnozoutVitalsModule.syncVitals === "function") {
    kojnozoutVitalsModule.syncVitals(state, ctx.streamState || {}, { minutesElapsed: 0 });
    state.affliction = state.vitals?.affliction || null;
  }

  if (typeof kojnozoutBondModule.applyCareBondImpact === "function") {
    const bonded = kojnozoutBondModule.applyCareBondImpact(
      state,
      kojnozoutBondModule.careImpactForAction("support_gift")
    );
    state.bond = bonded.bond;
    state.lastCareAt = bonded.lastCareAt;
  }

  syncDerivedState(state);

  const evolutionLevelUp =
    state.evolutionTier !== previousTier
      ? {
          fromTier: previousTier,
          toTier: state.evolutionTier,
          label: state.evolution.label,
          scale: state.evolution.scale,
          feedPoints: state.evolution.feedPoints,
          nextTier: state.evolution.nextTier,
          nextTierLabel: state.evolution.nextTierLabel,
          pointsToNext: state.evolution.pointsToNext
        }
      : null;

  return {
    ok: true,
    trigger: "support_feed",
    bowlGain,
    effectiveFeedValue,
    giftCareAction,
    coins,
    repeatCount,
    evolutionLevelUp,
    state: clone(state),
    payload: {
      action: bowlGain >= 1 ? "feed_big" : "feed",
      text:
        bowlGain >= 1
          ? "Kojnožrout dostal pořádný nášup."
          : "Kojnožrout dostal něco do misky.",
      mood: state.mood,
      stage: state.stage,
      intensity: bowlGain >= 1 ? 3 : bowlGain >= 0.2 ? 2 : 1,
      bowlPercent: state.bowlPercent,
      bowlVisualLevel: state.bowlVisualLevel,
      hunger: state.hunger,
      energy: state.energy,
      socialState: state.socialState
    }
  };
}

function resolveCommunityImpact(impactOrEvent = {}) {
  if (
    impactOrEvent?.communityImpact &&
    typeof impactOrEvent.communityImpact === "object"
  ) {
    return impactOrEvent.communityImpact;
  }

  return impactOrEvent && typeof impactOrEvent === "object" ? impactOrEvent : {};
}

function applyCommunityPingToKojnozout(currentState, impactOrEvent = {}, meta = {}) {
  const impact = resolveCommunityImpact(impactOrEvent);
  const state = createKojnozoutState(currentState || {});
  const ctx = meta.ctx || {};
  applyPassiveDecay(state, ctx);

  if (typeof kojnozoutVitalsModule.applyActivityWake === "function") {
    kojnozoutVitalsModule.applyActivityWake(state, 1.2);
  }

  const engagementDelta = toNumber(impact.engagementDelta, 0);
  const miaPoints = Math.max(0, toNumber(impact.miaPoints, 1.5));
  const bowlGain = miaPoints > 0 ? computeSupportBowlGain(miaPoints) : 0;
  const previousTier = resolveEvolutionTier(state.feedPoints);

  state.socialState = clamp(
    state.socialState + engagementDelta * 0.9,
    -100,
    100
  );

  state.energy = clamp(
    state.energy + engagementDelta * 0.2,
    0,
    100
  );

  state.bowlPercent = clamp(
    state.bowlPercent + bowlGain,
    0,
    100
  );

  if (miaPoints > 0) {
    state.feedPoints = clamp(
      toNumber(state.feedPoints, 0) + miaPoints,
      0,
      999999
    );
  }

  state.totalCommunityPings = clamp(
    toNumber(state.totalCommunityPings, 0) + 1,
    0,
    999999999
  );

  state.lastPingAt = nowTs();
  state.lastActor = meta.user || null;
  state.lastTrigger = safeString(meta.eventType, "community_ping");
  state.behavior = "play_with_chat";
  if (state.isSleeping || toNumber(state.vitals?.sleepDepth, 0) >= 40) {
    state.behavior = "sleepy_chat";
  }

  if (typeof kojnozoutVitalsModule.syncVitals === "function") {
    kojnozoutVitalsModule.syncVitals(state, ctx.streamState || {}, { minutesElapsed: 0 });
  }

  if (typeof kojnozoutBondModule.touchCommunity === "function") {
    const touched = kojnozoutBondModule.touchCommunity(state, 1);
    state.bond = touched.bond;
  }

  syncDerivedState(state);

  const evolutionLevelUp =
    state.evolutionTier !== previousTier
      ? {
          fromTier: previousTier,
          toTier: state.evolutionTier,
          label: state.evolution.label,
          scale: state.evolution.scale,
          feedPoints: state.evolution.feedPoints,
          nextTier: state.evolution.nextTier,
          nextTierLabel: state.evolution.nextTierLabel,
          pointsToNext: state.evolution.pointsToNext
        }
      : null;

  return {
    ok: true,
    trigger: "community_ping",
    evolutionLevelUp,
    state: clone(state),
    payload: {
      action: "react",
      text: "Kojnožrout registruje komunitu.",
      mood: state.mood,
      stage: state.stage,
      intensity: engagementDelta >= 2 ? 2 : 1,
      bowlPercent: state.bowlPercent,
      bowlVisualLevel: state.bowlVisualLevel,
      hunger: state.hunger,
      energy: state.energy,
      socialState: state.socialState
    }
  };
}

function getKojnozoutSnapshot(currentState, streamState = null) {
  const state = createKojnozoutState(currentState || {});
  applyPassiveDecay(state, { streamState: streamState || {} });

  if (typeof kojnozoutVitalsModule.syncVitals === "function") {
    kojnozoutVitalsModule.syncVitals(state, streamState || {}, {
      minutesElapsed: 0,
      snapshotMode: true
    });
    syncDerivedState(state);
  }

  if (
    state.lastEvolutionMoment &&
    toNumber(state.lastEvolutionMoment.until, 0) <= nowTs()
  ) {
    state.lastEvolutionMoment = null;
  }

  return clone(state);
}

module.exports = {
  EVOLUTION_TIERS,
  createKojnozoutState,
  getKojnozoutSnapshot,
  applyPassiveDecay,
  applySupportToKojnozout,
  applyCommunityPingToKojnozout,
  getSupportCoins,
  getSupportRepeatCount,
  getEffectiveFeedValue,
  computeSupportBowlGain,
  resolveEvolutionTier,
  getEvolutionMeta,
  formatEvolutionSubtext
};