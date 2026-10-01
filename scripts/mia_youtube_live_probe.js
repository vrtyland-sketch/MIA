"use strict";

const fs = require("fs");
const https = require("https");
const OBSWebSocket = require("obs-websocket-js").default;

function loadEnv() {
  const map = {};
  for (const line of fs.readFileSync(".env", "utf8").split(/\r?\n/)) {
    const i = line.indexOf("=");
    if (i > 0) map[line.slice(0, i)] = line.slice(i + 1);
  }
  return map;
}

function getJson(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        let d = "";
        res.on("data", (c) => {
          d += c;
        });
        res.on("end", () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(d) });
          } catch (_e) {
            resolve({ status: res.statusCode, body: d });
          }
        });
      })
      .on("error", reject);
  });
}

async function obsStatus() {
  try {
    const obs = new OBSWebSocket();
    await obs.connect("ws://127.0.0.1:4455", "B4bCkPRomsqrsFKb");
    const s = await obs.call("GetStreamStatus");
    const svc = await obs.call("GetStreamServiceSettings");
    const st = svc.streamServiceSettings || {};
    await obs.disconnect();
    return {
      outputActive: s.outputActive,
      outputDuration: s.outputDuration,
      outputBytes: s.outputBytes,
      broadcast_id: st.broadcast_id || null,
      keySet: !!(st.key && String(st.key).length)
    };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

async function main() {
  const env = loadEnv();
  const key = env.YOUTUBE_API_KEY || "";
  const vid = env.YOUTUBE_VIDEO_ID || "";
  const chat = env.YOUTUBE_LIVE_CHAT_ID || "";
  const obs = await obsStatus();

  let video = null;
  let poll = null;
  if (key && vid) {
    const v = await getJson(
      "https://www.googleapis.com/youtube/v3/videos?part=liveStreamingDetails,snippet&id=" +
        encodeURIComponent(vid) +
        "&key=" +
        encodeURIComponent(key)
    );
    const it = (v.body.items || [])[0] || {};
    const activeChat = it.liveStreamingDetails?.activeLiveChatId || "";
    video = {
      status: v.status,
      title: it.snippet?.title || null,
      liveBroadcastContent: it.snippet?.liveBroadcastContent || null,
      activeLiveChatIdPresent: !!activeChat,
      envChatMatchesActive: !!(activeChat && chat && activeChat === chat)
    };
    const chatId = activeChat || chat;
    if (chatId) {
      const p = await getJson(
        "https://www.googleapis.com/youtube/v3/liveChat/messages?liveChatId=" +
          encodeURIComponent(chatId) +
          "&part=snippet,authorDetails&maxResults=5&key=" +
          encodeURIComponent(key)
      );
      poll = {
        status: p.status,
        error: p.body?.error?.message || null,
        itemCount: Array.isArray(p.body?.items) ? p.body.items.length : null
      };
    }
  }

  console.log(JSON.stringify({ obs, video, poll }, null, 2));
}

main().catch((err) => {
  console.log(JSON.stringify({ ok: false, error: err.message }));
  process.exit(1);
});
