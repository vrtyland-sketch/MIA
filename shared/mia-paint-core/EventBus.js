"use strict";

function createEventBus() {
  const handlers = new Map();

  function on(type, fn) {
    if (typeof fn !== "function") return () => {};
    if (!handlers.has(type)) handlers.set(type, new Set());
    handlers.get(type).add(fn);
    return () => off(type, fn);
  }

  function off(type, fn) {
    const set = handlers.get(type);
    if (set) set.delete(fn);
  }

  function emit(type, payload) {
    const set = handlers.get(type);
    if (!set) return;
    for (const fn of [...set]) {
      try {
        fn(payload);
      } catch (err) {
        emit("error", { type, error: err });
      }
    }
  }

  function once(type, fn) {
    const unsub = on(type, (payload) => {
      unsub();
      fn(payload);
    });
    return unsub;
  }

  return { on, off, emit, once };
}

module.exports = { createEventBus };
