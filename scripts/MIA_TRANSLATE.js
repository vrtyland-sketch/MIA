"use strict";

/**
 * Překlad textu (LLM) + volitelný Whisper STT pro mikrofon.
 * Streamer default = cs. Cizí chat → cs. Mikrofon cs → cílový jazyk chatu.
 */

const axios = require("axios");
const fs = require("fs");
const path = require("path");
const os = require("os");
const llmAdapter = require("./MIA_LLM_ADAPTER");
const languageModule = require("./MIA_LANGUAGE");

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function resolveStreamerLanguage(runtimeConfig = {}) {
  return languageModule.normalizeLanguageCode(
    runtimeConfig?.language?.streamer ||
      process.env.MIA_STREAMER_LANGUAGE ||
      languageModule.resolveDefaultLanguage(runtimeConfig),
    "cs"
  );
}

function isSameLanguage(a, b) {
  return languageModule.normalizeLanguageCode(a, "cs") ===
    languageModule.normalizeLanguageCode(b, "cs");
}

function cleanTranslation(text = "") {
  return safeString(text)
    .replace(/^["'`]+|["'`]+$/g, "")
    .replace(/^(překlad|translation|übersetzung|traducción)\s*:\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

const PROTECTED_NAMES = ["MIA", "Kojnožrout", "Kojnozrout", "Koj", "Spinák", "Spinak"];

function protectNames(text = "") {
  let out = safeString(text);
  const map = [];
  PROTECTED_NAMES.forEach((name, index) => {
    const token = `__MIA_NAME_${index}__`;
    const re = new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    const next = out.replace(re, token);
    if (next !== out) {
      out = next;
      map.push({ token, name });
    }
  });
  return { text: out, map };
}

function restoreNames(text = "", map = []) {
  let out = safeString(text);
  for (const item of map) {
    out = out.split(item.token).join(item.name);
  }
  // Common MT glitches for MIA.
  out = out.replace(/\bMIO\b/g, "MIA").replace(/\bMia\b/g, "MIA");
  return out;
}

async function translateViaMyMemory(source, sourceLang, target) {
  const url =
    "https://api.mymemory.translated.net/get" +
    `?q=${encodeURIComponent(source.slice(0, 450))}` +
    `&langpair=${encodeURIComponent(`${sourceLang}|${target}`)}`;

  const response = await axios.get(url, {
    timeout: 8000,
    validateStatus: (status) => status >= 200 && status < 500
  });

  if (response.status >= 400) {
    return { ok: false, reason: `mymemory_http_${response.status}` };
  }

  const translated = cleanTranslation(response?.data?.responseData?.translatedText);
  if (!translated) {
    return { ok: false, reason: "mymemory_empty" };
  }

  // MyMemory sometimes echoes the source on failure / quota.
  if (translated.toLowerCase() === source.toLowerCase() && sourceLang !== target) {
    return { ok: false, reason: "mymemory_echo" };
  }

  return {
    ok: true,
    reason: "translated",
    text: translated,
    from: sourceLang,
    to: target,
    provider: "mymemory"
  };
}

const translateCache = new Map();
const TRANSLATE_CACHE_TTL_MS = 30 * 60 * 1000;
const TRANSLATE_CACHE_MAX = 200;
let llmCooldownUntil = 0;

function translationCacheKey(source, sourceLang, target) {
  return `${sourceLang}|${target}|${source}`.slice(0, 500);
}

function readTranslationCache(key) {
  const hit = translateCache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > TRANSLATE_CACHE_TTL_MS) {
    translateCache.delete(key);
    return null;
  }
  return hit.result;
}

function writeTranslationCache(key, result) {
  if (!result?.ok || !result.text) return;
  translateCache.set(key, { at: Date.now(), result: { ...result, cached: true } });
  if (translateCache.size > TRANSLATE_CACHE_MAX) {
    const oldest = translateCache.keys().next().value;
    translateCache.delete(oldest);
  }
}

async function translateViaLlm(source, sourceLang, target, runtimeConfig = {}) {
  if (Date.now() < llmCooldownUntil) {
    return { ok: false, reason: "llm_cooldown" };
  }

  const chain =
    typeof llmAdapter.resolveProviderChain === "function"
      ? llmAdapter.resolveProviderChain(runtimeConfig)
      : [];

  if (!chain.length) {
    return { ok: false, reason: "llm_disabled" };
  }

  const fromName = languageModule.getLanguageName(sourceLang);
  const toName = languageModule.getLanguageName(target);
  const systemPrompt = [
    "Jsi přesný překladatel pro live stream.",
    `Přelož text z ${fromName} (${sourceLang}) do ${toName} (${target}).`,
    "Vrať POUZE překlad, bez uvozovek, bez vysvětlování, bez markdownu.",
    "Zachovej jména a emoji."
  ].join(" ");

  let lastReason = "translate_failed";
  for (const cfg of chain) {
    try {
      const url = `${cfg.baseUrl}/chat/completions`;
      const response = await axios.post(
        url,
        {
          model: cfg.model,
          temperature: 0.1,
          max_tokens: Math.min(400, toNumber(cfg.maxTokens, 120) * 2),
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: source }
          ]
        },
        {
          timeout: toNumber(cfg.timeoutMs, 8000),
          headers: {
            Authorization: `Bearer ${cfg.apiKey}`,
            "Content-Type": "application/json"
          },
          validateStatus: (status) => status >= 200 && status < 500
        }
      );

      if (response.status >= 400) {
        lastReason = `http_${response.status}`;
        if (response.status === 429) {
          llmCooldownUntil = Date.now() + 60_000;
          return { ok: false, reason: "http_429" };
        }
        continue;
      }

      const translated = cleanTranslation(
        response?.data?.choices?.[0]?.message?.content
      );
      if (!translated) {
        lastReason = "empty_translation";
        continue;
      }

      return {
        ok: true,
        reason: "translated",
        text: translated,
        from: sourceLang,
        to: target,
        provider: cfg.provider,
        model: cfg.model
      };
    } catch (err) {
      lastReason = safeString(err?.message, "translate_error");
    }
  }

  return { ok: false, reason: lastReason };
}

async function translateText({
  text = "",
  from = "",
  to = "cs",
  runtimeConfig = {}
} = {}) {
  const source = safeString(text);
  if (!source) {
    return { ok: false, reason: "empty_text", text: "" };
  }

  const target = languageModule.normalizeLanguageCode(to, "cs");
  const sourceLang = from
    ? languageModule.normalizeLanguageCode(from, target)
    : languageModule.detectLanguage(source, {
        fallback: resolveStreamerLanguage(runtimeConfig)
      }).code;

  if (isSameLanguage(sourceLang, target)) {
    return {
      ok: true,
      reason: "same_language",
      text: source,
      from: sourceLang,
      to: target,
      skipped: true
    };
  }

  const protectedSource = protectNames(source);
  const cacheKey = translationCacheKey(protectedSource.text, sourceLang, target);
  const cached = readTranslationCache(cacheKey);
  if (cached) {
    return {
      ...cached,
      text: restoreNames(cached.text, protectedSource.map),
      cached: true
    };
  }

  // Při 429/cooldown jdi rovnou na MyMemory — rychlejší a stabilnější pro live.
  const preferFallbackFirst = Date.now() < llmCooldownUntil;
  let llmResult = { ok: false, reason: preferFallbackFirst ? "llm_cooldown" : "llm_pending" };

  if (!preferFallbackFirst) {
    llmResult = await translateViaLlm(
      protectedSource.text,
      sourceLang,
      target,
      runtimeConfig
    );
    if (llmResult.ok) {
      const result = {
        ...llmResult,
        text: restoreNames(llmResult.text, protectedSource.map)
      };
      writeTranslationCache(cacheKey, result);
      return result;
    }
  }

  try {
    const fallback = await translateViaMyMemory(
      protectedSource.text,
      sourceLang,
      target
    );
    if (fallback.ok) {
      const result = {
        ...fallback,
        text: restoreNames(fallback.text, protectedSource.map),
        llmReason: llmResult.reason
      };
      writeTranslationCache(cacheKey, result);
      return result;
    }
    return {
      ok: false,
      reason: fallback.reason || llmResult.reason,
      text: "",
      from: sourceLang,
      to: target
    };
  } catch (err) {
    return {
      ok: false,
      reason: safeString(err?.message, llmResult.reason || "translate_error"),
      text: "",
      from: sourceLang,
      to: target
    };
  }
}

function resolveWhisperApiKey(runtimeConfig = {}) {
  const tts = runtimeConfig?.tts || {};
  const llm = runtimeConfig?.llm || {};
  return (
    safeString(tts.apiKey) ||
    safeString(llm.apiKey) ||
    safeString(process.env.MIA_TTS_API_KEY) ||
    safeString(process.env.MIA_LLM_API_KEY) ||
    safeString(process.env.OPENAI_API_KEY)
  );
}

async function transcribeAudio({
  buffer,
  mimeType = "audio/webm",
  language = "",
  runtimeConfig = {}
} = {}) {
  const apiKey = resolveWhisperApiKey(runtimeConfig);
  if (!apiKey) {
    return { ok: false, reason: "whisper_api_key_missing", text: "" };
  }
  if (!buffer || !Buffer.isBuffer(buffer) || buffer.length < 32) {
    return { ok: false, reason: "empty_audio", text: "" };
  }

  const ext =
    mimeType.includes("wav")
      ? "wav"
      : mimeType.includes("mpeg") || mimeType.includes("mp3")
        ? "mp3"
        : mimeType.includes("ogg")
          ? "ogg"
          : "webm";

  const tmpPath = path.join(
    os.tmpdir(),
    `mia-mic-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  );

  try {
    fs.writeFileSync(tmpPath, buffer);
    const bytes = fs.readFileSync(tmpPath);
    const form = new FormData();
    const fileName = `mic.${ext}`;
    const type = mimeType || `audio/${ext}`;
    if (typeof File === "function") {
      form.append("file", new File([bytes], fileName, { type }));
    } else {
      form.append("file", new Blob([bytes], { type }), fileName);
    }
    form.append("model", "whisper-1");
    const langHint = languageModule.normalizeLanguageCode(language, "");
    if (langHint) {
      form.append("language", langHint === "cs" ? "cs" : langHint);
    }

    const baseUrl = safeString(
      process.env.MIA_LLM_BASE_URL || process.env.OPENAI_BASE_URL,
      "https://api.openai.com/v1"
    ).replace(/\/+$/, "");

    const response = await axios.post(`${baseUrl}/audio/transcriptions`, form, {
      timeout: 30000,
      headers: {
        Authorization: `Bearer ${apiKey}`
      },
      validateStatus: (status) => status >= 200 && status < 500,
      maxBodyLength: Infinity,
      maxContentLength: Infinity
    });

    if (response.status >= 400) {
      return { ok: false, reason: `whisper_http_${response.status}`, text: "" };
    }

    const text = safeString(response?.data?.text);
    if (!text) return { ok: false, reason: "whisper_empty", text: "" };

    return {
      ok: true,
      reason: "whisper_ok",
      text,
      language: langHint || languageModule.detectLanguage(text).code
    };
  } catch (err) {
    return { ok: false, reason: safeString(err?.message, "whisper_error"), text: "" };
  } finally {
    try {
      fs.unlinkSync(tmpPath);
    } catch (_err) {
      /* ignore */
    }
  }
}

/**
 * Profesionální dvojjazyčný překladač:
 * - MIA = tvůj hlas ven (CS → cizí) — streamer / chat outbound
 * - Kojnožrout = soupeř dovnitř (cizí → CS) — guest / duel opponent
 * Veřejné titulky: překlad velký + originál malý (pro neslyšící).
 *
 * Auto režim (sleduje oba hlasy):
 * - oba hlasy česky → nic nepřekládat
 * - jeden hlas jiný než česky → automaticky překládat
 */
function resolveAutoInterpreterPlan(text = "", options = {}) {
  const streamerLang = resolveStreamerLanguage(options.runtimeConfig || {});
  const sample = safeString(text);
  const detected = languageModule.detectLanguage(sample, { fallback: streamerLang });
  const detectedLang = languageModule.normalizeLanguageCode(detected.code, streamerLang);
  const channelHint = safeString(options.channel, "").toLowerCase();
  // Krátké / nejisté zprávy (ok, lol, emoji) nemění stav partnera.
  const strongDetection =
    sample.length >= 10 ||
    detected.confidence >= 0.55 ||
    detected.method === "script";

  let streamerVoiceLang = languageModule.normalizeLanguageCode(
    options.streamerVoiceLang || streamerLang,
    streamerLang
  );
  let guestVoiceLang = languageModule.normalizeLanguageCode(
    options.guestVoiceLang || streamerLang,
    streamerLang
  );

  // Přiřaď detekovaný jazyk ke správnému hlasu jen při silné detekci.
  if (strongDetection) {
    if (channelHint === "guest" || channelHint === "opponent" || channelHint === "koj") {
      guestVoiceLang = detectedLang;
    } else if (channelHint === "streamer" || channelHint === "ty" || channelHint === "mia") {
      streamerVoiceLang = detectedLang;
    } else if (!isSameLanguage(detectedLang, streamerLang)) {
      guestVoiceLang = detectedLang;
    } else {
      streamerVoiceLang = detectedLang;
    }
  }

  const streamerIsCzech = isSameLanguage(streamerVoiceLang, streamerLang);
  const guestIsCzech = isSameLanguage(guestVoiceLang, streamerLang);
  const bothCzech = streamerIsCzech && guestIsCzech;
  const activeForeign = !guestIsCzech
    ? guestVoiceLang
    : !streamerIsCzech
      ? streamerVoiceLang
      : "";

  // Cizí řeč v této větě → Koj překládá dovnitř (cizí → CS)
  if (!isSameLanguage(detectedLang, streamerLang) && strongDetection) {
    return {
      ok: true,
      skip: false,
      reason: "foreign_voice_detected",
      auto: true,
      detectedLang,
      confidence: detected.confidence,
      streamerVoiceLang,
      guestVoiceLang,
      bothCzech: false,
      channel: "guest",
      speaker: "kojnozout",
      roleLabel: "Kojnožrout · Soupeř",
      direction: "in",
      sourceLang: detectedLang,
      targetLang: streamerLang,
      noteForeign: detectedLang,
      clearForeign: false
    };
  }

  // Čeština, ale druhý hlas je cizí → MIA překládá ven (CS → cizí)
  if (!bothCzech && activeForeign) {
    return {
      ok: true,
      skip: false,
      reason: "czech_with_foreign_partner",
      auto: true,
      detectedLang,
      confidence: detected.confidence,
      streamerVoiceLang,
      guestVoiceLang,
      bothCzech: false,
      channel: "streamer",
      speaker: "mia",
      roleLabel: "MIA · Ty",
      direction: "out",
      sourceLang: streamerLang,
      targetLang: activeForeign,
      noteForeign: activeForeign,
      clearForeign: false
    };
  }

  // Oba hlasy česky → nic nepřekládat
  return {
    ok: true,
    skip: true,
    reason: "both_voices_czech",
    auto: true,
    detectedLang,
    confidence: detected.confidence,
    streamerVoiceLang,
    guestVoiceLang,
    bothCzech: true,
    channel: "none",
    speaker: "mia",
    roleLabel: "MIA",
    direction: "none",
    sourceLang: streamerLang,
    targetLang: streamerLang,
    noteForeign: null,
    clearForeign: true
  };
}

function resolveChannelPlan(channel = "streamer", options = {}) {
  const streamerLang = resolveStreamerLanguage(options.runtimeConfig || {});
  const foreignLang = languageModule.normalizeLanguageCode(
    options.foreignLang || options.targetLang || options.sourceLang || "en",
    "en"
  );
  const key = safeString(channel, "streamer").toLowerCase();

  if (key === "guest" || key === "opponent" || key === "souper" || key === "koj") {
    return {
      channel: "guest",
      speaker: "kojnozout",
      roleLabel: "Kojnožrout · Soupeř",
      direction: "in",
      sourceLang: languageModule.normalizeLanguageCode(
        options.sourceLang || foreignLang,
        foreignLang
      ),
      targetLang: languageModule.normalizeLanguageCode(
        options.targetLang || streamerLang,
        streamerLang
      ),
      speechLangHint: options.sourceLang || foreignLang
    };
  }

  if (key === "chat") {
    return {
      channel: "chat",
      speaker: "mia",
      roleLabel: "MIA · Chat",
      direction: "in",
      sourceLang: languageModule.normalizeLanguageCode(
        options.sourceLang || foreignLang,
        foreignLang
      ),
      targetLang: languageModule.normalizeLanguageCode(
        options.targetLang || streamerLang,
        streamerLang
      ),
      speechLangHint: options.sourceLang || foreignLang
    };
  }

  // streamer / ty / mia — tvůj mikrofon ven do duelu
  return {
    channel: "streamer",
    speaker: "mia",
    roleLabel: "MIA · Ty",
    direction: "out",
    sourceLang: languageModule.normalizeLanguageCode(
      options.sourceLang || streamerLang,
      streamerLang
    ),
    targetLang: languageModule.normalizeLanguageCode(
      options.targetLang || foreignLang,
      foreignLang
    ),
    speechLangHint: options.sourceLang || streamerLang
  };
}

function buildPublicCaption({
  channel = "streamer",
  roleLabel = "MIA",
  from = "cs",
  to = "en",
  original = "",
  translated = "",
  userLabel = ""
} = {}) {
  const fromCode = String(from || "").toUpperCase();
  const toCode = String(to || "").toUpperCase();
  const who = userLabel ? `${roleLabel} · ${userLabel}` : roleLabel;
  const title = `${who} · ${fromCode}→${toCode}`;
  const originalLine = safeString(original).slice(0, 180);
  const subtext = originalLine ? `${fromCode}: ${originalLine}` : "";

  return {
    title,
    // Primární titulek = co se říká nahlas (překlad) — pro neslyšící čitelné.
    text: safeString(translated),
    subtext,
    original: originalLine,
    translated: safeString(translated),
    from,
    to,
    channel,
    public: true,
    accessibility: "bilingual_captions"
  };
}

function createTranslationRuntime() {
  const homeLang = () => resolveStreamerLanguage();
  // Sledování obou hlasů — default oba česky = bez překladu.
  let streamerVoiceLang = homeLang();
  let guestVoiceLang = homeLang();
  let lastForeignLanguage = "";
  let lastForeignHeardAt = 0;
  let lastChatTranslation = null;
  let lastMicTranslation = null;
  let lastGuestTranslation = null;
  let lastSkip = null;
  let interpreterEnabled = true;
  let duelInterpreter = false;
  let liveCaption = null;
  const FOREIGN_IDLE_MS = toNumber(process.env.MIA_TRANSLATE_FOREIGN_IDLE_MS, 10 * 60 * 1000);

  function expireForeignIfIdle() {
    if (!lastForeignLanguage || !lastForeignHeardAt) return;
    if (Date.now() - lastForeignHeardAt < FOREIGN_IDLE_MS) return;
    lastForeignLanguage = "";
    guestVoiceLang = homeLang();
  }

  function noteForeignLanguage(code) {
    const streamerLang = homeLang();
    const normalized = languageModule.normalizeLanguageCode(code, streamerLang);
    if (!isSameLanguage(normalized, streamerLang)) {
      lastForeignLanguage = normalized;
      guestVoiceLang = normalized;
      lastForeignHeardAt = Date.now();
    }
    return lastForeignLanguage;
  }

  function noteVoiceLanguages({ streamerLang, guestLang } = {}) {
    expireForeignIfIdle();
    if (streamerLang) {
      streamerVoiceLang = languageModule.normalizeLanguageCode(streamerLang, homeLang());
    }
    if (guestLang) {
      guestVoiceLang = languageModule.normalizeLanguageCode(guestLang, homeLang());
      if (!isSameLanguage(guestVoiceLang, homeLang())) {
        lastForeignLanguage = guestVoiceLang;
        lastForeignHeardAt = Date.now();
      }
    }
    if (bothVoicesCzech()) {
      lastForeignLanguage = "";
      lastForeignHeardAt = 0;
    }
    return getVoiceState();
  }

  function bothVoicesCzech() {
    expireForeignIfIdle();
    const home = homeLang();
    return (
      isSameLanguage(streamerVoiceLang, home) && isSameLanguage(guestVoiceLang, home)
    );
  }

  function clearForeignLanguage() {
    lastForeignLanguage = "";
    lastForeignHeardAt = 0;
    guestVoiceLang = homeLang();
    streamerVoiceLang = homeLang();
    return lastForeignLanguage;
  }

  function hasForeignPartner() {
    expireForeignIfIdle();
    return !bothVoicesCzech();
  }

  function getVoiceState() {
    expireForeignIfIdle();
    return {
      streamerVoiceLang,
      guestVoiceLang,
      bothCzech: bothVoicesCzech(),
      lastForeignLanguage: lastForeignLanguage || null,
      lastForeignHeardAt: lastForeignHeardAt || null
    };
  }

  function getReplyLanguage(explicit = "") {
    if (explicit) {
      return languageModule.normalizeLanguageCode(
        explicit,
        lastForeignLanguage || guestVoiceLang || "en"
      );
    }
    if (!isSameLanguage(guestVoiceLang, homeLang())) return guestVoiceLang;
    return lastForeignLanguage || "";
  }

  function setInterpreterEnabled(value) {
    interpreterEnabled = value !== false;
    return interpreterEnabled;
  }

  function setDuelInterpreter(value) {
    duelInterpreter = value === true;
    return duelInterpreter;
  }

  function setLiveCaption(payload) {
    liveCaption = payload
      ? {
          ...payload,
          updatedAt: Date.now(),
          holdUntilTs: Date.now() + Math.max(8000, Number(payload.holdMs) || 10000)
        }
      : null;
    return liveCaption;
  }

  function getLiveCaption() {
    if (!liveCaption) return null;
    if (Date.now() > Number(liveCaption.holdUntilTs || 0)) {
      liveCaption = null;
      return null;
    }
    return liveCaption;
  }

  function getState() {
    return {
      interpreterEnabled,
      duelInterpreter,
      ...getVoiceState(),
      hasForeignPartner: hasForeignPartner(),
      lastChatTranslation,
      lastMicTranslation,
      lastGuestTranslation,
      lastSkip,
      liveCaption: getLiveCaption(),
      streamerLanguage: homeLang(),
      autoRule:
        "Oba hlasy česky = bez překladu. Jeden hlas jiný než česky = automatický překlad.",
      roles: {
        streamer: "MIA překládá tvůj hlas ven (CS → cizí) jen když je slyšet cizí partner",
        guest: "Kojnožrout překládá soupeře dovnitř (cizí → CS) automaticky",
        chat: "MIA překládá cizí chat veřejně (cizí → CS)"
      }
    };
  }

  function setLastSkip(payload) {
    lastSkip = payload;
  }

  function setLastChatTranslation(payload) {
    lastChatTranslation = payload;
  }

  function setLastMicTranslation(payload) {
    lastMicTranslation = payload;
  }

  function setLastGuestTranslation(payload) {
    lastGuestTranslation = payload;
  }

  return {
    noteForeignLanguage,
    noteVoiceLanguages,
    clearForeignLanguage,
    hasForeignPartner,
    bothVoicesCzech,
    getVoiceState,
    getReplyLanguage,
    getState,
    setLastChatTranslation,
    setLastMicTranslation,
    setLastGuestTranslation,
    setLastSkip,
    setInterpreterEnabled,
    setDuelInterpreter,
    setLiveCaption,
    getLiveCaption,
    isInterpreterEnabled: () => interpreterEnabled !== false
  };
}

module.exports = {
  translateText,
  transcribeAudio,
  resolveStreamerLanguage,
  isSameLanguage,
  resolveAutoInterpreterPlan,
  resolveChannelPlan,
  buildPublicCaption,
  createTranslationRuntime
};
