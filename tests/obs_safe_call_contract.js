"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const { createObsSafeCall } = require("../scripts/MIA_OBS_SAFE_CALL");

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
  await test("createObsSafeCall exposes safeObsCall", () => {
    const api = createObsSafeCall({
      ensureObsConnected: async () => ({ ok: false }),
      getObs: () => null,
      safeString: (v, d) => String(v ?? d ?? ""),
      writeLog: () => {}
    });
    assert.equal(typeof api.safeObsCall, "function");
  });

  await test("safeObsCall returns obs_not_connected when OBS offline", async () => {
    const result = await createObsSafeCall({
      ensureObsConnected: async () => ({ ok: false }),
      getObs: () => null,
      safeString: (v, d) => String(v ?? d ?? ""),
      writeLog: () => {}
    }).safeObsCall("GetVersion");

    assert.equal(result.ok, false);
    assert.equal(result.reason, "obs_not_connected");
  });

  await test("safeObsCall screenshot tries source aliases", async () => {
    const calls = [];
    const result = await createObsSafeCall({
      ensureObsConnected: async () => ({ ok: true }),
      getObs: () => ({
        call: async (type, data) => {
          calls.push(data?.sourceName);
          if (data?.sourceName === "MIA_BUBBLE") {
            return { imageData: "abc" };
          }
          throw new Error("No source was found by the name of MIA_SPEECH");
        }
      }),
      safeString: (v, d) => String(v ?? d ?? ""),
      writeLog: () => {}
    }).safeObsCall("GetSourceScreenshot", { sourceName: "MIA_SPEECH" });

    assert.equal(result.ok, true);
    assert.deepEqual(calls, ["MIA_SPEECH", "MIA_BUBBLE"]);
  });

  await test("index.js wires obsSafeCallRuntime with thin wrapper", () => {
    const indexSrc = fs.readFileSync(path.join(ROOT, "index.js"), "utf8");
    assert.match(indexSrc, /initObsSafeCallRuntime/);
    assert.match(indexSrc, /MIA_OBS_SAFE_CALL/);
    assert.match(indexSrc, /MIA_OBS_SAFE_CALL_CTX/);
    assert.match(
      indexSrc,
      /async function safeObsCall\(requestType, requestData = \{\}\) \{\s*return obsSafeCallRuntime\(\)\.safeObsCall\(requestType, requestData\);/
    );
    assert.doesNotMatch(indexSrc, /OBS_SOURCE_ALIASES/);
  });

  console.log("obs_safe_call_contract: all passed");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
