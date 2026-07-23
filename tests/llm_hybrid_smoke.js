"use strict";

const assert = require("assert/strict");
const llmAdapter = require("../scripts/MIA_LLM_ADAPTER");
const sessionMemory = require("../scripts/MIA_SESSION_MEMORY");
const { buildActionResult } = require("../shared/platform_runtime/action_builder");
const { decide } = require("../shared/platform_runtime_rules/decision_engine");
const responseEngine = require("../scripts/MIA_RESPONSE_ENGINE");

function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
  } catch (err) {
    console.error(`❌ ${name}`);
    console.error(err && err.stack ? err.stack : err);
    process.exitCode = 1;
  }
}

console.log("\n---- LLM HYBRID + PIPELINE ----\n");

test("LLM blocks sensitive grief intents", () => {
  assert.equal(
    llmAdapter.isEligibleForLlm({ type: "pet_loss_report", tone: "sensitive" }),
    false
  );
  assert.equal(
    llmAdapter.isEligibleForLlm({ type: "direct_statement", tone: "neutral" }),
    true
  );
});

test("LLM allows knowledge and story intents", () => {
  assert.equal(
    llmAdapter.isEligibleForLlm({ type: "knowledge_question", tone: "neutral" }),
    true
  );
  assert.equal(
    llmAdapter.isEligibleForLlm({ type: "story_request", tone: "neutral" }),
    true
  );
});

test("LLM sanitize keeps short Czech reply", () => {
  const text = llmAdapter.sanitizeReply(
    '  "Ahoj Katko, jsem tady. Co chceš?"   Další věta navíc. A ještě třetí.  '
  );
  assert.ok(text.length <= 220);
  assert.match(text, /Katko/i);
});

test("groq provider preset resolves free-tier defaults", () => {
  const cfg = llmAdapter.resolveConfig({
    llm: {
      provider: "groq",
      mode: "hybrid",
      apiKey: "gsk_test"
    }
  });
  assert.equal(cfg.provider, "groq");
  assert.equal(cfg.baseUrl, "https://api.groq.com/openai/v1");
  assert.match(cfg.model, /llama/i);
});

test("groq provider ignores openai key when groq key missing", () => {
  const prev = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "sk-should-not-use";
  delete process.env.GROQ_API_KEY;
  try {
    const cfg = llmAdapter.resolveConfig({ llm: { provider: "groq", mode: "hybrid" } });
    assert.equal(cfg.apiKey, "");
  } finally {
    if (prev === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = prev;
  }
});

test("hybrid chain falls back from groq to openai when both keys present", () => {
  const prevGroq = process.env.GROQ_API_KEY;
  const prevOpenai = process.env.OPENAI_API_KEY;
  const prevFallback = process.env.MIA_LLM_FALLBACK;
  process.env.GROQ_API_KEY = "gsk_test";
  process.env.OPENAI_API_KEY = "sk-test";
  process.env.MIA_LLM_FALLBACK = "groq,openai";
  try {
    const chain = llmAdapter.resolveProviderChain({
      llm: { provider: "groq", mode: "hybrid" }
    });
    assert.equal(chain.length, 2);
    assert.equal(chain[0].provider, "groq");
    assert.equal(chain[1].provider, "openai");
    assert.equal(chain[1].apiKey, "sk-test");
    assert.equal(llmAdapter.isEnabled({ llm: { provider: "groq", mode: "hybrid" } }), true);
  } finally {
    if (prevGroq === undefined) delete process.env.GROQ_API_KEY;
    else process.env.GROQ_API_KEY = prevGroq;
    if (prevOpenai === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = prevOpenai;
    if (prevFallback === undefined) delete process.env.MIA_LLM_FALLBACK;
    else process.env.MIA_LLM_FALLBACK = prevFallback;
  }
});

test("failover trigger covers 429 and network but not auth errors", () => {
  assert.equal(llmAdapter.shouldFailoverToNextProvider("llm_http_429"), true);
  assert.equal(llmAdapter.shouldFailoverToNextProvider("llm_http_503"), true);
  assert.equal(llmAdapter.shouldFailoverToNextProvider("timeout of 12000ms exceeded"), true);
  assert.equal(llmAdapter.shouldFailoverToNextProvider("llm_http_401"), false);
});

test("direct ping action builder passes message into chat brain path", () => {
  const event = {
    eventType: "COMMENT",
    route: "community",
    message: "Mio jak se mas?",
    user: { username: "Katka", nickname: "Katka" }
  };

  const decision = decide({
    event,
    streamState: { audience: { viewerCount: 20 } },
    kojnozoutState: { bowlPercent: 10 }
  });

  assert.equal(decision.reason, "COMMUNITY_DIRECT_PING");

  const result = buildActionResult({
    decision,
    event,
    streamState: { audience: { viewerCount: 20 } },
    outputState: {},
    kojnozoutState: { bowlPercent: 10 }
  });

  assert.ok(result.overlayPayload?.text);
  assert.doesNotMatch(result.overlayPayload.text.toLowerCase(), /mio jak se mas/);
});

test("greeting uses text bank variants", () => {
  const text = responseEngine.buildDirectChatResponse({}, {
    message: "ahoj mia",
    userLabel: "Katka",
    target: "mia"
  }).speech_text;

  assert.ok(text);
  assert.match(text.toLowerCase(), /katka|ahoj|vít|stream/i);
});

test("session memory tracks returning viewer", () => {
  sessionMemory.loadStore(require("path").join(__dirname, ".tmp-session-memory-test.json"));
  sessionMemory.observeChatMessage({
    userLabel: "Tester",
    message: "první zpráva",
    intentType: "greeting"
  });
  sessionMemory.observeChatMessage({
    userLabel: "Tester",
    message: "druhá zpráva",
    intentType: "statement"
  });

  const hints = sessionMemory.getUserSessionHints("Tester");
  assert.equal(hints.isReturning, true);
  assert.ok(hints.visitCount >= 2);
});

console.log("\n---- LLM HYBRID + PIPELINE SUMMARY ----\n");
