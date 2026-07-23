"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const { buildObsWatchdogCtx } = require("../scripts/MIA_OBS_WATCHDOG_CTX");
const { createObsWatchdog } = require("../scripts/MIA_OBS_WATCHDOG");

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
  await test("buildObsWatchdogCtx passes live handlers", () => {
    let running = false;
    const log = () => {};
    const ctx = buildObsWatchdogCtx({
      core: { config: { enabled: true, cooldownMs: 1000 } },
      handlers: {
        isProcessRunning: () => running,
        log,
        now: () => 123
      }
    });
    assert.equal(ctx.isProcessRunning(), false);
    running = true;
    assert.equal(ctx.isProcessRunning(), true);
    assert.equal(ctx.log, log);
    assert.equal(ctx.now(), 123);
  });

  await test("createObsWatchdog accepts buildObsWatchdogCtx shape", () => {
    const api = createObsWatchdog(
      buildObsWatchdogCtx({
        core: { config: { enabled: false } },
        handlers: {
          isProcessRunning: () => true,
          log: () => {},
          now: () => Date.now()
        }
      })
    );
    assert.equal(typeof api.status, "function");
    assert.equal(typeof api.ensureRunning, "function");
  });

  await test("index.js uses collectObsWatchdogHost and buildObsWatchdogCtx", () => {
    const indexSrc = fs.readFileSync(path.join(ROOT, "index.js"), "utf8");
    assert.match(indexSrc, /function collectObsWatchdogHost\(\)/);
    assert.match(indexSrc, /MIA_OBS_WATCHDOG_CTX/);
    assert.match(indexSrc, /MIA_OBS_WATCHDOG_HOST/);
    assert.match(indexSrc, /buildHost\(collectObsWatchdogBindingsHost\(\)\)/);
    assert.match(indexSrc, /function initObsWatchdogRuntime\(\)/);
    assert.match(indexSrc, /obsWatchdogRuntime\(\)/);
    assert.match(indexSrc, /getObsWatchdog: obsWatchdogRuntime/);
    assert.doesNotMatch(indexSrc, /function getObsWatchdog\(\)/);
    assert.doesNotMatch(indexSrc, /function initObsWatchdog\(\)/);
    assert.doesNotMatch(indexSrc, /createObsWatchdog\(\{\s*config:/);
  });

  console.log("obs_watchdog_ctx_contract: all passed");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
