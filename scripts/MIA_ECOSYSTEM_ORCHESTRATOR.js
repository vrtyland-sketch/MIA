"use strict";

/**
 * MIA Ecosystem Orchestrator — 3. AI entita (kánon §2)
 *
 * Koordinační vrstva v jednom runtime:
 *   core      → routing, fronta, multi-agent plán (nemluví veřejně)
 *   mia       → moderátor, host, hlavní hlas
 *   kojnozout → komunitní mazlíček, CARE doména
 *   assistant → osobní asistent mimo stream (zatím slot, fallback na MIA)
 */

const AGENT_IDS = Object.freeze(["core", "mia", "kojnozout", "assistant"]);

const { isDualVoiceEnabled } = require("./MIA_DUAL_VOICE");

const DOMAIN_IDS = Object.freeze([
  "STREAM_HOST",
  "SUPPORT",
  "SHARE",
  "CARE",
  "COMMUNITY",
  "ASSISTANT",
  "DUEL",
  "SYSTEM"
]);

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
  } catch (_err) {
    return fallback;
  }
}

function normalizeAgentId(value, fallback = "mia") {
  const id = safeString(value, fallback).toLowerCase();
  if (id === "kojnozrout") return "kojnozout";
  if (AGENT_IDS.includes(id)) return id;
  return fallback;
}

function getEventType(event = {}) {
  return safeString(event.eventType || event.type).toUpperCase();
}

function getRoute(event = {}) {
  return safeString(event.route).toLowerCase();
}

function getMessage(event = {}) {
  return safeString(event.message || event.text || event.content);
}

function normalizeText(value) {
  return safeString(value).replace(/\s+/g, " ").trim().toLowerCase();
}

function mentionsKojnozout(message = "") {
  const text = normalizeText(message);
  return (
    text.includes("kojno") ||
    text.includes("nožrout") ||
    text.includes("nozrout") ||
    text.includes("koj ")
  );
}

function mentionsMia(message = "") {
  const text = normalizeText(message);
  return /\bmia\b/.test(text) || text.includes(" mio") || text.startsWith("mio");
}

function isEnabled(runtimeConfig = {}) {
  const cfg = runtimeConfig?.ecosystem || {};
  if (typeof cfg.enabled === "boolean") return cfg.enabled;
  return true;
}

function createEcosystemState(seed = {}) {
  return {
    orchestratorId: safeString(seed.orchestratorId, "core"),
    worldMode: safeString(seed.worldMode, "default"),
    lastPlanAt: toNumber(seed.lastPlanAt, 0),
    lastDomain: safeString(seed.lastDomain, ""),
    activeAgents: Array.isArray(seed.activeAgents) ? seed.activeAgents.slice() : ["mia", "kojnozout"],
    turnHistory: Array.isArray(seed.turnHistory) ? seed.turnHistory.slice(-40) : [],
    stats: {
      plans: toNumber(seed?.stats?.plans, 0),
      companionTurns: toNumber(seed?.stats?.companionTurns, 0),
      hostModeOverrides: toNumber(seed?.stats?.hostModeOverrides, 0)
    }
  };
}

function getAgentRegistry(runtimeConfig = {}) {
  const cfg = runtimeConfig?.ecosystem || {};
  const orchestratorLabel = safeString(cfg.orchestratorLabel, "CORE");

  return {
    core: {
      id: "core",
      label: orchestratorLabel,
      role: "orchestrator",
      speaksPublicly: false,
      domains: ["SYSTEM"]
    },
    mia: {
      id: "mia",
      label: "MIA",
      role: "primary_host",
      speaksPublicly: true,
      domains: ["STREAM_HOST", "SUPPORT", "SHARE", "COMMUNITY", "ASSISTANT"]
    },
    kojnozout: {
      id: "kojnozout",
      label: "Kojnožrout",
      role: "community_pet",
      speaksPublicly: true,
      domains: ["CARE", "SUPPORT", "SHARE", "DUEL"]
    },
    assistant: {
      id: "assistant",
      label: safeString(cfg.assistantLabel, "Asistent"),
      role: "personal_assistant",
      speaksPublicly: false,
      domains: ["ASSISTANT"],
      routeTo: "mia"
    }
  };
}

function resolveWorldMode(ctx = {}) {
  return safeString(
    ctx.outputState?.worldMode ||
      ctx.outputState?.voice?.worldMode ||
      ctx.runtimeConfig?.worldMode ||
      ctx.ecosystemState?.worldMode,
    "default"
  ).toLowerCase();
}

function isHostMode(worldMode = "") {
  return worldMode === "nejsem_tu" || worldMode === "spinak_nejsem_tu";
}

function resolveDomain(event = {}, ctx = {}) {
  const eventType = getEventType(event);
  const route = getRoute(event);
  const message = getMessage(event);
  const duelActive = Boolean(ctx.kojnozoutState?.duel?.active || ctx.duelState?.active);
  const worldMode = resolveWorldMode(ctx);

  if (route === "share" || safeString(event.shareMode)) {
    return "SHARE";
  }

  if (eventType === "GIFT" || route === "support") {
    return duelActive ? "DUEL" : "SUPPORT";
  }

  if (route === "voice" || route === "assistant") {
    return "ASSISTANT";
  }

  if (mentionsKojnozout(message) && !mentionsMia(message)) {
    return "CARE";
  }

  const affliction = safeString(ctx.kojnozoutState?.affliction).toLowerCase();
  const hunger = toNumber(ctx.kojnozoutState?.hunger, 0);
  if (
    (affliction === "sick" || affliction === "sad" || hunger >= 75) &&
    (mentionsKojnozout(message) || /(koj|nožrout|nozrout)/i.test(message))
  ) {
    return "CARE";
  }

  if (isHostMode(worldMode) && eventType === "COMMENT") {
    return "STREAM_HOST";
  }

  if (duelActive && eventType === "GIFT") {
    return "DUEL";
  }

  return "COMMUNITY";
}

function resolvePrimarySpeaker(domain, decision = {}, ctx = {}) {
  const current = normalizeAgentId(decision.speaker, "mia");
  const worldMode = resolveWorldMode(ctx);
  const message = getMessage(ctx.event || {});

  switch (domain) {
    case "SHARE":
      return "mia";

    case "CARE":
      return mentionsMia(message) && !mentionsKojnozout(message) ? "mia" : "kojnozout";

    case "STREAM_HOST":
      return "mia";

    case "ASSISTANT":
      return "assistant";

    case "SUPPORT":
    case "DUEL":
      return current;

    case "COMMUNITY":
    default:
      if (isHostMode(worldMode) && !mentionsKojnozout(message)) {
        return "mia";
      }
      return current;
  }
}

function resolveCompanionSpeaker(domain, primary, decision = {}) {
  const roles = decision.actorRoles || {};
  const existingCompanion = normalizeAgentId(roles.companion, "");

  if (domain === "SHARE") {
    return primary === "mia" ? "kojnozout" : "mia";
  }

  if (domain === "STREAM_HOST") {
    return "kojnozout";
  }

  if (domain === "CARE" && primary === "kojnozout") {
    return "mia";
  }

  if (existingCompanion && existingCompanion !== primary) {
    return existingCompanion;
  }

  if (primary === "mia") return "kojnozout";
  if (primary === "kojnozout") return "mia";
  return "";
}

function shouldAllowCompanion(domain, primary, companion, decision = {}, ctx = {}) {
  if (!isDualVoiceEnabled()) return false;
  if (!companion || companion === primary) return false;

  const roles = decision.actorRoles || {};

  if (domain === "SUPPORT") {
    return Boolean(roles.allowCompanion);
  }

  if (domain === "SHARE") {
    return true;
  }

  if (domain === "STREAM_HOST") {
    const bowlPercent = toNumber(ctx.kojnozoutState?.bowlPercent, 0);
    return bowlPercent >= 55 || toNumber(ctx.kojnozoutState?.hunger, 0) >= 60;
  }

  if (domain === "CARE") {
    return primary === "kojnozout";
  }

  if (domain === "DUEL") {
    return Boolean(roles.allowCompanion);
  }

  return Boolean(roles.allowCompanion);
}

function buildCompanionReason(domain, primary, companion, decision = {}, ctx = {}) {
  if (domain === "SHARE") return "SHARE_COMPANION";
  if (domain === "STREAM_HOST") return "HOST_MODE_KOJ_SUPPLEMENT";
  if (domain === "CARE") return "CARE_MIA_COMPANION";
  if (domain === "DUEL") return "DUEL_AWARE_COMPANION";
  return safeString(decision?.actorRoles?.companionReason, "ECOSYSTEM_COMPANION");
}

function planEventRouting(ctx = {}) {
  const event = ctx.event || ctx.rawEvent || {};
  const decision = ctx.decisionResult || ctx.decision || {};
  const domain = resolveDomain(event, ctx);
  const worldMode = resolveWorldMode(ctx);
  const primary = resolvePrimarySpeaker(domain, decision, { ...ctx, event });
  const companion = resolveCompanionSpeaker(domain, primary, decision);
  const allowCompanion = shouldAllowCompanion(domain, primary, companion, decision, {
    ...ctx,
    event
  });
  const registry = getAgentRegistry(ctx.runtimeConfig || {});

  const activeAgents = ["core", primary];
  if (companion && companion !== "core") activeAgents.push(companion);
  if (domain === "ASSISTANT") activeAgents.push("assistant");

  const assistantRoutesTo =
    primary === "assistant"
      ? safeString(registry.assistant?.routeTo, "mia")
      : null;

  return {
    at: Date.now(),
    orchestratorId: safeString(ctx.ecosystemState?.orchestratorId, "core"),
    domain,
    worldMode,
    hostMode: isHostMode(worldMode),
    eventType: getEventType(event),
    route: getRoute(event) || safeString(decision.route),
    primary,
    companion: allowCompanion ? companion : null,
    allowCompanion,
    companionReason: allowCompanion
      ? buildCompanionReason(domain, primary, companion, decision, ctx)
      : "",
    assistantRoutesTo,
    activeAgents: [...new Set(activeAgents)],
    preserveSupportPolicy: domain === "SUPPORT" || domain === "DUEL",
    summary: `${domain}:${primary}${allowCompanion && companion ? `+${companion}` : ""}`
  };
}

function applyOrchestrationToDecision(decision = {}, plan = null) {
  if (!plan || typeof plan !== "object") return decision;

  const next = {
    ...decision,
    meta: {
      ...(decision.meta || {}),
      ecosystem: {
        orchestratorId: plan.orchestratorId,
        domain: plan.domain,
        worldMode: plan.worldMode,
        hostMode: plan.hostMode,
        primary: plan.primary,
        companion: plan.companion,
        allowCompanion: plan.allowCompanion,
        activeAgents: cloneJson(plan.activeAgents, []),
        summary: plan.summary
      }
    }
  };

  if (plan.preserveSupportPolicy) {
    next.meta.ecosystem.supportPolicyPreserved = true;
    return next;
  }

  if (plan.primary === "assistant" && plan.assistantRoutesTo) {
    next.speaker = plan.assistantRoutesTo;
    next.actorRoles = {
      primary: plan.assistantRoutesTo,
      companion: plan.companion || "",
      allowCompanion: plan.allowCompanion,
      companionReason: plan.companionReason
    };
    next.meta.ecosystem.assistantRoutedTo = plan.assistantRoutesTo;
    return next;
  }

  next.speaker = plan.primary;
  next.actorRoles = {
    primary: plan.primary,
    companion: plan.companion || normalizeAgentId(decision?.actorRoles?.companion, "mia"),
    allowCompanion: plan.allowCompanion,
    companionReason: plan.allowCompanion ? plan.companionReason : ""
  };

  if (plan.hostMode) {
    next.meta.hostMode = plan.worldMode;
    next.meta.primarySpeakerPolicy = "ECOSYSTEM_HOST_MODE_MIA";
  }

  return next;
}

function finalizeActionResult(actionResult = {}, plan = null, ctx = {}) {
  if (!actionResult || typeof actionResult !== "object") return actionResult;
  if (!plan) return actionResult;

  const primary = normalizeAgentId(
    actionResult?.overlayPayload?.owner || plan.primary,
    plan.primary
  );
  const hasCompanion = Boolean(actionResult?.companionOverlayPayload);

  return {
    ...actionResult,
    meta: {
      ...(actionResult.meta || {}),
      ecosystem: {
        ...(actionResult.meta?.ecosystem || {}),
        domain: plan.domain,
        orchestratorId: plan.orchestratorId,
        turnSequence: hasCompanion ? [primary, plan.companion].filter(Boolean) : [primary],
        companionScheduled: hasCompanion
      }
    }
  };
}

function recordTurn(ecosystemState = {}, plan = null, actionResult = null) {
  if (!ecosystemState || typeof ecosystemState !== "object" || !plan) {
    return ecosystemState;
  }

  if (!ecosystemState.stats || typeof ecosystemState.stats !== "object") {
    ecosystemState.stats = {
      plans: 0,
      companionTurns: 0,
      hostModeOverrides: 0
    };
  }

  ecosystemState.lastPlanAt = plan.at || Date.now();
  ecosystemState.lastDomain = plan.domain;
  ecosystemState.worldMode = plan.worldMode;
  ecosystemState.activeAgents = cloneJson(plan.activeAgents, ecosystemState.activeAgents);
  ecosystemState.stats.plans = toNumber(ecosystemState.stats?.plans, 0) + 1;

  if (plan.hostMode && plan.domain === "STREAM_HOST") {
    ecosystemState.stats.hostModeOverrides = toNumber(
      ecosystemState.stats?.hostModeOverrides,
      0
    ) + 1;
  }

  const primary = normalizeAgentId(
    actionResult?.overlayPayload?.owner || plan.primary,
    plan.primary
  );
  const turn = {
    at: Date.now(),
    domain: plan.domain,
    primary,
    companion: plan.companion || null,
    companionSpoke: Boolean(actionResult?.companionOverlayPayload),
    summary: plan.summary
  };

  if (!Array.isArray(ecosystemState.turnHistory)) {
    ecosystemState.turnHistory = [];
  }

  ecosystemState.turnHistory.push(turn);
  if (ecosystemState.turnHistory.length > 40) {
    ecosystemState.turnHistory = ecosystemState.turnHistory.slice(-40);
  }

  if (turn.companionSpoke) {
    ecosystemState.stats.companionTurns = toNumber(
      ecosystemState.stats?.companionTurns,
      0
    ) + 1;
  }

  return ecosystemState;
}

function getEcosystemSnapshot(ecosystemState = {}, runtimeConfig = {}) {
  const registry = getAgentRegistry(runtimeConfig);
  const state = ecosystemState || createEcosystemState();

  return {
    ok: true,
    orchestratorId: state.orchestratorId || "core",
    orchestratorLabel: registry.core?.label || "CORE",
    enabled: isEnabled(runtimeConfig),
    worldMode: state.worldMode || "default",
    activeAgents: cloneJson(state.activeAgents, ["mia", "kojnozout"]),
    agents: Object.values(registry).map((agent) => ({
      id: agent.id,
      label: agent.label,
      role: agent.role,
      speaksPublicly: agent.speaksPublicly,
      domains: agent.domains || []
    })),
    domains: DOMAIN_IDS.slice(),
    lastPlanAt: state.lastPlanAt || null,
    lastDomain: state.lastDomain || null,
    stats: cloneJson(state.stats, {}),
    recentTurns: cloneJson((state.turnHistory || []).slice(-8), [])
  };
}

function orchestratePipeline(ctx = {}) {
  if (!isEnabled(ctx.runtimeConfig)) {
    return {
      plan: null,
      decisionResult: ctx.decisionResult || ctx.decision || {},
      actionResult: ctx.actionResult || null
    };
  }

  const plan = planEventRouting(ctx);
  let decisionResult = applyOrchestrationToDecision(
    ctx.decisionResult || ctx.decision || {},
    plan
  );

  let actionResult = ctx.actionResult || null;
  if (actionResult) {
    actionResult = finalizeActionResult(actionResult, plan, ctx);
    recordTurn(ctx.ecosystemState, plan, actionResult);
  }

  return { plan, decisionResult, actionResult };
}

module.exports = {
  AGENT_IDS,
  DOMAIN_IDS,
  isEnabled,
  createEcosystemState,
  getAgentRegistry,
  planEventRouting,
  applyOrchestrationToDecision,
  finalizeActionResult,
  recordTurn,
  getEcosystemSnapshot,
  orchestratePipeline
};
