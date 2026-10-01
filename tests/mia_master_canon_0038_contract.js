"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const MASTER = path.join(ROOT, "docs", "master-canon");
const obs = require("../shared/mia-obs-core");
const render = require("../shared/mia-render-core");
const animation = require("../shared/mia-animation-core");
const speech = require("../shared/mia-speech-core");
const conversation = require("../shared/mia-conversation-core");
const personality = require("../shared/mia-personality-core");
const emotion = require("../shared/mia-emotion-core");
const decision = require("../shared/mia-decision-core");
const action = require("../shared/mia-action-core");
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

function mockHandlers(overrides = {}) {
  const base = {
    [action.AO_MODULE.OVERLAY]: async () => ({ ok: true }),
    [action.AO_MODULE.VIDEO_ENGINE]: async () => ({ ok: true }),
    [action.AO_MODULE.SPEECH]: async () => ({ ok: true }),
    [action.AO_MODULE.OBS]: async () => ({ ok: true, deferred: true }),
    [action.AO_MODULE.MEMORY]: async () => ({ ok: true }),
    [action.AO_MODULE.ANALYTICS]: async () => ({ ok: true }),
    [action.AO_MODULE.KOJNOZROUT]: async () => ({ ok: true }),
    [action.AO_MODULE.NOOP]: async () => ({ ok: true })
  };
  return { ...base, ...overrides };
}

async function run() {
  const docPath = path.join(MASTER, "0038-obs-integration-layer.md");
  const alignPath = path.join(MASTER, "0038-alignment.md");

  assert.ok(fs.existsSync(docPath), "0038-obs-integration-layer.md exists");
  assert.ok(fs.existsSync(alignPath), "0038-alignment.md exists");
  pass("0038 files on disk");

  const doc = fs.readFileSync(docPath, "utf8");
  for (let i = 1; i <= 23; i += 1) {
    assert.ok(doc.includes(`## ${i}.`), `0038 section ${i}`);
  }
  assert.ok(doc.includes("Streaming Core"), "0038 critical priority");
  assert.ok(doc.includes("0037"), "0038 links to 0037");
  assert.ok(doc.includes("0039"), "0038 points to 0039");
  pass("0038 structure (23 sections)");

  assert.equal(obs.OIL_COMPONENT_ORDER.length, 12);
  pass("obs components");

  const connection = obs.manageConnection({ host: "127.0.0.1", port: 4455, password: true });
  assert.equal(connection.protocol, "obs-websocket-5.x");
  const lifecycle = obs.buildConnectionLifecycle(obs.OIL_CONNECTION_STATE.INITIALIZING);
  assert.ok(lifecycle.lifecycle.includes(obs.OIL_CONNECTION_STATE.RESTORED));
  pass("connection manager and lifecycle");

  const ws = obs.buildWebSocketMessage(obs.OIL_WS_MESSAGE.REQUEST, { op: "GetSceneList" });
  assert.equal(ws.type, obs.OIL_WS_MESSAGE.REQUEST);
  pass("websocket client");

  assert.equal(obs.resolveScene({ battleActive: true }), obs.OIL_SCENE.BATTLE);
  pass("scene manager");

  const source = obs.manageSource(obs.OIL_SOURCE.MIA);
  assert.equal(source.sourceId, obs.OIL_SOURCE.MIA);
  pass("source manager");

  const media = obs.controlMedia("T2_VIDEO_06", obs.OIL_MEDIA_ACTION.PLAY);
  assert.equal(media.ok, true);
  pass("media manager");

  const overlay = obs.manageOverlay(obs.OIL_OVERLAY.BOWL_OVERLAY);
  assert.ok(overlay.url.includes("bowl"));
  pass("overlay manager");

  const filter = obs.manageFilter(obs.OIL_SOURCE.MIA, "glow");
  assert.equal(filter.ok, true);
  pass("filter manager");

  const transform = obs.manageTransform(obs.OIL_SOURCE.MIA, { x: 10, opacity: 0.9 });
  assert.equal(transform.animatable, true);
  pass("transform manager");

  const event = obs.forwardObsEvent({ type: "scene_changed", payload: { scene: "MAIN" } });
  assert.equal(event.eventBusTarget, "mia_event_bus");
  pass("event listener");

  const recovery = obs.planRecovery();
  assert.equal(recovery.targetState, obs.OIL_CONNECTION_STATE.RESTORED);
  pass("recovery manager");

  const battleSeq = obs.planBattleObsSequence();
  assert.ok(battleSeq.sequence.some((s) => s.step === "battle_overlay"));
  pass("battle obs sequence");

  const layer = obs.createObsIntegrationLayer();
  const connected = layer.connect();
  assert.equal(connected.connection.state, obs.OIL_CONNECTION_STATE.ACTIVE);
  pass("connect obs");

  const orchestrator = action.createActionOrchestrator();
  const emotionEngine = emotion.createEmotionEngine();
  const personalityEngine = personality.createPersonalityEngine();
  const decisionEngine = decision.createDecisionEngine();
  const conversationEngine = conversation.createConversationEngine();
  const speechEngine = speech.createSpeechEngine();
  const animEngine = animation.createAnimationEngine();
  const renderSystem = render.createVisualRenderingSystem();

  const chatResult = conversationEngine.handleMessage(
    { text: "Battle start!", userId: "vasa", threadId: conversation.CE_THREAD.BATTLE, battleActive: true },
    { emotionEngine, personalityEngine, decisionEngine, memory: { working: true, shortTerm: true }, battleActive: true }
  );

  const plan = decisionEngine.decide({
    sources: {
      event: {
        type: "battle",
        userId: "vasa",
        battleActive: true
      }
    },
    adapters: {
      emotion: chatResult.emotion,
      memory: { working: true, shortTerm: true }
    }
  });

  const orchestrated = await orchestrator.orchestrate(plan.actionPlan, mockHandlers());

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
    decision: plan,
    battle: { active: true, action: animation.AE_BATTLE_ACTION.COMBO },
    fromDecision: true,
    fromEmotion: true,
    fromSpeech: true,
    fromBattle: true
  });

  const frame = renderSystem.render({
    animation: visual,
    emotion: chatResult.emotion,
    speech: spoken,
    decision: plan,
    battleActive: true,
    fromAnimation: true
  });

  const executed = layer.execute({
    fromActionOrchestrator: true,
    fromRender: true,
    battleActive: true,
    renderFrame: frame.frame,
    command: {
      op: "SetCurrentProgramScene",
      mediaSource: "T3_VIDEO_10",
      mediaAction: obs.OIL_MEDIA_ACTION.PLAY,
      overlayId: obs.OIL_OVERLAY.BATTLE_OVERLAY
    }
  });

  assert.equal(executed.ok, true);
  assert.equal(executed.decides, false);
  assert.equal(executed.scene.sceneId, obs.OIL_SCENE.BATTLE);
  assert.ok(executed.bodyLayers.includes(obs.OIL_BODY_LAYER.MIA_HEAD));
  assert.ok(plan.ok);
  assert.ok(orchestrated.ok);
  pass("full action render obs pipeline");

  const restored = layer.recover();
  assert.equal(restored.connection.state, obs.OIL_CONNECTION_STATE.RESTORED);
  pass("obs recovery");

  const invalid = layer.execute({ bypassObsLayer: true, command: {} });
  assert.equal(invalid.ok, false);
  pass("reject direct obs bypass");

  assert.equal(obs.assertObsForbiddenActivity("decide_battle").ok, false);
  assert.equal(obs.assertObsForbiddenActivity("mutate_economy").ok, false);
  pass("forbidden activities");

  const intSys = architecture.getPlatformSystem(architecture.PLATFORM_SYSTEM_ID.INTEGRATION);
  assert.equal(intSys.nextDocId, "0088");
  assert.ok(intSys.runtime.includes("shared/mia-obs-core/obsIntegrationLayer.js"));
  pass("integration system next doc 0041");

  const gfxSys = architecture.getPlatformSystem(architecture.PLATFORM_SYSTEM_ID.GRAPHICS);
  assert.equal(gfxSys.nextDocId, "0088");
  pass("graphics system next doc 0041");

  const aiSys = architecture.getPlatformSystem(architecture.PLATFORM_SYSTEM_ID.AI);
  assert.equal(aiSys.nextDocId, "0088");
  pass("AI system next doc 0041");

  for (const rel of obs.OIL_RUNTIME_ANCHORS) {
    assert.ok(pathExists(rel), `anchor exists: ${rel}`);
  }
  pass("runtime anchors");

  const readme = read("docs/master-canon/README.md");
  assert.ok(readme.includes("0038"), "README 0038");
  pass("README registry");

  console.log("\nMaster Canon 0038 contract: ALL PASS");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
