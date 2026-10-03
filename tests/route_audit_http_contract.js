"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const http = require("http");
const path = require("path");
const express = require("express");

const OUT_DIR = path.join(
  __dirname,
  "..",
  "mia-output-overlay",
  "generated",
  "gift-animations"
);
const origMkdir = fs.mkdirSync;
const blockedJobDirs = [];
fs.mkdirSync = function (target, options) {
  const resolved = path.resolve(String(target));
  if (resolved.startsWith(OUT_DIR + path.sep)) {
    blockedJobDirs.push(resolved);
    const err = new Error("audit_blocked_artwork_write");
    err.code = "AUDIT";
    throw err;
  }
  return origMkdir.call(this, target, options);
};

const { registerEyesRoutes } = require("../routes/eyes");
const { registerVideoRoutes } = require("../routes/video");
const { registerGiftAnimationRoutes } = require("../routes/gift_animation");
const { createLocalAdminGuard } = require("../scripts/MIA_RUNTIME_SECURITY");
const { createIngestUtilsRuntime } = require("../scripts/MIA_INGEST_UTILS_RUNTIME");
const giftAnim = require("../shared/mia-gift-animation");

const ADMIN = "route-audit-admin";
const WRONG = "route-audit-wrong";
const PEER = "route-audit-peer";
const REMOTE = "203.0.113.8";
const USER = "auditviewer";

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

function jobNames() {
  if (!fs.existsSync(OUT_DIR)) return [];
  return fs.readdirSync(OUT_DIR).sort();
}

function ask(extra = {}) {
  return giftAnim.startAskWords({
    giftKey: "ROSE",
    username: USER,
    wordsTimeoutMs: 5000,
    encodeVideo: false,
    profileImageUrl: "",
    ...extra
  });
}

async function main() {
  const jobsBefore = jobNames();
  const chatFeed = [];
  const obsCalls = [];
  const guard = createLocalAdminGuard({ resolveIngestSecret: () => ADMIN });
  const app = express();
  app.use(express.json({ limit: "2mb" }));
  registerEyesRoutes(app, { localAdminGuard: guard });
  registerVideoRoutes(app, {
    localAdminGuard: guard,
    runtimeConfig: {
      obs: {
        sceneName: "AUDIT_SCENE",
        tierSources: { T1: ["AUDIT_T1_VIDEO"] },
        autoSwitchProgramScene: false
      }
    },
    safeObsCall: async (method) => {
      obsCalls.push(method);
      if (method === "GetInputSettings") {
        return {
          response: {
            inputSettings: {
              local_file: "AUDIT_LOCAL_MEDIA_PATH"
            }
          }
        };
      }
      if (method === "GetSceneItemList") {
        return { response: { sceneItems: [] } };
      }
      if (method === "GetSceneList") {
        return { response: { scenes: [] } };
      }
      return { response: { currentProgramSceneName: "AUDIT_SCENE" } };
    },
    videoEngine: { getSnapshot: () => ({ audit: true }) },
    miaEyes: { getSnapshot: () => ({ audit: true }) }
  });
  registerGiftAnimationRoutes(app, {
    localAdminGuard: guard,
    getOverlayState: () => ({ chatFeed })
  });

  const originalCapture = giftAnim.tryCaptureWordsFromChat;
  let lastCapture = null;
  giftAnim.tryCaptureWordsFromChat = function (...args) {
    lastCapture = originalCapture.apply(this, args);
    return lastCapture;
  };

  const overlayState = { chatFeed: [] };
  const ingest = createIngestUtilsRuntime({
    safeString(value, fallback = "") {
      return typeof value === "string" && value.trim() ? value.trim() : fallback;
    },
    getUserLabel: () => USER,
    getAvatarUrl: () => "",
    overlayStateModule: {
      pushChatFeedItem(state, item, maxItems) {
        state.chatFeed = [item].concat(state.chatFeed || []).slice(0, maxItems || 6);
      }
    },
    getOverlayState: () => overlayState,
    runtimeConfig: { overlay: { maxChatFeedItems: 6, chatFeedMaxAgeMs: 15000 } }
  });

  const httpServer = await listen(app);
  const denied = [
    { name: "no secret", headers: {} },
    { name: "wrong secret", headers: { "x-mia-ingest-secret": WRONG } },
    { name: "duel peer only", headers: { "x-mia-duel-peer": PEER } }
  ];

  try {
    await test("remote render-report writes are rejected before telemetry changes", async () => {
      const loopback = await httpServer.request({
        method: "POST",
        path: "/mia/koj/render-report",
        remoteAddress: "127.0.0.1",
        body: { actual: { brokenImage: false, slotSrc: "kept.png" }, intent: { mood: "kept" } }
      });
      assert.equal(loopback.status, 200);

      for (const row of denied) {
        const rejected = await httpServer.request({
          method: "POST",
          path: "/mia/koj/render-report",
          remoteAddress: REMOTE,
          headers: row.headers,
          body: { actual: { brokenImage: true, slotSrc: "poison.png" }, intent: { mood: "poison" } }
        });
        assert.equal(rejected.status, 403, row.name);
        assert.equal(rejected.body.error, "local_admin_only");
      }

      const read = await httpServer.request({
        method: "GET",
        path: "/mia/koj/render-report",
        remoteAddress: "127.0.0.1"
      });
      assert.equal(read.status, 200);
      assert.equal(read.body.report.actual.slotSrc, "kept.png");
      assert.equal(read.body.report.actual.brokenImage, false);

      const speech = await httpServer.request({
        method: "POST",
        path: "/mia/speech/render-report",
        remoteAddress: "127.0.0.1",
        body: { visible: false, anyOffscreen: false }
      });
      assert.equal(speech.status, 200);
      for (const row of denied) {
        const rejected = await httpServer.request({
          method: "POST",
          path: "/mia/speech/render-report",
          remoteAddress: REMOTE,
          headers: row.headers,
          body: { visible: true, anyOffscreen: true, text: "secret phrase" }
        });
        assert.equal(rejected.status, 403, row.name);
      }
      const speechRead = await httpServer.request({
        method: "GET",
        path: "/mia/speech/render-report",
        remoteAddress: "127.0.0.1"
      });
      assert.equal(speechRead.body.report.visible, false);
      assert.equal(speechRead.body.report.text, undefined);
    });

    await test("loopback and the admin credential can write and read render reports", async () => {
      const bySecret = await httpServer.request({
        method: "POST",
        path: "/mia/koj/render-report",
        remoteAddress: REMOTE,
        headers: { "x-mia-ingest-secret": ADMIN },
        body: { actual: { brokenImage: false, slotSrc: "admin.png" }, intent: { mood: "admin" } }
      });
      assert.equal(bySecret.status, 200);
      const read = await httpServer.request({
        method: "GET",
        path: "/mia/koj/render-report",
        remoteAddress: REMOTE,
        headers: { "x-mia-ingest-secret": ADMIN }
      });
      assert.equal(read.status, 200);
      assert.equal(read.body.report.actual.slotSrc, "admin.png");
      for (const row of denied) {
        const rejected = await httpServer.request({
          method: "GET",
          path: "/mia/speech/render-report",
          remoteAddress: REMOTE,
          headers: row.headers
        });
        assert.equal(rejected.status, 403, row.name);
      }
    });

    await test("remote video diag is rejected before any OBS call", async () => {
      const before = obsCalls.length;
      for (const row of denied) {
        const rejected = await httpServer.request({
          method: "GET",
          path: "/video/diag",
          remoteAddress: REMOTE,
          headers: row.headers
        });
        assert.equal(rejected.status, 403, row.name);
        assert.equal(rejected.body.error, "local_admin_only");
      }
      assert.equal(obsCalls.length, before);

      const local = await httpServer.request({
        method: "GET",
        path: "/video/diag",
        remoteAddress: "127.0.0.1"
      });
      assert.equal(local.status, 200);
      assert.equal(local.body.sampleInputSettings.inputSettings.local_file, "AUDIT_LOCAL_MEDIA_PATH");
      assert.ok(obsCalls.includes("GetInputSettings"));

      const beforeSecret = obsCalls.length;
      const bySecret = await httpServer.request({
        method: "GET",
        path: "/video/diag",
        remoteAddress: REMOTE,
        headers: { "x-mia-ingest-secret": ADMIN }
      });
      assert.equal(bySecret.status, 200);
      assert.ok(obsCalls.length > beforeSecret);
    });

    await test("authorized status and active reads do not consume a matching reply", async () => {
      chatFeed.length = 0;
      const started = ask();
      assert.equal(started.ok, true);
      assert.equal(started.pendingAsk && started.pendingAsk.status, "waiting_words");
      chatFeed.push({ userLabel: USER, text: "fialova kometa" });
      const writes = blockedJobDirs.length;
      const pendingId = giftAnim.getStatus().pendingAsk.id;

      for (const row of denied) {
        const status = await httpServer.request({
          method: "GET",
          path: "/api/gift-animation/status",
          remoteAddress: REMOTE,
          headers: row.headers
        });
        const active = await httpServer.request({
          method: "GET",
          path: "/api/gift-animation/active",
          remoteAddress: REMOTE,
          headers: row.headers
        });
        assert.equal(status.status, 403, row.name);
        assert.equal(active.status, 403, row.name);
      }

      const status = await httpServer.request({
        method: "GET",
        path: "/api/gift-animation/status",
        remoteAddress: "127.0.0.1"
      });
      const active = await httpServer.request({
        method: "GET",
        path: "/api/gift-animation/active",
        remoteAddress: REMOTE,
        headers: { "x-mia-ingest-secret": ADMIN }
      });
      assert.equal(status.status, 200);
      assert.equal(active.status, 200);
      assert.equal(status.body.pendingAsk.id, pendingId);
      assert.equal(active.body.pendingAsk.id, pendingId);
      assert.equal(blockedJobDirs.length, writes);
      assert.equal(giftAnim.getStatus().pendingAsk.id, pendingId);
    });

    await test("preview stays public and does not consume pendingAsk", async () => {
      const pendingId = giftAnim.getStatus().pendingAsk.id;
      const preview = await httpServer.request({
        method: "POST",
        path: "/api/gift-animation/preview",
        remoteAddress: REMOTE,
        body: { giftKey: "ROSE", username: USER }
      });
      assert.equal(preview.status, 200);
      assert.equal(preview.body.ok, true);
      assert.equal(giftAnim.getStatus().pendingAsk.id, pendingId);
    });

    await test("ingest chat consumes one matching reply and starts one generation", async () => {
      const writes = blockedJobDirs.length;
      lastCapture = null;
      ingest.pushChatFeed({
        message: "fialova kometa",
        platform: "tiktok"
      });
      await assert.rejects(lastCapture, (err) => err && err.code === "AUDIT");
      assert.equal(blockedJobDirs.length, writes + 1);
      assert.equal(giftAnim.getStatus().pendingAsk, null);
      assert.equal(blockedJobDirs.every((dir) => fs.existsSync(dir)), false);

      lastCapture = "untouched";
      ingest.pushChatFeed({
        message: "fialova kometa",
        platform: "tiktok"
      });
      assert.equal(lastCapture, null);
      assert.equal(blockedJobDirs.length, writes + 1);
      assert.equal(giftAnim.getStatus().pendingAsk, null);
    });

    await test("a reply already in the feed is captured once when the ask starts", async () => {
      chatFeed.length = 0;
      chatFeed.push({ userLabel: USER, text: "modra jiskra" });
      const writes = blockedJobDirs.length;
      const started = ask();
      await new Promise((resolve) => setImmediate(resolve));
      assert.equal(started.pendingAsk, null);
      assert.equal(blockedJobDirs.length, writes + 1);
      const second = await originalCapture(USER, "modra jiskra");
      assert.equal(second, null);
      assert.equal(blockedJobDirs.length, writes + 1);
    });

    await test("remote generate and ask-words stay behind the admin guard", async () => {
      const writes = blockedJobDirs.length;
      const generate = await httpServer.request({
        method: "POST",
        path: "/api/gift-animation/generate",
        remoteAddress: REMOTE,
        body: { giftKey: "ROSE", username: USER }
      });
      const askWords = await httpServer.request({
        method: "POST",
        path: "/api/gift-animation/ask-words",
        remoteAddress: REMOTE,
        body: { giftKey: "ROSE", username: USER }
      });
      assert.equal(generate.status, 403);
      assert.equal(askWords.status, 403);
      assert.equal(giftAnim.getStatus().pendingAsk, null);
      assert.equal(blockedJobDirs.length, writes);
    });

    await test("generate and ask-words fail closed when the guard is missing", async () => {
      chatFeed.length = 0;
      const started = ask();
      const pendingId = started.pendingAsk && started.pendingAsk.id;
      assert.ok(pendingId);
      const writes = blockedJobDirs.length;
      const jobs = jobNames();
      const closedApps = [];
      try {
        for (const ctx of [{}, { localAdminGuard: null }, { localAdminGuard: "nope" }]) {
          const closedApp = express();
          closedApp.use(express.json());
          registerGiftAnimationRoutes(closedApp, ctx);
          closedApps.push(await listen(closedApp));
        }
        for (const closed of closedApps) {
          for (const remoteAddress of [REMOTE, "127.0.0.1"]) {
            const generate = await closed.request({
              method: "POST",
              path: "/api/gift-animation/generate",
              remoteAddress,
              body: { giftKey: "ROSE", username: USER, encodeVideo: false }
            });
            const askWords = await closed.request({
              method: "POST",
              path: "/api/gift-animation/ask-words",
              remoteAddress,
              body: { giftKey: "ROSE", username: USER, wordsTimeoutMs: 5000 }
            });
            assert.equal(generate.status, 503);
            assert.deepEqual(generate.body, {
              ok: false,
              error: "LOCAL_ADMIN_GUARD_UNAVAILABLE"
            });
            assert.equal(askWords.status, 503);
            assert.deepEqual(askWords.body, {
              ok: false,
              error: "LOCAL_ADMIN_GUARD_UNAVAILABLE"
            });
          }
        }
      } finally {
        await Promise.all(
          closedApps.map(
            (closed) => new Promise((resolve) => closed.server.close(resolve))
          )
        );
      }
      assert.equal(giftAnim.getStatus().pendingAsk.id, pendingId);
      assert.equal(blockedJobDirs.length, writes);
      assert.deepEqual(jobNames(), jobs);

      const status = await httpServer.request({
        method: "GET",
        path: "/api/gift-animation/status",
        remoteAddress: "127.0.0.1"
      });
      const active = await httpServer.request({
        method: "GET",
        path: "/api/gift-animation/active",
        remoteAddress: "127.0.0.1"
      });
      assert.equal(status.status, 200);
      assert.equal(active.status, 200);
      assert.equal(status.body.pendingAsk.id, pendingId);
      assert.equal(active.body.pendingAsk.id, pendingId);
      assert.equal(blockedJobDirs.length, writes);
      assert.deepEqual(jobNames(), jobs);
    });

    await test("a real admin guard allows loopback and rejects remote writes", async () => {
      chatFeed.length = 0;
      const pendingBefore = giftAnim.getStatus().pendingAsk;
      const writes = blockedJobDirs.length;
      const jobs = jobNames();
      const remoteGenerate = await httpServer.request({
        method: "POST",
        path: "/api/gift-animation/generate",
        remoteAddress: REMOTE,
        body: { giftKey: "ROSE", username: USER, encodeVideo: false }
      });
      const remoteAsk = await httpServer.request({
        method: "POST",
        path: "/api/gift-animation/ask-words",
        remoteAddress: REMOTE,
        body: { giftKey: "ROSE", username: USER, wordsTimeoutMs: 5000 }
      });
      assert.equal(remoteGenerate.status, 403);
      assert.equal(remoteAsk.status, 403);
      assert.equal(giftAnim.getStatus().pendingAsk && giftAnim.getStatus().pendingAsk.id, pendingBefore.id);
      assert.equal(blockedJobDirs.length, writes);

      const localAsk = await httpServer.request({
        method: "POST",
        path: "/api/gift-animation/ask-words",
        remoteAddress: "127.0.0.1",
        body: { giftKey: "ROSE", username: USER, wordsTimeoutMs: 5000, profileImageUrl: "" }
      });
      assert.equal(localAsk.status, 200);
      assert.equal(localAsk.body.ok, true);
      assert.equal(localAsk.body.pendingAsk.status, "waiting_words");
      assert.notEqual(localAsk.body.pendingAsk.id, pendingBefore.id);
      assert.equal(blockedJobDirs.length, writes);
      assert.deepEqual(jobNames(), jobs);

      const originalGenerate = giftAnim.generateNow;
      let generateCalls = 0;
      giftAnim.generateNow = async () => {
        generateCalls += 1;
        return { ok: true, stub: true };
      };
      try {
        const localGenerate = await httpServer.request({
          method: "POST",
          path: "/api/gift-animation/generate",
          remoteAddress: "127.0.0.1",
          body: { giftKey: "ROSE", username: USER, encodeVideo: false }
        });
        const deniedGenerate = await httpServer.request({
          method: "POST",
          path: "/api/gift-animation/generate",
          remoteAddress: REMOTE,
          body: { giftKey: "ROSE", username: USER, encodeVideo: false }
        });
        assert.equal(localGenerate.status, 200);
        assert.equal(localGenerate.body.stub, true);
        assert.equal(generateCalls, 1);
        assert.equal(deniedGenerate.status, 403);
        assert.equal(generateCalls, 1);
      } finally {
        giftAnim.generateNow = originalGenerate;
      }
      assert.equal(blockedJobDirs.length, writes);
      assert.deepEqual(jobNames(), jobs);
      assert.equal(giftAnim.getStatus().pendingAsk.id, localAsk.body.pendingAsk.id);
    });

    await test("overlay state and gift job reads stay unguarded", () => {
      const overlay = fs.readFileSync(path.join(__dirname, "..", "routes", "overlay.js"), "utf8");
      const giftRoutes = fs.readFileSync(path.join(__dirname, "..", "routes", "gift_animation.js"), "utf8");
      const html = fs.readFileSync(
        path.join(__dirname, "..", "mia-output-overlay", "gift-animation-overlay.html"),
        "utf8"
      );
      assert.match(overlay, /app\.get\("\/overlay-state", \(req, res\) =>/);
      assert.match(giftRoutes, /app\.get\("\/api\/gift-animation\/jobs\/:jobId", \(req, res\) =>/);
      assert.match(html, /\/overlay-state/);
      assert.match(html, /\/api\/gift-animation\/jobs\//);
      assert.equal(jobNames().join("\n"), jobsBefore.join("\n"));
    });
  } finally {
    giftAnim.tryCaptureWordsFromChat = originalCapture;
    await new Promise((resolve) => httpServer.server.close(resolve));
  }

  console.log("route_audit_http_contract: all passed");
  process.exit(process.exitCode || 0);
}

main().catch((err) => {
  console.error(err && err.stack ? err.stack : err);
  process.exit(1);
});
