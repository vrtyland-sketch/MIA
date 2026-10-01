"use strict";

/**
 * Master Canon 0032 — Emotion Engine: adaptive expression layer for MIA.
 */

const crypto = require("crypto");

const EE_COMPONENT = Object.freeze({
  EMOTION_STATE_MANAGER: "emotion_state_manager",
  MOOD_MANAGER: "mood_manager",
  EMOTION_EVALUATOR: "emotion_evaluator",
  EMOTION_MIXER: "emotion_mixer",
  PERSONALITY_ADAPTER: "personality_adapter",
  COMMUNITY_ADAPTER: "community_adapter",
  RELATIONSHIP_ADAPTER: "relationship_adapter",
  INTENSITY_CONTROLLER: "intensity_controller",
  EMOTION_TRANSITION_MANAGER: "emotion_transition_manager",
  EMOTION_VALIDATOR: "emotion_validator",
  EMOTION_METRICS: "emotion_metrics",
  EMOTION_API: "emotion_api"
});

const EE_COMPONENT_ORDER = Object.freeze(Object.values(EE_COMPONENT));

const EE_EMOTION = Object.freeze({
  CALM: "calm",
  JOY: "joy",
  TENSION: "tension",
  SURPRISE: "surprise",
  FOCUS: "focus",
  EXPECTATION: "expectation"
});

const EE_MOOD = Object.freeze({
  POSITIVE: "positive",
  NEUTRAL: "neutral",
  PLAYFUL: "playful",
  COMPETITIVE: "competitive",
  FOCUSED: "focused",
  TIRED: "tired"
});

const EE_PERSONALITY_STYLE = Object.freeze({
  CALM: "calm",
  WITTY: "witty",
  ENERGETIC: "energetic",
  GENTLE: "gentle"
});

const EE_KOJ_EMOTION = Object.freeze({
  HUNGER: "hunger",
  JOY: "joy",
  CURIOSITY: "curiosity",
  SLEEPINESS: "sleepiness",
  BATTLE_READY: "battle_ready",
  CONTENTMENT: "contentment"
});

const EE_FORBIDDEN_ACTIVITIES = Object.freeze([
  "mutate_facts",
  "decide_economy",
  "bypass_decision_engine",
  "mutate_memory",
  "discriminate_users",
  "inconsistent_behavior"
]);

const EE_RUNTIME_ANCHORS = Object.freeze([
  "shared/mia-emotion-core/emotionEngine.js",
  "shared/mia-memory-core/emotionalMemory.js",
  "scripts/MIA_MOOD_BRAIN.js",
  "shared/mia-decision-core/decisionEngine.js"
]);

const INTENSITY_MIN = 0;
const INTENSITY_MAX = 100;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function manageEmotionState(current = {}, input = {}) {
  const active = new Set(current.active || [EE_EMOTION.CALM]);
  for (const emotion of input.add || []) active.add(emotion);
  for (const emotion of input.remove || []) active.delete(emotion);

  if (!active.size) active.add(EE_EMOTION.CALM);

  return Object.freeze({
    ok: true,
    active: Object.freeze([...active]),
    primary: input.primary || [...active][0] || EE_EMOTION.CALM,
    component: EE_COMPONENT.EMOTION_STATE_MANAGER
  });
}

function manageMood(current = {}, context = {}) {
  let mood = current.mood || EE_MOOD.NEUTRAL;

  if (context.battleActive) mood = EE_MOOD.COMPETITIVE;
  else if (context.systemLoad != null && context.systemLoad > 0.9) mood = EE_MOOD.TIRED;
  else if (context.chatVelocity != null && context.chatVelocity > 40) mood = EE_MOOD.PLAYFUL;
  else if (context.gift || context.positiveStream) mood = EE_MOOD.POSITIVE;
  else if (context.focusRequired) mood = EE_MOOD.FOCUSED;

  return Object.freeze({
    ok: true,
    mood,
    previous: current.mood || null,
    slowShift: true,
    component: EE_COMPONENT.MOOD_MANAGER
  });
}

function evaluateEventEmotion(event = {}, context = {}) {
  const influences = [];

  if (event.type === "gift" || context.gift) {
    const points = Number(context.gift?.miaPoints || event.gift?.miaPoints || 1);
    const intensity = points >= 5000 ? 0.95 : points >= 500 ? 0.75 : points >= 100 ? 0.55 : 0.25;
    influences.push({
      emotion: EE_EMOTION.JOY,
      weight: intensity,
      reason: points >= 5000 ? "major_gift" : "gift_received"
    });
  }

  if (event.type === "chat" || context.chatMessage) {
    influences.push({ emotion: EE_EMOTION.JOY, weight: 0.35, reason: "chat_engagement" });
  }

  if (context.obsDown || event.type === "obs_outage") {
    influences.push({ emotion: EE_EMOTION.TENSION, weight: 0.8, reason: "obs_outage" });
  }

  if (context.battleActive) {
    influences.push({ emotion: EE_EMOTION.FOCUS, weight: 0.7, reason: "active_battle" });
    influences.push({ emotion: EE_EMOTION.EXPECTATION, weight: 0.45, reason: "battle_anticipation" });
  }

  if (!influences.length) {
    influences.push({ emotion: EE_EMOTION.CALM, weight: 0.4, reason: "baseline" });
  }

  return Object.freeze({
    ok: true,
    influences: Object.freeze(influences),
    readOnly: true,
    component: EE_COMPONENT.EMOTION_EVALUATOR
  });
}

function mixEmotions(influences = []) {
  const totals = new Map();

  for (const item of influences) {
    const key = item.emotion;
    totals.set(key, (totals.get(key) || 0) + Number(item.weight || 0));
  }

  const mixed = [...totals.entries()]
    .map(([emotion, weight]) => Object.freeze({ emotion, weight: Math.round(weight * 1000) / 1000 }))
    .sort((a, b) => b.weight - a.weight);

  return Object.freeze({
    ok: true,
    mixed: Object.freeze(mixed),
    dominant: mixed[0] || null,
    component: EE_COMPONENT.EMOTION_MIXER
  });
}

function adaptPersonality(state = {}, personality = {}) {
  const style = personality.style || EE_PERSONALITY_STYLE.ENERGETIC;
  const intensityFactor =
    style === EE_PERSONALITY_STYLE.CALM
      ? 0.7
      : style === EE_PERSONALITY_STYLE.GENTLE
        ? 0.75
        : style === EE_PERSONALITY_STYLE.WITTY
          ? 1.05
          : 1.1;

  return Object.freeze({
    ok: true,
    style,
    intensityFactor,
    expression: Object.freeze({
      tone: style,
      humor: style === EE_PERSONALITY_STYLE.WITTY ? "light" : "balanced",
      energy: style === EE_PERSONALITY_STYLE.ENERGETIC ? "high" : "medium"
    }),
    component: EE_COMPONENT.PERSONALITY_ADAPTER
  });
}

function adaptCommunity(state = {}, community = {}) {
  const chatVelocity = community.chatVelocity != null ? Number(community.chatVelocity) : 0;
  const viewers = community.viewers != null ? Number(community.viewers) : 0;
  const giftRate = community.giftRate != null ? Number(community.giftRate) : 0;

  let atmosphere = "steady";
  if (giftRate > 8 || chatVelocity > 50) atmosphere = "energetic";
  if (community.battleActive) atmosphere = "competitive";

  return Object.freeze({
    ok: true,
    atmosphere,
    viewers,
    chatVelocity,
    giftRate,
    component: EE_COMPONENT.COMMUNITY_ADAPTER
  });
}

function adaptRelationship(state = {}, user = {}, emotionalMemory = {}) {
  const trustScore =
    user.trustScore != null
      ? Number(user.trustScore)
      : emotionalMemory.trustScore != null
        ? Number(emotionalMemory.trustScore)
        : 50;

  const reputation = user.reputation || emotionalMemory.reputation || null;
  const isSupporter = reputation === "project_supporter" || trustScore >= 75;
  const isNew = trustScore < 30;

  return Object.freeze({
    ok: true,
    userId: user.userId || null,
    trustScore,
    greetingStyle: isSupporter ? "personal_welcome" : isNew ? "friendly_intro" : "warm_ack",
    personalization: isSupporter ? "high" : isNew ? "low" : "medium",
    readOnly: true,
    component: EE_COMPONENT.RELATIONSHIP_ADAPTER
  });
}

function controlIntensity(state = {}, factors = {}) {
  const base = factors.base != null ? Number(factors.base) : 50;
  const giftBoost = factors.giftPoints != null ? Math.min(30, Number(factors.giftPoints) / 200) : 0;
  const battleBoost = factors.battleActive ? 15 : 0;
  const moodBoost = factors.mood === EE_MOOD.POSITIVE ? 10 : 0;
  const personalityFactor = factors.personalityFactor != null ? Number(factors.personalityFactor) : 1;

  const intensity = clamp(Math.round((base + giftBoost + battleBoost + moodBoost) * personalityFactor), INTENSITY_MIN, INTENSITY_MAX);

  return Object.freeze({
    ok: true,
    intensity,
    voiceLevel: Math.round(intensity * 0.9),
    animationScale: Math.round(intensity),
    responseLengthFactor: Math.round((intensity / 100) * 1000) / 1000,
    kojEnergy: Math.round(intensity * 0.85),
    component: EE_COMPONENT.INTENSITY_CONTROLLER
  });
}

function transitionEmotion(from = EE_EMOTION.CALM, to = EE_EMOTION.JOY, options = {}) {
  const steps = options.steps != null ? Number(options.steps) : 3;
  const path = [from];
  const order = [EE_EMOTION.CALM, EE_EMOTION.JOY, EE_EMOTION.SURPRISE, EE_EMOTION.FOCUS, EE_EMOTION.TENSION];

  let currentIdx = order.indexOf(from);
  const targetIdx = order.indexOf(to);
  if (currentIdx < 0) currentIdx = 0;

  const direction = targetIdx >= currentIdx ? 1 : -1;
  for (let i = 0; i < steps; i += 1) {
    const nextIdx = currentIdx + direction;
    if (nextIdx < 0 || nextIdx >= order.length) break;
    currentIdx = nextIdx;
    path.push(order[currentIdx]);
    if (order[currentIdx] === to) break;
  }
  if (path[path.length - 1] !== to) path.push(to);

  return Object.freeze({
    ok: true,
    from,
    to,
    path: Object.freeze(path),
    smooth: path.length <= 4,
    component: EE_COMPONENT.EMOTION_TRANSITION_MANAGER
  });
}

function validateEmotionState(state = {}) {
  const errors = [];
  const active = state.active || [];
  const intensities = state.intensities || {};

  if (active.includes(EE_EMOTION.JOY) && active.includes("extreme_sadness")) {
    errors.push("conflicting_extremes");
  }
  if (intensities.joy != null && intensities.joy > 95 && intensities.sadness != null && intensities.sadness > 95) {
    errors.push("joy_sadness_conflict");
  }
  if (state.intensity != null && (state.intensity < INTENSITY_MIN || state.intensity > INTENSITY_MAX)) {
    errors.push("intensity_out_of_range");
  }

  return Object.freeze({
    ok: errors.length === 0,
    errors: Object.freeze(errors),
    component: EE_COMPONENT.EMOTION_VALIDATOR
  });
}

function collectEmotionMetrics(run = {}) {
  return Object.freeze({
    changeCount: run.changeCount || 0,
    averageIntensity: run.averageIntensity || 0,
    stability: run.stability != null ? run.stability : 0.8,
    durationMs: run.durationMs || 0,
    decisionInfluence: run.decisionInfluence != null ? run.decisionInfluence : 0.5,
    component: EE_COMPONENT.EMOTION_METRICS
  });
}

function buildKojnozoutEmotionState(context = {}, intensity = {}) {
  let primary = EE_KOJ_EMOTION.CONTENTMENT;

  if (context.battleActive) primary = EE_KOJ_EMOTION.BATTLE_READY;
  else if (context.gift) primary = EE_KOJ_EMOTION.JOY;
  else if (context.kojHungry) primary = EE_KOJ_EMOTION.HUNGER;
  else if (context.kojSleepy) primary = EE_KOJ_EMOTION.SLEEPINESS;
  else if (context.chatMessage) primary = EE_KOJ_EMOTION.CURIOSITY;

  return Object.freeze({
    entityId: "kojnozout.pet",
    primary,
    energy: intensity.kojEnergy != null ? intensity.kojEnergy : 50,
    independentFromMia: true,
    component: EE_COMPONENT.EMOTION_API
  });
}

function adaptEmotionalMemoryContext(snapshot = {}) {
  return Object.freeze({
    readOnly: true,
    trustScore: snapshot.trustScore != null ? Number(snapshot.trustScore) : null,
    mood: snapshot.mood || null,
    relationships: Object.freeze(snapshot.relationships || []),
    reputation: snapshot.reputation || null,
    component: EE_COMPONENT.EMOTION_API
  });
}

function toDecisionEmotionAdapter(state = {}) {
  return Object.freeze({
    mood: state.mood,
    trustScore: state.relationship?.trustScore != null ? state.relationship.trustScore : null,
    intensity: state.intensity,
    style: state.personality?.style || EE_PERSONALITY_STYLE.ENERGETIC,
    expression: state.personality?.expression || null,
    readOnly: true,
    influencesDecisionStyle: true,
    decides: false
  });
}

function assertEmotionForbiddenActivity(activity) {
  const key = String(activity || "");
  return { ok: !EE_FORBIDDEN_ACTIVITIES.includes(key), activity: key };
}

function createEmotionEngine(options = {}) {
  const history = [];
  let currentState = manageEmotionState({}, { add: [EE_EMOTION.CALM] });
  let currentMood = manageMood({}, {});

  return {
    evaluate(context = {}, adapters = {}) {
      const emotionalMemory = adaptEmotionalMemoryContext(adapters.emotionalMemory || {});
      const evaluated = evaluateEventEmotion({ type: context.eventType }, context);
      const mixed = mixEmotions(evaluated.influences);

      const state = manageEmotionState(currentState, {
        add: mixed.mixed.map((m) => m.emotion),
        primary: mixed.dominant?.emotion || EE_EMOTION.CALM
      });
      currentState = state;

      const mood = manageMood(currentMood, context);
      currentMood = mood;

      const personality = adaptPersonality(state, adapters.personality || options.personality || {});
      const community = adaptCommunity(state, context.community || context);
      const relationship = adaptRelationship(state, context.user || {}, emotionalMemory);
      const intensity = controlIntensity(state, {
        base: mixed.dominant ? mixed.dominant.weight * 100 : 50,
        giftPoints: context.gift?.miaPoints,
        battleActive: context.battleActive,
        mood: mood.mood,
        personalityFactor: personality.intensityFactor
      });

      const transition = transitionEmotion(
        history.length ? history[history.length - 1].primary : EE_EMOTION.CALM,
        state.primary
      );

      const kojnozout = buildKojnozoutEmotionState(context, intensity);

      const emotionState = Object.freeze({
        stateId: `emotion-${crypto.randomUUID()}`,
        active: state.active,
        primary: state.primary,
        mood: mood.mood,
        mixed: mixed.mixed,
        intensity: intensity.intensity,
        personality,
        community,
        relationship,
        kojnozout,
        transition,
        emotionalMemory,
        decides: false,
        executes: false,
        forDecisionEngine: true
      });

      const validation = validateEmotionState({
        active: emotionState.active,
        intensity: emotionState.intensity,
        intensities: {
          joy: emotionState.primary === EE_EMOTION.JOY ? emotionState.intensity : 0,
          sadness: emotionState.active.includes("extreme_sadness") ? 100 : 0
        }
      });

      if (!validation.ok) {
        return Object.freeze({
          ok: false,
          error: "emotion_validation_failed",
          validation,
          component: EE_COMPONENT.EMOTION_API
        });
      }

      history.push(
        Object.freeze({
          stateId: emotionState.stateId,
          primary: emotionState.primary,
          mood: emotionState.mood,
          at: Date.now()
        })
      );

      return Object.freeze({
        ok: true,
        emotionState,
        decisionAdapter: toDecisionEmotionAdapter(emotionState),
        metrics: collectEmotionMetrics({
          changeCount: history.length,
          averageIntensity: intensity.intensity,
          durationMs: 0,
          decisionInfluence: 0.6
        }),
        component: EE_COMPONENT.EMOTION_API
      });
    },
    history() {
      return Object.freeze([...history]);
    }
  };
}

function createEmotionApiResponse(data = {}, options = {}) {
  return Object.freeze({
    ok: true,
    decides: false,
    executes: false,
    data,
    component: EE_COMPONENT.EMOTION_API
  });
}

module.exports = {
  EE_COMPONENT,
  EE_COMPONENT_ORDER,
  EE_EMOTION,
  EE_MOOD,
  EE_PERSONALITY_STYLE,
  EE_KOJ_EMOTION,
  EE_FORBIDDEN_ACTIVITIES,
  EE_RUNTIME_ANCHORS,
  INTENSITY_MIN,
  INTENSITY_MAX,
  manageEmotionState,
  manageMood,
  evaluateEventEmotion,
  mixEmotions,
  adaptPersonality,
  adaptCommunity,
  adaptRelationship,
  controlIntensity,
  transitionEmotion,
  validateEmotionState,
  collectEmotionMetrics,
  buildKojnozoutEmotionState,
  adaptEmotionalMemoryContext,
  toDecisionEmotionAdapter,
  createEmotionEngine,
  createEmotionApiResponse,
  assertEmotionForbiddenActivity
};
