"use strict";

const https = require("https");
const fs = require("fs");
const path = require("path");

function get(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { "User-Agent": "Mozilla/5.0" } }, (res) => {
        let d = "";
        res.on("data", (c) => {
          d += c;
        });
        res.on("end", () =>
          resolve({ status: res.statusCode, headers: res.headers, body: d })
        );
      })
      .on("error", reject);
  });
}

function extractVideoId(text, loc) {
  const sources = [loc || "", text || ""];
  for (const s of sources) {
    const m =
      s.match(/"videoId":"([a-zA-Z0-9_-]{11})"/) ||
      s.match(/watch\?v=([a-zA-Z0-9_-]{11})/) ||
      s.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/) ||
      s.match(/\/live\/([a-zA-Z0-9_-]{11})/);
    if (m) return m[1];
  }
  return null;
}

async function main() {
  const urls = [
    "https://www.youtube.com/@vasaspinak/live",
    "https://www.youtube.com/@VasaSpinak/live",
    "https://www.youtube.com/@vasaspinak/streams"
  ];
  const out = [];
  for (const url of urls) {
    try {
      const r = await get(url);
      const loc = r.headers.location || "";
      const videoId = extractVideoId(r.body, loc);
      out.push({
        url,
        status: r.status,
        redirect: loc || null,
        videoId
      });
      if (videoId) {
        const tmp = path.join(
          __dirname,
          "..",
          "secrets",
          "local",
          ".yt_video_id.tmp"
        );
        fs.mkdirSync(path.dirname(tmp), { recursive: true });
        fs.writeFileSync(tmp, videoId, "utf8");
        console.log(
          JSON.stringify({ ok: true, videoIdPresent: true, source: url, wroteTmp: true })
        );
        return;
      }
    } catch (err) {
      out.push({ url, error: err.message });
    }
  }
  console.log(JSON.stringify({ ok: false, reason: "no_public_live_id", tries: out }, null, 2));
}

main().catch((err) => {
  console.log(JSON.stringify({ ok: false, error: err.message }));
  process.exit(1);
});
