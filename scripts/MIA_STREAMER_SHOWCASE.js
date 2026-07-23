"use strict";

/**
 * Streamer chat showcase — „MIA, pusť testy“ / „mia spust demo“.
 * Spouští viditelné ukázky funkcí s contract testy; logiku-only funkce jen ohlásí.
 * Dlouhá videa hrají jen krátký úryvek (snippet).
 */

const { resolveStreamerAccess } = require("./MIA_STREAMER_ACCESS");

const DEFAULT_SNIPPET_MS = Math.max(
  5000,
  Number(process.env.MIA_SHOWCASE_SNIPPET_MS || 8000)
);
const STEP_GAP_MS = Math.max(800, Number(process.env.MIA_SHOWCASE_STEP_GAP_MS || 1400));

const MIA_ALIASES = ["mia", "mio", "miu", "mii", "myo"];
const SHOWCASE_HINTS = ["testy", "testu", "testovani", "demo", "ukaz", "ukazka", "showcase", "funkce"];
const PLAY_HINTS = ["pust", "pus", "pusti", "spust", "start", "run", "odemkni"];
const KOJ_WORDS = ["kojnozrout", "kojnozout", "koj", "kojnozrouta", "kojik"];
const KOJ_STATE_HINTS = ["stavy", "stav", "slide", "states", "nalady", "naladu", "vsechny", "test", "testy"];

let forcedKoj = null;
let activeRun = null;
let lastReport = null;

const SHOWCASE_CATALOG = [
  {
    id: "koj_wake",
    label: "Probud Koj — test mód",
    visible: true,
    contractTests: ["kojnozout_test_mode_contract.js"],
    kind: "koj_wake",
    speech: "Budu vzhůru — test mód zapnutý.",
    pauseAfterMs: STEP_GAP_MS
  },
  {
    id: "koj_happy",
    label: "Koj — veselá nálada (happy)",
    visible: true,
    contractTests: ["kojnozout_display_mood_contract.js"],
    kind: "koj_mood",
    mood: "happy",
    holdMs: 3200,
    speech: "Tady je veselý Koj — PNG happy.",
    pauseAfterMs: STEP_GAP_MS
  },
  {
    id: "koj_dance",
    label: "Koj — tanec (dance)",
    visible: true,
    contractTests: ["kojnozout_display_mood_contract.js"],
    kind: "koj_mood",
    mood: "dance",
    holdMs: 3600,
    speech: "Tanec — Koj by měl jít ze strany na stranu.",
    pauseAfterMs: STEP_GAP_MS
  },
  {
    id: "gift_video_snippet",
    label: "Gift video reakce — krátký úryvek",
    visible: true,
    contractTests: ["kojnozout_display_mood_contract.js", "video_timing_contract.js"],
    kind: "video_snippet",
    tier: "T3",
    playbackMs: DEFAULT_SNIPPET_MS,
    speech: `Pouštím jen ${Math.round(DEFAULT_SNIPPET_MS / 1000)}s ukázku videa — Koj by měl tančit.`,
    pauseAfterMs: STEP_GAP_MS + 500
  },
  {
    id: "combo_moment",
    label: "Combo overlay moment",
    visible: true,
    contractTests: ["combo_overlay_contract.js"],
    kind: "combo",
    speech: "Combo moment na overlay.",
    pauseAfterMs: STEP_GAP_MS
  },
  {
    id: "koj_sleepy",
    label: "Koj — přechod do spánku",
    visible: true,
    contractTests: ["kojnozout_display_mood_contract.js"],
    kind: "koj_mood",
    mood: "sleepy",
    holdMs: 4200,
    speech: "Spím — pomalý přechod, žádné blikání.",
    pauseAfterMs: STEP_GAP_MS
  },
  {
    id: "duel_start",
    label: "Duel start",
    visible: true,
    contractTests: ["kojnozout_vitals_duel_contract.js"],
    kind: "duel",
    speech: "Duel start — Koj duel-ready póza.",
    pauseAfterMs: STEP_GAP_MS
  },
  {
    id: "t0_flyby",
    label: "T0 flyby overlay",
    visible: true,
    contractTests: ["combo_overlay_contract.js"],
    kind: "t0_flyby",
    speech: "T0 flyby — pozdrav divákům na overlay.",
    pauseAfterMs: STEP_GAP_MS
  },
  {
    id: "text_bank_registry",
    label: "Text bank registry (logika)",
    visible: false,
    contractTests: ["text_bank_coverage_contract.js"],
    kind: "announce",
    speech: "Text bank registry běží v testech — v OBS není vidět, ale hlídá klíče v kódu.",
    pauseAfterMs: 900
  },
  {
    id: "duel_peer_sync",
    label: "Duel peer sync (síť)",
    visible: false,
    contractTests: ["sprint_h_contract.js"],
    kind: "announce",
    requiresEnv: ["MIA_DUEL_PEER_URL"],
    speech: "Duel peer sync je jen logika — potřebuje MIA_DUEL_PEER_URL a druhý stream.",
    pauseAfterMs: 900
  },
  {
    id: "shadow_pipeline",
    label: "Shadow pipeline parity",
    visible: false,
    contractTests: ["shadow_pipeline_integration.js"],
    kind: "announce",
    speech: "Shadow pipeline běží na pozadí — není OBS vizuál, ale má contract test.",
    pauseAfterMs: 900
  }
];

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeCommandText(message = "") {
  return safeString(message)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[!?.,]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hasWord(text = "", words = []) {
  const padded = ` ${text} `;
  return words.some((word) => padded.includes(` ${word} `) || text.startsWith(`${word} `));
}

function mentionsMia(text = "") {
  return MIA_ALIASES.some((alias) => hasWord(text, [alias]));
}

function parseStreamerShowcaseCommand(message = "") {
  const text = normalizeCommandText(message);
  if (!text || !mentionsMia(text)) return null;

  const wantsShowcase =
    SHOWCASE_HINTS.some((hint) => text.includes(hint)) &&
    PLAY_HINTS.some((hint) => hasWord(text, [hint]) || text.includes(hint));

  if (!wantsShowcase) return null;

  const item = SHOWCASE_CATALOG.find((row) => {
    const token = row.id.replace(/_/g, " ");
    return text.includes(token) || text.includes(row.id);
  });

  return {
    mode: item ? "single" : "full",
    itemId: item?.id || null,
    raw: text
  };
}

function isShowcaseCommandText(message = "") {
  return parseStreamerShowcaseCommand(message) !== null;
}

function buildShowcaseOverlay(text, userLabel = "Streamer", extra = {}) {
  return {
    owner: "mia",
    route: "community",
    stage: "community",
    title: "MIA · ukázka",
    text: safeString(text),
    subtext: userLabel,
    priority: 4,
    ...extra
  };
}

function buildStartOverlay(count, userLabel) {
  return buildShowcaseOverlay(
    `Spouštím ukázku ${count} funkcí — sleduj Koje a overlay. Logiku bez vizuálu jen ohlásím.`,
    userLabel
  );
}

function buildStepOverlay(item, userLabel, extra = {}) {
  const vis = item.visible ? "viditelné" : "jen logika";
  const tests =
    Array.isArray(item.contractTests) && item.contractTests.length
      ? ` · test: ${item.contractTests[0]}`
      : "";
  return buildShowcaseOverlay(
  `${item.label} (${vis})${tests}. ${safeString(item.speech)}`,
    userLabel,
    extra
  );
}

function buildBusyOverlay(userLabel) {
  return buildShowcaseOverlay("Ukázka už běží — počkej na konec.", userLabel);
}

function buildRejectOverlay(reason, userLabel) {
  const messages = {
    streamer_only: "Ukázky může spustit jen streamer.",
    showcase_busy: "Ukázka už běží.",
    unknown_item: "Neznámá položka ukázky."
  };
  return buildShowcaseOverlay(messages[reason] || "Ukázku nelze spustit.", userLabel);
}

function setShowcaseKojForce(mood, holdMs = 3000) {
  const key = safeString(mood, "idle").toLowerCase();
  forcedKoj = {
    mood: key,
    spriteAsset: key,
    label: key,
    until: Date.now() + Math.max(1200, holdMs)
  };
  return { ...forcedKoj };
}

function clearShowcaseKojForce() {
  forcedKoj = null;
}

function getShowcaseKojForce(now = Date.now()) {
  if (!forcedKoj) return null;
  if (toNumber(forcedKoj.until, 0) <= now) {
    forcedKoj = null;
    return null;
  }
  return { ...forcedKoj };
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function getShowcaseSnapshot() {
  return {
    active: Boolean(activeRun),
    step: activeRun?.step || 0,
    total: activeRun?.total || 0,
    itemId: activeRun?.itemId || null,
    forcedKoj: getShowcaseKojForce(),
    lastReport,
    catalogSize: SHOWCASE_CATALOG.length
  };
}

function listCatalog() {
  return SHOWCASE_CATALOG.map((item) => ({
    id: item.id,
    label: item.label,
    visible: item.visible === true,
    contractTests: item.contractTests || [],
    kind: item.kind
  }));
}

function resolveCatalogItems(parsed = {}) {
  if (parsed.mode === "single" && parsed.itemId) {
    const item = SHOWCASE_CATALOG.find((row) => row.id === parsed.itemId);
    return item ? [item] : [];
  }
  return [...SHOWCASE_CATALOG];
}

async function runShowcaseStep(item, ctx = {}) {
  const {
    userLabel = "Streamer",
    executeOverlay,
    overlayStateModule,
    overlayState,
    videoEngine,
    normalized = {},
    runtimeConfig = {},
    kojTestModeModule,
    kojnozoutVitalsModule,
    getKojState,
    setKojState,
    kojnozoutDuelModule,
    getDuelState,
    setDuelState,
    scheduleWorldSave,
    env = process.env
  } = ctx;

  const announce = async (text) => {
    if (typeof executeOverlay !== "function") return;
    const payload = buildStepOverlay({ ...item, speech: text || item.speech }, userLabel);
    await executeOverlay(payload, { source: "streamer_showcase", priority: 4 });
  };

  if (item.visible === false) {
    let speech = item.speech;
    if (Array.isArray(item.requiresEnv) && item.requiresEnv.length) {
      const missing = item.requiresEnv.filter((key) => !safeString(env[key]));
      if (missing.length) {
        speech += ` Chybí: ${missing.join(", ")}.`;
      }
    }
    await announce(speech);
    return { ok: true, kind: "announce", visible: false };
  }

  switch (item.kind) {
    case "koj_wake": {
      if (typeof kojTestModeModule?.setKojTestModeOverride === "function") {
        kojTestModeModule.setKojTestModeOverride(true);
      }
      if (typeof getKojState === "function" && typeof setKojState === "function") {
        const state = getKojState();
        const next =
          typeof kojTestModeModule?.wakeKojState === "function"
            ? kojTestModeModule.wakeKojState(state, kojnozoutVitalsModule)
            : state;
        setKojState(next);
      }
      setShowcaseKojForce("happy", 2800);
      await announce(item.speech);
      return { ok: true, kind: "koj_wake" };
    }

    case "koj_mood": {
      setShowcaseKojForce(item.mood, item.holdMs || 3000);
      await announce(item.speech);
      await sleep(item.holdMs || 3000);
      return { ok: true, kind: "koj_mood", mood: item.mood };
    }

    case "video_snippet": {
      await announce(item.speech);
      if (!videoEngine || typeof videoEngine.playSpecialEvent !== "function") {
        return { ok: false, kind: "video_snippet", reason: "video_unavailable" };
      }
      const playbackMs = toNumber(item.playbackMs, DEFAULT_SNIPPET_MS);
      const result = await videoEngine.playSpecialEvent(item.tier || "T3", normalized, {
        playbackMs,
        maxWaitMs: playbackMs + 6000,
        waitForMediaEnd: false,
        reason: "streamer_showcase_snippet"
      });
      await sleep(playbackMs + 400);
      return { ok: result?.ok !== false, kind: "video_snippet", playbackMs };
    }

    case "combo": {
      if (
        overlayStateModule &&
        typeof overlayStateModule.setComboMoment === "function" &&
        overlayState
      ) {
        overlayStateModule.setComboMoment(overlayState, {
          kind: "SHOWCASE",
          title: "Ukázka COMBO",
          subtext: "Test combo overlay",
          count: 3,
          holdMs: 5000,
          source: "streamer_showcase"
        });
      }
      setShowcaseKojForce("combo-fire", 3200);
      await announce(item.speech);
      await sleep(3200);
      return { ok: true, kind: "combo" };
    }

    case "duel": {
      if (
        kojnozoutDuelModule &&
        typeof kojnozoutDuelModule.startDuel === "function" &&
        typeof getDuelState === "function" &&
        typeof setDuelState === "function"
      ) {
        const duelConfig = runtimeConfig?.duel || {};
        const next = kojnozoutDuelModule.startDuel(getDuelState(), {
          opponentLabel: "Soupeř",
          opponentStreamId: "opponent",
          localLabel: safeString(duelConfig.localLabel, "Náš Kojnožrout"),
          localStreamId: safeString(duelConfig.localStreamId, "local"),
          durationMs: 120000,
          opponentSeedPoints: 0,
          peerUrl: safeString(duelConfig.peerUrl, "")
        });
        setDuelState(next);
        if (typeof scheduleWorldSave === "function") scheduleWorldSave();
      }
      setShowcaseKojForce("duel-ready", 3200);
      await announce(item.speech);
      await sleep(3200);
      return { ok: true, kind: "duel" };
    }

    case "t0_flyby": {
      if (
        overlayStateModule &&
        typeof overlayStateModule.setT0Flyby === "function" &&
        overlayState
      ) {
        overlayStateModule.setT0Flyby(overlayState, {
          eventType: "FOLLOW",
          userLabel: userLabel || "Ukázka",
          label: "T0 flyby test",
          subtext: "Showcase z chatu",
          holdMs: 4800,
          source: "streamer_showcase"
        });
      }
      setShowcaseKojForce("flyby-fast", 2800);
      await announce(item.speech);
      await sleep(2800);
      return { ok: true, kind: "t0_flyby" };
    }

    case "announce":
    default:
      await announce(item.speech);
      return { ok: true, kind: "announce", visible: false };
  }
}

async function runShowcaseSequence(parsed, ctx = {}) {
  if (activeRun) {
    return { ok: false, reason: "showcase_busy" };
  }

  const items = resolveCatalogItems(parsed);
  if (!items.length) {
    return { ok: false, reason: "unknown_item" };
  }

  const userLabel = safeString(ctx.userLabel, "Streamer");
  const access = resolveStreamerAccess(userLabel, ctx.runtimeConfig || {});
  if (!access.isStreamerBoss) {
    return { ok: false, reason: "streamer_only" };
  }

  activeRun = {
    startedAt: Date.now(),
    step: 0,
    total: items.length,
    itemId: parsed.itemId || null
  };

  const results = [];

  try {
    if (typeof ctx.executeOverlay === "function") {
      await ctx.executeOverlay(buildStartOverlay(items.length, userLabel), {
        source: "streamer_showcase",
        priority: 4
      });
      await sleep(1200);
    }

    for (let i = 0; i < items.length; i += 1) {
      const item = items[i];
      activeRun.step = i + 1;
      activeRun.itemId = item.id;

      const result = await runShowcaseStep(item, ctx);
      results.push({ id: item.id, label: item.label, visible: item.visible, ...result });
      await sleep(item.pauseAfterMs || STEP_GAP_MS);
    }

    lastReport = {
      ok: true,
      finishedAt: Date.now(),
      passed: results.filter((row) => row.ok !== false).length,
      total: results.length,
      results
    };

    if (typeof ctx.executeOverlay === "function") {
      const visibleCount = results.filter((row) => row.visible !== false).length;
      const logicCount = results.length - visibleCount;
      await ctx.executeOverlay(
        buildShowcaseOverlay(
          `Ukázka hotová — ${visibleCount} vizuálů, ${logicCount} logika. Contract testy: ${SHOWCASE_CATALOG.filter((r) => r.contractTests?.length).length} položek.`,
          userLabel
        ),
        { source: "streamer_showcase", priority: 3 }
      );
    }

    return lastReport;
  } catch (err) {
    lastReport = {
      ok: false,
      error: err.message,
      results
    };
    return lastReport;
  } finally {
    clearShowcaseKojForce();
    activeRun = null;
  }
}

/* ===== Koj test slide — projede VŠECHNY stavy Koje, MIA je pojmenuje hlasem ===== */
const KOJ_STATE_SHOWCASE = [
  { mood: "idle", label: "Klid", line: "Tohle je Kojnožrout v klidu.", holdMs: 3200 },
  { mood: "happy", label: "Veselý", line: "Teď je Kojnožrout veselý.", holdMs: 3200 },
  { mood: "eating", label: "Jí", line: "Kojnožrout jí z misky.", holdMs: 3600 },
  { mood: "full", label: "Najedený", line: "Kojnožrout je najedený, miska je plná.", holdMs: 3200 },
  { mood: "hungry", label: "Hlad", line: "Kojnožrout má hlad.", holdMs: 3200 },
  { mood: "sleepy", label: "Spí", line: "Kojnožrout spí.", holdMs: 4200 },
  { mood: "sick", label: "Nemocný", line: "Kojnožrout je nemocný.", holdMs: 3400 },
  { mood: "sad", label: "Smutný", line: "Kojnožrout je smutný.", holdMs: 3400 },
  { mood: "annoyed", label: "Naštvaný", line: "Kojnožrout je naštvaný.", holdMs: 3200 },
  { mood: "excited", label: "Nadšený", line: "Kojnožrout je nadšený.", holdMs: 3200 },
  { mood: "dance", label: "Tancuje", line: "Kojnožrout tancuje.", holdMs: 4000 },
  { mood: "love", label: "Láska", line: "Kojnožrout má rád komunitu.", holdMs: 3200 },
  { mood: "celebrate", label: "Oslava", line: "Kojnožrout oslavuje.", holdMs: 3600 }
];

function listKojStateShowcase() {
  return KOJ_STATE_SHOWCASE.map((s) => ({ mood: s.mood, label: s.label, line: s.line }));
}

function parseKojStateShowcaseCommand(message = "") {
  const text = normalizeCommandText(message);
  if (!text) return null;

  const mentionsKoj = KOJ_WORDS.some((w) => hasWord(text, [w]) || text.includes(w));
  const hasStateHint = KOJ_STATE_HINTS.some((h) => text.includes(h));
  const hasTestHint = SHOWCASE_HINTS.some((h) => text.includes(h));

  // "kojnozrout test", "koj test slide", "kojnozrout stavy", "ukaz stavy koje", "mia ukaz vsechny stavy koje"
  const kojTestSlide = mentionsKoj && (hasStateHint || hasTestHint);
  const miaKojStates = mentionsMia(text) && mentionsKoj && (hasStateHint || hasTestHint);

  if (!kojTestSlide && !miaKojStates) return null;
  return { mode: "koj_states", raw: text };
}

function isKojStateShowcaseCommand(message = "") {
  return parseKojStateShowcaseCommand(message) !== null;
}

async function runKojStateShowcase(ctx = {}) {
  if (activeRun) {
    return { ok: false, reason: "showcase_busy" };
  }

  const userLabel = safeString(ctx.userLabel, "Streamer");
  const access = resolveStreamerAccess(userLabel, ctx.runtimeConfig || {});
  if (!access.isStreamerBoss) {
    return { ok: false, reason: "streamer_only" };
  }

  const states = KOJ_STATE_SHOWCASE;
  activeRun = { startedAt: Date.now(), step: 0, total: states.length, itemId: "koj_states" };
  const results = [];

  const speak = async (text, holdMs) => {
    // MIA pojmenuje stav hlasem (TTS), pokud je dostupné; jinak jen bublina.
    if (typeof ctx.speakLine === "function") {
      try {
        await ctx.speakLine(text, "mia");
      } catch (_e) {
        /* hlas selhal — pokračuj bublinou */
      }
    }
    if (typeof ctx.executeOverlay === "function") {
      await ctx.executeOverlay(
        buildShowcaseOverlay(text, userLabel, {
          title: "MIA · stavy Kojnožrouta",
          holdMs: Math.max(2600, holdMs || 3000)
        }),
        { source: "koj_state_showcase", priority: 4 }
      );
    }
  };

  try {
    await speak(
      `Projedu všechny stavy Kojnožrouta — ${states.length} nálad. Sleduj ho v overlayi.`,
      3200
    );
    await sleep(1400);

    for (let i = 0; i < states.length; i += 1) {
      const s = states[i];
      activeRun.step = i + 1;
      setShowcaseKojForce(s.mood, s.holdMs + 1200);
      await speak(s.line, s.holdMs);
      await sleep(s.holdMs);
      results.push({ mood: s.mood, label: s.label, ok: true });
    }

    await speak("Hotovo — to byly všechny stavy Kojnožrouta.", 3200);

    lastReport = {
      ok: true,
      kind: "koj_states",
      finishedAt: Date.now(),
      total: results.length,
      results
    };
    return lastReport;
  } catch (err) {
    lastReport = { ok: false, kind: "koj_states", error: err.message, results };
    return lastReport;
  } finally {
    clearShowcaseKojForce();
    activeRun = null;
  }
}

module.exports = {
  SHOWCASE_CATALOG,
  DEFAULT_SNIPPET_MS,
  parseStreamerShowcaseCommand,
  isShowcaseCommandText,
  buildShowcaseOverlay,
  buildStartOverlay,
  buildStepOverlay,
  buildBusyOverlay,
  buildRejectOverlay,
  setShowcaseKojForce,
  clearShowcaseKojForce,
  getShowcaseKojForce,
  getShowcaseSnapshot,
  listCatalog,
  runShowcaseSequence,
  runShowcaseStep,
  KOJ_STATE_SHOWCASE,
  parseKojStateShowcaseCommand,
  isKojStateShowcaseCommand,
  runKojStateShowcase,
  listKojStateShowcase
};
