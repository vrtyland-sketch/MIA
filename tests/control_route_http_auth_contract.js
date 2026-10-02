"use strict";

const assert = require("assert/strict");
const http = require("http");
const express = require("express");
const { registerKojRoutes } = require("../routes/koj");
const { registerTtsRoutes } = require("../routes/tts");
const { createLocalAdminGuard } = require("../scripts/MIA_RUNTIME_SECURITY");

const ADMIN = "local-admin-http";
const WRONG = "wrong-admin-http";
const PEER = "peer-credential-http";

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

function rawRequest(port, { method, path, headers, body }) {
  return new Promise((resolve, reject) => {
    const payload = body == null ? null : Buffer.from(JSON.stringify(body));
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port,
        method,
        path,
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
          const json = await readBody(res);
          resolve({ status: res.statusCode, body: json });
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

async function main() {
  let modeCalls = 0;
  let speechCalls = 0;
  const guard = createLocalAdminGuard({
    resolveIngestSecret: () => ADMIN
  });
  const app = express();
  app.use(express.json());
  app.get("/whoami", (req, res) => {
    res.json({ address: req.socket && req.socket.remoteAddress });
  });
  const koj = registerKojRoutes(app, {
    localAdminGuard: guard,
    kojTestModeModule: {
      setKojTestModeOverride() {
        modeCalls += 1;
      },
      getKojTestModeSnapshot() {
        return { enabled: true };
      }
    },
    kojnozoutModule: {},
    getKojnozoutState: () => ({}),
    runtimeConfig: {}
  });
  const tts = registerTtsRoutes(app, {
    localAdminGuard: guard,
    ttsEngine: {},
    languageModule: {
      normalizeLanguageCode: () => "cs",
      resolveDefaultLanguage: () => "cs",
      getLanguageName: () => "cs"
    },
    runtimeConfig: {},
    maybeDeliverMiaVoice: async () => {
      speechCalls += 1;
      return {
        voiceAdmission: { accepted: true, started: true },
        voicePlayback: {}
      };
    }
  });
  assert.equal(koj.ok, true);
  assert.equal(tts.ok, true);

  const server = http.createServer(app);
  let nextRemote = null;
  server.on("connection", (socket) => {
    if (!nextRemote) return;
    Object.defineProperty(socket, "remoteAddress", {
      configurable: true,
      value: nextRemote
    });
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;

  async function request(options) {
    nextRemote = options.remoteAddress || null;
    try {
      return await rawRequest(port, options);
    } finally {
      nextRemote = null;
    }
  }

  try {
    await test("HTTP parser exposes the TCP peer used by the guard", async () => {
      const remote = await request({
        method: "GET",
        path: "/whoami",
        remoteAddress: "203.0.113.8"
      });
      assert.equal(remote.status, 200);
      assert.equal(remote.body.address, "203.0.113.8");
      const local = await request({ method: "GET", path: "/whoami" });
      assert.equal(local.status, 200);
      assert.equal(local.body.address, "127.0.0.1");
    });

    await test("remote POST /koj/test-mode without a secret does not change test mode", async () => {
      modeCalls = 0;
      const res = await request({
        method: "POST",
        path: "/koj/test-mode",
        remoteAddress: "203.0.113.8",
        body: { enabled: true }
      });
      assert.equal(res.status, 403);
      assert.equal(res.body.error, "local_admin_only");
      assert.equal(modeCalls, 0);
    });

    await test("remote POST /koj/test-mode with the wrong secret does not change test mode", async () => {
      modeCalls = 0;
      const res = await request({
        method: "POST",
        path: "/koj/test-mode",
        remoteAddress: "198.51.100.10",
        headers: { "x-mia-ingest-secret": WRONG },
        body: { enabled: true }
      });
      assert.equal(res.status, 403);
      assert.equal(res.body.error, "local_admin_only");
      assert.equal(modeCalls, 0);
    });

    await test("duel peer header does not authorize POST /koj/test-mode", async () => {
      modeCalls = 0;
      const res = await request({
        method: "POST",
        path: "/koj/test-mode",
        remoteAddress: "203.0.113.8",
        headers: { "x-mia-duel-peer": PEER },
        body: { enabled: true }
      });
      assert.equal(res.status, 403);
      assert.equal(modeCalls, 0);
    });

    await test("remote POST /koj/test-mode with the local admin secret changes test mode", async () => {
      modeCalls = 0;
      const res = await request({
        method: "POST",
        path: "/koj/test-mode",
        remoteAddress: "203.0.113.8",
        headers: { "x-mia-ingest-secret": ADMIN },
        body: { enabled: true }
      });
      assert.equal(res.status, 200);
      assert.equal(res.body.ok, true);
      assert.equal(modeCalls, 1);
    });

    await test("localhost POST /koj/test-mode without a secret changes test mode", async () => {
      modeCalls = 0;
      const res = await request({
        method: "POST",
        path: "/koj/test-mode",
        body: { enabled: false }
      });
      assert.equal(res.status, 200);
      assert.equal(res.body.ok, true);
      assert.equal(modeCalls, 1);
    });

    await test("remote GET /tts/test without a secret does not speak", async () => {
      speechCalls = 0;
      const res = await request({
        method: "GET",
        path: "/tts/test",
        remoteAddress: "203.0.113.8"
      });
      assert.equal(res.status, 403);
      assert.equal(res.body.error, "local_admin_only");
      assert.equal(speechCalls, 0);
    });

    await test("remote GET /tts/test with the wrong secret does not speak", async () => {
      speechCalls = 0;
      const res = await request({
        method: "GET",
        path: "/tts/test",
        remoteAddress: "198.51.100.10",
        headers: { "x-mia-ingest-secret": WRONG }
      });
      assert.equal(res.status, 403);
      assert.equal(speechCalls, 0);
    });

    await test("duel peer header does not authorize GET /tts/test", async () => {
      speechCalls = 0;
      const res = await request({
        method: "GET",
        path: "/tts/test",
        remoteAddress: "203.0.113.8",
        headers: { "x-mia-duel-peer": PEER }
      });
      assert.equal(res.status, 403);
      assert.equal(speechCalls, 0);
    });

    await test("remote GET /tts/test with the local admin secret speaks", async () => {
      speechCalls = 0;
      const res = await request({
        method: "GET",
        path: "/tts/test",
        remoteAddress: "203.0.113.8",
        headers: { "x-mia-ingest-secret": ADMIN }
      });
      assert.equal(res.status, 200);
      assert.equal(res.body.ok, true);
      assert.equal(speechCalls, 1);
    });

    await test("localhost GET /tts/test without a secret speaks", async () => {
      speechCalls = 0;
      const res = await request({
        method: "GET",
        path: "/tts/test"
      });
      assert.equal(res.status, 200);
      assert.equal(res.body.ok, true);
      assert.equal(speechCalls, 1);
    });
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }

  if (process.exitCode) process.exit(process.exitCode);
  console.log("control_route_http_auth_contract: all passed");
}

main().catch((err) => {
  console.error(err && err.stack ? err.stack : err);
  process.exit(1);
});
