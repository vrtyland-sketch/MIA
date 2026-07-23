"use strict";

const assert = require("assert/strict");

const normalizer = require("../shared/platform_normalizers/normalize_event");
const { runRuntimeExecutionBridge } = require("../shared/runtime_execution");
const {
  tryBuildShareBridgeResult,
  resolveBridgeEnabled,
  isShareEvent
} = require("../shared/next/share_runtime_bridge");
const {
  buildSharePreview
} = require("../shared/next/share_runtime_share_preview");

const results = {
  passed: 0,
  failed: 0
};

async function test(name, fn) {
  try {
    await fn();
    results.passed += 1;
    console.log(`✅ ${name}`);
  } catch (err) {
    results.failed += 1;
    console.error(`❌ ${name}`);
    console.error(err && err.stack ? err.stack : err);
  }
}

function makeOverlayCallback() {
  return function executeOverlay(payload, _context) {
    const overlay =
      payload?.overlayPayload ||
      payload?.overlay ||
      payload?.companionOverlay ||
      (payload?.owner || payload?.text || payload?.overlay_text || payload?.speech_text
        ? payload
        : null) ||
      null;

    return {
      emitted: Boolean(overlay),
      reason: "ok",
      acceptedOverlay: {
        owner: overlay?.owner || "mia"
      }
    };
  };
}

function makeVideoCallback() {
  return async function executeVideo(actionResult, normalizedEvent, eventId) {
    return {
      ok: true,
      skipped: false,
      reason: "ok",
      eventId,
      tier: actionResult?.tier || normalizedEvent?.support?.tier || "T1",
      snapshot: {
        queueLength: 1
      }
    };
  };
}

function makeShareRawEvent(overrides = {}) {
  return {
    eventType: "share",
    type: "share",
    platform: "tiktok",
    userId: "share_u1",
    username: "share_user",
    nickname: "Share User",
    ...overrides
  };
}

function makeShareContext(overrides = {}) {
  return {
    rawEvent: makeShareRawEvent(),
    streamState: {
      userActivity: {
        share_u1: {
          shareCount: 1
        },
        other_user_1: {
          shareCount: 2
        },
        other_user_2: {
          shareCount: 2
        }
      }
    },
    kojnozoutState: {
      bowlPercent: 30,
      mood: "neutral"
    },
    nextShareBridgeEnabled: true,
    ...overrides
  };
}

(async () => {
  await test("shared runtime execution module loads", async () => {
    assert.equal(typeof runRuntimeExecutionBridge, "function");
  });

  await test("normalizer converts comment payload into COMMENT event", async () => {
    const input = {
      source: "debug",
      platform: "tiktok",
      type: "comment",
      eventType: "comment",
      content: "Ahoj MIA",
      message: "Ahoj MIA",
      username: "tester",
      nickname: "Tester",
      userId: "u1"
    };

    const normalized = normalizer.normalizeEvent(input);

    assert.ok(normalized);
    assert.equal(normalized.eventType, "COMMENT");
    assert.ok(normalized.user);
    assert.equal(normalized.user.username, "tester");
  });

  await test("normalizer converts gift payload into GIFT event", async () => {
    const input = {
      source: "debug",
      platform: "tiktok",
      type: "gift",
      eventType: "gift",
      giftName: "Rose",
      coins: 5,
      count: 1,
      username: "gifter",
      nickname: "Gifter",
      userId: "u2"
    };

    const normalized = normalizer.normalizeEvent(input);

    assert.ok(normalized);
    assert.equal(normalized.eventType, "GIFT");
    assert.ok(normalized.support || normalized.payload || normalized.meta);
  });

  await test("normalizer converts tikfinity gift test payload into GIFT event", async () => {
    const normalized = normalizer.normalizeEvent({
      value1: "Testuser123",
      value2: "This is a Test",
      value3: "10",
      content: "It works! This is a test.",
      userId: "0",
      username: "Testuser123",
      nickname: "Test User 123",
      commandParams: "This is a Test",
      giftId: "10",
      giftName: "Rose",
      coins: "1",
      repeatCount: "1",
      tikfinityUserId: "2743946",
      tikfinityUsername: "vaclavvrtyland"
    });

    assert.equal(normalized.eventType, "GIFT");
    assert.equal(normalized.route, "support");
  });

  await test("normalizer converts share payload into SHARE event", async () => {
    const normalized = normalizer.normalizeEvent(makeShareRawEvent());

    assert.ok(normalized);
    assert.equal(normalized.eventType, "SHARE");
    assert.ok(normalized.user);
    assert.equal(normalized.user.userId, "share_u1");
  });

  await test("share bridge recognizes share events and enable flags", async () => {
    assert.equal(isShareEvent(makeShareRawEvent()), true);
    assert.equal(isShareEvent({ eventType: "comment" }), false);
    assert.equal(resolveBridgeEnabled({ nextShareBridgeEnabled: true }), true);
    assert.equal(resolveBridgeEnabled({ nextShareBridgeEnabled: false }), false);
    assert.equal(
      resolveBridgeEnabled({
        runtimeConfig: {
          miaNext: {
            share: {
              enabled: true
            }
          }
        }
      }),
      true
    );
  });

  await test("share bridge skips when disabled", async () => {
    const result = tryBuildShareBridgeResult(
      makeShareContext({ nextShareBridgeEnabled: false })
    );

    assert.deepEqual(result, {
      ok: false,
      skipped: true,
      reason: "share_bridge_disabled"
    });
  });

  await test("share bridge builds valid share action result", async () => {
    const result = tryBuildShareBridgeResult(makeShareContext());

    assert.equal(result.ok, true);
    assert.equal(result.source, "shared/next/share_runtime_bridge");
    assert.equal(result.debug.bridge, "share");
    assert.equal(result.debug.eventType, "SHARE");
    assert.equal(result.decisionResult.domain, "share");
    assert.equal(result.actionResult.meta.domain, "share");
    assert.equal(result.actionResult.shouldPlayVideo, false);
    assert.ok(result.actionResult.overlayPayload);
    assert.equal(result.actionResult.overlayPayload.stage, "share");
    assert.equal(
      result.actionResult.overlayPayload.meta.shareMode,
      "share_milestone"
    );
  });

  await test("share preview promotes kojnozout on high bowl wave", async () => {
    const preview = buildSharePreview({
      event: makeShareRawEvent(),
      streamState: {
        userActivity: {
          share_u1: { shareCount: 1 },
          a: { shareCount: 3 },
          b: { shareCount: 3 },
          c: { shareCount: 3 }
        }
      },
      kojnozoutState: {
        bowlPercent: 95,
        mood: "excited"
      }
    });

    assert.equal(preview.ok, true);
    assert.equal(preview.decision.shareMode, "share_wave");
    assert.equal(preview.decision.speaker, "kojnozout");
    assert.equal(preview.decision.actorRoles.allowCompanion, false);
    assert.equal(preview.action.meta.domain, "share");
    assert.equal(preview.action.overlayPayload.owner, "kojnozout");
    assert.equal(preview.validation.overlayPayload.ok, true);
    assert.equal(preview.validation.actionResult.ok, true);
  });

  await test("execution bridge rejects invalid actionResult shape", async () => {
    const result = await runRuntimeExecutionBridge({
      actionResult: null,
      eventId: "evt_invalid"
    });

    assert.equal(result.accepted, false);
    assert.equal(result.ok, false);
    assert.equal(result.status, "failed");
    assert.ok(Array.isArray(result.debug.reasonCodes));
    assert.ok(
      result.debug.reasonCodes.includes("EXECUTION_BRIDGE_INVALID_ACTION_RESULT")
    );
  });

  await test("execution bridge completes overlay-only action", async () => {
    const result = await runRuntimeExecutionBridge({
      eventId: "evt_overlay_only",
      actionResult: {
        route: "community",
        overlay: {
          owner: "mia",
          text: "Test overlay"
        },
        shouldPlayVideo: false
      },
      animationTrace: {
        ok: true,
        effective: {
          owner: "mia"
        }
      },
      executeOverlay: makeOverlayCallback()
    });

    assert.equal(result.accepted, true);
    assert.equal(result.ok, true);
    assert.equal(result.status, "completed");
    assert.equal(result.metrics.overlayAttempted, true);
    assert.equal(result.metrics.overlayEmitted, true);
    assert.equal(result.metrics.videoAttempted, false);
    assert.ok(result.overlay);
    assert.equal(result.overlay.emitted, true);
    assert.equal(result.overlay.reason, "ok");
    assert.equal(result.overlay.meta.acceptedOverlay.owner, "mia");
  });

  await test("execution bridge completes overlay + video action", async () => {
    const normalizedEvent = {
      eventType: "GIFT",
      platform: "tiktok",
      support: {
        tier: "T2"
      }
    };

    const result = await runRuntimeExecutionBridge({
      eventId: "evt_overlay_video",
      normalizedEvent,
      actionResult: {
        route: "support",
        tier: "T2",
        overlay: {
          owner: "mia",
          text: "Support overlay"
        },
        shouldPlayVideo: true
      },
      animationTrace: {
        ok: true,
        effective: {
          owner: "mia",
          effectProgram: "generic_support"
        }
      },
      executeOverlay: makeOverlayCallback(),
      executeVideo: makeVideoCallback()
    });

    assert.equal(result.accepted, true);
    assert.equal(result.ok, true);
    assert.equal(result.status, "completed");
    assert.equal(result.metrics.overlayAttempted, true);
    assert.equal(result.metrics.overlayEmitted, true);
    assert.equal(result.metrics.videoAttempted, true);
    assert.equal(result.metrics.videoEnqueued, true);
    assert.ok(result.overlay);
    assert.equal(result.overlay.emitted, true);
    assert.equal(result.overlay.meta.acceptedOverlay.owner, "mia");
    assert.ok(result.video);
    assert.equal(result.video.ok, true);
    assert.equal(result.video.skipped, false);
  });

  await test("execution bridge returns partial when video callback is missing", async () => {
    const result = await runRuntimeExecutionBridge({
      eventId: "evt_missing_video_callback",
      normalizedEvent: {
        eventType: "GIFT",
        support: {
          tier: "T1"
        }
      },
      actionResult: {
        route: "support",
        shouldPlayVideo: true
      }
    });

    assert.equal(result.accepted, true);
    assert.equal(result.ok, true);
    assert.equal(result.status, "partial");
    assert.ok(result.video);
    assert.equal(result.video.ok, false);
    assert.equal(result.video.skipped, true);
    assert.equal(result.video.reason, "video_executor_missing_callback");
  });

  await test("execution bridge preserves animationTrace snapshot", async () => {
    const animationTrace = {
      ok: true,
      effective: {
        owner: "mia",
        effectProgram: "generic_support"
      }
    };

    const result = await runRuntimeExecutionBridge({
      eventId: "evt_trace_preserved",
      actionResult: {
        route: "community",
        overlay: {
          owner: "mia",
          text: "Trace test"
        }
      },
      animationTrace,
      executeOverlay: makeOverlayCallback()
    });

    assert.deepEqual(result.animationTrace, animationTrace);
  });

  await test("execution bridge completes next share action_result through overlayPayload", async () => {
    const shareBridgeResult = tryBuildShareBridgeResult(makeShareContext());

    const result = await runRuntimeExecutionBridge({
      eventId: "evt_share_contract",
      normalizedEvent: normalizer.normalizeEvent(makeShareRawEvent()),
      actionResult: shareBridgeResult.actionResult,
      animationTrace: {
        ok: true,
        effective: {
          owner: shareBridgeResult.actionResult.overlayPayload.owner,
          effectProgram: "share_overlay_only"
        }
      },
      executeOverlay: makeOverlayCallback()
    });

    assert.equal(result.accepted, true);
    assert.equal(result.ok, true);
    assert.equal(result.status, "completed");
    assert.equal(result.metrics.overlayAttempted, true);
    assert.equal(result.metrics.overlayEmitted, true);
    assert.equal(result.metrics.videoAttempted, false);
    assert.equal(result.metrics.videoEnqueued, false);
    assert.ok(result.overlay);
    assert.equal(result.overlay.emitted, true);
    assert.equal(result.overlay.reason, "ok");
    assert.ok(result.overlay.meta);
    assert.ok(result.overlay.meta.acceptedOverlay);
    assert.equal(result.overlay.meta.acceptedOverlay.owner, "mia");
    assert.equal(result.debug.reasonCodes.length, 0);
  });

  await test("execution bridge emits primary and companion overlays", async () => {
    const overlays = [];

    const result = await runRuntimeExecutionBridge({
      eventId: "evt_dual_overlay",
      actionResult: {
        route: "support",
        overlayPayload: {
          owner: "kojnozout",
          text: "Koj primary line"
        },
        companionOverlayPayload: {
          owner: "mia",
          text: "MIA companion line"
        },
        shouldPlayVideo: false
      },
      executeOverlay: async (payload) => {
        overlays.push(payload);
        return {
          ok: true,
          emitted: true,
          reason: "ok",
          meta: { acceptedOverlay: payload }
        };
      }
    });

    assert.equal(result.accepted, true);
    assert.equal(result.metrics.primaryOverlayEmitted, true);
    assert.equal(result.metrics.companionOverlayEmitted, true);
    assert.equal(overlays.length, 2);
    assert.equal(overlays[0].owner, "kojnozout");
    assert.equal(overlays[1].owner, "mia");
    assert.equal(result.companionOverlay.emitted, true);
  });

  await test("execution bridge schedules deferred koj overlay without dual-voice", async () => {
    const prev = process.env.MIA_DUAL_VOICE;
    delete process.env.MIA_DUAL_VOICE;
    const overlays = [];
    try {
      const result = await runRuntimeExecutionBridge({
        eventId: "evt_deferred_koj_overlay",
        actionResult: {
          route: "community",
          overlayPayload: {
            owner: "mia",
            text: "Drž se, kamaráde."
          },
          deferredKojCompanion: {
            delayMs: 500,
            overlayPayload: {
              owner: "kojnozout",
              text: "Přitulím se.",
              meta: { overlayOnly: true, voiceSuppressed: true }
            }
          },
          shouldPlayVideo: false
        },
        executeOverlay: async (payload) => {
          overlays.push(payload);
          return {
            ok: true,
            emitted: true,
            reason: "ok",
            meta: { acceptedOverlay: payload }
          };
        }
      });

      assert.equal(result.accepted, true);
      assert.ok(
        result.debug.reasonCodes.includes("EXECUTION_BRIDGE_DEFERRED_KOJ_OVERLAY_ONLY")
      );
      await new Promise((resolve) => setTimeout(resolve, 650));
      assert.ok(overlays.some((p) => p.owner === "kojnozout" && /Přitulím/.test(p.text)));
    } finally {
      if (prev === undefined) delete process.env.MIA_DUAL_VOICE;
      else process.env.MIA_DUAL_VOICE = prev;
    }
  });

  console.log("");
  console.log("---- RUNTIME SMOKE SUMMARY ----");
  console.log(`passed: ${results.passed}`);
  console.log(`failed: ${results.failed}`);

  if (results.failed > 0) {
    process.exit(1);
  }

  process.exit(0);
})().catch((err) => {
  console.error("❌ runtime smoke runner crashed");
  console.error(err && err.stack ? err.stack : err);
  process.exit(1);
});