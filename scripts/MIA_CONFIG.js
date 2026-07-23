"use strict";

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function toBool(value, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value !== "string") return fallback;

  const normalized = value.trim().toLowerCase();

  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;

  return fallback;
}

function toString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function toStringArray(value, fallback = []) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || "").trim()).filter(Boolean);
  }

  if (typeof value === "string" && value.trim()) {
    return value.split(",").map((item) => item.trim()).filter(Boolean);
  }

  return Array.isArray(fallback) ? fallback.slice() : [];
}

function pickString(env, keys = [], fallback = "") {
  for (const key of keys) {
    const value = toString(env?.[key], "");
    if (value) return value;
  }
  return fallback;
}

function pickBool(env, keys = [], fallback = false) {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(env || {}, key)) {
      return toBool(env[key], fallback);
    }
  }
  return fallback;
}

function pickNumber(env, keys = [], fallback = 0) {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(env || {}, key)) {
      return toNumber(env[key], fallback);
    }
  }
  return fallback;
}

function pickStringArray(env, keys = [], fallback = []) {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(env || {}, key)) {
      return toStringArray(env[key], fallback);
    }
  }
  return toStringArray(undefined, fallback);
}

function deriveRuntimeMode(env = process.env) {
  const explicit = pickString(
    env,
    ["MIA_ACTIVE_RUNTIME", "MIA_RUNTIME", "ACTIVE_RUNTIME"],
    ""
  ).toUpperCase();

  if (["MIA41", "LEGACY", "SHADOW", "MIA_NEXT"].includes(explicit)) {
    return explicit === "LEGACY" ? "MIA41" : explicit;
  }

  const nextEnabled = pickBool(
    env,
    ["MIA_NEXT_RUNTIME_ENABLED", "MIA_NEXT_ENABLED"],
    true
  );

  const shadowEnabled = pickBool(env, ["MIA_SHADOW_RUNTIME_ENABLED"], false);

  if (nextEnabled) return "MIA_NEXT";
  if (shadowEnabled) return "SHADOW";

  return "MIA41";
}

function buildOverlaySceneMap(overrides = {}, env = null) {
  const source = env && typeof env === "object" ? { ...env, ...overrides } : overrides || {};

  const pick = (keys, fallback) => {
    for (const key of keys) {
      const value = toString(source?.[key], "");
      if (value) return value;
    }
    return fallback;
  };

  const base = {
    mia: pick(["MIA_OBS_SCENE_MIA", "mia"], "MIA_SCENE"),
    miaSupport: pick(["MIA_OBS_SCENE_MIA_SUPPORT", "miaSupport"], "MIA_SUPPORT_SCENE"),
    miaShare: pick(["MIA_OBS_SCENE_MIA_SHARE", "miaShare"], "MIA_SHARE_SCENE"),
    miaCommunity: pick(["MIA_OBS_SCENE_MIA_COMMUNITY", "miaCommunity"], "MIA_SCENE"),
    miaBattle: pick(
      ["MIA_OBS_SCENE_MIA_BATTLE", "MIA_OBS_SCENE_MIA_COMBAT", "miaBattle"],
      "MIA_BATTLE_SCENE"
    ),
    kojnozout: pick(["MIA_OBS_SCENE_KOJNOZOUT", "kojnozout"], "KOJNOZROUT_SCENE"),
    kojnozoutSupport: pick(
      ["MIA_OBS_SCENE_KOJNOZOUT_SUPPORT", "kojnozoutSupport"],
      "KOJNOZROUT_SUPPORT_SCENE"
    ),
    kojnozoutShare: pick(
      ["MIA_OBS_SCENE_KOJNOZOUT_SHARE", "kojnozoutShare"],
      "KOJNOZROUT_SHARE_SCENE"
    ),
    kojnozoutCommunity: pick(
      ["MIA_OBS_SCENE_KOJNOZOUT_COMMUNITY", "kojnozoutCommunity"],
      "KOJNOZROUT_SCENE"
    ),
    kojnozoutBattle: pick(
      [
        "MIA_OBS_SCENE_KOJNOZOUT_BATTLE",
        "MIA_OBS_SCENE_KOJNOZOUT_COMBAT",
        "kojnozoutBattle"
      ],
      "KOJNOZROUT_BATTLE_SCENE"
    ),
    battle: pick(["MIA_OBS_SCENE_BATTLE", "MIA_OBS_SCENE_COMBAT", "battle"], "BATTLE_SCENE"),
    combat: pick(["MIA_OBS_SCENE_COMBAT", "combat"], "BATTLE_SCENE"),
    default: pick(["MIA_OBS_SCENE_DEFAULT", "default"], ""),
    idle: pick(["MIA_OBS_SCENE_IDLE", "idle"], ""),
    lobby: pick(["MIA_OBS_SCENE_LOBBY", "lobby"], ""),
    intro: pick(["MIA_OBS_SCENE_INTRO", "intro"], ""),
    outro: pick(["MIA_OBS_SCENE_OUTRO", "outro"], "")
  };

  if (base.battle === "BATTLE_SCENE" && base.combat !== "BATTLE_SCENE") {
    base.battle = base.combat;
  } else if (base.combat === "BATTLE_SCENE" && base.battle !== "BATTLE_SCENE") {
    base.combat = base.battle;
  }

  return base;
}

function buildRuntimeConfig(env = process.env) {
  const port = toNumber(env.PORT, 3000);

  const obsUrl = pickString(env, ["OBS_WS_URL", "MIA_OBS_WS_URL"], "ws://127.0.0.1:4455");
  const obsPassword = pickString(env, ["OBS_WS_PASSWORD", "MIA_OBS_WS_PASSWORD"], "");
  const obsSceneName = pickString(
    env,
    ["OBS_SCENE_NAME", "MIA_OBS_SCENE_NAME", "MIA_ENGINE_SCENE_NAME"],
    "SPINAK_ENGINE_GIFTS"
  );

  const overlayEnabled = pickBool(env, ["MIA_OVERLAY_ENABLED"], true);
  const overlayObsControlEnabled = pickBool(
    env,
    ["MIA_OVERLAY_OBS_CONTROL_ENABLED", "MIA_OBS_CONTROL_ENABLED"],
    false
  );
  const overlayMaxChatFeedItems = pickNumber(env, ["MIA_OVERLAY_MAX_CHAT_FEED_ITEMS"], 6);
  const overlayChatFeedMaxAgeMs = pickNumber(env, ["MIA_OVERLAY_CHAT_FEED_MAX_AGE_MS"], 35000);

  const deferredCommunityMaxItems = pickNumber(
    env,
    ["MIA_OVERLAY_DEFERRED_MAX_ITEMS", "MIA_DEFERRED_COMMUNITY_MAX_ITEMS"],
    6
  );
  const deferredCommunityMaxAgeMs = pickNumber(
    env,
    ["MIA_OVERLAY_DEFERRED_MAX_AGE_MS", "MIA_DEFERRED_COMMUNITY_MAX_AGE_MS"],
    15000
  );
  const deferredReplayPollMs = pickNumber(
    env,
    ["MIA_OVERLAY_DEFERRED_REPLAY_POLL_MS", "MIA_DEFERRED_REPLAY_POLL_MS"],
    400
  );

  const publicChatWriteEnabled = pickBool(env, ["MIA_PUBLIC_CHAT_WRITE_ENABLED"], false);
  const ttsEnabled = pickBool(env, ["MIA_TTS_ENABLED"], true);
  const consoleEnabled = pickBool(env, ["MIA_CONSOLE_ENABLED"], true);

  const minActionIntervalMs = pickNumber(env, ["MIA_MIN_ACTION_INTERVAL_MS"], 900);
  const supportMinActionIntervalMs = pickNumber(env, ["MIA_SUPPORT_MIN_ACTION_INTERVAL_MS"], 1200);
  const communityMinActionIntervalMs = pickNumber(env, ["MIA_COMMUNITY_MIN_ACTION_INTERVAL_MS"], 900);

  const kickEnabled = pickBool(env, ["MIA_KICK_ENABLED", "KICK_ENABLED"], true);
  const kickMode = pickString(env, ["MIA_KICK_MODE", "KICK_MODE"], "realtime");
  const kickWebhookPath = pickString(env, ["MIA_KICK_WEBHOOK_PATH", "KICK_WEBHOOK_PATH"], "/kick/webhook");
  const kickIngestUrl = pickString(
    env,
    ["MIA_KICK_INGEST_URL", "KICK_INGEST_URL"],
    `http://127.0.0.1:${port}/ingest`
  );
  const kickChatroomId = pickString(env, ["MIA_KICK_CHATROOM_ID", "KICK_CHATROOM_ID"], "95746130");
  const kickPusherKey = pickString(env, ["MIA_KICK_PUSHER_KEY", "KICK_PUSHER_KEY"], "32cbd69e4b950bf97679");
  const kickCluster = pickString(env, ["MIA_KICK_CLUSTER", "KICK_CLUSTER"], "us2");

  const twitchEnabled = pickBool(env, ["MIA_TWITCH_ENABLED", "TWITCH_ENABLED"], false);
  const twitchMode = pickString(env, ["MIA_TWITCH_MODE", "TWITCH_MODE"], "eventsub_ws");
  const twitchIngestUrl = pickString(
    env,
    ["MIA_TWITCH_INGEST_URL", "TWITCH_INGEST_URL"],
    `http://127.0.0.1:${port}/ingest`
  );
  const twitchChannelLogin = pickString(env, ["TWITCH_CHANNEL_LOGIN", "MIA_TWITCH_CHANNEL_LOGIN"], "");
  const twitchBroadcasterId = pickString(env, ["TWITCH_BROADCASTER_ID"], "");
  const twitchClientId = pickString(env, ["TWITCH_CLIENT_ID"], "");
  const twitchAccessToken = pickString(env, ["TWITCH_ACCESS_TOKEN"], "");
  const twitchWebhookPath = pickString(
    env,
    ["MIA_TWITCH_WEBHOOK_PATH", "TWITCH_WEBHOOK_PATH"],
    "/twitch/webhook"
  );

  const t1Sources = pickStringArray(env, ["OBS_T1_SOURCES", "MIA_OBS_T1_SOURCES"], [
    "T1_VIDEO_01",
    "T1_VIDEO_02",
    "T1_VIDEO_03",
    "T1_VIDEO_04",
    "T1_VIDEO_05",
    "T1_VIDEO_06"
  ]);

  const t2Sources = pickStringArray(env, ["OBS_T2_SOURCES", "MIA_OBS_T2_SOURCES"], [
    "T2_VIDEO_05",
    "T2_VIDEO_06",
    "T2_VIDEO_07",
    "T2_VIDEO_08",
    "T2_VIDEO_09",
    "T2_VIDEO_10"
  ]);

  const t3Sources = pickStringArray(env, ["OBS_T3_SOURCES", "MIA_OBS_T3_SOURCES"], [
    "T3_VIDEO_09",
    "T3_VIDEO_10",
    "T3_VIDEO_11",
    "T3_VIDEO_12",
    "T3_VIDEO_13",
    "T3_VIDEO_14"
  ]);

  const t4Sources = pickStringArray(env, ["OBS_T4_SOURCES", "MIA_OBS_T4_SOURCES"], [
    "T4_VIDEO_13",
    "T4_VIDEO_14",
    "T4_VIDEO_15",
    "T4_VIDEO_16",
    "T4_VIDEO_17",
    "T4_VIDEO_18"
  ]);

  const t5Sources = pickStringArray(env, ["OBS_T5_SOURCES", "MIA_OBS_T5_SOURCES"], [
    "T5_VIDEO_19",
    "T5_VIDEO_20",
    "T5_VIDEO_21"
  ]);

  const profileVideoSources = pickStringArray(
    env,
    ["OBS_PROFILE_VIDEO_SOURCES", "MIA_OBS_PROFILE_VIDEO_SOURCES"],
    ["PROFILE_VIDEO_01", "PROFILE_VIDEO_02", "PROFILE_VIDEO_03", "PROFILE_VIDEO_04"]
  );

  const bowlFullSpecialSources = pickStringArray(
    env,
    ["OBS_BOWL_FULL_SPECIAL_SOURCES", "MIA_OBS_BOWL_FULL_SPECIAL_SOURCES"],
    ["T5_VIDEO_19", "T5_VIDEO_20", "T5_VIDEO_21", "T4_VIDEO_16", "T4_VIDEO_17", "T4_VIDEO_18"]
  );

  const activeRuntime = deriveRuntimeMode(env);
  const miaNextStrictParity = pickBool(env, ["MIA_NEXT_STRICT_PARITY"], false);
  const miaNextLogParity = pickBool(env, ["MIA_NEXT_LOG_PARITY"], false);

  const shadowEnabled = activeRuntime === "SHADOW";
  const nextRuntimeEnabled = activeRuntime === "MIA_NEXT";
  const miaNextEnabled = activeRuntime === "SHADOW" || activeRuntime === "MIA_NEXT";

  const miaNextShareEnabled = pickBool(env, ["MIA_NEXT_SHARE_ENABLED"], false);
  const miaNextShareRuntimeBridgeEnabled = pickBool(
    env,
    ["MIA_NEXT_SHARE_BRIDGE_ENABLED", "MIA_NEXT_SHARE_RUNTIME_BRIDGE_ENABLED"],
    false
  );
  const miaNextShareDebugRouteEnabled = pickBool(
    env,
    ["MIA_NEXT_SHARE_DEBUG_ROUTE_ENABLED"],
    true
  );

  return {
    server: { port },

    obs: {
      url: obsUrl,
      password: obsPassword,
      sceneName: obsSceneName,
      autoSwitchProgramScene: pickBool(
        env,
        ["OBS_AUTO_SWITCH_PROGRAM_SCENE", "MIA_OBS_AUTO_SWITCH_PROGRAM_SCENE"],
        true
      ),
      restoreProgramSceneAfterPlayback: pickBool(
        env,
        ["OBS_RESTORE_PROGRAM_SCENE", "MIA_OBS_RESTORE_PROGRAM_SCENE"],
        true
      ),
      sceneSwitchSettleMs: pickNumber(
        env,
        ["OBS_SCENE_SWITCH_SETTLE_MS", "MIA_OBS_SCENE_SWITCH_SETTLE_MS"],
        280
      ),
      muteGiftVideoDuringMiaVoice: pickBool(
        env,
        ["OBS_MUTE_GIFT_VIDEO_DURING_MIA_VOICE", "MIA_OBS_MUTE_GIFT_VIDEO_DURING_VOICE"],
        false
      ),
      returnSceneName: pickString(
        env,
        ["OBS_RETURN_SCENE_NAME", "MIA_OBS_RETURN_SCENE_NAME"],
        ""
      ),
      tierSources: {
        T1: t1Sources,
        T2: t2Sources,
        T3: t3Sources,
        T4: t4Sources,
        T5: t5Sources,
        PROFILE: profileVideoSources
      },
      tierPlaybackMs: {
        T1: pickNumber(env, ["OBS_T1_PLAYBACK_MS", "MIA_OBS_T1_PLAYBACK_MS"], 5000),
        T2: pickNumber(env, ["OBS_T2_PLAYBACK_MS", "MIA_OBS_T2_PLAYBACK_MS"], 10000),
        T3: pickNumber(env, ["OBS_T3_PLAYBACK_MS", "MIA_OBS_T3_PLAYBACK_MS"], 15000),
        T4: pickNumber(env, ["OBS_T4_PLAYBACK_MS", "MIA_OBS_T4_PLAYBACK_MS"], 20000),
        T5: pickNumber(env, ["OBS_T5_PLAYBACK_MS", "MIA_OBS_T5_PLAYBACK_MS"], 35000),
        PROFILE: pickNumber(env, ["OBS_PROFILE_PLAYBACK_MS", "MIA_OBS_PROFILE_PLAYBACK_MS"], 12000)
      },
      queue: {
        maxPendingJobs: pickNumber(env, ["OBS_MAX_PENDING_GIFT_JOBS", "MIA_OBS_MAX_PENDING_GIFT_JOBS"], 50),
        idlePollMs: pickNumber(env, ["OBS_GIFT_QUEUE_IDLE_POLL_MS", "MIA_OBS_GIFT_QUEUE_IDLE_POLL_MS"], 120),
        mergeEnabled: pickBool(env, ["OBS_GIFT_QUEUE_MERGE_ENABLED", "MIA_OBS_GIFT_QUEUE_MERGE_ENABLED"], true),
        mergeWindowMs: pickNumber(env, ["OBS_GIFT_QUEUE_MERGE_WINDOW_MS", "MIA_OBS_GIFT_QUEUE_MERGE_WINDOW_MS"], 3500),
        interruptPollMs: pickNumber(env, ["OBS_GIFT_QUEUE_INTERRUPT_POLL_MS", "MIA_OBS_GIFT_QUEUE_INTERRUPT_POLL_MS"], 150)
      },
      reconnect: {
        enabled: pickBool(env, ["OBS_RECONNECT_ENABLED", "MIA_OBS_RECONNECT_ENABLED"], true),
        retryMs: pickNumber(env, ["OBS_RECONNECT_RETRY_MS", "MIA_OBS_RECONNECT_RETRY_MS"], 2500),
        maxWaitForReadyMs: pickNumber(env, ["OBS_MAX_WAIT_FOR_READY_MS", "MIA_OBS_MAX_WAIT_FOR_READY_MS"], 15000)
      },
      autoLaunch: {
        enabled: pickBool(env, ["OBS_AUTO_LAUNCH", "MIA_OBS_AUTO_LAUNCH"], true),
        exePath: pickString(env, ["OBS_EXE_PATH", "MIA_OBS_EXE_PATH"], ""),
        cooldownMs: pickNumber(env, ["OBS_AUTO_LAUNCH_COOLDOWN_MS", "MIA_OBS_AUTO_LAUNCH_COOLDOWN_MS"], 60000),
        maxAttempts: pickNumber(env, ["OBS_AUTO_LAUNCH_MAX_ATTEMPTS", "MIA_OBS_AUTO_LAUNCH_MAX_ATTEMPTS"], 5)
      },
      browserRefreshOnOverlay: pickBool(
        env,
        ["OBS_BROWSER_REFRESH_ON_OVERLAY", "MIA_OBS_BROWSER_REFRESH_ON_OVERLAY"],
        false
      ),
      browserRefreshOnConnect: pickBool(
        env,
        ["OBS_BROWSER_REFRESH_ON_CONNECT", "MIA_OBS_BROWSER_REFRESH_ON_CONNECT"],
        false
      ),
      overlayMode: pickString(env, ["OBS_OVERLAY_MODE", "MIA_OBS_OVERLAY_MODE"], "split"),
      layoutLocked: pickBool(env, ["MIA_OBS_LAYOUT_LOCKED", "OBS_LAYOUT_LOCKED"], true),
      voiceMonitor: pickString(
        env,
        ["MIA_OBS_VOICE_MONITOR", "OBS_VOICE_MONITOR"],
        "and_output"
      ),
      mutateVideoLayoutOnPlayback: pickBool(
        env,
        ["MIA_OBS_MUTATE_VIDEO_LAYOUT", "OBS_MUTATE_VIDEO_LAYOUT"],
        false
      ),
      keepPersistentOverlaysAboveVideo: pickBool(
        env,
        [
          "MIA_OBS_KEEP_PERSISTENT_LAYERS_ABOVE_VIDEO",
          "OBS_KEEP_PERSISTENT_LAYERS_ABOVE_VIDEO"
        ],
        true
      ),
      vision: {
        enabled: pickBool(env, ["MIA_OBS_VISION", "OBS_VISION"], true),
        autoLayout: pickBool(env, ["MIA_OBS_AUTO_LAYOUT", "OBS_AUTO_LAYOUT"], true),
        intervalMs: pickNumber(env, ["MIA_OBS_VISION_MS", "OBS_VISION_MS"], 4000),
        screenshotEvery: pickNumber(env, ["MIA_OBS_VISION_SHOT_EVERY", "OBS_VISION_SHOT_EVERY"], 6),
        reapplyMs: pickNumber(env, ["MIA_OBS_VISION_REAPPLY_MS", "OBS_VISION_REAPPLY_MS"], 12000),
        platform: pickString(env, ["MIA_STREAM_PLATFORM", "STREAM_PLATFORM"], "auto"),
        screenshotWidth: pickNumber(env, ["MIA_OBS_VISION_SHOT_W", "OBS_VISION_SHOT_W"], 960),
        screenshotHeight: pickNumber(env, ["MIA_OBS_VISION_SHOT_H", "OBS_VISION_SHOT_H"], 540)
      },
      persistentLayerPatterns: pickString(
        env,
        ["MIA_OBS_PERSISTENT_LAYER_PATTERNS", "OBS_PERSISTENT_LAYER_PATTERNS"],
        ""
      ),
      giftWaitMediaEnd: pickBool(
        env,
        ["MIA_GIFT_WAIT_MEDIA_END", "OBS_GIFT_WAIT_MEDIA_END"],
        true
      ),
      giftPlaybackBufferMs: pickNumber(
        env,
        ["MIA_GIFT_PLAYBACK_BUFFER_MS", "OBS_GIFT_PLAYBACK_BUFFER_MS"],
        1500
      ),
      giftLongAudioMinMs: pickNumber(
        env,
        ["MIA_GIFT_LONG_AUDIO_MIN_MS", "OBS_GIFT_LONG_AUDIO_MIN_MS"],
        60000
      ),
      giftPlaybackMaxSleepMs: pickNumber(
        env,
        ["MIA_GIFT_PLAYBACK_MAX_SLEEP_MS", "OBS_GIFT_PLAYBACK_MAX_SLEEP_MS"],
        120000
      ),
      giftPlaybackMaxWaitMs: pickNumber(
        env,
        ["MIA_GIFT_PLAYBACK_MAX_WAIT_MS", "OBS_GIFT_PLAYBACK_MAX_WAIT_MS"],
        600000
      ),
      stopPreviousOnly: pickBool(
        env,
        ["MIA_OBS_STOP_PREVIOUS_ONLY", "OBS_STOP_PREVIOUS_ONLY"],
        true
      )
    },

    eyes: {
      scanCacheMs: pickNumber(env, ["MIA_EYES_SCAN_CACHE_MS"], 4000),
      screenshotWidth: pickNumber(env, ["MIA_EYES_SCREENSHOT_WIDTH"], 640),
      screenshotHeight: pickNumber(env, ["MIA_EYES_SCREENSHOT_HEIGHT"], 360),
      webcamAutoHide: pickBool(env, ["MIA_WEBCAM_AUTO_HIDE"], true),
      webcamSourceName: pickString(env, ["MIA_WEBCAM_SOURCE_NAME"], "Video Capture Device"),
      webcamDarkLum: pickNumber(env, ["MIA_WEBCAM_DARK_LUM"], 18),
      webcamBrightLum: pickNumber(env, ["MIA_WEBCAM_BRIGHT_LUM"], 28),
      webcamPollMs: pickNumber(env, ["MIA_WEBCAM_POLL_MS"], 8000)
    },

    mattingIngest: {
      enabled: pickBool(env, ["MIA_MATTING_INGEST_ENABLED"], true),
      pollMs: pickNumber(env, ["MIA_MATTING_INGEST_POLL_MS"], 1200),
      onlyWhenImmersive: pickBool(env, ["MIA_MATTING_ONLY_IMMERSIVE"], true),
      screenshotWidth: pickNumber(env, ["MIA_MATTING_SCREENSHOT_WIDTH"], 480),
      screenshotHeight: pickNumber(env, ["MIA_MATTING_SCREENSHOT_HEIGHT"], 640),
      minLuminance: pickNumber(env, ["MIA_MATTING_MIN_LUM"], 12),
      maxCamerasPerTick: pickNumber(env, ["MIA_MATTING_MAX_CAMS_PER_TICK"], 2),
      legacyPrimarySource: pickString(env, ["MIA_OBS_CAMERA_NAME"], "NOTEBOOK_CAMERA")
    },

    immersiveScene: {
      chatAutoApply: pickBool(env, ["MIA_IMMERSIVE_CHAT_AUTO"], false),
      chatCooldownMs: pickNumber(env, ["MIA_IMMERSIVE_CHAT_COOLDOWN_MS"], 45000)
    },

    bossMission: {
      giftAutoApply: pickBool(env, ["MIA_BOSS_MISSION_GIFT_AUTO"], false),
      chatAutoApply: pickBool(env, ["MIA_BOSS_MISSION_CHAT_AUTO"], false),
      chatCooldownMs: pickNumber(env, ["MIA_BOSS_MISSION_CHAT_COOLDOWN_MS"], 120000)
    },

    kick: {
      enabled: kickEnabled,
      mode: kickMode,
      webhookPath: kickWebhookPath,
      ingestUrl: kickIngestUrl,
      chatroomId: kickChatroomId,
      pusherKey: kickPusherKey,
      cluster: kickCluster
    },

    twitch: {
      enabled: twitchEnabled,
      mode: twitchMode,
      webhookPath: twitchWebhookPath,
      ingestUrl: twitchIngestUrl,
      channelLogin: twitchChannelLogin,
      broadcasterId: twitchBroadcasterId,
      clientId: twitchClientId,
      accessToken: twitchAccessToken,
      ingestSecret: pickString(env, ["MIA_INGEST_SECRET"], "")
    },

    telegram: {
      enabled: pickBool(env, ["MIA_TELEGRAM_ENABLED"], false),
      botToken: pickString(env, ["MIA_TELEGRAM_BOT_TOKEN"], ""),
      pollMs: pickNumber(env, ["MIA_TELEGRAM_POLL_MS"], 1500),
      allowedUserIds: pickString(env, ["MIA_TELEGRAM_ALLOWED_USER_IDS"], ""),
      streamerOnly: pickBool(env, ["MIA_TELEGRAM_STREAMER_ONLY"], true)
    },

    overlay: {
      enabled: overlayEnabled,
      obsControlEnabled: overlayObsControlEnabled,
      maxChatFeedItems: overlayMaxChatFeedItems,
      chatFeedMaxAgeMs: overlayChatFeedMaxAgeMs,
      sceneMap: buildOverlaySceneMap({}, env),
      deferredCommunityMaxItems,
      deferredCommunityMaxAgeMs,
      deferredReplayPollMs
    },

    outputPolicy: {
      overlayEnabled,
      consoleEnabled,
      publicChatWriteEnabled,
      ttsEnabled,
      minActionIntervalMs,
      supportMinActionIntervalMs,
      communityMinActionIntervalMs
    },

    ingest: {
      fastAck: pickBool(env, ["MIA_INGEST_FAST_ACK", "INGEST_FAST_ACK"], true)
    },

    gameplay: {
      kojTestMode: pickBool(env, ["MIA_KOJ_TEST_MODE"], false),
      bowlFull: {
        preferredTier: pickString(env, ["OBS_BOWL_FULL_TIER", "MIA_OBS_BOWL_FULL_TIER"], "T4").toUpperCase(),
        fallbackTier: pickString(env, ["OBS_BOWL_FULL_FALLBACK_TIER", "MIA_OBS_BOWL_FULL_FALLBACK_TIER"], "T1").toUpperCase(),
        specialSources: bowlFullSpecialSources,
        cooldownMs: pickNumber(
          env,
          ["OBS_BOWL_FULL_COOLDOWN_MS", "MIA_OBS_BOWL_FULL_COOLDOWN_MS"],
          90000
        )
      }
    },

    miaNext: {
      enabled: miaNextEnabled,
      activeRuntime,
      strictParity: miaNextStrictParity,
      logParity: miaNextLogParity,
      spam: {
        windowMs: pickNumber(env, ["MIA_SPAM_WINDOW_MS", "SPAM_WINDOW_MS"], 15000),
        minSequenceCount: pickNumber(
          env,
          ["MIA_SPAM_MIN_SEQUENCE_COUNT", "SPAM_MIN_SEQUENCE_COUNT"],
          3
        ),
        rewardThresholds: {
          T2: pickNumber(env, ["MIA_SPAM_REWARD_T2", "SPAM_REWARD_T2"], 45),
          T3: pickNumber(env, ["MIA_SPAM_REWARD_T3", "SPAM_REWARD_T3"], 500),
          T4: pickNumber(env, ["MIA_SPAM_REWARD_T4", "SPAM_REWARD_T4"], 1500)
        }
      },
      runtimeSwitch: {
        activeRuntime,
        enableNextRuntime: nextRuntimeEnabled,
        strictParity: miaNextStrictParity,
        logParity: miaNextLogParity
      },
      shadow: {
        enabled: shadowEnabled
      },
      share: {
        enabled: miaNextShareEnabled,
        runtimeBridgeEnabled: miaNextShareRuntimeBridgeEnabled,
        debugRouteEnabled: miaNextShareDebugRouteEnabled
      }
    },

    duel: {
      enabled: pickBool(env, ["MIA_DUEL_SYNC_ENABLED"], false),
      peerUrl: pickString(env, ["MIA_DUEL_PEER_URL"], ""),
      localStreamId: pickString(env, ["MIA_DUEL_LOCAL_STREAM_ID"], "local"),
      localLabel: pickString(env, ["MIA_DUEL_LOCAL_LABEL"], "Náš Kojnožrout"),
      syncIntervalMs: pickNumber(env, ["MIA_DUEL_SYNC_INTERVAL_MS"], 3000),
      defaultDurationSec: pickNumber(env, ["MIA_DUEL_DEFAULT_DURATION_SEC"], 300)
    },

    ecosystem: {
      enabled: pickBool(env, ["MIA_ECOSYSTEM_ENABLED"], true),
      orchestratorId: pickString(env, ["MIA_ECOSYSTEM_ORCHESTRATOR_ID"], "core"),
      orchestratorLabel: pickString(env, ["MIA_ECOSYSTEM_ORCHESTRATOR_LABEL"], "CORE"),
      assistantLabel: pickString(env, ["MIA_ECOSYSTEM_ASSISTANT_LABEL"], "Asistent"),
      worldMode: pickString(env, ["MIA_WORLD_MODE"], "default")
    },

    llm: {
      provider: pickString(env, ["MIA_LLM_PROVIDER"], "openai"),
      mode: pickString(env, ["MIA_LLM_MODE"], ""),
      fallback: pickString(env, ["MIA_LLM_FALLBACK"], ""),
      // apiKey/baseUrl/model jsou prázdné schválně — per-provider je řeší MIA_LLM_ADAPTER
      // z env (GROQ_API_KEY, OPENAI_API_KEY, presety), aby se providery nemíchaly.
      apiKey: pickString(env, ["MIA_LLM_API_KEY"], ""),
      baseUrl: pickString(env, ["MIA_LLM_BASE_URL"], ""),
      model: pickString(env, ["MIA_LLM_MODEL"], ""),
      timeoutMs: pickNumber(env, ["MIA_LLM_TIMEOUT_MS"], 8000),
      maxTokens: pickNumber(env, ["MIA_LLM_MAX_TOKENS"], 120),
      maxTokensKnowledge: pickNumber(env, ["MIA_LLM_MAX_TOKENS_KNOWLEDGE"], 280),
      maxTokensStory: pickNumber(env, ["MIA_LLM_MAX_TOKENS_STORY"], 480),
      minUserIntervalMs: pickNumber(env, ["MIA_LLM_MIN_USER_INTERVAL_MS"], 4000),
      streamerName: pickString(env, ["MIA_STREAMER_NAME", "MIA_STREAMER_ALIAS"], "Spinák")
    },

    stream: {
      streamerUserLabels: pickString(
        env,
        ["MIA_STREAMER_USER_LABELS"],
        "VasaSpinak,Spinak,Spinyak,Spinaku"
      ),
      streamerName: pickString(env, ["MIA_STREAMER_NAME", "MIA_STREAMER_ALIAS"], "Spinák"),
      streamerBypassEvents: pickBool(env, ["MIA_STREAMER_BYPASS_EVENTS"], true)
    },

    tts: {
      enabled: ttsEnabled,
      provider: pickString(env, ["MIA_TTS_PROVIDER"], "edge"),
      apiKey: pickString(env, ["MIA_TTS_API_KEY", "MIA_LLM_API_KEY", "OPENAI_API_KEY"], ""),
      baseUrl: pickString(env, ["MIA_TTS_BASE_URL", "MIA_LLM_BASE_URL"], "https://api.openai.com/v1"),
      model: pickString(env, ["MIA_TTS_MODEL"], "tts-1"),
      voice: pickString(env, ["MIA_TTS_VOICE"], "nova"),
      edgeVoice: pickString(env, ["MIA_TTS_EDGE_VOICE"], "cs-CZ-VlastaNeural"),
      edgeVoiceKoj: pickString(env, ["MIA_TTS_EDGE_VOICE_KOJ"], "cs-CZ-AntoninNeural"),
      edgeRateMia: pickString(env, ["MIA_TTS_EDGE_RATE_MIA"], "-28%"),
      edgePitchMia: pickString(env, ["MIA_TTS_EDGE_PITCH_MIA"], "+16Hz"),
      edgeVolumeMia: pickString(env, ["MIA_TTS_EDGE_VOLUME_MIA"], "+0%"),
      edgeRateKoj: pickString(env, ["MIA_TTS_EDGE_RATE_KOJ"], "+32%"),
      edgePitchKoj: pickString(env, ["MIA_TTS_EDGE_PITCH_KOJ"], "-32Hz"),
      edgeVolumeKoj: pickString(env, ["MIA_TTS_EDGE_VOLUME_KOJ"], "+4%"),
      maxChars: pickNumber(env, ["MIA_TTS_MAX_CHARS"], 900)
    },

    soloStream: require("./MIA_SOLO_STREAM_CONFIG").buildSoloStreamConfigFromEnv(env)
  };
}

const runtimeConfig = buildRuntimeConfig();

module.exports = {
  buildRuntimeConfig,
  buildOverlaySceneMap,
  runtimeConfig
};