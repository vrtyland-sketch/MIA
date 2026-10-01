"use strict";

/**
 * Resolve active YouTube live videoId + liveChatId using env API key.
 * Writes YOUTUBE_VIDEO_ID (+ optional YOUTUBE_LIVE_CHAT_ID) to .env without printing secrets.
 */

const fs = require("fs");
const path = require("path");
const https = require("https");

const ROOT = path.resolve(__dirname, "..");
const ENV_PATH = path.join(ROOT, ".env");

function loadEnv() {
  const raw = fs.readFileSync(ENV_PATH, "utf8");
  const out = {};
  for (const line of raw.split(/\r?\n/)) {
    const i = line.indexOf("=");
    if (i <= 0) continue;
    out[line.slice(0, i)] = line.slice(i + 1);
  }
  return { raw, map: out };
}

function setEnv(raw, name, val) {
  const re = new RegExp(`^${name}=.*$`, "m");
  if (re.test(raw)) return raw.replace(re, `${name}=${val}`);
  return `${raw.replace(/\s*$/, "")}\n${name}=${val}\n`;
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
          } catch (err) {
            resolve({ status: res.statusCode, body: d });
          }
        });
      })
      .on("error", reject);
  });
}

async function main() {
  const { raw, map } = loadEnv();
  const key = (map.YOUTUBE_API_KEY || map.MIA_YOUTUBE_API_KEY || "").trim();
  if (!key) {
    console.log(JSON.stringify({ ok: false, reason: "missing_api_key" }));
    process.exit(1);
  }

  const queries = [
    "MIA Test Stream",
    "Váša Špíňák",
    "VasaSpinak",
    "vasaspinak"
  ];

  const hits = [];
  for (const q of queries) {
    const url =
      "https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&eventType=live&maxResults=5&q=" +
      encodeURIComponent(q) +
      "&key=" +
      encodeURIComponent(key);
    const res = await getJson(url);
    if (res.status !== 200) {
      console.log(
        JSON.stringify({
          ok: false,
          reason: "search_failed",
          status: res.status,
          error: res.body?.error?.message || null,
          query: q
        })
      );
      if (res.status === 400 || res.status === 403) process.exit(2);
      continue;
    }
    for (const it of res.body.items || []) {
      const videoId = it.id?.videoId;
      if (!videoId) continue;
      hits.push({
        videoId,
        title: it.snippet?.title,
        channel: it.snippet?.channelTitle,
        channelId: it.snippet?.channelId
      });
    }
    if (hits.length) break;
  }

  if (!hits.length) {
    console.log(
      JSON.stringify({
        ok: false,
        reason: "no_live_hits",
        hint:
          "API search nenašlo veřejný live. Z URL watch?v=XXXX vlož YOUTUBE_VIDEO_ID ručně (Unlisted/Private search neuvidí)."
      })
    );
    process.exit(3);
  }

  const videoId = hits[0].videoId;
  const vurl =
    "https://www.googleapis.com/youtube/v3/videos?part=liveStreamingDetails,snippet&id=" +
    encodeURIComponent(videoId) +
    "&key=" +
    encodeURIComponent(key);
  const vres = await getJson(vurl);
  const details = vres.body?.items?.[0]?.liveStreamingDetails || {};
  const liveChatId = details.activeLiveChatId || "";

  let next = setEnv(raw, "MIA_YOUTUBE_ENABLED", "1");
  next = setEnv(next, "YOUTUBE_VIDEO_ID", videoId);
  if (liveChatId) next = setEnv(next, "YOUTUBE_LIVE_CHAT_ID", liveChatId);
  fs.writeFileSync(ENV_PATH, next, "utf8");

  console.log(
    JSON.stringify({
      ok: true,
      videoIdLen: videoId.length,
      liveChatIdPresent: !!liveChatId,
      title: hits[0].title,
      channel: hits[0].channel,
      wrote: ["YOUTUBE_VIDEO_ID", liveChatId ? "YOUTUBE_LIVE_CHAT_ID" : null].filter(Boolean)
    })
  );
}

main().catch((err) => {
  console.log(JSON.stringify({ ok: false, error: err.message }));
  process.exit(1);
});
