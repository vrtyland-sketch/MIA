"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const {
  buildIngestHttpDeps,
  createIngestHttpApi,
  createIngestHttpFallback,
  createIngestHttpRuntime
} = require("../scripts/MIA_INGEST_HTTP_WIRING");

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
  await test("buildIngestHttpDeps maps ctx fields", () => {
    const processEvent = async () => ({ status: 200, body: { ok: true } });
    const deps = buildIngestHttpDeps({
      normalizer: { id: "norm" },
      runtimeConfig: { id: "cfg" },
      processEvent
    });

    assert.equal(deps.normalizer.id, "norm");
    assert.equal(deps.processEvent, processEvent);
  });

  await test("createIngestHttpApi returns null when module missing", () => {
    const api = createIngestHttpApi({}, { processEvent: async () => ({}) });
    assert.equal(api, null);
  });

  await test("createIngestHttpApi wires real handlers", async () => {
    let received = null;
    const api = createIngestHttpApi(
      {
        createIngestHttpHandlers: (deps) => {
          received = deps;
          return {
            handleIngest: async () => ({ ok: true }),
            handleAudienceIngest: async () => ({ ok: true })
          };
        }
      },
      { processEvent: async () => ({}), runtimeConfig: { port: 3000 } }
    );

    assert.equal(typeof api.handleIngest, "function");
    assert.equal(received.runtimeConfig.port, 3000);
  });

  await test("createIngestHttpFallback returns 503 handlers", async () => {
    const api = createIngestHttpFallback();
    const res = {
      statusCode: 0,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(body) {
        this.body = body;
      }
    };

    await api.handleIngest({}, res);
    assert.equal(res.statusCode, 503);
    assert.equal(res.body.error, "ingest_http_missing");
  });

  await test("createIngestHttpRuntime falls back when module missing", async () => {
    const api = createIngestHttpRuntime({}, { processEvent: async () => ({}) });
    const res = {
      statusCode: 0,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(body) {
        this.body = body;
      }
    };

    await api.handleIngest({}, res);
    assert.equal(res.statusCode, 503);
    assert.equal(res.body.error, "ingest_http_missing");
  });

  await test("index.js uses initIngestHttpRuntime and ingestHttpRuntime", () => {
    const indexSrc = fs.readFileSync(path.join(ROOT, "index.js"), "utf8");
    assert.match(indexSrc, /function collectIngestHttpHost\(\)/);
    assert.match(indexSrc, /function initIngestHttpRuntime\(\)/);
    assert.match(indexSrc, /ingestHttpRuntime\(\)/);
    assert.match(indexSrc, /MIA_INGEST_HTTP_WIRING/);
    assert.match(indexSrc, /MIA_INGEST_HTTP_CTX/);
    assert.match(indexSrc, /buildCtx\(collectIngestHttpHost\(\)\)/);
    assert.match(indexSrc, /async function handleIngest\(req, res\)/);
    assert.doesNotMatch(indexSrc, /const ingestHttpApi =/);
    assert.doesNotMatch(indexSrc, /ingestHttpModule\.createIngestHttpHandlers\(\{/);
  });

  console.log("ingest_http_wiring_contract: all passed");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
