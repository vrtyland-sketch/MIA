"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const { buildIngestHttpCtx } = require("../scripts/MIA_INGEST_HTTP_CTX");
const { buildIngestHttpDeps } = require("../scripts/MIA_INGEST_HTTP_WIRING");

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
  await test("buildIngestHttpCtx flattens grouped host", () => {
    const processEvent = async () => ({ status: 200, body: { ok: true } });
    const ctx = buildIngestHttpCtx({
      modules: {
        normalizer: { id: "norm" },
        languageModule: {},
        ingestGuardModule: {},
        streamAudienceModule: {},
        spamSessionEngine: {}
      },
      core: { runtimeConfig: { port: 3000 }, safeString: String, upper: (v) => String(v).toUpperCase(), writeLog: () => {} },
      state: { getStreamState: () => ({}), setStreamState: () => {} },
      handlers: { recordIngestSummary: () => {}, processEvent }
    });
    assert.equal(ctx.normalizer.id, "norm");
    assert.equal(ctx.processEvent, processEvent);
    assert.equal(ctx.runtimeConfig.port, 3000);
  });

  await test("buildIngestHttpCtx matches wiring deps shape", () => {
    const processEvent = async () => ({});
    const deps = buildIngestHttpDeps(
      buildIngestHttpCtx({
        modules: { normalizer: {}, languageModule: {}, ingestGuardModule: {}, streamAudienceModule: {}, spamSessionEngine: {} },
        core: { runtimeConfig: {}, safeString: String, upper: (v) => String(v), writeLog: () => {} },
        state: { getStreamState: () => ({}), setStreamState: () => {} },
        handlers: { recordIngestSummary: () => {}, processEvent }
      })
    );
    assert.equal(typeof deps.processEvent, "function");
    assert.equal(typeof deps.getStreamState, "function");
  });

  await test("buildIngestHttpCtx resolves spamSession via getter", () => {
    const spam = { id: "spam" };
    const ctx = buildIngestHttpCtx({
      modules: {
        getSpamSessionEngine: () => spam
      }
    });
    assert.equal(ctx.spamSessionEngine.id, "spam");
  });

  await test("index.js uses collectIngestHttpHost and buildIngestHttpCtx", () => {
    const indexSrc = fs.readFileSync(path.join(ROOT, "index.js"), "utf8");
    assert.match(indexSrc, /function collectIngestHttpHost\(\)/);
    assert.match(indexSrc, /MIA_INGEST_HTTP_CTX/);
    assert.match(indexSrc, /MIA_INGEST_HTTP_HOST/);
    assert.match(indexSrc, /buildHost\(collectIngestHttpBindingsHost\(\)\)/);
    assert.match(indexSrc, /function initPipelineRuntimesRuntime\(\)/);
    assert.match(indexSrc, /getSpamSessionEngine: spamSessionRuntime/);
    assert.match(indexSrc, /initIngestHttpRuntime\(\)/);
    assert.doesNotMatch(indexSrc, /function getIngestHttpCtx\(\)/);
    assert.doesNotMatch(indexSrc, /createIngestHttpHandlers\(\{/);
  });

  console.log("ingest_http_ctx_contract: all passed");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
