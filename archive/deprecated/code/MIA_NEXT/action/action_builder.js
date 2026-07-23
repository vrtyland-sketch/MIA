"use strict";

const responseEngine = require("../../scripts/MIA_RESPONSE_ENGINE");
const {
  buildAnimationHint
} = require("../../scripts/MIA_GIFT_RUNTIME_HELPERS");

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

  const fromSpam = safeString(decision?.spamVerdict?.rewardTier).toUpperCase();
  if (fromSpam) return fromSpam;

  return "";
}

function pickSpeaker(decision = {}) {
  const speaker = safeString(decision.speaker, "mia").toLowerCase();
  return speaker === "kojnozout" ? "kojnozout" : "mia";
}

function pickMood(kojnozoutState = {}) {
  return safeString(kojnozoutState?.mood, "neutral").toLowerCase();
}

function pickStage(kojnozoutState = {}) {
  return safeString(kojnozoutState?.stage, "idle").toLowerCase();
}

function firstName(label = "") {
  const normalized = normalizeText(label);
  if (!normalized) return "někdo";
  return normalized.split(/\s+/)[0] || normalized;
}

function buildGreetingText(owner, userLabel) {
  const name = firstName(userLabel);

  if (owner === "mia") {
    return `Ahoj ${name}, vítej zpátky. Jsem ráda, že jsi tady.`;
  }

  return `${name} je tu. To se mám ke komu přitulit a otřít o nohu.`;
}

function buildIllnessText(owner, userLabel) {
  const name = firstName(userLabel);

  if (owner === "mia") {
    return `${name}, tak snad nás nenakazíš. Odpočívej a kurýruj se.`;
  }

  return `${name}, tak díky... mám pocit, že už jsem to chytil taky. To bude chtít klid a rum.`;
}

function buildSupportCompanionText(owner, userLabel, giftName, bowlPercent, tier, reason, spamVerdict = null) {
  const name = firstName(userLabel);
  const safeGiftName = safeString(giftName, "dárek");
  const safeTier = safeString(tier).toUpperCase();
  const safeReason = safeString(reason).toUpperCase();
  const totalPoints = toNumber(spamVerdict?.totalPoints, 0);
  const eventCount = toNumber(spamVerdict?.eventCount, 0);

  if (safeReason === "SUPPORT_SPAM_BUILDUP") {
    if (owner === "kojnozout") {
      if (eventCount >= 3) {
        return `${name}, tohle už mi cinká do misky pěkně v kuse. Ještě trochu a budu se culit ještě víc.`;
      }
      return `${name}, něco se tady rozjíždí. Já to slyším až ve fouskách.`;
    }

    if (eventCount >= 3) {
      return `${name}, díky za tuhle společnou vlnu podpory. Je vidět, že se to hezky zvedá.`;
    }

    return `${name}, díky. Podpora se začíná pěkně skládat dohromady.`;
  }

  if (safeReason === "SUPPORT_SPAM_REWARD") {
    if (owner === "kojnozout") {
      if (safeTier === "T3") {
        return `${name}, tohle už je pořádná spamová hostina. Miska to slyšela až do dna.`;
      }
      return `${name}, tohle byl pěkný spamový nášup. Já mám takové cinkání fakt rád.`;
    }

    if (safeTier === "T3") {
      return `${name}, děkuju. Tohle už byla opravdu silná společná vlna podpory pro Kojnožrouta.`;
    }

    return `${name}, děkuju za tuhle vlnu podpory. O Kojnožrouta je zase o kus líp postaráno.`;
  }

  if (owner !== "mia") {
    if (safeReason === "SUPPORT_FULL_BOWL" || bowlPercent >= 95) {
      return `${name}, miska je plná. Tohle už je hostina jak sviň.`;
    }

    if (safeTier === "T4") {
      return `${name}, tohle je obrovský nášup. To se fakt povedlo.`;
    }

    if (safeTier === "T3") {
      return `${name}, tohle už je pořádná porce.`;
    }

    if (safeTier === "T2") {
      return `${name}, díky za ${safeGiftName}. To už má hezkou váhu.`;
    }

    if (totalPoints >= 150) {
      return `${name}, pěkně to cinká. Já si toho všímám.`;
    }

    return `${name}, tohle mi udělalo dobře.`;
  }

  if (safeReason === "SUPPORT_FULL_BOWL" || bowlPercent >= 95) {
    return `${name}, děkuju za péči o Kojnožrouta. Miska je plná a já to beru jako krásný moment pro něj.`;
  }

  if (safeTier === "T4") {
    return `${name}, děkuju. To je obrovská péče o Kojnožrouta a je to znát.`;
  }

  if (safeTier === "T3") {
    return `${name}, děkuju. Tohle už je velká péče o Kojnožrouta.`;
  }

  if (safeTier === "T2") {
    return `${name}, díky za ${safeGiftName}. O Kojnožrouta je zase o kus lépe postaráno.`;
  }

  if (bowlPercent >= 60) {
    return `${name}, díky. Je vidět, že se o něj staráte poctivě.`;
  }

  return `${name}, díky za ${safeGiftName}. Péče o Kojnožrouta se počítá.`;
}

function buildDirectPingText(owner, userLabel) {
  const name = firstName(userLabel);

  if (owner === "mia") {
    return `${name}, jsem tady a dávám pozor. Vidím tě ve vašem chatu.`;
  }

  return `${name}, já tě slyším taky. Klidně si ke mně přisedni.`;
}

function buildCommentText(owner, userLabel) {
  const name = firstName(userLabel);

  if (owner === "mia") {
    return `${name}, vidím tě ve vašem chatu.`;
  }

  return `${name} něco píše a já u toho nastražil uši.`;
}

function buildFollowText(owner, userLabel) {
  const name = firstName(userLabel);

  if (owner === "mia") {
    return `${name} právě dorazil. Vítej, jsem ráda, že jsi tady s námi.`;
  }

  return `${name} je tu? Tak to mám komu skočit do klína.`;
}

function buildShareText(owner, userLabel) {
  const name = firstName(userLabel);

  if (owner === "mia") {
    return `${name}, díky, že to posíláš dál. To se počítá.`;
  }

  return `${name} to poslal dál. To je na podrbání za uchem.`;
}

function buildLikeText(owner, userLabel) {
  const name = firstName(userLabel);

  if (owner === "mia") {
    return `${name}, díky za podporu. Vidím tě v chatu i v akci.`;
  }

  return `${name} o sobě dává vědět. Já už jsem zpozorněl.`;
}

function buildSupportFallbackText(ctx = {}) {
  const decision = ctx.decision || {};
  const event = ctx.event || {};
  const speaker = pickSpeaker(decision);
  const tier = pickTier(decision, event);
  const userLabel = pickUserLabel(event);
  const giftName = pickGiftName(event);
  const bowlPercent = toNumber(ctx?.kojnozoutState?.bowlPercent, 0);
  const reason = safeString(decision.reason).toUpperCase();
  const spamVerdict = decision?.spamVerdict || {};
  const name = firstName(userLabel);
  const eventCount = toNumber(spamVerdict.eventCount, 0);
  const totalPoints = toNumber(spamVerdict.totalPoints, 0);

  if (reason === "SUPPORT_FULL_BOWL") {
    if (speaker === "kojnozout") {
      return `${name}, miska je plná. Tohle už je pořádná hostina.`;
    }

    return `${name}, díky. Miska je plná a o Kojnožrouta je skvěle postaráno.`;
  }

  if (reason === "SUPPORT_SPAM_BUILDUP") {
    if (speaker === "mia") {
      if (eventCount >= 3) {
        return `${name}, díky za tuhle vlnu podpory. Ještě kousek a ten nášup bude ještě výraznější.`;
      }
      return `${name}, díky. Podpora se hezky skládá a Kojnožrout to vnímá.`;
    }

    if (eventCount >= 3) {
      return `${name}, tohle už mi cinká do misky pěkně za sebou. Ještě chvíli a budu se tetelit ještě víc.`;
    }

    return `${name}, slyším další cinknutí. To se mi líbí.`;
  }

  if (reason === "SUPPORT_SPAM_REWARD") {
    if (speaker === "mia") {
      if (tier === "T3") {
        return `${name}, děkuju. Tohle už byla opravdu silná společná vlna podpory pro Kojnožrouta.`;
      }
      return `${name}, děkuju za tuhle společnou vlnu podpory. O Kojnožrouta je zase o kus lépe postaráno.`;
    }

    if (tier === "T3") {
      return `${name}, tohle už byla pořádná spamová hostina. Miska to slyšela až do dna.`;
    }

    if (totalPoints >= 250) {
      return `${name}, tak tohle byl pěkný spamový nášup. Já mám takové cinkání fakt rád.`;
    }

    return `${name}, tohle už nebyla jen jedna růže. To mi zvedlo náladu všemi vousy.`;
  }

  if (speaker === "mia") {
    if (tier === "T4") {
      return `${name}, tohle je obrovská péče o Kojnožrouta. Děkuju.`;
    }

    if (tier === "T3") {
      return `${name}, tohle už je velká péče o Kojnožrouta. Děkuju moc.`;
    }

    if (tier === "T2") {
      return `${name}, díky za ${giftName}. O Kojnožrouta je zase líp postaráno.`;
    }

    return `${name}, díky za ${giftName}. Péče o Kojnožrouta se počítá.`;
  }

  if (tier === "T4") {
    return `${name}, tohle byla neskutečná hostina.`;
  }

  if (tier === "T3") {
    return `${name}, tohle už je poctivý nášup.`;
  }

  if (tier === "T2") {
    return `${name}, díky za ${giftName}. To už mi zvedlo náladu.`;
  }

  if (bowlPercent >= 70) {
    return `${name}, díky za ${giftName}. Miska už se plní krásně.`;
  }

  return `${name}, díky za ${giftName}. Beru to všemi vousy.`;
}

function resolveSupportBurstCount(decision = {}, event = {}) {
  const spamVerdict = decision?.spamVerdict || {};
  const contributorCount = toNumber(spamVerdict.contributorCount, 0);
  const repeatCount = toNumber(event?.support?.repeatCount, 1);
  const eventCount = toNumber(spamVerdict.eventCount, 0);

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
  const support = event?.support || {};

  return Math.max(
    0,
    toNumber(
      spamVerdict.totalCoins,
      toNumber(
        spamVerdict.totalPoints,
        toNumber(support.totalCoins, toNumber(support.coins, 0))
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

  if (tier === "T4") {
    return "support_hype";
  }

  return "";
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

  if (tier === "T4") {
    return "support_hype";
  }

  return "support_reaction";
}

function buildAnimationRuntimeMeta(ctx = {}) {
  const decision = ctx.decision || {};
  const event = ctx.event || {};
  const kojnozoutState = ctx.kojnozoutState || {};

  try {
    return buildAnimationHint(event, {
      burstCount: resolveSupportBurstCount(decision, event),
      bowlPercent: toNumber(kojnozoutState?.bowlPercent, 0)
    });
  } catch (_err) {
    return {
      owner: "both",
      visualFamily: "generic",
      effectProgram: "generic_support",
      moodHint: "warm",
      label: safeString(event?.support?.giftName, "Unknown Gift"),
      giftName: safeString(event?.support?.giftName, "Unknown Gift"),
      coinsBucket: "unknown",
      recommendedSceneModes: ["MAIN", "AFK", "COMMUNITY"],
      tags: [],
      supportTier: safeString(event?.support?.tier),
      totalCoins: Math.max(
        0,
        toNumber(event?.support?.totalCoins, toNumber(event?.support?.coins, 0))
      ),
      burstCount: resolveSupportBurstCount(decision, event),
      bowlPercent: toNumber(kojnozoutState?.bowlPercent, 0),
      dual: false,
      rawGiftProfile: cloneJson(event?.support?.giftProfile, null)
    };
  }
}

function buildOverlayPayloadFromText(owner, ctx, text, options = {}) {
  const decision = ctx.decision || {};
  const event = ctx.event || {};
  const route = safeString(decision.route, "community");
  const tier = pickTier(decision, event);
  const userLabel = pickUserLabel(event);
  const giftName = pickGiftName(event);
  const intensity = toNumber(decision.intensity, 1);
  const animationHint = buildAnimationRuntimeMeta(ctx);

  if (!normalizeText(text)) {
    return null;
  }

  return {
    owner,
    route,
    text: normalizeText(text),
    subtext: safeString(decision.reason),
    user: userLabel,
    giftName,
    tier,
    mood: safeString(animationHint.moodHint, pickMood(ctx.kojnozoutState || {})),
    stage: pickStage(ctx.kojnozoutState || {}),
    intensity,
    meta: {
      speaker: owner,
      reason: safeString(decision.reason),
      decisionType: safeString(decision.decisionType),
      shouldPlayVideo: Boolean(decision.shouldPlayVideo),
      companion: options.companion === true,
      companionReason: safeString(decision?.actorRoles?.companionReason),
      primarySpeakerPolicy: safeString(decision?.meta?.primarySpeakerPolicy),
      giftAnimationOwner: safeString(animationHint.owner),
      giftVisualFamily: safeString(animationHint.visualFamily),
      giftEffectProgram: safeString(animationHint.effectProgram),
      giftMoodHint: safeString(animationHint.moodHint),
      animationDual: Boolean(animationHint.dual),
      animationHint: cloneJson(animationHint, null)
    }
  };
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
      (
        reason === "SUPPORT_RESOLVED" ||
        reason === "SUPPORT_FULL_BOWL" ||
        reason === "SUPPORT_SPAM_BUILDUP" ||
        reason === "SUPPORT_SPAM_REWARD"
      ) &&
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
        bowlPercent,
        burstCount: resolveSupportBurstCount(decision, event),
        totalCoins: resolveSupportTotalCoins(decision, event),
        giftProfile: cloneJson(event?.support?.giftProfile, null),
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
        intensity,
        userLabel,
        bowlPercent
      });
    }

    if (
      reason === "COMMUNITY_COMMENT" &&
      responseEngine &&
      typeof responseEngine.buildCommunityResponse === "function"
    ) {
      return responseEngine.buildCommunityResponse(outputState, {
        route: "community",
        speaker,
        intensity,
        bankKey: "community_ping",
        userLabel,
        bowlPercent
      });
    }

    if (
      reason === "COMMUNITY_FOLLOW" &&
      responseEngine &&
      typeof responseEngine.buildCommunityResponse === "function"
    ) {
      return responseEngine.buildCommunityResponse(outputState, {
        route: "community",
        speaker,
        intensity,
        bankKey: "milestone_chat",
        userLabel,
        bowlPercent
      });
    }

    if (
      reason === "COMMUNITY_SHARE" &&
      responseEngine &&
      typeof responseEngine.buildCommunityResponse === "function"
    ) {
      return responseEngine.buildCommunityResponse(outputState, {
        route: "community",
        speaker,
        intensity,
        bankKey: "community_ping",
        userLabel,
        bowlPercent
      });
    }

    if (
      reason === "COMMUNITY_LIKE" &&
      responseEngine &&
      typeof responseEngine.buildCommunityResponse === "function"
    ) {
      return responseEngine.buildCommunityResponse(outputState, {
        route: "community",
        speaker,
        intensity,
        bankKey: "community_ping",
        userLabel,
        bowlPercent
      });
    }
  } catch (_err) {
    return null;
  }

  return null;
}

function buildPrimaryOverlayPayload(ctx = {}) {
  const decision = ctx.decision || {};
  const event = ctx.event || {};
  const speaker = pickSpeaker(decision);
  const reason = safeString(decision.reason).toUpperCase();
  const userLabel = pickUserLabel(event);
  const bankedResponse = buildBankedPrimaryResponse(ctx);
  const animationHint = buildAnimationRuntimeMeta(ctx);

  if (bankedResponse?.overlay) {
    const overlay = bankedResponse.overlay;

    return {
      owner: speaker,
      route: safeString(overlay.route, safeString(decision.route, "community")),
      title: safeString(
        overlay.title,
        speaker === "kojnozout" ? "Kojnožrout" : "MIA"
      ),
      text: normalizeText(overlay.text),
      subtext: safeString(
        overlay.action || overlay.subtext || animationHint.effectProgram || decision.reason
      ),
      user: safeString(overlay.user || userLabel),
      giftName: safeString(overlay.giftName || pickGiftName(event)),
      tier: safeString(overlay.tier || pickTier(decision, event)),
      mood: safeString(overlay.mood || animationHint.moodHint || pickMood(ctx.kojnozoutState || {})),
      stage: safeString(overlay.stage || pickStage(ctx.kojnozoutState || {})),
      holdMs: normalizeOverlayHoldMs(overlay.holdMs, 0),
      intensity: toNumber(decision.intensity, 1),
      meta: {
        speaker,
        reason: safeString(decision.reason),
        decisionType: safeString(decision.decisionType),
        shouldPlayVideo: Boolean(decision.shouldPlayVideo),
        companion: false,
        textSource: "response_engine",
        companionReason: safeString(decision?.actorRoles?.companionReason),
        primarySpeakerPolicy: safeString(decision?.meta?.primarySpeakerPolicy),
        giftAnimationOwner: safeString(animationHint.owner),
        giftVisualFamily: safeString(animationHint.visualFamily),
        giftEffectProgram: safeString(animationHint.effectProgram),
        giftMoodHint: safeString(animationHint.moodHint),
        animationDual: Boolean(animationHint.dual),
        animationHint: cloneJson(animationHint, null)
      }
    };
  }

  let primaryText = "";

  if (reason === "COMMUNITY_GREETING_DUAL") {
    primaryText = buildGreetingText(speaker, userLabel);
  } else if (reason === "COMMUNITY_ILLNESS_DUAL") {
    primaryText = buildIllnessText(speaker, userLabel);
  } else if (reason === "COMMUNITY_DIRECT_PING") {
    primaryText = buildDirectPingText(speaker, userLabel);
  } else if (reason === "COMMUNITY_FOLLOW") {
    primaryText = buildFollowText(speaker, userLabel);
  } else if (reason === "COMMUNITY_SHARE") {
    primaryText = buildShareText(speaker, userLabel);
  } else if (reason === "COMMUNITY_LIKE") {
    primaryText = buildLikeText(speaker, userLabel);
  } else if (reason === "COMMUNITY_COMMENT") {
    primaryText = buildCommentText(speaker, userLabel);
  } else if (safeString(decision.route, "community") === "support") {
    primaryText = buildSupportFallbackText(ctx);
  } else if (!decision.shouldPlayVideo && !pickTier(decision, event)) {
    primaryText = "";
  } else {
    primaryText = `${userLabel}, registruju ${pickGiftName(event)} ${pickTier(decision, event)}`.trim();
  }

  return buildOverlayPayloadFromText(
    speaker,
    ctx,
    primaryText,
    { companion: false }
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

  if (reason === "COMMUNITY_SHARE" || reason === "COMMUNITY_LIKE") {
    return false;
  }

  if (route === "support") {
    if (reason === "SUPPORT_FULL_BOWL") {
      return true;
    }

    if (reason === "SUPPORT_SPAM_REWARD") {
      return true;
    }

    if (reason === "SUPPORT_SPAM_BUILDUP" && toNumber(decision?.spamVerdict?.eventCount, 0) >= 3) {
      return true;
    }

    if (tier === "T4" && bowlPercent >= 85) {
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

  const companion = safeString(actorRoles.companion).toLowerCase() === "kojnozout"
    ? "kojnozout"
    : "mia";

  const event = ctx.event || {};
  const userLabel = pickUserLabel(event);
  const giftName = pickGiftName(event);
  const reason = safeString(decision.reason).toUpperCase();
  const bowlPercent = toNumber(ctx?.kojnozoutState?.bowlPercent, 0);
  const tier = pickTier(decision, event);
  const spamVerdict = decision?.spamVerdict || {};

  if (reason === "COMMUNITY_GREETING_DUAL") {
    return buildGreetingText(companion, userLabel);
  }

  if (reason === "COMMUNITY_ILLNESS_DUAL") {
    return buildIllnessText(companion, userLabel);
  }

  if (
    reason === "SUPPORT_RESOLVED" ||
    reason === "SUPPORT_FULL_BOWL" ||
    reason === "SUPPORT_SPAM_BUILDUP" ||
    reason === "SUPPORT_SPAM_REWARD"
  ) {
    return buildSupportCompanionText(
      companion,
      userLabel,
      giftName,
      bowlPercent,
      tier,
      reason,
      spamVerdict
    );
  }

  if (reason === "COMMUNITY_FOLLOW") {
    if (companion === "kojnozout") {
      return `${firstName(userLabel)} je tu? Tak to mám komu skočit do klína.`;
    }

    return `${firstName(userLabel)}, vítej. Já si tě tu pohlídám.`;
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

  const companionOverlayPayload = buildOverlayPayloadFromText(
    companionSpeaker,
    {
      decision,
      event,
      streamState,
      kojnozoutState
    },
    companionText,
    {
      companion: true
    }
  );

  const overlay =
    overlayPayload
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

  const animationHint = buildAnimationRuntimeMeta({
    decision,
    event,
    streamState,
    outputState,
    kojnozoutState
  });

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
        route === "support" ? 4200 : 3200
      ),
      force: false
    },
    companionOverlayControl: companionOverlayPayload
      ? {
          priority: route === "support" ? 4 : 2,
          holdMs: normalizeOverlayHoldMs(
            companionOverlayPayload?.holdMs,
            route === "support" ? 3600 : 3000
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
      resolvedSupport: cloneJson(decision.resolvedSupport, null),
      spamVerdict: cloneJson(decision.spamVerdict, null),
      animationHint: cloneJson(animationHint, null),
      giftAnimationOwner: safeString(animationHint.owner),
      giftVisualFamily: safeString(animationHint.visualFamily),
      giftEffectProgram: safeString(animationHint.effectProgram),
      giftMoodHint: safeString(animationHint.moodHint),
      animationDual: Boolean(animationHint.dual),
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