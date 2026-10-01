"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const MASTER = path.join(ROOT, "docs", "master-canon");
const render = require("../shared/mia-render-core");
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
  const docPath = path.join(MASTER, "0037-visual-rendering-system.md");
  const alignPath = path.join(MASTER, "0037-alignment.md");

  assert.ok(fs.existsSync(docPath), "0037-visual-rendering-system.md exists");
  assert.ok(fs.existsSync(alignPath), "0037-alignment.md exists");
  pass("0037 files on disk");

  const doc = fs.readFileSync(docPath, "utf8");
  for (let i = 1; i <= 24; i += 1) {
    assert.ok(doc.includes(`## ${i}.`), `0037 section ${i}`);
  }
  assert.ok(doc.includes("Visual Core"), "0037 critical priority");
  assert.ok(doc.includes("0036"), "0037 links to 0036");
  assert.ok(doc.includes("0038"), "0037 points to 0038");
  pass("0037 structure (24 sections)");

  assert.equal(render.VR_COMPONENT_ORDER.length, 12);
  pass("render components");

  const mainScene = render.resolveScene({});
  assert.equal(mainScene, render.VR_SCENE.MAIN_STREAM);
  const battleScene = render.resolveScene({ battleActive: true });
  assert.equal(battleScene, render.VR_SCENE.BATTLE);
  pass("scene manager");

  const layers = render.renderLayers(render.VR_SCENE.MAIN_STREAM, { [render.VR_LAYER.MIA]: true });
  assert.equal(layers.layers.length, render.VR_LAYER_ORDER.length);
  pass("layer renderer");

  const camera = render.manageCamera(render.VR_SCENE.MAIN_STREAM);
  assert.equal(camera.mode, "static");
  pass("camera manager");

  const sceneConfig = render.getSceneConfig(render.VR_SCENE.MAIN_STREAM);
  const overlays = render.renderOverlays(sceneConfig.config, {});
  assert.ok(overlays.overlays.some((o) => o.overlayId === render.VR_OVERLAY.SPEECH));
  pass("overlay renderer");

  const effects = render.renderEffects({ battleAnim: { action: "combo" } }, { primary: "joy" });
  assert.ok(effects.effects.length >= 2);
  pass("effect renderer");

  const runtime = render.selectRuntimeRenderer(render.VR_RUNTIME.PNG_RUNTIME);
  assert.equal(runtime.runtime, render.VR_RUNTIME.PNG_RUNTIME);
  pass("runtime renderer");

  const gpu = render.manageGpu({ gpuLoad: 0.9 });
  assert.equal(gpu.throttle, true);
  const optimized = render.optimizeRender(layers.layers, gpu);
  assert.equal(optimized.visualUnchanged, true);
  pass("gpu manager and optimizer");

  const obs = render.planObsRender(render.VR_SCENE.BATTLE, layers.layers, overlays.overlays);
  assert.equal(obs.activeScene, "battle");
  pass("obs renderer");

  const metrics = render.collectRenderMetrics({ fps: 60, drawCalls: 8 });
  assert.equal(metrics.fps, 60);
  pass("render metrics");

  const animEngine = animation.createAnimationEngine();
  const speechEngine = speech.createSpeechEngine();
  const conversationEngine = conversation.createConversationEngine();
  const emotionEngine = emotion.createEmotionEngine();
  const personalityEngine = personality.createPersonalityEngine();
  const decisionEngine = decision.createDecisionEngine();
  const renderSystem = render.createVisualRenderingSystem();

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

  const visual = animEngine.animate({
    character: animation.AE_CHARACTER.MIA,
    emotion: chatResult.emotion,
    speech: spoken,
    decision: chatResult.decision,
    fromDecision: true,
    fromEmotion: true,
    fromSpeech: true
  });

  const frame = renderSystem.render({
    animation: visual,
    emotion: chatResult.emotion,
    speech: spoken,
    decision: chatResult.decision,
    fromAnimation: true
  });

  assert.equal(frame.ok, true);
  assert.equal(frame.decides, false);
  assert.equal(frame.mutatesInput, false);
  assert.equal(frame.executesAi, false);
  assert.ok(frame.frame.layers.some((l) => l.layer === render.VR_LAYER.MIA && l.visible));
  assert.ok(frame.pipeline.pipeline.every((s) => s.done));
  pass("full visual render pipeline");

  const battleFrame = renderSystem.render({
    animation: animEngine.animate({
      character: animation.AE_CHARACTER.KOJNOZROUT,
      battle: { active: true, action: animation.AE_BATTLE_ACTION.COMBO },
      emotion: { primary: "joy", intensity: 90 },
      decision: { ok: true },
      fromDecision: true,
      fromBattle: true,
      fromEmotion: true
    }),
    emotion: { primary: "joy", intensity: 90 },
    decision: { ok: true },
    speech: {},
    battleActive: true,
    fromAnimation: true
  });
  assert.equal(battleFrame.frame.scene, render.VR_SCENE.BATTLE);
  assert.ok(battleFrame.pipeline.pipeline.find((s) => s.step === "animation_engine").done);
  pass("battle scene render");

  const invalid = renderSystem.render({});
  assert.equal(invalid.ok, false);
  pass("reject render without animation");

  assert.equal(render.assertRenderForbiddenActivity("execute_ai").ok, false);
  assert.equal(render.assertRenderForbiddenActivity("mutate_animation_engine").ok, false);
  pass("forbidden activities");

  const gfxSys = architecture.getPlatformSystem(architecture.PLATFORM_SYSTEM_ID.GRAPHICS);
  assert.equal(gfxSys.nextDocId, "0088");
  assert.ok(gfxSys.runtime.includes("shared/mia-render-core/visualRenderingSystem.js"));
  pass("graphics system next doc 0041");

  const aiSys = architecture.getPlatformSystem(architecture.PLATFORM_SYSTEM_ID.AI);
  assert.equal(aiSys.nextDocId, "0088");
  pass("AI system next doc 0041");

  for (const rel of render.VR_RUNTIME_ANCHORS) {
    assert.ok(pathExists(rel), `anchor exists: ${rel}`);
  }
  pass("runtime anchors");

  const readme = read("docs/master-canon/README.md");
  assert.ok(readme.includes("0037"), "README 0037");
  pass("README registry");

  console.log("\nMaster Canon 0037 contract: ALL PASS");
}

run();
