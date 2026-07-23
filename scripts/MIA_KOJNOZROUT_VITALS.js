"use strict";

/**
 * Kojnožrout vitals — hlad, spánek, nemoc (stupně + uzdravení), smutek, znechucení.
 */

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function nowTs() {
  return Date.now();
}

function createVitalsState(seed = {}) {
  const vitals = {
    wellbeing: clamp(toNumber(seed.wellbeing, 0), -100, 100),
    sleepDepth: clamp(toNumber(seed.sleepDepth, 0), 0, 100),
    affliction: safeString(seed.affliction) || null,
    communityVibe: clamp(toNumber(seed.communityVibe, 0), -100, 100),
    lastWakeAt: toNumber(seed.lastWakeAt, nowTs()),
    lastSleepAt: toNumber(seed.lastSleepAt, 0),
    groggyUntil: toNumber(seed.groggyUntil, 0),
    sickSeverity: clamp(toNumber(seed.sickSeverity, 0), 0, 3),
    recoveryProgress: clamp(toNumber(seed.recoveryProgress, 0), 0, 100),
    sickSince: toNumber(seed.sickSince, 0),
    immunityUntil: toNumber(seed.immunityUntil, 0),
    lastCareHealAt: toNumber(seed.lastCareHealAt, 0),
    lastSupportHealAt: toNumber(seed.lastSupportHealAt, 0)
  };

  if (vitals.affliction === "sick" && vitals.sickSeverity <= 0) {
    vitals.sickSeverity = 2;
    vitals.sickSince = vitals.sickSince || nowTs();
  }

  return vitals;
}

function resolveStreamCommunityVibe(streamState = {}) {
  const moodState = clamp(toNumber(streamState.moodState, 0), -100, 100);
  const engagement = clamp(toNumber(streamState.engagementState, 0), -100, 100);
  const chatTotal = toNumber(streamState?.chat?.totalMessages, 0);
  const lastMessageAt = toNumber(streamState?.chat?.lastMessageAt, 0);
  const minutesSinceChat =
    lastMessageAt > 0 ? (nowTs() - lastMessageAt) / 60000 : null;

  let vibe = moodState * 0.55 + engagement * 0.35;
  if (minutesSinceChat !== null && minutesSinceChat > 4) vibe -= 18;
  if (minutesSinceChat < 1 && chatTotal > 0) vibe += 8;

  return clamp(vibe, -100, 100);
}

function shouldAutoSick(state = {}, vitals = {}) {
  const hunger = clamp(toNumber(state.hunger, 0), 0, 100);
  const bowl = clamp(toNumber(state.bowlPercent, 0), 0, 100);
  const now = nowTs();

  if (now < vitals.immunityUntil) {
    return false;
  }

  if (now - vitals.lastSupportHealAt < 45000 || now - vitals.lastCareHealAt < 45000) {
    return false;
  }

  if (vitals.wellbeing <= -55 && hunger >= 78 && bowl < 15) {
    return true;
  }

  if (vitals.wellbeing <= -35 && hunger >= 70) {
    return true;
  }

  return false;
}

function tickSickRecovery(state = {}, vitals = {}) {
  if (vitals.sickSeverity <= 0) {
    vitals.affliction = null;
    return vitals;
  }

  const hunger = clamp(toNumber(state.hunger, 0), 0, 100);
  const now = nowTs();
  const inSupportGrace = now - vitals.lastSupportHealAt < 45000;
  const recovering =
    inSupportGrace ||
    vitals.wellbeing > -30 ||
    vitals.recoveryProgress >= 35 ||
    hunger < 68;

  if (recovering) {
    vitals.recoveryProgress = clamp(
      vitals.recoveryProgress + (inSupportGrace ? 10 : 8),
      0,
      100
    );
  } else if (
    !inSupportGrace &&
    vitals.recoveryProgress < 15 &&
    vitals.wellbeing <= -50 &&
    hunger >= 75
  ) {
    vitals.sickSeverity = clamp(vitals.sickSeverity + 1, 1, 3);
    vitals.recoveryProgress = clamp(vitals.recoveryProgress - 6, 0, 100);
  }

  if (vitals.recoveryProgress >= 100 || (vitals.wellbeing > -18 && hunger < 65)) {
    vitals.sickSeverity = Math.max(0, vitals.sickSeverity - 1);
    vitals.recoveryProgress = vitals.sickSeverity > 0 ? 25 : 0;

    if (vitals.sickSeverity === 0) {
      vitals.affliction = null;
      vitals.immunityUntil = nowTs() + 120000;
      vitals.sickSince = 0;
    }
  }

  if (vitals.sickSeverity > 0) {
    vitals.affliction = "sick";
  }

  return vitals;
}

function resolveAffliction(state = {}, vitals = {}, streamState = {}) {
  const hunger = clamp(toNumber(state.hunger, 0), 0, 100);
  const bowl = clamp(toNumber(state.bowlPercent, 0), 0, 100);
  const social = clamp(toNumber(state.socialState, 0), -100, 100);
  const vibe = vitals.communityVibe;

  if (vitals.sickSeverity > 0) {
    tickSickRecovery(state, vitals);
    if (vitals.sickSeverity > 0) {
      return "sick";
    }
  }

  if (social <= -28 || (vibe <= -30 && bowl < 25)) {
    return "sad";
  }

  if (social <= -8 && hunger >= 62 && bowl < 18) {
    return "annoyed";
  }

  if (shouldAutoSick(state, vitals)) {
    vitals.sickSeverity = Math.max(1, vitals.sickSeverity || 1);
    vitals.sickSince = vitals.sickSince || nowTs();
    vitals.recoveryProgress = 0;
    vitals.affliction = "sick";
    return "sick";
  }

  vitals.affliction = null;
  return null;
}

function applySupportHealing(state = {}, options = {}) {
  const vitals = createVitalsState(state.vitals || {});
  const miaPoints = Math.max(0, toNumber(options.miaPoints, 0));
  const tier = safeString(options.tier, "T1").toUpperCase();
  const tierBonus =
    tier === "T4" ? 28 : tier === "T3" ? 18 : tier === "T2" ? 12 : 0;
  const healPower = miaPoints * 0.55 + tierBonus + 8;

  vitals.wellbeing = clamp(vitals.wellbeing + healPower, -100, 100);
  state.hunger = clamp(toNumber(state.hunger, 0) - healPower * 0.04, 0, 100);
  state.socialState = clamp(toNumber(state.socialState, 0) + healPower * 0.08, -100, 100);

  if (vitals.sickSeverity > 0) {
    vitals.recoveryProgress = clamp(
      vitals.recoveryProgress + Math.max(10, healPower * 0.55),
      0,
      100
    );
    if (vitals.recoveryProgress >= 100 || vitals.wellbeing > -12) {
      vitals.sickSeverity = Math.max(0, vitals.sickSeverity - 1);
      vitals.recoveryProgress = vitals.sickSeverity > 0 ? 30 : 0;
      if (vitals.sickSeverity === 0) {
        vitals.affliction = null;
        vitals.immunityUntil = nowTs() + 90000;
      }
    }
  }

  vitals.lastSupportHealAt = nowTs();
  state.vitals = vitals;
  state.affliction = vitals.affliction;
  state.mood = resolveExpressiveMood(state, vitals);
  return vitals;
}

function finalizeSupportHealingState(state = {}, streamState = {}) {
  if (typeof resolveExpressiveMood === "function") {
    state.mood = resolveExpressiveMood(state, state.vitals || {});
  }
  state.affliction = state.vitals?.affliction || null;
  return state;
}

function applyCareHealing(state = {}, careConfig = {}) {
  const vitals = createVitalsState(state.vitals || {});
  const wellbeingGain = toNumber(careConfig.wellbeing, 0);

  vitals.wellbeing = clamp(vitals.wellbeing + wellbeingGain, -100, 100);

  if (careConfig.clearAffliction) {
    if (vitals.sickSeverity > 1) {
      vitals.sickSeverity -= 1;
      vitals.recoveryProgress = 55;
      vitals.affliction = "sick";
    } else {
      vitals.sickSeverity = 0;
      vitals.recoveryProgress = 0;
      vitals.affliction = null;
      vitals.immunityUntil = nowTs() + 180000;
    }
    vitals.lastCareHealAt = nowTs();
  } else if (vitals.sickSeverity > 0) {
    vitals.recoveryProgress = clamp(vitals.recoveryProgress + 12, 0, 100);
  }

  state.vitals = vitals;
  state.affliction = vitals.affliction;
  return vitals;
}

function applyIllnessContagion(state = {}, options = {}) {
  const vitals = createVitalsState(state.vitals || {});
  const now = nowTs();

  if (now < vitals.immunityUntil) {
    state.vitals = vitals;
    return vitals;
  }

  const chance = toNumber(options.chance, 0.6);
  const force = options.force === true;
  if (!force && Math.random() > chance) {
    state.vitals = vitals;
    return vitals;
  }

  vitals.sickSeverity = Math.max(vitals.sickSeverity, 1);
  vitals.sickSince = now;
  vitals.recoveryProgress = 0;
  vitals.affliction = "sick";
  vitals.wellbeing = clamp(vitals.wellbeing - 8, -100, 100);

  state.vitals = vitals;
  state.affliction = vitals.affliction;
  state.mood = "sick";
  return vitals;
}

function updateSleepDepth(state = {}, vitals = {}, minutesElapsed = 0) {
  const energy = clamp(toNumber(state.energy, 0), 0, 100);
  const sincePingMs = Math.max(
    0,
    nowTs() - Math.max(toNumber(state.lastPingAt, 0), toNumber(state.lastFedAt, 0))
  );
  const quietMinutes = sincePingMs / 60000;

  let depth = vitals.sleepDepth;

  if (energy <= 28 || quietMinutes >= 2.5) {
    depth += minutesElapsed * 4.5;
  } else {
    depth -= minutesElapsed * 6;
  }

  if (energy <= 18 && quietMinutes >= 4) {
    depth += minutesElapsed * 2;
  }

  return clamp(depth, 0, 100);
}

function computeWellbeing(state = {}, vitals = {}) {
  const hunger = clamp(toNumber(state.hunger, 0), 0, 100);
  const bowl = clamp(toNumber(state.bowlPercent, 0), 0, 100);
  const social = clamp(toNumber(state.socialState, 0), -100, 100);
  const energy = clamp(toNumber(state.energy, 0), 0, 100);

  let score = vitals.communityVibe * 0.35 + social * 0.35;
  score += bowl * 0.18;
  score -= Math.max(0, hunger - 45) * 0.55;
  score += energy * 0.08;

  if (vitals.sleepDepth >= 70 && energy < 35) score -= 6;

  return clamp(score, -100, 100);
}

function isSleeping(vitals = {}) {
  return toNumber(vitals.sleepDepth, 0) >= 55;
}

function resolveExpressiveMood(state = {}, vitals = {}) {
  const percent = clamp(toNumber(state.bowlPercent, 0), 0, 100);
  const hunger = clamp(toNumber(state.hunger, 0), 0, 100);
  const supportBurst = clamp(toNumber(state.supportBurst, 0), 0, 999999);
  const socialState = clamp(toNumber(state.socialState, 0), -100, 100);

  if (isSleeping(vitals)) return "sleepy";
  if (vitals.affliction === "sick" || vitals.sickSeverity > 0) return "sick";
  if (vitals.affliction === "sad") return "sad";
  if (vitals.affliction === "annoyed") return "annoyed";

  if (percent >= 95) return "full";
  if (supportBurst >= 8 || percent >= 60) return "excited";
  if (socialState >= 50 && hunger < 70) return "happy";
  if (hunger >= 52 || (hunger >= 42 && percent < 35)) return "hungry";
  if (percent > 0) return "warm";
  return "hungry";
}

function syncVitals(state = {}, streamState = {}, options = {}) {
  const minutesElapsed = Math.max(0, toNumber(options.minutesElapsed, 0));
  const vitals = createVitalsState(state.vitals || {});

  if (vitals.affliction === "sick" && vitals.sickSeverity <= 0) {
    vitals.sickSeverity = 1;
    vitals.sickSince = vitals.sickSince || nowTs();
  }

  vitals.communityVibe = resolveStreamCommunityVibe(streamState);
  vitals.sleepDepth = updateSleepDepth(state, vitals, minutesElapsed);
  vitals.wellbeing = computeWellbeing(state, vitals);

  if (!options.snapshotMode) {
    vitals.affliction = resolveAffliction(state, vitals, streamState);
  } else if (vitals.sickSeverity > 0) {
    vitals.affliction = "sick";
  }

  if (isSleeping(vitals)) {
    vitals.lastSleepAt = vitals.lastSleepAt || nowTs();
  } else {
    vitals.lastWakeAt = nowTs();
  }

  state.vitals = vitals;
  state.mood = resolveExpressiveMood(state, vitals);
  state.isSleeping = isSleeping(vitals);
  state.affliction = vitals.affliction;

  return vitals;
}

function applyActivityWake(state = {}, strength = 1) {
  const vitals = createVitalsState(state.vitals || {});
  vitals.sleepDepth = clamp(vitals.sleepDepth - 18 * strength, 0, 100);
  vitals.groggyUntil = nowTs() + 8000;
  state.vitals = vitals;
  state.behavior = vitals.sleepDepth >= 40 ? "sleepy_react" : "wake_react";
  return vitals;
}

function describeVitals(state = {}) {
  const vitals = createVitalsState(state.vitals || {});
  if (isSleeping(vitals)) return "spí, ale slyší stream";

  if (vitals.sickSeverity >= 3 || (vitals.affliction === "sick" && vitals.wellbeing <= -45)) {
    return "je hodně nemocný — je mu fakt špatně";
  }

  if (vitals.sickSeverity >= 2 || vitals.affliction === "sick") {
    if (vitals.recoveryProgress >= 55) {
      return "je nemocný, ale už se mu trochu lépe dýchá";
    }
    return "je nemocný a potřebuje péči";
  }

  if (vitals.sickSeverity === 1) {
    if (vitals.recoveryProgress >= 40) {
      return "měl kocovinu z chatu, ale pomalu se sbírá";
    }
    return "je trochu nachlazený z nálady chatu";
  }

  if (vitals.affliction === "sad") return "je smutný z nálady chatu";
  if (vitals.affliction === "annoyed") return "je znechucený — má hlad a málo jídla";
  if (toNumber(state.hunger, 0) >= 55) return "má hlad";
  return "bdí a čeká na komunitu";
}

function resolveSickReactionBankKey(vitals = {}) {
  if (vitals.sickSeverity >= 3) return "koj_vitals_sick_worse";
  if (vitals.sickSeverity >= 2 && vitals.recoveryProgress < 40) return "koj_vitals_sick_bad";
  if (vitals.sickSeverity >= 1 && vitals.recoveryProgress >= 50) return "koj_vitals_sick_recovering";
  if (vitals.sickSeverity >= 1) return "koj_vitals_sick_mild";
  return "koj_vitals_sick";
}

module.exports = {
  createVitalsState,
  syncVitals,
  applyActivityWake,
  applySupportHealing,
  applyCareHealing,
  applyIllnessContagion,
  resolveExpressiveMood,
  resolveStreamCommunityVibe,
  resolveSickReactionBankKey,
  isSleeping,
  describeVitals
};
