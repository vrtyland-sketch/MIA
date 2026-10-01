"use strict";

const fs = require("fs");
const path = require("path");

const files = [
  "logs/youtube-events-2026-08-01.jsonl",
  "logs/youtube-events-2026-07-31.jsonl",
  "logs/mia-events-2026-08-01.jsonl",
  "logs/mia-events-2026-07-31.jsonl"
];
const untilMs = Number(process.env.MIA_YT_WATCH_MS) || 300000;
const start = Date.now();
const offsets = {};
for (const f of files) offsets[f] = fs.existsSync(f) ? fs.statSync(f).size : 0;

const needle = "MIA YOUTUBE LIVE TEST";
console.log(JSON.stringify({ watching: true, needle, untilMs }));

const timer = setInterval(() => {
  try {
    if (Date.now() - start > untilMs) {
      clearInterval(timer);
      console.log(JSON.stringify({ ok: false, reason: "timeout_300s" }));
      process.exit(2);
    }
    for (const f of files) {
      if (!fs.existsSync(f)) continue;
      const size = fs.statSync(f).size;
      const off = offsets[f] || 0;
      if (size <= off) continue;
      const buf = fs.readFileSync(f, "utf8").slice(off);
      offsets[f] = size;
      for (const line of buf.split(/\r?\n/)) {
        if (!line.trim()) continue;
        const low = line.toLowerCase();
        const isYt =
          low.includes("youtube") ||
          low.includes('"platform":"youtube"') ||
          low.includes("youtube_live_chat");
        if (!isYt) continue;
        const msgHit =
          line.includes(needle) ||
          low.includes("mia youtube live test") ||
          (low.includes("comment") && low.includes("youtube"));
        if (!msgHit) continue;
        let parsed = null;
        try {
          parsed = JSON.parse(line);
        } catch (_e) {
          /* ignore */
        }
        const event = (parsed && (parsed.event || parsed)) || {};
        console.log(
          JSON.stringify({
            ok: true,
            file: path.basename(f),
            platform: event.platform,
            message: event.message || event.text || event.content,
            username: event.username || event.nickname,
            channel: event.channel || event.liveChatId,
            messageId: event.messageId,
            eventId: event.eventId,
            ts: parsed && parsed.ts
          })
        );
        clearInterval(timer);
        process.exit(0);
      }
    }
  } catch (err) {
    clearInterval(timer);
    console.log(JSON.stringify({ ok: false, error: err.message }));
    process.exit(1);
  }
}, 1000);
