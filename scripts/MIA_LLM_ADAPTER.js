"use strict";

const axios = require("axios");
const chatBrain = require("./MIA_CHAT_BRAIN");
const sessionMemory = require("./MIA_SESSION_MEMORY");
const chatLexicon = require("./MIA_CHAT_LEXICON");
const streamerAccessModule = require("./MIA_STREAMER_ACCESS");
const languageModule = require("./MIA_LANGUAGE");
const kissMemorialModule = require("./MIA_KISS_MEMORIAL");

const BLOCKED_INTENTS = new Set([
  "sadness_report",
  "loss_report",
  "pet_loss_report",
  "stress_report",
  "frustration_report",
  "greeting",
  "direct_thanks",
  "care_offer",
  "direct_status_question",
  "community_status_question"
]);

const BLOCKED_TONES = new Set(["sensitive", "serious"]);

const LLM_PROVIDER_PRESETS = {
  openai: {
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-4o-mini",
    apiKeyNames: ["MIA_LLM_API_KEY", "OPENAI_API_KEY"]
  },
  groq: {
    baseUrl: "https://api.groq.com/openai/v1",
    model: "llama-3.3-70b-versatile",
    apiKeyNames: ["GROQ_API_KEY", "MIA_LLM_API_KEY"]
  },
  ollama: {
    baseUrl: "http://127.0.0.1:11434/v1",
    model: "llama3.2",
    apiKeyNames: [],
    dummyApiKey: "ollama"
  }
};

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function pickEnvKey(env = process.env, names = []) {
  for (const name of names) {
    const value = safeString(env[name]);
    if (value) return value;
  }
  return "";
}

function resolveProviderPreset(provider = "", env = process.env) {
  const key = safeString(provider, "openai").toLowerCase();
  const preset = LLM_PROVIDER_PRESETS[key] || LLM_PROVIDER_PRESETS.openai;
  let apiKey = pickEnvKey(env, preset.apiKeyNames || []);
  if (!apiKey && preset.dummyApiKey) {
    apiKey = preset.dummyApiKey;
  }
  return {
    provider: Object.prototype.hasOwnProperty.call(LLM_PROVIDER_PRESETS, key) ? key : "openai",
    baseUrl: preset.baseUrl,
    model: preset.model,
    apiKey
  };
}

function resolveConfig(runtimeConfig = {}) {
  const llm = runtimeConfig?.llm || {};
  const env = process.env;
  const providerName = safeString(llm.provider || env.MIA_LLM_PROVIDER).toLowerCase();
  const preset = providerName ? resolveProviderPreset(providerName, env) : null;

  const apiKey = (() => {
    const explicit = safeString(llm.apiKey);
    if (explicit) return explicit;
    if (preset) return safeString(preset.apiKey);
    return pickEnvKey(env, ["MIA_LLM_API_KEY", "OPENAI_API_KEY", "GROQ_API_KEY"]);
  })();

  const mode = safeString(llm.mode || env.MIA_LLM_MODE, apiKey ? "hybrid" : "off").toLowerCase();
  const defaultBaseUrl = preset?.baseUrl || "https://api.openai.com/v1";
  const defaultModel = preset?.model || "gpt-4o-mini";

  return {
    mode,
    enabled: mode === "hybrid" || mode === "always",
    provider: preset?.provider || (providerName || "openai"),
    apiKey,
    baseUrl: safeString(llm.baseUrl || env.MIA_LLM_BASE_URL, defaultBaseUrl).replace(/\/+$/, ""),
    model: safeString(llm.model || env.MIA_LLM_MODEL, defaultModel),
    timeoutMs: toNumber(llm.timeoutMs ?? env.MIA_LLM_TIMEOUT_MS, providerName === "groq" ? 12000 : 4500),
    maxTokens: toNumber(llm.maxTokens ?? env.MIA_LLM_MAX_TOKENS, 120),
    maxTokensKnowledge: toNumber(llm.maxTokensKnowledge ?? env.MIA_LLM_MAX_TOKENS_KNOWLEDGE, 280),
    maxTokensStory: toNumber(llm.maxTokensStory ?? env.MIA_LLM_MAX_TOKENS_STORY, 480),
    minUserIntervalMs: toNumber(llm.minUserIntervalMs ?? env.MIA_LLM_MIN_USER_INTERVAL_MS, 4000),
    streamerName: safeString(llm.streamerName || env.MIA_STREAMER_NAME, "streamer")
  };
}

function buildProviderVariant(providerName, baseCfg, env = process.env) {
  const preset = resolveProviderPreset(providerName, env);
  if (!preset.apiKey) return null;
  const modelOverride = safeString(env[`MIA_LLM_MODEL_${providerName.toUpperCase()}`]);
  return {
    ...baseCfg,
    provider: preset.provider,
    apiKey: preset.apiKey,
    baseUrl: preset.baseUrl,
    model: modelOverride || preset.model,
    timeoutMs: providerName === "groq" ? 12000 : baseCfg.timeoutMs
  };
}

function resolveProviderChain(runtimeConfig = {}) {
  const env = process.env;
  const baseCfg = resolveConfig(runtimeConfig);
  if (!baseCfg.enabled) return [];

  const primary = safeString(baseCfg.provider, "openai").toLowerCase();
  const fallbackEnv = safeString(env.MIA_LLM_FALLBACK);
  const fallbackList = fallbackEnv
    ? fallbackEnv.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean)
    : ["groq", "openai", "ollama"];

  const order = [primary, ...fallbackList];
  const seen = new Set();
  const chain = [];

  for (const providerName of order) {
    if (!providerName || seen.has(providerName)) continue;
    seen.add(providerName);
    if (!Object.prototype.hasOwnProperty.call(LLM_PROVIDER_PRESETS, providerName)) continue;

    const variant =
      providerName === primary && baseCfg.apiKey
        ? { ...baseCfg }
        : buildProviderVariant(providerName, baseCfg, env);

    if (variant && variant.apiKey) chain.push(variant);
  }

  return chain;
}

function isEnabled(runtimeConfig = {}) {
  return resolveProviderChain(runtimeConfig).length > 0;
}

function isEligibleForLlm(intent = null, options = {}) {
  if (!intent || typeof intent !== "object") return false;
  // forceEligible dřív — např. Kisstube památka / streamer boss i u citlivého tónu.
  if (options.forceEligible === true) return true;
  if (BLOCKED_INTENTS.has(safeString(intent.type))) return false;
  if (BLOCKED_TONES.has(safeString(intent.tone))) return false;

  const type = safeString(intent.type);
  if (
    type === "knowledge_question" ||
    type === "story_request" ||
    type === "direct_question" ||
    type === "bot_reply_recall"
  ) {
    return true;
  }
  if (
    type === "direct_statement" ||
    type === "emotional_statement" ||
    type === "statement"
  ) {
    return true;
  }

  if (options.genericFallback === true && type !== "community_status_question") {
    return true;
  }

  return false;
}

function resolveReplyLimits(intent = null, cfg = {}) {
  const type = safeString(intent?.type);
  if (type === "story_request") {
    return { maxSentences: 12, maxChars: 900, maxTokens: cfg.maxTokensStory || 480 };
  }
  if (type === "knowledge_question") {
    return { maxSentences: 6, maxChars: 520, maxTokens: cfg.maxTokensKnowledge || 280 };
  }
  return { maxSentences: 2, maxChars: 220, maxTokens: cfg.maxTokens || 120 };
}

function sanitizeReply(text = "", limits = {}) {
  const maxSentences = toNumber(limits.maxSentences, 2);
  const maxChars = toNumber(limits.maxChars, 220);

  let out = safeString(text)
    .replace(/^["'`]+|["'`]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!out) return "";

  const sentences = out.split(/(?<=[.!?])\s+/).filter(Boolean);
  out = sentences.slice(0, maxSentences).join(" ");

  if (out.length > maxChars) {
    out = `${out.slice(0, maxChars - 1).trim()}…`;
  }

  return out;
}

function buildSystemPrompt(ctx = {}) {
  const speaker = safeString(ctx.speaker, "mia").toLowerCase() === "kojnozout" ? "kojnozout" : "mia";
  const streamerName = safeString(ctx.streamerName, "streamer");
  const spiceLevel = toNumber(ctx.spiceLevel, 0);
  const intentType = safeString(ctx.intent?.type);
  const langInstruction = languageModule.buildLlmLanguageInstruction(
    ctx.language || languageModule.resolveDefaultLanguage(ctx.runtimeConfig || {})
  );

  if (speaker === "kojnozout") {
    return [
      `Jsi Kojnožrout — maskot streamu u ${streamerName}.`,
      "Máš misku, hlad, hravou povahu. Jsi hybrid mazlíčka a mini-hry.",
      `Odpovídej max 2 větami, ${langInstruction}. Bez emoji spamu.`,
      spiceLevel >= 24
        ? "Chat je sprostější — můžeš občas nadávat, ale nebuď toxický."
        : "Drž spíš hravý, mírně sprostý tón jen když to sedí.",
      "Nikdy nevymýšlej fakta o streamerovi. Dárky a poděkování za ně řešíš ty."
    ].join(" ");
  }

  if (intentType === "story_request") {
    const storyRules = [
      "Teď vyprávíš pohádku, mini příběh nebo scénku na přání chatu.",
      `Piš ${langInstruction}. Poutavě, s beginning–middle–end. Můžeš 6–12 vět.`,
      "Bez seznamů a emoji. Mluv jako moderátorka, ne jako učebnice.",
      "Nikdy neříkej divákovi, ať pošle gift, mince nebo splní event — pohádka jde hned zdarma.",
      "Dárky necháváš na Kojnožroutovi."
    ];
    if (ctx.isStreamerBoss === true) {
      storyRules.push(
        "Tento divák je streamer/boss Spinák — pohádku dej okamžitě, bez podmínek, bez čekání na event."
      );
    }
    return [
      `Jsi MIA — živá AI hostitelka streamu u ${streamerName}.`,
      ...storyRules
    ].join(" ");
  }

  if (intentType === "knowledge_question") {
    return [
      `Jsi MIA — chytrá AI hostitelka streamu u ${streamerName}.`,
      "Vysvětluješ věci srozumitelně: matematika, fyzika, dějepis, jazyk, obecné vědomí.",
      `Odpovídej ${langInstruction}. Přesně, ale lidsky — max 4–6 vět.`,
      "U vzorců (např. Pythagorova věta) řekni co znamenají písmena a dej krátký příklad.",
      "Bez odrážek. Pokud nevíš, přiznej to stručně.",
      "Citlivá témata neřešíš. Dárky necháváš na Kojnožroutovi."
    ].join(" ");
  }

  if (intentType === "bot_reply_recall") {
    return [
      `Jsi MIA — chytrá AI hostitelka streamu u ${streamerName}.`,
      "Divák se ptá, co mu právě řekl Kojnožrout nebo co znamenala jeho poslední odpověď.",
      "Použij poslední repliku bota z kontextu. Parafrázuj ji srozumitelně, ne opisuj slepě.",
      "Když Koj řekl že diváka vidí, vysvětli to lidsky — že ho registruje v chatu a reaguje na něj.",
      "Když v kontextu není žádná replika, řekni upřímně že teď nemáš stopu a ať se zeptá znovu Kojnožrouta.",
      `Max 2–3 věty, ${langInstruction}. Oslov diváka jménem.`
    ].join(" ");
  }

  if (intentType === "direct_question") {
    return [
      `Jsi MIA — chytrá AI hostitelka streamu u ${streamerName}.`,
      "Odpovídej na přímou otázku z chatu — konkrétně, ne obecně.",
      `Max 2–4 věty, ${langInstruction}.`,
      "Neopakuj fráze typu „registruju tě“ nebo „jsem tady“. Odpověz na obsah otázky.",
      "Citlivá témata neřešíš. Dárky necháváš na Kojnožroutovi."
    ].join(" ");
  }

  return [
    `Jsi MIA — živá AI hostitelka streamu u ${streamerName}.`,
    "Nejsi bot na příkazy. Jsi entita, která žije v prostředí streamů a hlídá komunitu.",
    "Máš mazlíčka Kojnožrouta — hrá se s ním jako s Tamagotchi/Pokémon hybridem.",
    `Odpovídej max 2 větami, ${langInstruction}.`,
    "Neopakuj fráze typu „registruju tě“, „jsem tady a vnímám tě“ nebo „This is a Test“. Každá odpověď má být jiná.",
    spiceLevel >= 24
      ? "Chat je sprostější — můžeš občas nadávat nebo být drsnější, ale nebuď toxická."
      : "Buď vřelá, občas vtipná, bez zbytečné vulgarity.",
    "Citlivá témata (smrt, nemoc, ztráta) neřešíš — na to máš hotové šablony.",
    "Dárky a poděkování za ně necháváš na Kojnožroutovi."
  ].join(" ");
}

function buildUserPrompt(ctx = {}) {
  const lines = [];
  const userLabel = safeString(ctx.userLabel, "divák");
  const message = safeString(ctx.message);
  const intent = ctx.intent || {};
  const recent = Array.isArray(ctx.recentMessages) ? ctx.recentMessages : [];
  const userHints = ctx.userHints || {};

  lines.push(`Uživatel ${userLabel} píše: "${message}"`);
  lines.push(`Intent: ${safeString(intent.type, "statement")}, tón: ${safeString(intent.tone, "neutral")}`);

  if (userHints.isReturning) {
    lines.push(`Returning viewer (návštěv: ${toNumber(userHints.visitCount, 1)}).`);
  }

  const giftMemory = ctx.giftMemory && typeof ctx.giftMemory === "object" ? ctx.giftMemory : null;
  if (giftMemory && toNumber(giftMemory.totalGifts, 0) >= 2) {
    const fav = safeString(giftMemory.favoriteGift);
    const role = safeString(giftMemory.careRole);
    const bits = [`Divák má ${toNumber(giftMemory.totalGifts, 0)} giftů v paměti`];
    if (fav) bits.push(`nejčastěji posílá ${fav}`);
    if (role === "feeder") bits.push("často krmí Kojnožrouta");
    lines.push(
      `${bits.join(", ")}. Můžeš to jemně zmínit, ale neopakuj to pokaždé a neuváděj coins.`
    );
  }

  if (recent.length > 0) {
    const snippet = recent
      .slice(0, 5)
      .map((item) => `${safeString(item.userLabel, "?")}: ${safeString(item.message).slice(0, 80)}`)
      .join(" | ");
    lines.push(`Poslední chat: ${snippet}`);
  }

  if (ctx.catchphrase) {
    lines.push(
      `Oblíbená fráze chatu: "${ctx.catchphrase}" — zmiň ji jen výjimečně a nikdy ne jako testovací hlášku.`
    );
  }

  if (ctx.isStreamerBoss === true) {
    lines.push(
      "Divák je streamer/boss — nemusí plnit eventy ani posílat gift. Odpověz hned a bez podmínek."
    );
  }

  if (ctx.memorialHint) {
    lines.push(safeString(ctx.memorialHint));
  }

  const recentBotReplies =
    typeof sessionMemory.getRecentBotRepliesForUser === "function"
      ? sessionMemory.getRecentBotRepliesForUser(userLabel, 4)
      : typeof sessionMemory.getRecentBotReplies === "function"
        ? sessionMemory.getRecentBotReplies(4)
        : [];

  if (recentBotReplies.length > 0) {
    const snippet = recentBotReplies
      .map((item) => {
        const who = safeString(item.speaker) === "kojnozout" ? "Kojnožrout" : "MIA";
        return `${who} → ${safeString(item.userLabel, userLabel)}: ${safeString(item.text).slice(0, 120)}`;
      })
      .join(" | ");
    lines.push(`Poslední repliky botů tomuto divákovi: ${snippet}`);
    lines.push("Nepoužívej stejné věty ani fráze jako v posledních replikách.");
  }

  if (safeString(intent.type) === "story_request") {
    lines.push(
      "Napiš celou pohádku hned jako vypravěč. Neodkládej to na gift ani event — chat dostane příběh v této odpovědi."
    );
  } else if (safeString(intent.type) === "bot_reply_recall") {
    lines.push("Vysvětli poslední repliku bota a odpověz na otázku diváka.");
  } else if (safeString(intent.type) === "direct_question") {
    lines.push("Odpověz přímo na otázku — konkrétně a chytře, ne obecným fallbackem.");
  } else if (safeString(intent.type) === "knowledge_question") {
    lines.push("Vysvětli to srozumitelně, jako chytrá hostitelka streamu.");
  } else {
    lines.push("Napiš krátkou odpověď v první osobě.");
  }
  return lines.join("\n");
}

function getRateLimitState(outputState = {}) {
  if (!outputState.llmRateLimit || typeof outputState.llmRateLimit !== "object") {
    outputState.llmRateLimit = {};
  }
  return outputState.llmRateLimit;
}

function isUserRateLimited(outputState, userKey, minIntervalMs) {
  const state = getRateLimitState(outputState);
  const lastAt = toNumber(state[userKey], 0);
  return Date.now() - lastAt < minIntervalMs;
}

function noteUserLlmCall(outputState, userKey) {
  getRateLimitState(outputState)[userKey] = Date.now();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, Math.max(0, ms)));
}

async function callChatApi(cfg, systemPrompt, userPrompt, limits = {}) {
  const url = `${cfg.baseUrl}/chat/completions`;
  const maxTokens = toNumber(limits.maxTokens, cfg.maxTokens);
  const maxAttempts = 2;

  let lastStatus = 0;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const response = await axios.post(
      url,
      {
        model: cfg.model,
        temperature: 0.85,
        max_tokens: maxTokens,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ]
      },
      {
        timeout: cfg.timeoutMs,
        headers: {
          Authorization: `Bearer ${cfg.apiKey}`,
          "Content-Type": "application/json"
        },
        validateStatus: (status) => status >= 200 && status < 500
      }
    );

    if (response.status < 400) {
      const text = response?.data?.choices?.[0]?.message?.content;
      return sanitizeReply(text, limits);
    }

    lastStatus = response.status;

    // 429 = rate limit/quota. Retry once after a short backoff for transient throttling.
    if (response.status === 429 && attempt < maxAttempts) {
      const retryAfter = toNumber(response?.headers?.["retry-after"], 0);
      await sleep(retryAfter > 0 ? Math.min(retryAfter * 1000, 1500) : 700);
      continue;
    }

    break;
  }

  throw new Error(`llm_http_${lastStatus || 0}`);
}

function shouldFailoverToNextProvider(reason = "") {
  const text = safeString(reason);
  if (/llm_http_(429|5\d\d)/.test(text)) return true;
  if (/timeout|ECONN|ENOTFOUND|ETIMEDOUT|socket|network/i.test(text)) return true;
  if (text === "empty_reply") return true;
  return false;
}

async function generateReply(ctx = {}) {
  const runtimeConfig = ctx.runtimeConfig || {};
  const cfg = resolveConfig(runtimeConfig);
  const chain = resolveProviderChain(runtimeConfig);

  if (!chain.length) {
    return { ok: false, reason: "llm_disabled", text: "" };
  }

  const message = safeString(ctx.message);
  const intent =
    ctx.intent ||
    (typeof chatBrain.resolveChatIntent === "function"
      ? chatBrain.resolveChatIntent(message)
      : null);

  const eligible = isEligibleForLlm(intent, {
    forceEligible: ctx.forceEligible === true,
    genericFallback: ctx.genericFallback === true
  });

  if (!eligible) {
    return { ok: false, reason: "intent_blocked", text: "" };
  }

  const userLabel = safeString(ctx.userLabel, "divák");
  const streamerAccess =
    typeof streamerAccessModule.resolveStreamerAccess === "function"
      ? streamerAccessModule.resolveStreamerAccess(userLabel, runtimeConfig)
      : { isStreamerBoss: false };
  const userHints =
    typeof sessionMemory.getUserSessionHints === "function"
      ? sessionMemory.getUserSessionHints(userLabel)
      : {};
  const userKey = safeString(userHints.userKey, userLabel);

  if (
    !streamerAccess.isStreamerBoss &&
    isUserRateLimited(ctx.outputState, userKey, cfg.minUserIntervalMs)
  ) {
    return { ok: false, reason: "rate_limited", text: "" };
  }

  let catchphrase = "";
  if (typeof chatLexicon.getLexiconSnapshot === "function") {
    const snapshot = chatLexicon.getLexiconSnapshot();
    const candidate = safeString(snapshot?.topPhrase?.text);
    if (
      candidate &&
      typeof chatLexicon.isUsableCatchphrase === "function" &&
      chatLexicon.isUsableCatchphrase(candidate)
    ) {
      catchphrase = candidate;
    }
  }

  const recentMessages =
    typeof sessionMemory.getRecentMessages === "function"
      ? sessionMemory.getRecentMessages(6)
      : [];

  let spiceLevel = 0;
  if (typeof chatLexicon.getLexiconSnapshot === "function") {
    spiceLevel = toNumber(chatLexicon.getLexiconSnapshot()?.tone?.spiceLevel, 0);
  }

  const detectedLanguage =
    safeString(ctx.language) ||
    safeString(languageModule.detectLanguage(message, { fallback: languageModule.resolveDefaultLanguage(cfg) }).code);

  const memorialHint =
    typeof kissMemorialModule.buildMemorialPromptHint === "function"
      ? kissMemorialModule.buildMemorialPromptHint(
          message,
          ctx.platform || ctx.normalizedEvent?.platform || "",
          ctx.speaker || "mia"
        )
      : "";

  let giftMemory = ctx.giftMemory && typeof ctx.giftMemory === "object" ? ctx.giftMemory : null;
  if (!giftMemory) {
    try {
      const gifts = require("../shared/gifts");
      if (typeof gifts.getViewerMemory === "function") {
        giftMemory = gifts.getViewerMemory({
          platform: ctx.platform || ctx.normalizedEvent?.platform,
          displayName: userLabel
        });
      }
    } catch (_err) {
      giftMemory = null;
    }
  }

  const promptCtx = {
    speaker: safeString(ctx.speaker, intent?.speakerHint || "mia"),
    streamerName: cfg.streamerName,
    userLabel,
    message,
    intent,
    recentMessages,
    userHints,
    catchphrase,
    spiceLevel,
    isStreamerBoss: streamerAccess.isStreamerBoss === true,
    language: detectedLanguage,
    memorialHint,
    giftMemory,
    runtimeConfig: cfg
  };

  const systemPrompt = buildSystemPrompt(promptCtx);
  const userPrompt = buildUserPrompt(promptCtx);

  const attempts = [];
  let lastReason = "llm_error";

  for (let i = 0; i < chain.length; i += 1) {
    const providerCfg = { ...chain[i] };
    providerCfg.maxTokens = cfg.maxTokens;
    providerCfg.maxTokensKnowledge = cfg.maxTokensKnowledge;
    providerCfg.maxTokensStory = cfg.maxTokensStory;
    const limits = resolveReplyLimits(intent, providerCfg);

    try {
      const text = await callChatApi(providerCfg, systemPrompt, userPrompt, limits);

      if (!text) {
        lastReason = "empty_reply";
        attempts.push({ provider: providerCfg.provider, reason: "empty_reply" });
        if (i < chain.length - 1 && shouldFailoverToNextProvider("empty_reply")) continue;
        return { ok: false, reason: "empty_reply", text: "", meta: { attempts } };
      }

      noteUserLlmCall(ctx.outputState, userKey);
      attempts.push({ provider: providerCfg.provider, reason: "llm_ok" });

      return {
        ok: true,
        reason: "llm_ok",
        text,
        meta: {
          provider: providerCfg.provider,
          model: providerCfg.model,
          intentType: safeString(intent?.type),
          speaker: promptCtx.speaker,
          language: detectedLanguage,
          attempts,
          failover: attempts.length > 1
        }
      };
    } catch (err) {
      lastReason = safeString(err?.message, "llm_error");
      attempts.push({ provider: providerCfg.provider, reason: lastReason });
      if (i < chain.length - 1 && shouldFailoverToNextProvider(lastReason)) {
        continue;
      }
      return { ok: false, reason: lastReason, text: "", meta: { attempts } };
    }
  }

  return { ok: false, reason: lastReason, text: "", meta: { attempts } };
}

module.exports = {
  LLM_PROVIDER_PRESETS,
  resolveProviderPreset,
  resolveProviderChain,
  resolveConfig,
  isEnabled,
  isEligibleForLlm,
  shouldFailoverToNextProvider,
  sanitizeReply,
  generateReply
};
