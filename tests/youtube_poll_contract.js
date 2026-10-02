"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const axios = require("axios");
const {
  pollOnce,
  getYouTubePollSnapshot,
  resetYouTubePollState
} = require("../scripts/MIA_YOUTUBE_BRIDGE");

const CONFIG = { apiKey: "yt-test-key", liveChatId: "live-chat-1" };
const DEDUPE_TTL_MS = 120_000;

function test(name, fn) {
  return Promise.resolve()
    .then(() => fn())
    .then(() => console.log(`ok - ${name}`))
    .catch((err) => {
      console.error(`fail - ${name}`);
      throw err;
    });
}

function chatItem(id, type = "textMessageEvent", text = id) {
  return {
    id,
    snippet: { type, displayMessage: text },
    authorDetails: { channelId: `channel-${id}`, displayName: `Viewer ${id}` }
  };
}

function page(items, nextPageToken) {
  return { status: 200, data: { nextPageToken, items } };
}

function dedupeIds() {
  return getYouTubePollSnapshot().dedupe.map((row) => row.id);
}

function unique(ids) {
  return new Set(ids).size === ids.length;
}

async function run() {
  await test("five successful items are delivered once and the cursor advances", async () => {
    resetYouTubePollState({ pageToken: "tok-1" });
    const fetched = [];
    const delivered = [];
    const result = await pollOnce(CONFIG, {
      fetchPage: async ({ pageToken }) => {
        fetched.push(pageToken);
        return page(["m1", "m2", "m3", "m4", "m5"].map((id) => chatItem(id)), "tok-2");
      },
      onEvent: async (payload) => {
        delivered.push(payload.messageId);
      }
    });

    assert.equal(result.ok, true);
    assert.deepEqual(fetched, ["tok-1"]);
    assert.deepEqual(delivered, ["m1", "m2", "m3", "m4", "m5"]);
    assert.equal(unique(delivered), true);
    assert.equal(getYouTubePollSnapshot().pageToken, "tok-2");
    assert.deepEqual(dedupeIds(), ["m1", "m2", "m3", "m4", "m5"]);
  });

  await test("failure on item 3 keeps the page and retries only the unsent tail", async () => {
    resetYouTubePollState({ pageToken: "tok-1" });
    const fetched = [];
    const delivered = [];
    let failItem3 = true;
    const fetchPage = async ({ pageToken }) => {
      fetched.push(pageToken);
      return page(["m1", "m2", "m3", "m4", "m5"].map((id) => chatItem(id)), "tok-2");
    };
    const onEvent = async (payload) => {
      if (failItem3 && payload.messageId === "m3") {
        throw new Error("delivery failed");
      }
      delivered.push(payload.messageId);
    };

    const before = getYouTubePollSnapshot().pageToken;
    await assert.rejects(
      () => pollOnce(CONFIG, { fetchPage, onEvent }),
      /delivery failed/
    );
    const afterFail = getYouTubePollSnapshot();

    assert.equal(before, "tok-1");
    assert.equal(afterFail.pageToken, "tok-1");
    assert.deepEqual(fetched, ["tok-1"]);
    assert.deepEqual(delivered, ["m1", "m2"]);
    assert.deepEqual(dedupeIds(), ["m1", "m2"]);
    assert.equal(dedupeIds().includes("m3"), false);
    assert.equal(afterFail.inFlight, false);

    failItem3 = false;
    const retry = await pollOnce(CONFIG, { fetchPage, onEvent });
    const afterRetry = getYouTubePollSnapshot();

    assert.equal(retry.ok, true);
    assert.deepEqual(fetched, ["tok-1", "tok-1"]);
    assert.deepEqual(delivered, ["m1", "m2", "m3", "m4", "m5"]);
    assert.equal(unique(delivered), true);
    assert.equal(afterRetry.pageToken, "tok-2");
    assert.deepEqual(dedupeIds(), ["m1", "m2", "m3", "m4", "m5"]);

    fs.mkdirSync("/opt/cursor/artifacts", { recursive: true });
    fs.writeFileSync(
      "/opt/cursor/artifacts/youtube-poll-after.json",
      JSON.stringify(
        {
          beforePageToken: before,
          afterFailPageToken: afterFail.pageToken,
          afterFailDedupe: ["m1", "m2"],
          afterFailDelivered: ["m1", "m2"],
          retryFetchTokens: ["tok-1", "tok-1"],
          afterRetryPageToken: afterRetry.pageToken,
          afterRetryDelivered: delivered,
          afterRetryDedupe: dedupeIds()
        },
        null,
        2
      )
    );
  });

  await test("ingest HTTP rejection leaves the same page and dedupe as a thrown onEvent", async () => {
    resetYouTubePollState({ pageToken: "tok-1" });
    const posted = [];
    const originalPost = axios.post;
    axios.post = async (_url, payload) => {
      if (payload.messageId === "m3") {
        const err = new Error("Request failed with status code 500");
        err.response = { status: 500 };
        throw err;
      }
      posted.push(payload.messageId);
    };

    try {
      await assert.rejects(
        () =>
          pollOnce(CONFIG, {
            ingestUrl: "http://127.0.0.1:9/ingest",
            fetchPage: async () =>
              page(["m1", "m2", "m3", "m4", "m5"].map((id) => chatItem(id)), "tok-2")
          }),
        /status code 500/
      );
      assert.equal(getYouTubePollSnapshot().pageToken, "tok-1");
      assert.deepEqual(posted, ["m1", "m2"]);
      assert.deepEqual(dedupeIds(), ["m1", "m2"]);

      axios.post = async (_url, payload) => {
        posted.push(payload.messageId);
      };
      const retry = await pollOnce(CONFIG, {
        ingestUrl: "http://127.0.0.1:9/ingest",
        fetchPage: async ({ pageToken }) => {
          assert.equal(pageToken, "tok-1");
          return page(["m1", "m2", "m3", "m4", "m5"].map((id) => chatItem(id)), "tok-2");
        }
      });
      assert.equal(retry.ok, true);
      assert.deepEqual(posted, ["m1", "m2", "m3", "m4", "m5"]);
      assert.equal(getYouTubePollSnapshot().pageToken, "tok-2");
      assert.deepEqual(dedupeIds(), ["m1", "m2", "m3", "m4", "m5"]);
    } finally {
      axios.post = originalPost;
    }
  });

  await test("a filtered YouTube item does not block cursor advancement", async () => {
    resetYouTubePollState({ pageToken: "tok-1" });
    const delivered = [];
    const result = await pollOnce(CONFIG, {
      fetchPage: async () =>
        page(
          [
            chatItem("m1"),
            chatItem("paid-1", "superChatEvent", "thanks"),
            chatItem("m2"),
            chatItem("blank-1", "textMessageEvent", "")
          ],
          "tok-2"
        ),
      onEvent: async (payload) => {
        delivered.push(payload.messageId);
      }
    });

    assert.equal(result.ok, true);
    assert.deepEqual(delivered, ["m1", "m2"]);
    assert.deepEqual(dedupeIds(), ["m1", "m2"]);
    assert.equal(getYouTubePollSnapshot().pageToken, "tok-2");
  });

  await test("an overlapping poll does not deliver, and the next poll runs after the guard clears", async () => {
    resetYouTubePollState({ pageToken: "tok-1" });
    const fetched = [];
    const delivered = [];
    let releaseFetch;
    const fetchGate = new Promise((resolve) => {
      releaseFetch = resolve;
    });
    let overlapDuringDelivery = null;

    const fetchPage = async ({ pageToken }) => {
      fetched.push(pageToken);
      if (fetched.length === 1) await fetchGate;
      if (pageToken === "tok-1") return page([chatItem("a")], "tok-2");
      return page([chatItem("b")], "tok-3");
    };
    const onEvent = async (payload) => {
      delivered.push(payload.messageId);
      if (!overlapDuringDelivery) {
        overlapDuringDelivery = await pollOnce(CONFIG, {
          fetchPage,
          onEvent: async () => {
            throw new Error("overlapping poll delivered");
          }
        });
      }
    };

    const first = pollOnce(CONFIG, { fetchPage, onEvent });
    await new Promise((resolve) => setImmediate(resolve));
    assert.deepEqual(fetched, ["tok-1"]);
    const during = getYouTubePollSnapshot();
    assert.equal(during.pageToken, "tok-1");
    assert.deepEqual(during.dedupe, []);
    assert.equal(during.inFlight, true);

    const second = await pollOnce(CONFIG, {
      fetchPage,
      onEvent: async () => {
        throw new Error("overlapping poll delivered");
      }
    });
    assert.equal(second.skipped, true);
    assert.equal(second.reason, "in_flight");
    assert.deepEqual(fetched, ["tok-1"]);
    assert.equal(getYouTubePollSnapshot().pageToken, "tok-1");
    assert.deepEqual(dedupeIds(), []);

    releaseFetch();
    const finished = await first;
    assert.equal(finished.ok, true);
    assert.equal(overlapDuringDelivery.skipped, true);
    assert.equal(overlapDuringDelivery.reason, "in_flight");
    assert.deepEqual(delivered, ["a"]);
    assert.equal(getYouTubePollSnapshot().pageToken, "tok-2");
    assert.deepEqual(dedupeIds(), ["a"]);
    assert.equal(getYouTubePollSnapshot().inFlight, false);

    const later = await pollOnce(CONFIG, { fetchPage, onEvent });
    assert.equal(later.ok, true);
    assert.equal(later.skipped, false);
    assert.deepEqual(fetched, ["tok-1", "tok-2"]);
    assert.deepEqual(delivered, ["a", "b"]);
    assert.equal(getYouTubePollSnapshot().pageToken, "tok-3");
    assert.deepEqual(dedupeIds(), ["a", "b"]);
  });

  await test("successful delivery dedupe expires after 120 seconds", async () => {
    const realNow = Date.now;
    let now = 5_000_000;
    Date.now = () => now;
    try {
      resetYouTubePollState({ pageToken: "tok-1" });
      const delivered = [];
      const fetchPage = async ({ pageToken }) =>
        page([chatItem("m1")], pageToken === "tok-1" ? "tok-2" : "tok-3");
      const onEvent = async (payload) => {
        delivered.push(payload.messageId);
      };

      await pollOnce(CONFIG, { fetchPage, onEvent });
      const ttl = getYouTubePollSnapshot().dedupe[0].ttlRemainingMs;
      assert.equal(ttl, DEDUPE_TTL_MS);

      await pollOnce(CONFIG, { fetchPage, onEvent });
      assert.deepEqual(delivered, ["m1"]);

      now += DEDUPE_TTL_MS;
      await pollOnce(CONFIG, { fetchPage, onEvent });
      assert.deepEqual(delivered, ["m1", "m1"]);
    } finally {
      Date.now = realNow;
    }
  });

  console.log("youtube_poll_contract: all passed");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
