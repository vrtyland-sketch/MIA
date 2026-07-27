"use strict";

/**
 * E4 demo plugin — no-op handlers only. No poker, no OBS, no coin writes.
 */

let subscribed = false;

function registerHandlers(bus, _gameState) {
  if (!bus || typeof bus.on !== "function") {
    throw new Error("hello plugin requires event bus with on()");
  }
  bus.on("GIFT", () => {
    /* no-op demo */
  });
  bus.on("COMMENT", () => {
    /* no-op demo */
  });
  subscribed = true;
}

function unregisterHandlers() {
  subscribed = false;
}

function getStatus() {
  return { subscribed };
}

module.exports = {
  registerHandlers,
  unregisterHandlers,
  getStatus
};
