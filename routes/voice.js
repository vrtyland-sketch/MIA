"use strict";

const { validateApp, safeString } = require("./_helpers");

function registerVoiceRoutes(app, ctx = {}) {
  const check = validateApp(app);
  if (!check.ok) return check;

  const {
    voiceLayer,
    streamState,
    getStreamState,
    getKojnozoutState,
    runtimeConfig,
    getOutputState,
    applyWorldModeChange,
    maybeDeliverMiaVoice,
    executeOverlay
  } = ctx;

  app.post("/voice/command", async (req, res) => {
    try {
      const input = req.body || {};
      const outputState = typeof getOutputState === "function" ? getOutputState() : {};

      if (input.trusted === false) {
        return res.status(403).json({
          ok: false,
          accepted: false,
          error: "VOICE_COMMAND_UNTRUSTED_SOURCE"
        });
      }

      const kojnozoutState = typeof getKojnozoutState === "function" ? getKojnozoutState() : {};
      const liveStreamState =
        typeof getStreamState === "function" ? getStreamState() : streamState;

      const decision =
        voiceLayer && typeof voiceLayer.resolveVoiceCommand === "function"
          ? voiceLayer.resolveVoiceCommand({
              ...input,
              streamState: liveStreamState,
              kojnozoutState,
              runtimeState: {
                worldMode: runtimeConfig?.worldMode || "default"
              }
            })
          : {
              ok: true,
              accepted: true,
              target: "mia",
              response: {
                speaker: "mia",
                text: safeString(input.text, "hlasový příkaz přijat")
              },
              execution: {
                obsSceneSwitchAllowed: false
              }
            };

      const worldMode =
        decision?.worldMode ||
        decision?.runtimeState?.worldMode ||
        decision?.statePatch?.worldMode ||
        (safeString(input.text).toLowerCase().includes("nejsem") ? "nejsem_tu" : undefined);

      if (worldMode && typeof applyWorldModeChange === "function") {
        await applyWorldModeChange(worldMode, "voice_command");
      }

      const responsePayload = {
        ok: decision?.ok !== false,
        accepted: decision?.accepted !== false,
        voice: {
          worldMode: outputState.worldMode || worldMode || "default"
        },
        decision: {
          ...decision,
          execution: {
            ...(decision?.execution || {}),
            obsSceneSwitchAllowed: false
          }
        },
        obs: {
          autoSceneSwitch: false
        }
      };

      if (decision?.response?.text) {
        const speaker = safeString(
          decision.response.speaker || decision.target,
          "mia"
        ).toLowerCase();

        const voiceAction = await maybeDeliverMiaVoice({
          overlayPayload: {
            owner: speaker,
            route: "voice",
            stage: "voice",
            text: decision.response.text,
            meta: { source: "voice_command" }
          },
          response: decision.response
        });

        const overlayPayload = voiceAction.overlayPayload;
        if (overlayPayload?.text) {
          await executeOverlay(overlayPayload, {
            source: "voice_command",
            decision
          });
        }
      }

      res.status(200).json(responsePayload);
    } catch (err) {
      res.status(500).json({
        ok: false,
        error: err.message
      });
    }
  });

  return {
    ok: true,
    routes: ["POST /voice/command"]
  };
}

module.exports = { registerVoiceRoutes };
