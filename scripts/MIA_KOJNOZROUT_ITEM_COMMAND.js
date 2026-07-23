"use strict";

/**
 * Chat příkaz `item` — batoh, fronta diváků, spotřeba v duelu (kánon §12).
 *
 * Příkazy:
 *   item | batoh | položka | inventář  (+ otevři/ukaž batoh|položky)
 *   item use | batoh use | položka use boost | item feast ...
 */

const {
  consumeItem,
  normalizeUserKey,
  ITEM_CATALOG,
  getUserBackpackView
} = require("./MIA_KOJNOZROUT_BACKPACK");
const {
  isFoodItem,
  isHealItem,
  isComfortItem,
  isCareItem,
  isDuelItem,
  getItemDef,
  resolveItemAlias
} = require("./MIA_KOJNOZROUT_ITEM_META");
const {
  applyItemUseToState,
  buildItemUseSummary,
  buildItemUseOverlayPayload,
  resolveItemUseEffect,
  ITEM_USE_MS
} = require("./MIA_KOJNOZROUT_ITEM_EFFECT");

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function nowTs() {
  return Date.now();
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

function resolveParsedItemId(token = "") {
  return resolveItemAlias(token) || null;
}

function actionForItemId(itemId = "", duelActive = false) {
  if (!itemId) return "show";
  if (isFoodItem(itemId)) return "feed";
  if (duelActive && isDuelItem(itemId)) return "use";
  if (isHealItem(itemId) || isComfortItem(itemId) || isCareItem(itemId)) return "use";
  if (isDuelItem(itemId)) return "use";
  return "use";
}

const SHOW_BACKPACK_KEYWORDS = new Set([
  "item",
  "itemy",
  "batoh",
  "inventar",
  "backpack",
  "polozka",
  "polozky",
  "polozku"
]);

const ITEM_COMMAND_PREFIXES = ["item", "batoh", "polozka", "polozky", "inventar"];

function parseShowBackpackPhrase(text = "") {
  if (SHOW_BACKPACK_KEYWORDS.has(text)) {
    return { action: "show" };
  }

  if (
    /^(otevri|ukaz|zobraz|moje|muj)\s+(batoh|polozk[uyu]|inventar|itemy?)$/.test(
      text
    )
  ) {
    return { action: "show" };
  }

  return null;
}

function stripItemCommandPrefix(text = "") {
  for (const prefix of ITEM_COMMAND_PREFIXES) {
    const token = `${prefix} `;
    if (text.startsWith(token)) {
      return text.slice(token.length).trim();
    }
  }
  return null;
}

function parseNaturalItemUse(text = "") {
  const parts = text.split(/\s+/);
  const verb = parts[0];
  const itemToken = parts[1] || "";

  if (verb === "pouzij" || verb === "dej") {
    const itemId = resolveParsedItemId(itemToken);
    if (itemId) {
      return { action: actionForItemId(itemId), itemId };
    }
  }

  if (text === "obvaz" || text.endsWith(" obvaz")) {
    return { action: "use", itemId: "obvaz" };
  }

  if (text === "lektvar" || text.endsWith(" lektvar") || text === "lek") {
    return { action: "use", itemId: "lektvar" };
  }

  return null;
}

function parseItemCommand(message = "") {
  const text = normalizeCommandText(message);
  if (!text) return null;

  const showPhrase = parseShowBackpackPhrase(text);
  if (showPhrase) return showPhrase;

  if (text === "pece" || text === "pec" || text === "pece koj" || text === "koj pece") {
    return { action: "pece" };
  }

  const natural = parseNaturalItemUse(text);
  if (natural) return natural;

  const rest = stripItemCommandPrefix(text);
  if (rest === null) return null;
  if (!rest) return { action: "show" };

  const parts = rest.split(/\s+/);
  const verb = parts[0];

  if (verb === "use" || verb === "pouzit") {
    const itemId = resolveParsedItemId(parts[1] || "");
    return { action: "use", itemId };
  }

  if (verb === "feed" || verb === "nakrmit" || verb === "nakrm") {
    const itemId = resolveParsedItemId(parts[1] || "");
    return { action: "feed", itemId };
  }

  const directItem = resolveParsedItemId(verb);
  if (directItem) {
    return { action: actionForItemId(directItem), itemId: directItem };
  }

  return { action: "show" };
}

function createItemDisplayState(seed = {}) {
  return {
    queue: Array.isArray(seed.queue) ? seed.queue.slice() : [],
    current: seed.current && typeof seed.current === "object" ? seed.current : null,
    currentStartedAt: toNumber(seed.currentStartedAt, 0),
    rotateMs: toNumber(seed.rotateMs, 8500),
    lastActionAt: toNumber(seed.lastActionAt, 0),
    lastUseSummary: seed.lastUseSummary || null
  };
}

function enqueueItemDisplay(displayState, userLabel, action = "show", meta = {}) {
  const state = createItemDisplayState(displayState);
  const entry = {
    userLabel: safeString(userLabel, "anonymous"),
    userKey: normalizeUserKey(userLabel),
    action: safeString(action, "show"),
    itemId: safeString(meta.itemId) || null,
    enqueuedAt: nowTs()
  };

  state.queue = state.queue.filter((row) => row.userKey !== entry.userKey);
  state.queue.push(entry);

  if (state.queue.length > 12) {
    state.queue = state.queue.slice(-12);
  }

  state.lastActionAt = nowTs();
  return state;
}

function resolveCurrentDisplay(displayState, backpackState, options = {}) {
  const state = createItemDisplayState(displayState);
  const rotateMs = toNumber(options.rotateMs, state.rotateMs);
  const now = nowTs();

  if (
    state.current &&
    now - state.currentStartedAt < rotateMs &&
    !options.forceAdvance
  ) {
    const view = getUserBackpackView(backpackState, state.current.userLabel);
    state.current = {
      ...state.current,
      ...view,
      visibleUntil: state.currentStartedAt + rotateMs
    };
    return state;
  }

  if (state.queue.length === 0) {
    state.current = null;
    state.currentStartedAt = 0;
    return state;
  }

  const next = state.queue.shift();
  const view = getUserBackpackView(backpackState, next.userLabel);

  state.current = {
    ...next,
    ...view,
    visibleUntil: now + rotateMs
  };
  state.currentStartedAt = now;
  return state;
}

function pickFeedItem(userItems = [], preferredId = "") {
  if (!Array.isArray(userItems) || userItems.length === 0) return null;

  if (preferredId) {
    const match = userItems.find((row) => row.id === preferredId);
    if (match && (isFoodItem(match.id) || isHealItem(match.id) || isComfortItem(match.id))) {
      return match;
    }
  }

  const priority = [
    "feast",
    "granule",
    "jablko",
    "snack",
    "lektvar",
    "obvaz",
    "shield",
    "micek",
    "cheer",
    "spark"
  ];
  for (const id of priority) {
    const match = userItems.find((row) => row.id === id);
    if (
      match &&
      (isFoodItem(id) || isHealItem(id) || isComfortItem(id))
    ) {
      return match;
    }
  }

  return null;
}

function pickItemToUse(userItems = [], preferredId = "") {
  if (!Array.isArray(userItems) || userItems.length === 0) return null;

  if (preferredId) {
    const match = userItems.find((row) => row.id === preferredId);
    if (match) return match;
  }

  const priority = [
    "feast",
    "utok",
    "posileni",
    "boost",
    "lektvar",
    "obvaz",
    "shield",
    "granule",
    "jablko",
    "snack",
    "kartac",
    "micek",
    "cheer",
    "spark"
  ];
  for (const id of priority) {
    const match = userItems.find((row) => row.id === id);
    if (match) return match;
  }

  return userItems[0];
}

function buildItemSpeech(userLabel, view, duelActive = false) {
  const name = safeString(userLabel, "kamaráde").split(/\s+/)[0];
  if (!view.itemCount) {
    return duelActive
      ? `${name}, batoh je prázdný — pošli gift, chat nebo like a naplníš ho.`
      : `${name}, batoh je zatím prázdný. Gift, chat nebo like ti přidá item.`;
  }

  const labels = view.items.map((row) => row.label).slice(0, 3).join(", ");
  return duelActive
    ? `${name}, v batohu máš: ${labels}. Napiš item use pro boost v duelu.`
    : `${name}, v batohu máš: ${labels}.`;
}

function buildItemOverlayPayload(view, speechText, duelActive = false) {
  return {
    owner: "kojnozout",
    route: "community",
    stage: "item_backpack",
    title: duelActive ? "Batoh · duel" : "Batoh",
    text: speechText,
    subtext:
      view.itemCount > 0
        ? view.items.map((row) => `${row.label} (${row.power})`).join(" · ")
        : "Prázdný batoh — sbírej gifty, chat a liky",
    user: view.userLabel,
    mood: view.itemCount > 0 ? "excited" : "hungry",
    meta: {
      itemDisplay: true,
      itemCount: view.itemCount,
      duelActive: Boolean(duelActive)
    },
    holdMs: 9000
  };
}

function applyOffstreamItemCare(kojnozoutState, item, ctx = {}) {
  if (!kojnozoutState || !item) return kojnozoutState;
  return applyItemUseToState(kojnozoutState, item, ctx);
}

function handleFeedAction(ctx, parsed, userLabel, backpackState, displayState, duelState, kojnozoutState, duelModule, duelActive) {
  const view = getUserBackpackView(backpackState, userLabel);
  const chosen = pickFeedItem(view.items, parsed.itemId);

  if (!chosen) {
    const speech = `${userLabel.split(/\s+/)[0]}, nemáš jídlo v batohu — pošli gift, chat nebo like, pak item feed snack.`;
    return {
      handled: true,
      ok: false,
      action: "feed",
      reason: "no_food_item",
      speech,
      overlayPayload: buildItemOverlayPayload(view, speech, duelActive),
      backpackState,
      displayState,
      duelState,
      kojnozoutState
    };
  }

  const consumed = consumeItem(backpackState, userLabel, chosen.id);
  backpackState = consumed.state;
  const item = consumed.item;
  const effect = resolveItemUseEffect(item, { duelActive, action: "feed" });
  kojnozoutState = applyItemUseToState(kojnozoutState, item, {
    duelActive,
    action: "feed",
    userLabel,
    holdMs: ITEM_USE_MS
  });

  const questHook =
    typeof ctx.noteQuestFeed === "function"
      ? ctx.noteQuestFeed(kojnozoutState)
      : null;
  if (questHook?.state) {
    kojnozoutState = questHook.state;
  }

  const speech = `${userLabel.split(/\s+/)[0]}, nakrmil jsi Kojnožrouta ${item.label}! Mňam.`;
  const useSummary = buildItemUseSummary(item, effect, {
    duelActive,
    action: "feed",
    userLabel,
    holdMs: ITEM_USE_MS
  });
  displayState.lastUseSummary = useSummary;
  displayState = enqueueItemDisplay(displayState, userLabel, "feed", { itemId: item.id });
  displayState = resolveCurrentDisplay(displayState, backpackState, { forceAdvance: true });

  return {
    handled: true,
    ok: true,
    action: "feed",
    item,
    speech,
    questCompleted: Boolean(questHook?.completed),
    overlayPayload: buildItemUseOverlayPayload(item, effect, {
      duelActive,
      action: "feed",
      userLabel,
      holdMs: ITEM_USE_MS
    }),
    backpackState,
    displayState,
    duelState,
    kojnozoutState
  };
}

function handleItemCommand(ctx = {}) {
  const message = safeString(ctx.message);
  const parsed = parseItemCommand(message);
  if (!parsed) {
    return { handled: false };
  }

  const userLabel = safeString(ctx.userLabel, "anonymous");
  let backpackState = ctx.backpackState || { users: {} };
  let displayState = createItemDisplayState(ctx.displayState || {});
  let duelState = ctx.duelState || { active: false };
  let kojnozoutState = ctx.kojnozoutState || {};
  const duelModule = ctx.duelModule || null;
  const duelActive = Boolean(duelState.active);

  if (parsed.action === "feed") {
    return handleFeedAction(
      ctx,
      parsed,
      userLabel,
      backpackState,
      displayState,
      duelState,
      kojnozoutState,
      duelModule,
      duelActive
    );
  }

  if (parsed.action === "use") {
    const view = getUserBackpackView(backpackState, userLabel);
    const chosen = pickItemToUse(view.items, parsed.itemId);
    if (!chosen) {
      const speech = buildItemSpeech(userLabel, view, duelActive);
      displayState = enqueueItemDisplay(displayState, userLabel, "show");
      displayState = resolveCurrentDisplay(displayState, backpackState, { forceAdvance: true });

      return {
        handled: true,
        ok: false,
        reason: "empty_backpack",
        speech,
        overlayPayload: buildItemOverlayPayload(view, speech, duelActive),
        backpackState,
        displayState,
        duelState,
        kojnozoutState
      };
    }

    const consumed = consumeItem(backpackState, userLabel, chosen.id);
    backpackState = consumed.state;
    const item = consumed.item;

    if (duelActive && duelModule && typeof duelModule.ingestDuelContribution === "function") {
      const duelResult = duelModule.ingestDuelContribution(duelState, {
        eventType: "ITEM_USE",
        userLabel,
        miaPoints: 0,
        itemPower: toNumber(item.power, 0),
        side: "local"
      });
      duelState = duelResult.state || duelState;
    } else {
      kojnozoutState = applyOffstreamItemCare(kojnozoutState, item, {
        duelActive,
        action: "use",
        userLabel,
        holdMs: ITEM_USE_MS
      });
    }

    const effect = resolveItemUseEffect(item, { duelActive, action: "use" });
    const refreshed = getUserBackpackView(backpackState, userLabel);
    const speech = `${userLabel.split(/\s+/)[0]}, použil jsi ${item.label}! ${
      duelActive
        ? `+${item.power} bodů týmu v duelu.`
        : "Kojnožrout to ucítí."
    }`;

    displayState.lastUseSummary = buildItemUseSummary(item, effect, {
      duelActive,
      action: "use",
      userLabel,
      holdMs: ITEM_USE_MS
    });

    if (duelActive) {
      kojnozoutState = {
        ...(kojnozoutState || {}),
        lastItemUseAt: displayState.lastUseSummary.at,
        lastItemUse: displayState.lastUseSummary
      };
    }

    displayState = enqueueItemDisplay(displayState, userLabel, "use", { itemId: item.id });
    displayState = resolveCurrentDisplay(displayState, backpackState, { forceAdvance: true });

    return {
      handled: true,
      ok: true,
      action: "use",
      item,
      speech,
      overlayPayload: buildItemUseOverlayPayload(item, effect, {
        duelActive,
        action: "use",
        userLabel,
        holdMs: ITEM_USE_MS
      }),
      backpackState,
      displayState,
      duelState,
      kojnozoutState
    };
  }

  displayState = enqueueItemDisplay(displayState, userLabel, "show");
  displayState = resolveCurrentDisplay(displayState, backpackState, {
    forceAdvance: !displayState.current
  });

  const activeView = displayState.current || getUserBackpackView(backpackState, userLabel);
  const speech = buildItemSpeech(activeView.userLabel, activeView, duelActive);

  return {
    handled: true,
    ok: true,
    action: "show",
    speech,
    overlayPayload: buildItemOverlayPayload(activeView, speech, duelActive),
    backpackState,
    displayState,
    duelState,
    kojnozoutState
  };
}

function getItemDisplaySnapshot(displayState, backpackState, options = {}) {
  const state = resolveCurrentDisplay(displayState || {}, backpackState || {}, options);
  return {
    queueLength: state.queue.length,
    rotateMs: state.rotateMs,
    current: state.current,
    lastActionAt: state.lastActionAt || null,
    lastUseSummary: state.lastUseSummary || null
  };
}

module.exports = {
  ITEM_CATALOG,
  parseItemCommand,
  createItemDisplayState,
  enqueueItemDisplay,
  resolveCurrentDisplay,
  getUserBackpackView,
  handleItemCommand,
  getItemDisplaySnapshot,
  buildItemSpeech,
  buildItemOverlayPayload
};
