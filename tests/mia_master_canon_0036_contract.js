"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const MASTER = path.join(ROOT, "docs", "master-canon");
const animation = require("../shared/mia-animation-core");
const speech = require("../shared/mia-speech-core");
const conversation = require("../shared/mia-conversation-core");
const personality = require("../shared/mia-personality-core");
const emotion = require("../shared/mia-emotion-core");
const decision = require("../shared/mia-decision-core");
const architecture = require("../shared/mia-architecture-core");

function pathExists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function pass(label) {
  console.log(`✅ ${label}`);
}

function run() {
  const docPath = path.join(MASTER, "0036-animation-engine.md");
  const alignPath = path.join(MASTER, "0036-alignment.md");

  assert.ok(fs.existsSync(docPath), "0036-animation-engine.md exists");
  assert.ok(fs.existsSync(alignPath), "0036-alignment.md exists");
  pass("0036 files on disk");

  const doc = fs.readFileSync(docPath, "utf8");
  for (let i = 1; i <= 23; i += 1) {
    assert.ok(doc.includes(`## ${i}.`), `0036 section ${i}`);
  }
  assert.ok(doc.includes("Visual Core"), "0036 critical priority");
  assert.ok(doc.includes("0035"), "0036 links to 0035");
  assert.ok(doc.includes("0037"), "0036 points to 0037");
  pass("0036 structure (23 sections)");

  assert.equal(animation.AE_COMPONENT_ORDER.length, 13);
  pass("animation components");

  const miaStates = animation.getCharacterStates(animation.AE_CHARACTER.MIA);
  const kojStates = animation.getCharacterStates(animation.AE_CHARACTER.KOJNOZROUT);
  assert.ok(miaStates.states.includes(animation.AE_MIA_STATE.SPEAKING));
  assert.ok(kojStates.states.includes(animation.AE_KOJ_STATE.EATING));
  pass("animation state machine");

  const speakingState = animation.resolveAnimationState(animation.AE_CHARACTER.MIA, { speaking: true });
  assert.equal(speakingState, animation.AE_MIA_STATE.SPEAKING);
  const giftState = animation.resolveAnimationState(animation.AE_CHARACTER.KOJNOZROUT, { gift: true });
  assert.equal(giftState, animation.AE_KOJ_STATE.EATING);
  pass("resolve animation state");

  const pathPlan = animation.planTransitionPath(
    animation.AE_MIA_STATE.IDLE,
    animation.AE_MIA_STATE.SPEAKING,
    animation.AE_CHARACTER.MIA
  );
  assert.ok(pathPlan.path.length >= 2);
  pass("transition manager");

  const layers = animation.manageLayers({ [animation.AE_LAYER.HANDS]: true });
  assert.equal(layers.layers.length, animation.AE_LAYER_ORDER.length);
  pass("layer manager");

  const blended = animation.blendAnimations([
    { animationId: "speaking", layer: animation.AE_LAYER.HEAD, priority: 80, blocking: true },
    { animationId: "blink", layer: animation.AE_LAYER.EYES, priority: 40, weight: 0.6 }
  ]);
  assert.equal(blended.ok, true);
  pass("blend engine");

  const joyAnim = animation.adaptEmotionAnimation({ primary: "joy", intensity: 80 });
  const tensionAnim = animation.adaptEmotionAnimation({ primary: "tension", intensity: 70 });
  assert.ok(joyAnim.motionScale > tensionAnim.motionScale);
  assert.ok(joyAnim.smile > tensionAnim.smile);
  pass("emotion adapter");

  const speechAnim = animation.adaptSpeechAnimation({
    speechId: "s1",
    lipSync: { frames: [{ timeMs: 0, viseme: "A" }] }
  });
  assert.ok(speechAnim.timeline.some((t) => t.phase === "lip_sync"));
  pass("speech adapter");

  const battleAnim = animation.adaptBattleAnimation({ action: animation.AE_BATTLE_ACTION.COMBO });
  assert.equal(battleAnim.priority, 95);
  pass("battle adapter");

  const obs = animation.planObsSync({ speaking: true }, layers.layers);
  assert.ok(obs.sources.length >= 1);
  pass("obs adapter");

  const cache = {};
  const stored = animation.storeAnimationCache(
    cache,
    animation.AE_CHARACTER.MIA,
    "idle",
    animation.AE_MIA_STATE.IDLE,
    { frames: 12 }
  );
  const hit = animation.lookupAnimationCache(
    stored.cache,
    animation.AE_CHARACTER.MIA,
    "idle",
    animation.AE_MIA_STATE.IDLE
  );
  assert.equal(hit.ok, true);
  pass("animation cache");

  const engine = animation.createAnimationEngine();
  const emotionEngine = emotion.createEmotionEngine();
  const personalityEngine = personality.createPersonalityEngine();
  const decisionEngine = decision.createDecisionEngine();
  const conversationEngine = conversation.createConversationEngine();
  const speechEngine = speech.createSpeechEngine();

  const chatResult = conversationEngine.handleMessage(
    { text: "Ahoj MIA!", userId: "vasa", threadId: conversation.CE_THREAD.TIKTOK },
    { emotionEngine, personalityEngine, decisionEngine, memory: { working: true, shortTerm: true } }
  );

  const spoken = speechEngine.speak({
    text: chatResult.response.text,
    speaker: speech.SE_SPEAKER.MIA,
    emotion: chatResult.emotion,
    fromConversationEngine: true
  });

  const visual = engine.animate({
    character: animation.AE_CHARACTER.MIA,
    emotion: chatResult.emotion,
    speech: spoken,
    decision: chatResult.decision,
    fromDecision: true,
    fromEmotion: true,
    fromSpeech: true
  });

  assert.equal(visual.ok, true);
  assert.equal(visual.decides, false);
  assert.equal(visual.playsAudio, false);
  assert.equal(visual.state, animation.AE_MIA_STATE.SPEAKING);
  assert.ok(visual.speechAnim);
  assert.ok(visual.syncTargets.includes(animation.AE_SYNC_TARGET.MIA_HEAD));
  pass("full speech to animation pipeline");

  const battleVisual = engine.animate({
    character: animation.AE_CHARACTER.KOJNOZROUT,
    battle: { active: true, action: animation.AE_BATTLE_ACTION.COMBO },
    emotion: { primary: "joy", intensity: 90 },
    fromBattle: true,
    fromEmotion: true
  });
  assert.equal(battleVisual.state, animation.AE_KOJ_STATE.BATTLE);
  assert.ok(battleVisual.battleAnim);
  pass("battle animation pipeline");

  const invalid = engine.animate({ character: animation.AE_CHARACTER.MIA });
  assert.equal(invalid.ok, false);
  pass("reject animation without upstream context");

  assert.equal(animation.assertAnimationForbiddenActivity("decide_actions").ok, false);
  assert.equal(animation.assertAnimationForbiddenActivity("play_audio").ok, false);
  pass("forbidden activities");

  const gfxSys = architecture.getPlatformSystem(architecture.PLATFORM_SYSTEM_ID.GRAPHICS);
  assert.equal(gfxSys.nextDocId, "0088");
  assert.ok(gfxSys.runtime.includes("shared/mia-animation-core/animationEngine.js"));
  pass("graphics system next doc 0041");

  const aiSys = architecture.getPlatformSystem(architecture.PLATFORM_SYSTEM_ID.AI);
  assert.equal(aiSys.nextDocId, "0088");
  pass("AI system next doc 0041");

  for (const rel of animation.AE_RUNTIME_ANCHORS) {
    assert.ok(pathExists(rel), `anchor exists: ${rel}`);
  }
  pass("runtime anchors");

  const readme = read("docs/master-canon/README.md");
  assert.ok(readme.includes("0036"), "README 0036");
  pass("README registry");

  console.log("\nMaster Canon 0036 contract: ALL PASS");
}

run();
