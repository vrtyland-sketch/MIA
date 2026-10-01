"use strict";

/**
 * Master Canon 0034 — Conversation Engine: dialogue orchestration for MIA.
 */

const crypto = require("crypto");

const CE_COMPONENT = Object.freeze({
  CONVERSATION_MANAGER: "conversation_manager",
  CONTEXT_MANAGER: "context_manager",
  DIALOGUE_PLANNER: "dialogue_planner",
  INTENT_ANALYZER: "intent_analyzer",
  TOPIC_TRACKER: "topic_tracker",
  SPEAKER_MANAGER: "speaker_manager",
  TURN_MANAGER: "turn_manager",
  RESPONSE_BUILDER: "response_builder",
  LANGUAGE_MANAGER: "language_manager",
  CONVERSATION_HISTORY: "conversation_history",
  CONVERSATION_METRICS: "conversation_metrics",
  CONVERSATION_API: "conversation_api"
});

const CE_COMPONENT_ORDER = Object.freeze(Object.values(CE_COMPONENT));

const CE_SPEAKER = Object.freeze({
  MIA: "mia",
  KOJNOZROUT: "kojnozout",
  BOTH: "both",
  SYSTEM: "system"
});

const CE_INTENT = Object.freeze({
  QUESTION: "question",
  PRAISE: "praise",
  CRITICISM: "criticism",
  COMMAND: "command",
  REQUEST: "request",
  BATTLE: "battle",
  HUMOR: "humor",
  TEST: "test",
  GIFT: "gift",
  CHAT: "chat"
});

const CE_TOPIC = Object.freeze({
  BATTLE: "battle",
  KOJNOZROUT: "kojnozout",
  DEVELOPMENT: "development",
  OBS: "obs",
  AI: "ai",
  GRAPHICS: "graphics",
  GENERAL: "general"
});

const CE_LANGUAGE = Object.freeze({
  CS: "cs",
  EN: "en",
  SK: "sk"
});

const CE_THREAD = Object.freeze({
  TIKTOK: "tiktok",
  KICK: "kick",
  BATTLE: "battle",
  ADMIN: "admin",
  INTERNAL_AI: "internal_ai"
});

const CE_CONVERSATION_STATE = Object.freeze({
  ACTIVE: "active",
  WAITING: "waiting",
  PAUSED: "paused",
  CLOSED: "closed"
});

const CE_FORBIDDEN_ACTIVITIES = Object.freeze([
  "mutate_memory",
  "mutate_personality",
  "decide_economy",
  "bypass_decision_engine",
  "respond_without_context"
]);

const CE_RUNTIME_ANCHORS = Object.freeze([
  "shared/mia-conversation-core/conversationEngine.js",
  "shared/mia-decision-core/decisionEngine.js",
  "shared/mia-emotion-core/emotionEngine.js",
  "shared/mia-personality-core/personalityEngine.js",
  "scripts/MIA_TTS_ENGINE.js",
  "mia-output-overlay/speech-overlay.html"
]);

function createConversation(conversationId, participants = [], options = {}) {
  return Object.freeze({
    conversationId: conversationId || `conv-${crypto.randomUUID()}`,
    participants: Object.freeze(participants),
    state: options.state || CE_CONVERSATION_STATE.ACTIVE,
    priority: options.priority != null ? Number(options.priority) : 50,
    threadId: options.threadId || CE_THREAD.TIKTOK,
    createdAt: Date.now(),
    component: CE_COMPONENT.CONVERSATION_MANAGER
  });
}

function manageConversation(registry = [], input = {}) {
  const conversation = createConversation(input.conversationId, input.participants, input);
  const conversations = Object.freeze([...registry, conversation]);

  return Object.freeze({
    ok: true,
    conversation,
    conversations,
    component: CE_COMPONENT.CONVERSATION_MANAGER
  });
}

function buildConversationContext(input = {}, memory = {}) {
  const context = Object.freeze({
    contextId: `ctx-${crypto.randomUUID()}`,
    conversationId: input.conversationId || null,
    threadId: input.threadId || CE_THREAD.TIKTOK,
    message: input.message || input.text || null,
    userId: input.userId || null,
    battleActive: Boolean(input.battleActive),
    streamActive: input.streamActive !== false,
    language: input.language || CE_LANGUAGE.CS,
    previousMessages: Object.freeze(memory.previousMessages || input.previousMessages || []),
    workingMemory: Boolean(memory.working !== false),
    component: CE_COMPONENT.CONTEXT_MANAGER
  });

  return Object.freeze({
    ok: true,
    context,
    component: CE_COMPONENT.CONTEXT_MANAGER
  });
}

function planDialogue(intent = {}, topic = {}) {
  const steps = ["greeting", "response"];

  if (intent.intent === CE_INTENT.QUESTION) steps.push("clarifying_question");
  if (intent.intent === CE_INTENT.PRAISE || intent.intent === CE_INTENT.GIFT) steps.push("acknowledgement");
  if (topic.topic === CE_TOPIC.BATTLE) steps.push("battle_commentary");
  steps.push("summary");

  return Object.freeze({
    ok: true,
    steps: Object.freeze(steps.map((step, index) => Object.freeze({ stepId: `dlg-${index + 1}`, action: step }))),
    component: CE_COMPONENT.DIALOGUE_PLANNER
  });
}

function analyzeIntent(message = {}, context = {}) {
  const text = String(message.text || message.message || "").toLowerCase();
  let intent = CE_INTENT.CHAT;

  if (context.gift || text.includes("gift") || text.includes("dárek")) intent = CE_INTENT.GIFT;
  else if (text.includes("?") || text.startsWith("jak") || text.startsWith("co")) intent = CE_INTENT.QUESTION;
  else if (text.includes("díky") || text.includes("super") || text.includes("paráda")) intent = CE_INTENT.PRAISE;
  else if (text.includes("špatně") || text.includes("nefunguje")) intent = CE_INTENT.CRITICISM;
  else if (text.startsWith("!") || text.includes("spusť")) intent = CE_INTENT.COMMAND;
  else if (context.battleActive || text.includes("battle")) intent = CE_INTENT.BATTLE;
  else if (text.includes("haha") || text.includes("vtip")) intent = CE_INTENT.HUMOR;
  else if (text.includes("test")) intent = CE_INTENT.TEST;

  return Object.freeze({
    ok: true,
    intent,
    confidence: 0.8,
    forDecisionEngine: true,
    component: CE_COMPONENT.INTENT_ANALYZER
  });
}

function trackTopic(message = {}, context = {}, previous = {}) {
  const text = String(message.text || message.message || "").toLowerCase();
  let topic = previous.topic || CE_TOPIC.GENERAL;
  let changed = false;

  if (context.battleActive || text.includes("battle")) {
    changed = topic !== CE_TOPIC.BATTLE;
    topic = CE_TOPIC.BATTLE;
  } else if (text.includes("koj") || text.includes("kojnožrout")) {
    changed = topic !== CE_TOPIC.KOJNOZROUT;
    topic = CE_TOPIC.KOJNOZROUT;
  } else if (text.includes("obs")) {
    changed = topic !== CE_TOPIC.OBS;
    topic = CE_TOPIC.OBS;
  } else if (text.includes("ai")) {
    changed = topic !== CE_TOPIC.AI;
    topic = CE_TOPIC.AI;
  } else if (text.includes("graf")) {
    changed = topic !== CE_TOPIC.GRAPHICS;
    topic = CE_TOPIC.GRAPHICS;
  } else if (text.includes("vývoj") || text.includes("projekt")) {
    changed = topic !== CE_TOPIC.DEVELOPMENT;
    topic = CE_TOPIC.DEVELOPMENT;
  }

  return Object.freeze({
    ok: true,
    topic,
    changed,
    previousTopic: previous.topic || null,
    component: CE_COMPONENT.TOPIC_TRACKER
  });
}

function selectSpeaker(intent = {}, context = {}) {
  let speaker = CE_SPEAKER.MIA;

  if (intent.intent === CE_INTENT.GIFT) speaker = CE_SPEAKER.KOJNOZROUT;
  else if (context.obsDown || intent.intent === CE_INTENT.CRITICISM) speaker = CE_SPEAKER.MIA;
  else if (intent.intent === CE_INTENT.BATTLE || context.battleActive) speaker = CE_SPEAKER.BOTH;
  else if (intent.intent === CE_INTENT.TEST && context.systemMessage) speaker = CE_SPEAKER.SYSTEM;

  return Object.freeze({
    ok: true,
    speaker,
    component: CE_COMPONENT.SPEAKER_MANAGER
  });
}

function manageTurn(conversation = {}, speaker = CE_SPEAKER.MIA) {
  const sequence = Object.freeze([
    { role: "viewer", at: Date.now() },
    { role: speaker, at: Date.now() + 1 }
  ]);

  return Object.freeze({
    ok: true,
    conversationId: conversation.conversationId,
    nextSpeaker: speaker,
    sequence,
    interruptible: speaker !== CE_SPEAKER.BOTH,
    component: CE_COMPONENT.TURN_MANAGER
  });
}

function detectLanguage(message = {}) {
  const text = String(message.text || message.message || "");
  if (/[áčďéěíňóřšťúůýž]/i.test(text)) return CE_LANGUAGE.CS;
  if (/\b(aky|ako|dakujem|prosim)\b/i.test(text)) return CE_LANGUAGE.SK;
  if (/\b(the|what|hello|thanks)\b/i.test(text)) return CE_LANGUAGE.EN;
  return CE_LANGUAGE.CS;
}

function manageLanguage(message = {}, preferred = null) {
  const detected = detectLanguage(message);
  return Object.freeze({
    ok: true,
    detected,
    active: preferred || detected,
    component: CE_COMPONENT.LANGUAGE_MANAGER
  });
}

function buildResponse(input = {}) {
  const {
    speaker = CE_SPEAKER.MIA,
    personality = {},
    emotion = {},
    decision = {},
    context = {},
    intent = {}
  } = input;

  const tone = personality.combined?.tone || personality.tone || "friendly";
  const intensity = emotion.intensity != null ? emotion.intensity : 50;
  const user = context.userId ? `@${context.userId}` : "kamaráde";

  let text = "Ahoj!";
  if (intent.intent === CE_INTENT.GIFT) {
    text = speaker === CE_SPEAKER.KOJNOZROUT ? `${user}, děkuju za krmení!` : `${user}, moc děkuju za podporu!`;
  } else if (intent.intent === CE_INTENT.QUESTION) {
    text = `Dobrá otázka, ${user}. Mrknu na to.`;
  } else if (intent.intent === CE_INTENT.BATTLE) {
    text = speaker === CE_SPEAKER.BOTH ? `Battle pokračuje! Držíme palce, ${user}!` : `Jdeme do Battle, ${user}!`;
  } else if (intent.intent === CE_INTENT.PRAISE) {
    text = `To mě moc těší, ${user}!`;
  } else if (decision.actionPlan?.steps?.length) {
    text = `Rozumím, ${user}. Připravuju reakci.`;
  } else {
    text = `Díky za zprávu, ${user}!`;
  }

  return Object.freeze({
    ok: true,
    speaker,
    text,
    tone,
    intensity,
    language: context.language || CE_LANGUAGE.CS,
    forSpeechEngine: true,
    decides: false,
    component: CE_COMPONENT.RESPONSE_BUILDER
  });
}

function recordConversationHistory(conversation = {}, turn = {}, response = {}) {
  return Object.freeze({
    historyId: `conv-history-${crypto.randomUUID()}`,
    conversationId: conversation.conversationId,
    threadId: conversation.threadId,
    participants: conversation.participants,
    userMessage: turn.userMessage || null,
    responseText: response.text || null,
    speaker: response.speaker || null,
    topic: turn.topic || null,
    intent: turn.intent || null,
    recordedAt: Date.now(),
    memoryLinked: true,
    component: CE_COMPONENT.CONVERSATION_HISTORY
  });
}

function collectConversationMetrics(run = {}) {
  return Object.freeze({
    conversationId: run.conversationId,
    messageCount: run.messageCount || 1,
    topicChanges: run.topicChanges || 0,
    responseTimeMs: run.responseTimeMs || 0,
    dialogueLength: run.dialogueLength || 1,
    satisfaction: run.satisfaction != null ? run.satisfaction : null,
    component: CE_COMPONENT.CONVERSATION_METRICS
  });
}

function adaptMemoryContext(memory = {}) {
  return Object.freeze({
    readOnly: true,
    working: Boolean(memory.working),
    shortTerm: Boolean(memory.shortTerm),
    previousMessages: Object.freeze(memory.previousMessages || []),
    component: CE_COMPONENT.CONVERSATION_API
  });
}

function assertConversationForbiddenActivity(activity) {
  const key = String(activity || "");
  return { ok: !CE_FORBIDDEN_ACTIVITIES.includes(key), activity: key };
}

function createConversationEngine(options = {}) {
  const conversations = new Map();
  const histories = [];
  const topicByConversation = new Map();

  return {
    openConversation(input = {}) {
      const managed = manageConversation([], input);
      conversations.set(managed.conversation.conversationId, managed.conversation);
      topicByConversation.set(managed.conversation.conversationId, { topic: CE_TOPIC.GENERAL });
      return managed;
    },
    handleMessage(input = {}, adapters = {}) {
      const startedAt = Date.now();
      const conversation =
        input.conversationId && conversations.get(input.conversationId)
          ? conversations.get(input.conversationId)
          : this.openConversation({
              threadId: input.threadId || CE_THREAD.TIKTOK,
              participants: input.participants || ["viewer", CE_SPEAKER.MIA]
            }).conversation;

      const memory = adaptMemoryContext(adapters.memory || {});
      const built = buildConversationContext(
        { ...input, conversationId: conversation.conversationId },
        memory
      );

      if (!built.context.message && !input.gift) {
        return Object.freeze({
          ok: false,
          error: "missing_context",
          component: CE_COMPONENT.CONVERSATION_API
        });
      }

      const intent = analyzeIntent(input, built.context);
      const previousTopic = topicByConversation.get(conversation.conversationId) || {};
      const topic = trackTopic(input, built.context, previousTopic);
      topicByConversation.set(conversation.conversationId, { topic: topic.topic });

      const dialogue = planDialogue(intent, topic);
      const language = manageLanguage(input, built.context.language);
      const speaker = selectSpeaker(intent, built.context);
      const turn = manageTurn(conversation, speaker.speaker);

      const emotionResult = adapters.emotionEngine
        ? adapters.emotionEngine.evaluate(
            {
              eventType: intent.intent === CE_INTENT.GIFT ? "gift" : "chat",
              chatMessage: built.context.message,
              gift: input.gift,
              battleActive: built.context.battleActive,
              userId: built.context.userId
            },
            adapters.emotionalMemory || {}
          )
        : adapters.emotion || { emotionState: {}, decisionAdapter: {} };

      const personalityResult = adapters.personalityEngine
        ? adapters.personalityEngine.resolve(
            speaker.speaker === CE_SPEAKER.KOJNOZROUT ? "kojnozout.pet" : "mia.main",
            built.context,
            emotionResult.emotionState || {}
          )
        : adapters.personality || { combined: {}, decisionContext: {} };

      const decisionResult = adapters.decisionEngine
        ? adapters.decisionEngine.decide({
            sources: {
              event: {
                type: intent.intent === CE_INTENT.GIFT ? "gift" : "chat",
                message: built.context.message,
                gift: input.gift,
                battleActive: built.context.battleActive,
                userId: built.context.userId
              },
              chat: { active: true }
            },
            adapters: {
              emotion: emotionResult.decisionAdapter,
              memory: { working: memory.working, shortTerm: memory.shortTerm }
            }
          })
        : adapters.decision || { ok: true, executes: false };

      if (!decisionResult.ok) {
        return Object.freeze({
          ok: false,
          error: "decision_blocked",
          decision: decisionResult,
          component: CE_COMPONENT.CONVERSATION_API
        });
      }

      const response = buildResponse({
        speaker: speaker.speaker,
        personality: personalityResult,
        emotion: emotionResult.emotionState || {},
        decision: decisionResult,
        context: { ...built.context, language: language.active },
        intent
      });

      const history = recordConversationHistory(conversation, {
        userMessage: built.context.message,
        topic: topic.topic,
        intent: intent.intent
      }, response);
      histories.push(history);

      const metrics = collectConversationMetrics({
        conversationId: conversation.conversationId,
        messageCount: histories.filter((h) => h.conversationId === conversation.conversationId).length,
        topicChanges: topic.changed ? 1 : 0,
        responseTimeMs: Date.now() - startedAt,
        dialogueLength: dialogue.steps.length
      });

      return Object.freeze({
        ok: true,
        conversation,
        context: built.context,
        intent,
        topic,
        dialogue,
        language,
        speaker,
        turn,
        emotion: emotionResult,
        personality: personalityResult,
        decision: decisionResult,
        response,
        history,
        metrics,
        decides: false,
        executes: false,
        forSpeechEngine: true,
        component: CE_COMPONENT.CONVERSATION_API
      });
    },
    conversations() {
      return Object.freeze([...conversations.values()]);
    },
    histories() {
      return Object.freeze([...histories]);
    }
  };
}

function createConversationApiResponse(data = {}, options = {}) {
  return Object.freeze({
    ok: true,
    decides: false,
    executes: options.executes === true,
    data,
    component: CE_COMPONENT.CONVERSATION_API
  });
}

module.exports = {
  CE_COMPONENT,
  CE_COMPONENT_ORDER,
  CE_SPEAKER,
  CE_INTENT,
  CE_TOPIC,
  CE_LANGUAGE,
  CE_THREAD,
  CE_CONVERSATION_STATE,
  CE_FORBIDDEN_ACTIVITIES,
  CE_RUNTIME_ANCHORS,
  createConversation,
  manageConversation,
  buildConversationContext,
  planDialogue,
  analyzeIntent,
  trackTopic,
  selectSpeaker,
  manageTurn,
  detectLanguage,
  manageLanguage,
  buildResponse,
  recordConversationHistory,
  collectConversationMetrics,
  adaptMemoryContext,
  createConversationEngine,
  createConversationApiResponse,
  assertConversationForbiddenActivity
};
