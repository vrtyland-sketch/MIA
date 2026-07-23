"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const {
  buildCareCommandsDeps,
  createCareCommandHandler
} = require("../scripts/MIA_CARE_COMMANDS_WIRING");

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
  await test("buildCareCommandsDeps maps ctx fields", () => {
    const executeOverlay = async () => ({});
    const deps = buildCareCommandsDeps({
      safeString: (v) => String(v ?? ""),
      executeOverlay,
      modules: { careQuestModule: {} }
    });
    assert.equal(deps.executeOverlay, executeOverlay);
    assert.deepEqual(deps.modules, { careQuestModule: {} });
  });

  await test("createCareCommandHandler returns null handler when routes missing", async () => {
    const handler = createCareCommandHandler({}, { safeString: (v) => v });
    assert.equal(await handler({}), null);
  });

  await test("createCareCommandHandler wires routes module", async () => {
    let wired = false;
    const handler = createCareCommandHandler(
      {
        createCareCommandHandler: (deps) => {
          wired = typeof deps.executeOverlay === "function";
          return async () => ({ handled: true });
        }
      },
      { executeOverlay: async () => ({}) }
    );
    const result = await handler({});
    assert.equal(wired, true);
    assert.equal(result.handled, true);
  });

  await test("index.js uses initCareCommandsRuntime for tryHandleKojnozoutCommands", () => {
    const indexSrc = fs.readFileSync(path.join(ROOT, "index.js"), "utf8");
    assert.match(indexSrc, /initCareCommandsRuntime/);
    assert.match(indexSrc, /careCommandsRuntime\(\)/);
    assert.match(indexSrc, /MIA_CARE_COMMANDS_WIRING/);
    assert.match(indexSrc, /MIA_CARE_COMMANDS_CTX/);
    assert.match(
      indexSrc,
      /const tryHandleKojnozoutCommands = \(\.\.\.args\) => careCommandsRuntime\(\)\(\.\.\.args\)/
    );
    assert.doesNotMatch(indexSrc, /careCommandsRoutes\.createCareCommandHandler\(\{/);
  });

  console.log("care_commands_wiring_contract: all passed");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
