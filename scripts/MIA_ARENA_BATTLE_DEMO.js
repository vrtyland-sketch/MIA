"use strict";

/**
 * Viditelný OBS test — automaticky rotuje battle akce mezi 4 platformními Koji.
 */

const PLATFORMS = ["tiktok", "kick", "twitch", "youtube"];

/** Sekvence pohybů pro demo (box · coin · heal · buff · attack2). */
const DEMO_SCRIPT = [
  {
    platform: "tiktok",
    eventType: "GIFT",
    miaPoints: 120,
    item: { id: "utok", label: "Coin bite", role: "duel", power: 12 }
  },
  {
    platform: "kick",
    eventType: "GIFT",
    miaPoints: 140,
    item: { id: "box", label: "BOX", role: "duel", power: 16 }
  },
  {
    platform: "twitch",
    eventType: "GIFT",
    miaPoints: 90,
    item: { id: "lektvar", label: "Lektvar", role: "heal", power: 10 }
  },
  {
    platform: "youtube",
    eventType: "GIFT",
    miaPoints: 110,
    item: { id: "hvezda", label: "Hvězda", role: "comfort", power: 8 }
  },
  {
    platform: "kick",
    eventType: "GIFT",
    miaPoints: 160,
    item: { id: "koruna", label: "Koruna", role: "duel", power: 18 }
  },
  {
    platform: "tiktok",
    eventType: "GIFT",
    miaPoints: 80,
    item: { id: "snack", label: "Snack", role: "food", power: 6 }
  },
  {
    platform: "twitch",
    eventType: "GIFT",
    miaPoints: 130,
    item: { id: "shield", label: "Shield", role: "heal", power: 12 }
  },
  {
    platform: "youtube",
    eventType: "GIFT",
    miaPoints: 100,
    item: null
  }
];

function createArenaBattleDemo(platformArenaModule) {
  let timer = null;
  let step = 0;
  let startedAt = 0;
  let intervalMs = 3500;
  let hooks = null;

  function status() {
    return {
      active: Boolean(timer),
      step,
      scriptLength: DEMO_SCRIPT.length,
      intervalMs,
      startedAt: startedAt || null,
      elapsedMs: startedAt ? Date.now() - startedAt : 0,
      nextMove: DEMO_SCRIPT[step % DEMO_SCRIPT.length] || null,
      overlays: {
        teamBar: "/arena-overlay.html",
        battle: "/arena-battle-overlay.html",
        battleTest: "/arena-battle-test-overlay.html",
        formsGallery: "/koj-forms-gallery.html"
      }
    };
  }

  function stop() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
    return status();
  }

  function pushStep() {
    if (!hooks?.getState || !hooks?.setState || !platformArenaModule) return;
    const script = DEMO_SCRIPT[step % DEMO_SCRIPT.length];
    step += 1;
    let state = hooks.getState();
    if (
      !state?.duel?.active &&
      !state?.tournament?.active &&
      typeof platformArenaModule.startArenaDuel === "function"
    ) {
      state = platformArenaModule.startArenaDuel(state, {
        durationMs: 600000,
        skipPhases: true
      });
      if (state.duel) {
        state.duel.energy = state.duel.energy || {};
        for (const id of PLATFORMS) {
          state.duel.energy[id] = Math.max(40, Number(state.duel.energy[id]) || 0);
        }
      }
    }
    if (typeof platformArenaModule.pushPlatformBattleAction !== "function") return;
    // Demo: keep energy topped and bypass interval so script can play.
    if (state?.duel) {
      state.duel.lastActionAt = 0;
      state.duel.energy = state.duel.energy || {};
      for (const id of PLATFORMS) {
        state.duel.energy[id] = Math.max(40, Number(state.duel.energy[id]) || 0);
      }
    }
    const push = platformArenaModule.pushPlatformBattleAction(state, {
      ...script,
      userLabel: "Battle Demo"
    });
    if (push?.state) {
      hooks.setState(push.state);
      hooks.saveState?.(push.state);
    }
  }

  function start(options = {}, runtimeHooks = {}) {
    stop();
    hooks = runtimeHooks;
    intervalMs = Math.max(1800, Number(options.intervalMs) || 3500);
    step = 0;
    startedAt = Date.now();

    let state = hooks.getState?.();
    if (state && typeof platformArenaModule.startArenaDuel === "function") {
      state = platformArenaModule.startArenaDuel(state, {
        durationMs: Math.max(60000, Number(options.durationSec || 600) * 1000),
        skipPhases: true
      });
      for (let i = 0; i < PLATFORMS.length; i += 1) {
        const ingest = platformArenaModule.ingestArenaActivity(state, {
          platform: PLATFORMS[i],
          eventType: "GIFT",
          userLabel: "Demo Seed",
          miaPoints: 40 + i * 35
        });
        if (ingest?.state) state = ingest.state;
      }
      if (state.duel) {
        state.duel.energy = state.duel.energy || {};
        for (const id of PLATFORMS) {
          state.duel.energy[id] = Math.max(50, Number(state.duel.energy[id]) || 0);
        }
      }
      hooks.setState?.(state);
      hooks.saveState?.(state);
    }

    pushStep();
    timer = setInterval(pushStep, intervalMs);
    return status();
  }

  return { start, stop, status, DEMO_SCRIPT, PLATFORMS };
}

module.exports = { createArenaBattleDemo, DEMO_SCRIPT, PLATFORMS };
