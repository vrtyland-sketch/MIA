"use strict";

/**
 * Master Canon 0044 — Community Engine: central social layer for MIA platform.
 */

const crypto = require("crypto");

const CE_COMPONENT = Object.freeze({
  COMMUNITY_MANAGER: "community_manager",
  USER_PROFILE_MANAGER: "user_profile_manager",
  REPUTATION_MANAGER: "reputation_manager",
  RELATIONSHIP_MANAGER: "relationship_manager",
  GUILD_MANAGER: "guild_manager",
  VIP_MANAGER: "vip_manager",
  MODERATOR_MANAGER: "moderator_manager",
  VOTING_MANAGER: "voting_manager",
  COMMUNITY_ANALYTICS: "community_analytics",
  COMMUNITY_HISTORY: "community_history",
  COMMUNITY_PERSISTENCE: "community_persistence",
  COMMUNITY_API: "community_api"
});

const CE_COMPONENT_ORDER = Object.freeze(Object.values(CE_COMPONENT));

const CE_VIP_TIER = Object.freeze({
  BRONZE: "vip_bronze",
  SILVER: "vip_silver",
  GOLD: "vip_gold",
  FOUNDER: "founder",
  LEGEND: "legend"
});

const CE_VIP_TIER_ORDER = Object.freeze(Object.values(CE_VIP_TIER));

const CE_RELATIONSHIP = Object.freeze({
  VIEWER_MIA: "viewer_mia",
  VIEWER_KOJ: "viewer_koj",
  VIEWER_VIEWER: "viewer_viewer",
  GUILD_MEMBER: "guild_member"
});

const CE_REPUTATION = Object.freeze({
  MIN: -1000,
  MAX: 1000,
  DEFAULT: 0
});

const CE_PLATFORM = Object.freeze({
  TIKTOK: "tiktok",
  KICK: "kick",
  TWITCH: "twitch",
  YOUTUBE: "youtube",
  INTERNAL: "internal"
});

const CE_LIFECYCLE = Object.freeze([
  "first_visit",
  "registration",
  "communication",
  "battle",
  "quests",
  "achievements",
  "vip",
  "community_legend"
]);

const CE_FORBIDDEN_ACTIVITIES = Object.freeze([
  "mutate_battle_logic",
  "mutate_economy",
  "mutate_personality",
  "mutate_decision_engine",
  "generate_ai_responses"
]);

const CE_RUNTIME_ANCHORS = Object.freeze([
  "shared/mia-community-core/communityEngine.js",
  "scripts/MIA_PARTICIPANT_RUNTIME.js",
  "scripts/MIA_GIFT_SUPPORTER_PROFILE.js",
  "scripts/MIA_STREAMER_IDENTITY.js",
  "shared/mia-memory-core/memorySystem.js",
  "shared/mia-achievement-core/achievementEngine.js"
]);

function manageCommunity(input = {}) {
  return Object.freeze({
    ok: true,
    communityId: input.communityId || `community-${crypto.randomUUID()}`,
    activeMembers: input.activeMembers || 0,
    stats: Object.freeze(input.stats || {}),
    config: Object.freeze(input.config || {}),
    component: CE_COMPONENT.COMMUNITY_MANAGER
  });
}

function createUserProfile(input = {}) {
  const userId = input.userId || `user-${crypto.randomUUID()}`;
  return Object.freeze({
    ok: true,
    userId,
    displayName: input.displayName || userId,
    platforms: Object.freeze(input.platforms || []),
    joinedAt: input.joinedAt || Date.now(),
    level: input.level != null ? Number(input.level) : 1,
    xp: input.xp != null ? Number(input.xp) : 0,
    achievements: Object.freeze(input.achievements || []),
    reputation: input.reputation != null ? Number(input.reputation) : CE_REPUTATION.DEFAULT,
    battleStats: Object.freeze(input.battleStats || { wins: 0, battles: 0 }),
    sharedAcrossPlatform: true,
    component: CE_COMPONENT.USER_PROFILE_MANAGER
  });
}

function clampReputation(value) {
  return Math.max(CE_REPUTATION.MIN, Math.min(CE_REPUTATION.MAX, Number(value) || 0));
}

function adjustReputation(current = 0, delta = 0, reason = "activity") {
  const next = clampReputation(current + Number(delta) || 0);
  return Object.freeze({
    ok: true,
    before: clampReputation(current),
    after: next,
    delta: next - clampReputation(current),
    reason,
    component: CE_COMPONENT.REPUTATION_MANAGER
  });
}

function createRelationship(input = {}) {
  return Object.freeze({
    ok: true,
    relationshipId: input.relationshipId || `rel-${crypto.randomUUID()}`,
    fromId: input.fromId,
    toId: input.toId,
    type: input.type || CE_RELATIONSHIP.VIEWER_MIA,
    strength: input.strength != null ? Number(input.strength) : 0,
    label: input.label || null,
    emotionalMemoryLinked: true,
    component: CE_COMPONENT.RELATIONSHIP_MANAGER
  });
}

function strengthenRelationship(relationship = {}, delta = 1) {
  const strength = Math.max(0, (relationship.strength || 0) + Math.max(0, Number(delta) || 0));
  let label = relationship.label;
  if (strength >= 100) label = "velmi silný vztah";
  else if (strength >= 50) label = "oblíbený krmič";
  return Object.freeze({
    ok: true,
    relationshipId: relationship.relationshipId,
    strength,
    label,
    component: CE_COMPONENT.RELATIONSHIP_MANAGER
  });
}

function createGuild(input = {}) {
  return Object.freeze({
    ok: true,
    guildId: input.guildId || `guild-${crypto.randomUUID()}`,
    name: input.name || "Guild",
    members: Object.freeze(input.members || []),
    stats: Object.freeze(input.stats || {}),
    sharedInventoryId: input.sharedInventoryId || null,
    battleHistory: Object.freeze(input.battleHistory || []),
    component: CE_COMPONENT.GUILD_MANAGER
  });
}

function assignVipTier(input = {}) {
  const tier = input.tier || CE_VIP_TIER.BRONZE;
  return Object.freeze({
    ok: true,
    userId: input.userId,
    tier,
    unlocks: Object.freeze({
      cosmetics: tier !== CE_VIP_TIER.BRONZE,
      specialReactions: true,
      exclusiveBattle: tier === CE_VIP_TIER.GOLD || tier === CE_VIP_TIER.LEGEND
    }),
    component: CE_COMPONENT.VIP_MANAGER
  });
}

function registerModerator(input = {}) {
  return Object.freeze({
    ok: true,
    moderatorId: input.moderatorId || `mod-${crypto.randomUUID()}`,
    userId: input.userId,
    permissions: Object.freeze(input.permissions || ["mute", "timeout"]),
    trustLevel: input.trustLevel != null ? Number(input.trustLevel) : 1,
    actions: Object.freeze(input.actions || []),
    audited: true,
    component: CE_COMPONENT.MODERATOR_MANAGER
  });
}

function recordModeratorAction(moderator = {}, action = {}) {
  const entry = Object.freeze({
    actionId: `mod-act-${crypto.randomUUID()}`,
    type: action.type || "intervention",
    targetUserId: action.targetUserId || null,
    at: Date.now()
  });
  return Object.freeze({
    ok: true,
    moderatorId: moderator.moderatorId,
    action: entry,
    audited: true,
    component: CE_COMPONENT.MODERATOR_MANAGER
  });
}

function castCommunityVote(input = {}) {
  return Object.freeze({
    ok: true,
    voteId: input.voteId || `vote-${crypto.randomUUID()}`,
    topic: input.topic || "community_poll",
    choice: input.choice,
    userId: input.userId,
    archived: true,
    castAt: Date.now(),
    component: CE_COMPONENT.VOTING_MANAGER
  });
}

function collectCommunityAnalytics(run = {}) {
  return Object.freeze({
    activeMembers: run.activeMembers || 0,
    newMembers: run.newMembers || 0,
    retentionRate: run.retentionRate != null ? run.retentionRate : null,
    averageActivity: run.averageActivity || 0,
    battleParticipation: run.battleParticipation || 0,
    economyActivity: run.economyActivity || 0,
    component: CE_COMPONENT.COMMUNITY_ANALYTICS
  });
}

function recordCommunityHistory(event = {}, payload = {}) {
  return Object.freeze({
    ok: true,
    historyId: `comm-hist-${crypto.randomUUID()}`,
    event,
    payload: Object.freeze(payload),
    recordedAt: Date.now(),
    component: CE_COMPONENT.COMMUNITY_HISTORY
  });
}

function persistCommunity(snapshot = {}) {
  return Object.freeze({
    ok: true,
    snapshotId: `comm-snap-${crypto.randomUUID()}`,
    snapshot: Object.freeze(snapshot),
    persistedAt: Date.now(),
    component: CE_COMPONENT.COMMUNITY_PERSISTENCE
  });
}

function buildCommunityPipeline(stages = {}) {
  return Object.freeze({
    ok: true,
    pipeline: Object.freeze([
      { step: "interaction", done: Boolean(stages.interaction) },
      { step: "memory", done: Boolean(stages.memory) },
      { step: "reputation", done: Boolean(stages.reputation) },
      { step: "relationship", done: Boolean(stages.relationship) },
      { step: "community", done: Boolean(stages.community) }
    ]),
    component: CE_COMPONENT.COMMUNITY_MANAGER
  });
}

function buildMemberLifecycle(stages = {}) {
  return Object.freeze({
    ok: true,
    lifecycle: Object.freeze(
      CE_LIFECYCLE.map((step) => ({
        step,
        done: Boolean(stages[step])
      }))
    ),
    component: CE_COMPONENT.COMMUNITY_MANAGER
  });
}

function validateCommunityInput(input = {}) {
  const errors = [];
  if (input.mutatesBattleLogic === true) errors.push("battle_logic_forbidden");
  if (input.mutatesEconomy === true) errors.push("economy_mutation_forbidden");
  if (input.mutatesPersonality === true) errors.push("personality_mutation_forbidden");
  if (input.mutatesDecisionEngine === true) errors.push("decision_engine_mutation_forbidden");
  if (input.generatesAiResponses === true) errors.push("ai_response_generation_forbidden");
  if (input.bypassPipeline === true) errors.push("pipeline_required");
  return Object.freeze({
    ok: errors.length === 0,
    errors: Object.freeze(errors),
    component: CE_COMPONENT.COMMUNITY_API
  });
}

function resolveReputationBonus(reputation = 0, vipTier = null) {
  const repBonus = Math.floor(clampReputation(reputation) / 100);
  const vipBonus =
    vipTier === CE_VIP_TIER.GOLD || vipTier === CE_VIP_TIER.LEGEND
      ? 3
      : vipTier === CE_VIP_TIER.SILVER
        ? 2
        : vipTier === CE_VIP_TIER.BRONZE
          ? 1
          : 0;
  return Object.freeze({
    ok: true,
    reputationBonus: repBonus,
    vipBonus,
    economyCalculates: true,
    component: CE_COMPONENT.REPUTATION_MANAGER
  });
}

function getBattleCommunityContext(profile = {}, guild = null) {
  return Object.freeze({
    ok: true,
    readOnly: true,
    userId: profile.userId,
    reputation: profile.reputation,
    relationships: profile.relationships || [],
    guild: guild
      ? Object.freeze({
          guildId: guild.guildId,
          name: guild.name,
          battleHistory: guild.battleHistory
        })
      : null,
    battleManaged: false,
    component: CE_COMPONENT.COMMUNITY_API
  });
}

function assertCommunityForbiddenActivity(activity) {
  const key = String(activity || "");
  return { ok: !CE_FORBIDDEN_ACTIVITIES.includes(key), activity: key };
}

function createCommunityEngine(options = {}) {
  const profiles = new Map();
  const relationships = new Map();
  const guilds = new Map();
  const votes = [];
  const history = [];
  const moderators = new Map();
  let activeMembers = 0;

  const community = manageCommunity({
    communityId: options.communityId || "mia-main-community",
    activeMembers: 0
  });

  function getOrCreateProfile(userId, seed = {}) {
    if (!profiles.has(userId)) {
      profiles.set(userId, {
        ...createUserProfile({ userId, ...seed }),
        relationships: [],
        vipTier: null,
        lifecycle: { first_visit: true }
      });
      activeMembers += 1;
    }
    return profiles.get(userId);
  }

  return {
    registerMember(input = {}) {
      const profile = getOrCreateProfile(input.userId, input);
      profile.lifecycle.registration = true;
      return createUserProfile(profile);
    },
    processInteraction(interaction = {}, adapters = {}) {
      const validation = validateCommunityInput({
        mutatesBattleLogic: interaction.mutatesBattleLogic,
        mutatesEconomy: interaction.mutatesEconomy,
        mutatesPersonality: interaction.mutatesPersonality,
        mutatesDecisionEngine: interaction.mutatesDecisionEngine,
        generatesAiResponses: interaction.generatesAiResponses,
        bypassPipeline: interaction.bypassPipeline
      });
      if (!validation.ok) {
        return Object.freeze({
          ok: false,
          error: "invalid_community_input",
          validation,
          decides: false,
          component: CE_COMPONENT.COMMUNITY_API
        });
      }

      const userId = interaction.userId || "anonymous";
      const profile = getOrCreateProfile(userId, {
        displayName: interaction.displayName,
        platforms: interaction.platforms
      });

      if (interaction.type === "communication") profile.lifecycle.communication = true;
      if (interaction.type === "battle") profile.lifecycle.battle = true;
      if (interaction.type === "quest") profile.lifecycle.quests = true;
      if (interaction.type === "achievement") profile.lifecycle.achievements = true;

      let memoryRef = null;
      if (adapters.memoryAdapter && typeof adapters.memoryAdapter.recordReference === "function") {
        memoryRef = adapters.memoryAdapter.recordReference({
          userId,
          type: interaction.type,
          readOnly: true
        });
      }

      const repDelta =
        interaction.type === "gift"
          ? 5
          : interaction.type === "battle"
            ? 3
            : interaction.type === "moderation_violation"
              ? -25
              : 1;
      const reputation = adjustReputation(profile.reputation, repDelta, interaction.type);
      profile.reputation = reputation.after;

      const relKey = `${userId}:${interaction.targetId || "mia"}`;
      let relationship = relationships.get(relKey);
      if (!relationship) {
        const created = createRelationship({
          fromId: userId,
          toId: interaction.targetId || "mia",
          type:
            interaction.targetType === "kojnozrout"
              ? CE_RELATIONSHIP.VIEWER_KOJ
              : CE_RELATIONSHIP.VIEWER_MIA,
          strength: 0
        });
        relationship = {
          relationshipId: created.relationshipId,
          fromId: created.fromId,
          toId: created.toId,
          type: created.type,
          strength: 0,
          label: null
        };
        relationships.set(relKey, relationship);
      }
      const strengthened = strengthenRelationship(relationship, interaction.relationshipDelta || 1);
      relationship.strength = strengthened.strength;
      relationship.label = strengthened.label;
      relationships.set(relKey, relationship);
      profile.relationships = Array.from(relationships.values()).filter((r) => r.fromId === userId);

      if (interaction.achievementEngine && interaction.type === "achievement") {
        profile.achievements = interaction.achievementIds || profile.achievements;
      }

      const hist = recordCommunityHistory(interaction.type || "interaction", {
        userId,
        reputation: profile.reputation,
        relationshipStrength: relationship.strength
      });
      history.push(hist);

      const analytics = collectCommunityAnalytics({
        activeMembers,
        newMembers: profiles.size,
        averageActivity: history.length,
        battleParticipation: interaction.type === "battle" ? 1 : 0,
        economyActivity: interaction.type === "gift" ? 1 : 0
      });

      const pipeline = buildCommunityPipeline({
        interaction: true,
        memory: !adapters.memoryAdapter || Boolean(memoryRef),
        reputation: true,
        relationship: true,
        community: true
      });

      const persistence = persistCommunity({
        communityId: community.communityId,
        members: profiles.size,
        activeMembers
      });

      return Object.freeze({
        ok: pipeline.pipeline.every((s) => s.done),
        profile: createUserProfile(profile),
        reputation,
        relationship: strengthened,
        memoryRef,
        analytics,
        pipeline,
        persistence,
        mutatesBattleLogic: false,
        mutatesEconomy: false,
        decides: false,
        component: CE_COMPONENT.COMMUNITY_API
      });
    },
    assignVip(userId, tier = CE_VIP_TIER.BRONZE) {
      const profile = getOrCreateProfile(userId);
      profile.vipTier = tier;
      profile.lifecycle.vip = true;
      return assignVipTier({ userId, tier });
    },
    joinGuild(userId, guildId, guildName) {
      const profile = getOrCreateProfile(userId);
      let guild = guilds.get(guildId);
      if (!guild) {
        guild = { ...createGuild({ guildId, name: guildName }), members: [] };
        guilds.set(guildId, guild);
      }
      if (!guild.members.includes(userId)) guild.members.push(userId);
      return createGuild(guild);
    },
    castVote(vote = {}) {
      const entry = castCommunityVote(vote);
      votes.push(entry);
      return entry;
    },
    registerModerator(input = {}) {
      const mod = registerModerator(input);
      moderators.set(mod.moderatorId, { ...mod, actions: [] });
      return mod;
    },
    recordModeratorAction(moderatorId, action = {}) {
      const mod = moderators.get(moderatorId);
      if (!mod) return Object.freeze({ ok: false, error: "moderator_not_found" });
      const recorded = recordModeratorAction(mod, action);
      mod.actions.push(recorded.action);
      moderators.set(moderatorId, mod);
      return recorded;
    },
    getBattleContext(userId, guildId = null) {
      const profile = getOrCreateProfile(userId);
      const guild = guildId ? guilds.get(guildId) : null;
      return getBattleCommunityContext(profile, guild);
    },
    getReputationBonus(userId) {
      const profile = getOrCreateProfile(userId);
      return resolveReputationBonus(profile.reputation, profile.vipTier);
    },
    getMemberLifecycle(userId) {
      const profile = getOrCreateProfile(userId);
      return buildMemberLifecycle(profile.lifecycle);
    },
    snapshot() {
      return persistCommunity({
        communityId: community.communityId,
        members: Array.from(profiles.keys()),
        guilds: Array.from(guilds.keys()),
        votes: votes.length
      });
    },
    history() {
      return Object.freeze([...history]);
    }
  };
}

function createCommunityApiResponse(data = {}, options = {}) {
  return Object.freeze({
    ok: true,
    decides: false,
    executes: options.executes === true,
    data,
    component: CE_COMPONENT.COMMUNITY_API
  });
}

module.exports = {
  CE_COMPONENT,
  CE_COMPONENT_ORDER,
  CE_VIP_TIER,
  CE_VIP_TIER_ORDER,
  CE_RELATIONSHIP,
  CE_REPUTATION,
  CE_PLATFORM,
  CE_LIFECYCLE,
  CE_FORBIDDEN_ACTIVITIES,
  CE_RUNTIME_ANCHORS,
  manageCommunity,
  createUserProfile,
  clampReputation,
  adjustReputation,
  createRelationship,
  strengthenRelationship,
  createGuild,
  assignVipTier,
  registerModerator,
  recordModeratorAction,
  castCommunityVote,
  collectCommunityAnalytics,
  recordCommunityHistory,
  persistCommunity,
  buildCommunityPipeline,
  buildMemberLifecycle,
  validateCommunityInput,
  resolveReputationBonus,
  getBattleCommunityContext,
  createCommunityEngine,
  createCommunityApiResponse,
  assertCommunityForbiddenActivity
};
