"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const { createActionBuilderRuntime } = require("../scripts/MIA_ACTION_BUILDER_RUNTIME");

const ROOT = path.resolve(__dirname, "..");

function test(name, fn) {
  return Promise.resolve()
    .then(() => fn())
    .then(() => console.log(`ok - ${name}`))
    .catch((err) => {
      console.error(`fail - ${name}`);
      throw err;
    });
}

async function run() {
  await test("createActionBuilderRuntime exposes action builder API", () => {
    const api = createActionBuilderRuntime({
      safeString: (v, d) => String(v ?? d ?? ""),
      getUserLabel: () => "Viewer",
      chatBrain: {},
      runtimeConfig: {},
      getKojnozoutState: () => ({}),
      getOutputState: () => ({}),
      responseEngine: {}
    });
    assert.equal(typeof api.buildDirectChatAction, "function");
    assert.equal(typeof api.buildSupportAction, "function");
    assert.equal(typeof api.normalizeActionResult, "function");
  });

  await test("buildDirectChatAction falls back to community overlay", async () => {
    const result = await createActionBuilderRuntime({
      safeString: (v, d) => String(v ?? d ?? ""),
      getUserLabel: () => "Viewer",
      chatBrain: {},
      runtimeConfig: {},
      getKojnozoutState: () => ({}),
      getOutputState: () => ({}),
      responseEngine: {}
    }).buildDirectChatAction({ message: "ahoj MIA" });

    assert.equal(result.ok, true);
    assert.equal(result.overlayPayload.owner, "mia");
    assert.equal(result.overlayPayload.text, "ahoj MIA");
  });

  await test("buildSupportAction uses response engine when available", () => {
    const result = createActionBuilderRuntime({
      safeString: (v, d) => String(v ?? d ?? ""),
      getUserLabel: () => "Donor",
      getOutputState: () => ({}),
      responseEngine: {
        buildSupportResponse: () => ({ ok: true, route: "support", tier: "T2" })
      }
    }).buildSupportAction({ giftName: "Rose" });

    assert.equal(result.tier, "T2");
  });

  await test("normalizeActionResult prefers fallback when shadow failed", () => {
    const fallback = { overlayPayload: { text: "fallback" } };
    const result = createActionBuilderRuntime({}).normalizeActionResult(
      { ok: false, reason: "shadow_fail" },
      fallback
    );
    assert.equal(result, fallback);
  });

  await test("normalizeActionResult unwraps actionResult", () => {
    const inner = { overlayPayload: { text: "from shadow" } };
    const result = createActionBuilderRuntime({}).normalizeActionResult(
      { actionResult: inner },
      null
    );
    assert.equal(result, inner);
  });

  await test("index.js wires actionBuilderRuntime with thin wrappers", () => {
    const indexSrc = fs.readFileSync(path.join(ROOT, "index.js"), "utf8");
    assert.match(indexSrc, /initActionBuilderRuntime/);
    assert.match(indexSrc, /MIA_ACTION_BUILDER_RUNTIME/);
    assert.match(indexSrc, /MIA_ACTION_BUILDER_CTX/);
    assert.doesNotMatch(indexSrc, /shadowFailed/);
  });

  console.log("action_builder_runtime_contract: all passed");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
