"use strict";

const responseEngine = require("../../scripts/MIA_RESPONSE_ENGINE");
const { isDualVoiceEnabled } = require("../../scripts/MIA_DUAL_VOICE");

let vitalsCompanionModule = null;

function getVitalsCompanionModule() {
  if (vitalsCompanionModule) return vitalsCompanionModule;
  try {
    vitalsCompanionModule = require("../../scripts/MIA_KOJNOZROUT_VITALS_COMPANION");
  } catch (_err) {
    vitalsCompanionModule = {};
  }
  return vitalsCompanionModule;
}

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function cloneJson(value, fallback = null) {
  try {
    return JSON.parse(JSON.stringify(value));
  } catch (err) {
    return fallback;
  }
}

function normalizeText(value) {
  return safeString(value).replace(/\s+/g, " ").trim();
}

function normalizeOverlayHoldMs(value, fallback) {
  const n = Number(value);
  if (Number.isFinite(n) && n > 0) {
    return n;
  }
  return fallback;
}

const OVERLAY_HOLD_MS = {
  supportKoj: 11000,
  supportMia: 10000,
  supportCompanion: 9000,
  community: 8500,
  comment: 8000
};

function pickUserLabel(event = {}) {
  const user = event.user || {};
  return (
    safeString(user.nickname) ||
    safeString(user.username) ||
    safeString(user.displayName) ||
    safeString(user.name) ||
    safeString(event.userLabel) ||
    "někdo"
  );
}

function firstName(label = "") {
  const normalized = normalizeText(label);
  if (!normalized) return "někdo";
  return normalized.split(/\s+/)[0] || normalized;
}

function pickGiftName(event = {}) {
  const support = event.support || {};
  return (
    safeString(support.giftName) ||
    safeString(event.giftName) ||
    safeString(event.gift) ||
    "gift"
  );
}

function pickTier(decision = {}, event = {}) {
  const fromDecision = safeString(decision.tier).toUpperCase();
  if (fromDecision) return fromDecision;

  const fromSupport = safeString(event?.support?.tier).toUpperCase();
  if (fromSupport) return fromSupport;

  const fromSpam = safeString(
    decision?.spamVerdict?.spamRewardTier || decision?.spamVerdict?.rewardTier
  ).toUpperCase();
  if (fromSpam) return fromSpam;

  return "";
}

function pickSpeaker(decision = {}) {
  const speaker = safeString(decision.speaker, "mia").toLowerCase();
  return speaker === "kojnozout" ? "kojnozout" : "mia";
}

function resolveGiftMemoryForEvent(event = {}) {
  try {
    // Phase 2 local viewer-memory first (safe stats JSON).
    try {
      const viewerMemory = require("../../core/viewer-memory");
      const local = viewerMemory.getViewer({
        userId: event.user?.id || event.userId,
        name:
          event.user?.nickname ||
          event.user?.displayName ||
          event.user?.name ||
          event.nickname ||
          event.userLabel
      });
      if (local && toNumber(local.giftCount, 0) > 0) {
        return viewerMemory.toGiftMemoryShape(
          local,
          safeString(event.support?.giftKey || event.support?.giftMap?.giftKey || event.gift?.name)
        );
      }
      if (event.viewerMemoryShape) return event.viewerMemoryShape;
      if (event.viewerMemory) {
        return viewerMemory.toGiftMemoryShape(
          event.viewerMemory,
          safeString(event.support?.giftKey || event.gift?.name)
        );
      }
    } catch (_vmErr) {
      /* fall through */
    }

    const gifts = require("../../shared/gifts");
    if (typeof gifts.getViewerMemory !== "function") return null;
    const memory = gifts.getViewerMemory({
      platform: event.platform || event.support?.economy?.platform,
      displayName:
        event.user?.nickname ||
        event.user?.displayName ||
        event.nickname ||
        event.userLabel
    });
    if (!memory) return null;
    return {
      ...memory,
      currentGiftKey: safeString(event.support?.giftKey || event.support?.giftMap?.giftKey)
    };
  } catch (_err) {
    return null;
  }
}

function pickMood(kojnozoutState = {}) {
  return safeString(kojnozoutState?.mood, "neutral").toLowerCase();
}

function pickStage(kojnozoutState = {}) {
  return safeString(kojnozoutState?.stage, "idle").toLowerCase();
}

function resolveSupportBurstCount(decision = {}, event = {}) {
  const spamVerdict = decision?.spamVerdict || {};
  const contributorCount = toNumber(spamVerdict.contributorCount, 0);
  const eventCount = toNumber(spamVerdict.eventCount, 0);
  const repeatCount = toNumber(event?.support?.repeatCount, 1);

  if (contributorCount > 1) {
    return contributorCount;
  }

  if (eventCount > 1) {
    return eventCount;
  }

  return Math.max(1, repeatCount);
}

function resolveSupportTotalCoins(decision = {}, event = {}) {
  const spamVerdict = decision?.spamVerdict || {};
  return Math.max(
    0,
    toNumber(
      spamVerdict.totalCoins,
      toNumber(
        spamVerdict.totalPoints,
        toNumber(
          event?.support?.totalCoins,
          toNumber(event?.support?.coins, toNumber(event?.support?.rawValue, 0))
        )
      )
    )
  );
}

function resolveSupportBankKey(decision = {}, event = {}) {
  const reason = safeString(decision.reason).toUpperCase();
  const tier = pickTier(decision, event);

  if (reason === "SUPPORT_FULL_BOWL") {
    return "support_full_bowl";
  }

  if (reason === "SUPPORT_SPAM_REWARD") {
    return "support_spam_success";
  }

  if (reason === "SUPPORT_SPAM_BUILDUP") {
    return "support_spam_fail";
  }

  if (reason === "SUPPORT_DIRECT_INTERRUPT") {
    return "support_spam_success";
  }

  if (tier === "T4" || tier === "T3") {
    return "support_big";
  }

  if (tier === "T2") {
    return "support_medium";
  }

  return "support_small";
}

function resolveSupportActionType(decision = {}, event = {}) {
  const reason = safeString(decision.reason).toUpperCase();
  const tier = pickTier(decision, event);

  if (reason === "SUPPORT_FULL_BOWL") {
    return "full_bowl_reaction";
  }

  if (reason === "SUPPORT_SPAM_REWARD") {
    return "support_spam_reward";
  }

  if (reason === "SUPPORT_SPAM_BUILDUP") {
    return "support_spam_buildup";
  }

  if (reason === "SUPPORT_DIRECT_INTERRUPT") {
    return "support_direct_interrupt";
  }

  if (tier === "T4") {
    return "support_hype";
  }

  return "support_reaction";
}

function buildOverlayPayloadFromText(owner, ctx = {}, text = "", extra = {}) {
  const normalizedText = normalizeText(text);
  if (!normalizedText) return null;

  const decision = ctx.decision || {};
  const event = ctx.event || {};
  const kojnozoutState = ctx.kojnozoutState || {};
  const route = safeString(decision.route, "community");
  const speaker = owner === "kojnozout" ? "kojnozout" : "mia";

  return {
    owner: speaker,
    route,
    title: speaker === "kojnozout" ? "Kojnožrout" : "MIA",
    text: normalizedText,
    subtext: safeString(extra.subtext || extra.action || decision.reason),
    user: safeString(extra.user || pickUserLabel(event)),
    giftName: safeString(extra.giftName || pickGiftName(event)),
    tier: safeString(extra.tier || pickTier(decision, event)),
    mood: safeString(extra.mood || pickMood(kojnozoutState)),
    stage: safeString(extra.stage || pickStage(kojnozoutState)),
    bowlPercent: toNumber(kojnozoutState?.bowlPercent, 0),
    bowlVisualLevel: safeString(kojnozoutState?.bowlVisualLevel, "empty"),
    hunger: toNumber(kojnozoutState?.hunger, 0),
    energy: toNumber(kojnozoutState?.energy, 0),
    socialState: toNumber(kojnozoutState?.socialState, 0),
    holdMs: normalizeOverlayHoldMs(
      extra.holdMs,
      route === "support"
        ? (speaker === "kojnozout" ? OVERLAY_HOLD_MS.supportKoj : OVERLAY_HOLD_MS.supportMia)
        : OVERLAY_HOLD_MS.community
    ),
    action: safeString(extra.action),
    meta: {
      speaker,
      reason: safeString(decision.reason),
      decisionType: safeString(decision.decisionType),
      shouldPlayVideo: Boolean(decision.shouldPlayVideo),
      companion: Boolean(extra.companion),
      textSource: safeString(extra.textSource, "action_builder"),
      companionReason: safeString(decision?.actorRoles?.companionReason),
      primarySpeakerPolicy: safeString(decision?.meta?.primarySpeakerPolicy)
    }
  };
}

function buildSupportCompanionText(
  companion,
  decision = {},
  event = {},
  bowlPercent = 0,
  outputState = null
) {
  const vitalsPlan = decision?.meta?.vitalsCompanion;
  if (companion === "mia" && vitalsPlan?.enabled) {
    const vitalsCompanion = getVitalsCompanionModule();
    if (typeof vitalsCompanion.buildMiaVitalsCompanionText === "function") {
      const line = vitalsCompanion.buildMiaVitalsCompanionText({
        vitalsCompanion: vitalsPlan,
        event,
        decision
      });
      if (line) return line;
    }
  }

  if (companion === "mia") {
    try {
      const responseEngine = require("../../scripts/MIA_RESPONSE_ENGINE");
      if (typeof responseEngine.buildSupportResponseText === "function") {
        return responseEngine.buildSupportResponseText(outputState || {}, "mia", {
          userLabel: pickUserLabel(event),
          giftName: pickGiftName(event),
          giftKey: safeString(event?.support?.giftKey),
          giftCare: safeString(event?.support?.giftCare),
          giftMemory: resolveGiftMemoryForEvent(event),
          tier: pickTier(decision, event),
          supportAckMode: safeString(decision?.meta?.supportAckMode, "full"),
          decision,
          spamVerdict: decision?.spamVerdict || {}
        });
      }
    } catch (_err) {
      // fall through to inline companion lines
    }
  }

  const name = firstName(pickUserLabel(event));
  const giftName = pickGiftName(event);
  const tier = pickTier(decision, event);
  const reason = safeString(decision.reason).toUpperCase();
  const spamVerdict = decision?.spamVerdict || {};
  const eventCount = toNumber(spamVerdict.eventCount, 0);
  const totalPoints = toNumber(spamVerdict.totalPoints, 0);

  if (reason === "SUPPORT_SPAM_BUILDUP") {
    if (companion === "kojnozout") {
      if (eventCount >= 3) {
        return `${name}, tohle už mi cinká do misky pěkně v kuse. Ještě trochu a budu se culit ještě víc.`;
      }
      return `${name}, něco se tady rozjíždí. Já to slyším až ve fouskách.`;
    }

    if (eventCount >= 3) {
      return `${name}, díky za tuhle vlnu podpory. Ještě kousek a ten nášup bude ještě výraznější.`;
    }

    return `${name}, díky. Podpora se hezky skládá a Kojnožrout to vnímá.`;
  }

  if (reason === "SUPPORT_SPAM_REWARD" || reason === "SUPPORT_DIRECT_INTERRUPT") {
    if (companion === "kojnozout") {
      if (tier === "T3") {
        return `${name}, tohle už je pořádná spamová hostina. Miska to slyšela až do dna.`;
      }
      return `${name}, tohle byl pěkný spamový nášup. Já mám takové cinkání fakt rád.`;
    }

    if (tier === "T3") {
      return `${name}, děkuju. Tohle už byla opravdu silná společná vlna podpory pro Kojnožrouta.`;
    }

    return `${name}, děkuju za tuhle společnou vlnu podpory. O Kojnožrouta je zase o kus lépe postaráno.`;
  }

  if (reason === "SUPPORT_FULL_BOWL" || bowlPercent >= 95) {
    if (companion === "kojnozout") {
      return `${name}, miska je plná. Tohle už je hostina jak sviň.`;
    }
    return `${name}, děkuju za péči o Kojnožrouta. Miska je plná a já to beru jako krásný moment pro něj.`;
  }

  if (companion === "kojnozout") {
    if (tier === "T4") {
      return `${name}, tohle je obrovský nášup. To se fakt povedlo.`;
    }
    if (tier === "T3") {
      return `${name}, tohle už je pořádná porce.`;
    }
    if (tier === "T2") {
      return `${name}, díky za ${giftName}. To už má hezkou váhu.`;
    }
    if (totalPoints >= 150) {
      return `${name}, pěkně to cinká. Já si toho všímám.`;
    }
    return `${name}, tohle mi udělalo dobře.`;
  }

  if (tier === "T4") {
    return `${name}, děkuju. To je obrovská péče o Kojnožrouta a je to znát.`;
  }

  if (tier === "T3") {
    return `${name}, děkuju. Tohle už je velká péče o Kojnožrouta.`;
  }

  if (tier === "T2") {
    return `${name}, díky za ${giftName}. O Kojnožrouta je zase o kus lépe postaráno.`;
  }

  return `${name}, díky za ${giftName}. Péče o Kojnožrouta se počítá.`;
}

function buildFallbackPrimaryText(ctx = {}) {
  const decision = ctx.decision || {};
  const event = ctx.event || {};
  const speaker = pickSpeaker(decision);
  const reason = safeString(decision.reason).toUpperCase();
  const userLabel = pickUserLabel(event);
  const name = firstName(userLabel);
  const giftName = pickGiftName(event);
  const tier = pickTier(decision, event);
  const spamVerdict = decision?.spamVerdict || {};
  const eventCount = toNumber(spamVerdict.eventCount, 0);
  const totalPoints = toNumber(spamVerdict.totalPoints, 0);

  if (safeString(decision.route) === "support") {
    if (reason === "SUPPORT_FULL_BOWL") {
      return speaker === "kojnozout"
        ? `${name}, miska je plná. Tohle už je pořádná hostina.`
        : `${name}, díky. Miska je plná a o Kojnožrouta je skvěle postaráno.`;
    }

    if (reason === "SUPPORT_SPAM_BUILDUP") {
      return speaker === "kojnozout"
        ? eventCount >= 3
          ? `${name}, tohle už mi cinká do misky pěkně za sebou. Ještě chvíli a byl by z toho větší nášup.`
          : `${name}, slyším další cinknutí. To se mi líbí.`
        : eventCount >= 3
          ? `${name}, díky za tuhle vlnu podpory. Ještě kousek a ten nášup bude ještě výraznější.`
          : `${name}, díky. Podpora se hezky skládá a Kojnožrout to vnímá.`;
    }

    if (reason === "SUPPORT_SPAM_REWARD" || reason === "SUPPORT_DIRECT_INTERRUPT") {
      return speaker === "kojnozout"
        ? tier === "T3"
          ? `${name}, tohle už byla pořádná spamová hostina. Miska to slyšela až do dna.`
          : `${name}, tak tohle byl pěkný spamový nášup. Já mám takové cinkání fakt rád.`
        : tier === "T3"
          ? `${name}, děkuju. Tohle už byla opravdu silná společná vlna podpory pro Kojnožrouta.`
          : `${name}, děkuju za tuhle společnou vlnu podpory. O Kojnožrouta je zase o kus lépe postaráno.`;
    }

    if (speaker === "kojnozout") {
      if (tier === "T4") {
        return `${name}, tohle byla neskutečná hostina.`;
      }
      if (tier === "T3") {
        return `${name}, tohle už je poctivý nášup.`;
      }
      if (tier === "T2") {
        return `${name}, díky za ${giftName}. To už mi zvedlo náladu.`;
      }
      if (totalPoints >= 150) {
        return `${name}, pěkně to cinká. Já si toho všímám.`;
      }
      return `${name}, díky za ${giftName}. Beru to všemi vousy.`;
    }

    if (tier === "T4") {
      return `${name}, tohle je obrovská péče o Kojnožrouta. Děkuju.`;
    }
    if (tier === "T3") {
      return `${name}, tohle byla silná podpora. Děkuji.`;
    }
    if (tier === "T2") {
      return `${name}, díky za ${giftName}. O Kojnožrouta je zase líp postaráno.`;
    }
    return `${name}, díky za ${giftName}. Péče o Kojnožrouta se počítá.`;
  }

  if (reason === "COMMUNITY_GREETING_DUAL") {
    return speaker === "kojnozout"
      ? `${name} je tady. To se mám ke komu přitulit.`
      : `${name}, ahoj. Jsem ráda, že jsi tady.`;
  }

  if (reason === "COMMUNITY_ILLNESS_DUAL") {
    return speaker === "kojnozout"
      ? `${name}, tak odpočívej. Já ti tu budu dělat dohled.`
      : `${name}, hlavně odpočívej a kurýruj se.`;
  }

  if (reason === "COMMUNITY_DIRECT_PING") {
    return speaker === "kojnozout"
      ? `${name}, slyším tě taky.`
      : `${name}, jsem tady a vnímám tě.`;
  }

  if (reason === "COMMUNITY_FOLLOW") {
    return speaker === "kojnozout"
      ? `${name} je tu? Tak to mám komu skočit do klína.`
      : `${name}, vítej. Jsem ráda, že jsi tady.`;
  }

  if (reason === "COMMUNITY_SHARE") {
    return speaker === "kojnozout"
      ? `${name} to poslal dál. To se počítá.`
      : `${name}, díky, že to posíláš dál.`;
  }

  if (reason === "COMMUNITY_LIKE") {
    return speaker === "kojnozout"
      ? `${name}, tohle jsem zaregistroval taky.`
      : `${name}, díky za podporu.`;
  }

  if (reason === "COMMUNITY_COMMENT") {
    return speaker === "kojnozout"
      ? `${name} něco píše a já nastražil uši.`
      : `${name}, vidím tě v chatu.`;
  }

  return "";
}

function buildBankedPrimaryResponse(ctx = {}) {
  const decision = ctx.decision || {};
  const event = ctx.event || {};
  const outputState = ctx.outputState || {};
  const speaker = pickSpeaker(decision);
  const reason = safeString(decision.reason).toUpperCase();
  const userLabel = pickUserLabel(event);
  const giftName = pickGiftName(event);
  const tier = pickTier(decision, event);
  const intensity = toNumber(decision.intensity, 1);
  const bowlPercent = toNumber(ctx?.kojnozoutState?.bowlPercent, 0);

  try {
    if (
      (reason === "SUPPORT_RESOLVED" ||
        reason === "SUPPORT_FULL_BOWL" ||
        reason === "SUPPORT_SPAM_REWARD" ||
        reason === "SUPPORT_SPAM_BUILDUP" ||
        reason === "SUPPORT_DIRECT_INTERRUPT") &&
      responseEngine &&
      typeof responseEngine.buildSupportResponse === "function"
    ) {
      return responseEngine.buildSupportResponse(outputState, {
        route: "support",
        speaker,
        tier,
        intensity,
        userLabel,
        giftName,
        giftKey: safeString(event?.support?.giftKey),
        giftCare: safeString(event?.support?.giftCare),
        giftMemory: resolveGiftMemoryForEvent(event),
        miaDirection: event?.miaDirection || null,
        bowlPercent,
        supportAckMode: safeString(decision?.meta?.supportAckMode, "full"),
        burstCount: resolveSupportBurstCount(decision, event),
        totalCoins: resolveSupportTotalCoins(decision, event),
        spamVerdict: cloneJson(decision?.spamVerdict, null),
        decision: {
          reason,
          recommendedAction: {
            type: resolveSupportActionType(decision, event),
            bankKey: resolveSupportBankKey(decision, event),
            speaker,
            intensity,
            tier
          }
        }
      });
    }

    if (
      reason === "COMMUNITY_DIRECT_PING" &&
      responseEngine &&
      typeof responseEngine.buildDirectChatResponse === "function"
    ) {
      return responseEngine.buildDirectChatResponse(outputState, {
        target: speaker,
        speaker,
        intensity,
        userLabel,
        bowlPercent,
        message:
          safeString(event.message) ||
          safeString(event.comment) ||
          safeString(event.content) ||
          safeString(event.text) ||
          safeString(decision?.meta?.message)
      });
    }

    if (
      reason === "COMMUNITY_COMMENT" &&
      decision?.meta?.chatIntent &&
      responseEngine &&
      typeof responseEngine.buildDirectChatResponse === "function" &&
      (
        decision.meta.chatIntent.type === "statement" ||
        decision.meta.chatIntent.type === "direct_statement" ||
        decision.meta.chatIntent.type === "emotional_statement"
      )
    ) {
      return responseEngine.buildDirectChatResponse(outputState, {
        target: speaker,
        speaker,
        intensity,
        userLabel,
        bowlPercent,
        message:
          safeString(event.message) ||
          safeString(event.comment) ||
          safeString(decision?.meta?.message)
      });
    }

    if (
      (reason === "COMMUNITY_COMMENT" ||
        reason === "COMMUNITY_FOLLOW" ||
        reason === "COMMUNITY_SHARE" ||
        reason === "COMMUNITY_LIKE" ||
        reason === "COMMUNITY_GREETING_DUAL" ||
        reason === "COMMUNITY_ILLNESS_DUAL") &&
      responseEngine &&
      typeof responseEngine.buildCommunityResponse === "function"
    ) {
      const bankKey =
        reason === "COMMUNITY_FOLLOW"
          ? "milestone_chat"
          : reason === "COMMUNITY_GREETING_DUAL"
            ? "community_greeting"
            : reason === "COMMUNITY_ILLNESS_DUAL"
              ? "community_illness"
              : "community_ping";

      return responseEngine.buildCommunityResponse(outputState, {
        route: "community",
        speaker,
        intensity,
        bankKey,
        userLabel,
        bowlPercent,
        message:
          safeString(event.message) ||
          safeString(event.comment) ||
          safeString(event.content) ||
          safeString(event.text)
      });
    }
  } catch (err) {
    return null;
  }

  return null;
}

function pickGiftTier(event = {}) {
  return safeString(event?.support?.tier).toUpperCase();
}

function pickPlaybackTier(decision = {}, event = {}) {
  const fromDecision = safeString(decision.tier).toUpperCase();
  if (fromDecision) {
    return fromDecision;
  }

  return pickGiftTier(event) || pickTier(decision, event);
}

function formatGiftVideoLabel(giftName, giftTier, playbackTier) {
  const gift = safeString(giftName, "dárek");
  const gTier = safeString(giftTier).toUpperCase();
  const pTier = safeString(playbackTier).toUpperCase();

  if (gTier && pTier && gTier !== pTier) {
    return `${gift} (${gTier}) → video ${pTier}`;
  }

  if (pTier) {
    return `${gift} · video ${pTier}`;
  }

  return gift;
}

function buildSupportPlaybackSubtext(decision = {}, event = {}) {
  const giftName = pickGiftName(event);
  const giftTier = pickGiftTier(event);
  const playbackTier = pickPlaybackTier(decision, event);
  return formatGiftVideoLabel(giftName, giftTier, playbackTier);
}

function buildSpamCountdownSubtext(decision = {}, event = {}) {
  const spam = decision?.spamVerdict || {};
  const snapshot = spam?.snapshot || {};
  const active = Boolean(spam.isSpamActive || snapshot.active);

  if (!active) {
    return "";
  }

  const sec = toNumber(spam.remainingWindowSec ?? snapshot.remainingWindowSec, 0);
  const points = Math.round(toNumber(spam.totalPoints ?? snapshot.totalPoints, 0));
  const nextTier = safeString(spam.nextRewardTier ?? snapshot.nextRewardTier, "T2");
  const toNext = Math.ceil(
    toNumber(spam.pointsToNextReward ?? snapshot.pointsToNextReward, 0)
  );
  const count = toNumber(spam.eventCount ?? snapshot.eventCount, 0);
  const reason = safeString(decision.reason).toUpperCase();
  const band = safeString(spam.audienceBand ?? snapshot.audienceBand, "");
  const viewers = toNumber(spam.viewerCount ?? snapshot.viewerCount, 0);
  const bandLabel = band ? ` | ${band}` : viewers > 0 ? ` | ${viewers} diváků` : "";
  const giftLine = buildSupportPlaybackSubtext(decision, event);
  const playbackTier = pickPlaybackTier(decision, event);

  if (reason === "SUPPORT_SPAM_REWARD" || spam.shouldRewardSpam) {
    return `SPAM ODMĚNA → video ${playbackTier} | ${giftLine} | ${points} bodů${bandLabel}`;
  }

  if (reason === "SUPPORT_SPAM_BUILDUP") {
    return `${giftLine} | SPAM ${sec}s · ${points} bodů · ${nextTier} za ${toNext}${bandLabel}`;
  }

  return `SPAM ${sec}s | ${points} bodů | ${nextTier} za ${toNext} | ${count}× gift${bandLabel}`;
}

function applySpamOverlayEnhancements(overlay, decision = {}, event = {}) {
  if (!overlay || typeof overlay !== "object") {
    return overlay;
  }

  const spam = decision?.spamVerdict || {};
  const snapshot = spam?.snapshot || {};
  const spamLine = buildSpamCountdownSubtext(decision, event);
  const playbackTier = pickPlaybackTier(decision, event);
  const giftTier = pickGiftTier(event);
  const playbackLabel = buildSupportPlaybackSubtext(decision, event);
  const route = safeString(decision.route);
  const shouldPlayVideo = Boolean(decision.shouldPlayVideo);

  if (spamLine) {
    return {
      ...overlay,
      subtext: spamLine,
      spamActive: true,
      playbackTier,
      giftTier,
      playbackLabel,
      spamCountdownSec: toNumber(spam.remainingWindowSec ?? snapshot.remainingWindowSec, 0),
      spamTotalPoints: toNumber(spam.totalPoints ?? snapshot.totalPoints, 0),
      spamNextTier: safeString(spam.nextRewardTier ?? snapshot.nextRewardTier, "T2"),
      spamPointsToNext: toNumber(spam.pointsToNextReward ?? snapshot.pointsToNextReward, 0),
      meta: {
        ...(overlay.meta || {}),
        spamActive: true,
        playbackTier,
        giftTier,
        playbackLabel,
        spamCountdownSec: toNumber(spam.remainingWindowSec ?? snapshot.remainingWindowSec, 0),
        spamTotalPoints: toNumber(spam.totalPoints ?? snapshot.totalPoints, 0)
      }
    };
  }

  if (route === "support" && shouldPlayVideo && playbackLabel) {
    return {
      ...overlay,
      subtext: playbackLabel,
      playbackTier,
      giftTier,
      playbackLabel,
      meta: {
        ...(overlay.meta || {}),
        playbackTier,
        giftTier,
        playbackLabel
      }
    };
  }

  return overlay;
}

function buildSupportWaveText(ctx = {}) {
  const decision = ctx.decision || {};
  const kojnozoutState = ctx.kojnozoutState || {};
  const speaker = pickSpeaker(decision);
  const bowlPercent = toNumber(kojnozoutState?.bowlPercent, 0);
  const spamVerdict = decision?.spamVerdict || {};
  const eventCount = toNumber(spamVerdict.eventCount, 0);
  const contributorCount = toNumber(
    spamVerdict.contributorCount ?? spamVerdict.participantCount,
    0
  );

  if (speaker === "kojnozout") {
    if (bowlPercent >= 90) {
      return "Jo, komunito. Miska se plní a já to cítím až ve fouskách.";
    }
    if (eventCount >= 4) {
      return "Tohle už je pěkná vlna krmení. Díky, komunito.";
    }
    return "Díky za péči. Krmíte nás pěkně v kuse.";
  }

  if (bowlPercent >= 90) {
    return "Díky, komunito. Miska je skoro plná a je to krásně vidět.";
  }

  if (contributorCount >= 3) {
    return `Díky vám. Už ${contributorCount} z vás nám dneska krmení posílá.`;
  }

  if (eventCount >= 4) {
    return "Vidím vlnu dárků. Díky moc, komunito — krmíte nás pěkně.";
  }

  return "Díky za péči. Miska se plní a já to registruju.";
}

function buildPrimaryOverlayPayload(ctx = {}) {
  const decision = ctx.decision || {};
  const event = ctx.event || {};
  const speaker = pickSpeaker(decision);
  const userLabel = pickUserLabel(event);
  const ackMode = safeString(decision?.meta?.supportAckMode, "full");

  if (ackMode === "silent") {
    return null;
  }

  if (ackMode === "wave") {
    return applySpamOverlayEnhancements(
      buildOverlayPayloadFromText(
        pickSpeaker(decision),
        ctx,
        buildSupportWaveText(ctx),
        {
          companion: false,
          textSource: "support_wave_ack",
          action: "support_wave"
        }
      ),
      decision,
      ctx.event || {}
    );
  }

  const bankedResponse = buildBankedPrimaryResponse(ctx);

  if (bankedResponse?.overlay) {
    const overlay = bankedResponse.overlay;

    return applySpamOverlayEnhancements(
      {
        owner: speaker,
        route: safeString(overlay.route, safeString(decision.route, "community")),
        title: safeString(
          overlay.title,
          speaker === "kojnozout" ? "Kojnožrout" : "MIA"
        ),
        text: normalizeText(overlay.text),
        subtext: safeString(overlay.action || overlay.subtext || decision.reason),
        user: safeString(overlay.user || userLabel),
        giftName: safeString(overlay.giftName || pickGiftName(event)),
        tier: safeString(overlay.tier || pickTier(decision, event)),
        mood: safeString(overlay.mood || pickMood(ctx.kojnozoutState || {})),
        stage: safeString(overlay.stage || pickStage(ctx.kojnozoutState || {})),
        holdMs: normalizeOverlayHoldMs(
          overlay.holdMs,
          safeString(overlay.route, safeString(decision.route, "community")) === "support"
            ? OVERLAY_HOLD_MS.supportKoj
            : OVERLAY_HOLD_MS.community
        ),
        intensity: toNumber(decision.intensity, 1),
        action: safeString(overlay.action),
        meta: {
          speaker,
          reason: safeString(decision.reason),
          decisionType: safeString(decision.decisionType),
          shouldPlayVideo: Boolean(decision.shouldPlayVideo),
          companion: false,
          textSource: "response_engine",
          companionReason: safeString(decision?.actorRoles?.companionReason),
          primarySpeakerPolicy: safeString(decision?.meta?.primarySpeakerPolicy)
        }
      },
      decision,
      event
    );
  }

  return applySpamOverlayEnhancements(
    buildOverlayPayloadFromText(
      speaker,
      ctx,
      buildFallbackPrimaryText(ctx),
      {
        companion: false,
        textSource: "fallback_primary"
      }
    ),
    decision,
    event
  );
}

function shouldCompanionSpeak(ctx = {}) {
  const decision = ctx.decision || {};
  const event = ctx.event || {};
  const reason = safeString(decision.reason).toUpperCase();
  const actorRoles = decision.actorRoles || {};
  const route = safeString(decision.route, "community");
  const tier = pickTier(decision, event);
  const bowlPercent = toNumber(ctx?.kojnozoutState?.bowlPercent, 0);
  const spamEventCount = toNumber(decision?.spamVerdict?.eventCount, 0);

  if (!isDualVoiceEnabled()) {
    return false;
  }

  if (!actorRoles.allowCompanion) {
    return false;
  }

  if (reason === "COMMUNITY_GREETING_DUAL") {
    return true;
  }

  if (reason === "COMMUNITY_ILLNESS_DUAL") {
    return true;
  }

  if (reason === "COMMUNITY_FOLLOW") {
    return true;
  }

  if (route === "support") {
    if (decision?.meta?.vitalsCompanion?.enabled) {
      return true;
    }

    if (reason === "SUPPORT_FULL_BOWL") {
      return true;
    }

    if (reason === "SUPPORT_SPAM_REWARD" || reason === "SUPPORT_DIRECT_INTERRUPT") {
      return true;
    }

    if (reason === "SUPPORT_SPAM_BUILDUP" && spamEventCount >= 3) {
      return true;
    }

    if (tier === "T4" || tier === "T3") {
      return true;
    }

    return false;
  }

  return false;
}

function buildCompanionOverlayText(ctx = {}) {
  const decision = ctx.decision || {};
  const actorRoles = decision.actorRoles || {};

  if (!shouldCompanionSpeak(ctx)) {
    return "";
  }

  const companion =
    safeString(actorRoles.companion).toLowerCase() === "kojnozout"
      ? "kojnozout"
      : "mia";

  const event = ctx.event || {};
  const userLabel = pickUserLabel(event);
  const name = firstName(userLabel);
  const reason = safeString(decision.reason).toUpperCase();
  const bowlPercent = toNumber(ctx?.kojnozoutState?.bowlPercent, 0);

  if (reason === "COMMUNITY_GREETING_DUAL") {
    return companion === "kojnozout"
      ? `${name} je tady. Tak si ho očichám po svém.`
      : `${name}, vítej. Jsem ráda, že jsi tady.`;
  }

  if (reason === "COMMUNITY_ILLNESS_DUAL") {
    return companion === "kojnozout"
      ? `${name}, tak hlavně klid a žádný vylomeniny.`
      : `${name}, odpočívej a kurýruj se.`;
  }

  if (reason === "COMMUNITY_FOLLOW") {
    return companion === "kojnozout"
      ? `${name} je tu? Tak to mám komu skočit do klína.`
      : `${name}, vítej. Já si tě tu pohlídám.`;
  }

  if (
    reason === "SUPPORT_RESOLVED" ||
    reason === "SUPPORT_FULL_BOWL" ||
    reason === "SUPPORT_SPAM_BUILDUP" ||
    reason === "SUPPORT_SPAM_REWARD" ||
    reason === "SUPPORT_DIRECT_INTERRUPT"
  ) {
    return buildSupportCompanionText(
      companion,
      decision,
      event,
      bowlPercent,
      ctx.outputState
    );
  }

  return "";
}

function buildStatePatch(ctx = {}) {
  const decision = ctx.decision || {};
  const event = ctx.event || {};
  const kojnozoutState = ctx.kojnozoutState || {};
  const route = safeString(decision.route, "community");

  const patch = {
    route,
    lastReason: safeString(decision.reason),
    lastSpeaker: pickSpeaker(decision),
    lastTier: pickTier(decision, event),
    lastUser: pickUserLabel(event),
    bowlPercent: toNumber(kojnozoutState?.bowlPercent, 0),
    mood: pickMood(kojnozoutState),
    stage: pickStage(kojnozoutState)
  };

  if (route === "support") {
    patch.lastGiftName = pickGiftName(event);
  }

  return patch;
}

function buildLegacyDecisionMirror(ctx = {}) {
  const decision = ctx.decision || {};
  const event = ctx.event || {};

  return {
    route: safeString(decision.route, "community"),
    decisionType: safeString(decision.decisionType, "community"),
    speaker: pickSpeaker(decision),
    shouldPlayVideo: Boolean(decision.shouldPlayVideo),
    tier: pickTier(decision, event),
    reason: safeString(decision.reason),
    intensity: toNumber(decision.intensity, 1)
  };
}

function buildActionResult(input = {}) {
  const decision = input.decision || {};
  const event = input.event || {};
  const streamState = input.streamState || {};
  const outputState = input.outputState || {};
  const kojnozoutState = input.kojnozoutState || {};

  const route = safeString(decision.route, "community");
  const decisionType = safeString(decision.decisionType, "community");
  const speaker = pickSpeaker(decision);
  const tier = pickTier(decision, event);
  const shouldPlayVideo = Boolean(decision.shouldPlayVideo && tier);

  const overlayPayload = buildPrimaryOverlayPayload({
    decision,
    event,
    streamState,
    outputState,
    kojnozoutState
  });

  const companionSpeaker =
    safeString(decision?.actorRoles?.companion).toLowerCase() === "kojnozout"
      ? "kojnozout"
      : "mia";

  const companionText = buildCompanionOverlayText({
    decision,
    event,
    streamState,
    outputState,
    kojnozoutState
  });

  const companionOverlayPayload = companionText
    ? buildOverlayPayloadFromText(
        companionSpeaker,
        {
          decision,
          event,
          streamState,
          outputState,
          kojnozoutState
        },
        companionText,
        {
          companion: true,
          textSource: decision?.meta?.vitalsCompanion?.enabled
            ? "vitals_companion"
            : "companion_builder"
        }
      )
    : null;

  if (companionText && decision?.meta?.vitalsCompanion?.enabled) {
    const vitalsCompanion = getVitalsCompanionModule();
    if (typeof vitalsCompanion.noteVitalsCompanionSpoken === "function") {
      vitalsCompanion.noteVitalsCompanionSpoken(
        outputState,
        decision.meta.vitalsCompanion.key
      );
    }
  }

  if (
    overlayPayload?.text &&
    safeString(decision?.meta?.supportAckMode) !== "silent"
  ) {
    try {
      const supportReactionPolicy = require("../../scripts/MIA_SUPPORT_REACTION_POLICY");
      if (typeof supportReactionPolicy.noteSupportAck === "function") {
        supportReactionPolicy.noteSupportAck(
          outputState,
          safeString(decision?.meta?.supportAckMode, "full"),
          event
        );
      }
    } catch (_err) {
      // ignore optional ack tracking failures
    }
  }

  if (overlayPayload?.text) {
    try {
      const userAckThrottle = require("../../scripts/MIA_USER_ACK_THROTTLE");
      const userKey =
        decision?.meta?.userKey || userAckThrottle.resolveUserKey(event);
      const reason = safeString(decision?.reason).toUpperCase();

      if (
        decision?.meta?.noteUserGreetingAck === true ||
        reason === "COMMUNITY_GREETING_DUAL"
      ) {
        userAckThrottle.noteUserPublicAck(outputState, userKey, "greeting");
      }

      if (decision?.meta?.noteUserPingAck === true) {
        userAckThrottle.noteUserPublicAck(outputState, userKey, "ping");
      }

      if (
        decision?.meta?.noteUserFollowAck === true ||
        reason === "COMMUNITY_FOLLOW"
      ) {
        userAckThrottle.noteUserPublicAck(outputState, userKey, "follow");
      }
    } catch (_err) {
      // ignore optional per-user throttle tracking
    }
  }

  const overlay = overlayPayload
    ? {
        type: speaker,
        owner: speaker,
        route,
        title: safeString(
          overlayPayload.title,
          speaker === "kojnozout" ? "Kojnožrout" : "MIA"
        ),
        text: safeString(overlayPayload.text),
        subtext: safeString(overlayPayload.subtext),
        user: safeString(overlayPayload.user),
        giftName: safeString(overlayPayload.giftName),
        tier: safeString(overlayPayload.tier),
        mood: safeString(overlayPayload.mood),
        stage: safeString(overlayPayload.stage),
        action: safeString(overlayPayload.action),
        meta: cloneJson(overlayPayload.meta, null),
        ts: Date.now()
      }
    : null;

  const response = {
    speaker,
    text: overlay ? safeString(overlay.text) : "",
    reason: safeString(decision.reason),
    route,
    decisionType
  };

  return {
    ok: true,
    route,
    decisionType,
    shouldPlayVideo,
    tier,
    overlayPayload,
    companionOverlayPayload,
    overlay,
    overlayControl: {
      priority: route === "support" ? (speaker === "kojnozout" ? 6 : 5) : 3,
      holdMs: normalizeOverlayHoldMs(
        overlayPayload?.holdMs,
        route === "support" ? OVERLAY_HOLD_MS.supportKoj : OVERLAY_HOLD_MS.community
      ),
      force: false
    },
    companionOverlayControl: companionOverlayPayload
      ? {
          priority: route === "support" ? 4 : 2,
          holdMs: normalizeOverlayHoldMs(
            companionOverlayPayload?.holdMs,
            route === "support" ? OVERLAY_HOLD_MS.supportCompanion : OVERLAY_HOLD_MS.community
          ),
          force: false
        }
      : null,
    response,
    statePatch: buildStatePatch({
      decision,
      event,
      streamState,
      kojnozoutState
    }),
    legacyDecision: buildLegacyDecisionMirror({
      decision,
      event
    }),
    legacyNormalizedEvent: cloneJson(event, null),
    meta: {
      sourceOfTruth: "MIA_NEXT",
      speaker,
      companionSpeaker: companionOverlayPayload ? companionSpeaker : null,
      companionSpoke: Boolean(companionOverlayPayload),
      reason: safeString(decision.reason),
      intensity: toNumber(decision.intensity, 1),
      actorRoles: cloneJson(decision.actorRoles, null),
      supportAckMode: safeString(decision?.meta?.supportAckMode, "full"),
      primarySpeakerPolicy: safeString(decision?.meta?.primarySpeakerPolicy),
      kojnozoutReaction: decision?.meta?.kojnozoutReaction === true,
      suppressVoice: decision?.meta?.suppressVoice === true,
      suppressGiftVoice: decision?.meta?.suppressVoice === true,
      giftMapVoice: cloneJson(decision?.meta?.giftMapVoice, null),
      giftMapPriority: toNumber(decision?.meta?.giftMapPriority, 0),
      giftKey: safeString(decision?.meta?.giftKey),
      resolvedSupport: cloneJson(decision.resolvedSupport, null),
      spamVerdict: cloneJson(decision.spamVerdict, null),
      streamStateSeen: {
        supportTotal: toNumber(streamState?.supportTotal, 0),
        commentCount: toNumber(streamState?.commentCount, 0)
      },
      kojnozoutSeen: {
        bowlPercent: toNumber(kojnozoutState?.bowlPercent, 0),
        mood: pickMood(kojnozoutState),
        stage: pickStage(kojnozoutState)
      }
    }
  };
}

module.exports = {
  buildActionResult
};