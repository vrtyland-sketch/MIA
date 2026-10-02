"use strict";

const assert = require("assert/strict");
const http = require("http");
const express = require("express");
const { registerArenaRoutes } = require("../routes/arena");
const { registerKojRoutes } = require("../routes/koj");
const { registerTtsRoutes } = require("../routes/tts");
const {
  createLocalAdminGuard,
  createDuelPeerGuard
} = require("../scripts/MIA_RUNTIME_SECURITY");
const bridge = require("../scripts/MIA_KOJNOZROUT_DUEL_BRIDGE");

const ADMIN_A = "local-admin-a";
const ADMIN_B = "local-admin-b";
const PEER = "peer-credential";
const WRONG_PEER = "wrong-peer-credential";
const REMOTE = "203.0.113.9";

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

function requestCarries(row, secret) {
  const headerValues = Object.values(row.headers || {});
  if (headerValues.some((value) => String(value).includes(secret))) return true;
  if (String(row.url || "").includes(secret)) return true;
  if (JSON.stringify(row.body || {}).includes(secret)) return true;
  return false;
}

function createInstance(adminSecret) {
  const options = {
    resolveIngestSecret: () => adminSecret,
    resolvePeerSecret: () => PEER
  };
  const counters = { exports: 0, syncs: 0, points: 0, mode: 0, speech: 0 };
  let duel = { active: true, tag: adminSecret.slice(-1) };
  const seen = [];
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    seen.push({
      method: req.method,
      url: req.originalUrl || req.url,
      headers: { ...req.headers },
      body: req.body
    });
    next();
  });
  registerArenaRoutes(app, {
    localAdminGuard: createLocalAdminGuard(options),
    duelPeerGuard: createDuelPeerGuard(options),
    runtimeConfig: {},
    kojnozoutDuelModule: {
      exportLocalSide() {
        counters.exports += 1;
        return { duelActive: true, streamId: adminSecret.slice(-1) };
      },
      syncOpponentFromPeer(state) {
        counters.syncs += 1;
        return { synced: true, state: { ...state, synced: true } };
      },
      reportOpponentPoints(state, points) {
        counters.points += 1;
        return { ...state, points };
      },
      getDuelSnapshot(state) {
        return state;
      }
    },
    getDuelState: () => duel,
    setDuelState: (next) => {
      duel = next;
    },
    scheduleWorldSave() {}
  });
  registerKojRoutes(app, {
    localAdminGuard: createLocalAdminGuard(options),
    kojTestModeModule: {
      setKojTestModeOverride() {
        counters.mode += 1;
      },
      getKojTestModeSnapshot() {
        return { enabled: true };
      }
    },
    kojnozoutModule: {},
    getKojnozoutState: () => ({}),
    runtimeConfig: {}
  });
  registerTtsRoutes(app, {
    localAdminGuard: createLocalAdminGuard(options),
    ttsEngine: {},
    languageModule: {
      normalizeLanguageCode: () => "cs",
      resolveDefaultLanguage: () => "cs",
      getLanguageName: () => "cs"
    },
    runtimeConfig: {},
    maybeDeliverMiaVoice: async () => {
      counters.speech += 1;
      return {
        voiceAdmission: { accepted: true, started: true },
        voicePlayback: {}
      };
    }
  });
  return { app, counters, seen };
}

async function listen(instance) {
  const server = http.createServer(instance.app);
  let forceRemote = false;
  server.on("connection", (socket) => {
    if (!forceRemote) return;
    Object.defineProperty(socket, "remoteAddress", {
      configurable: true,
      value: REMOTE
    });
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  return {
    server,
    port: server.address().port,
    setRemote(enabled) {
      forceRemote = Boolean(enabled);
    },
    request(options) {
      forceRemote = Boolean(options.remote);
      return rawRequest(instance.serverPort || server.address().port, options).finally(() => {
        forceRemote = false;
      });
    }
  };
}

function withBridgeEnv(ingest, peer, fn) {
  const prevIngest = process.env.MIA_INGEST_SECRET;
  const prevPeer = process.env.MIA_DUEL_PEER_SECRET;
  if (ingest === undefined) delete process.env.MIA_INGEST_SECRET;
  else process.env.MIA_INGEST_SECRET = ingest;
  if (peer === undefined) delete process.env.MIA_DUEL_PEER_SECRET;
  else process.env.MIA_DUEL_PEER_SECRET = peer;
  return Promise.resolve()
    .then(fn)
    .finally(() => {
      if (prevIngest === undefined) delete process.env.MIA_INGEST_SECRET;
      else process.env.MIA_INGEST_SECRET = prevIngest;
      if (prevPeer === undefined) delete process.env.MIA_DUEL_PEER_SECRET;
      else process.env.MIA_DUEL_PEER_SECRET = prevPeer;
    });
}

async function main() {
  const instanceA = createInstance(ADMIN_A);
  const instanceB = createInstance(ADMIN_B);
  const liveA = await listen(instanceA);
  const liveB = await listen(instanceB);
  instanceA.serverPort = liveA.port;
  instanceB.serverPort = liveB.port;

  async function callBridge(fromAdmin, peerSecret, targetPort) {
    return withBridgeEnv(fromAdmin, peerSecret, () =>
      bridge.syncDuelWithPeer({
        peerUrl: `http://127.0.0.1:${targetPort}`,
        duelState: { active: true },
        exportLocalSide: () => ({ duelActive: true, streamId: "local" }),
        syncOpponentFromPeer: (state) => ({ synced: true, state })
      })
    );
  }

  try {
    await test("two instances accept the shared peer credential on duel sync only", async () => {
      instanceB.counters.exports = 0;
      instanceB.counters.syncs = 0;
      instanceB.counters.points = 0;
      instanceB.counters.mode = 0;
      instanceB.counters.speech = 0;
      instanceB.seen.length = 0;
      liveB.setRemote(true);

      const exported = await rawRequest(liveB.port, {
        method: "GET",
        path: "/duel/export",
        headers: { "x-mia-duel-peer": PEER }
      });
      const synced = await rawRequest(liveB.port, {
        method: "POST",
        path: "/duel/opponent-sync",
        headers: { "x-mia-duel-peer": PEER },
        body: { export: { duelActive: true, streamId: "a" } }
      });
      const points = await rawRequest(liveB.port, {
        method: "POST",
        path: "/duel/opponent-points",
        headers: { "x-mia-duel-peer": PEER },
        body: { points: 4 }
      });
      const mode = await rawRequest(liveB.port, {
        method: "POST",
        path: "/koj/test-mode",
        headers: { "x-mia-duel-peer": PEER },
        body: { enabled: true }
      });
      const speech = await rawRequest(liveB.port, {
        method: "GET",
        path: "/tts/test",
        headers: { "x-mia-duel-peer": PEER }
      });

      assert.equal(exported.status, 200);
      assert.equal(synced.status, 200);
      assert.equal(points.status, 403);
      assert.equal(mode.status, 403);
      assert.equal(speech.status, 403);
      assert.equal(instanceB.counters.exports, 1);
      assert.equal(instanceB.counters.syncs, 1);
      assert.equal(instanceB.counters.points, 0);
      assert.equal(instanceB.counters.mode, 0);
      assert.equal(instanceB.counters.speech, 0);
    });

    await test("each instance keeps its own local admin secret", async () => {
      instanceB.counters.exports = 0;
      instanceB.counters.mode = 0;
      instanceA.counters.exports = 0;
      liveB.setRemote(true);
      liveA.setRemote(true);

      const foreign = await rawRequest(liveB.port, {
        method: "GET",
        path: "/duel/export",
        headers: { "x-mia-ingest-secret": ADMIN_A }
      });
      const own = await rawRequest(liveB.port, {
        method: "POST",
        path: "/koj/test-mode",
        headers: { "x-mia-ingest-secret": ADMIN_B },
        body: { enabled: true }
      });
      const ownExport = await rawRequest(liveA.port, {
        method: "GET",
        path: "/duel/export",
        headers: { "x-mia-ingest-secret": ADMIN_A }
      });

      assert.equal(foreign.status, 403);
      assert.equal(instanceB.counters.exports, 0);
      assert.equal(own.status, 200);
      assert.equal(instanceB.counters.mode, 1);
      assert.equal(ownExport.status, 200);
      assert.equal(instanceA.counters.exports, 1);
    });

    await test("missing and wrong peer credentials are rejected before duel state changes", async () => {
      instanceB.counters.exports = 0;
      instanceB.counters.syncs = 0;
      liveB.setRemote(true);

      const missing = await rawRequest(liveB.port, {
        method: "GET",
        path: "/duel/export"
      });
      const wrong = await rawRequest(liveB.port, {
        method: "POST",
        path: "/duel/opponent-sync",
        headers: { "x-mia-duel-peer": WRONG_PEER },
        body: { export: { duelActive: true } }
      });
      const query = await rawRequest(liveB.port, {
        method: "GET",
        path: `/duel/export?mia_secret=${encodeURIComponent(PEER)}`
      });

      assert.equal(missing.status, 403);
      assert.equal(missing.body.error, "duel_peer_unauthorized");
      assert.equal(wrong.status, 403);
      assert.equal(query.status, 403);
      assert.equal(instanceB.counters.exports, 0);
      assert.equal(instanceB.counters.syncs, 0);
    });

    await test("localhost still reaches duel sync without a credential", async () => {
      instanceA.counters.exports = 0;
      liveA.setRemote(false);
      const res = await rawRequest(liveA.port, {
        method: "GET",
        path: "/duel/export"
      });
      assert.equal(res.status, 200);
      assert.equal(instanceA.counters.exports, 1);
    });

    await test("bridge sends the peer credential and never the local admin secret", async () => {
      instanceB.seen.length = 0;
      instanceB.counters.exports = 0;
      instanceB.counters.syncs = 0;
      liveB.setRemote(true);
      const result = await callBridge(ADMIN_A, PEER, liveB.port);
      assert.equal(result.ok, true);
      assert.equal(instanceB.counters.exports, 1);
      assert.equal(instanceB.counters.syncs, 1);
      assert.ok(instanceB.seen.length >= 2);
      for (const row of instanceB.seen) {
        assert.equal(requestCarries(row, ADMIN_A), false);
        assert.equal(row.headers["x-mia-ingest-secret"], undefined);
        assert.equal(row.headers["x-mia-duel-peer"], PEER);
      }

      instanceA.seen.length = 0;
      instanceA.counters.exports = 0;
      instanceA.counters.syncs = 0;
      liveA.setRemote(true);
      const reverse = await callBridge(ADMIN_B, PEER, liveA.port);
      assert.equal(reverse.ok, true);
      for (const row of instanceA.seen) {
        assert.equal(requestCarries(row, ADMIN_B), false);
        assert.equal(row.headers["x-mia-ingest-secret"], undefined);
        assert.equal(row.headers["x-mia-duel-peer"], PEER);
      }
    });

    await test("bridge without a peer credential does not fall back to the local admin secret", async () => {
      instanceB.seen.length = 0;
      instanceB.counters.exports = 0;
      instanceB.counters.syncs = 0;
      liveB.setRemote(true);
      const missing = await callBridge(ADMIN_A, undefined, liveB.port);
      assert.equal(missing.ok, false);
      assert.equal(instanceB.counters.exports, 0);
      assert.equal(instanceB.counters.syncs, 0);
      assert.ok(instanceB.seen.length >= 1);
      for (const row of instanceB.seen) {
        assert.equal(requestCarries(row, ADMIN_A), false);
        assert.equal(row.headers["x-mia-ingest-secret"], undefined);
        assert.equal(row.headers["x-mia-duel-peer"], undefined);
      }

      instanceB.seen.length = 0;
      const wrong = await callBridge(ADMIN_A, WRONG_PEER, liveB.port);
      assert.equal(wrong.ok, false);
      assert.equal(instanceB.counters.exports, 0);
      for (const row of instanceB.seen) {
        assert.equal(requestCarries(row, ADMIN_A), false);
        assert.equal(row.headers["x-mia-duel-peer"], WRONG_PEER);
      }
    });
  } finally {
    await new Promise((resolve) => liveA.server.close(resolve));
    await new Promise((resolve) => liveB.server.close(resolve));
  }

  if (process.exitCode) process.exit(process.exitCode);
  console.log("duel_peer_credential_contract: all passed");
}

main().catch((err) => {
  console.error(err && err.stack ? err.stack : err);
  process.exit(1);
});
