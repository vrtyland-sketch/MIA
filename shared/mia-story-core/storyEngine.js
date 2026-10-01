"use strict";

/**
 * Master Canon 0046 — Story Engine: narrative system for the MIA world.
 */

const crypto = require("crypto");

const SE_COMPONENT = Object.freeze({
  STORY_MANAGER: "story_manager",
  CHAPTER_MANAGER: "chapter_manager",
  EVENT_MANAGER: "event_manager",
  DIALOGUE_MANAGER: "dialogue_manager",
  NPC_MANAGER: "npc_manager",
  CHOICE_MANAGER: "choice_manager",
  CONSEQUENCE_MANAGER: "consequence_manager",
  TIMELINE_MANAGER: "timeline_manager",
  STORY_ANALYTICS: "story_analytics",
  STORY_HISTORY: "story_history",
  STORY_PERSISTENCE: "story_persistence",
  STORY_API: "story_api"
});

const SE_COMPONENT_ORDER = Object.freeze(Object.values(SE_COMPONENT));

const SE_STORY_STATE = Object.freeze({
  DRAFT: "draft",
  ACTIVE: "active",
  PAUSED: "paused",
  COMPLETED: "completed",
  ARCHIVED: "archived"
});

const SE_CHAPTER_ORDER = Object.freeze([
  "prolog",
  "chapter_I",
  "chapter_II",
  "finale",
  "epilog"
]);

const SE_CANON_STORY = Object.freeze({
  KOJ_ORIGIN: "koj_origin",
  MIA_BIRTH: "mia_birth",
  FIRST_BOWL: "first_bowl",
  LEGENDARY_BATTLE: "legendary_battle",
  WORLD_HISTORY: "world_history"
});

const SE_CONSEQUENCE_TYPE = Object.freeze({
  REGION_CHANGE: "region_change",
  NEW_QUEST: "new_quest",
  NEW_NPC: "new_npc",
  REPUTATION_CHANGE: "reputation_change",
  NEW_BATTLE: "new_battle",
  UNLOCK_CHAPTER: "unlock_chapter"
});

const SE_FORBIDDEN_ACTIVITIES = Object.freeze([
  "mutate_economy",
  "mutate_battle_rules",
  "mutate_personality",
  "mutate_memory",
  "decide_outside_decision_engine"
]);

const SE_RUNTIME_ANCHORS = Object.freeze([
  "shared/mia-story-core/storyEngine.js",
  "shared/mia-conversation-core/conversationEngine.js",
  "shared/mia-world-core/worldEngine.js",
  "shared/mia-community-core/communityEngine.js",
  "scripts/MIA_STORY_MEMORY.js",
  "scripts/MIA_STORY_ARC_REGISTRY.js",
  "data/story-memory.json"
]);

const DEFAULT_STORY_DEFINITIONS = Object.freeze([
  {
    storyId: SE_CANON_STORY.KOJ_ORIGIN,
    name: "Původ Kojnožroutů",
    chapters: ["prolog", "chapter_I", "chapter_II"]
  },
  {
    storyId: SE_CANON_STORY.MIA_BIRTH,
    name: "Vznik MIA",
    chapters: ["prolog", "chapter_I"]
  },
  {
    storyId: SE_CANON_STORY.FIRST_BOWL,
    name: "Příběh první misky",
    chapters: ["prolog", "chapter_I", "finale"]
  },
  {
    storyId: SE_CANON_STORY.LEGENDARY_BATTLE,
    name: "Legendární Battle",
    chapters: ["chapter_I", "finale", "epilog"]
  }
]);

function manageStory(input = {}) {
  return Object.freeze({
    ok: true,
    storyId: input.storyId || `story-${crypto.randomUUID()}`,
    name: input.name || "Story",
    state: input.state || SE_STORY_STATE.ACTIVE,
    chapters: Object.freeze(input.chapters || []),
    activeCharacters: Object.freeze(input.activeCharacters || []),
    component: SE_COMPONENT.STORY_MANAGER
  });
}

function createChapter(input = {}) {
  return Object.freeze({
    ok: true,
    chapterId: input.chapterId || `chapter-${crypto.randomUUID()}`,
    storyId: input.storyId,
    title: input.title || input.chapterId || "Chapter",
    order: input.order != null ? Number(input.order) : 0,
    unlocked: input.unlocked === true,
    component: SE_COMPONENT.CHAPTER_MANAGER
  });
}

function advanceChapter(story = {}, currentChapterId) {
  const chapters = story.chapters || SE_CHAPTER_ORDER;
  const index = chapters.indexOf(currentChapterId);
  const next = index >= 0 && index < chapters.length - 1 ? chapters[index + 1] : null;
  return Object.freeze({
    ok: true,
    current: currentChapterId,
    next,
    unlocked: Boolean(next),
    component: SE_COMPONENT.CHAPTER_MANAGER
  });
}

function scheduleStoryEvent(input = {}) {
  return Object.freeze({
    ok: true,
    eventId: input.eventId || `story-event-${crypto.randomUUID()}`,
    type: input.type || "narrative",
    repeatable: input.repeatable === true,
    oneShot: input.repeatable !== true,
    component: SE_COMPONENT.EVENT_MANAGER
  });
}

function createDialogue(input = {}) {
  return Object.freeze({
    ok: true,
    dialogueId: input.dialogueId || `dlg-${crypto.randomUUID()}`,
    speaker: input.speaker || "mia",
    text: input.text || "",
    emotion: input.emotion || "neutral",
    conditions: Object.freeze(input.conditions || {}),
    reactions: Object.freeze(input.reactions || []),
    fromConversationEngine: input.fromConversationEngine === true,
    component: SE_COMPONENT.DIALOGUE_MANAGER
  });
}

function registerNpc(input = {}) {
  return Object.freeze({
    ok: true,
    npcId: input.npcId || `npc-${crypto.randomUUID()}`,
    name: input.name || "NPC",
    personalityRef: input.personalityRef || null,
    locationId: input.locationId || null,
    relationships: Object.freeze(input.relationships || {}),
    storyId: input.storyId || null,
    persistent: input.persistent !== false,
    component: SE_COMPONENT.NPC_MANAGER
  });
}

function presentCommunityChoice(input = {}) {
  return Object.freeze({
    ok: true,
    choiceId: input.choiceId || `choice-${crypto.randomUUID()}`,
    prompt: input.prompt || "Choose",
    options: Object.freeze(input.options || []),
    communityVote: true,
    component: SE_COMPONENT.CHOICE_MANAGER
  });
}

function resolveCommunityChoice(choice = {}, selection = {}) {
  const optionId = selection.optionId || selection.choice;
  const valid = (choice.options || []).some((o) => o.id === optionId || o === optionId);
  return Object.freeze({
    ok: valid,
    choiceId: choice.choiceId,
    selected: optionId,
    component: SE_COMPONENT.CHOICE_MANAGER
  });
}

function applyConsequence(consequence = {}, adapters = {}) {
  const results = [];
  if (consequence.type === SE_CONSEQUENCE_TYPE.REGION_CHANGE && adapters.worldEngine) {
    results.push(
      adapters.worldEngine.processWorldEvent({
        type: "unlock_region",
        regionId: consequence.regionId,
        approved: true
      })
    );
  }
  if (consequence.type === SE_CONSEQUENCE_TYPE.NEW_QUEST) {
    results.push({ ok: true, questId: consequence.questId, viaProgression: true });
  }
  if (consequence.type === SE_CONSEQUENCE_TYPE.REPUTATION_CHANGE && adapters.communityEngine) {
    results.push(
      adapters.communityEngine.processInteraction({
        userId: consequence.userId || "community",
        type: "quest",
        relationshipDelta: consequence.reputationDelta || 1
      })
    );
  }
  if (consequence.type === SE_CONSEQUENCE_TYPE.NEW_BATTLE) {
    results.push({ ok: true, battleSceneId: consequence.battleSceneId, battleRulesMutated: false });
  }
  return Object.freeze({
    ok: results.every((r) => r?.ok !== false),
    consequences: Object.freeze(results),
    longTerm: consequence.longTerm !== false,
    component: SE_COMPONENT.CONSEQUENCE_MANAGER
  });
}

function buildTimeline(entries = []) {
  return Object.freeze({
    ok: true,
    entries: Object.freeze(entries),
    consistent: true,
    component: SE_COMPONENT.TIMELINE_MANAGER
  });
}

function collectStoryAnalytics(run = {}) {
  return Object.freeze({
    chaptersCompleted: run.chaptersCompleted || 0,
    popularChoices: Object.freeze(run.popularChoices || []),
    favoriteNpcs: Object.freeze(run.favoriteNpcs || []),
    storiesCompleted: run.storiesCompleted || 0,
    communityActivity: run.communityActivity || 0,
    component: SE_COMPONENT.STORY_ANALYTICS
  });
}

function recordStoryHistory(entry = {}) {
  return Object.freeze({
    ok: true,
    historyId: `story-hist-${crypto.randomUUID()}`,
    storyId: entry.storyId,
    chapterId: entry.chapterId,
    choiceId: entry.choiceId,
    outcome: entry.outcome,
    immutable: true,
    recordedAt: Date.now(),
    component: SE_COMPONENT.STORY_HISTORY
  });
}

function persistStory(snapshot = {}) {
  return Object.freeze({
    ok: true,
    snapshotId: `story-snap-${crypto.randomUUID()}`,
    snapshot: Object.freeze(snapshot),
    persistedAt: Date.now(),
    component: SE_COMPONENT.STORY_PERSISTENCE
  });
}

function buildStoryPipeline(stages = {}) {
  return Object.freeze({
    ok: true,
    pipeline: Object.freeze([
      { step: "event", done: Boolean(stages.event) },
      { step: "chapter", done: Boolean(stages.chapter) },
      { step: "dialogue", done: Boolean(stages.dialogue) },
      { step: "decision", done: Boolean(stages.decision) },
      { step: "consequences", done: Boolean(stages.consequences) },
      { step: "history", done: Boolean(stages.history) }
    ]),
    component: SE_COMPONENT.STORY_MANAGER
  });
}

function buildStoryLifecycle(stages = {}) {
  return Object.freeze({
    ok: true,
    lifecycle: Object.freeze([
      { step: "design", done: Boolean(stages.design) },
      { step: "approval", done: Boolean(stages.approval) },
      { step: "prolog", done: Boolean(stages.prolog) },
      { step: "chapters", done: Boolean(stages.chapters) },
      { step: "finale", done: Boolean(stages.finale) },
      { step: "archive", done: Boolean(stages.archive) }
    ]),
    component: SE_COMPONENT.STORY_MANAGER
  });
}

function validateStoryInput(input = {}) {
  const errors = [];
  if (input.mutatesEconomy === true) errors.push("economy_mutation_forbidden");
  if (input.mutatesBattleRules === true) errors.push("battle_rules_mutation_forbidden");
  if (input.mutatesPersonality === true) errors.push("personality_mutation_forbidden");
  if (input.mutatesMemory === true) errors.push("memory_mutation_forbidden");
  if (input.decidesOutsideDecisionEngine === true) errors.push("decision_engine_required");
  if (input.bypassPipeline === true) errors.push("pipeline_required");
  return Object.freeze({
    ok: errors.length === 0,
    errors: Object.freeze(errors),
    component: SE_COMPONENT.STORY_API
  });
}

function assertStoryForbiddenActivity(activity) {
  const key = String(activity || "");
  return { ok: !SE_FORBIDDEN_ACTIVITIES.includes(key), activity: key };
}

function createStoryEngine(options = {}) {
  const stories = new Map();
  const npcs = new Map();
  const history = [];
  const timeline = [];
  let chaptersCompleted = 0;
  let storiesCompleted = 0;

  for (const def of DEFAULT_STORY_DEFINITIONS) {
    const story = manageStory({ ...def, state: SE_STORY_STATE.ACTIVE });
    stories.set(story.storyId, {
      ...story,
      currentChapter: def.chapters[0] || "prolog",
      unlockedChapters: [def.chapters[0]]
    });
  }
  if (Array.isArray(options.extraStories)) {
    for (const def of options.extraStories) {
      const story = manageStory(def);
      stories.set(story.storyId, {
        ...story,
        currentChapter: (def.chapters && def.chapters[0]) || "prolog",
        unlockedChapters: [(def.chapters && def.chapters[0]) || "prolog"]
      });
    }
  }

  return {
    registerStory(definition = {}) {
      const story = manageStory(definition);
      stories.set(story.storyId, {
        ...story,
        currentChapter: (definition.chapters && definition.chapters[0]) || "prolog",
        unlockedChapters: [(definition.chapters && definition.chapters[0]) || "prolog"]
      });
      return story;
    },
    registerNpc(definition = {}) {
      const npc = registerNpc(definition);
      npcs.set(npc.npcId, { ...npc });
      return npc;
    },
    processStoryBeat(beat = {}, adapters = {}) {
      const validation = validateStoryInput({
        mutatesEconomy: beat.mutatesEconomy,
        mutatesBattleRules: beat.mutatesBattleRules,
        mutatesPersonality: beat.mutatesPersonality,
        mutatesMemory: beat.mutatesMemory,
        decidesOutsideDecisionEngine: beat.decidesOutsideDecisionEngine,
        bypassPipeline: beat.bypassPipeline
      });
      if (!validation.ok) {
        return Object.freeze({
          ok: false,
          error: "invalid_story_input",
          validation,
          decides: false,
          component: SE_COMPONENT.STORY_API
        });
      }

      const storyId = beat.storyId || SE_CANON_STORY.FIRST_BOWL;
      const story = stories.get(storyId);
      if (!story) {
        return Object.freeze({ ok: false, error: "story_not_found", component: SE_COMPONENT.STORY_API });
      }

      const storyEvent = scheduleStoryEvent({ type: beat.eventType || "narrative" });

      let chapterAdvance = null;
      if (beat.advanceChapter) {
        chapterAdvance = advanceChapter(story, story.currentChapter);
        if (chapterAdvance.next) {
          story.currentChapter = chapterAdvance.next;
          if (!story.unlockedChapters.includes(chapterAdvance.next)) {
            story.unlockedChapters.push(chapterAdvance.next);
          }
          chaptersCompleted += 1;
        }
      }

      const dialogue = createDialogue({
        speaker: beat.speaker || "mia",
        text: beat.text || "",
        emotion: beat.emotion || "neutral",
        fromConversationEngine: beat.fromConversationEngine === true
      });

      let choiceResult = null;
      let consequenceResult = null;
      if (beat.choice) {
        const choice = presentCommunityChoice(beat.choice);
        if (beat.selection) {
          choiceResult = resolveCommunityChoice(choice, beat.selection);
          if (choiceResult.ok && beat.consequences) {
            consequenceResult = applyConsequence(beat.consequences, adapters);
          }
        }
      } else if (beat.consequences) {
        consequenceResult = applyConsequence(beat.consequences, adapters);
      }

      if (beat.fromDecisionEngine !== true && beat.requiresDecision === true) {
        return Object.freeze({
          ok: false,
          error: "decision_engine_required",
          component: SE_COMPONENT.STORY_API
        });
      }

      const hist = recordStoryHistory({
        storyId,
        chapterId: story.currentChapter,
        choiceId: choiceResult?.choiceId,
        outcome: choiceResult?.selected || beat.outcome
      });
      history.push(hist);
      timeline.push({
        at: Date.now(),
        storyId,
        chapterId: story.currentChapter,
        eventId: storyEvent.eventId
      });

      if (story.currentChapter === "epilog" || story.currentChapter === "finale") {
        storiesCompleted += 1;
      }

      const analytics = collectStoryAnalytics({
        chaptersCompleted,
        popularChoices: choiceResult ? [{ id: choiceResult.selected, count: 1 }] : [],
        favoriteNpcs: Array.from(npcs.keys()).slice(0, 3),
        storiesCompleted,
        communityActivity: beat.choice ? 1 : 0
      });

      const pipeline = buildStoryPipeline({
        event: true,
        chapter: true,
        dialogue: Boolean(dialogue.text) || beat.skipDialogue === true,
        decision: !beat.choice || Boolean(choiceResult?.ok),
        consequences: !beat.consequences || Boolean(consequenceResult?.ok),
        history: true
      });

      const lifecycle = buildStoryLifecycle({
        design: true,
        approval: beat.approved !== false,
        prolog: story.unlockedChapters.includes("prolog"),
        chapters: story.unlockedChapters.length > 1,
        finale: story.unlockedChapters.includes("finale"),
        archive: false
      });

      const persistence = persistStory({
        storyId,
        currentChapter: story.currentChapter,
        timelineLength: timeline.length
      });

      return Object.freeze({
        ok: pipeline.pipeline.every((s) => s.done),
        story: manageStory(story),
        event: storyEvent,
        chapter: chapterAdvance,
        dialogue,
        choice: choiceResult,
        consequences: consequenceResult,
        analytics,
        pipeline,
        lifecycle,
        persistence,
        mutatesEconomy: false,
        mutatesBattleRules: false,
        decides: false,
        component: SE_COMPONENT.STORY_API
      });
    },
    reportBattleOutcome(outcome = {}, adapters = {}) {
      return this.processStoryBeat(
        {
          storyId: outcome.storyId || SE_CANON_STORY.LEGENDARY_BATTLE,
          eventType: "battle",
          text: outcome.victory ? "Battle vyhrán!" : "Battle skončil.",
          fromDecisionEngine: true,
          consequences: outcome.victory
            ? {
                type: SE_CONSEQUENCE_TYPE.UNLOCK_CHAPTER,
                longTerm: true
              }
            : null,
          advanceChapter: outcome.victory === true,
          approved: true
        },
        adapters
      );
    },
    getTimeline() {
      return buildTimeline(timeline);
    },
    snapshot() {
      return persistStory({
        stories: Array.from(stories.keys()),
        npcs: Array.from(npcs.keys()),
        historyCount: history.length
      });
    },
    history() {
      return Object.freeze([...history]);
    }
  };
}

function createStoryApiResponse(data = {}, options = {}) {
  return Object.freeze({
    ok: true,
    decides: false,
    executes: options.executes === true,
    data,
    component: SE_COMPONENT.STORY_API
  });
}

module.exports = {
  SE_COMPONENT,
  SE_COMPONENT_ORDER,
  SE_STORY_STATE,
  SE_CHAPTER_ORDER,
  SE_CANON_STORY,
  SE_CONSEQUENCE_TYPE,
  SE_FORBIDDEN_ACTIVITIES,
  SE_RUNTIME_ANCHORS,
  DEFAULT_STORY_DEFINITIONS,
  manageStory,
  createChapter,
  advanceChapter,
  scheduleStoryEvent,
  createDialogue,
  registerNpc,
  presentCommunityChoice,
  resolveCommunityChoice,
  applyConsequence,
  buildTimeline,
  collectStoryAnalytics,
  recordStoryHistory,
  persistStory,
  buildStoryPipeline,
  buildStoryLifecycle,
  validateStoryInput,
  createStoryEngine,
  createStoryApiResponse,
  assertStoryForbiddenActivity
};
