"use strict";

const { resolveIngestLane } = require("./MIA_INGEST_LANE");

/**
 * Tří-lane fronta ingestu:
 * - support: serializovaná (dárky)
 * - community: omezený paralelismus (chat, like, follow)
 * - audience: přímé zpracování (viewer count)
 */

function createIngestQueue(options = {}) {
  const maxCommunityParallel = Math.max(
    1,
    Number(options.maxCommunityParallel || process.env.MIA_INGEST_COMMUNITY_PARALLEL || 2)
  );
  const writeLog =
    typeof options.writeLog === "function" ? options.writeLog : () => {};
  const safeString =
    typeof options.safeString === "function" ? options.safeString : String;

  let supportChain = Promise.resolve();
  let communityActive = 0;
  const communityWaiters = [];

  function releaseCommunitySlot() {
    communityActive = Math.max(0, communityActive - 1);
    const next = communityWaiters.shift();
    if (next) next();
  }

  function acquireCommunitySlot() {
    if (communityActive < maxCommunityParallel) {
      communityActive += 1;
      return Promise.resolve();
    }
    return new Promise((resolve) => communityWaiters.push(resolve)).then(() => {
      communityActive += 1;
    });
  }

  function chainSupport(work) {
    const run = supportChain.then(() => work());
    supportChain = run.catch((err) => {
      writeLog("mia-errors", {
        source: "ingest_queue_support",
        error: err?.message || String(err)
      });
    });
    return run;
  }

  async function runCommunity(work) {
    await acquireCommunitySlot();
    try {
      return await work();
    } finally {
      releaseCommunitySlot();
    }
  }

  function enqueue(lane, work) {
    if (lane === "support") {
      return chainSupport(work);
    }
    if (lane === "community") {
      return runCommunity(work);
    }
    return work();
  }

  function enqueuePayload(payload, work) {
    const lane = resolveIngestLane(payload, safeString);
    return enqueue(lane, work);
  }

  function getSnapshot() {
    return {
      maxCommunityParallel,
      communityActive,
      communityWaiting: communityWaiters.length,
      supportPending: supportChain !== Promise.resolve()
    };
  }

  return {
    enqueue,
    enqueuePayload,
    resolveIngestLane: (payload) => resolveIngestLane(payload, safeString),
    getSnapshot
  };
}

module.exports = { createIngestQueue };
