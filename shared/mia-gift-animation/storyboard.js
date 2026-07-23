"use strict";

/**
 * Phase 2+ — Gift Animation storyboard blocks.
 *
 * Data-driven variants: intro → avatar → react → koj → outro.
 * Does not replace the 10s stage; optional block sequence for desks / overlays.
 */

function baseBlocks(react) {
  return Object.freeze([
    {
      id: "intro",
      label: "Úvod",
      durationMs: 1200,
      overlay: { effect: "fade_in", dim: 0.35 },
      tts: false
    },
    {
      id: "avatar",
      label: "Profilovka",
      durationMs: 1800,
      overlay: { effect: "profile_reveal", showUser: true },
      tts: false
    },
    {
      id: react.id,
      label: react.label,
      durationMs: react.durationMs || 2200,
      overlay: {
        effect: react.effect,
        particles: true,
        spectacle: true,
        ...(react.overlayExtra || {})
      },
      tts: false
    },
    {
      id: "koj",
      label: "Koj reakce",
      durationMs: 2000,
      overlay: { effect: "koj_react", owner: "kojnozout" },
      tts: true,
      speakerHint: "kojnozout"
    },
    {
      id: "outro",
      label: "Zakončení",
      durationMs: 1800,
      overlay: { effect: "name_points", showMiaPoints: true, showCoins: false },
      tts: false
    }
  ]);
}

const LION_BLOCKS = baseBlocks({
  id: "roar",
  label: "Roar",
  effect: "lion_roar"
});

const UNIVERSE_BLOCKS = baseBlocks({
  id: "react",
  label: "Surge",
  effect: "universe_surge"
});

const GALAXY_BLOCKS = baseBlocks({
  id: "react",
  label: "Burst",
  effect: "galaxy_burst"
});

const ROSE_BLOCKS = baseBlocks({
  id: "react",
  label: "Bloom",
  durationMs: 2000,
  effect: "rose_bloom",
  overlayExtra: { spectacle: false }
});

function boardEntry(giftKey, aliases, blocks) {
  return Object.freeze({
    giftKey,
    aliases: Object.freeze(aliases.slice()),
    totalMs: blocks.reduce((s, b) => s + b.durationMs, 0),
    blocks
  });
}

const STORYBOARDS = Object.freeze({
  LION: boardEntry("LION", ["LEV", "LION", "LEO"], LION_BLOCKS),
  UNIVERSE: boardEntry("UNIVERSE", ["VESMIR", "UNIVERSE", "UNIVERZUM"], UNIVERSE_BLOCKS),
  GALAXY: boardEntry("GALAXY", ["GALAXIE", "GALAXY", "COSMOS"], GALAXY_BLOCKS),
  ROSE: boardEntry("ROSE", ["RUZE", "ROSE", "RŮŽE"], ROSE_BLOCKS)
});

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function normalizeGiftKey(value) {
  return safeString(value)
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function resolveStoryboard(giftKeyOrName = "") {
  const key = normalizeGiftKey(giftKeyOrName);
  if (!key) return null;
  for (const board of Object.values(STORYBOARDS)) {
    if (board.giftKey === key) return cloneBoard(board);
    if ((board.aliases || []).some((a) => normalizeGiftKey(a) === key)) {
      return cloneBoard(board);
    }
  }
  return null;
}

function cloneBoard(board) {
  return JSON.parse(JSON.stringify(board));
}

/**
 * Build a timed timeline for overlay / desk preview.
 * Guarantees overlay payload never includes coins — only miaPoints.
 */
function buildStoryboardTimeline(giftKeyOrName, ctx = {}) {
  const board = resolveStoryboard(giftKeyOrName);
  if (!board) return null;

  const userLabel = safeString(ctx.userLabel, "Divák");
  const miaPoints = Number(ctx.miaPoints);
  let t = 0;
  const timeline = board.blocks.map((block) => {
    const startMs = t;
    t += block.durationMs;
    return {
      ...block,
      startMs,
      endMs: t,
      payload: {
        userLabel,
        miaPoints: Number.isFinite(miaPoints) ? miaPoints : null,
        // hard guard — never expose coins on overlay storyboard
        coins: undefined,
        giftValue: undefined
      }
    };
  });

  return {
    giftKey: board.giftKey,
    totalMs: board.totalMs,
    timeline,
    meta: {
      source: "phase2_gift_storyboard",
      miaPointsOnly: true
    }
  };
}

function listStoryboards() {
  return Object.keys(STORYBOARDS);
}

module.exports = {
  STORYBOARDS,
  LION_BLOCKS,
  UNIVERSE_BLOCKS,
  GALAXY_BLOCKS,
  ROSE_BLOCKS,
  resolveStoryboard,
  buildStoryboardTimeline,
  listStoryboards
};
