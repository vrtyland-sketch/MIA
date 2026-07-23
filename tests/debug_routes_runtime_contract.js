"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const { createDebugRoutesRuntime } = require("../scripts/MIA_DEBUG_ROUTES_RUNTIME");

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
  await test("handleDebugComment builds comment event", async () => {
    let payload = null;
    const api = createDebugRoutesRuntime({
      processEvent: async (event) => {
        payload = event;
        return { status: 200, body: { ok: true } };
      }
    });

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

    await api.handleDebugComment(
      { method: "POST", body: { message: "test", nickname: "Alice" } },
      res
    );

    assert.equal(payload.eventType, "comment");
    assert.equal(payload.message, "test");
    assert.equal(payload.nickname, "Alice");
    assert.equal(res.statusCode, 200);
  });

  await test("handleDebugGift builds gift event", async () => {
    let payload = null;
    const api = createDebugRoutesRuntime({
      processEvent: async (event) => {
        payload = event;
        return { status: 201, body: { tier: "T1" } };
      }
    });

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

    await api.handleDebugGift(
      { method: "GET", query: { giftName: "Rose", coins: "5" } },
      res
    );

    assert.equal(payload.eventType, "gift");
    assert.equal(payload.giftName, "Rose");
    assert.equal(payload.coins, 5);
    assert.equal(res.statusCode, 201);
  });

  await test("index.js uses initDebugRoutesRuntime and debugRoutesRuntime", () => {
    const indexSrc = fs.readFileSync(path.join(ROOT, "index.js"), "utf8");
    assert.match(indexSrc, /function initDebugRoutesRuntime\(\)/);
    assert.match(indexSrc, /debugRoutesRuntime\(\)/);
    assert.match(indexSrc, /MIA_DEBUG_ROUTES_RUNTIME/);
    assert.match(indexSrc, /MIA_DEBUG_ROUTES_CTX/);
    assert.match(indexSrc, /async function handleDebugComment\(req, res\)/);
    assert.doesNotMatch(indexSrc, /function initDebugRoutes\(\)/);
    assert.doesNotMatch(indexSrc, /debugRoutesApiCache/);
    assert.doesNotMatch(indexSrc, /eventType: "comment",\s*type: "comment",\s*platform: source\.platform/);
  });

  console.log("debug_routes_runtime_contract: all passed");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
