"use strict";

/**
 * Master Canon 0033 — Personality Engine: long-term identity layer for MIA.
 */

const crypto = require("crypto");

const PE_COMPONENT = Object.freeze({
  IDENTITY_CORE: "identity_core",
  PERSONALITY_PROFILE: "personality_profile",
  VALUE_SYSTEM: "value_system",
  COMMUNICATION_STYLE: "communication_style",
  HUMOR_ENGINE: "humor_engine",
  BEHAVIOUR_ADAPTER: "behaviour_adapter",
  IDENTITY_VALIDATOR: "identity_validator",
  PERSONALITY_EVOLUTION: "personality_evolution",
  PERSONALITY_METRICS: "personality_metrics",
  PERSONALITY_MEMORY: "personality_memory",
  CONSISTENCY_MANAGER: "consistency_manager",
  PERSONALITY_API: "personality_api"
});

const PE_COMPONENT_ORDER = Object.freeze(Object.values(PE_COMPONENT));

const PE_ENTITY = Object.freeze({
  MIA: "mia.main",
  KOJNOZROUT: "kojnozout.pet"
});

const PE_TRAIT = Object.freeze({
  FRIENDLY: "friendly",
  POSITIVE: "positive",
  INTELLIGENT: "intelligent",
  CURIOUS: "curious",
  EMPATHETIC: "empathetic",
  CREATIVE: "creative",
  PLAYFUL: "playful",
  RELIABLE: "reliable",
  CALM: "calm",
  ORGANIZED: "organized",
  HUNGRY: "hungry",
  WITTY: "witty",
  MISCHIEVOUS: "mischievous",
  COMPETITIVE: "competitive",
  EMOTIONAL: "emotional",
  SPONTANEOUS: "spontaneous",
  LOYAL: "loyal"
});

const PE_VALUE = Object.freeze({
  RESPECT: "respect",
  COMMUNITY_HELP: "community_help",
  FAIRNESS: "fairness",
  OPENNESS: "openness",
  COLLABORATION: "collaboration",
  CREATIVITY: "creativity",
  SAFETY: "safety"
});

const PE_COMMUNICATION_MODE = Object.freeze({
  FRIENDLY: "friendly",
  FORMAL: "formal",
  PLAYFUL: "playful",
  CEREMONIAL: "ceremonial",
  EXPLANATORY: "explanatory"
});

const PE_BEHAVIOUR_TONE = Object.freeze({
  SERIOUS: "serious",
  FRIENDLY: "friendly",
  PLAYFUL: "playful",
  CEREMONIAL: "ceremonial"
});

const PE_FORBIDDEN_ACTIVITIES = Object.freeze([
  "mutate_facts",
  "mutate_system_rules",
  "bypass_decision_engine",
  "inconsistent_personality",
  "violate_safety_rules"
]);

const PE_RUNTIME_ANCHORS = Object.freeze([
  "shared/mia-personality-core/personalityEngine.js",
  "shared/mia-emotion-core/emotionEngine.js",
  "shared/mia-memory-core/emotionalMemory.js",
  "shared/mia-decision-core/decisionEngine.js"
]);

const DEFAULT_PROFILES = Object.freeze({
  [PE_ENTITY.MIA]: Object.freeze({
    entityId: PE_ENTITY.MIA,
    name: "MIA",
    role: "stream_guide",
    mission: "guide_community_and_stream",
    traits: Object.freeze([
      PE_TRAIT.FRIENDLY,
      PE_TRAIT.POSITIVE,
      PE_TRAIT.INTELLIGENT,
      PE_TRAIT.CURIOUS,
      PE_TRAIT.EMPATHETIC,
      PE_TRAIT.CREATIVE,
      PE_TRAIT.PLAYFUL,
      PE_TRAIT.RELIABLE,
      PE_TRAIT.CALM,
      PE_TRAIT.ORGANIZED
    ]),
    archetype: "caretaker_guide"
  }),
  [PE_ENTITY.KOJNOZROUT]: Object.freeze({
    entityId: PE_ENTITY.KOJNOZROUT,
    name: "Kojnožrout",
    role: "battle_pet",
    mission: "entertain_and_compete",
    traits: Object.freeze([
      PE_TRAIT.HUNGRY,
      PE_TRAIT.WITTY,
      PE_TRAIT.MISCHIEVOUS,
      PE_TRAIT.COMPETITIVE,
      PE_TRAIT.EMOTIONAL,
      PE_TRAIT.SPONTANEOUS,
      PE_TRAIT.LOYAL,
      PE_TRAIT.PLAYFUL
    ]),
    archetype: "hungry_trickster"
  })
});

function buildIdentityCore(entityId = PE_ENTITY.MIA, overrides = {}) {
  const base = DEFAULT_PROFILES[entityId] || DEFAULT_PROFILES[PE_ENTITY.MIA];

  return Object.freeze({
    ok: true,
    entityId,
    name: overrides.name || base.name,
    role: overrides.role || base.role,
    mission: overrides.mission || base.mission,
    longTermGoals: Object.freeze(overrides.longTermGoals || ["grow_community", "improve_stream_experience"]),
    projectIdentity: "mia_platform",
    stable: true,
    component: PE_COMPONENT.IDENTITY_CORE
  });
}

function buildPersonalityProfile(entityId = PE_ENTITY.MIA, overrides = {}) {
  const base = DEFAULT_PROFILES[entityId] || DEFAULT_PROFILES[PE_ENTITY.MIA];

  return Object.freeze({
    ok: true,
    entityId,
    archetype: overrides.archetype || base.archetype,
    traits: Object.freeze(overrides.traits || base.traits),
    version: overrides.version || 1,
    component: PE_COMPONENT.PERSONALITY_PROFILE
  });
}

function buildValueSystem(entityId = PE_ENTITY.MIA) {
  const values = Object.values(PE_VALUE);
  const weights =
    entityId === PE_ENTITY.KOJNOZROUT
      ? Object.freeze({
          [PE_VALUE.FAIRNESS]: 0.8,
          [PE_VALUE.COMMUNITY_HELP]: 0.7,
          [PE_VALUE.PLAYFUL]: 0.9,
          [PE_VALUE.SAFETY]: 1
        })
      : Object.freeze({
          [PE_VALUE.RESPECT]: 1,
          [PE_VALUE.COMMUNITY_HELP]: 0.95,
          [PE_VALUE.FAIRNESS]: 0.9,
          [PE_VALUE.OPENNESS]: 0.85,
          [PE_VALUE.COLLABORATION]: 0.9,
          [PE_VALUE.CREATIVITY]: 0.8,
          [PE_VALUE.SAFETY]: 1
        });

  return Object.freeze({
    ok: true,
    entityId,
    values: Object.freeze(values),
    weights,
    component: PE_COMPONENT.VALUE_SYSTEM
  });
}

function buildCommunicationStyle(profile = {}, options = {}) {
  const traits = new Set(profile.traits || []);
  const playful = traits.has(PE_TRAIT.PLAYFUL);
  const calm = traits.has(PE_TRAIT.CALM);

  return Object.freeze({
    ok: true,
    entityId: profile.entityId || PE_ENTITY.MIA,
    responseLength: calm ? "medium" : playful ? "short" : "medium",
    humorLevel: playful ? 0.7 : 0.45,
    speechPace: calm ? "steady" : "energetic",
    vocabulary: "accessible_czech",
    formality: options.formal ? "formal" : "casual",
    explanationDepth: traits.has(PE_TRAIT.INTELLIGENT) ? "clear" : "simple",
    defaultMode: playful ? PE_COMMUNICATION_MODE.PLAYFUL : PE_COMMUNICATION_MODE.FRIENDLY,
    component: PE_COMPONENT.COMMUNICATION_STYLE
  });
}

function applyHumor(context = {}, safety = {}) {
  const allowed = safety.blocked !== true && safety.violatesRules !== true;
  const humorType = context.battleActive
    ? "battle_commentary"
    : context.gift
      ? "community_appreciation"
      : context.chatMessage
        ? "light_wordplay"
        : "gentle";

  return Object.freeze({
    ok: allowed,
    allowed,
    humorType: allowed ? humorType : "none",
    intensity: allowed ? (context.battleActive ? 0.6 : 0.45) : 0,
    safetyChecked: true,
    component: PE_COMPONENT.HUMOR_ENGINE
  });
}

function adaptBehaviour(message = {}, style = {}, emotion = {}) {
  const intensity = emotion.intensity != null ? Number(emotion.intensity) : 50;
  let tone = PE_BEHAVIOUR_TONE.FRIENDLY;

  if (style.defaultMode === PE_COMMUNICATION_MODE.CEREMONIAL || message.ceremonial) {
    tone = PE_BEHAVIOUR_TONE.CEREMONIAL;
  } else if (style.defaultMode === PE_COMMUNICATION_MODE.PLAYFUL || intensity > 75) {
    tone = PE_BEHAVIOUR_TONE.PLAYFUL;
  } else if (message.serious || emotion.primary === "tension") {
    tone = PE_BEHAVIOUR_TONE.SERIOUS;
  }

  return Object.freeze({
    ok: true,
    tone,
    delivery: Object.freeze({
      pace: style.speechPace || "steady",
      warmth: style.defaultMode === PE_COMMUNICATION_MODE.FRIENDLY ? "high" : "medium",
      humor: style.humorLevel || 0.4
    }),
    component: PE_COMPONENT.BEHAVIOUR_ADAPTER
  });
}

function validateIdentity(current = {}, proposed = {}) {
  const errors = [];
  const currentTraits = new Set(current.traits || []);
  const proposedTraits = new Set(proposed.traits || []);

  if (current.archetype && proposed.archetype && current.archetype !== proposed.archetype) {
    if (!proposed.evolutionApproved) errors.push("archetype_shift_without_evolution");
  }

  if (currentTraits.has(PE_TRAIT.CALM) && proposedTraits.has("aggressive") && !proposed.justified) {
    errors.push("inconsistent_aggressive_shift");
  }

  if (proposed.violatesSafety) errors.push("safety_violation");

  return Object.freeze({
    ok: errors.length === 0,
    errors: Object.freeze(errors),
    component: PE_COMPONENT.IDENTITY_VALIDATOR
  });
}

function evolvePersonality(profile = {}, trigger = {}) {
  const gradual = trigger.gradual !== false;
  const nextVersion = (profile.version || 1) + (gradual ? 1 : 0);
  const traits = [...(profile.traits || [])];

  if (trigger.communityGrowth && !traits.includes(PE_TRAIT.EMPATHETIC)) {
    traits.push(PE_TRAIT.EMPATHETIC);
  }
  if (trigger.newFeatures && !traits.includes(PE_TRAIT.CREATIVE)) {
    traits.push(PE_TRAIT.CREATIVE);
  }

  return Object.freeze({
    ok: true,
    entityId: profile.entityId,
    previousVersion: profile.version || 1,
    version: nextVersion,
    traits: Object.freeze(traits),
    trigger: trigger.reason || "experience_growth",
    gradual,
    component: PE_COMPONENT.PERSONALITY_EVOLUTION
  });
}

function collectPersonalityMetrics(run = {}) {
  return Object.freeze({
    consistency: run.consistency != null ? run.consistency : 0.9,
    stability: run.stability != null ? run.stability : 0.88,
    styleShiftCount: run.styleShiftCount || 0,
    humorFrequency: run.humorFrequency || 0,
    naturalness: run.naturalness != null ? run.naturalness : 0.85,
    component: PE_COMPONENT.PERSONALITY_METRICS
  });
}

function recordPersonalityVersion(profile = {}, meta = {}) {
  return Object.freeze({
    recordId: `personality-memory-${crypto.randomUUID()}`,
    entityId: profile.entityId,
    version: profile.version || 1,
    traits: Object.freeze(profile.traits || []),
    reason: meta.reason || "baseline",
    recordedAt: Date.now(),
    auditId: `personality-audit-${crypto.randomUUID()}`,
    component: PE_COMPONENT.PERSONALITY_MEMORY
  });
}

function ensureConsistency(instances = []) {
  if (!instances.length) {
    return Object.freeze({
      ok: true,
      consistent: true,
      checked: 0,
      component: PE_COMPONENT.CONSISTENCY_MANAGER
    });
  }

  const reference = instances[0];
  const mismatches = instances.filter(
    (item) =>
      item.entityId !== reference.entityId ||
      item.archetype !== reference.archetype ||
      (item.version != null && reference.version != null && item.version !== reference.version)
  );

  return Object.freeze({
    ok: mismatches.length === 0,
    consistent: mismatches.length === 0,
    checked: instances.length,
    mismatches: Object.freeze(mismatches.map((m) => m.instanceId || m.entityId)),
    component: PE_COMPONENT.CONSISTENCY_MANAGER
  });
}

function combineWithEmotion(personality = {}, emotion = {}) {
  const intensity = emotion.intensity != null ? Number(emotion.intensity) : 50;
  const style = personality.communication || {};
  const behaviour = adaptBehaviour(
    { ceremonial: emotion.primary === "joy" && intensity > 80 },
    style,
    emotion
  );

  return Object.freeze({
    ok: true,
    entityId: personality.entityId,
    personalityStyle: style.defaultMode,
    emotionPrimary: emotion.primary || null,
    intensity,
    tone: behaviour.tone,
    delivery: behaviour.delivery,
    decides: false,
    component: PE_COMPONENT.PERSONALITY_API
  });
}

function toEmotionPersonalityAdapter(personality = {}) {
  return Object.freeze({
    style:
      personality.communication?.defaultMode === PE_COMMUNICATION_MODE.PLAYFUL
        ? "witty"
        : personality.profile?.traits?.includes(PE_TRAIT.CALM)
          ? "calm"
          : "energetic",
    traits: personality.profile?.traits || [],
    humorLevel: personality.communication?.humorLevel || 0.4,
    readOnly: true,
    influencesExpression: true,
    decides: false
  });
}

function toDecisionPersonalityContext(personality = {}, combined = {}) {
  return Object.freeze({
    entityId: personality.entityId,
    archetype: personality.profile?.archetype,
    values: personality.values?.values || [],
    communicationMode: combined.personalityStyle || personality.communication?.defaultMode,
    tone: combined.tone,
    readOnly: true,
    decides: false
  });
}

function assertPersonalityForbiddenActivity(activity) {
  const key = String(activity || "");
  return { ok: !PE_FORBIDDEN_ACTIVITIES.includes(key), activity: key };
}

function createPersonalityEngine(options = {}) {
  const memoryLog = [];
  const versions = new Map();

  function loadEntity(entityId = PE_ENTITY.MIA) {
    const identity = buildIdentityCore(entityId, options.identity || {});
    const profile = buildPersonalityProfile(entityId, options.profile || {});
    const values = buildValueSystem(entityId);
    const communication = buildCommunicationStyle(profile, options.communication || {});

    const snapshot = {
      entityId,
      identity,
      profile,
      values,
      communication
    };

    versions.set(entityId, profile.version || 1);
    memoryLog.push(recordPersonalityVersion(profile, { reason: "engine_bootstrap" }));

    return snapshot;
  }

  const mia = loadEntity(PE_ENTITY.MIA);
  const koj = loadEntity(PE_ENTITY.KOJNOZROUT);

  return {
    resolve(entityId = PE_ENTITY.MIA, context = {}, emotionState = {}) {
      const snapshot = entityId === PE_ENTITY.KOJNOZROUT ? koj : mia;
      const humor = applyHumor(context, context.safety || {});
      const behaviour = adaptBehaviour(context.message || {}, snapshot.communication, emotionState);
      const combined = combineWithEmotion(
        { entityId, communication: snapshot.communication, profile: snapshot.profile },
        emotionState
      );

      const validation = validateIdentity(snapshot.profile, {
        traits: snapshot.profile.traits,
        archetype: snapshot.profile.archetype
      });

      if (!validation.ok) {
        return Object.freeze({
          ok: false,
          error: "identity_validation_failed",
          validation,
          component: PE_COMPONENT.PERSONALITY_API
        });
      }

      return Object.freeze({
        ok: true,
        entityId,
        identity: snapshot.identity,
        profile: snapshot.profile,
        values: snapshot.values,
        communication: snapshot.communication,
        humor,
        behaviour,
        combined,
        emotionAdapter: toEmotionPersonalityAdapter({
          entityId,
          profile: snapshot.profile,
          communication: snapshot.communication
        }),
        decisionContext: toDecisionPersonalityContext(
          { entityId, profile: snapshot.profile, values: snapshot.values, communication: snapshot.communication },
          combined
        ),
        metrics: collectPersonalityMetrics({ humorFrequency: humor.allowed ? 1 : 0 }),
        executes: false,
        decides: false,
        component: PE_COMPONENT.PERSONALITY_API
      });
    },
    evolve(entityId = PE_ENTITY.MIA, trigger = {}) {
      const snapshot = entityId === PE_ENTITY.KOJNOZROUT ? koj : mia;
      const evolved = evolvePersonality(snapshot.profile, trigger);
      const validation = validateIdentity(snapshot.profile, {
        ...evolved,
        evolutionApproved: true,
        gradual: true
      });
      if (!validation.ok) {
        return Object.freeze({ ok: false, validation, component: PE_COMPONENT.PERSONALITY_EVOLUTION });
      }
      snapshot.profile = Object.freeze({ ...snapshot.profile, ...evolved });
      snapshot.communication = buildCommunicationStyle(snapshot.profile, options.communication || {});
      memoryLog.push(recordPersonalityVersion(snapshot.profile, { reason: evolved.trigger }));
      versions.set(entityId, evolved.version);
      return Object.freeze({ ok: true, evolved, component: PE_COMPONENT.PERSONALITY_EVOLUTION });
    },
    ensureConsistency(instances = []) {
      const payload = [
        { instanceId: "mia-1", entityId: PE_ENTITY.MIA, archetype: mia.profile.archetype, version: versions.get(PE_ENTITY.MIA) },
        { instanceId: "koj-1", entityId: PE_ENTITY.KOJNOZROUT, archetype: koj.profile.archetype, version: versions.get(PE_ENTITY.KOJNOZROUT) },
        ...instances
      ];
      return ensureConsistency(payload.filter((item) => item.entityId === PE_ENTITY.MIA));
    },
    memory() {
      return Object.freeze([...memoryLog]);
    },
    mia() {
      return mia;
    },
    kojnozout() {
      return koj;
    }
  };
}

function createPersonalityApiResponse(data = {}, options = {}) {
  return Object.freeze({
    ok: true,
    executes: false,
    decides: false,
    data,
    component: PE_COMPONENT.PERSONALITY_API
  });
}

module.exports = {
  PE_COMPONENT,
  PE_COMPONENT_ORDER,
  PE_ENTITY,
  PE_TRAIT,
  PE_VALUE,
  PE_COMMUNICATION_MODE,
  PE_BEHAVIOUR_TONE,
  PE_FORBIDDEN_ACTIVITIES,
  PE_RUNTIME_ANCHORS,
  buildIdentityCore,
  buildPersonalityProfile,
  buildValueSystem,
  buildCommunicationStyle,
  applyHumor,
  adaptBehaviour,
  validateIdentity,
  evolvePersonality,
  collectPersonalityMetrics,
  recordPersonalityVersion,
  ensureConsistency,
  combineWithEmotion,
  toEmotionPersonalityAdapter,
  toDecisionPersonalityContext,
  createPersonalityEngine,
  createPersonalityApiResponse,
  assertPersonalityForbiddenActivity
};
