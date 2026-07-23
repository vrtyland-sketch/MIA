"use strict";

const textBankModule = require("./MIA_TEXT_BANK");
const outputStateModule = require("./MIA_OUTPUT_STATE");
const chatLexiconModule = require("./MIA_CHAT_LEXICON");
const llmAdapterModule = require("./MIA_LLM_ADAPTER");
const sessionMemoryModule = require("./MIA_SESSION_MEMORY");
const streamerAccessModule = require("./MIA_STREAMER_ACCESS");
const languageModule = require("./MIA_LANGUAGE");
const kissMemorialModule = require("./MIA_KISS_MEMORIAL");
const { resolveChatIntent } = require("./MIA_CHAT_BRAIN");

const TEXT_BANK = textBankModule.TEXT_BANK || {};

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeText(value) {
  return safeString(value)
    .replace(/\s+/g, " ")
    .trim();
}

function clampHoldMs(value, fallback = 9000) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(3500, Math.min(20000, Math.round(n)));
}

function pickRotationText(outputState, key, variants, fallbackText) {
  const list = Array.isArray(variants)
    ? variants.map((item) => normalizeText(item)).filter(Boolean)
    : [];

  if (list.length === 0) {
    return normalizeText(fallbackText);
  }

  if (
    outputStateModule &&
    typeof outputStateModule.getNextRotationIndex === "function" &&
    outputState
  ) {
    const safeKey = safeString(key, "default");
    if (!outputState.rotationLastText || typeof outputState.rotationLastText !== "object") {
      outputState.rotationLastText = {};
    }
    if (!outputState.rotationRecentByKey || typeof outputState.rotationRecentByKey !== "object") {
      outputState.rotationRecentByKey = {};
    }

    const recent = Array.isArray(outputState.rotationRecentByKey[safeKey])
      ? outputState.rotationRecentByKey[safeKey]
      : [];
    const avoidCount = Math.min(4, Math.max(1, list.length - 1));
    let index = outputStateModule.getNextRotationIndex(outputState, safeKey, list.length);
    let text = list[index] || list[0];
    let attempts = 0;

    while (
      list.length > 1 &&
      attempts < list.length &&
      recent.slice(0, avoidCount).includes(normalizeText(text))
    ) {
      index = outputStateModule.getNextRotationIndex(outputState, safeKey, list.length);
      text = list[index] || list[0];
      attempts += 1;
    }

    const normalizedText = normalizeText(text);
    outputState.rotationLastText[safeKey] = normalizedText;
    outputState.rotationRecentByKey[safeKey] = [normalizedText]
      .concat(recent.filter((item) => item !== normalizedText))
      .slice(0, avoidCount);
    return normalizedText;
  }

  return list[0];
}

function rememberLastText(outputState, speaker, text) {
  if (
    outputStateModule &&
    typeof outputStateModule.setLastText === "function"
  ) {
    outputStateModule.setLastText(outputState, speaker, text);
  }
}

function getBankVariants(key) {
  return Array.isArray(TEXT_BANK[key]) ? TEXT_BANK[key] : [];
}

function resolveEmotionBankKey(baseKey = "", domain = "general") {
  const safeDomain = safeString(domain, "general");
  const domainKey = `${safeString(baseKey)}_${safeDomain}`;

  if (getBankVariants(domainKey).length > 0) {
    return domainKey;
  }

  const generalKey = `${safeString(baseKey)}_general`;
  if (getBankVariants(generalKey).length > 0) {
    return generalKey;
  }

  return domainKey;
}

function applyNameTemplate(template, name) {
  return normalizeText(
    safeString(template).replace(/\{name\}/g, firstName(name))
  );
}

function pickNamedBankText(outputState, bankKeys, userLabel, fallbackText) {
  const name = firstName(userLabel);
  const keys = Array.isArray(bankKeys) ? bankKeys : [bankKeys];
  const variants = [];

  for (const key of keys) {
    for (const template of getBankVariants(key)) {
      const filled = applyNameTemplate(template, name);
      if (filled) {
        variants.push(filled);
      }
    }
  }

  const fallback = applyNameTemplate(
    fallbackText.includes("{name}") ? fallbackText : `{name}, ${fallbackText}`,
    name
  );

  const rotationKey = keys.join("|");
  return pickRotationText(outputState, rotationKey, variants, fallback);
}

function firstName(userLabel = "") {
  return safeString(userLabel).split(/\s+/).filter(Boolean)[0] || "někdo";
}

function collectLearnedVoiceTemplates(speaker = "mia", useSpicy = false) {
  const isKoj = speaker === "kojnozout";
  const keys = isKoj
    ? (useSpicy ? ["koj_learned_voice_spicy", "koj_learned_voice"] : ["koj_learned_voice"])
    : (useSpicy
      ? ["mia_learned_voice_spicy", "mia_learned_voice"]
      : ["mia_learned_voice"]);

  const templates = [];
  for (const key of keys) {
    templates.push(...getBankVariants(key));
  }

  return templates.map((item) => normalizeText(item)).filter(Boolean);
}

function enrichSpeechWithCommunityVoice(speechText, outputState, ctx = {}) {
  const safeSpeech = normalizeText(speechText);
  if (!safeSpeech) return speechText;

  if (ctx.returningViewerAck === true || alreadyMentionsReturning(safeSpeech)) {
    return speechText;
  }

  const intentType = safeString(ctx.intent?.type);
  const skipCommunityVoiceIntents = new Set([
    "greeting",
    "direct_status_question",
    "direct_thanks",
    "bot_reply_recall",
    "pet_loss_report",
    "loss_report",
    "sadness_report",
    "stress_report"
  ]);
  if (skipCommunityVoiceIntents.has(intentType)) {
    return speechText;
  }

  if (
    !chatLexiconModule ||
    typeof chatLexiconModule.getLexiconSnapshot !== "function" ||
    typeof chatLexiconModule.buildCommunityVoiceLine !== "function" ||
    typeof chatLexiconModule.shouldUseCommunityVoice !== "function"
  ) {
    return speechText;
  }

  const snapshot = chatLexiconModule.getLexiconSnapshot();
  const intent = ctx.intent || null;

  if (!chatLexiconModule.shouldUseCommunityVoice(intent, snapshot)) {
    return speechText;
  }

  const speaker = safeString(ctx.speaker, "mia").toLowerCase() === "kojnozout"
    ? "kojnozout"
    : "mia";
  const useSpicy =
    Boolean(snapshot.topSpicy) &&
    (snapshot.tone?.spiceLevel || 0) >= 24 &&
    safeString(intent?.tone) !== "sensitive";
  const templates = collectLearnedVoiceTemplates(speaker, useSpicy);

  if (templates.length === 0) {
    return speechText;
  }

  const rotationKey = `community_voice_${speaker}_${useSpicy ? "spicy" : "casual"}`;
  const slot =
    outputStateModule &&
    typeof outputStateModule.getNextRotationIndex === "function"
      ? outputStateModule.getNextRotationIndex(outputState, rotationKey, 12)
      : 0;

  const catchphrase = safeString(snapshot.topPhrase?.text || snapshot.topPhrase?.key);
  if (
    catchphrase &&
    typeof chatLexiconModule.isUsableCatchphrase === "function" &&
    !chatLexiconModule.isUsableCatchphrase(catchphrase)
  ) {
    return speechText;
  }

  if (slot === 0 || slot % 8 !== 4) {
    return speechText;
  }

  return chatLexiconModule.buildCommunityVoiceLine({
    baseText: safeSpeech,
    userLabel: ctx.userLabel,
    speaker,
    intent,
    outputState,
    snapshot,
    templates,
    rotationKey,
    slot
  });
}

const RETURNING_ELIGIBLE_INTENTS = new Set([
  "greeting",
  "direct_status_question",
  "direct_thanks",
  "care_offer",
  "joy_report",
  "relief_report"
]);

function shouldApplyReturningAck(intent = null) {
  const type = safeString(intent?.type);
  const tone = safeString(intent?.tone, "neutral");

  if (!RETURNING_ELIGIBLE_INTENTS.has(type)) {
    return false;
  }

  if (tone === "sensitive" || tone === "serious") {
    return false;
  }

  return true;
}

function alreadyMentionsReturning(text = "") {
  const lower = safeString(text).toLowerCase();

  return (
    lower.includes("zase vidím") ||
    lower.includes("zase tady") ||
    lower.includes("zase v chatu") ||
    lower.includes("zpátky") ||
    lower.includes("znovu")
  );
}

function weaveReturningAck(speechText, ackPhrase, userLabel) {
  const speech = normalizeText(speechText);
  const ack = normalizeText(ackPhrase);

  if (!speech || !ack) {
    return speech;
  }

  if (alreadyMentionsReturning(speech)) {
    return speech;
  }

  const name = firstName(userLabel);
  const prefix = `${name},`;

  if (!speech.toLowerCase().startsWith(prefix.toLowerCase())) {
    return `${name}, ${ack.charAt(0).toLowerCase()}${ack.slice(1)} ${speech}`;
  }

  const tail = speech.slice(prefix.length).trim();
  const tailSentence = tail.charAt(0).toLowerCase() + tail.slice(1);
  const ackSentence = ack.charAt(0).toLowerCase() + ack.slice(1);

  return `${prefix} ${ackSentence} ${tailSentence}`;
}

function enrichSpeechWithSessionMemory(speechText, outputState, ctx = {}) {
  const safeSpeech = normalizeText(speechText);
  if (!safeSpeech) {
    return speechText;
  }

  if (
    !sessionMemoryModule ||
    typeof sessionMemoryModule.getUserSessionHints !== "function" ||
    !shouldApplyReturningAck(ctx.intent)
  ) {
    return speechText;
  }

  const hints = sessionMemoryModule.getUserSessionHints(ctx.userLabel);
  if (!hints.isReturning) {
    return speechText;
  }

  const speaker = safeString(ctx.speaker, "mia").toLowerCase() === "kojnozout"
    ? "kojnozout"
    : "mia";
  const bankKey = speaker === "kojnozout" ? "koj_returning_ack" : "mia_returning_ack";
  const ack = pickRotationText(
    outputState,
    `returning_ack_${speaker}_${safeString(ctx.intent?.type, "direct")}`,
    getBankVariants(bankKey),
    speaker === "kojnozout" ? "rád tě zase vidím tady." : "ráda tě zase vidím."
  );

  return weaveReturningAck(safeSpeech, ack, ctx.userLabel);
}

function isGenericResponse(text = "") {
  const t = safeString(text).toLowerCase();
  if (!t) return true;

  if (
    [
      "jsem tu",
      "ahoj jsem tu",
      "ok",
      "aha",
      "hm",
      "👍"
    ].includes(t)
  ) {
    return true;
  }

  return isStaleRegisterResponse(text);
}

function isStaleRegisterResponse(text = "") {
  const t = safeString(text).toLowerCase();
  if (!t) return true;

  const staleMarkers = [
    "registruju tě",
    "registruju to",
    "registruju další",
    "už jsem si všimla",
    "mimochodem — v chatu",
    "mimochodem - v chatu",
    "this is a test",
    "jsem tady a vnímám tě",
    "klidně pokračuj."
  ];

  let hits = 0;
  for (const marker of staleMarkers) {
    if (t.includes(marker)) {
      hits += 1;
    }
  }

  if (hits >= 2) {
    return true;
  }

  if (hits >= 1 && t.length <= 96) {
    return true;
  }

  return false;
}

function buildDiverseDirectResponse(outputState, speaker = "mia", userLabel = "", intent = null) {
  const tone = safeString(intent?.tone, "neutral");
  const hints =
    sessionMemoryModule &&
    typeof sessionMemoryModule.getUserSessionHints === "function"
      ? sessionMemoryModule.getUserSessionHints(userLabel)
      : {};

  if (speaker === "kojnozout") {
    return pickNamedBankText(
      outputState,
      ["direct_kojnozout", "koj_direct_question", "koj_direct_generic"],
      userLabel,
      "slyším tě taky — co přesně chceš vědět?"
    );
  }

  const bankKeys =
    tone === "serious" || tone === "sensitive"
      ? ["mia_direct_engagement_sensitive", "mia_direct_question_named", "mia_direct_generic"]
      : hints.isReturning
        ? ["mia_direct_engagement", "mia_direct_generic_return", "mia_direct_question_named"]
        : ["mia_direct_engagement", "mia_direct_question_named", "mia_direct_generic", "direct_mia"];

  return pickNamedBankText(
    outputState,
    bankKeys,
    userLabel,
    "slyším tě — co přesně tě teď zajímá?"
  );
}

function buildCommunityStatusResponse(outputState, speaker = "mia", intent = null) {
  const kojnozoutState =
    outputState?.kojnozoutSnapshot || outputState?.kojnozoutState || null;

  if (speaker === "mia" && kojnozoutState) {
    try {
      const vitalsCompanion = require("./MIA_KOJNOZROUT_VITALS_COMPANION");
      if (typeof vitalsCompanion.buildMiaVitalsStatusLine === "function") {
        const statusLine = vitalsCompanion.buildMiaVitalsStatusLine(
          kojnozoutState,
          outputState
        );
        if (statusLine) {
          const tone = safeString(intent?.tone, "neutral");
          const base = pickRotationText(
            outputState,
            `community_status_mia_${tone}`,
            tone === "sensitive" || tone === "serious"
              ? [
                  "Jsme tady spolu. Když bude potřeba, zpomalíme a pobavíme se v klidu.",
                  "Atmosféra je teď citlivější, ale držíme se spolu."
                ]
              : [
                  "Máme se dobře, díky. Chat dneska docela žije.",
                  "Zatím dobrý, komunita drží pohromadě."
                ],
            "Máme se dobře, díky."
          );
          return `${base} ${statusLine}`.replace(/\s+/g, " ").trim();
        }
      }
    } catch (_err) {
      // optional vitals companion
    }
  }

  const miaNeutral = [
    "Máme se dobře, díky. Chat dneska docela žije.",
    "Zatím dobrý, komunita drží pohromadě.",
    "Docela klid, ale začíná to tu ožívat.",
    "Vypadá to tu dneska dobře, nálada je fajn."
  ];

  const miaSensitive = [
    "Jsme tady spolu. Když bude potřeba, zpomalíme a pobavíme se v klidu.",
    "Atmosféra je teď citlivější, ale držíme se spolu.",
    "Jedu s vámi a vnímám náladu chatu víc do hloubky."
  ];

  const kojNeutral = [
    "Tady to zatím žije docela slušně. Já jsem vzhůru taky.",
    "Zatím dobrý. Komunita funí správným směrem.",
    "Není to špatný. Už to tu má aspoň trochu tep.",
    "Jo, dneska to tu voní líp než mrtvý ticho."
  ];

  const kojSensitive = [
    "Jsem vzhůru a držím tu s váma klidnější tempo.",
    "Jo, teď spíš hlídám náladu, než abych dělal kravál.",
    "Jsem tady. Tentokrát víc potichu, ale vnímám to."
  ];

  const tone = safeString(intent?.tone, "neutral");

  return pickRotationText(
    outputState,
    `community_status_${speaker}_${tone}`,
    speaker === "kojnozout"
      ? (tone === "sensitive" || tone === "serious" ? kojSensitive : kojNeutral)
      : (tone === "sensitive" || tone === "serious" ? miaSensitive : miaNeutral),
    speaker === "kojnozout"
      ? "Zatím dobrý. Jsem vzhůru a komunita taky."
      : "Máme se dobře, díky."
  );
}

function buildDirectStatusResponse(outputState, speaker = "mia", userLabel = "", intent = null) {
  const tone = safeString(intent?.tone, "neutral");
  const isGreetingMix = Boolean(intent?.isGreeting);
  const kojnozoutState =
    outputState?.kojnozoutSnapshot ||
    outputState?.kojnozoutState ||
    intent?.kojnozoutState ||
    null;

  if (speaker === "kojnozout") {
    let bankKeys = ["koj_direct_status", "koj_direct_status_repeat"];

    try {
      const careModule = require("./MIA_KOJNOZROUT_CARE");
      if (kojnozoutState && typeof careModule.resolveVitalsBankKey === "function") {
        bankKeys = [careModule.resolveVitalsBankKey(kojnozoutState), ...bankKeys];
      }
    } catch (_err) {
      // optional module
    }

    if (tone === "sensitive" || tone === "serious") {
      return pickNamedBankText(
        outputState,
        ["koj_direct_status"],
        userLabel,
        "jsem tady a tentokrát spíš v klidnějším režimu"
      );
    }

    return pickNamedBankText(
      outputState,
      bankKeys,
      userLabel,
      "já dobrý. Jen pořád koukám po misce"
    );
  }

  const miaKeys = isGreetingMix
    ? ["mia_direct_greeting_status", "mia_direct_status", "mia_direct_status_repeat"]
    : ["mia_direct_status", "mia_direct_status_repeat"];

  if (tone === "sensitive" || tone === "serious") {
    return pickNamedBankText(
      outputState,
      ["mia_direct_status_sensitive", ...miaKeys],
      userLabel,
      "jsem tady a vnímám to citlivěji. Díky, že se ptáš"
    );
  }

  return pickNamedBankText(
    outputState,
    miaKeys,
    userLabel,
    "mám se dobře, díky za optání"
  );
}

function buildGreetingResponse(outputState, speaker = "mia", userLabel = "", intent = null) {
  const tone = safeString(intent?.tone, "neutral");
  const isKoj = speaker === "kojnozout";
  const bankKey = isKoj ? "koj_direct_greeting" : "mia_direct_greeting";
  const fallback = isKoj
    ? `${firstName(userLabel)}, čau. Já tě slyším taky.`
    : `${firstName(userLabel)}, ahoj. Jsem ráda, že jsi tady.`;

  const bankText = pickNamedBankText(outputState, bankKey, userLabel, fallback);
  if (bankText) return bankText;

  return pickRotationText(outputState, `${bankKey}_${tone}`, getBankVariants(bankKey), fallback);
}

function mentionsKojnozoutAlias(message = "") {
  const normalized = safeString(message).toLowerCase();
  const aliases = ["kojnozrout", "kojnozroute", "kojnozrote", "kojno", "zroute", "zrout"];
  return aliases.some((alias) => normalized.includes(alias));
}

function buildBotReplyRecallResponse(outputState, userLabel = "", intent = null) {
  const name = firstName(userLabel);
  const message = safeString(intent?.normalizedMessage);
  const askAboutKoj =
    Boolean(intent?.mentionsKojnozoutAlias) || mentionsKojnozoutAlias(message);

  let recalled = null;
  if (typeof sessionMemoryModule.getLastBotReplyToUser === "function") {
    recalled = askAboutKoj
      ? sessionMemoryModule.getLastBotReplyToUser(userLabel, "kojnozout")
      : sessionMemoryModule.getLastBotReplyToUser(userLabel, "mia") ||
        sessionMemoryModule.getLastBotReplyToUser(userLabel, "kojnozout");
  }

  if (recalled?.text) {
    const who = recalled.speaker === "kojnozout" ? "Kojnožrout" : "MIA";
    const quote = recalled.text.length > 180 ? `${recalled.text.slice(0, 177).trim()}…` : recalled.text;
    const variants = [
      `${name}, ${who} ti právě říkal: „${quote}“.`,
      `${name}, poslední věta od ${who === "Kojnožrout" ? "Kojnožrouta" : "MIA"} byla: „${quote}“.`,
      `${name}, jo — ${who} ti řekl: „${quote}“.`
    ];
    return pickRotationText(
      outputState,
      `bot_reply_recall_${recalled.speaker}`,
      variants,
      variants[0]
    );
  }

  return pickRotationText(
    outputState,
    "bot_reply_recall_missing",
    [
      `${name}, teď nemám čerstvou stopu v paměti. Zkus se zeptat znovu přímo Kojnožrouta — uvidí tě v chatu.`,
      `${name}, v posledních replikách nic nemám. Napiš Kojnožroutovi znovu, ať ti odpoví napřímo.`,
      `${name}, tohle teď nevidím zpětně. Zeptej se Kojnožrouta znovu — reaguje na tebe v chatu.`
    ],
    `${name}, teď nemám čerstvou stopu. Zkus se zeptat znovu Kojnožrouta.`
  );
}

function buildLlmSeedResponse(
  outputState,
  speaker = "mia",
  userLabel = "",
  intent = null,
  options = {}
) {
  const name = firstName(userLabel);
  const type = safeString(intent?.type, "direct_question");
  const isStreamerBoss = options.isStreamerBoss === true;

  if (speaker === "kojnozout") {
    return pickRotationText(
      outputState,
      `llm_seed_koj_${type}`,
      [`${name}, chvilku, přemýšlím.`],
      `${name}, chvilku, přemýšlím.`
    );
  }

  if (type === "story_request") {
    if (isStreamerBoss) {
      return pickRotationText(
        outputState,
        "llm_seed_story_boss",
        [
          `${name}, jdu na pohádku hned. Ty nemusíš nic plnit — jsi boss streamu, stačí povel.`,
          `${name}, chystám příběh. Žádný gift, žádný event — pro tebe to jede vždycky.`,
          `${name}, pohádka startuje hned. Spinák neplatí mýtné, to ví celý chat.`
        ],
        `${name}, jdu na pohádku hned. Ty nemusíš nic plnit — jsi boss streamu.`
      );
    }

    return pickRotationText(
      outputState,
      "llm_seed_story",
      [
        `${name}, dám ti pohádku hned — trvá to asi deset vteřin. Žádný gift nepotřebuješ.`,
        `${name}, chystám příběh. Počkej chvilku, do deseti vteřin uslyšíš celou pohádku.`,
        `${name}, jdu na to. Pohádka není za gift — za moment ji dostaneš celou.`
      ],
      `${name}, dám ti pohádku hned — trvá to asi deset vteřin.`
    );
  }

  return pickRotationText(
    outputState,
    `llm_seed_mia_${type}`,
    [`${name}, dobrá otázka — chvilku.`],
    `${name}, dobrá otázka — chvilku.`
  );
}

function buildStoryFallbackResponse(outputState, userLabel = "") {
  const name = firstName(userLabel);
  const variants = getBankVariants("mia_story_fallback").map((template) =>
    applyNameTemplate(template, name)
  );

  return pickRotationText(
    outputState,
    "mia_story_fallback",
    variants,
    `${name}, jedna pohádka hned: MIA s Kojnožroutem drželi stream v teplu a každý, kdo chtěl příběh, dostal ho bez giftu.`
  );
}

function applyStoryTextToActionResult(actionResult = {}, storyText = "", meta = {}) {
  const safeStory = normalizeText(storyText);
  if (!safeStory) return actionResult;

  const nextOverlay = {
    ...actionResult.overlayPayload,
    text: safeStory,
    meta: {
      ...(actionResult.overlayPayload?.meta || {}),
      ...meta
    }
  };

  return {
    ...actionResult,
    overlayPayload: nextOverlay,
    speech_text: safeStory,
    overlay_text: safeStory,
    responseContract: {
      ...(actionResult.responseContract || {}),
      speech_text: safeStory,
      overlay_text: safeStory,
      story_delivered: true
    }
  };
}

function buildFallbackDirectResponse(outputState, speaker = "mia", userLabel = "", intent = null) {
  return buildDiverseDirectResponse(outputState, speaker, userLabel, intent);
}

function buildDirectStatementResponse(outputState, speaker = "mia", userLabel = "", intent = null) {
  const tone = safeString(intent?.tone, "neutral");

  if (speaker === "kojnozout") {
    const bankKeys =
      tone === "serious" || tone === "sensitive"
        ? ["koj_direct_engagement_sensitive", "direct_kojnozout"]
        : ["koj_direct_engagement", "direct_kojnozout"];

    return pickNamedBankText(
      outputState,
      bankKeys,
      userLabel,
      "slyším tě taky — rozveď to, ať to chytím"
    );
  }

  const bankKeys =
    tone === "serious" || tone === "sensitive"
      ? ["mia_direct_engagement_sensitive", "mia_direct_statement", "mia_direct_question_named"]
      : tone === "playful"
        ? ["mia_direct_engagement_playful", "mia_direct_statement", "mia_direct_question_named"]
        : ["mia_direct_engagement", "mia_direct_statement", "mia_direct_question_named"];

  return pickNamedBankText(
    outputState,
    bankKeys,
    userLabel,
    "slyším tě — klidně to rozveď víc"
  );
}

function buildCareOfferResponse(outputState, speaker = "mia", userLabel = "", intent = null) {
  const isKoj = speaker === "kojnozout";
  const careBankKey = safeString(intent?.careBankKey);
  const bankKeys = isKoj
    ? careBankKey
      ? [careBankKey]
      : ["koj_feed_small", "koj_feed_medium"]
    : ["mia_care"];
  const fallback = isKoj
    ? `${firstName(userLabel)}, jo, to beru.`
    : `${firstName(userLabel)}, tohle se počítá.`;

  const text = pickNamedBankText(outputState, bankKeys, userLabel, fallback);
  const name = firstName(userLabel);
  if (name && !text.toLowerCase().includes(name.toLowerCase())) {
    return `${name}, ${text.charAt(0).toLowerCase()}${text.slice(1)}`;
  }
  return text;
}

function buildThanksResponse(outputState, speaker = "mia", userLabel = "", intent = null) {
  const isKoj = speaker === "kojnozout";
  const bankKey = isKoj ? "koj_direct_thanks" : "mia_direct_thanks";
  const fallback = isKoj
    ? `${firstName(userLabel)}, díky.`
    : `${firstName(userLabel)}, děkuju moc.`;

  return pickNamedBankText(outputState, bankKey, userLabel, fallback);
}

function buildSadnessResponse(outputState, speaker = "mia", userLabel = "", intent = null) {
  const bankKey =
    speaker === "kojnozout" ? "sadness_report_kojnozout" : "sadness_report_mia";
  const fallback =
    speaker === "kojnozout"
      ? "vnímám tě. Dneska spíš držím klid."
      : "mrzí mě, že je ti smutno. Když budeš chtít, napiš mi víc.";

  return pickNamedBankText(outputState, bankKey, userLabel, fallback);
}

function buildLossResponse(outputState, speaker = "mia", userLabel = "", intent = null) {
  const isPetLoss = Boolean(intent?.contextHints?.mentionsPet);

  if (speaker === "kojnozout") {
    const bankKey = isPetLoss ? "pet_loss_kojnozout" : "loss_report_kojnozout";
    const fallback = isPetLoss
      ? "to mě mrzí. Když odejde parťák, bolí to."
      : "to mě mrzí.";

    return pickNamedBankText(outputState, bankKey, userLabel, fallback);
  }

  const bankKey = isPetLoss ? "pet_loss_report_mia" : "loss_report_mia";
  const fallback = isPetLoss
    ? "to je mi líto. Když odejde zvířecí parťák, bolí to hodně."
    : "to je mi líto.";

  return pickNamedBankText(outputState, bankKey, userLabel, fallback);
}

function buildCommunityResponseText(outputState, speaker = "mia", input = {}) {
  const bankKey = safeString(input.bankKey) || "community_ping";
  const userLabel = firstName(input.userLabel);

  if (bankKey === "community_greeting") {
    const resolvedKey =
      speaker === "kojnozout" ? "community_greeting_kojnozout" : "community_greeting_mia";
    return pickNamedBankText(
      outputState,
      resolvedKey,
      userLabel,
      buildGreetingResponse(outputState, speaker, userLabel)
    );
  }

  if (bankKey === "community_illness") {
    if (speaker === "kojnozout") {
      return `${userLabel}, tak odpočívej. Já tady budu dělat dohled.`;
    }
    return `${userLabel}, hlavně odpočívej a dej se do kupy.`;
  }

  const resolvedKey = `${bankKey}_${speaker === "kojnozout" ? "kojnozout" : "mia"}`;
  const fallbackText =
    speaker === "kojnozout"
      ? `${userLabel} něco píše a já nastražil uši.`
      : `${userLabel}, vidím tě v chatu.`;

  return pickRotationText(outputState, resolvedKey, getBankVariants(resolvedKey), fallbackText);
}

function resolveSupportSpeakerBankKey(bankKey = "", speaker = "mia") {
  const speakerSuffix = speaker === "kojnozout" ? "kojnozout" : "mia";
  const key = safeString(bankKey);

  if (!key) {
    return `support_small_${speakerSuffix}`;
  }

  if (key === "support_spam_success") {
    return `support_spam_success_${speakerSuffix}`;
  }

  if (key === "support_spam_fail") {
    return `support_spam_fail_${speakerSuffix}`;
  }

  if (key === "support_full_bowl") {
    return `support_full_bowl_${speakerSuffix}`;
  }

  if (key === "support_small" || key === "support_medium" || key === "support_big") {
    return `${key}_${speakerSuffix}`;
  }

  if (key.endsWith(`_${speakerSuffix}`)) {
    return key;
  }

  return key;
}

function buildGiftMemoryLine(speaker = "mia", userLabel = "", giftName = "", input = {}) {
  const memory = input.giftMemory && typeof input.giftMemory === "object" ? input.giftMemory : null;
  if (!memory || toNumber(memory.totalGifts, 0) < 1) {
    return "";
  }

  // Phase 2: Director-gated thank variant from viewer-memory module.
  const direction = input.miaDirection || input.direction || null;
  const allowMemory =
    !direction ||
    direction.enabled === false ||
    direction.celebrate?.useViewerMemory === true ||
    toNumber(direction.intensity, 0) < 0.9;

  if (allowMemory && memory.source === "phase2_viewer_memory") {
    try {
      const viewerMemory = require("../core/viewer-memory");
      const line = viewerMemory.buildMemoryThankLine(memory, {
        userLabel,
        giftName,
        giftKey: input.giftKey || memory.currentGiftKey,
        speaker,
        firstSupport: direction?.celebrate?.firstSupport === true,
        leveledUp:
          memory.leveledUp === true ||
          input.viewerLeveledUp === true ||
          input.leveledUp === true
      });
      if (line) return line;
    } catch (_err) {
      /* fall through to legacy */
    }
  }

  if (toNumber(memory.totalGifts, 0) < 3) {
    return "";
  }

  const giftKey = safeString(
    input.giftKey || memory.currentGiftKey || input.giftMemory?.currentGiftKey
  ).toUpperCase();
  const favorite = safeString(memory.favoriteGift).toUpperCase();
  const care = safeString(input.giftCare || input.care).toUpperCase();
  const name = firstName(userLabel);
  const giftLabel = safeString(giftName, favorite || "dárek");
  const isKoj = speaker === "kojnozout";

  // Stejný oblíbený gift znovu (Tomino + Rose).
  if (favorite && giftKey && favorite === giftKey) {
    if (isKoj) {
      return `${name}, zase ${giftLabel}? Já už vím, že to je tvoje klasika. Díky.`;
    }
    return `${name}, dnes zase ${giftLabel}. Děkujeme — to je tvoje typická podpora.`;
  }

  // Krmič Kojnožrouta (CARE/PET/LOVE historie).
  if (
    memory.careRole === "feeder" &&
    (care === "CARE" || care === "PET" || care === "LOVE")
  ) {
    if (isKoj) {
      return `${name}, zase mě krmíš? Miska to miluje.`;
    }
    return `${name}, zase pečuješ o Kojnožrouta. On už za tebou běží.`;
  }

  return "";
}

function buildSupportResponseText(outputState, speaker = "mia", input = {}) {
  const userLabel = firstName(input.userLabel);
  const giftName = safeString(input.giftName, "gift");
  const tier = safeString(input.tier, "T1");
  const ackMode = safeString(input.supportAckMode, "full");
  const bankKey = safeString(input?.decision?.recommendedAction?.bankKey);
  const spamVerdict = input?.spamVerdict || {};
  const eventCount = toNumber(spamVerdict.eventCount, 0);
  const totalPoints = toNumber(spamVerdict.totalPoints, toNumber(input.totalCoins, 0));
  const preferredKey = resolveSupportSpeakerBankKey(bankKey, speaker);

  if (ackMode !== "silent" && input.skipGiftMemory !== true) {
    const memoryLine = buildGiftMemoryLine(speaker, userLabel, giftName, input);
    if (memoryLine) {
      return memoryLine;
    }
  }

  let fallbackText = "";

  if (ackMode === "brief") {
    fallbackText =
      speaker === "kojnozout"
        ? `${userLabel}, díky. Miska to registruje.`
        : `${userLabel}, díky za ${giftName}. Krmíte nás hezky.`;
  } else if (bankKey === "support_spam_success") {
    fallbackText =
      speaker === "kojnozout"
        ? tier === "T3"
          ? `${userLabel}, tohle už byla pořádná spamová hostina. Miska to slyšela až do dna.`
          : `${userLabel}, tohle byl pěkný spamový nášup. Já mám takové cinkání fakt rád.`
        : tier === "T3"
          ? `${userLabel}, děkuju. Tohle už byla opravdu silná společná vlna podpory pro Kojnožrouta.`
          : `${userLabel}, děkuju za tuhle společnou vlnu podpory. O Kojnožrouta je zase o kus lépe postaráno.`;
  } else if (bankKey === "support_spam_fail") {
    fallbackText =
      speaker === "kojnozout"
        ? eventCount >= 3
          ? `${userLabel}, tohle už mi cinká do misky pěkně za sebou. Ještě kousek a byl by z toho větší nášup.`
          : `${userLabel}, něco se tady rozjíždí. Já to slyším až ve fouskách.`
        : eventCount >= 3
          ? `${userLabel}, díky za tuhle vlnu podpory. Ještě kousek a ten nášup bude ještě výraznější.`
          : `${userLabel}, díky. Podpora se hezky skládá a Kojnožrout to vnímá.`;
  } else if (bankKey === "support_full_bowl") {
    fallbackText =
      speaker === "kojnozout"
        ? `${userLabel}, miska je plná. Tohle už je pořádná hostina.`
        : `${userLabel}, díky. Miska je plná a o Kojnožrouta je skvěle postaráno.`;
  } else {
    fallbackText =
      speaker === "kojnozout"
        ? tier === "T3"
          ? `${userLabel}, tohle bylo silný.`
          : totalPoints >= 150
            ? `${userLabel}, díky za ${giftName}. Pěkně to cinká do misky.`
            : `${userLabel}, díky za ${giftName}.`
        : tier === "T3"
          ? `${userLabel}, tohle byla silná podpora. Děkuji.`
          : `${userLabel}, děkuji za ${giftName}.`;
  }

  return pickRotationText(outputState, preferredKey, getBankVariants(preferredKey), fallbackText);
}

function buildEmotionResponse(outputState, speaker = "mia", userLabel = "", intent = null) {
  const emotionType = safeString(intent?.emotion?.type, "neutral");
  const domain = safeString(intent?.emotion?.domain, "general");
  const isKoj = speaker === "kojnozout";
  const speakerTag = isKoj ? "kojnozout" : "mia";

  const emotionBaseKeys = {
    stress: `emotion_stress_${speakerTag}`,
    frustration: `emotion_frustration_${speakerTag}`,
    joy: `emotion_joy_${speakerTag}`,
    relief: `emotion_relief_${speakerTag}`
  };

  const baseKey = emotionBaseKeys[emotionType];
  if (!baseKey) {
    return "";
  }

  let bankKey = resolveEmotionBankKey(baseKey, domain);

  if (!isKoj && emotionType === "stress") {
    const specificKey = `emotion_stress_mia_${domain}`;
    if (getBankVariants(specificKey).length > 0) {
      bankKey = specificKey;
    }
  }

  const fallbacks = {
    stress: isKoj
      ? "to zní jako stres. Budu teď spíš držet klid."
      : "to zní jako stres. Zkus to vzít postupně.",
    frustration: isKoj ? "chápu. Tohle umí člověka vytočit." : "chápu, že tě to štve.",
    joy: isKoj ? "tohle zní dobře." : "to je super!",
    relief: "tak to je aspoň úleva."
  };

  return pickNamedBankText(
    outputState,
    bankKey,
    userLabel,
    fallbacks[emotionType] || "vnímám tě."
  );
}

function buildOverlayPayload({
  owner = "mia",
  route = "community",
  stage = "community",
  text = "",
  subtext = "",
  user = "",
  giftName = "",
  tier = "",
  mood = "neutral",
  holdMs = 9000,
  meta = null
} = {}) {
  return {
    owner,
    route,
    stage,
    title: owner === "kojnozout" ? "Kojnožrout" : "MIA",
    text: normalizeText(text),
    subtext: normalizeText(subtext),
    user: safeString(user),
    giftName: safeString(giftName),
    tier: safeString(tier),
    mood: safeString(mood, "neutral"),
    holdMs: clampHoldMs(holdMs, 9000),
    meta: meta && typeof meta === "object" ? JSON.parse(JSON.stringify(meta)) : null
  };
}

function buildContract({
  speaker = "mia",
  route = "community",
  speechText = "",
  overlayText = "",
  input = {},
  intent = null,
  meta = null
} = {}) {
  const owner = speaker === "kojnozout" ? "kojnozout" : "mia";
  const safeSpeech = normalizeText(speechText);
  const safeOverlay = normalizeText(overlayText || speechText);
  const stage = safeString(input.stage, route === "support" ? "support" : "community");
  const payloadMeta = {
    source: "response_engine",
    speaker,
    intent: intent?.type || safeString(input.intentType),
    overlay_mode: overlayText && overlayText !== speechText ? "companion_text" : "speech_mirror",
    tone: safeString(intent?.tone),
    severity: safeString(intent?.severity),
    emotion: safeString(intent?.emotion?.type),
    emotion_domain: safeString(intent?.emotion?.domain),
    ...(meta && typeof meta === "object" ? meta : {})
  };

  const overlayPayload = buildOverlayPayload({
    owner,
    route,
    stage,
    text: safeOverlay,
    subtext: safeString(input.subtext, route),
    user: safeString(input.userLabel),
    giftName: safeString(input.giftName),
    tier: safeString(input.tier),
    mood: safeString(
      input.mood,
      safeString(intent?.moodHint, owner === "kojnozout" ? "playful" : "warm")
    ),
    holdMs: toNumber(input.holdMs, 5200),
    meta: payloadMeta
  });

  rememberLastText(input.outputState, owner, safeSpeech);

  return {
    ok: true,
    route,
    shouldPlayVideo: false,
    speaker,
    speech_text: safeSpeech,
    overlay_text: safeOverlay,
    overlayPayload,
    overlay: overlayPayload,
    responseContract: {
      speaker,
      speech_text: safeSpeech,
      overlay_text: safeOverlay,
      overlay_owner: owner,
      intent: intent?.type || safeString(input.intentType),
      overlay_mode: payloadMeta.overlay_mode
    }
  };
}

function buildDirectChatResponse(outputState, input = {}) {
  const message = safeString(input.message);
  const intent = resolveChatIntent(message);
  const requestedTarget = safeString(input.target || input.speaker).toLowerCase();
  const streamerAccess =
    typeof streamerAccessModule.resolveStreamerAccess === "function"
      ? streamerAccessModule.resolveStreamerAccess(
          input.userLabel,
          input.runtimeConfig || {}
        )
      : { isStreamerBoss: false };

  const speaker = requestedTarget === "kojnozout"
    ? "kojnozout"
    : requestedTarget === "mia"
      ? "mia"
      : intent.speakerHint === "kojnozout"
        ? "kojnozout"
        : "mia";

  let speechText = "";
  let overlayText = "";

  if (intent.type === "community_status_question") {
    speechText = buildCommunityStatusResponse(outputState, speaker, intent);
    overlayText =
      speaker === "kojnozout"
        ? "Kojnožrout zvedá hlavu a hlídá náladu chatu."
        : "MIA zdraví chat a čte náladu komunity.";
  } else if (intent.type === "direct_status_question") {
    speechText = buildDirectStatusResponse(outputState, speaker, input.userLabel, intent);
    overlayText = speechText;
  } else if (intent.type === "greeting") {
    speechText = buildGreetingResponse(outputState, speaker, input.userLabel, intent);
    overlayText = speechText;
  } else if (intent.type === "care_offer") {
    speechText = buildCareOfferResponse(outputState, speaker, input.userLabel, intent);
    overlayText = speechText;
  } else if (intent.type === "direct_thanks") {
    speechText = buildThanksResponse(outputState, speaker, input.userLabel, intent);
    overlayText = speechText;
  } else if (intent.type === "sadness_report") {
    speechText = buildSadnessResponse(outputState, speaker, input.userLabel, intent);
    overlayText = speechText;
  } else if (intent.type === "pet_loss_report" || intent.type === "loss_report") {
    speechText = buildLossResponse(outputState, speaker, input.userLabel, intent);
    overlayText = speechText;
  } else if (
    intent.type === "stress_report" ||
    intent.type === "frustration_report" ||
    intent.type === "joy_report" ||
    intent.type === "relief_report"
  ) {
    speechText = buildEmotionResponse(outputState, speaker, input.userLabel, intent);
    overlayText = speechText;
  } else if (intent.type === "bot_reply_recall") {
    speechText = buildBotReplyRecallResponse(outputState, input.userLabel, intent);
    overlayText = speechText;
  } else if (
    intent.type === "direct_question" ||
    intent.type === "knowledge_question" ||
    intent.type === "story_request"
  ) {
    speechText = buildLlmSeedResponse(outputState, speaker, input.userLabel, intent, {
      isStreamerBoss: streamerAccess.isStreamerBoss === true
    });
    overlayText = speechText;
  } else if (intent.type === "direct_statement" || intent.type === "emotional_statement") {
    speechText = buildDirectStatementResponse(outputState, speaker, input.userLabel, intent);
    overlayText = speechText;
  } else {
    speechText = buildFallbackDirectResponse(outputState, speaker, input.userLabel, intent);
    overlayText = speechText;
  }

  if (!speechText) {
    speechText = buildFallbackDirectResponse(outputState, speaker, input.userLabel, intent);
    overlayText = speechText;
  }

  if (isGenericResponse(speechText)) {
    speechText = intent.type === "community_status_question"
      ? buildCommunityStatusResponse(outputState, speaker, intent)
      : buildDiverseDirectResponse(outputState, speaker, input.userLabel, intent);
    overlayText = speechText;
  }

  const speechBeforeSession = speechText;
  speechText = enrichSpeechWithSessionMemory(speechText, outputState, {
    speaker,
    userLabel: input.userLabel,
    intent,
    message
  });
  const returningViewerAck = speechText !== speechBeforeSession;

  speechText = enrichSpeechWithCommunityVoice(speechText, outputState, {
    speaker,
    userLabel: input.userLabel,
    intent,
    message,
    returningViewerAck
  });
  overlayText = speechText;

  const contract = buildContract({
    speaker,
    route: "community",
    speechText,
    overlayText,
    input: {
      ...input,
      outputState,
      stage: "community",
      subtext: intent.type === "community_status_question" ? "community status" : "direct chat",
      mood: safeString(intent?.moodHint, speaker === "kojnozout" ? "playful" : "warm")
    },
    intent,
    meta: {
      target: requestedTarget || intent.addressedTo,
      direct_chat: true,
      priority: safeString(intent?.priority),
      returning_viewer: returningViewerAck,
      isStreamerBoss: streamerAccess.isStreamerBoss === true,
      storyNoGiftRequired: intent.type === "story_request"
    }
  });

  try {
    const reactionOrder = require("./MIA_KOJNOZROUT_REACTION_ORDER");
    if (
      typeof reactionOrder.shouldKojFollowMia === "function" &&
      typeof reactionOrder.buildKojEmotionalCompanion === "function" &&
      reactionOrder.shouldKojFollowMia(intent, speaker)
    ) {
      contract.deferredKojCompanion = reactionOrder.buildKojEmotionalCompanion(
        input.userLabel,
        intent
      );
    }
  } catch (_err) {
    /* optional module */
  }

  return contract;
}

function buildCommunityResponse(outputState, input = {}) {
  const speaker = safeString(input.speaker).toLowerCase() === "kojnozout" ? "kojnozout" : "mia";
  const speechText = buildCommunityResponseText(outputState, speaker, input);
  const overlayText = speechText;

  return buildContract({
    speaker,
    route: safeString(input.route, "community"),
    speechText,
    overlayText,
    input: {
      ...input,
      outputState,
      stage: safeString(input.stage, "community"),
      subtext: safeString(input.bankKey, "community")
    },
    intent: {
      type: safeString(input.bankKey || input.intentType || "community")
    },
    meta: {
      bankKey: safeString(input.bankKey)
    }
  });
}

function buildSupportResponse(outputState, input = {}) {
  const speaker = safeString(input.speaker).toLowerCase() === "kojnozout" ? "kojnozout" : "mia";
  const tier = safeString(input.tier, "T1");
  const ackMode = safeString(input.supportAckMode, "full");
  const memoryLine =
    ackMode !== "silent"
      ? buildGiftMemoryLine(speaker, input.userLabel, input.giftName, input)
      : "";
  const speechText =
    memoryLine ||
    buildSupportResponseText(outputState, speaker, {
      ...input,
      skipGiftMemory: true
    });
  const overlayText = speechText;

  const contract = buildContract({
    speaker,
    route: "support",
    speechText,
    overlayText,
    input: {
      ...input,
      outputState,
      stage: "support",
      subtext: safeString(input?.decision?.recommendedAction?.type, "support"),
      mood: speaker === "kojnozout" ? "excited" : "grateful"
    },
    intent: {
      type: safeString(input?.decision?.recommendedAction?.type || "support_reaction")
    },
    meta: {
      tier,
      intensity: toNumber(input.intensity, 1),
      giftMemoryApplied: Boolean(memoryLine)
    }
  });

  return {
    ...contract,
    shouldPlayVideo: Boolean(tier),
    tier,
    meta: {
      ...(contract.meta || {}),
      tier,
      intensity: toNumber(input.intensity, 1),
      giftMemoryApplied: Boolean(memoryLine)
    }
  };
}

function resolveActionResultText(actionResult = {}) {
  return safeString(
    actionResult.overlayPayload?.text ||
      actionResult.response?.text ||
      actionResult.speech_text ||
      actionResult.overlay_text
  );
}

function applyLlmTextToActionResult(actionResult, llmText, intent, llmResult, language = "") {
  const next = { ...actionResult };
  const enhanceMeta = {
    textSource: "llm_hybrid",
    llmReason: safeString(llmResult?.reason),
    llmModel: llmResult?.meta?.model || null,
    intentType: safeString(intent?.type),
    language: languageModule.normalizeLanguageCode(
      language || llmResult?.meta?.language,
      languageModule.resolveDefaultLanguage({})
    )
  };

  if (next.overlayPayload && typeof next.overlayPayload === "object") {
    next.overlayPayload = {
      ...next.overlayPayload,
      text: llmText,
      meta: { ...(next.overlayPayload.meta || {}), ...enhanceMeta }
    };
  }

  if (next.overlay && typeof next.overlay === "object") {
    next.overlay = { ...next.overlay, text: llmText };
  }

  if (next.response && typeof next.response === "object") {
    next.response = { ...next.response, text: llmText };
  }

  next.speech_text = llmText;
  next.overlay_text = llmText;
  next.responseContract = {
    ...(next.responseContract || {}),
    speech_text: llmText,
    overlay_text: llmText,
    llm_enhanced: true
  };
  next.meta = { ...(next.meta || {}), ...enhanceMeta };

  return next;
}

function resolveEventLanguage(ctx = {}, message = "") {
  return languageModule.normalizeLanguageCode(
    ctx.language ||
      ctx.normalizedEvent?.language ||
      languageModule.detectLanguage(message, {
        fallback: languageModule.resolveDefaultLanguage(ctx.runtimeConfig || {})
      }).code,
    languageModule.resolveDefaultLanguage(ctx.runtimeConfig || {})
  );
}

async function enhanceDirectChatWithLlm(actionResult = {}, ctx = {}) {
  if (!actionResult || typeof actionResult !== "object" || !llmAdapterModule?.generateReply) {
    return actionResult;
  }

  const message = safeString(ctx.message);
  if (!message) return actionResult;

  const intent = ctx.intent || resolveChatIntent(message);
  const currentText = resolveActionResultText(actionResult);
  const genericFallback = isGenericResponse(currentText);
  const eventLanguage = resolveEventLanguage(ctx, message);
  const homeLanguage = languageModule.resolveDefaultLanguage(ctx.runtimeConfig || {});
  const isForeignChat =
    eventLanguage &&
    languageModule.normalizeLanguageCode(eventLanguage, homeLanguage) !==
      languageModule.normalizeLanguageCode(homeLanguage, "cs");

  const streamerAccess =
    typeof streamerAccessModule.resolveStreamerAccess === "function"
      ? streamerAccessModule.resolveStreamerAccess(
          ctx.userLabel,
          ctx.runtimeConfig || {}
        )
      : { isStreamerBoss: false };

  const memorialTouch =
    typeof kissMemorialModule.shouldAttachMemorial === "function" &&
    kissMemorialModule.shouldAttachMemorial(
      message,
      ctx.normalizedEvent?.platform || ctx.platform || ""
    );

  const forceEligible =
    streamerAccess.isStreamerBoss === true ||
    isForeignChat === true ||
    memorialTouch === true;

  const eligible =
    typeof llmAdapterModule.isEligibleForLlm === "function" &&
    llmAdapterModule.isEligibleForLlm(intent, { genericFallback, forceEligible });

  if (!eligible) return actionResult;

  const speaker = safeString(
    actionResult.overlayPayload?.owner ||
      actionResult.response?.speaker ||
      actionResult.responseContract?.speaker,
    intent.speakerHint || "mia"
  ).toLowerCase() === "kojnozout"
    ? "kojnozout"
    : "mia";

  const llmResult = await llmAdapterModule.generateReply({
    message,
    intent,
    speaker,
    userLabel: ctx.userLabel,
    outputState: ctx.outputState,
    runtimeConfig: ctx.runtimeConfig,
    language: eventLanguage,
    platform: ctx.normalizedEvent?.platform || ctx.platform || "",
    normalizedEvent: ctx.normalizedEvent,
    genericFallback,
    forceEligible
  });

  if (!llmResult?.ok || !llmResult.text) {
    if (safeString(intent.type) === "story_request" && actionResult.overlayPayload) {
      const fallbackStory = buildStoryFallbackResponse(ctx.outputState, ctx.userLabel);
      if (fallbackStory) {
        return applyStoryTextToActionResult(actionResult, fallbackStory, {
          textSource: "text_bank_story",
          llmReason: safeString(llmResult?.reason, "llm_failed"),
          intentType: "story_request",
          isStreamerBoss: streamerAccess.isStreamerBoss === true,
          storyNoGiftRequired: true
        });
      }
    }
    return {
      ...actionResult,
      meta: {
        ...(actionResult.meta || {}),
        textSource: "text_bank_fallback",
        llmReason: safeString(llmResult?.reason, "llm_failed"),
        llmAttempted: true,
        intentType: safeString(intent.type)
      }
    };
  }

  return applyLlmTextToActionResult(
    actionResult,
    llmResult.text,
    intent,
    llmResult,
    resolveEventLanguage(ctx, message)
  );
}

async function buildDirectChatResponseAsync(outputState, input = {}) {
  const base = buildDirectChatResponse(outputState, input);
  return enhanceDirectChatWithLlm(base, {
    message: input.message,
    userLabel: input.userLabel,
    intent: resolveChatIntent(safeString(input.message)),
    outputState,
    runtimeConfig: input.runtimeConfig,
    language: input.language || input.normalizedEvent?.language,
    normalizedEvent: input.normalizedEvent
  });
}

function handleChatMessage(message, context = {}) {
  const result = buildDirectChatResponse(context.outputState || null, {
    target: context.target || context.speaker,
    userLabel: context.userLabel,
    message
  });

  return {
    text: result.speech_text,
    intent: resolveChatIntent(message),
    responseContract: result.responseContract,
    overlayPayload: result.overlayPayload
  };
}

module.exports = {
  handleChatMessage,
  buildDirectChatResponse,
  buildDirectChatResponseAsync,
  enhanceDirectChatWithLlm,
  buildCommunityResponse,
  buildSupportResponse,
  buildSupportResponseText,
  buildGiftMemoryLine,
  isGenericResponse,
  isStaleRegisterResponse,
  resolveChatIntent,
  buildStoryFallbackResponse
};