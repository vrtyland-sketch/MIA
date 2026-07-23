"use strict";

/**
 * Detekce jazyka chatu + mapování na Edge TTS hlasy.
 * Primární jazyky: cs, en, de, es + další evropské/světové přes heuristiky a skript.
 */

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

const LANGUAGE_NAMES = {
  cs: "čeština",
  sk: "slovenština",
  en: "English",
  de: "Deutsch",
  es: "español",
  fr: "français",
  it: "italiano",
  pl: "polski",
  pt: "português",
  nl: "Nederlands",
  ru: "русский",
  uk: "українська",
  tr: "Türkçe",
  ar: "العربية",
  ja: "日本語",
  ko: "한국어",
  zh: "中文",
  hi: "हिन्दी",
  sv: "svenska",
  da: "dansk",
  no: "norsk",
  fi: "suomi",
  hu: "magyar",
  ro: "română",
  bg: "български",
  hr: "hrvatski",
  el: "Ελληνικά",
  he: "עברית",
  id: "Bahasa Indonesia",
  vi: "Tiếng Việt",
  th: "ไทย"
};

const EDGE_VOICES = {
  cs: { mia: "cs-CZ-VlastaNeural", koj: "cs-CZ-AntoninNeural" },
  sk: { mia: "sk-SK-ViktoriaNeural", koj: "sk-SK-LukasNeural" },
  en: { mia: "en-US-JennyNeural", koj: "en-US-GuyNeural" },
  de: { mia: "de-DE-KatjaNeural", koj: "de-DE-ConradNeural" },
  es: { mia: "es-ES-ElviraNeural", koj: "es-MX-JorgeNeural" },
  fr: { mia: "fr-FR-DeniseNeural", koj: "fr-FR-HenriNeural" },
  it: { mia: "it-IT-ElsaNeural", koj: "it-IT-DiegoNeural" },
  pl: { mia: "pl-PL-AgnieszkaNeural", koj: "pl-PL-MarekNeural" },
  pt: { mia: "pt-BR-FranciscaNeural", koj: "pt-BR-AntonioNeural" },
  nl: { mia: "nl-NL-ColetteNeural", koj: "nl-NL-MaartenNeural" },
  ru: { mia: "ru-RU-SvetlanaNeural", koj: "ru-RU-DmitryNeural" },
  uk: { mia: "uk-UA-PolinaNeural", koj: "uk-UA-OstapNeural" },
  tr: { mia: "tr-TR-EmelNeural", koj: "tr-TR-AhmetNeural" },
  ar: { mia: "ar-SA-ZariyahNeural", koj: "ar-SA-HamedNeural" },
  ja: { mia: "ja-JP-NanamiNeural", koj: "ja-JP-KeitaNeural" },
  ko: { mia: "ko-KR-SunHiNeural", koj: "ko-KR-InJoonNeural" },
  zh: { mia: "zh-CN-XiaoxiaoNeural", koj: "zh-CN-YunxiNeural" },
  hi: { mia: "hi-IN-SwaraNeural", koj: "hi-IN-MadhurNeural" },
  sv: { mia: "sv-SE-SofieNeural", koj: "sv-SE-MattiasNeural" },
  da: { mia: "da-DK-ChristelNeural", koj: "da-DK-JeppeNeural" },
  no: { mia: "nb-NO-PernilleNeural", koj: "nb-NO-FinnNeural" },
  fi: { mia: "fi-FI-NooraNeural", koj: "fi-FI-HarriNeural" },
  hu: { mia: "hu-HU-NoemiNeural", koj: "hu-HU-TamasNeural" },
  ro: { mia: "ro-RO-AlinaNeural", koj: "ro-RO-EmilNeural" },
  bg: { mia: "bg-BG-KalinaNeural", koj: "bg-BG-BorislavNeural" },
  hr: { mia: "hr-HR-GabrijelaNeural", koj: "hr-HR-SreckoNeural" },
  el: { mia: "el-GR-AthinaNeural", koj: "el-GR-NestorasNeural" },
  he: { mia: "he-IL-HilaNeural", koj: "he-IL-AvriNeural" },
  id: { mia: "id-ID-GadisNeural", koj: "id-ID-ArdiNeural" },
  vi: { mia: "vi-VN-HoaiMyNeural", koj: "vi-VN-NamMinhNeural" },
  th: { mia: "th-TH-PremwadeeNeural", koj: "th-TH-NiwatNeural" }
};

/** Token-based markers (unicode-safe; JS \b breaks on diacritics). */
const WORD_MARKERS = [
  {
    code: "cs",
    weight: 1,
    words: [
      "jsem", "jsi", "jsou", "jsme", "jste", "bude", "bylo", "něco", "neco", "proč", "proc",
      "děkuji", "dekuji", "díky", "diky", "ahoj", "čau", "cau", "moc", "jako", "když", "kdyz",
      "prosím", "prosim", "neví", "nevi", "máš", "mas", "mám", "mam", "tady", "tam", "kdo",
      "kde", "jak", "tohle", "tamhle", "protože", "protoze"
    ]
  },
  {
    code: "sk",
    weight: 1.1,
    words: [
      "som", "sú", "su", "sme", "ste", "bolo", "niečo", "nieco", "prečo", "preco",
      "ďakujem", "dakujem", "prosím", "prosim", "nemáš", "nemas", "kto", "pretože", "pretoze"
    ]
  },
  {
    code: "en",
    weight: 1,
    words: [
      "the", "are", "you", "what", "why", "how", "thanks", "thank", "hello", "please",
      "don't", "dont", "can't", "cant", "could", "would", "love", "good", "nice",
      "awesome", "where", "when", "who", "this", "that", "with", "from", "about"
    ]
  },
  {
    code: "de",
    weight: 1,
    words: [
      "ich", "du", "sie", "ist", "sind", "warum", "danke", "hallo", "bitte", "nicht",
      "oder", "auch", "habe", "haben", "wie", "was", "wo", "wann", "wer", "und", "das", "ein"
    ]
  },
  {
    code: "es",
    weight: 1,
    words: [
      "el", "la", "los", "las", "qué", "que", "por", "gracias", "hola", "como", "cómo",
      "está", "esta", "estás", "estas", "muy", "también", "tambien", "pero", "bueno",
      "donde", "dónde", "quien", "quién", "para", "con", "una", "unos"
    ]
  },
  {
    code: "fr",
    weight: 1,
    words: [
      "je", "tu", "il", "elle", "est", "merci", "bonjour", "pourquoi", "comment", "très",
      "tres", "aussi", "mais", "bien", "salut", "où", "quand", "qui", "avec", "pour", "une"
    ]
  },
  {
    code: "it",
    weight: 1,
    words: [
      "io", "tu", "lui", "lei", "grazie", "ciao", "perché", "perche", "come", "molto",
      "anche", "bene", "dove", "quando", "chi", "sono", "questo", "questa"
    ]
  },
  {
    code: "pl",
    weight: 1,
    words: [
      "jest", "jestem", "jesteś", "jestes", "dziękuję", "dziekuje", "cześć", "czesc",
      "proszę", "prosze", "dlaczego", "gdzie", "kiedy", "kto", "nie", "tak", "bardzo"
    ]
  },
  {
    code: "pt",
    weight: 1,
    words: [
      "eu", "você", "voce", "ele", "ela", "obrigado", "obrigada", "olá", "ola", "porque",
      "muito", "também", "tambem", "bem", "onde", "quando", "quem", "não", "nao"
    ]
  },
  {
    code: "nl",
    weight: 1,
    words: [
      "ik", "jij", "hij", "zij", "bedankt", "hallo", "alsjeblieft", "waarom", "goed",
      "waar", "wanneer", "wie", "wat", "niet", "een", "het"
    ]
  },
  {
    code: "ru",
    weight: 1,
    words: [
      "я", "ты", "он", "она", "это", "спасибо", "привет", "почему", "как", "очень",
      "тоже", "но", "хорошо", "где", "когда", "кто", "что"
    ]
  },
  {
    code: "uk",
    weight: 1.05,
    words: [
      "я", "ти", "він", "вона", "це", "дякую", "привіт", "чому", "як", "дуже",
      "також", "але", "добре", "де", "коли", "хто", "що"
    ]
  },
  {
    code: "tr",
    weight: 1,
    words: [
      "ben", "sen", "bu", "teşekkür", "tesekkur", "merhaba", "nasıl", "nasil", "çok",
      "cok", "ama", "iyi", "yayın", "yayin", "nerede", "kim"
    ]
  },
  {
    code: "sv",
    weight: 1,
    words: [
      "jag", "du", "han", "hon", "är", "tack", "hej", "varför", "varfor", "hur",
      "mycket", "också", "ocksa", "men", "bra", "när", "nar", "vem", "vad"
    ]
  },
  {
    code: "hu",
    weight: 1,
    words: [
      "én", "en", "te", "ez", "köszönöm", "koszonom", "szia", "miért", "miert",
      "hogyan", "nagyon", "jó", "jo", "hol", "mikor", "ki", "mi"
    ]
  },
  {
    code: "ro",
    weight: 1,
    words: [
      "eu", "tu", "el", "ea", "este", "mulțumesc", "multumesc", "salut", "cum",
      "foarte", "dar", "bun", "unde", "când", "cand", "cine"
    ]
  }
];

function tokenizeWords(text = "") {
  return (safeString(text).toLowerCase().match(/[\p{L}']+/gu) || []);
}

function countMarkerHits(tokens, words = []) {
  if (!tokens.length || !words.length) return 0;
  const set = new Set(tokens);
  let hits = 0;
  for (const word of words) {
    if (set.has(String(word).toLowerCase())) hits += 1;
  }
  return hits;
}

function detectScriptHint(text = "") {
  const sample = safeString(text);
  if (!sample) return null;

  if (/[\u0400-\u04FF]/.test(sample)) {
    return /[\u0456\u0457\u0490-\u0491]/.test(sample) ? "uk" : "ru";
  }
  if (/[\u0370-\u03FF]/.test(sample)) return "el";
  if (/[\u0590-\u05FF]/.test(sample)) return "he";
  if (/[\u0600-\u06FF]/.test(sample)) return "ar";
  if (/[\u0900-\u097F]/.test(sample)) return "hi";
  if (/[\u0E00-\u0E7F]/.test(sample)) return "th";
  if (/[\u3040-\u30FF]/.test(sample)) return "ja";
  if (/[\uAC00-\uD7AF]/.test(sample)) return "ko";
  if (/[\u4E00-\u9FFF]/.test(sample)) return "zh";

  return null;
}

function scoreDiacritics(text = "") {
  const scores = {};
  if (/[ěřůňďť]/i.test(text)) scores.cs = (scores.cs || 0) + 3;
  if (/[äöüß]/i.test(text)) scores.de = (scores.de || 0) + 2;
  if (/[ñ¿¡]/i.test(text)) scores.es = (scores.es || 0) + 2;
  if (/[ąćęłńśźż]/i.test(text)) scores.pl = (scores.pl || 0) + 3;
  if (/[ăâîșț]/i.test(text)) scores.ro = (scores.ro || 0) + 2;
  if (/[őű]/i.test(text)) scores.hu = (scores.hu || 0) + 2;
  if (/[æøå]/i.test(text)) {
    scores.da = (scores.da || 0) + 1;
    scores.no = (scores.no || 0) + 1;
  }
  return scores;
}

function normalizeLanguageCode(code, fallback = "cs") {
  const raw = safeString(code, fallback).toLowerCase().replace(/_/g, "-");
  if (!raw) return fallback;
  const base = raw.split("-")[0];
  if (LANGUAGE_NAMES[base]) return base;
  if (EDGE_VOICES[base]) return base;
  return fallback;
}

function resolveDefaultLanguage(runtimeConfig = {}) {
  const env = process.env;
  return normalizeLanguageCode(
    runtimeConfig?.language?.default ||
      env.MIA_DEFAULT_LANGUAGE ||
      env.MIA_LANGUAGE_DEFAULT,
    "cs"
  );
}

function detectLanguage(text = "", options = {}) {
  const sample = safeString(text);
  const fallback = normalizeLanguageCode(options.fallback, "cs");
  const minConfidence = Number.isFinite(options.minConfidence)
    ? options.minConfidence
    : 0.35;

  if (!sample) {
    return { code: fallback, name: getLanguageName(fallback), confidence: 0, method: "empty" };
  }

  if (sample.length <= 2 && /^[a-zA-Z]+$/.test(sample)) {
    return { code: fallback, name: getLanguageName(fallback), confidence: 0.2, method: "too_short" };
  }

  const scriptHint = detectScriptHint(sample);
  if (scriptHint) {
    return {
      code: scriptHint,
      name: getLanguageName(scriptHint),
      confidence: 0.92,
      method: "script"
    };
  }

  const scores = scoreDiacritics(sample);
  const tokens = tokenizeWords(sample);
  for (const marker of WORD_MARKERS) {
    const hits = countMarkerHits(tokens, marker.words);
    if (hits > 0) {
      scores[marker.code] = (scores[marker.code] || 0) + hits * marker.weight;
    }
  }

  const ranked = Object.entries(scores).sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1];
    // Prefer primary stream languages on ties.
    const priority = { cs: 0, en: 1, de: 2, es: 3, fr: 4, sk: 5 };
    return (priority[a[0]] ?? 50) - (priority[b[0]] ?? 50);
  });
  if (ranked.length > 0 && ranked[0][1] >= 1) {
    const [code, score] = ranked[0];
    const second = ranked[1]?.[1] || 0;
    const margin = score - second;
    const confidence = Math.min(0.95, 0.45 + score * 0.12 + margin * 0.05);
    if (confidence >= minConfidence || score >= 2) {
      return {
        code,
        name: getLanguageName(code),
        confidence,
        method: "heuristic",
        scores
      };
    }
  }

  const asciiOnly = /^[\x00-\x7F\s\d\p{P}]+$/u.test(sample);
  if (asciiOnly && sample.length >= 4) {
    const enMarker = WORD_MARKERS.find((m) => m.code === "en");
    const enHits = countMarkerHits(tokens, enMarker?.words || []);
    if (enHits > 0) {
      return {
        code: "en",
        name: getLanguageName("en"),
        confidence: 0.55 + enHits * 0.08,
        method: "ascii_en"
      };
    }
    return {
      code: "en",
      name: getLanguageName("en"),
      confidence: 0.42,
      method: "ascii_default"
    };
  }

  return {
    code: fallback,
    name: getLanguageName(fallback),
    confidence: 0.3,
    method: "fallback"
  };
}

function getLanguageName(code = "cs") {
  const normalized = normalizeLanguageCode(code);
  return LANGUAGE_NAMES[normalized] || normalized;
}

function buildLlmLanguageInstruction(code = "cs") {
  const normalized = normalizeLanguageCode(code);
  const name = getLanguageName(normalized);
  if (normalized === "cs") {
    return "česky, přirozeně, bez markdownu";
  }
  return `v jazyce ${name} (${normalized}), přirozeně, bez markdownu. Nikdy nepřepínej do češtiny, pokud uživatel nepíše česky`;
}

function resolveEdgeVoice(code = "cs", speaker = "mia", runtimeConfig = {}) {
  const normalized = normalizeLanguageCode(code, resolveDefaultLanguage(runtimeConfig));
  const profile = EDGE_VOICES[normalized] || EDGE_VOICES.en;
  const isKoj = safeString(speaker).toLowerCase() === "kojnozout";
  return isKoj ? profile.koj : profile.mia;
}

function attachLanguageToEvent(event = {}, runtimeConfig = {}) {
  if (!event || typeof event !== "object") return event;
  const message = safeString(event.message || event.content || event.text || event.comment);
  if (!message) return event;

  const fallback = resolveDefaultLanguage(runtimeConfig);
  const detected = detectLanguage(message, { fallback });
  event.language = detected.code;
  event.languageName = detected.name;
  event.languageConfidence = detected.confidence;
  event.languageMethod = detected.method;
  return event;
}

module.exports = {
  detectLanguage,
  normalizeLanguageCode,
  resolveDefaultLanguage,
  getLanguageName,
  buildLlmLanguageInstruction,
  resolveEdgeVoice,
  attachLanguageToEvent,
  LANGUAGE_NAMES,
  EDGE_VOICES
};
