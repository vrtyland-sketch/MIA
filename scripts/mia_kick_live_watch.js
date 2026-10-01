"use strict";

const fs = require("fs");
const path = require("path");

const files = [
  "logs/kick-events-2026-07-31.jsonl",
  "logs/mia-events-2026-07-31.jsonl"
];
const needle = "MIA KICK LIVE TEST";
const untilMs = 180000;
const start = Date.now();
const offsets = {};

for (const f of files) {
  offsets[f] = fs.existsSync(f) ? fs.statSync(f).size : 0;
}

console.log(
  JSON.stringify({
    watching: true,
    needle,
    chatroomId: "95746130",
    untilMs
  })
);

const timer = setInterval(() => {
  try {
    if (Date.now() - start > untilMs) {
      clearInterval(timer);
      console.log(JSON.stringify({ ok: false, reason: "timeout_180s" }));
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
        const looksKick =
          low.includes("kick") ||
          low.includes("mia kick") ||
          low.includes('"platform":"kick"');
        if (!looksKick) continue;

        const hit =
          line.includes(needle) ||
          low.includes("kick live") ||
          (low.includes('"platform":"kick"') && low.includes("comment"));
        if (!hit) continue;

        let parsed = null;
        try {
          parsed = JSON.parse(line);
        } catch (_err) {
          /* ignore */
        }
        const event = (parsed && (parsed.event || parsed)) || {};
        console.log(
          JSON.stringify({
            ok: true,
            file: path.basename(f),
            platform: event.platform,
            message: event.message || event.text,
            username: event.username,
            channel: event.channel,
            chatroomId: event.chatroomId,
            messageId: event.messageId,
            ts: parsed && parsed.ts,
            preview: line.slice(0, 350)
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
