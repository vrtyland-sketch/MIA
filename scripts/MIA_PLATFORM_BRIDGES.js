"use strict";

/**
 * Platform bridges — Kick, Twitch, Telegram wiring into MIA ingest/chat.
 */

function createPlatformBridges(deps = {}) {
  const {
    app,
    runtimeConfig,
    writeLog,
    cloneJson,
    safeString,
    processEvent,
    kickBridgeModule,
    twitchBridgeModule,
    telegramBridgeModule,
    responseEngine,
    getOutputState,
    getKojnozoutState
  } = deps;

  async function kickOnEvent(rawEvent) {
    const result = await processEvent(rawEvent);

    writeLog("kick-events", {
      event: cloneJson(rawEvent, rawEvent),
      result
    });

    return result;
  }

  function startKickBridge() {
    try {
      if (typeof kickBridgeModule?.startKickBridge === "function") {
        kickBridgeModule.startKickBridge({
          config: runtimeConfig?.kick || {},
          onEvent: kickOnEvent
        });
      } else if (typeof kickBridgeModule?.start === "function") {
        kickBridgeModule.start({
          config: runtimeConfig?.kick || {},
          onEvent: kickOnEvent
        });
      } else if (typeof kickBridgeModule?.createKickWebhookBridge === "function") {
        kickBridgeModule.createKickWebhookBridge(app, {
          onEvent: kickOnEvent,
          config: runtimeConfig?.kick || {}
        });
      }
    } catch (err) {
      writeLog("mia-errors", {
        source: "kick_bridge",
        error: err.message
      });
      console.error("[KICK_BRIDGE_FAILED]", err.message);
    }
  }

  async function twitchOnEvent(rawEvent) {
    const result = await processEvent(rawEvent);

    writeLog("twitch-events", {
      event: cloneJson(rawEvent, rawEvent),
      result
    });

    return result;
  }

  function startTwitchBridge() {
    const cfg = runtimeConfig?.twitch || {};
    if (!cfg.enabled) return;

    try {
      if (
        typeof twitchBridgeModule?.createTwitchWebhookBridge === "function" &&
        cfg.mode === "webhook"
      ) {
        twitchBridgeModule.createTwitchWebhookBridge(app, {
          webhookPath: cfg.webhookPath,
          ingestUrl: cfg.ingestUrl,
          onEvent: twitchOnEvent
        });
      }
      if (typeof twitchBridgeModule?.start === "function" && cfg.mode !== "webhook") {
        twitchBridgeModule.start({
          config: cfg,
          onEvent: twitchOnEvent
        });
      }
    } catch (err) {
      writeLog("mia-errors", {
        source: "twitch_bridge",
        error: err.message
      });
      console.error("[TWITCH_BRIDGE_FAILED]", err.message);
    }
  }

  async function telegramOnMessage(ctx = {}) {
    const userLabel = safeString(ctx.userLabel, `tg_${ctx.userId || "user"}`);
    const message = safeString(ctx.text);

    if (!message && ctx.attachmentKind) {
      return {
        text:
          typeof telegramBridgeModule?.buildAttachmentAck === "function"
            ? telegramBridgeModule.buildAttachmentAck(ctx)
            : "Soubor přijat."
      };
    }

    if (!message) {
      return { text: "Napiš mi text — zpracuju to přes MIA." };
    }

    const kojnozoutState = getKojnozoutState?.() || {};
    const outputStateWithKoj = {
      ...(getOutputState?.() || {}),
      kojnozoutSnapshot: kojnozoutState,
      kojnozoutState
    };

    let result = null;
    if (typeof responseEngine?.buildDirectChatResponseAsync === "function") {
      result = await responseEngine.buildDirectChatResponseAsync(outputStateWithKoj, {
        message,
        userLabel,
        target: "mia",
        speaker: "mia",
        runtimeConfig
      });
    } else if (typeof responseEngine?.buildDirectChatResponse === "function") {
      result = responseEngine.buildDirectChatResponse(outputStateWithKoj, {
        message,
        userLabel,
        target: "mia",
        speaker: "mia",
        runtimeConfig
      });
    }

    const reply = safeString(
      result?.speech_text ||
        result?.overlayPayload?.text ||
        result?.response?.text
    );

    return { text: reply || "Moment — zkus to prosím znovu za chvíli." };
  }

  function startTelegramBridge() {
    try {
      if (typeof telegramBridgeModule?.startTelegramBridge !== "function") return;

      telegramBridgeModule.startTelegramBridge({
        config: {
          ...(runtimeConfig?.telegram || {}),
          runtimeConfig
        },
        onMessage: telegramOnMessage
      });
    } catch (err) {
      writeLog("mia-errors", {
        source: "telegram_bridge",
        error: err.message
      });
      console.error("[TELEGRAM_BRIDGE_FAILED]", err.message);
    }
  }

  function bootstrapPlatformBridges() {
    startKickBridge();
    startTwitchBridge();
    startTelegramBridge();
  }

  return {
    kickOnEvent,
    startKickBridge,
    twitchOnEvent,
    startTwitchBridge,
    telegramOnMessage,
    startTelegramBridge,
    bootstrapPlatformBridges
  };
}

module.exports = { createPlatformBridges };
