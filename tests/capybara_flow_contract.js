"use strict";

const assert = require("assert");
const {
  isEnabled,
  resolveChatLoopMode,
  isGiftChatLoopGift,
  isCapybaraLoopGift,
  shouldStartGiftChatLoop,
  resolveAwayMode,
  startCapybaraFlow,
  tickCapybaraFlow,
  buildWaitPromptPayload,
  handleWaitingComment,
  getCapybaraSnapshot,
  getGiftChatLoopSnapshot,
  SHOW_MS
} = require("../scripts/MIA_CAPYBARA_FLOW");

const CHAT_LOOP_PROFILE = {
  matched: true,
  canonicalKey: "animal_small",
  effectProgram: "pet_react",
  chatLoop: true,
  giftName: "Kapybara"
};

async function run() {
  assert.equal(resolveChatLoopMode({ MIA_GIFT_CHAT_LOOP: "away_only" }), "away_only");
  assert.equal(resolveChatLoopMode({ MIA_GIFT_CHAT_LOOP: "off" }), "off");
  assert.equal(isEnabled({ MIA_GIFT_CHAT_LOOP: "off" }), false);
  assert.equal(isEnabled({ MIA_GIFT_CHAT_LOOP: "away_only" }), true);

  assert.equal(isGiftChatLoopGift(CHAT_LOOP_PROFILE, {}), true);
  assert.equal(isCapybaraLoopGift(CHAT_LOOP_PROFILE, {}), true);
  assert.equal(
    isGiftChatLoopGift({ matched: true, effectProgram: "flower_support" }, {}),
    false
  );
  assert.equal(
    isGiftChatLoopGift({ effectProgram: "flower_support" }, { support: { giftName: "Rose" } }),
    false
  );

  assert.equal(
    shouldStartGiftChatLoop(
      { outputState: { worldMode: "default" }, env: { MIA_GIFT_CHAT_LOOP: "away_only" } },
      CHAT_LOOP_PROFILE
    ),
    false
  );
  assert.equal(
    shouldStartGiftChatLoop(
      { outputState: { worldMode: "nejsem_tu" }, env: { MIA_GIFT_CHAT_LOOP: "away_only" } },
      CHAT_LOOP_PROFILE
    ),
    true
  );
  assert.equal(
    shouldStartGiftChatLoop(
      { outputState: { worldMode: "default" }, env: { MIA_GIFT_CHAT_LOOP: "always" } },
      CHAT_LOOP_PROFILE
    ),
    true
  );

  const outputState = {};
  const session = startCapybaraFlow(outputState, {
    gifterLabel: "FanA",
    giftName: "Tofu",
    awayMode: true
  });
  assert.equal(session.phase, "show");
  assert.equal(outputState.capybaraFlow.phase, "show");

  outputState.capybaraFlow.showEndsAt = Date.now() - 1;
  const waitTick = tickCapybaraFlow(outputState);
  assert.equal(waitTick.action, "send_wait_prompt");
  assert.equal(outputState.capybaraFlow.phase, "waiting_comment");

  const prompt = buildWaitPromptPayload(outputState, outputState.capybaraFlow);
  assert.equal(prompt.meta.source, "gift_chat_loop");
  assert.ok(prompt.text.includes("Tofu"));
  assert.ok(prompt.text.includes("FanA"));

  assert.equal(resolveAwayMode({ outputState: { worldMode: "nejsem_tu" } }), true);
  assert.equal(resolveAwayMode({ outputState: { worldMode: "default" } }), false);

  const snapshot = getCapybaraSnapshot(outputState);
  assert.equal(snapshot.active, true);
  assert.equal(snapshot.awayMode, true);
  assert.ok(snapshot.waitPrompt.length > 5);
  assert.equal(getGiftChatLoopSnapshot(outputState).giftName, "Tofu");

  assert.equal(SHOW_MS, 20000);

  const replyState = {};
  startCapybaraFlow(replyState, {
    gifterLabel: "FanB",
    giftName: "Creeper"
  });
  replyState.capybaraFlow.phase = "waiting_comment";
  replyState.capybaraFlow.promptSent = true;

  const responseEngine = {
    buildDirectChatResponse(_outputStateWithKoj, input) {
      return {
        speech_text: `Ahoj ${input.userLabel}, vidím tvůj komentář.`,
        overlayPayload: {
          owner: "mia",
          route: "community",
          text: `Ahoj ${input.userLabel}, vidím tvůj komentář.`
        },
        responseContract: { speaker: "mia", intent: "direct_chat" }
      };
    }
  };

  const result = await handleWaitingComment(
    replyState,
    {
      message: "Creeper je super!",
      user: { nickname: "ChatFan" }
    },
    { responseEngine, kojnozoutState: {} }
  );

  assert.equal(result.handled, true);
  assert.ok(result.actionResult.speech_text.includes("Creeper"));
  assert.ok(result.actionResult.speech_text.includes("ChatFan"));
  assert.equal(replyState.capybaraFlow.phase, "completed");

  console.log("capybara_flow_contract: OK");
}

run().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
