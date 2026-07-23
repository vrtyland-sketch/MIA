"use strict";

const assert = require("assert/strict");
const path = require("path");

const chatBrain = require(path.resolve(__dirname, "..", "scripts", "MIA_CHAT_BRAIN.js"));
const responseEngine = require(path.resolve(__dirname, "..", "scripts", "MIA_RESPONSE_ENGINE.js"));

const results = {
  passed: 0,
  failed: 0
};

function test(name, fn) {
  try {
    fn();
    results.passed += 1;
    console.log(`✅ ${name}`);
  } catch (err) {
    results.failed += 1;
    console.error(`❌ ${name}`);
    console.error(err && err.stack ? err.stack : err);
  }
}

function normalize(value = "") {
  return String(value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function buildCase(message, userLabel = "VasaSpinak") {
  const decision = chatBrain.decideChatReaction({ message });

  const response = responseEngine.buildDirectChatResponse({}, {
    message,
    userLabel,
    target: decision?.target,
    speaker: decision?.speaker
  });

  return {
    message,
    userLabel,
    decision,
    response,
    normalizedSpeech: normalize(response?.speech_text),
    normalizedOverlay: normalize(response?.overlay_text),
    normalizedMessage: normalize(message),
    normalizedUser: normalize(userLabel)
  };
}

function assertHasUserAddressing(caseData) {
  const speech = caseData.normalizedSpeech;
  const overlay = caseData.normalizedOverlay;
  const user = caseData.normalizedUser;

  assert.ok(
    speech.includes(user) || overlay.includes(user),
    [
      `Expected direct response to mention user label "${caseData.userLabel}"`,
      `message: ${caseData.message}`,
      `speech: ${caseData.response?.speech_text || ""}`,
      `overlay: ${caseData.response?.overlay_text || ""}`
    ].join("\n")
  );
}

function assertNotGenericMiaFallback(caseData) {
  const generic = [
    "ahoj jsem tady co mas na srdci",
    "cau vidim te klidne pis dal",
    "jo slysim te co resime",
    "nazdar jsem pripojena a davam pozor",
    "ahoj jedu s vami povidej",
    "jsem tady a vnimam te",
    "vidim te v chatu pokracuj",
    "jo registruju te co potrebujes",
    "jsem online a posloucham",
    "ahoj klidne to rozjed",
    "jsem tu co dneska leti",
    "vidim te muzes mluvit",
    "jsem pripravena reagovat",
    "davam pozor co mas pro me",
    "ahoj vnimam te naplno"
  ];

  assert.ok(
    !generic.includes(caseData.normalizedSpeech),
    [
      "Expected non-generic direct MIA response for addressed message.",
      `message: ${caseData.message}`,
      `speech: ${caseData.response?.speech_text || ""}`
    ].join("\n")
  );
}

function assertOwner(caseData, expectedOwner) {
  assert.equal(
    caseData.response?.overlayPayload?.owner,
    expectedOwner,
    [
      `Expected overlay owner "${expectedOwner}"`,
      `message: ${caseData.message}`,
      `actual owner: ${caseData.response?.overlayPayload?.owner || "none"}`
    ].join("\n")
  );
}

function assertTarget(caseData, expectedTarget) {
  assert.equal(
    caseData.decision?.target,
    expectedTarget,
    [
      `Expected chat target "${expectedTarget}"`,
      `message: ${caseData.message}`,
      `actual target: ${caseData.decision?.target || "none"}`,
      `decision: ${JSON.stringify(caseData.decision, null, 2)}`
    ].join("\n")
  );
}

function assertIntent(caseData, expectedIntent) {
  assert.equal(
    caseData.decision?.intent?.type,
    expectedIntent,
    [
      `Expected intent "${expectedIntent}"`,
      `message: ${caseData.message}`,
      `actual intent: ${caseData.decision?.intent?.type || "none"}`,
      `decision: ${JSON.stringify(caseData.decision, null, 2)}`
    ].join("\n")
  );
}

function assertSpeaker(caseData, expectedSpeaker) {
  assert.equal(
    caseData.decision?.speaker,
    expectedSpeaker,
    [
      `Expected speaker "${expectedSpeaker}"`,
      `message: ${caseData.message}`,
      `actual speaker: ${caseData.decision?.speaker || "none"}`,
      `decision: ${JSON.stringify(caseData.decision, null, 2)}`
    ].join("\n")
  );
}

function assertContainsOneOf(caseData, variants) {
  const speech = caseData.normalizedSpeech;
  const overlay = caseData.normalizedOverlay;

  assert.ok(
    variants.some((variant) => speech.includes(normalize(variant)) || overlay.includes(normalize(variant))),
    [
      `Expected response to contain one of: ${variants.join(", ")}`,
      `message: ${caseData.message}`,
      `speech: ${caseData.response?.speech_text || ""}`,
      `overlay: ${caseData.response?.overlay_text || ""}`
    ].join("\n")
  );
}

(function run() {
  console.log("");
  console.log("---- DIRECT CHAT INTELLIGENCE CONTRACT ----");
  console.log("Purpose: verify addressed chat routing and response quality against MPV canon.");
  console.log("");

  test("baseline: plain greeting resolves and emits a response", () => {
    const c = buildCase("ahoj", "Katka");

    assert.equal(c.decision?.ok, true);
    assert.equal(typeof c.response?.speech_text, "string");
    assert.ok(c.response.speech_text.trim().length > 0);
  });

  test("canon: 'mia ahoj' should target MIA and address the user", () => {
    const c = buildCase("mia ahoj", "VasaSpinak");

    assertTarget(c, "mia");
    assertSpeaker(c, "mia");
    assertOwner(c, "mia");
    assertHasUserAddressing(c);
    assertNotGenericMiaFallback(c);
  });

  test("canon: 'mio ahoj' should target MIA and address the user", () => {
    const c = buildCase("mio ahoj", "VasaSpinak");

    assertTarget(c, "mia");
    assertSpeaker(c, "mia");
    assertOwner(c, "mia");
    assertHasUserAddressing(c);
    assertNotGenericMiaFallback(c);
  });

  test("canon: 'miu ahoj' should also be recognized as addressed to MIA", () => {
    const c = buildCase("miu ahoj", "VasaSpinak");

    assertTarget(c, "mia");
    assertSpeaker(c, "mia");
    assertOwner(c, "mia");
    assertHasUserAddressing(c);
    assertNotGenericMiaFallback(c);
  });

  test("canon: direct status question to MIA should stay addressed and named", () => {
    const c = buildCase("mia jak se mas", "Katka");

    assertIntent(c, "direct_status_question");
    assertTarget(c, "mia");
    assertSpeaker(c, "mia");
    assertOwner(c, "mia");
    assertHasUserAddressing(c);
  });

  test("canon: greeting plus question must stay a status question, not collapse to plain greeting", () => {
    const c = buildCase("mia ahoj jak se mas", "Katka");

    assertIntent(c, "direct_status_question");
    assertTarget(c, "mia");
    assertSpeaker(c, "mia");
    assertOwner(c, "mia");
    assertHasUserAddressing(c);
  });

  test("canon: MIA alias variants should resolve status questions", () => {
    const aliases = [
      "mio jak se mas",
      "mii jak je",
      "maio jak se mas",
      "mijo co delas",
      "mojo jak ti je",
      "myo jaky mas den"
    ];

    for (const message of aliases) {
      const c = buildCase(message, "Katka");

      assertIntent(c, "direct_status_question");
      assertTarget(c, "mia");
      assertSpeaker(c, "mia");
      assertOwner(c, "mia");
      assertHasUserAddressing(c);
      assert.ok(
        c.response?.speech_text?.trim().length > 0,
        `Expected non-empty status reply for "${message}"`
      );
    }
  });

  test("canon: status replies should use personal status tone from text bank", () => {
    const c = buildCase("mijo jak se mas", "Katka");
    const speech = normalize(c.response?.speech_text || "");

    assert.ok(
      speech.includes("dobre")
        || speech.includes("vyborne")
        || speech.includes("fajn")
        || speech.includes("pohode")
        || speech.includes("online")
        || speech.includes("siti")
        || speech.includes("klidu")
        || speech.includes("krouzim"),
      `Expected status-style reply, got: ${c.response?.speech_text || ""}`
    );
  });

  test("canon: 'kojnozroute ahoj' should target Kojnozout and address the user", () => {
    const c = buildCase("kojnozroute ahoj", "VasaSpinak");

    assertTarget(c, "kojnozout");
    assertSpeaker(c, "kojnozout");
    assertOwner(c, "kojnozout");
    assertHasUserAddressing(c);
  });

  test("canon: feeding-style question to Kojnozout should target him and keep directness", () => {
    const c = buildCase("kojnozroute chces nakrmit?", "VasaSpinak");

    assertIntent(c, "care_offer");
    assertTarget(c, "kojnozout");
    assertSpeaker(c, "kojnozout");
    assertOwner(c, "kojnozout");
    assertHasUserAddressing(c);
  });

  test("baseline: community status question resolves with community intent", () => {
    const c = buildCase("jak se mate vsichni", "Katka");

    assertIntent(c, "community_status_question");
    assertSpeaker(c, "mia");
    assertOwner(c, "mia");
    assert.ok(c.response?.speech_text?.trim().length > 0);
  });

  test("canon: addressed community question to MIA should still resolve as community status", () => {
    const c = buildCase("mia jak se mate vsichni", "Katka");

    assertIntent(c, "community_status_question");
    assertTarget(c, "mia");
    assertSpeaker(c, "mia");
    assertOwner(c, "mia");
    assert.ok(c.response?.speech_text?.trim().length > 0);
  });

  test("canon: streamer alias 'spinaku ahoj' should not collapse to anonymous generic MIA fallback", () => {
    const c = buildCase("spinaku ahoj", "VasaSpinak");

    assert.equal(c.decision?.ok, true);
    assertOwner(c, "mia");
    assertNotGenericMiaFallback(c);
  });

  test("canon: accented streamer alias 'spiňáku ahoj' should not collapse to anonymous generic MIA fallback", () => {
    const c = buildCase("spiňáku ahoj", "VasaSpinak");

    assert.equal(c.decision?.ok, true);
    assertOwner(c, "mia");
    assertNotGenericMiaFallback(c);
  });

  test("canon: sadness report to MIA should be sensitive and named", () => {
    const c = buildCase("mia je mi smutno", "Katka");

    assertIntent(c, "sadness_report");
    assertTarget(c, "mia");
    assertSpeaker(c, "mia");
    assertOwner(c, "mia");
    assertHasUserAddressing(c);
    assertContainsOneOf(c, ["mrzi", "vnimam", "jestli chces", "kdyz budes chtit"]);
  });

  test("canon: sadness must outrank greeting in mixed message", () => {
    const c = buildCase("mia ahoj je mi smutno", "Katka");

    assertIntent(c, "sadness_report");
    assertTarget(c, "mia");
    assertSpeaker(c, "mia");
    assertOwner(c, "mia");
    assertHasUserAddressing(c);
    assertContainsOneOf(c, ["mrzi", "vnimam", "smutno"]);
  });

  test("canon: pet loss report should become empathetic grief response", () => {
    const c = buildCase("mymu umrel pejsek", "Katka");

    assertIntent(c, "pet_loss_report");
    assertSpeaker(c, "mia");
    assertOwner(c, "mia");
    assertHasUserAddressing(c);
    assertContainsOneOf(c, ["to je mi lito", "to me mrzi", "clena rodiny", "kolik mu bylo"]);
  });

  test("canon: general loss report should not fall into generic fallback", () => {
    const c = buildCase("mia umrel mi kamarad", "Katka");

    assertIntent(c, "loss_report");
    assertTarget(c, "mia");
    assertSpeaker(c, "mia");
    assertOwner(c, "mia");
    assertHasUserAddressing(c);
    assertContainsOneOf(c, ["to je mi lito", "to me mrzi", "soustrast"]);
  });

  test("canon: joy should resolve and stay named", () => {
    const c = buildCase("mia mam radost", "Katka");

    assertIntent(c, "joy_report");
    assertTarget(c, "mia");
    assertSpeaker(c, "mia");
    assertOwner(c, "mia");
    assertHasUserAddressing(c);
    assertContainsOneOf(c, ["super", "radost", "oslavi", "dobre"]);
  });

  test("canon: relief should resolve and stay named", () => {
    const c = buildCase("mia ulevilo se mi", "Katka");

    assertIntent(c, "relief_report");
    assertTarget(c, "mia");
    assertSpeaker(c, "mia");
    assertOwner(c, "mia");
    assertHasUserAddressing(c);
    assertContainsOneOf(c, ["uleva", "oddechnout", "dobre"]);
  });

  test("canon: financial joy should classify domain as finance for salary phrasing", () => {
    const c = buildCase("mia mam radost prisla vyplata", "Katka");

    assertIntent(c, "joy_report");
    assert.equal(
      c.decision?.intent?.emotion?.domain,
      "finance",
      `Expected finance domain, got ${c.decision?.intent?.emotion?.domain || "none"}`
    );
    assertTarget(c, "mia");
    assertSpeaker(c, "mia");
    assertOwner(c, "mia");
  });

  test("canon: recall question about Koj reply routes to MIA", () => {
    const c = buildCase("mia co mi kojnozrout rekl", "Katka");

    assertIntent(c, "bot_reply_recall");
    assertTarget(c, "mia");
    assertSpeaker(c, "mia");
    assertOwner(c, "mia");
    assertHasUserAddressing(c);
  });

  test("canon: recall question uses stored Koj reply for the same user", () => {
    const sessionMemory = require(path.resolve(__dirname, "..", "scripts", "MIA_SESSION_MEMORY"));
    const tmpStore = path.join(__dirname, ".tmp-bot-recall-test.json");
    sessionMemory.loadStore(tmpStore);
    sessionMemory.observeBotReply({
      speaker: "kojnozout",
      userLabel: "Katka",
      text: "Katka, jo, vidim te v chatu a registruju te.",
      source: "voice"
    });

    const c = buildCase("mia co mi koj rekl", "Katka");
    assertIntent(c, "bot_reply_recall");
    assertContainsOneOf(c, ["vidim te", "registruju te", "Kojnožrout"]);
  });

  test("canon: direct factual question resolves as direct_question not status", () => {
    const c = buildCase("mia co myslis o umele inteligenci", "Katka");

    assertIntent(c, "direct_question");
    assertTarget(c, "mia");
    assertSpeaker(c, "mia");
    assertOwner(c, "mia");
  });

  console.log("");
  console.log("---- DIRECT CHAT INTELLIGENCE CONTRACT SUMMARY ----");
  console.log(`passed: ${results.passed}`);
  console.log(`failed: ${results.failed}`);
  console.log("");

  if (results.failed > 0) {
    process.exit(1);
  }

  process.exit(0);
})();