"use strict";

const assert = require("assert/strict");
const {
  createDuelState,
  startDuel,
  exportLocalSide,
  syncOpponentFromPeer,
  ingestDuelContribution
} = require("../scripts/MIA_KOJNOZROUT_DUEL");
const {
  normalizePeerUrl,
  pushLocalExportToPeer
} = require("../scripts/MIA_KOJNOZROUT_DUEL_BRIDGE");
const http = require("http");

function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
  } catch (err) {
    console.error(`❌ ${name}`);
    console.error(err && err.stack ? err.stack : err);
    process.exitCode = 1;
  }
}

async function testAsync(name, fn) {
  try {
    await fn();
    console.log(`✅ ${name}`);
  } catch (err) {
    console.error(`❌ ${name}`);
    console.error(err && err.stack ? err.stack : err);
    process.exitCode = 1;
  }
}

test("exportLocalSide exposes local scoreboard for peer sync", () => {
  let duel = startDuel(createDuelState(), { localStreamId: "spinak", localLabel: "Spinák" });
  const result = ingestDuelContribution(duel, {
    eventType: "GIFT",
    userLabel: "A",
    miaPoints: 40,
    side: "local"
  });
  duel = result.state;
  const exported = exportLocalSide(duel);
  assert.equal(exported.streamId, "spinak");
  assert.ok(exported.miaPoints >= 40);
  assert.equal(exported.duelActive, true);
});

test("syncOpponentFromPeer replaces opponent absolute score", () => {
  let duel = startDuel(createDuelState(), { opponentLabel: "Soupeř B" });
  const sync = syncOpponentFromPeer(duel, {
    label: "Soupeř B",
    streamId: "stream-b",
    miaPoints: 88,
    giftPoints: 70,
    chatPoints: 10,
    likePoints: 8,
    itemBonusPoints: 0
  });
  duel = sync.state;
  assert.equal(sync.synced, true);
  assert.equal(duel.opponentSide.miaPoints, 88);
});

test("normalizePeerUrl strips trailing slash", () => {
  assert.equal(normalizePeerUrl("http://127.0.0.1:3000/"), "http://127.0.0.1:3000");
});

(async () => {
  await testAsync("pushLocalExportToPeer hits opponent-sync endpoint", async () => {
    let received = null;
    const server = http.createServer((req, res) => {
      if (req.method === "POST" && req.url === "/duel/opponent-sync") {
        let body = "";
        req.on("data", (chunk) => {
          body += chunk;
        });
        req.on("end", () => {
          received = JSON.parse(body);
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: true, synced: true }));
        });
        return;
      }
      res.writeHead(404);
      res.end();
    });

    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;

    try {
      await pushLocalExportToPeer(`http://127.0.0.1:${port}`, {
        streamId: "spinak",
        miaPoints: 55,
        duelActive: true
      });
      assert.equal(received.export.miaPoints, 55);
    } finally {
      server.close();
    }
  });

  if (process.exitCode) process.exit(process.exitCode);
  console.log("\n---- DUEL CROSS-STREAM SYNC CONTRACT ----\npassed");
})().catch((err) => {
  console.error(err && err.stack ? err.stack : err);
  process.exit(1);
});
