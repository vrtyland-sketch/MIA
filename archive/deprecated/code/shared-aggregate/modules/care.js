"use strict";

function createCareAggregator(deps = {}) {
  const nowTs = typeof deps.nowTs === "function" ? deps.nowTs : () => Date.now();
  const appendJsonLog =
    typeof deps.appendJsonLog === "function" ? deps.appendJsonLog : () => {};

  const WINDOW_MS = clampMs(deps.windowMs, 3000);
  const MAX_BUFFER = clampCount(deps.maxBuffer, 8);

  let buffer = [];

  function capture(normalizedEvent) {
    if (!isCareCandidate(normalizedEvent)) {
      return {
        captured: false,
        reason: "not_care_candidate"
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
      stage: "care_aggregator_capture",
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

    const summary = summarizeCare(items);
    const text = buildCareText(items, summary);

    const response = {
      ok: true,
      kind: "care",
      summary,
      users: items.map((item) => ({
        userId: item.userId,
        userLabel: item.userLabel,
        platform: item.platform
      })),
      overlayPayload: {
        owner: "kojnozout",
        route: "community",
        stage: "care",
        text,
        subtext: "community care",
        mood: summary.primaryKind,
        meta: {
          source: "care_aggregator",
          aggregated: true,
          count: items.length,
          primaryKind: summary.primaryKind,
          careIntensity: summary.intensity
        }
      },
      syntheticEvents: [
        buildSyntheticCareEvent(items, summary)
      ]
    };

    appendJsonLog("mia-events", {
      ts: nowTs(),
      stage: "care_aggregator_flush",
      count: items.length,
      primaryKind: summary.primaryKind,
      intensity: summary.intensity,
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

function isCareCandidate(event) {
  if (!event || event.eventType !== "COMMENT") return false;

  const text =
    safeString(event?.message) ||
    safeString(event?.comment) ||
    safeString(event?.content) ||
    safeString(event?.text);

  if (!text) return false;

  const normalized = normalizeText(text);
  if (!normalized) return false;

  const target = detectTarget(normalized);
  const kind = detectCareKind(normalized);

  if (!kind) return false;

  if (target === "mia") return false;

  return target === "kojnozout" || target === "both" || target === "unknown";
}

function buildEntry(event, nowTs = () => Date.now()) {
  const text =
    safeString(event?.message) ||
    safeString(event?.comment) ||
    safeString(event?.content) ||
    safeString(event?.text);

  const normalized = normalizeText(text);
  const careKind = detectCareKind(normalized);

  if (!careKind) return null;

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

  const explicitTs = Number(event?.ts || event?.timestamp || event?.createdAt || 0);
  const resolvedTs = Number.isFinite(explicitTs) && explicitTs > 0 ? explicitTs : Number(nowTs());

  return {
    ts: resolvedTs,
    userId,
    userLabel,
    platform: safeString(event?.platform, "unknown"),
    text,
    careKind,
    target: detectTarget(normalized)
  };
}

function buildSyntheticCareEvent(items, summary) {
  return {
    eventType: "COMMENT",
    route: "community",
    platform: "aggregate",
    text: `care:${summary.primaryKind}`,
    comment: `care:${summary.primaryKind}`,
    content: `care:${summary.primaryKind}`,
    message: `care:${summary.primaryKind}`,
    communityImpact: {
      moodDelta: round2(summary.intensity * 0.35),
      engagementDelta: round2(summary.intensity * 0.9),
      kojnozoutFeedDelta: round2(summary.feedDelta)
    },
    user: {
      nickname: "CARE_AGGREGATE",
      userId: "care_aggregate"
    },
    meta: {
      source: "care_aggregator",
      aggregated: true,
      count: items.length,
      primaryKind: summary.primaryKind
    }
  };
}

function detectTarget(normalizedText) {
  const talksToMia =
    normalizedText.includes("mia") ||
    normalizedText.includes("mio");

  const talksToKojno =
    normalizedText.includes("kojnozrout") ||
    normalizedText.includes("kojnozroute") ||
    normalizedText.includes("kojno");

  if (talksToMia && talksToKojno) return "both";
  if (talksToKojno) return "kojnozout";
  if (talksToMia) return "mia";
  return "unknown";
}

function detectCareKind(normalizedText) {
  const rules = [
    {
      kind: "pet",
      patterns: ["pohlad", "pohladit", "pohladte", "podrb", "podrbat", "pomazlit", "pohladit"]
    },
    {
      kind: "calm",
      patterns: ["uklidni", "uklidnete", "uklidnit", "nech ho spat", "spi", "spat", "odpocivej", "odpocinek"]
    },
    {
      kind: "feed",
      patterns: ["nakrm", "nakrmit", "dej mu papat", "papat", "najes", "papu"]
    },
    {
      kind: "heal",
      patterns: ["vylec", "vylecit", "uzdrav", "uzdravit", "lek", "leky", "pomoz mu", "pomoc"]
    },
    {
      kind: "hug",
      patterns: ["pochovat", "obejmout", "obejmi", "pomazlit", "pritulit", "pritul"]
    }
  ];

  for (const rule of rules) {
    if (rule.patterns.some((pattern) => normalizedText.includes(pattern))) {
      return rule.kind;
    }
  }

  return null;
}

function summarizeCare(items) {
  const counts = {
    pet: 0,
    calm: 0,
    feed: 0,
    heal: 0,
    hug: 0
  };

  for (const item of items) {
    if (counts[item.careKind] !== undefined) {
      counts[item.careKind] += 1;
    }
  }

  let primaryKind = "pet";
  let best = -1;

  for (const key of Object.keys(counts)) {
    if (counts[key] > best) {
      best = counts[key];
      primaryKind = key;
    }
  }

  const intensity = clampNumber(
    1 + (items.length - 1) * 0.35,
    1,
    4
  );

  const feedDeltaByKind = {
    pet: 0.05,
    calm: 0.03,
    feed: 0.18,
    heal: 0.10,
    hug: 0.06
  };

  const feedDelta = round2((feedDeltaByKind[primaryKind] || 0.05) * intensity);

  return {
    counts,
    primaryKind,
    intensity: round2(intensity),
    feedDelta
  };
}

function buildCareText(items, summary) {
  const names = items
    .map((item) => safeString(item?.userLabel))
    .filter(Boolean);

  const subject = formatNames(names);
  const careLabel = careKindLabel(summary.primaryKind);

  if (!subject) {
    return `Komunita pečuje o Kojnožrouta: ${careLabel}.`;
  }

  return `${subject} pečují o Kojnožrouta: ${careLabel}.`;
}

function careKindLabel(kind) {
  switch (kind) {
    case "pet":
      return "hlazení a podrbání";
    case "calm":
      return "uklidnění a odpočinek";
    case "feed":
      return "krmení a papání";
    case "heal":
      return "léčení a pomoc";
    case "hug":
      return "mazlení a objetí";
    default:
      return "péče";
  }
}

function formatNames(names) {
  if (!Array.isArray(names) || names.length === 0) return "";

  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} a ${names[1]}`;
  if (names.length === 3) return `${names[0]}, ${names[1]} a ${names[2]}`;

  const firstThree = names.slice(0, 3);
  return `${firstThree[0]}, ${firstThree[1]}, ${firstThree[2]} a další ${names.length - 3}`;
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

function trimBuffer() {
  // placeholder
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

function clampMs(value, fallback = 3000) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(500, Math.min(10000, Math.round(n)));
}

function clampCount(value, fallback = 8) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(2, Math.min(50, Math.round(n)));
}

function clampNumber(value, min, max) {
  const n = Number(value);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function round2(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

module.exports = {
  createCareAggregator
};