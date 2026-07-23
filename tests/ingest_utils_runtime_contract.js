"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const { createIngestUtilsRuntime } = require("../scripts/MIA_INGEST_UTILS_RUNTIME");

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
  await test("extractSupportPayload unwraps support object", () => {
    const payload = createIngestUtilsRuntime({}).extractSupportPayload({
      support: { miaPoints: 5, giftName: "Rose" },
      user: { nickname: "Donor" }
    });
    assert.equal(payload.miaPoints, 5);
    assert.equal(payload.user.nickname, "Donor");
  });

  await test("pushChatFeed appends chat item", () => {
    const state = { chatFeed: [] };
    createIngestUtilsRuntime({
      safeString: (v, d) => String(v ?? d ?? ""),
      getUserLabel: () => "Viewer",
      getAvatarUrl: () => "http://avatar",
      overlayStateModule: {
        pushChatFeedItem: (overlayState, item) => {
          overlayState.chatFeed.push(item);
        }
      },
      getOverlayState: () => state,
      runtimeConfig: { overlay: { maxChatFeedItems: 6 } }
    }).pushChatFeed({ message: "ahoj", platform: "tiktok" });

    assert.equal(state.chatFeed.length, 1);
    assert.equal(state.chatFeed[0].text, "ahoj");
  });

  await test("index.js wires ingestUtilsRuntime with thin wrappers", () => {
    const indexSrc = fs.readFileSync(path.join(ROOT, "index.js"), "utf8");
    assert.match(indexSrc, /initIngestUtilsRuntime/);
    assert.match(indexSrc, /MIA_INGEST_UTILS_RUNTIME/);
    assert.match(indexSrc, /MIA_INGEST_UTILS_CTX/);
    assert.doesNotMatch(indexSrc, /overlayState\.chatFeed = \[item\]/);
  });

  console.log("ingest_utils_runtime_contract: all passed");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
