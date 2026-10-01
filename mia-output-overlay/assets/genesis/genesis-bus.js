/**
 * Genesis bus — BroadcastChannel + localStorage.
 * Operator ↔ public Genesis overlays. Zero Stream Core coupling.
 */
(function (root) {
  "use strict";

  const CHANNEL = "mia-genesis-v1";
  const STORAGE_KEY = "mia.genesis.modules.v1";
  const bus = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(CHANNEL) : null;
  const listeners = [];

  const DEFAULT_MODULES = {
    GENESIS: { state: "LIVE", label: "Genesis" },
    Voice: { state: "LOCKED", label: "Voice" },
    Chat: { state: "LOCKED", label: "Chat" },
    "Gift Engine": { state: "LOCKED", label: "Gifts" },
    Bowl: { state: "OFF", label: "Bowl" },
    Video: { state: "LOCKED", label: "Video" },
    Overlay: { state: "LIVE", label: "Overlay" }
  };

  function readStore() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { modules: { ...DEFAULT_MODULES }, updatedAt: 0 };
      return JSON.parse(raw);
    } catch (_) {
      return { modules: { ...DEFAULT_MODULES }, updatedAt: 0 };
    }
  }

  function writeStore(payload) {
    const next = {
      modules: payload.modules || readStore().modules,
      updatedAt: Date.now(),
      lastEvent: payload.lastEvent || null
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (_) {}
    return next;
  }

  function emit(msg) {
    const envelope = Object.assign({ ts: Date.now(), source: "genesis-bus" }, msg);
    if (bus) bus.postMessage(envelope);
    try {
      localStorage.setItem(STORAGE_KEY + ".ping", String(Date.now()));
    } catch (_) {}
    listeners.forEach((fn) => {
      try {
        fn(envelope);
      } catch (_) {}
    });
    return envelope;
  }

  function onMessage(fn) {
    listeners.push(fn);
    if (bus) {
      bus.addEventListener("message", (ev) => fn(ev.data || {}));
    }
    window.addEventListener("storage", (ev) => {
      if (ev.key === STORAGE_KEY || ev.key === STORAGE_KEY + ".ping") {
        fn({ type: "sync", store: readStore() });
      }
    });
  }

  /** Operator: mark module as under test on MIA_STREAM_TEST */
  function setModuleState(moduleId, state, meta) {
    const store = readStore();
    if (!store.modules[moduleId]) {
      store.modules[moduleId] = { state: "LOCKED", label: moduleId };
    }
    store.modules[moduleId].state = state;
    const event = writeStore({
      modules: store.modules,
      lastEvent: { type: "state", moduleId, state, meta: meta || null }
    });
    emit({ type: "module_state", moduleId, state, modules: store.modules, meta: meta || null });
    return event;
  }

  /** Operator: enable on public Genesis after PASS on test scene */
  function unlockPublic(moduleId) {
    setModuleState(moduleId, "LIVE", { unlocked: true });
    return emit({
      type: "module_unlock",
      moduleId,
      announce: true,
      modules: readStore().modules
    });
  }

  function getModules() {
    return readStore().modules;
  }

  root.MIA_GENESIS_BUS = {
    CHANNEL,
    STORAGE_KEY,
    DEFAULT_MODULES,
    readStore,
    setModuleState,
    unlockPublic,
    getModules,
    onMessage,
    emit
  };
})(typeof globalThis !== "undefined" ? globalThis : window);
