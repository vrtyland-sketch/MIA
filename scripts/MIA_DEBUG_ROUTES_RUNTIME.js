"use strict";

/**
 * Debug HTTP routes — synthetic comment/gift events for local testing.
 */

function createDebugRoutesRuntime(deps = {}) {
  const { processEvent } = deps;

  function readRequestSource(req = {}) {
    return req.method === "GET" ? req.query || {} : req.body || {};
  }

  async function handleDebugComment(req, res) {
    const source = readRequestSource(req);

    const result = await processEvent({
      eventType: "comment",
      type: "comment",
      platform: source.platform || "debug",
      message: source.message || source.text || "ahoj MIA",
      content: source.message || source.text || "ahoj MIA",
      nickname: source.userLabel || source.nickname || "Debug uživatel",
      displayName: source.userLabel || source.nickname || "Debug uživatel",
      username: source.username || "debug"
    });

    res.status(result.status || 200).json(result.body || result);
  }

  async function handleDebugGift(req, res) {
    const source = readRequestSource(req);

    const result = await processEvent({
      eventType: "gift",
      type: "gift",
      platform: source.platform || "debug",
      giftName: source.giftName || "Rose",
      coins: Number(source.coins || source.coinValue || 1),
      coinValue: Number(source.coins || source.coinValue || 1),
      count: Number(source.count || source.repeatCount || 1),
      nickname: source.userLabel || source.nickname || "Debug podporovatel",
      displayName: source.userLabel || source.nickname || "Debug podporovatel",
      username: source.username || "debug"
    });

    res.status(result.status || 200).json(result.body || result);
  }

  return { handleDebugComment, handleDebugGift };
}

module.exports = { createDebugRoutesRuntime };
