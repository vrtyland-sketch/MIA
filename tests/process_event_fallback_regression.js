"use strict";

/**
 * Guards shadow fallback regression — logic lives in engine_shadow_runtime + phase_decide.
 */

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const Module = require("module");

const indexPath = path.resolve(__dirname, "../index.js");
const phaseDecidePath = path.resolve(__dirname, "../scripts/pipeline/phase_decide.js");
const shadowPath = path.resolve(__dirname, "../MIA_NEXT/engine_shadow_runtime.js");

const results = { passed: 0, failed: 0 };

async function test(name, fn) {
  try {
    await fn();
    results.passed += 1;
    console.log(`✅ ${name}`);
  } catch (err) {
    results.failed += 1;
    console.error(`❌ ${name}`);
    console.error(err && err.stack ? err.stack : err);
  }
}

function loadProcessEventWithRealShadow() {
  const originalLoad = Module._load;

  const expressApp = {
    use() {},
    get() {},
    post() {},
    listen(_port, cb) {
      const server = {
        on() {},
        close() {}
      };
      if (typeof cb === "function") cb();
      return server;
    }
  };

  function expressStub() {
    return expressApp;
  }
  expressStub.json = () => (_req, _res, next) => next && next();
  expressStub.urlencoded = () => (_req, _res, next) => next && next();
  expressStub.static = () => (_req, _res, next) => next && next();

  const stubs = {
    express: expressStub,
    "./scripts/MIA_PORT_GUARD": {
      async assertPortAvailableOrExit() {},
      printPortInUseHelp() {}
    },
    "./scripts/MIA_KICK_BRIDGE": {
      async startKickBridge() {
        return { ok: true };
      }
    },
    "./shared/next/share_runtime_share_debug_route": {
      mountSharePreviewDebugRoute() {}
    }
  };

  const safeRequirePath = path.resolve(__dirname, "../scripts/MIA_SAFE_REQUIRE.js");

  delete require.cache[indexPath];
  try {
    delete require.cache[safeRequirePath];
  } catch (_err) {
    // ignore
  }

  function lookupStub(request) {
    if (Object.prototype.hasOwnProperty.call(stubs, request)) {
      return stubs[request];
    }
    try {
      const relFromRoot =
        "./" + path.relative(path.resolve(__dirname, ".."), request).replace(/\\/g, "/");
      if (Object.prototype.hasOwnProperty.call(stubs, relFromRoot)) {
        return stubs[relFromRoot];
      }
    } catch (_err) {
      // ignore
    }
    return undefined;
  }

  Module._load = function patchedLoader(request, parent, isMain) {
    if (parent) {
      const parentFile = parent.filename;
      if (parentFile === indexPath || parentFile === safeRequirePath) {
        const stub = lookupStub(request);
        if (stub !== undefined) {
          return stub;
        }
      }
    }
    return originalLoad.apply(this, arguments);
  };

  let exported = null;

  try {
    exported = require(indexPath);
  } finally {
    Module._load = originalLoad;
  }

  return exported;
}

(async () => {
  await test("engine_shadow_runtime defines resolvePipelineAction fallback", () => {
    const shadowSrc = fs.readFileSync(shadowPath, "utf8");
    assert.match(shadowSrc, /async function resolvePipelineAction/);
    assert.match(shadowSrc, /eventType === "GIFT"/);
    assert.match(
      shadowSrc,
      /normalizeActionResult\(shadowResult,\s*fallbackAction\)/
    );
  });

  await test("phase_decide delegates fallback to shadow runtime", () => {
    const phaseSrc = fs.readFileSync(phaseDecidePath, "utf8");
    assert.match(phaseSrc, /resolvePipelineAction/);
    assert.match(phaseSrc, /shadow_fallback_used/);
  });

  await test("processEvent gift path resolves without ReferenceError", async () => {
    const mod = loadProcessEventWithRealShadow();
    assert.equal(typeof mod.processEvent, "function");

    const result = await mod.processEvent({
      source: "debug",
      platform: "tiktok",
      type: "gift",
      eventType: "gift",
      giftName: "Rose",
      coins: 10,
      repeatCount: 1,
      username: "regression_user",
      nickname: "Regression User",
      userId: "u_regression_gift"
    });

    assert.ok(result);
    assert.equal(result.status, 200);
    assert.equal(result.body.ok, true);
    assert.ok(result.body.actionResult);
    assert.ok(result.body.overlayEmit);
  });

  console.log("");
  console.log("---- PROCESS EVENT FALLBACK REGRESSION ----");
  console.log(`passed: ${results.passed}`);
  console.log(`failed: ${results.failed}`);

  process.exit(results.failed > 0 ? 1 : 0);
})().catch((err) => {
  console.error("❌ process event fallback regression crashed");
  console.error(err && err.stack ? err.stack : err);
  process.exit(1);
});
