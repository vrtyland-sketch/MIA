"use strict";

/**
 * Prompt / caption builder for gift → animation.
 * Uses gift map identity + optional viewer words + MIA soft-neon art refs.
 */

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

const STAGE_ART = {
  miaHero: "/assets/mia/cyber/speak.png",
  miaLip: "/assets/mia/cyber/lip/01.png",
  /** Catalog / AI brief only — gift stage HTML uses miaHero + miaLip, not this PNG */
  miaGiftFace: "/assets/mia/masters/faces/gift.png",
  kojHappy: "/assets/kojnozrout/moods/kojnozout-happy.png",
  kojWarm: "/assets/kojnozrout/moods/kojnozout-warm.png",
  kojIdle: "/assets/kojnozrout/moods/kojnozout-idle.png",
  handProp: "/assets/kojnozrout/props/hand.png",
  ballProp: "/assets/kojnozrout/props/ball.png",
  lionMajestic: "/assets/gift-creatures/lion/majestic.png",
  lionRoar: "/assets/gift-creatures/lion/roar.png",
  universeCalm: "/assets/gift-creatures/universe/calm.png",
  universeSurge: "/assets/gift-creatures/universe/surge.png",
  galaxyCalm: "/assets/gift-creatures/galaxy/calm.png",
  galaxyBurst: "/assets/gift-creatures/galaxy/burst.png",
  bust: "37-stream-polish"
};

function giftMotif(giftKey = "", giftLabel = "") {
  const key = safeString(giftKey || giftLabel).toUpperCase();
  const label = safeString(giftLabel).toLowerCase();
  if (key === "LION" || /lev|lion|🦁/.test(label)) {
    return {
      id: "lion",
      emoji: "🦁",
      color: "#ffb020",
      accent: "#c77dff",
      creature: "lion",
      spectacle: "max",
      qualityTier: "mia_soft_neon_v3_lion_wau",
      sceneHint:
        "cinematic soft-neon purple-tech stage: majestic cyber-neon lion (true-alpha PNG) pets then roars; Koj fires purple eye-beam; MIA hologram reacts; belly energy flash + tech sparks",
      czechImprov: [
        "Lev přijal mazlení — a pak zařval!",
        "Královský lev na scéně",
        "WAU lev moment · MIA × Koj"
      ],
      beats: ["establish", "pet", "roar", "payoff"],
      art: {
        ...STAGE_ART,
        koj: STAGE_ART.kojHappy,
        creatureSprite: STAGE_ART.lionMajestic,
        creatureRoar: STAGE_ART.lionRoar
      }
    };
  }
  if (key === "ROSE" || /ruz|rose|🌹/.test(label)) {
    return {
      id: "rose",
      emoji: "🌹",
      color: "#ff4d6d",
      accent: "#b388ff",
      creature: "rose",
      spectacle: "mid",
      qualityTier: "mia_soft_neon_v2",
      sceneHint: "viewer offers a glowing rose in soft neon light with MIA hologram",
      czechImprov: ["Růže pro stream", "Něžný bloom moment", "Vůně v chatu"],
      beats: ["establish", "action", "payoff"],
      art: { ...STAGE_ART, koj: STAGE_ART.kojWarm }
    };
  }
  if (key === "GALAXY" || /galax|🌌/.test(label)) {
    return {
      id: "galaxy",
      emoji: "🌌",
      color: "#7c5cff",
      accent: "#5ee7ff",
      creature: "galaxy",
      spectacle: "high",
      qualityTier: "mia_soft_neon_v3_galaxy_wau",
      sceneHint:
        "cinematic soft-neon purple-tech stage: living cyber-neon galaxy spiral (true-alpha PNG) opens then bursts; Koj eye-beam; MIA hologram reacts; tech-energy spark flecks",
      czechImprov: ["Galaxie otevřena", "Hvězdný dárek", "Kosmos děkuje"],
      beats: ["establish", "open", "burst", "payoff"],
      art: {
        ...STAGE_ART,
        koj: STAGE_ART.kojHappy,
        creatureSprite: STAGE_ART.galaxyCalm,
        creatureRoar: STAGE_ART.galaxyBurst
      }
    };
  }
  if (key === "UNIVERSE" || /vesmir|universe|🌠/.test(label)) {
    return {
      id: "universe",
      emoji: "🌠",
      color: "#5b8cff",
      accent: "#c77dff",
      creature: "universe",
      spectacle: "max",
      qualityTier: "mia_soft_neon_v3_universe_wau",
      sceneHint:
        "cinematic soft-neon purple-tech stage: living micro-universe creature (true-alpha PNG) opens then surges; Koj purple eye-beam; MIA hologram reacts; belly energy flash + tech sparks",
      czechImprov: ["Celý vesmír!", "Legendární drop", "Energie z hvězd"],
      beats: ["establish", "open", "surge", "payoff"],
      art: {
        ...STAGE_ART,
        koj: STAGE_ART.kojHappy,
        creatureSprite: STAGE_ART.universeCalm,
        creatureRoar: STAGE_ART.universeSurge
      }
    };
  }
  if (key === "HEART" || key === "HEART_BIG" || /srdc|heart|❤/.test(label)) {
    return {
      id: "heart",
      emoji: "❤️",
      color: "#ff4d6d",
      accent: "#ff9ecd",
      creature: "heart",
      spectacle: "mid",
      qualityTier: "mia_soft_neon_v2",
      sceneHint: "viewer sends soft neon hearts floating upward past MIA hologram",
      czechImprov: ["Srdce přijato", "Warm vibes", "Love v chatu"],
      beats: ["establish", "action", "payoff"],
      art: { ...STAGE_ART, koj: STAGE_ART.kojWarm }
    };
  }
  return {
    id: "gift",
    emoji: "✨",
    color: "#7ee0ff",
    accent: "#c77dff",
    creature: "gift",
    spectacle: "simple",
    qualityTier: "mia_soft_neon_v2",
    sceneHint: "viewer celebrates with a glowing gift motif in MIA soft-neon stage",
    czechImprov: ["Dárek přijat!", "Energie stoupá", "Díky za support"],
    beats: ["establish", "action", "payoff"],
    art: { ...STAGE_ART, koj: STAGE_ART.kojIdle }
  };
}

function pickImprov(motif, seed = "") {
  const list = motif.czechImprov || ["Díky!"];
  let h = 0;
  const s = String(seed);
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return list[h % list.length];
}

/**
 * Build generation brief — structured so an AI video provider can plug in later.
 */
function buildPromptBrief(input = {}) {
  const giftKey = safeString(input.giftKey || input.giftName);
  const giftLabel = safeString(input.giftLabel || input.giftName, giftKey || "dárek");
  const username = safeString(input.username || input.userLabel, "Divák");
  const extraWords = safeString(input.extraWords || input.words);
  const motif = giftMotif(giftKey, giftLabel);
  const improv = pickImprov(motif, `${username}:${giftLabel}:${extraWords}`);

  const caption = extraWords
    ? `${username} · ${giftLabel} · ${extraWords}`
    : `${username} · ${giftLabel}`;

  const sceneLine = extraWords
    ? `${motif.sceneHint}; refined by viewer words: "${extraWords}"`
    : motif.sceneHint;

  // English prompt reserved for future AI video / image models.
  const aiVideoPrompt = [
    `10-second vertical stream animation, MIA soft neon purple-tech aesthetic`,
    `characters: MIA cyber hologram + Koj purple-tech companion + viewer avatar`,
    `profile photo of ${username} as hero avatar circle`,
    sceneLine,
    `gift identity: ${giftLabel} (${motif.emoji})`,
    `spectacle: ${motif.spectacle || "simple"}`,
    `storyboard: ${(motif.beats || ["establish", "action", "payoff"]).join(" → ")}`,
    `on-screen caption: ${caption}`,
    `no coins, no money, no purchase UI — celebration energy only`,
    `cinematic soft camera drift, particles, character acting`
  ].join(". ");

  return {
    giftKey: giftKey.toUpperCase() || motif.id.toUpperCase(),
    giftLabel,
    username,
    extraWords: extraWords || null,
    motif,
    caption,
    improvLine: improv,
    sceneLine,
    aiVideoPrompt,
    askChatPrompt: `@${username} napiš 1–3 slova do chatu pro animaci ${giftLabel} ${motif.emoji} (do ${Math.round(
      (Number(input.wordsTimeoutMs) || 20000) / 1000
    )} s)`
  };
}

module.exports = {
  giftMotif,
  buildPromptBrief,
  pickImprov,
  STAGE_ART
};
