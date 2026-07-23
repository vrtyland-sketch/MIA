"use strict";

/**
 * CENTRÁLNÍ EMOČNÍ VRSTVA
 * nic nepřepisuje – jen doplňuje informace
 */

const EMOTION_MAP = {
  grief: [
    "umrel",
    "zemrel",
    "odesel",
    "rip",
    "soustrast"
  ],

  sadness: [
    "smutno",
    "smutny",
    "je mi blbe",
    "mrzi me",
    "deprese",
    "neuspel",
    "neprosel",
    "nepovedlo"
  ],

  stress: [
    "stres",
    "bojim",
    "strach",
    "operace",
    "zkouska",
    "prace",
    "policie",
    "pokuta"
  ],

  anger: [
    "nasrany",
    "serou me",
    "zlobi",
    "deti zlobi"
  ],

  joy: [
    "radost",
    "vyhral",
    "dostal",
    "narodilo",
    "jednicku",
    "vyplata",
    "dnes jdeme"
  ],

  anticipation: [
    "tesim",
    "jdeme vecer",
    "pujdu na pivo",
    "do klubu"
  ]
};

function normalize(text = "") {
  return String(text)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function detectEmotion(message = "") {
  const normalized = normalize(message);

  for (const [emotion, keywords] of Object.entries(EMOTION_MAP)) {
    if (keywords.some(k => normalized.includes(k))) {
      return emotion;
    }
  }

  return "neutral";
}

function resolveEmotionContext(message) {
  const emotion = detectEmotion(message);

  return {
    emotion,

    intensity:
      emotion === "grief" ? "high" :
      emotion === "stress" ? "medium" :
      emotion === "sadness" ? "medium" :
      emotion === "joy" ? "high" :
      "low",

    responseMode:
      emotion === "grief" ? "empathetic_long" :
      emotion === "sadness" ? "empathetic" :
      emotion === "stress" ? "supportive" :
      emotion === "anger" ? "calming" :
      emotion === "joy" ? "energetic" :
      emotion === "anticipation" ? "hype" :
      "neutral"
  };
}

module.exports = {
  resolveEmotionContext
};