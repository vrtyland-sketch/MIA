"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const axios = require("axios");
const { createHealthRuntime } = require("../scripts/MIA_HEALTH_RUNTIME");
const youtubeBridgeModule = require("../scripts/MIA_YOUTUBE_BRIDGE");
const {
  pollOnce,
  getYouTubePollSnapshot,
  resetYouTubePollState,
  startYouTubeBridge,
  stopYouTubeBridge
} = youtubeBridgeModule;

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

  function assertNoSecrets(value, secrets) {
    const text = JSON.stringify(value);
    for (const secret of secrets) {
      assert.equal(text.includes(secret), false, "snapshot leaked a secret");
    }
    assert.equal(text.includes("apiKey"), false);
    assert.equal(text.includes("ingestSecret"), false);
    assert.equal(text.toLowerCase().includes("authorization"), false);
  }

  await test("startup status records disabled, missing credentials, and missing live chat", async () => {
    resetYouTubePollState();
    const disabled = await startYouTubeBridge({
      config: { enabled: false, apiKey: "yt-test-key", liveChatId: "live-chat-1" }
    });
    assert.equal(disabled.reason, "disabled");
    let snap = getYouTubePollSnapshot();
    assert.equal(snap.enabled, false);
    assert.equal(snap.started, false);
    assert.equal(snap.ready, false);
    assert.equal(snap.status, "disabled");

    const missingKey = await startYouTubeBridge({
      config: { enabled: true, videoId: "vid-1" }
    });
    assert.equal(missingKey.reason, "missing_api_key");
    snap = getYouTubePollSnapshot();
    assert.equal(snap.enabled, true);
    assert.equal(snap.started, false);
    assert.equal(snap.ready, false);
    assert.equal(snap.status, "missing_api_key");

    const missingChat = await startYouTubeBridge({
      config: { enabled: true, apiKey: "yt-test-key" }
    });
    assert.equal(missingChat.reason, "missing_live_chat_id");
    snap = getYouTubePollSnapshot();
    assert.equal(snap.started, false);
    assert.equal(snap.ready, false);
    assert.equal(snap.status, "missing_live_chat_id");
    assert.equal(snap.liveChatId, "");
  });

  await test("live chat resolution failure is an explicit status and does not open a poll", async () => {
    resetYouTubePollState();
    const originalGet = axios.get;
    axios.get = async () => {
      throw new Error("resolve boom");
    };
    try {
      const result = await startYouTubeBridge({
        config: { enabled: true, apiKey: "yt-test-key", videoId: "vid-404" }
      });
      assert.equal(result.reason, "resolve_failed");
      const snap = getYouTubePollSnapshot();
      assert.equal(snap.started, false);
      assert.equal(snap.ready, false);
      assert.equal(snap.status, "resolve_failed");
      assert.equal(snap.lastError, "resolve boom");
      assert.ok(snap.lastErrorAt > 0);
      assert.equal(snap.pollMs, 0);
    } finally {
      axios.get = originalGet;
      resetYouTubePollState();
    }
  });

  await test("a successful poll stamps success and a delivered comment without moving a failed cursor", async () => {
    resetYouTubePollState({ pageToken: "tok-1" });
    const before = Date.now();
    const ok = await pollOnce(CONFIG, {
      fetchPage: async () => page([chatItem("m9", "textMessageEvent", "hello from youtube")], "tok-2"),
      onEvent: async () => {}
    });
    assert.equal(ok.ok, true);
    const snap = getYouTubePollSnapshot();
    assert.ok(snap.lastPollAt >= before);
    assert.ok(snap.lastSuccessAt >= snap.lastPollAt);
    assert.equal(snap.lastError, "");
    assert.equal(snap.lastErrorAt, 0);
    assert.equal(snap.lastHttpStatus, 200);
    assert.equal(snap.pageToken, "tok-2");
    assert.equal(snap.deliveredCount, 1);
    assert.ok(snap.lastDeliveredAt >= before);
    assert.equal(snap.lastMessageId, "m9");
    assert.equal(snap.lastMessageUser, "Viewer m9");
    assert.equal(snap.lastMessagePreview, "hello from youtube");

    resetYouTubePollState({ pageToken: "tok-1" });
    await assert.rejects(
      () =>
        pollOnce(CONFIG, {
          fetchPage: async () =>
            page(["m1", "m2", "m3"].map((id) => chatItem(id)), "tok-2"),
          onEvent: async (payload) => {
            if (payload.messageId === "m3") throw new Error("delivery failed");
          }
        }),
      /delivery failed/
    );
    const failed = getYouTubePollSnapshot();
    assert.equal(failed.deliveredCount, 2);
    assert.equal(failed.lastMessageId, "m2");
    assert.equal(failed.pageToken, "tok-1");
    assert.equal(dedupeIds().includes("m3"), false);
    assert.equal(failed.lastError, "delivery failed");
    assert.equal(failed.lastSuccessAt, 0);
  });

  await test("YouTube HTTP and network errors keep the page token", async () => {
    resetYouTubePollState({ pageToken: "tok-1" });
    const http = await pollOnce(CONFIG, {
      fetchPage: async () => ({ status: 403, data: { error: { message: "quotaExceeded" } } })
    });
    assert.equal(http.reason, "http_error");
    const httpSnap = getYouTubePollSnapshot();
    assert.equal(httpSnap.lastHttpStatus, 403);
    assert.equal(httpSnap.lastError, "quotaExceeded");
    assert.ok(httpSnap.lastErrorAt > 0);
    assert.equal(httpSnap.lastSuccessAt, 0);
    assert.equal(httpSnap.pageToken, "tok-1");
    assert.equal(httpSnap.deliveredCount, 0);

    resetYouTubePollState({ pageToken: "tok-9" });
    await assert.rejects(
      () =>
        pollOnce(CONFIG, {
          fetchPage: async () => {
            throw new Error("socket hang up");
          }
        }),
      /socket hang up/
    );
    const netSnap = getYouTubePollSnapshot();
    assert.equal(netSnap.pageToken, "tok-9");
    assert.equal(netSnap.lastError, "socket hang up");
    assert.ok(netSnap.lastErrorAt > 0);
    assert.equal(netSnap.lastSuccessAt, 0);
    assert.equal(netSnap.inFlight, false);
    assert.equal(netSnap.deliveredCount, 0);
  });

  await test("an overlapping poll does not stamp a fake success", async () => {
    const realNow = Date.now;
    let now = 8_000_000;
    Date.now = () => now;
    let releaseFetch;
    const fetchGate = new Promise((resolve) => {
      releaseFetch = resolve;
    });
    try {
      resetYouTubePollState({ pageToken: "tok-1" });
      const first = pollOnce(CONFIG, {
        fetchPage: async () => {
          await fetchGate;
          return page([chatItem("a")], "tok-2");
        },
        onEvent: async () => {}
      });
      await new Promise((resolve) => setImmediate(resolve));
      assert.equal(getYouTubePollSnapshot().lastPollAt, 8_000_000);
      assert.equal(getYouTubePollSnapshot().lastSuccessAt, 0);
      now = 8_005_000;
      const skipped = await pollOnce(CONFIG, {
        fetchPage: async () => {
          throw new Error("overlapping poll fetched");
        },
        onEvent: async () => {}
      });
      assert.equal(skipped.reason, "in_flight");
      assert.equal(getYouTubePollSnapshot().lastPollAt, 8_000_000);
      assert.equal(getYouTubePollSnapshot().lastSuccessAt, 0);
      now = 8_006_000;
      releaseFetch();
      const finished = await first;
      assert.equal(finished.ok, true);
      assert.equal(getYouTubePollSnapshot().lastSuccessAt, 8_006_000);
      assert.equal(getYouTubePollSnapshot().pageToken, "tok-2");
    } finally {
      Date.now = realNow;
      resetYouTubePollState();
    }
  });

  await test("paid and gift-like YouTube events stay out of delivery telemetry", async () => {
    resetYouTubePollState({ pageToken: "tok-1" });
    const delivered = [];
    const result = await pollOnce(CONFIG, {
      fetchPage: async () =>
        page(
          [
            chatItem("paid", "superChatEvent", "thanks"),
            chatItem("stick", "superStickerEvent", "sticker"),
            chatItem("member", "membershipGiftingEvent", "member"),
            chatItem("gift", "giftMembershipReceived", "gift"),
            chatItem("ok", "textMessageEvent", "plain chat")
          ],
          "tok-2"
        ),
      onEvent: async (payload) => {
        delivered.push(payload.messageId);
      }
    });
    assert.equal(result.ok, true);
    assert.deepEqual(delivered, ["ok"]);
    assert.deepEqual(dedupeIds(), ["ok"]);
    assert.equal(getYouTubePollSnapshot().deliveredCount, 1);
    assert.equal(getYouTubePollSnapshot().lastMessageId, "ok");
    assert.equal(getYouTubePollSnapshot().pageToken, "tok-2");
  });

  await test("start, stop, and restart expose one ready loop and no secrets", async () => {
    const realSet = global.setInterval;
    const realClear = global.clearInterval;
    const live = new Set();
    global.setInterval = (fn, ms, ...rest) => {
      const id = realSet(fn, ms, ...rest);
      live.add(id);
      return id;
    };
    global.clearInterval = (id) => {
      live.delete(id);
      return realClear(id);
    };
    const secrets = ["yt-test-key", "ingest-secret-value"];
    try {
      resetYouTubePollState();
      const config = {
        enabled: true,
        apiKey: "yt-test-key",
        ingestSecret: "ingest-secret-value",
        liveChatId: "live-chat-1",
        videoId: "vid-1",
        pollMs: 60000
      };
      const fetchPage = async () => page([chatItem("c1", "textMessageEvent", "ahoj")], "tok-2");
      const started = await startYouTubeBridge({
        config,
        fetchPage,
        onEvent: async () => {}
      });
      assert.equal(started.ok, true);
      for (let i = 0; i < 6; i += 1) {
        if (getYouTubePollSnapshot().deliveredCount === 1) break;
        await new Promise((resolve) => setImmediate(resolve));
      }
      const running = getYouTubePollSnapshot();
      assert.equal(running.status, "running");
      assert.equal(running.started, true);
      assert.equal(running.ready, true);
      assert.equal(running.enabled, true);
      assert.equal(running.liveChatId, "live-chat-1");
      assert.equal(running.videoId, "vid-1");
      assert.equal(running.pollMs, 60000);
      assert.equal(running.deliveredCount, 1);
      assert.equal(live.size, 1);
      assertNoSecrets(running, secrets);

      stopYouTubeBridge();
      const stopped = getYouTubePollSnapshot();
      assert.equal(stopped.started, false);
      assert.equal(stopped.ready, false);
      assert.equal(stopped.status, "stopped");
      assert.equal(live.size, 0);

      const restarted = await startYouTubeBridge({
        config,
        fetchPage,
        onEvent: async () => {}
      });
      assert.equal(restarted.ok, true);
      const again = getYouTubePollSnapshot();
      assert.equal(again.status, "running");
      assert.equal(again.ready, true);
      assert.equal(again.started, true);
      assert.equal(again.liveChatId, "live-chat-1");
      assert.equal(live.size, 1);
      assertNoSecrets(again, secrets);

      const runtime = createHealthRuntime({
        youtubeBridgeModule,
        getPort: () => 3000,
        nowIso: () => "2026-10-02T00:00:00.000Z",
        getKojnozoutState: () => ({}),
        getStreamState: () => ({}),
        runtimeConfig: { youtube: { apiKey: "yt-test-key", ingestSecret: "ingest-secret-value" } }
      });
      const health = runtime.buildHealthPayload();
      const diagnose = await runtime.buildDiagnosePayload();
      assert.equal(health.youtubeBridge.ready, true);
      assert.equal(health.youtubeBridge.status, "running");
      assert.equal(health.ingestRouting.youtube.mode, "live_chat_poll");
      assert.equal(health.ingestRouting.youtube.route, "YouTube bridge → /ingest");
      assert.equal(health.ingestRouting.youtube.enabled, true);
      assert.equal(health.ingestRouting.youtube.ready, true);
      assert.equal(health.youtubeBridge.dedupe, undefined);
      assert.equal(diagnose.youtubeBridge.liveChatId, "live-chat-1");
      assert.equal(diagnose.youtubeBridge.pollMs, 60000);
      assert.equal(diagnose.youtubeBridge.dedupe, undefined);
      assertNoSecrets(health, secrets);
      assertNoSecrets(diagnose, secrets);

      fs.mkdirSync("/opt/cursor/artifacts", { recursive: true });
      fs.writeFileSync(
        "/opt/cursor/artifacts/youtube-observability.json",
        JSON.stringify({ health, diagnose, running: again }, null, 2)
      );
    } finally {
      global.setInterval = realSet;
      global.clearInterval = realClear;
      stopYouTubeBridge();
      resetYouTubePollState();
    }
  });

  console.log("youtube_poll_contract: all passed");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
