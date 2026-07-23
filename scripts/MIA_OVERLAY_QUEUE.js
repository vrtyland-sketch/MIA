"use strict";

/**
 * MIA_OVERLAY_QUEUE (priority)
 *
 * - ukládá overlaye podle priority
 * - vyšší priorita jde ven dřív
 */

function createOverlayQueue(deps = {}) {
  const nowTs = deps.nowTs || (() => Date.now());
  const appendJsonLog = deps.appendJsonLog || (() => {});

  const queue = [];

  function enqueue(item) {
    if (!item || typeof item !== "object") return;

    const priority = resolvePriority(item.overlayPayload);

    queue.push({
      ...item,
      priority,
      enqueuedAt: nowTs()
    });

    sortQueue();

    appendJsonLog("mia-events", {
      ts: nowTs(),
      stage: "overlay_queued",
      size: queue.length,
      priority
    });
  }

  function dequeue() {
    if (queue.length === 0) return null;
    return queue.shift();
  }

  function peek() {
    return queue[0] || null;
  }

  function size() {
    return queue.length;
  }

  function sortQueue() {
    queue.sort((a, b) => {
      if (b.priority !== a.priority) {
        return b.priority - a.priority;
      }
      return a.enqueuedAt - b.enqueuedAt;
    });
  }

  return {
    enqueue,
    dequeue,
    peek,
    size
  };
}

function resolvePriority(payload) {
  const tier = safeString(payload?.tier).toUpperCase();
  const stage = safeString(payload?.stage);

  if (tier === "T4") return 100;
  if (tier === "T3") return 80;
  if (tier === "T2") return 50;
  if (tier === "T1") return 20;

  if (stage === "voice") return 90;

  return 5; // chat / low
}

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

module.exports = {
  createOverlayQueue
};