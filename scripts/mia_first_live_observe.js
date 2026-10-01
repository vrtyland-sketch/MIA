"use strict";

/**
 * FIRST LIVE OBSERVATION — read-only watcher.
 * Polls /health + /diagnose, tails event/error logs.
 * Never mutates runtime, OBS, or platform config.
 *
 * Usage:
 *   node scripts/mia_first_live_observe.js
 *   node scripts/mia_first_live_observe.js --interval=5000
 */

const fs = require("fs");
const path = require("path");
const http = require("http");

const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "docs");
const EVIDENCE = path.join(OUT_DIR, "FIRST_LIVE_OBSERVATION_EVIDENCE.jsonl");
const TIMELINE = path.join(OUT_DIR, "FIRST_LIVE_OBSERVATION_TIMELINE.json");

const PORT = Number(process.env.PORT || 3000);
const INTERVAL_MS = Number(
  (process.argv.find((a) => a.startsWith("--interval=")) || "").split("=")[1] || 5000
);

const day = new Date().toISOString().slice(0, 10);
const EVENT_LOG = path.join(ROOT, "logs", `mia-events-${day}.jsonl`);
const ERROR_LOG = path.join(ROOT, "logs", `mia-errors-${day}.jsonl`);

const firsts = {
  firstTikTokComment: null,
  firstAhojMia: null,
  firstMiaReply: null,
  firstGift: null,
  firstGiftOverlayOrVideo: null,
  firstBowlUpdate: null
};

const state = {
  startedAt: new Date().toISOString(),
  eventOffset: fs.existsSync(EVENT_LOG) ? fs.statSync(EVENT_LOG).size : 0,
  errorOffset: fs.existsSync(ERROR_LOG) ? fs.statSync(ERROR_LOG).size : 0,
  lastHealthOk: null,
  lastBowl: null,
  errorsLastMinute: [],
  lastIngestAt: null,
  ttsStuckSince: null,
  criticalReported: new Set(),
  recentEventKeys: new Map()
};

function appendEvidence(row) {
  fs.appendFileSync(EVIDENCE, `${JSON.stringify(row)}\n`, "utf8");
}

function writeTimeline() {
  fs.writeFileSync(
    TIMELINE,
    JSON.stringify({ updatedAt: new Date().toISOString(), firsts, baseline: state.startedAt }, null, 2),
    "utf8"
  );
}

function fetchJson(pathname, timeoutMs = 7000) {
  return new Promise((resolve) => {
    const req = http.get(
      { hostname: "127.0.0.1", port: PORT, path: pathname, timeout: timeoutMs },
      (res) => {
        let body = "";
        res.on("data", (c) => (body += c));
        res.on("end", () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(body) });
          } catch (err) {
            resolve({ status: res.statusCode, error: err.message, body: body.slice(0, 200) });
          }
        });
      }
    );
    req.on("error", (err) => resolve({ error: err.message }));
    req.on("timeout", () => {
      req.destroy();
      resolve({ error: "timeout" });
    });
  });
}

function localNow() {
  return new Date().toISOString();
}

function markFirst(key, payload) {
  if (firsts[key]) return false;
  firsts[key] = { at: localNow(), ...payload };
  writeTimeline();
  appendEvidence({ kind: "FIRST", key, ...firsts[key] });
  console.log(JSON.stringify({ FIRST: key, ...firsts[key] }));
  return true;
}

function reportCritical(code, detail) {
  if (state.criticalReported.has(code)) return;
  state.criticalReported.add(code);
  const row = {
    kind: "CRITICAL",
    code,
    at: localNow(),
    ...detail
  };
  appendEvidence(row);
  console.log(JSON.stringify(row));
}

function eventKey(obj) {
  const id =
    obj.eventId ||
    obj.messageId ||
    obj.msgId ||
    obj.id ||
    `${obj.stage || ""}|${obj.username || obj.user || ""}|${obj.message || obj.text || ""}|${obj.ts || ""}`;
  return String(id).slice(0, 240);
}

function looksAhojMia(text) {
  const t = String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  return /\bahoj\b/.test(t) && /\bmia\b/.test(t);
}

function classifyLine(raw) {
  let obj;
  try {
    obj = JSON.parse(raw);
  } catch {
    return;
  }
  const stage = String(obj.stage || obj.type || obj.event || "").toLowerCase();
  const platform = String(obj.platform || obj.event?.platform || "").toLowerCase();
  const message = obj.message || obj.text || obj.event?.message || obj.event?.text || "";
  const username = obj.username || obj.user || obj.nickname || obj.event?.username || "";

  const isTikTok = !platform || platform === "tiktok" || platform === "tikfinity";
  const isComment =
    /comment|chat|ingest.*comment|normalized_comment/.test(stage) ||
    String(obj.type || "").toLowerCase() === "comment" ||
    String(obj.eventType || "").toLowerCase() === "comment";
  const isGift = /gift/.test(stage) || String(obj.type || "").toLowerCase() === "gift";
  const isReply =
    /reply|response|tts_speak|voice_play|speech|mia_say|speak/.test(stage) ||
    Boolean(obj.replyText || obj.spokenText);
  const isOverlayVideo =
    /gift.*(video|overlay|play)|video_play|overlay_action|media_play|gift_moment/.test(stage);
  const isBowl = /bowl/.test(stage) || obj.bowlPercent != null || obj.bowl != null;

  const key = eventKey(obj);
  const prev = state.recentEventKeys.get(key);
  if (prev && Date.now() - prev < 120000 && (isReply || isGift)) {
    reportCritical("duplicate_response_same_event", {
      inputEvent: { stage, platform, username, message: String(message).slice(0, 120), key },
      expectedAction: "single handling",
      actualResult: "repeated handling within 120s",
      safestLayerToDisable: "response / TTS layer"
    });
  }
  state.recentEventKeys.set(key, Date.now());
  if (state.recentEventKeys.size > 500) {
    const cutoff = Date.now() - 300000;
    for (const [k, ts] of state.recentEventKeys) {
      if (ts < cutoff) state.recentEventKeys.delete(k);
    }
  }

  if (isComment && isTikTok) {
    markFirst("firstTikTokComment", {
      stage,
      platform: platform || "tiktok",
      username,
      message: String(message).slice(0, 160)
    });
    if (looksAhojMia(message)) {
      markFirst("firstAhojMia", {
        stage,
        username,
        message: String(message).slice(0, 160)
      });
    }
  }
  if (isReply) {
    markFirst("firstMiaReply", {
      stage,
      platform,
      username,
      preview: String(obj.replyText || obj.spokenText || message || obj.text || "").slice(0, 160)
    });
  }
  if (isGift) {
    markFirst("firstGift", {
      stage,
      platform: platform || "tiktok",
      username,
      gift: obj.giftName || obj.gift || obj.event?.giftName || null
    });
  }
  if (isOverlayVideo) {
    markFirst("firstGiftOverlayOrVideo", { stage, platform, username });
  }
  if (isBowl) {
    markFirst("firstBowlUpdate", {
      stage,
      bowlPercent: obj.bowlPercent ?? obj.bowl ?? null
    });
  }

  if (/error|fail|crash|exception/.test(stage) || obj.level === "error") {
    state.errorsLastMinute.push(Date.now());
  }
}

function readNew(file, offsetKey) {
  if (!fs.existsSync(file)) return;
  const size = fs.statSync(file).size;
  const off = state[offsetKey];
  if (size < off) {
    state[offsetKey] = 0;
  }
  if (size <= state[offsetKey]) return;
  const buf = fs.readFileSync(file, "utf8").slice(state[offsetKey]);
  state[offsetKey] = size;
  for (const line of buf.split(/\r?\n/)) {
    if (!line.trim()) continue;
    if (file.includes("mia-errors")) {
      state.errorsLastMinute.push(Date.now());
      appendEvidence({ kind: "ERROR_LOG", at: localNow(), line: line.slice(0, 500) });
      console.log(JSON.stringify({ ERROR_LOG: line.slice(0, 300) }));
      continue;
    }
    classifyLine(line);
  }
}

async function tick() {
  const now = Date.now();
  state.errorsLastMinute = state.errorsLastMinute.filter((t) => now - t < 60000);
  const errorsPerMin = state.errorsLastMinute.length;

  readNew(EVENT_LOG, "eventOffset");
  readNew(ERROR_LOG, "errorOffset");

  const health = await fetchJson("/health");
  const diag = await fetchJson("/diagnose");

  const h = health.data || {};
  const d = diag.data || {};
  const ok = h.ok === true;
  const bowl = h.bowlPercent;
  const lastIngest = h.lastIngest;
  const tts = d.tts || {};
  const voice = tts.voicePlayback || null;
  const queueSize = d.overlay?.queueSize ?? null;
  const videoSnap = d.video || {};

  if (lastIngest) state.lastIngestAt = Date.now();

  const snapshot = {
    kind: "TICK",
    at: localNow(),
    healthOk: ok,
    obsConnected: h.obsConnected,
    bowlPercent: bowl,
    lastIngest,
    kickConnected: h.kickBridge?.connected ?? null,
    overlayQueueSize: queueSize,
    ttsEnabled: tts.enabled,
    voicePlayback: voice,
    videoPlaying: videoSnap.playing || videoSnap.active || videoSnap.current || null,
    errorsPerMin
  };
  appendEvidence(snapshot);

  if (!ok || health.error) {
    reportCritical("health_not_ok", {
      inputEvent: null,
      expectedAction: "health.ok === true",
      actualResult: health.error || h,
      safestLayerToDisable: "hold visual; do not restart without operator OK"
    });
  }

  if (state.lastBowl != null && bowl != null && bowl - state.lastBowl >= 40) {
    reportCritical("bowl_rapid_growth", {
      inputEvent: { from: state.lastBowl, to: bowl },
      expectedAction: "gradual bowl increase",
      actualResult: `+${bowl - state.lastBowl} in one poll`,
      safestLayerToDisable: "bowl overlay / economy display"
    });
  }
  if (bowl != null) state.lastBowl = bowl;

  const ttsQueued = Number(voice?.queueLength ?? voice?.queued ?? voice?.pending ?? 0);
  const ttsBusy = Boolean(voice?.speaking || voice?.playing || voice?.busy);
  if (ttsQueued >= 8 || (ttsBusy && ttsQueued >= 5)) {
    if (!state.ttsStuckSince) state.ttsStuckSince = Date.now();
    if (Date.now() - state.ttsStuckSince > 45000) {
      reportCritical("tts_queue_stuck", {
        inputEvent: voice,
        expectedAction: "TTS queue drains",
        actualResult: `queued=${ttsQueued} busy=${ttsBusy} for >45s`,
        safestLayerToDisable: "MIA voice / TTS"
      });
    }
  } else {
    state.ttsStuckSince = null;
  }

  const playing = videoSnap.playingVideos || videoSnap.activeVideos || [];
  if (Array.isArray(playing) && playing.length && videoSnap.loopSuspect) {
    reportCritical("video_endless_play", {
      inputEvent: playing,
      expectedAction: "finite gift video",
      actualResult: "loop/endless suspect",
      safestLayerToDisable: "gift video / media layer"
    });
  }

  // Operator signal: comments expected but no ingest after session armed + 3 min of firsts waiting
  // (only warn once if first comment missing and errors high — soft; no auto action)

  process.stdout.write(
    `\r[observe] ${localNow().slice(11, 19)} health=${ok ? "OK" : "FAIL"} bowl=${bowl ?? "?"} q=${queueSize ?? "?"} err/min=${errorsPerMin} firsts=${Object.values(firsts).filter(Boolean).length}/6   `
  );
}

writeTimeline();
appendEvidence({
  kind: "SESSION_START",
  at: state.startedAt,
  port: PORT,
  intervalMs: INTERVAL_MS,
  eventLog: EVENT_LOG,
  errorLog: ERROR_LOG,
  mode: "FIRST_LIVE_OBSERVATION",
  mutateRuntime: false
});

console.log(
  JSON.stringify({
    mode: "FIRST_LIVE_OBSERVATION",
    armed: true,
    port: PORT,
    intervalMs: INTERVAL_MS,
    evidence: EVIDENCE,
    timeline: TIMELINE
  })
);

tick().catch((err) => console.error(err));
setInterval(() => {
  tick().catch((err) => console.error(err));
}, INTERVAL_MS);

process.on("SIGINT", () => {
  appendEvidence({ kind: "SESSION_STOP", at: localNow(), firsts });
  writeTimeline();
  console.log("\n" + JSON.stringify({ stopped: true, firsts }));
  process.exit(0);
});
