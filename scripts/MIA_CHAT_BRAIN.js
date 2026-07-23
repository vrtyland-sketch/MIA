"use strict";

function normalize(text = "") {
  return String(text || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s?!]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const MIA_ALIASES = [
  "mia",
  "mio",
  "miu",
  "mii",
  "myo",
  "maio",
  "mijo",
  "mojo",
  "mija",
  "miya",
  "mya",
  "miaa",
  "mie",
  "miii"
];

const KOJNOZROUT_ALIASES = [
  "kojnozrout",
  "kojnozroute",
  "kojnozrote",
  "kojnozrouta",
  "kojnozroutea",
  "kojno",
  "zroute",
  "zrout",
  "zroutku"
];

const STREAMER_ALIASES = [
  "spinaku",
  "spinak",
  "spiniaku",
  "spinakuu",
  "spinyaku",
  "spinyak"
];

const GREETINGS = [
  "ahoj",
  "cau",
  "cus",
  "zdar",
  "nazdar",
  "dobry",
  "dobry den",
  "dobry vecer",
  "dobry rano"
];

const COMMUNITY_PHRASES = [
  "jak se mate",
  "jak se mate vsichni",
  "co je noveho",
  "co je novyho",
  "jak to jde",
  "jak se dneska mate",
  "jak to vypada",
  "co se deje"
];

const STORY_PHRASES = [
  "vyprav",
  "povez",
  "poveď",
  "pribeh",
  "pohadk",
  "pohadku",
  "pohadka",
  "bajku",
  "bajka",
  "roman",
  "pohad",
  "story",
  "tale",
  "vymysli pribeh",
  "vymysli pohadku"
];

const KNOWLEDGE_PHRASES = [
  "co je",
  "co jsou",
  "co to je",
  "vysvetli",
  "vysvet",
  "jak funguje",
  "jak zni",
  "proc je",
  "proc jsou",
  "proc to",
  "pythagor",
  "matematik",
  "dejepis",
  "historie",
  "fyzik",
  "chemie",
  "biolog",
  "geograf",
  "rekl bys",
  "rekni mi",
  "napis mi",
  "ucitel",
  "skola",
  "vzorec",
  "veta o"
];

const STATUS_PHRASES = [
  "jak se mas",
  "jak se ma",
  "jak je",
  "jak je ti",
  "jak ti je",
  "jaky mas den",
  "jaky je den",
  "co delas",
  "co delas ted",
  "co u tebe",
  "co u tebe noveho",
  "jak to jde",
  "jak se citis",
  "co je s tebou",
  "jak se mas dnes",
  "jak se mas dneska",
  "jak se mas dnes vecer",
  "co je noveho u tebe"
];

const META_RECALL_PHRASES = [
  "co mi rekl",
  "co mi rekla",
  "co mi odpovedel",
  "co mi odpovedela",
  "co jsi mi rekl",
  "co jsi mi rekla",
  "co rekl koj",
  "co rekla mia",
  "co ti rekl",
  "co ti rekla",
  "pamatujes co",
  "co jsem dostal",
  "co dostala za odpoved",
  "co on rekl",
  "co ona rekla",
  "jak odpovedel",
  "jak odpovedela",
  "co psal koj",
  "co psala mia",
  "co napsal koj",
  "co napsala mia",
  "co znamena co rekl",
  "co znamena co rekla"
];

const CARE_PHRASES = [
  "chces nakrmit",
  "mam te nakrmit",
  "nakrmim te",
  "dostanes najist",
  "papej",
  "papani",
  "mas hlad",
  "nakrmit",
  "podrbat",
  "pohladit",
  "uklidnit te",
  "vylecit te"
];

const THANKS_PHRASES = [
  "dekuju",
  "diky",
  "dik",
  "diky moc",
  "dekuji"
];

const LOSS_WORDS = [
  "umrel",
  "umrela",
  "zemrel",
  "zemrela",
  "odesel",
  "odesla",
  "umrti",
  "smrt",
  "rip",
  "soustrast",
  "soucit"
];

const PET_WORDS = [
  "pes",
  "pejsek",
  "pejskovi",
  "pejska",
  "fenka",
  "kocka",
  "kocku",
  "kocour",
  "krecek",
  "kralik",
  "mazlicek",
  "hafan",
  "hafik",
  "zevcik",
  "jezevcik"
];

const SADNESS_WORDS = [
  "smutno",
  "smutny",
  "smutna",
  "mrzi me",
  "je mi blbe",
  "je mi smutno",
  "deprese",
  "unaveny",
  "unavena",
  "boli me to",
  "je mi do breku",
  "chce se mi brecet",
  "jsem zoufaly",
  "jsem zoufala",
  "je mi uzko",
  "je mi tesk"
];

const SERIOUS_WORDS = [
  ...LOSS_WORDS,
  "nemocnice",
  "rakovina",
  "nehoda",
  "mrtvy",
  "upřimnou",
  "uprimnou",
  "operace",
  "nador",
  "umira",
  "umiral"
];

const SOFT_SERIOUS_WORDS = [
  ...SADNESS_WORDS,
  "nemoc",
  "nemocny",
  "nemocna",
  "blbe",
  "boli",
  "stres",
  "strach",
  "bojim"
];

const PLAYFUL_WORDS = [
  "haha",
  "hehe",
  "lol",
  "xd",
  "lmao",
  "rofl",
  "umrel smichy",
  "chcipam smichy"
];

/* ============================== EMOTION LAYER ============================== */

const JOY_WORDS = [
  "mam radost",
  "jsem rada",
  "jsem stastny",
  "jsem stastna",
  "narodilo se",
  "dostal jsem",
  "dostala jsem",
  "prisla vyplata",
  "koupil jsem si auto",
  "koupila jsem si auto",
  "dostal jsem stene",
  "dostala jsem stene",
  "jednicku",
  "vyhral jsem",
  "vyhrala jsem",
  "tesim se",
  "jdeme do klubu",
  "pujdu na pivo",
  "vecer jdeme",
  "oslava"
];

const STRESS_WORDS = [
  "stres",
  "bojim se",
  "mam strach",
  "strach z operace",
  "cekam na operaci",
  "operace",
  "zkouska",
  "zkousky",
  "neprosel jsem",
  "neprosla jsem",
  "neudelal jsem",
  "neudelala jsem",
  "ridicak",
  "policie",
  "pokuta",
  "neprisly penize",
  "nemam penize",
  "dluh",
  "v praci problem",
  "prace me sere",
  "tlak",
  "nestiham"
];

const FRUSTRATION_WORDS = [
  "nastvany",
  "nastvana",
  "nasrany",
  "nasrana",
  "stvou me",
  "serou me",
  "deti zlobi",
  "rozbilo se mi auto",
  "rozbilo se to",
  "udelal jsem prusvih",
  "udelala jsem prusvih",
  "vsechno je na hovno"
];

const RELIEF_WORDS = [
  "ulevilo se mi",
  "dopadlo to dobre",
  "nakonec dobry",
  "uz je to v pohode",
  "vyslo to",
  "zvladl jsem to",
  "zvladla jsem to"
];

const FINANCIAL_WORDS = [
  "nemam penize",
  "neprisly penize",
  "prisla vyplata",
  "dluh",
  "pokuta",
  "penize"
];

const SCHOOL_WORDS = [
  "zkouska",
  "zkousky",
  "skola",
  "ve skole",
  "neprosel jsem",
  "neprosla jsem",
  "neudelal jsem ridicak",
  "neudelala jsem ridicak",
  "jednicku"
];

const WORK_WORDS = [
  "prace",
  "v praci",
  "sef",
  "smena",
  "vyplata",
  "kolega",
  "meeting",
  "porada"
];

const HEALTH_WORDS = [
  "nemoc",
  "nemocny",
  "nemocna",
  "nemocnice",
  "operace",
  "rakovina",
  "boli",
  "leky",
  "doktor",
  "doktoru",
  "vysetreni",
  "strach z operace"
];

function tokenize(message = "") {
  return normalize(message).split(" ").filter(Boolean);
}

function hasWholeWord(message, aliases) {
  const tokens = tokenize(message);
  return aliases.some((alias) => tokens.includes(normalize(alias)));
}

function hasPhrase(message, phrases) {
  const normalized = normalize(message);
  return phrases.some((phrase) => normalized.includes(normalize(phrase)));
}

function stripLeadingAddressAlias(message) {
  const normalized = normalize(message);
  const aliasPattern = new RegExp(
    `^(${[
      ...MIA_ALIASES,
      ...KOJNOZROUT_ALIASES,
      ...STREAMER_ALIASES
    ]
      .map((alias) => alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      .join("|")})\\b\\s*`
  );

  return normalized.replace(aliasPattern, "").trim();
}

function startsWithQuestionWord(message) {
  const normalized = normalize(message);
  return /^(jak|co|proc|kdy|kde|kolik|kdo|muzu|muze|mame|mam|myslis|umis|vis)\b/.test(normalized);
}

function hasQuestionWord(message) {
  const normalized = normalize(message);
  const stripped = stripLeadingAddressAlias(normalized);

  return (
    startsWithQuestionWord(normalized) ||
    startsWithQuestionWord(stripped) ||
    /\b(co mi .* rekl|co mi .* odpovedel|co myslis|proc je|proc to|jak to|kdo je|kde je)\b/.test(
      normalized
    )
  );
}

function hasQuestionMark(message) {
  return String(message || "").includes("?");
}

function isQuestion(message) {
  return hasQuestionMark(message) || hasQuestionWord(message);
}

function isGreeting(message) {
  return hasWholeWord(message, GREETINGS) || hasPhrase(message, GREETINGS);
}

function detectAddressedTo(message) {
  const normalized = normalize(message);
  const hasMia = hasWholeWord(normalized, MIA_ALIASES);
  const hasKoj = hasWholeWord(normalized, KOJNOZROUT_ALIASES);

  if (hasMia && hasKoj && (hasPhrase(normalized, META_RECALL_PHRASES) || /\bco mi .* rekl\b/.test(normalized))) {
    return "mia";
  }

  if (hasKoj) return "kojnozout";
  if (hasMia) return "mia";
  if (hasWholeWord(normalized, STREAMER_ALIASES)) return "mia";
  return "community";
}

function isPlayfulDeathJoke(message) {
  const normalized = normalize(message);
  return hasPhrase(normalized, PLAYFUL_WORDS);
}

function detectTone(message) {
  const normalized = normalize(message);

  if (isPlayfulDeathJoke(normalized)) {
    return "playful";
  }

  if (hasPhrase(normalized, SERIOUS_WORDS)) {
    return "serious";
  }

  if (hasPhrase(normalized, SOFT_SERIOUS_WORDS)) {
    return "sensitive";
  }

  return "neutral";
}

function detectSeverity(message, tone = "neutral") {
  const normalized = normalize(message);

  if (hasPhrase(normalized, LOSS_WORDS)) {
    return "high";
  }

  if (tone === "serious") {
    return "high";
  }

  if (tone === "sensitive" || hasPhrase(normalized, SOFT_SERIOUS_WORDS)) {
    return "medium";
  }

  return "low";
}

function detectEmotion(message, contextHints = {}) {
  const normalized = normalize(message);

  if (!contextHints.playfulDeathJoke && contextHints.mentionsLoss && contextHints.mentionsPet) {
    return "grief_pet";
  }

  if (!contextHints.playfulDeathJoke && contextHints.mentionsLoss) {
    return "grief";
  }

  if (hasPhrase(normalized, SADNESS_WORDS)) {
    return "sadness";
  }

  if (hasPhrase(normalized, STRESS_WORDS)) {
    return "stress";
  }

  if (hasPhrase(normalized, FRUSTRATION_WORDS)) {
    return "frustration";
  }

  if (hasPhrase(normalized, JOY_WORDS)) {
    return "joy";
  }

  if (hasPhrase(normalized, RELIEF_WORDS)) {
    return "relief";
  }

  return "neutral";
}

function detectDomain(message) {
  const normalized = normalize(message);

  if (hasPhrase(normalized, PET_WORDS)) return "pet";
  if (hasPhrase(normalized, HEALTH_WORDS)) return "health";
  if (hasPhrase(normalized, SCHOOL_WORDS)) return "school";

  if (
    hasPhrase(normalized, [
      "prisla vyplata",
      "neprisly penize",
      "nemam penize",
      "dluh",
      "pokuta",
      "penize",
      "vyplata"
    ])
  ) {
    return "finance";
  }

  if (hasPhrase(normalized, WORK_WORDS)) return "work";
  if (hasPhrase(normalized, FINANCIAL_WORDS)) return "finance";
  return "general";
}

function detectResponseMode(emotion = "neutral", tone = "neutral", direct = false) {
  if (emotion === "grief" || emotion === "grief_pet") return "empathetic_long";
  if (emotion === "sadness") return "empathetic";
  if (emotion === "stress") return "supportive";
  if (emotion === "frustration") return "calming";
  if (emotion === "joy") return "celebratory";
  if (emotion === "relief") return "warm_relief";
  if (tone === "serious") return "serious";
  if (tone === "sensitive") return "sensitive";
  return direct ? "direct_default" : "community_default";
}

function detectContextHints(message) {
  const normalized = normalize(message);

  return {
    mentionsPet: hasPhrase(normalized, PET_WORDS),
    mentionsLoss: hasPhrase(normalized, LOSS_WORDS),
    mentionsSadness: hasPhrase(normalized, SADNESS_WORDS),
    mentionsCare: hasPhrase(normalized, CARE_PHRASES),
    mentionsThanks: hasPhrase(normalized, THANKS_PHRASES),
    playfulDeathJoke: isPlayfulDeathJoke(normalized),
    mentionsJoy: hasPhrase(normalized, JOY_WORDS),
    mentionsStress: hasPhrase(normalized, STRESS_WORDS),
    mentionsFrustration: hasPhrase(normalized, FRUSTRATION_WORDS),
    mentionsRelief: hasPhrase(normalized, RELIEF_WORDS),
    domain: detectDomain(normalized)
  };
}

function isMetaRecallQuestion(message, addressedTo = "community") {
  const normalized = normalize(message);

  const recallPatterns = [
    /\bco mi .* rekl\b/,
    /\bco mi .* rekla\b/,
    /\bco mi .* odpovedel\b/,
    /\bco mi .* odpovedela\b/,
    /\bco jsi mi rekl\b/,
    /\bco jsi mi rekla\b/,
    /\bco rekl koj\b/,
    /\bco rekla mia\b/,
    /\bpamatujes co\b/,
    /\bjak odpovedel\b/,
    /\bjak odpovedela\b/,
    /\bco znamena co rekl\b/
  ];

  const matchesRecall =
    recallPatterns.some((pattern) => pattern.test(normalized)) ||
    hasPhrase(normalized, META_RECALL_PHRASES);

  if (!matchesRecall) {
    return false;
  }

  const mentionsKoj = hasWholeWord(normalized, KOJNOZROUT_ALIASES);
  const mentionsMia = hasWholeWord(normalized, MIA_ALIASES);

  return (
    addressedTo === "mia" ||
    mentionsKoj ||
    mentionsMia ||
    normalized.includes("rekl ze") ||
    normalized.includes("rekla ze") ||
    normalized.includes("videl me") ||
    normalized.includes("videla me") ||
    normalized.includes("vidis me") ||
    normalized.includes("videl te") ||
    normalized.includes("videla te")
  );
}

function detectIntentType(message, addressedTo = "community", tone = "neutral", contextHints = {}) {
  const normalized = normalize(message);
  const direct = addressedTo !== "community";
  const greetingOnly =
    isGreeting(normalized) &&
    !isQuestion(normalized) &&
    !contextHints.mentionsCare &&
    !contextHints.mentionsThanks &&
    !contextHints.mentionsLoss &&
    !contextHints.mentionsSadness &&
    !contextHints.mentionsStress &&
    !contextHints.mentionsFrustration &&
    !contextHints.mentionsJoy &&
    !contextHints.mentionsRelief;

  if (hasPhrase(normalized, STORY_PHRASES)) {
    return "story_request";
  }

  if (hasPhrase(normalized, KNOWLEDGE_PHRASES)) {
    return "knowledge_question";
  }

  if (isMetaRecallQuestion(normalized, addressedTo)) {
    return "bot_reply_recall";
  }

  if (hasPhrase(normalized, COMMUNITY_PHRASES)) {
    if (!direct || normalized.includes("vsichni") || normalized.includes("mate")) {
      return "community_status_question";
    }
  }

  if (contextHints.mentionsCare && addressedTo === "kojnozout") {
    return "care_offer";
  }

  if (contextHints.mentionsThanks && direct) {
    return "direct_thanks";
  }

  if (!contextHints.playfulDeathJoke && contextHints.mentionsLoss && contextHints.mentionsPet) {
    return "pet_loss_report";
  }

  if (!contextHints.playfulDeathJoke && contextHints.mentionsLoss) {
    return "loss_report";
  }

  if (contextHints.mentionsSadness) {
    return "sadness_report";
  }

  if (contextHints.mentionsStress) {
    return "stress_report";
  }

  if (contextHints.mentionsFrustration) {
    return "frustration_report";
  }

  if (contextHints.mentionsJoy) {
    return "joy_report";
  }

  if (contextHints.mentionsRelief) {
    return "relief_report";
  }

  if (hasPhrase(normalized, STATUS_PHRASES)) {
    return "direct_status_question";
  }

  if (direct && isQuestion(normalized)) {
    return "direct_question";
  }

  if (greetingOnly) {
    return "greeting";
  }

  if (!direct && isQuestion(normalized)) {
    return "community_status_question";
  }

  if (direct) {
    return "direct_statement";
  }

  if (tone === "serious" || tone === "sensitive") {
    return "emotional_statement";
  }

  return "statement";
}

function detectMoodHint(tone = "neutral", addressedTo = "community", emotion = "neutral") {
  if (emotion === "joy") return "excited";
  if (emotion === "relief") return "warm";
  if (emotion === "grief" || emotion === "grief_pet") return "serious";
  if (emotion === "sadness" || emotion === "stress" || emotion === "frustration") return "warm";
  if (tone === "serious") return "serious";
  if (tone === "sensitive") return "warm";
  if (addressedTo === "kojnozout") return "playful";
  return "warm";
}

function detectPriority(message, addressedTo = "community", tone = "neutral", contextHints = {}) {
  if (contextHints.mentionsLoss) return "high";
  if (contextHints.mentionsStress && contextHints.domain === "health") return "high";
  if (tone === "serious") return "high";
  if (addressedTo !== "community") return "medium";
  if (isQuestion(message)) return "medium";
  return "low";
}

function resolveChatIntent(message = "") {
  const normalized = normalize(message);
  let addressedTo = detectAddressedTo(normalized);

  if (
    isMetaRecallQuestion(normalized, addressedTo) ||
    (hasPhrase(normalized, META_RECALL_PHRASES) && addressedTo === "kojnozout")
  ) {
    addressedTo = "mia";
  }

  const speakerHint = addressedTo === "kojnozout" ? "kojnozout" : "mia";
  const direct = addressedTo !== "community";
  const tone = detectTone(normalized);
  const severity = detectSeverity(normalized, tone);
  const contextHints = detectContextHints(normalized);
  const emotion = detectEmotion(normalized, contextHints);
  const type = detectIntentType(normalized, addressedTo, tone, contextHints);
  const moodHint = detectMoodHint(tone, addressedTo, emotion);
  const priority = detectPriority(normalized, addressedTo, tone, contextHints);
  const responseMode = detectResponseMode(emotion, tone, direct);

  return {
    type,
    addressedTo,
    speakerHint,
    direct,
    normalizedMessage: normalized,
    tone,
    severity,
    moodHint,
    priority,
    responseMode,
    contextHints,
    emotion: {
      type: emotion,
      domain: contextHints.domain,
      responseMode,
      intensity: severity
    },
    hasQuestionMark: hasQuestionMark(message),
    isQuestion: isQuestion(normalized),
    isGreeting: isGreeting(normalized),
    mentionsStreamerAlias: hasWholeWord(normalized, STREAMER_ALIASES),
    mentionsMiaAlias: hasWholeWord(normalized, MIA_ALIASES),
    mentionsKojnozoutAlias: hasWholeWord(normalized, KOJNOZROUT_ALIASES)
  };
}

function decideChatReaction({ message = "", userId = "", userLabel = "" } = {}) {
  const intent = resolveChatIntent(message);
  const speaker = intent.addressedTo === "kojnozout" ? "kojnozout" : "mia";
  const target = intent.addressedTo === "community" ? "mia" : intent.addressedTo;

  return {
    ok: true,
    userId,
    userLabel,
    raw: message,
    intent,
    target,
    speaker,
    direct: intent.direct,
    addressedTo: intent.addressedTo,
    tone: intent.tone,
    severity: intent.severity,
    priority: intent.priority
  };
}

module.exports = {
  normalize,
  resolveChatIntent,
  decideChatReaction
};