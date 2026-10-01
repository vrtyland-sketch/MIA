"use strict";

const fs = require("fs");
const path = require("path");
const https = require("https");

const ROOT = path.resolve(__dirname, "..");
const ENV_PATH = path.join(ROOT, ".env");

function loadEnv() {
  const raw = fs.readFileSync(ENV_PATH, "utf8");
  const map = {};
  for (const line of raw.split(/\r?\n/)) {
    const i = line.indexOf("=");
    if (i > 0) map[line.slice(0, i)] = line.slice(i + 1);
  }
  return { raw, map };
}

function setEnv(raw, name, val) {
  const re = new RegExp(`^${name}=.*$`, "m");
  if (re.test(raw)) return raw.replace(re, `${name}=${val}`);
  return `${raw.replace(/\s*$/, "")}\n${name}=${val}\n`;
}

function clearEnv(raw, name) {
  return raw.replace(new RegExp(`^${name}=.*\\r?\\n?`, "m"), "");
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

async function main() {
  const clearWrong = process.argv.includes("--clear-wrong");
  let { raw, map } = loadEnv();
  const key = (map.YOUTUBE_API_KEY || "").trim();
  if (!key) {
    console.log(JSON.stringify({ ok: false, reason: "missing_api_key" }));
    process.exit(1);
  }

  if (clearWrong) {
    raw = clearEnv(raw, "YOUTUBE_VIDEO_ID");
    raw = clearEnv(raw, "YOUTUBE_LIVE_CHAT_ID");
    fs.writeFileSync(ENV_PATH, raw, "utf8");
    console.log(JSON.stringify({ ok: true, clearedWrongIds: true }));
    ({ raw, map } = loadEnv());
  }

  const channelQueries = ["Váša Špíňák", "Vasa Spinak", "vasaspinak"];
  let channelId = null;
  let channelTitle = null;

  for (const q of channelQueries) {
    const res = await getJson(
      "https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&maxResults=5&q=" +
        encodeURIComponent(q) +
        "&key=" +
        encodeURIComponent(key)
    );
    if (res.status !== 200) {
      console.log(
        JSON.stringify({
          ok: false,
          reason: "channel_search_failed",
          status: res.status,
          error: res.body?.error?.message || null
        })
      );
      process.exit(2);
    }
    const item = (res.body.items || [])[0];
    if (item?.id?.channelId) {
      channelId = item.id.channelId;
      channelTitle = item.snippet?.title || null;
      break;
    }
  }

  if (!channelId) {
    console.log(JSON.stringify({ ok: false, reason: "channel_not_found" }));
    process.exit(3);
  }

  const live = await getJson(
    "https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=" +
      encodeURIComponent(channelId) +
      "&type=video&eventType=live&maxResults=3&key=" +
      encodeURIComponent(key)
  );
  const lives = (live.body.items || []).map((i) => ({
    videoId: i.id?.videoId,
    title: i.snippet?.title
  }));

  if (!lives.length || !lives[0].videoId) {
    console.log(
      JSON.stringify({
        ok: false,
        reason: "no_channel_live",
        channelIdPresent: true,
        channelTitle,
        hint:
          "Kanál nalezen, ale žádný PUBLIC live přes API. Unlisted/Private → zkopíruj watch?v= URL do schránky a řekni: Video URL zkopírována"
      })
    );
    process.exit(4);
  }

  const videoId = lives[0].videoId;
  const vres = await getJson(
    "https://www.googleapis.com/youtube/v3/videos?part=liveStreamingDetails&id=" +
      encodeURIComponent(videoId) +
      "&key=" +
      encodeURIComponent(key)
  );
  const liveChatId =
    vres.body?.items?.[0]?.liveStreamingDetails?.activeLiveChatId || "";

  let next = setEnv(raw, "MIA_YOUTUBE_ENABLED", "1");
  next = setEnv(next, "YOUTUBE_VIDEO_ID", videoId);
  if (liveChatId) next = setEnv(next, "YOUTUBE_LIVE_CHAT_ID", liveChatId);
  fs.writeFileSync(ENV_PATH, next, "utf8");

  console.log(
    JSON.stringify({
      ok: true,
      channelTitle,
      title: lives[0].title,
      videoIdLen: videoId.length,
      liveChatIdPresent: !!liveChatId
    })
  );
}

main().catch((err) => {
  console.log(JSON.stringify({ ok: false, error: err.message }));
  process.exit(1);
});
