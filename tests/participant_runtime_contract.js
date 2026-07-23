"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const { createParticipantRuntime } = require("../scripts/MIA_PARTICIPANT_RUNTIME");

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
  await test("createParticipantRuntime exposes pushRecentParticipant", () => {
    const api = createParticipantRuntime({
      safeString: (v, d) => String(v ?? d ?? ""),
      getUserLabel: () => "Alice",
      getAvatarUrl: () => "https://example.com/a.png",
      overlayStateModule: {},
      getOverlayState: () => ({}),
      runtimeConfig: {}
    });
    assert.equal(typeof api.pushRecentParticipant, "function");
  });

  await test("pushRecentParticipant delegates to overlayStateModule", () => {
    const overlayState = {};
    let pushed = null;

    createParticipantRuntime({
      safeString: (v, d) => String(v ?? d ?? ""),
      getUserLabel: () => "Alice",
      getAvatarUrl: () => "https://example.com/a.png",
      overlayStateModule: {
        pushRecentParticipant(state, item, max, opts) {
          pushed = { state, item, max, opts };
        }
      },
      getOverlayState: () => overlayState,
      runtimeConfig: {
        overlay: { maxRecentParticipants: 5, recentParticipantsMaxAgeMs: 60000 }
      }
    }).pushRecentParticipant(
      {
        platform: "tiktok",
        user: { nickname: "Alice", userId: "u1" },
        support: { giftName: "Rose", giftCount: 2, tier: "t1" }
      },
      "gift"
    );

    assert.equal(pushed.state, overlayState);
    assert.equal(pushed.item.userLabel, "Alice");
    assert.equal(pushed.item.type, "gift");
    assert.equal(pushed.item.giftName, "Rose");
    assert.equal(pushed.max, 5);
    assert.equal(pushed.opts.maxAgeMs, 60000);
  });

  await test("index.js wires participantRuntime without inline pushRecentParticipant body", () => {
    const indexSrc = fs.readFileSync(path.join(ROOT, "index.js"), "utf8");
    assert.match(indexSrc, /initParticipantRuntime/);
    assert.match(indexSrc, /MIA_PARTICIPANT_RUNTIME/);
    assert.match(indexSrc, /MIA_PARTICIPANT_CTX/);
    assert.match(indexSrc, /function pushRecentParticipant/);
    assert.doesNotMatch(indexSrc, /overlayState\.recentParticipants = \[item\]/);
  });

  console.log("participant_runtime_contract: all passed");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
