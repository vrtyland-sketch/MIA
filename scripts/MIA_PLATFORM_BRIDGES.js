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
    youtubeBridgeModule: youtubeBridgeModuleDep,
    responseEngine,
    getOutputState,
    getKojnozoutState
  } = deps;

  // Prefer injected module; fall back to local require so index.js need not change.
  let youtubeBridgeModule = youtubeBridgeModuleDep;
  if (!youtubeBridgeModule || typeof youtubeBridgeModule.start !== "function") {
    try {
      youtubeBridgeModule = require("./MIA_YOUTUBE_BRIDGE");
    } catch (_err) {
      youtubeBridgeModule = {};
    }
  }

  async function kickOnEvent(rawEvent) {
    const result = await processEvent(rawEvent);

    writeLog("kick-events", {
      event: cloneJson(rawEvent, rawEvent),
      result
    });

    return result;
  }

  /** Unified gateway: bridges POST to /ingest (same path as TikFinity). */
  function bridgeUsesIngestHttp(cfg = {}) {
    return safeString(cfg.ingestUrl, "http://127.0.0.1:3000/ingest");
  }

  async function startKickBridge() {
    const cfg = runtimeConfig?.kick || {};

    if (cfg.enabled === false) {
      writeLog("kick-bridge", {
        status: "disabled",
        reason: "kick.enabled=false"
      });
      console.warn(
        "[KICK_BRIDGE] Disabled (MIA_KICK_ENABLED=0). Kick chat will NOT reach MIA."
      );
      return { ok: false, reason: "disabled" };
    }

    const ingestUrl = bridgeUsesIngestHttp(cfg);
    console.log(`[KICK_BRIDGE] Route: Kick → ${ingestUrl} (unified /ingest gateway)`);

    try {
      if (
        cfg.mode === "webhook" &&
        typeof kickBridgeModule?.createKickWebhookBridge === "function"
      ) {
        kickBridgeModule.createKickWebhookBridge({
          app,
          webhookPath: cfg.webhookPath,
          ingestUrl,
          onEvent: null
        });
        writeLog("kick-bridge", {
          status: "webhook_registered",
          path: cfg.webhookPath
        });
        console.log(
          `[KICK_BRIDGE] Webhook registered on ${cfg.webhookPath}`
        );
        return { ok: true, mode: "webhook" };
      }

      if (typeof kickBridgeModule?.startKickBridge === "function") {
        return await kickBridgeModule.startKickBridge({
          config: { ...cfg, ingestUrl },
          onEvent: null
        });
      }

      if (typeof kickBridgeModule?.start === "function") {
        const result = await kickBridgeModule.start({
          config: { ...cfg, ingestUrl },
          onEvent: null
        });

        writeLog("kick-bridge", {
          status: "starting",
          result,
          channel: cfg.channel || null,
          chatroomId: cfg.chatroomId || null,
          ingestUrl: cfg.ingestUrl || null
        });

        if (result?.ok === false) {
          console.error("[KICK_BRIDGE] Failed to start:", result.reason);
        } else {
          console.log(
            "[KICK_BRIDGE] Realtime bridge starting",
            cfg.chatroomId
              ? { chatroomId: cfg.chatroomId }
              : cfg.channel
                ? { channel: cfg.channel }
                : {}
          );
        }

        return result;
      }

      console.error(
        "[KICK_BRIDGE] No kick bridge module export (start/createKickWebhookBridge missing)"
      );
      return { ok: false, reason: "module_missing" };
    } catch (err) {
      writeLog("mia-errors", {
        source: "kick_bridge",
        error: err.message
      });
      console.error("[KICK_BRIDGE_FAILED]", err.message);
      return { ok: false, reason: "exception", error: err.message };
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

    const ingestUrl = bridgeUsesIngestHttp(cfg);
    console.log(`[TWITCH_BRIDGE] Route: Twitch → ${ingestUrl} (unified /ingest gateway)`);

    try {
      if (
        typeof twitchBridgeModule?.createTwitchWebhookBridge === "function" &&
        cfg.mode === "webhook"
      ) {
        twitchBridgeModule.createTwitchWebhookBridge(app, {
          webhookPath: cfg.webhookPath,
          ingestUrl,
          onEvent: null
        });
      }
      if (typeof twitchBridgeModule?.start === "function" && cfg.mode !== "webhook") {
        twitchBridgeModule.start({
          config: { ...cfg, ingestUrl },
          onEvent: null
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

  async function youtubeOnEvent(rawEvent) {
    const result = await processEvent(rawEvent);
    writeLog("youtube-events", {
      event: cloneJson(rawEvent, rawEvent),
      result
    });
    return result;
  }

  function startYouTubeBridge() {
    const cfg = runtimeConfig?.youtube || {};
    if (!cfg.enabled) {
      writeLog("youtube-bridge", { status: "disabled" });
      if (typeof youtubeBridgeModule?.start !== "function") {
        return { ok: false, reason: "disabled" };
      }
      return youtubeBridgeModule.start({
        config: { ...cfg, enabled: false }
      });
    }

    const ingestUrl = bridgeUsesIngestHttp(cfg);
    console.log(`[YOUTUBE_BRIDGE] Route: YouTube → ${ingestUrl} (unified /ingest gateway)`);

    try {
      if (typeof youtubeBridgeModule?.start !== "function") {
        console.error("[YOUTUBE_BRIDGE] module missing");
        return { ok: false, reason: "module_missing" };
      }
      const result = youtubeBridgeModule.start({
        config: { ...cfg, ingestUrl },
        onEvent: null
      });
      Promise.resolve(result)
        .then((r) => {
          writeLog("youtube-bridge", { status: "starting", result: r });
          if (r?.ok === false) {
            console.error("[YOUTUBE_BRIDGE] Failed:", r.reason);
          } else {
            console.log("[YOUTUBE_BRIDGE] Chat-only poll starting", {
              liveChatId: r?.liveChatId || cfg.liveChatId || null
            });
          }
        })
        .catch((err) => {
          writeLog("mia-errors", { source: "youtube_bridge", error: err.message });
          console.error("[YOUTUBE_BRIDGE_FAILED]", err.message);
        });
      return result;
    } catch (err) {
      writeLog("mia-errors", { source: "youtube_bridge", error: err.message });
      console.error("[YOUTUBE_BRIDGE_FAILED]", err.message);
      return { ok: false, reason: "exception", error: err.message };
    }
  }

  function bootstrapPlatformBridges() {
    void startKickBridge().catch((err) => {
      writeLog("mia-errors", {
        source: "kick_bridge_bootstrap",
        error: err.message
      });
      console.error("[KICK_BRIDGE_BOOTSTRAP_FAILED]", err.message);
    });
    startTwitchBridge();
    startYouTubeBridge();
    startTelegramBridge();
  }

  return {
    kickOnEvent,
    startKickBridge,
    twitchOnEvent,
    startTwitchBridge,
    youtubeOnEvent,
    startYouTubeBridge,
    telegramOnMessage,
    startTelegramBridge,
    bootstrapPlatformBridges
  };
}

module.exports = { createPlatformBridges };
