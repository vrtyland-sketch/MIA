"use strict";

/**
 * MIA_GREETING_AGGREGATOR
 *
 * - sbírá greeting / summon komentáře v krátkém čase
 * - vrací jednu agregovanou community odpověď
 * - nezasahuje do veřejného chat feedu
 */

function createGreetingAggregator(deps = {}) {
  const nowTs = deps.nowTs || (() => Date.now());
  const appendJsonLog = deps.appendJsonLog || (() => {});

  const WINDOW_MS = clampMs(deps.windowMs, 2500);
  const MAX_BUFFER = clampCount(deps.maxBuffer, 12);

  let buffer = [];

  function capture(normalizedEvent) {
    if (!isGreetingCandidate(normalizedEvent)) {
      return {
        captured: false,
        reason: "not_greeting_candidate"
      };
    }

    const entry = buildEntry(normalizedEvent, nowTs);
    if (!entry) {
      return {
        captured: false,
        reason: "entry_build_failed"
      };
    }

    buffer.push(entry);
    trimBuffer();

    appendJsonLog("mia-events", {
      ts: nowTs(),
      stage: "greeting_aggregator_capture",
      size: buffer.length,
      entry
    });

    return {
      captured: true,
      size: buffer.length,
      entry
    };
  }

  function shouldFlush() {
    if (buffer.length === 0) return false;
    if (buffer.length >= MAX_BUFFER) return true;

    const firstTs = Number(buffer[0]?.ts || 0);
    if (!firstTs) return false;

    return nowTs() - firstTs >= WINDOW_MS;
  }

  function flush() {
    if (buffer.length === 0) {
      return null;
    }

    const items = dedupeUsers(buffer);
    buffer = [];

    const speaker = resolveSpeaker(items);
    const text = buildGreetingText(items, speaker);

    const response = {
      ok: true,
      speaker,
      users: items.map((item) => ({
        userId: item.userId,
        userLabel: item.userLabel,
        platform: item.platform
      })),
      overlayPayload: {
        owner: speaker === "kojnozout" ? "kojnozout" : "mia",
        route: "community",
        stage: "community",
        text,
        subtext: "greeting aggregate",
        meta: {
          source: "greeting_aggregator",
          aggregated: true,
          count: items.length
        }
      }
    };

    appendJsonLog("mia-events", {
      ts: nowTs(),
      stage: "greeting_aggregator_flush",
      speaker,
      count: items.length,
      text
    });

    return response;
  }

  function getSnapshot() {
    return {
      size: buffer.length,
      windowMs: WINDOW_MS,
      maxBuffer: MAX_BUFFER,
      items: buffer.slice(0, 20)
    };
  }

  return {
    capture,
    shouldFlush,
    flush,
    getSnapshot
  };
}

function isGreetingCandidate(event) {
  if (!event || event.eventType !== "COMMENT") return false;

  const text =
    safeString(event?.message) ||
    safeString(event?.comment) ||
    safeString(event?.content) ||
    safeString(event?.text);

  if (!text) return false;

  const normalized = normalizeText(text);

  if (!normalized) return false;

  const target = detectTarget(text);
  if (target === "mia" || target === "kojnozout" || target === "both") {
    return false;
  }

  const greetingWords = [
    "ahoj",
    "cau",
    "čau",
    "nazdar",
    "zdar",
    "zdravim",
    "zdravím",
    "dobry den",
    "dobrý den",
    "dobry vecer",
    "dobrý večer",
    "hello",
    "hi"
  ];

  return greetingWords.some((word) => normalized.includes(normalizeText(word)));
}

function buildEntry(event, nowTs = () => Date.now()) {
  const text =
    safeString(event?.message) ||
    safeString(event?.comment) ||
    safeString(event?.content) ||
    safeString(event?.text);

  const userLabel =
    safeString(event?.user?.nickname) ||
    safeString(event?.user?.username) ||
    safeString(event?.user?.displayName) ||
    safeString(event?.user?.name) ||
    "někdo";

  const userId =
    safeString(event?.user?.userId) ||
    safeString(event?.user?.id) ||
    safeString(event?.userId) ||
    userLabel.toLowerCase();

  const platform = safeString(event?.platform, "unknown");

  const explicitTs = Number(event?.ts || event?.timestamp || event?.createdAt || 0);
  const resolvedTs = Number.isFinite(explicitTs) && explicitTs > 0 ? explicitTs : Number(nowTs());

  return {
    ts: resolvedTs,
    userId,
    userLabel,
    platform,
    text,
    target: detectTarget(text),
    kind: "greeting"
  };
}

function detectTarget(text) {
  const normalized = normalizeText(text);

  const talksToMia =
    normalized.includes("mia") ||
    normalized.includes("mio");

  const talksToKojno =
    normalized.includes("kojnozrout") ||
    normalized.includes("kojnožrout") ||
    normalized.includes("kojno");

  if (talksToMia && talksToKojno) return "both";
  if (talksToKojno) return "kojnozout";
  if (talksToMia) return "mia";
  return "unknown";
}

function dedupeUsers(items) {
  const seen = new Set();
  const out = [];

  for (const item of items) {
    const key = safeString(item?.userId) || safeString(item?.userLabel).toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }

  return out;
}

function resolveSpeaker(items) {
  let miaCount = 0;
  let kojCount = 0;

  for (const item of items) {
    if (item.target === "mia") miaCount += 1;
    if (item.target === "kojnozout") kojCount += 1;
    if (item.target === "both") {
      miaCount += 1;
      kojCount += 1;
    }
  }

  if (kojCount > miaCount) return "kojnozout";
  return "mia";
}

function buildGreetingText(items, speaker) {
  const names = items
    .map((item) => safeString(item?.userLabel))
    .filter(Boolean);

  if (names.length === 0) {
    return speaker === "kojnozout"
      ? "Zdravím vás všechny."
      : "Zdravím vás všechny.";
  }

  if (names.length === 1) {
    return `Zdravím ${names[0]}.`;
  }

  if (names.length === 2) {
    return `Zdravím ${names[0]} a ${names[1]}.`;
  }

  if (names.length === 3) {
    return `Zdravím ${names[0]}, ${names[1]} a ${names[2]}.`;
  }

  const firstThree = names.slice(0, 3);
  const restCount = names.length - firstThree.length;

  return `Zdravím ${firstThree[0]}, ${firstThree[1]}, ${firstThree[2]} a další ${restCount}.`;
}

function trimBuffer() {
  // no-op placeholder, actual trimming handled by caller config
}

function normalizeText(value) {
  return safeString(value)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function clampMs(value, fallback = 2500) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(500, Math.min(10000, Math.round(n)));
}

function clampCount(value, fallback = 12) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(3, Math.min(50, Math.round(n)));
}

module.exports = {
  createGreetingAggregator
};