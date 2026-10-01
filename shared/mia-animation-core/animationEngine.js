"use strict";

/**
 * Master Canon 0036 — Animation Engine: central visual animation layer for MIA.
 */

const crypto = require("crypto");

const AE_COMPONENT = Object.freeze({
  ANIMATION_MANAGER: "animation_manager",
  ANIMATION_STATE_MACHINE: "animation_state_machine",
  ANIMATION_SCHEDULER: "animation_scheduler",
  TRANSITION_MANAGER: "transition_manager",
  LAYER_MANAGER: "layer_manager",
  BLEND_ENGINE: "blend_engine",
  EMOTION_ADAPTER: "emotion_adapter",
  SPEECH_ADAPTER: "speech_adapter",
  BATTLE_ADAPTER: "battle_adapter",
  OBS_ADAPTER: "obs_adapter",
  ANIMATION_CACHE: "animation_cache",
  ANIMATION_METRICS: "animation_metrics",
  ANIMATION_API: "animation_api"
});

const AE_COMPONENT_ORDER = Object.freeze(Object.values(AE_COMPONENT));

const AE_CHARACTER = Object.freeze({
  MIA: "mia",
  KOJNOZROUT: "kojnozout"
});

const AE_MIA_STATE = Object.freeze({
  IDLE: "idle",
  LISTENING: "listening",
  SPEAKING: "speaking",
  HAPPY: "happy",
  THINKING: "thinking",
  SURPRISED: "surprised",
  SLEEPING: "sleeping",
  BATTLE: "battle"
});

const AE_KOJ_STATE = Object.freeze({
  HUNGRY: "hungry",
  EATING: "eating",
  HAPPY: "happy",
  ANGRY: "angry",
  SLEEPING: "sleeping",
  RUNNING: "running",
  BATTLE: "battle",
  LOVE: "love",
  DRAMA: "drama",
  CHAOS: "chaos"
});

const AE_LAYER = Object.freeze({
  BACKGROUND: "background",
  BODY: "body",
  HEAD: "head",
  EYES: "eyes",
  HANDS: "hands",
  ACCESSORIES: "accessories",
  EFFECTS: "effects"
});

const AE_LAYER_ORDER = Object.freeze(Object.values(AE_LAYER));

const AE_SYNC_TARGET = Object.freeze({
  MIA_HEAD: "mia_head",
  MIA_EYES: "mia_eyes",
  MIA_HANDS: "mia_hands",
  MIA_FEET: "mia_feet",
  SPEECH_OVERLAY: "speech_overlay",
  GIFT_OVERLAY: "gift_overlay",
  BATTLE_OVERLAY: "battle_overlay",
  OBS: "obs"
});

const AE_BATTLE_ACTION = Object.freeze({
  ATTACK: "attack",
  DEFEND: "defend",
  VICTORY: "victory",
  DEFEAT: "defeat",
  COMBO: "combo",
  SPECIAL_ITEM: "special_item"
});

const AE_FORBIDDEN_ACTIVITIES = Object.freeze([
  "mutate_decision_engine",
  "mutate_emotion_engine",
  "mutate_personality",
  "decide_actions",
  "play_audio"
]);

const AE_RUNTIME_ANCHORS = Object.freeze([
  "shared/mia-animation-core/animationEngine.js",
  "shared/mia-animation-engine/index.js",
  "shared/mia-graphics-studio/bodyPartState.js",
  "mia-output-overlay/lib/mia-body-part-runtime.js",
  "scripts/MIA_OBS_OVERLAY_SYNC.js",
  "shared/mia-speech-core/speechEngine.js"
]);

const DEFAULT_ANIMATIONS = Object.freeze({
  idle: Object.freeze({ animationId: "idle", name: "Idle", durationMs: 0, priority: 10, type: "loop" }),
  smile: Object.freeze({ animationId: "smile", name: "Smile", durationMs: 1200, priority: 30, type: "oneshot" }),
  blink: Object.freeze({ animationId: "blink", name: "Blink", durationMs: 180, priority: 40, type: "oneshot" }),
  gift: Object.freeze({ animationId: "gift", name: "Gift", durationMs: 2400, priority: 70, type: "oneshot" }),
  eating: Object.freeze({ animationId: "eating", name: "Eating", durationMs: 3000, priority: 60, type: "oneshot" })
});

function manageAnimation(input = {}) {
  const base = DEFAULT_ANIMATIONS[input.animationId] || DEFAULT_ANIMATIONS.idle;
  return Object.freeze({
    ok: true,
    animation: Object.freeze({
      animationId: input.animationId || base.animationId,
      name: input.name || base.name,
      durationMs: input.durationMs != null ? Number(input.durationMs) : base.durationMs,
      priority: input.priority != null ? Number(input.priority) : base.priority,
      type: input.type || base.type,
      conditions: Object.freeze(input.conditions || [])
    }),
    component: AE_COMPONENT.ANIMATION_MANAGER
  });
}

function getCharacterStates(character = AE_CHARACTER.MIA) {
  const states =
    character === AE_CHARACTER.KOJNOZROUT
      ? Object.values(AE_KOJ_STATE)
      : Object.values(AE_MIA_STATE);
  return Object.freeze({ ok: true, character, states, component: AE_COMPONENT.ANIMATION_STATE_MACHINE });
}

function resolveAnimationState(character = AE_CHARACTER.MIA, context = {}) {
  if (context.battleActive) {
    return character === AE_CHARACTER.KOJNOZROUT ? AE_KOJ_STATE.BATTLE : AE_MIA_STATE.BATTLE;
  }
  if (context.speaking) return AE_MIA_STATE.SPEAKING;
  if (context.listening) return AE_MIA_STATE.LISTENING;
  if (context.emotion?.primary === "joy") {
    return character === AE_CHARACTER.KOJNOZROUT ? AE_KOJ_STATE.HAPPY : AE_MIA_STATE.HAPPY;
  }
  if (context.emotion?.primary === "tension") {
    return character === AE_CHARACTER.KOJNOZROUT ? AE_KOJ_STATE.ANGRY : AE_MIA_STATE.THINKING;
  }
  if (context.gift) return character === AE_CHARACTER.KOJNOZROUT ? AE_KOJ_STATE.EATING : AE_MIA_STATE.HAPPY;
  return character === AE_CHARACTER.KOJNOZROUT ? AE_KOJ_STATE.HUNGRY : AE_MIA_STATE.IDLE;
}

function transitionState(fromState, toState, character = AE_CHARACTER.MIA) {
  const allowed = getCharacterStates(character).states;
  const valid = allowed.includes(fromState) && allowed.includes(toState);
  return Object.freeze({
    ok: valid,
    from: fromState,
    to: toState,
    smooth: true,
    steps: Object.freeze(valid ? [fromState, toState] : []),
    component: AE_COMPONENT.TRANSITION_MANAGER
  });
}

function planTransitionPath(fromState, toState, character = AE_CHARACTER.MIA) {
  if (fromState === toState) {
    return Object.freeze({ ok: true, path: Object.freeze([fromState]), component: AE_COMPONENT.TRANSITION_MANAGER });
  }
  if (toState === AE_MIA_STATE.SPEAKING || toState === AE_MIA_STATE.HAPPY) {
    const mid = character === AE_CHARACTER.MIA ? AE_MIA_STATE.HAPPY : AE_KOJ_STATE.HAPPY;
    return Object.freeze({
      ok: true,
      path: Object.freeze([fromState, mid, toState]),
      component: AE_COMPONENT.TRANSITION_MANAGER
    });
  }
  return transitionState(fromState, toState, character);
}

function manageLayers(activeLayers = {}) {
  const layers = AE_LAYER_ORDER.map((layer) =>
    Object.freeze({
      layer,
      visible: activeLayers[layer] !== false,
      zIndex: AE_LAYER_ORDER.indexOf(layer)
    })
  );
  return Object.freeze({ ok: true, layers: Object.freeze(layers), component: AE_COMPONENT.LAYER_MANAGER });
}

function blendAnimations(tracks = []) {
  const sorted = [...tracks].sort((a, b) => (b.priority || 0) - (a.priority || 0));
  const conflicts = sorted.filter((t) => t.layer === "head" && t.blocking);
  const merged = sorted.map((track) =>
    Object.freeze({
      animationId: track.animationId,
      layer: track.layer || AE_LAYER.BODY,
      weight: track.weight != null ? track.weight : 1,
      priority: track.priority || 10
    })
  );

  return Object.freeze({
    ok: conflicts.length <= 1,
    tracks: Object.freeze(merged),
    component: AE_COMPONENT.BLEND_ENGINE
  });
}

function adaptEmotionAnimation(emotion = {}, character = AE_CHARACTER.MIA) {
  const primary = emotion.primary || "calm";
  const intensity = emotion.intensity != null ? Number(emotion.intensity) : 50;

  let motionScale = 1;
  let smile = 0.2;
  let eyeStyle = "neutral";

  if (primary === "joy") {
    motionScale = 1.15;
    smile = 0.7 + intensity / 300;
    eyeStyle = "bright";
  } else if (primary === "tension") {
    motionScale = 0.75;
    smile = 0.05;
    eyeStyle = "narrow";
  } else if (primary === "calm") {
    motionScale = 0.9;
    smile = 0.25;
    eyeStyle = "soft";
  }

  return Object.freeze({
    ok: true,
    character,
    motionScale: Math.round(motionScale * 1000) / 1000,
    smile: Math.round(smile * 1000) / 1000,
    eyeStyle,
    component: AE_COMPONENT.EMOTION_ADAPTER
  });
}

function adaptSpeechAnimation(speechPlan = {}) {
  const timeline = Object.freeze([
    { phase: "lip_sync", target: AE_SYNC_TARGET.MIA_HEAD },
    { phase: "blink", target: AE_SYNC_TARGET.MIA_EYES },
    { phase: "head_motion", target: AE_SYNC_TARGET.MIA_HEAD },
    { phase: "hand_gesture", target: AE_SYNC_TARGET.MIA_HANDS }
  ]);

  return Object.freeze({
    ok: true,
    speechId: speechPlan.speechId || null,
    timeline,
    lipFrames: speechPlan.lipSync?.frames?.length || 0,
    component: AE_COMPONENT.SPEECH_ADAPTER
  });
}

function adaptBattleAnimation(battle = {}) {
  const action = battle.action || AE_BATTLE_ACTION.ATTACK;
  const priority = action === AE_BATTLE_ACTION.COMBO ? 95 : 85;

  return Object.freeze({
    ok: true,
    action,
    priority,
    overlay: AE_SYNC_TARGET.BATTLE_OVERLAY,
    targets: Object.freeze([AE_SYNC_TARGET.BATTLE_OVERLAY, AE_SYNC_TARGET.OBS]),
    component: AE_COMPONENT.BATTLE_ADAPTER
  });
}

function planObsSync(animationState = {}, layers = []) {
  return Object.freeze({
    ok: true,
    sources: Object.freeze([
      { id: "mia_body", visible: true, layer: AE_LAYER.BODY },
      { id: "speech_overlay", visible: animationState.speaking === true, layer: AE_LAYER.HEAD }
    ]),
    scene: animationState.battleActive ? "battle" : "main",
    layerOrder: Object.freeze(layers.map((l) => l.layer)),
    component: AE_COMPONENT.OBS_ADAPTER
  });
}

function cacheKeyForAnimation(character, animationId, state) {
  return crypto.createHash("sha1").update(`${character}:${animationId}:${state}`).digest("hex");
}

function lookupAnimationCache(cache = {}, character, animationId, state) {
  const key = cacheKeyForAnimation(character, animationId, state);
  const hit = cache[key] || null;
  return Object.freeze({ ok: Boolean(hit), key, hit, component: AE_COMPONENT.ANIMATION_CACHE });
}

function storeAnimationCache(cache = {}, character, animationId, state, payload = {}) {
  const key = cacheKeyForAnimation(character, animationId, state);
  const next = { ...cache, [key]: { ...payload, key, storedAt: Date.now() } };
  return Object.freeze({ ok: true, key, cache: Object.freeze(next), component: AE_COMPONENT.ANIMATION_CACHE });
}

function collectAnimationMetrics(run = {}) {
  return Object.freeze({
    fps: run.fps || 60,
    switchMs: run.switchMs || 0,
    activeAnimations: run.activeAnimations || 0,
    cacheHit: Boolean(run.cacheHit),
    gpuLoad: run.gpuLoad || 0,
    component: AE_COMPONENT.ANIMATION_METRICS
  });
}

function scheduleAnimation(queue = [], item = {}) {
  const entry = Object.freeze({
    animationId: item.animationId || `anim-${crypto.randomUUID()}`,
    character: item.character || AE_CHARACTER.MIA,
    priority: item.priority != null ? Number(item.priority) : 50,
    state: item.state || AE_MIA_STATE.IDLE,
    queuedAt: Date.now(),
    component: AE_COMPONENT.ANIMATION_SCHEDULER
  });
  const next = [...queue, entry].sort((a, b) => b.priority - a.priority);
  return Object.freeze({ ok: true, entry, queue: Object.freeze(next), component: AE_COMPONENT.ANIMATION_SCHEDULER });
}

function validateAnimationInput(input = {}) {
  const errors = [];
  if (!input.fromDecision && !input.fromEmotion && !input.fromSpeech && !input.fromBattle) {
    errors.push("upstream_context_required");
  }
  if (input.decides === true) errors.push("animation_must_not_decide");
  if (input.playAudio === true) errors.push("audio_forbidden");
  return Object.freeze({ ok: errors.length === 0, errors: Object.freeze(errors), component: AE_COMPONENT.ANIMATION_API });
}

function assertAnimationForbiddenActivity(activity) {
  const key = String(activity || "");
  return { ok: !AE_FORBIDDEN_ACTIVITIES.includes(key), activity: key };
}

function createAnimationEngine(options = {}) {
  const queue = [];
  const cache = {};
  const history = [];
  let currentState = { mia: AE_MIA_STATE.IDLE, kojnozout: AE_KOJ_STATE.HUNGRY };

  return {
    animate(input = {}, adapters = {}) {
      const startedAt = Date.now();
      const validation = validateAnimationInput({
        fromDecision: input.fromDecision === true || Boolean(input.decision),
        fromEmotion: input.fromEmotion === true || Boolean(input.emotion),
        fromSpeech: input.fromSpeech === true || Boolean(input.speech),
        fromBattle: input.fromBattle === true || Boolean(input.battle),
        decides: input.decides,
        playAudio: input.playAudio
      });

      if (!validation.ok) {
        return Object.freeze({
          ok: false,
          error: "invalid_animation_input",
          validation,
          decides: false,
          component: AE_COMPONENT.ANIMATION_API
        });
      }

      const character = input.character || AE_CHARACTER.MIA;
      const emotion = input.emotion || {};
      const speech = input.speech || null;
      const battle = input.battle || null;

      const state = resolveAnimationState(character, {
        battleActive: Boolean(battle?.active || input.battleActive),
        speaking: Boolean(speech || input.speaking),
        listening: Boolean(input.listening),
        emotion,
        gift: Boolean(input.gift)
      });

      const previous =
        character === AE_CHARACTER.KOJNOZROUT ? currentState.kojnozout : currentState.mia;
      const transition = planTransitionPath(previous, state, character);
      if (character === AE_CHARACTER.KOJNOZROUT) currentState.kojnozout = state;
      else currentState.mia = state;

      const managed = manageAnimation({ animationId: state, priority: battle ? 90 : 50 });
      const scheduled = scheduleAnimation(queue, {
        animationId: managed.animation.animationId,
        character,
        priority: managed.animation.priority,
        state
      });
      queue.length = 0;
      queue.push(...scheduled.queue);

      const emotionAnim = adaptEmotionAnimation(emotion, character);
      const speechAnim = speech ? adaptSpeechAnimation(speech) : null;
      const battleAnim = battle ? adaptBattleAnimation(battle) : null;

      const blendTracks = [
        { animationId: state, layer: AE_LAYER.BODY, priority: managed.animation.priority, weight: 1 },
        { animationId: "blink", layer: AE_LAYER.EYES, priority: 40, weight: 0.6 },
        emotionAnim.smile > 0.5
          ? { animationId: "smile", layer: AE_LAYER.HEAD, priority: 35, weight: emotionAnim.smile }
          : null,
        speechAnim ? { animationId: "speaking", layer: AE_LAYER.HEAD, priority: 80, weight: 1, blocking: true } : null,
        battleAnim ? { animationId: battleAnim.action, layer: AE_LAYER.EFFECTS, priority: battleAnim.priority, weight: 1 } : null
      ].filter(Boolean);

      const blended = blendAnimations(blendTracks);
      const layers = manageLayers({
        [AE_LAYER.BODY]: true,
        [AE_LAYER.HEAD]: true,
        [AE_LAYER.EYES]: true,
        [AE_LAYER.HANDS]: Boolean(speechAnim),
        [AE_LAYER.EFFECTS]: Boolean(battleAnim)
      });

      const cacheLookup = lookupAnimationCache(cache, character, state, state);
      if (!cacheLookup.ok) {
        const stored = storeAnimationCache(cache, character, state, state, {
          frames: blended.tracks.length,
          renderer: options.renderer || "png_runtime"
        });
        Object.assign(cache, stored.cache);
      }

      const obs = planObsSync(
        { speaking: Boolean(speechAnim), battleActive: Boolean(battleAnim) },
        layers.layers
      );

      const metrics = collectAnimationMetrics({
        switchMs: Date.now() - startedAt,
        activeAnimations: blended.tracks.length,
        cacheHit: cacheLookup.ok
      });

      const result = Object.freeze({
        ok: true,
        animationId: managed.animation.animationId,
        character,
        state,
        previousState: previous,
        transition,
        emotionAnim,
        speechAnim,
        battleAnim,
        blended,
        layers,
        obs,
        syncTargets: Object.freeze([
          AE_SYNC_TARGET.MIA_HEAD,
          AE_SYNC_TARGET.MIA_EYES,
          AE_SYNC_TARGET.MIA_HANDS,
          AE_SYNC_TARGET.MIA_FEET,
          AE_SYNC_TARGET.SPEECH_OVERLAY,
          battleAnim ? AE_SYNC_TARGET.BATTLE_OVERLAY : null,
          AE_SYNC_TARGET.OBS
        ].filter(Boolean)),
        metrics,
        decides: false,
        playsAudio: false,
        forObs: true,
        renderer: options.renderer || "png_runtime",
        component: AE_COMPONENT.ANIMATION_API
      });

      history.push(Object.freeze({ ...result, completedAt: Date.now() }));
      return result;
    },
    state() {
      return Object.freeze({ ...currentState });
    },
    queue() {
      return Object.freeze([...queue]);
    },
    history() {
      return Object.freeze([...history]);
    }
  };
}

function createAnimationApiResponse(data = {}, options = {}) {
  return Object.freeze({
    ok: true,
    decides: false,
    executes: options.executes === true,
    data,
    component: AE_COMPONENT.ANIMATION_API
  });
}

module.exports = {
  AE_COMPONENT,
  AE_COMPONENT_ORDER,
  AE_CHARACTER,
  AE_MIA_STATE,
  AE_KOJ_STATE,
  AE_LAYER,
  AE_LAYER_ORDER,
  AE_SYNC_TARGET,
  AE_BATTLE_ACTION,
  AE_FORBIDDEN_ACTIVITIES,
  AE_RUNTIME_ANCHORS,
  manageAnimation,
  getCharacterStates,
  resolveAnimationState,
  transitionState,
  planTransitionPath,
  manageLayers,
  blendAnimations,
  adaptEmotionAnimation,
  adaptSpeechAnimation,
  adaptBattleAnimation,
  planObsSync,
  lookupAnimationCache,
  storeAnimationCache,
  collectAnimationMetrics,
  scheduleAnimation,
  validateAnimationInput,
  createAnimationEngine,
  createAnimationApiResponse,
  assertAnimationForbiddenActivity
};
