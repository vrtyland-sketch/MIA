"use strict";

const http = require("http");

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.MIA_BIND_HOST || "127.0.0.1";
const BASE = `http://${HOST === "0.0.0.0" || HOST === "::" ? "127.0.0.1" : HOST}:${PORT}`;

function fetchJson(path) {
  return new Promise((resolve, reject) => {
    const req = http.get(`${BASE}${path}`, { timeout: 8000 }, (res) => {
      let body = "";
      res.on("data", (chunk) => {
        body += chunk;
      });
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (err) {
          reject(new Error(`invalid_json: ${err.message}`));
        }
      });
    });
    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("timeout"));
    });
  });
}

function line(label, value) {
  console.log(`${label.padEnd(18)} ${value}`);
}

async function main() {
  const [health, overlay] = await Promise.all([
    fetchJson("/health"),
    fetchJson("/overlay-state")
  ]);

  if (health.status !== 200 || health.data?.ok === false) {
    console.error("MIA health FAIL — spusť npm run restart");
    process.exitCode = 1;
    return;
  }

  const koj = overlay.data?.kojnozoutState || {};
  const disp = overlay.data?.kojDisplay || {};
  const showcase = overlay.data?.showcase || {};
  const testMode = overlay.data?.kojTestMode || {};
  const duel = overlay.data?.duel || {};
  const video = overlay.data?.video || overlay.data?.kojVideoReaction || {};

  console.log("\n---- KOJ STATUS ----\n");
  line("MIA", `OK · port ${health.data?.port || PORT}`);
  line("OBS", health.data?.obsConnected ? "connected" : "offline");
  line("Miska", `${Math.round(koj.bowlPercent || 0)}%`);
  line("Hlad", `${Math.round(koj.hunger || 0)}%`);
  line("Spí", koj.isSleeping ? "ano" : "ne");
  line("Nálada", disp.mood || koj.mood || "—");
  line("Sprite", disp.spriteAsset || "—");
  line("Emoji", disp.moodEmoji || "—");
  line("Panel", disp.panelClass || "—");
  line("Video reakce", overlay.data?.kojVideoReaction?.active ? overlay.data.kojVideoReaction.phase : "ne");
  line("Test mode", testMode.enabled ? `ANO (≥${testMode.minBowlPercent || 35}%)` : "NE");
  line("Showcase", showcase.active ? `běží ${showcase.step}/${showcase.total}` : "neaktivní");
  line("Duel", duel.active ? `LIVE ${duel.localPoints || 0}:${duel.opponentPoints || 0}` : "neaktivní");
  line("Video fronta", String(video.queueLength ?? video.pendingQueue?.length ?? 0));
  line("Runtime URL", `${BASE}/kojnozrout-runtime.html`);
  line("Dashboard", `${BASE}/mia-streamer-dashboard.html`);
  console.log("\nChat: probud koj | zacni duel | mia pust testy\n");
}

main().catch((err) => {
  console.error(err.message || err);
  process.exitCode = 1;
});
