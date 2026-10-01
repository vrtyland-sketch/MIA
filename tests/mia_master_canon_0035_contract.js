"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const MASTER = path.join(ROOT, "docs", "master-canon");
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
  const docPath = path.join(MASTER, "0035-speech-engine.md");
  const alignPath = path.join(MASTER, "0035-alignment.md");

  assert.ok(fs.existsSync(docPath), "0035-speech-engine.md exists");
  assert.ok(fs.existsSync(alignPath), "0035-alignment.md exists");
  pass("0035 files on disk");

  const doc = fs.readFileSync(docPath, "utf8");
  for (let i = 1; i <= 25; i += 1) {
    assert.ok(doc.includes(`## ${i}.`), `0035 section ${i}`);
  }
  assert.ok(doc.includes("Core AI"), "0035 critical priority");
  assert.ok(doc.includes("0034"), "0035 links to 0034");
  assert.ok(doc.includes("0036"), "0035 points to 0036");
  pass("0035 structure (25 sections)");

  assert.equal(speech.SE_COMPONENT_ORDER.length, 14);
  pass("speech components");

  const miaProfile = speech.getVoiceProfile(speech.SE_SPEAKER.MIA);
  const kojProfile = speech.getVoiceProfile(speech.SE_SPEAKER.KOJNOZROUT);
  assert.notEqual(miaProfile.profile.voiceId, kojProfile.profile.voiceId);
  assert.equal(miaProfile.profile.gender, "female");
  assert.equal(kojProfile.profile.gender, "male");
  pass("voice profile manager");

  const joyVoice = speech.adaptEmotionVoice(miaProfile.profile, { primary: "joy", intensity: 80 });
  const tensionVoice = speech.adaptEmotionVoice(miaProfile.profile, { primary: "tension", intensity: 70 });
  assert.ok(joyVoice.rate > tensionVoice.rate, "joy faster than tension");
  assert.ok(joyVoice.pauseMs < tensionVoice.pauseMs, "joy shorter pauses");
  pass("emotion voice adapter");

  const queued = speech.enqueueSpeech([], {
    speaker: speech.SE_SPEAKER.MIA,
    text: "Ahoj stream!",
    priority: 80
  });
  assert.equal(queued.entry.state, speech.SE_SPEECH_STATE.QUEUED);
  const scheduled = speech.scheduleSpeech(queued.queue);
  assert.ok(scheduled.next);
  pass("speech queue and scheduler");

  const lip = speech.planLipSync("Dobrý den", 1200);
  assert.ok(lip.frames.length >= 1);
  const facial = speech.planFacialSync({ primary: "surprise" });
  assert.ok(facial.eyebrowRaise > 0.5);
  const gesture = speech.planGestureSync({ primary: "joy", intensity: 80 });
  assert.equal(gesture.hands.wave, true);
  const overlay = speech.planOverlaySync("speech-1");
  assert.ok(overlay.timeline.some((t) => t.phase === "bubble_hide"));
  pass("lip facial gesture overlay sync");

  const effect = speech.applyVoiceEffects(speech.SE_VOICE_EFFECT.BATTLE_MEGAPHONE);
  assert.equal(effect.ok, true);
  pass("voice effects");

  const cache = {};
  const stored = speech.storeSpeechCache(cache, speech.SE_SPEAKER.MIA, "Díky!", miaProfile.profile, {
    audioUrl: "/audio-cache/test.mp3",
    durationMs: 900
  });
  const hit = speech.lookupSpeechCache(stored.cache, speech.SE_SPEAKER.MIA, "Díky!", miaProfile.profile);
  assert.equal(hit.ok, true);
  pass("speech cache");

  const soft = speech.interruptSpeech({ speechId: "s1" }, speech.SE_INTERRUPT.SOFT);
  const hard = speech.interruptSpeech({ speechId: "s1" }, speech.SE_INTERRUPT.HARD);
  assert.equal(soft.waitForSentenceEnd, true);
  assert.equal(hard.state, speech.SE_SPEECH_STATE.INTERRUPTED);
  pass("speech interrupts");

  const engine = speech.createSpeechEngine();
  const emotionEngine = emotion.createEmotionEngine();
  const personalityEngine = personality.createPersonalityEngine();
  const decisionEngine = decision.createDecisionEngine();
  const conversationEngine = conversation.createConversationEngine();

  const chatResult = conversationEngine.handleMessage(
    { text: "Ahoj MIA!", userId: "vasa", threadId: conversation.CE_THREAD.TIKTOK },
    { emotionEngine, personalityEngine, decisionEngine, memory: { working: true, shortTerm: true } }
  );
  assert.equal(chatResult.response.forSpeechEngine, true);

  const spoken = engine.speak({
    text: chatResult.response.text,
    speaker: speech.SE_SPEAKER.MIA,
    emotion: chatResult.emotion,
    fromConversationEngine: true
  });
  assert.equal(spoken.ok, true);
  assert.equal(spoken.decides, false);
  assert.equal(spoken.mutatesText, false);
  assert.equal(spoken.voice.voiceId, "mia_voice");
  assert.ok(spoken.lipSync.frames.length >= 1);
  assert.ok(spoken.analytics.speechId);
  pass("conversation to speech pipeline");

  const repeated = engine.speak({
    text: chatResult.response.text,
    speaker: speech.SE_SPEAKER.MIA,
    emotion: chatResult.emotion,
    fromConversationEngine: true
  });
  assert.equal(repeated.tts.cached, true);
  pass("cache hit on repeat");

  const kojSpoken = engine.speak({
    text: "Kojnožrout děkuje za gift!",
    speaker: speech.SE_SPEAKER.KOJNOZROUT,
    emotion: { primary: "joy", intensity: 90 },
    fromConversationEngine: true
  });
  assert.equal(kojSpoken.voice.voiceId, "kojnozout_voice");
  assert.ok(kojSpoken.syncTargets.includes(speech.SE_SYNC_TARGET.KOJ_RUNTIME));
  pass("kojnozout speech pipeline");

  const invalid = engine.speak({ text: "bez CE", fromConversationEngine: false });
  assert.equal(invalid.ok, false);
  const kojInvalid = speech.validateSpeechInput({
    text: "test",
    fromConversationEngine: true,
    speaker: speech.SE_SPEAKER.KOJNOZROUT,
    voiceProfileId: "mia_voice"
  });
  assert.equal(kojInvalid.ok, false);
  pass("reject speech without CE or wrong voice");

  assert.equal(speech.assertSpeechForbiddenActivity("mutate_text_content").ok, false);
  assert.equal(speech.assertSpeechForbiddenActivity("bypass_conversation_engine").ok, false);
  pass("forbidden activities");

  const aiSys = architecture.getPlatformSystem(architecture.PLATFORM_SYSTEM_ID.AI);
  assert.equal(aiSys.nextDocId, "0088");
  assert.ok(aiSys.runtime.includes("shared/mia-speech-core/speechEngine.js"));
  pass("AI system next doc 0041");

  for (const rel of speech.SE_RUNTIME_ANCHORS) {
    assert.ok(pathExists(rel), `anchor exists: ${rel}`);
  }
  pass("runtime anchors");

  const readme = read("docs/master-canon/README.md");
  assert.ok(readme.includes("0035"), "README 0035");
  pass("README registry");

  console.log("\nMaster Canon 0035 contract: ALL PASS");
}

run();
