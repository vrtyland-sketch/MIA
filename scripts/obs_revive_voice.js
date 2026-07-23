"use strict";

/**
 * Phase 13f/13g — oživení MIA_VOICE + anti-echo (Desktop Audio).
 * Usage: npm run obs:revive-voice
 *        npm run obs:revive-voice -- --tts=mia
 *        npm run obs:revive-voice -- --tts=koj
 *        npm run obs:revive-voice -- --tts=koj --keep-desktop
 */

const http = require("http");
const OBSWebSocket = require("obs-websocket-js").default;

function getJson(url) {
  return new Promise((resolve, reject) => {
    http
      .get(url, (res) => {
        let body = "";
        res.on("data", (c) => (body += c));
        res.on("end", () => {
          try {
            resolve(JSON.parse(body));
          } catch (err) {
            reject(err);
          }
        });
      })
      .on("error", reject);
  });
}

function argValue(name, fallback = "") {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  if (!hit) return fallback;
  return hit.slice(name.length + 3);
}

function antiEchoEnabled(options = {}) {
  if (options.keepDesktop === true) return false;
  if (process.argv.includes("--keep-desktop")) return false;
  const raw = String(process.env.MIA_OBS_VOICE_ANTI_ECHO ?? "1").trim().toLowerCase();
  return raw !== "0" && raw !== "false" && raw !== "off";
}

async function applyAntiEchoDesktopMute(obsCall) {
  const desktopNames = ["Desktop Audio", "Desktop Audio 2", "Skrivbordsljud", "Audio del escritorio"];
  const muted = [];
  const skipped = [];

  let special = {};
  try {
    special = await obsCall("GetSpecialInputs");
  } catch (_err) {
    special = {};
  }

  const candidates = new Set(
    [special.desktop1, special.desktop2, ...desktopNames].filter(Boolean)
  );

  for (const inputName of candidates) {
    try {
      const before = await obsCall("GetInputMute", { inputName });
      if (before.inputMuted === true) {
        skipped.push({ inputName, reason: "already_muted" });
        continue;
      }
      await obsCall("SetInputMute", { inputName, inputMuted: true });
      muted.push(inputName);
    } catch (_err) {
      skipped.push({ inputName, reason: "missing" });
    }
  }

  return { ok: true, muted, skipped };
}

async function reviveObsVoice(options = {}) {
  const port = Number(options.port || process.env.PORT || 3000);
  const rawSpeaker = String(options.tts || "mia").toLowerCase();
  const speaker =
    rawSpeaker === "koj" || rawSpeaker === "kojnozout" || rawSpeaker === "kojnozrout"
      ? "koj"
      : "mia";
  const skipTts = options.skipTts === true;
  const doAntiEcho = antiEchoEnabled(options);

  const ensure = await getJson(`http://127.0.0.1:${port}/obs/ensure-voice?force=1`);

  const obs = new OBSWebSocket();
  const password = process.env.OBS_WS_PASSWORD || "";
  const wsUrl = process.env.OBS_WS_URL || "ws://127.0.0.1:4455";
  let voice = { ok: false };
  let antiEcho = { ok: false, skipped: true, reason: "disabled" };

  try {
    await obs.connect(wsUrl, password ? { password } : undefined);
    const inputName = "MIA_VOICE";
    const obsCall = obs.call.bind(obs);

    if (doAntiEcho) {
      antiEcho = await applyAntiEchoDesktopMute(obsCall);
    }

    try {
      await obsCall("SetInputMute", { inputName, inputMuted: false });
    } catch (_err) {
      // ignore
    }
    try {
      await obsCall("SetInputVolume", { inputName, inputVolumeMul: 1 });
    } catch (_err) {
      // ignore
    }
    try {
      await obsCall("SetInputAudioMonitorType", {
        inputName,
        monitorType: "OBS_MONITORING_TYPE_MONITOR_AND_OUTPUT"
      });
    } catch (_err) {
      // ignore
    }
    try {
      await obsCall("PressInputPropertiesButton", {
        inputName,
        propertyName: "refreshnocache"
      });
    } catch (_err) {
      // ignore
    }

    try {
      const sceneName =
        process.env.MIA_OBS_CAMERA_SCENE ||
        process.env.MIA_SOLO_STREAM_MAIN_SCENE ||
        "SPINAK_ENGINE_GIFTS";
      const idResp = await obsCall("GetSceneItemId", { sceneName, sourceName: inputName });
      await obsCall("SetSceneItemEnabled", {
        sceneName,
        sceneItemId: idResp.sceneItemId,
        sceneItemEnabled: true
      });
    } catch (_err) {
      // ignore
    }

    const mute = await obsCall("GetInputMute", { inputName });
    const mon = await obsCall("GetInputAudioMonitorType", { inputName });
    voice = {
      ok: true,
      inputName,
      muted: mute.inputMuted === true,
      monitorType: mon.monitorType
    };
  } catch (err) {
    voice = { ok: false, error: String(err?.message || err) };
  } finally {
    try {
      await obs.disconnect();
    } catch (_err) {
      // ignore
    }
  }

  await new Promise((r) => setTimeout(r, 1000));

  let tts = { ok: true, skipped: true };
  if (!skipTts) {
    tts = await getJson(
      `http://127.0.0.1:${port}/tts/test?speaker=${speaker}&fresh=1`
    );
  }

  return {
    ok: ensure.ok === true && voice.ok === true && tts.ok !== false,
    phase: "13g",
    ensure,
    voice,
    antiEcho,
    tts,
    hint:
      "Anti-echo: Desktop Audio ztlumený (Monitor+Output jinak snímá sebe). " +
      "Koj i MIA hrají přes MIA_VOICE. Pokud ozvěna zůstane: sluchátka / ztlum Mic/Aux. " +
      "TikTok: Monitoring Device = VB-Cable → mikrofon ve Studiu."
  };
}

async function main() {
  const tts = argValue("tts", "mia");
  const skipTts = process.argv.includes("--skip-tts");
  const keepDesktop = process.argv.includes("--keep-desktop");
  const report = await reviveObsVoice({ tts, skipTts, keepDesktop });
  console.log(JSON.stringify(report, null, 2));
  process.exitCode = report.ok ? 0 : 1;
}

if (require.main === module) {
  main().catch((err) => {
    console.error(JSON.stringify({ ok: false, error: err.message }));
    process.exitCode = 1;
  });
}

module.exports = { reviveObsVoice, applyAntiEchoDesktopMute, antiEchoEnabled };
