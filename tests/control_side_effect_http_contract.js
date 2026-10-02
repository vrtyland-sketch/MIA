"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const http = require("http");
const os = require("os");
const path = require("path");
const express = require("express");
const { registerTtsRoutes } = require("../routes/tts");
const { registerOverlayRoutes } = require("../routes/overlay");
const { registerEyesRoutes } = require("../routes/eyes");
const { createLocalAdminGuard } = require("../scripts/MIA_RUNTIME_SECURITY");
const layoutStore = require("../scripts/MIA_OVERLAY_LAYOUT");

const ADMIN = "local-admin-side-effect";
const WRONG = "wrong-admin-side-effect";
const PEER = "peer-credential-side-effect";
const REMOTE = "203.0.113.8";

function test(name, fn) {
  return Promise.resolve()
    .then(() => fn())
    .then(() => {
      console.log(`ok - ${name}`);
    })
    .catch((err) => {
      console.error(`fail - ${name}`);
      console.error(err && err.stack ? err.stack : err);
      process.exitCode = 1;
    });
}

function readBody(res) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    res.on("data", (chunk) => chunks.push(chunk));
    res.on("end", () => {
      const text = Buffer.concat(chunks).toString("utf8");
      if (!text) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(text));
      } catch (err) {
        reject(err);
      }
    });
    res.on("error", reject);
  });
}

function rawRequest(port, { method, path: requestPath, headers, body }) {
  return new Promise((resolve, reject) => {
    const payload = body == null ? null : Buffer.from(JSON.stringify(body));
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port,
        method,
        path: requestPath,
        agent: false,
        headers: {
          connection: "close",
          ...(payload
            ? {
                "content-type": "application/json",
                "content-length": String(payload.length)
              }
            : {}),
          ...(headers || {})
        }
      },
      async (res) => {
        try {
          resolve({ status: res.statusCode, body: await readBody(res) });
        } catch (err) {
          reject(err);
        }
      }
    );
    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function listen(app) {
  const server = http.createServer(app);
  let nextRemote = null;
  server.on("connection", (socket) => {
    if (!nextRemote) return;
    Object.defineProperty(socket, "remoteAddress", {
      configurable: true,
      value: nextRemote
    });
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      resolve({
        server,
        port: server.address().port,
        request(options) {
          nextRemote = options.remoteAddress || null;
          return rawRequest(server.address().port, options).finally(() => {
            nextRemote = null;
          });
        }
      });
    });
  });
}

function snapshotLayout() {
  const exists = fs.existsSync(layoutStore.STORE_PATH);
  return {
    exists,
    bytes: exists ? fs.readFileSync(layoutStore.STORE_PATH) : null
  };
}

function layoutBytes() {
  if (!fs.existsSync(layoutStore.STORE_PATH)) return null;
  return fs.readFileSync(layoutStore.STORE_PATH);
}

function sameBytes(left, right) {
  if (left == null || right == null) return left == null && right == null;
  return Buffer.compare(left, right) === 0;
}

function restoreLayout(snap) {
  if (snap.exists) {
    fs.mkdirSync(path.dirname(layoutStore.STORE_PATH), { recursive: true });
    fs.writeFileSync(layoutStore.STORE_PATH, snap.bytes);
  } else if (fs.existsSync(layoutStore.STORE_PATH)) {
    fs.unlinkSync(layoutStore.STORE_PATH);
  }
  layoutStore.getLayout({ forceReload: true });
}

function anchorBody() {
  return {
    characterId: "koj",
    anchors: {
      belly: { x: 0.5, y: 0.6 },
      head: { x: 0.5, y: 0.2 },
      neck: { x: 0.5, y: 0.35 }
    }
  };
}

async function main() {
  const layoutBefore = snapshotLayout();
  const anchorsDir = fs.mkdtempSync(path.join(os.tmpdir(), "mia-anchors-"));
  const anchorFile = path.join(anchorsDir, "anchors", "koj.json");
  const calls = { speak: 0, ping: 0, obs: 0, canvas: 0, scene: 0, analyze: 0 };
  const guard = createLocalAdminGuard({ resolveIngestSecret: () => ADMIN });

  const app = express();
  app.use(express.json());
  registerTtsRoutes(app, {
    localAdminGuard: guard,
    ttsEngine: {
      speak() {
        calls.speak += 1;
        return { ok: true, voice: "stub", audioUrl: "/stub.mp3" };
      }
    },
    languageModule: {},
    runtimeConfig: {}
  });
  registerOverlayRoutes(app, {
    localAdminGuard: guard,
    buildPublicOverlayStateResponse: () => ({ ok: true, publicOverlay: true }),
    executeOverlay: async () => {
      calls.ping += 1;
      return { ok: true };
    },
    setOverlay: () => ({}),
    refreshObsMiaBrowserSources: async () => ({ ok: true }),
    PORT: 0,
    overlayStaticDir: anchorsDir
  });
  registerEyesRoutes(app, {
    localAdminGuard: guard,
    displayVisionModule: {
      analyzeLayout() {
        calls.analyze += 1;
        return [];
      },
      readCanvas() {
        calls.canvas += 1;
        return { w: 10, h: 10 };
      },
      readSceneLayout() {
        calls.scene += 1;
        return [];
      }
    },
    ensureObsConnectedWithRetry() {
      calls.obs += 1;
      return { ok: true };
    },
    runtimeConfig: { obs: { sceneName: "TEST_SCENE" } },
    safeObsCall: async () => ({})
  });

  const closedApp = express();
  closedApp.use(express.json());
  const closedAnchorsDir = fs.mkdtempSync(path.join(os.tmpdir(), "mia-anchors-closed-"));
  registerOverlayRoutes(closedApp, {
    buildPublicOverlayStateResponse: () => ({ ok: true, publicOverlay: true }),
    executeOverlay: async () => {
      calls.ping += 1;
      return { ok: true };
    },
    overlayStaticDir: closedAnchorsDir
  });

  const live = await listen(app);
  const closed = await listen(closedApp);

  function effects() {
    return {
      speak: calls.speak,
      ping: calls.ping,
      obs: calls.obs,
      canvas: calls.canvas,
      scene: calls.scene,
      analyze: calls.analyze,
      layout: layoutBytes(),
      anchor: fs.existsSync(anchorFile),
      closedAnchor: fs.existsSync(path.join(closedAnchorsDir, "anchors", "koj.json"))
    };
  }

  try {
    await test("remote requests without a secret do not speak, ping, scan, or write", async () => {
      const before = effects();
      const compare = await live.request({
        method: "GET",
        path: "/tts/compare",
        remoteAddress: REMOTE
      });
      const ping = await live.request({
        method: "GET",
        path: "/ping-overlay",
        remoteAddress: REMOTE
      });
      const check = await live.request({
        method: "GET",
        path: "/mia/display/self-check",
        remoteAddress: REMOTE
      });
      const layout = await live.request({
        method: "POST",
        path: "/overlay/layout",
        remoteAddress: REMOTE,
        body: { kojScale: 0.71 }
      });
      const reset = await live.request({
        method: "POST",
        path: "/overlay/layout/reset",
        remoteAddress: REMOTE
      });
      const anchors = await live.request({
        method: "POST",
        path: "/api/rig-anchors",
        remoteAddress: REMOTE,
        body: anchorBody()
      });
      const after = effects();
      for (const res of [compare, ping, check, layout, reset, anchors]) {
        assert.equal(res.status, 403);
        assert.equal(res.body.error, "local_admin_only");
      }
      assert.deepEqual(after, before);
    });

    await test("wrong admin secret and duel peer credential do not trigger side effects", async () => {
      const before = effects();
      const cases = [
        { headers: { "x-mia-ingest-secret": WRONG } },
        { headers: { "x-mia-duel-peer": PEER } }
      ];
      for (const auth of cases) {
        const compare = await live.request({
          method: "GET",
          path: "/tts/compare",
          remoteAddress: "198.51.100.10",
          headers: auth.headers
        });
        const ping = await live.request({
          method: "GET",
          path: "/ping-overlay",
          remoteAddress: "198.51.100.10",
          headers: auth.headers
        });
        const check = await live.request({
          method: "GET",
          path: "/mia/display/self-check",
          remoteAddress: "198.51.100.10",
          headers: auth.headers
        });
        const layout = await live.request({
          method: "POST",
          path: "/overlay/layout",
          remoteAddress: "198.51.100.10",
          headers: auth.headers,
          body: { kojScale: 0.71 }
        });
        const anchors = await live.request({
          method: "POST",
          path: "/api/rig-anchors",
          remoteAddress: "198.51.100.10",
          headers: auth.headers,
          body: anchorBody()
        });
        for (const res of [compare, ping, check, layout, anchors]) {
          assert.equal(res.status, 403);
        }
      }
      assert.deepEqual(effects(), before);
    });

    await test("public overlay-state stays available to a remote client", async () => {
      const before = effects();
      const res = await live.request({
        method: "GET",
        path: "/overlay-state",
        remoteAddress: REMOTE
      });
      assert.equal(res.status, 200);
      assert.equal(res.body.publicOverlay, true);
      assert.deepEqual(effects(), before);
    });

    await test("matching admin secret runs the guarded side effects", async () => {
      const headers = { "x-mia-ingest-secret": ADMIN };
      const compare = await live.request({
        method: "GET",
        path: "/tts/compare",
        remoteAddress: REMOTE,
        headers
      });
      const ping = await live.request({
        method: "GET",
        path: "/ping-overlay",
        remoteAddress: REMOTE,
        headers
      });
      const check = await live.request({
        method: "GET",
        path: "/mia/display/self-check",
        remoteAddress: REMOTE,
        headers
      });
      const layout = await live.request({
        method: "POST",
        path: "/overlay/layout",
        remoteAddress: REMOTE,
        headers,
        body: { kojScale: 0.71 }
      });
      const anchors = await live.request({
        method: "POST",
        path: "/api/rig-anchors",
        remoteAddress: REMOTE,
        headers,
        body: anchorBody()
      });
      assert.equal(compare.status, 200);
      assert.equal(compare.body.ok, true);
      assert.equal(calls.speak, 2);
      assert.equal(ping.status, 200);
      assert.equal(calls.ping, 1);
      assert.equal(check.status, 200);
      assert.equal(check.body.ok, true);
      assert.equal(calls.obs, 1);
      assert.equal(calls.canvas, 1);
      assert.equal(calls.scene, 1);
      assert.equal(calls.analyze, 1);
      assert.equal(layout.status, 200);
      assert.equal(layout.body.layout.kojScale, 0.71);
      assert.equal(sameBytes(layoutBytes(), layoutBefore.bytes), false);
      assert.equal(anchors.status, 200);
      assert.equal(fs.existsSync(anchorFile), true);
    });

    await test("localhost can run the guarded routes without a secret", async () => {
      const speakBefore = calls.speak;
      const pingBefore = calls.ping;
      const obsBefore = calls.obs;
      const compare = await live.request({ method: "GET", path: "/tts/compare" });
      const ping = await live.request({ method: "GET", path: "/ping-overlay" });
      const check = await live.request({ method: "GET", path: "/mia/display/self-check" });
      const reset = await live.request({ method: "POST", path: "/overlay/layout/reset" });
      assert.equal(compare.status, 200);
      assert.equal(ping.status, 200);
      assert.equal(check.status, 200);
      assert.equal(reset.status, 200);
      assert.equal(reset.body.ok, true);
      assert.equal(calls.speak, speakBefore + 2);
      assert.equal(calls.ping, pingBefore + 1);
      assert.equal(calls.obs, obsBefore + 1);
      assert.equal(fs.existsSync(layoutStore.STORE_PATH), false);
    });

    await test("missing admin guard denies layout and anchor writes", async () => {
      const before = layoutBytes();
      const pingBefore = calls.ping;
      const layout = await closed.request({
        method: "POST",
        path: "/overlay/layout",
        body: { kojScale: 0.66 }
      });
      const reset = await closed.request({
        method: "POST",
        path: "/overlay/layout/reset"
      });
      const anchors = await closed.request({
        method: "POST",
        path: "/api/rig-anchors",
        remoteAddress: REMOTE,
        headers: { "x-mia-ingest-secret": ADMIN, "x-mia-duel-peer": PEER },
        body: anchorBody()
      });
      const ping = await closed.request({ method: "GET", path: "/ping-overlay" });
      const state = await closed.request({
        method: "GET",
        path: "/overlay-state",
        remoteAddress: REMOTE
      });
      assert.equal(layout.status, 403);
      assert.equal(layout.body.error, "local_admin_guard_missing");
      assert.equal(reset.status, 403);
      assert.equal(reset.body.error, "local_admin_guard_missing");
      assert.equal(anchors.status, 403);
      assert.equal(ping.status, 403);
      assert.equal(calls.ping, pingBefore);
      assert.equal(sameBytes(layoutBytes(), before), true);
      assert.equal(fs.existsSync(path.join(closedAnchorsDir, "anchors", "koj.json")), false);
      assert.equal(state.status, 200);
      assert.equal(state.body.publicOverlay, true);
    });
  } finally {
    restoreLayout(layoutBefore);
    await new Promise((resolve) => live.server.close(resolve));
    await new Promise((resolve) => closed.server.close(resolve));
    fs.rmSync(anchorsDir, { recursive: true, force: true });
    fs.rmSync(closedAnchorsDir, { recursive: true, force: true });
  }

  if (process.exitCode) process.exit(process.exitCode);
  console.log("control_side_effect_http_contract: all passed");
}

main().catch((err) => {
  console.error(err && err.stack ? err.stack : err);
  process.exit(1);
});
