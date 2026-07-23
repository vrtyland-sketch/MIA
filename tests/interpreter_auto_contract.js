"use strict";

const assert = require("assert");
const {
  resolveAutoInterpreterPlan,
  createTranslationRuntime,
  translateText
} = require("../scripts/MIA_TRANSLATE");

function test(name, fn) {
  try {
    fn();
    console.log(`OK  ${name}`);
  } catch (err) {
    console.error(`FAIL ${name}`);
    console.error(err && err.stack ? err.stack : err);
    process.exitCode = 1;
  }
}

test("czech only → skip (both voices czech)", () => {
  const plan = resolveAutoInterpreterPlan("Ahoj kamarádi, jak se máte?", {
    streamerVoiceLang: "cs",
    guestVoiceLang: "cs"
  });
  assert.equal(plan.skip, true);
  assert.equal(plan.reason, "both_voices_czech");
  assert.equal(plan.bothCzech, true);
});

test("english detected → translate to czech via Koj", () => {
  const plan = resolveAutoInterpreterPlan("Hello my friend, good luck!", {
    streamerVoiceLang: "cs",
    guestVoiceLang: "cs"
  });
  assert.equal(plan.skip, false);
  assert.equal(plan.channel, "guest");
  assert.equal(plan.speaker, "kojnozout");
  assert.equal(plan.sourceLang, "en");
  assert.equal(plan.targetLang, "cs");
});

test("czech after foreign partner → translate out via MIA", () => {
  const plan = resolveAutoInterpreterPlan("Ahoj, díky za duel.", {
    streamerVoiceLang: "cs",
    guestVoiceLang: "en",
    channel: "streamer"
  });
  assert.equal(plan.skip, false);
  assert.equal(plan.channel, "streamer");
  assert.equal(plan.speaker, "mia");
  assert.equal(plan.sourceLang, "cs");
  assert.equal(plan.targetLang, "en");
});

test("runtime tracks both voices and clears foreign when both czech", () => {
  const rt = createTranslationRuntime();
  rt.noteVoiceLanguages({ streamerLang: "cs", guestLang: "en" });
  assert.equal(rt.hasForeignPartner(), true);
  assert.equal(rt.bothVoicesCzech(), false);

  rt.noteVoiceLanguages({ streamerLang: "cs", guestLang: "cs" });
  assert.equal(rt.bothVoicesCzech(), true);
  assert.equal(rt.hasForeignPartner(), false);
  assert.equal(rt.getVoiceState().lastForeignLanguage, null);
});

test("short weak message does not flip partner language", () => {
  const plan = resolveAutoInterpreterPlan("ok", {
    streamerVoiceLang: "cs",
    guestVoiceLang: "cs"
  });
  assert.equal(plan.skip, true);
  assert.equal(plan.bothCzech, true);
});

if (!process.exitCode) {
  console.log("interpreter_auto_contract: all passed");
}
