"use strict";

/**
 * Care Bond + Neglect — dlouhodobý vztah komunity s Kojnožroutem (kánon).
 *
 * Hierarchie: SUPPORT > CARE > Community
 * CARE akce zvyšují bond a snižují neglect.
 */

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function nowTs() {
  return Date.now();
}

function createBondState(seed = {}) {
  return {
    careBond: clamp(toNumber(seed.careBond, 12), 0, 1000),
    neglect: clamp(toNumber(seed.neglect, 0), 0, 100),
    satisfaction: clamp(toNumber(seed.satisfaction, 50), 0, 100),
    lastCareAt: toNumber(seed.lastCareAt, 0),
    lastCommunityTouchAt: toNumber(seed.lastCommunityTouchAt, nowTs()),
    totalCareEvents: toNumber(seed.totalCareEvents, 0)
  };
}

function getBondSnapshot(kojnozoutState = {}) {
  const bond = createBondState(kojnozoutState.bond || {});
  return {
    careBond: Math.round(bond.careBond),
    neglect: Math.round(bond.neglect),
    satisfaction: Math.round(bond.satisfaction),
    bondTier: resolveBondTier(bond.careBond),
    neglectLevel: resolveNeglectLevel(bond.neglect),
    lastCareAt: bond.lastCareAt || null,
    totalCareEvents: bond.totalCareEvents
  };
}

function resolveBondTier(careBond = 0) {
  if (careBond >= 500) return "legend";
  if (careBond >= 200) return "family";
  if (careBond >= 80) return "friend";
  if (careBond >= 30) return "buddy";
  return "stranger";
}

function resolveNeglectLevel(neglect = 0) {
  if (neglect >= 75) return "critical";
  if (neglect >= 50) return "high";
  if (neglect >= 25) return "moderate";
  return "low";
}

function touchCommunity(kojnozoutState = {}, strength = 1) {
  const next = { ...kojnozoutState };
  const bond = createBondState(next.bond || {});
  bond.lastCommunityTouchAt = nowTs();
  bond.neglect = clamp(bond.neglect - 2 * strength, 0, 100);
  bond.satisfaction = clamp(bond.satisfaction + 1 * strength, 0, 100);
  next.bond = bond;
  return next;
}

function applyCareBondImpact(kojnozoutState = {}, impact = {}) {
  const next = { ...kojnozoutState };
  const bond = createBondState(next.bond || {});

  bond.careBond = clamp(
    bond.careBond + toNumber(impact.bondGain, 0),
    0,
    1000
  );
  bond.neglect = clamp(
    bond.neglect + toNumber(impact.neglectDelta, 0),
    0,
    100
  );
  bond.satisfaction = clamp(
    bond.satisfaction + toNumber(impact.satisfactionDelta, 0),
    0,
    100
  );
  bond.lastCareAt = nowTs();
  bond.lastCommunityTouchAt = nowTs();
  bond.totalCareEvents = toNumber(bond.totalCareEvents, 0) + 1;

  next.bond = bond;
  next.lastCareAt = bond.lastCareAt;
  return next;
}

function careImpactForAction(actionId = "") {
  const map = {
    nakrmit: { bondGain: 4, neglectDelta: -8, satisfactionDelta: 6 },
    podrbat: { bondGain: 5, neglectDelta: -6, satisfactionDelta: 8 },
    uklidnit: { bondGain: 3, neglectDelta: -5, satisfactionDelta: 5 },
    lecit: { bondGain: 6, neglectDelta: -10, satisfactionDelta: 7 },
    pozornost: { bondGain: 4, neglectDelta: -4, satisfactionDelta: 6 },
    vencit: { bondGain: 5, neglectDelta: -5, satisfactionDelta: 7 },
    feed_item: { bondGain: 5, neglectDelta: -7, satisfactionDelta: 7 },
    support_gift: { bondGain: 2, neglectDelta: -3, satisfactionDelta: 4 },
    quest_complete: { bondGain: 8, neglectDelta: -12, satisfactionDelta: 10 }
  };
  return map[actionId] || { bondGain: 2, neglectDelta: -3, satisfactionDelta: 3 };
}

function applyPassiveBondDecay(kojnozoutState = {}, streamState = {}, options = {}) {
  const minutes = Math.max(0, toNumber(options.minutesElapsed, 0));
  if (minutes <= 0) return kojnozoutState;

  const next = { ...kojnozoutState };
  const bond = createBondState(next.bond || {});
  const hunger = toNumber(next.hunger, 0);
  const bowl = toNumber(next.bowlPercent, 0);
  const sinceCommunity = (nowTs() - toNumber(bond.lastCommunityTouchAt, nowTs())) / 60000;

  let neglectGain = minutes * 0.35;
  if (sinceCommunity > 4) neglectGain += minutes * 0.45;
  if (hunger >= 55 && bowl < 25) neglectGain += minutes * 0.35;
  if (toNumber(next.socialState, 0) <= -20) neglectGain += minutes * 0.2;

  bond.neglect = clamp(bond.neglect + neglectGain, 0, 100);
  bond.satisfaction = clamp(bond.satisfaction - minutes * 0.15, 0, 100);

  if (bond.neglect >= 50 && hunger >= 50) {
    next.socialState = clamp(toNumber(next.socialState, 0) - minutes * 0.4, -100, 100);
  }

  next.bond = bond;
  return next;
}

module.exports = {
  createBondState,
  getBondSnapshot,
  resolveBondTier,
  resolveNeglectLevel,
  touchCommunity,
  applyCareBondImpact,
  careImpactForAction,
  applyPassiveBondDecay
};
