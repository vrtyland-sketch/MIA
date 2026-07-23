"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const hostTeamUi = require("../scripts/MIA_HOST_TEAM_UI");
const { buildGiftMapStatusResponse, registerStatusRoutes } = require("../routes/status");

test("buildHostTeamBarModel hidden in normal live mode", () => {
  const model = hostTeamUi.buildHostTeamBarModel(
    { hostMode: "live", awayActive: false },
    { localPoints: 120, hostPoints: 0, splitPct: 0 }
  );
  assert.equal(model.visible, false);
});

test("buildHostTeamBarModel visible in nejsem_tu host mode", () => {
  const model = hostTeamUi.buildHostTeamBarModel(
    { hostMode: "nejsem_tu", awayActive: true, label: "NEJSEM TU" },
    { localPoints: 600, hostPoints: 400, splitPct: 40 }
  );
  assert.equal(model.visible, true);
  assert.equal(model.localPoints, 600);
  assert.equal(model.hostPoints, 400);
  assert.equal(model.localPct + model.hostPct, 100);
});

test("buildGiftMapStatusResponse returns catalog keys", () => {
  const payload = buildGiftMapStatusResponse({
    giftMapEnterprise: {
      getPublicSnapshot: () => ({ queueLength: 0 }),
      listCatalogKeys: () => ["ROSE", "LION"]
    },
    spamSessionEngine: { getSpamSessionState: () => ({ active: false }) },
    streamSessionModule: {
      getSnapshot: (s) => ({ phase: s?.phase || "PRELIVE", ok: true })
    },
    getStreamSession: () => ({ phase: "PRELIVE" }),
    getLastGiftMapping: () => null,
    getOutputState: () => ({ userAckThrottle: { byUser: {} } })
  });

  assert.equal(payload.ok, true);
  assert.deepEqual(payload.catalogKeys, ["ROSE", "LION"]);
  assert.equal(payload.streamSession.phase, "PRELIVE");
});

test("registerStatusRoutes wires status endpoints", () => {
  const routes = { get: [] };
  const app = {
    get(path) {
      routes.get.push(path);
    }
  };
  const result = registerStatusRoutes(app, {
    buildMiaStatusResponse: () => ({ ok: true, service: "MIA" })
  });
  assert.equal(result.ok, true);
  assert.ok(routes.get.includes("/status"));
  assert.ok(routes.get.includes("/gift-map/status"));
});
