"use strict";

/**
 * Spustí / zastaví viditelný battle demo test pro OBS.
 *
 *   npm run battle:demo
 *   node scripts/battle_obs_demo.js stop
 */

const http = require("http");

const HOST = process.env.MIA_HOST || "127.0.0.1";
const PORT = Number(process.env.MIA_PORT || 3000);

function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request(
      {
        hostname: HOST,
        port: PORT,
        path,
        method,
        headers: data
          ? { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(data) }
          : {}
      },
      (res) => {
        let raw = "";
        res.on("data", (c) => (raw += c));
        res.on("end", () => {
          try {
            resolve({ status: res.statusCode, json: JSON.parse(raw || "{}") });
          } catch (err) {
            reject(err);
          }
        });
      }
    );
    req.on("error", reject);
    if (data) req.write(data);
    req.end();
  });
}

async function main() {
  const cmd = (process.argv[2] || "start").toLowerCase();
  const base = `http://${HOST}:${PORT}`;

  if (cmd === "stop") {
    const res = await request("POST", "/arena/battle/demo/stop");
    console.log(JSON.stringify(res.json, null, 2));
    return;
  }

  if (cmd === "status") {
    const res = await request("GET", "/arena/battle/demo");
    console.log(JSON.stringify(res.json, null, 2));
    return;
  }

  const res = await request("POST", "/arena/battle/demo/start", {
    durationSec: Number(process.argv[3]) || 600,
    intervalMs: Number(process.argv[4]) || 3500
  });

  if (!res.json?.ok) {
    console.error("Demo start failed:", res.json);
    process.exit(1);
  }

  console.log("\n=== MIA BATTLE DEMO · OBS TEST ===\n");
  console.log("Demo běží — rotace útoků každé ~3.5 s\n");
  console.log("Browser Sources (1080×1920 portrait):");
  console.log(`  2×2 test grid:  ${base}/arena-battle-test-overlay.html`);
  console.log(`  Full souboj:    ${base}/arena-battle-overlay.html`);
  console.log(`  Team bar:       ${base}/arena-overlay.html`);
  console.log(`  Galerie roster:   ${base}/koj-roster-gallery.html`);
  console.log(`  Galerie formy:    ${base}/koj-forms-gallery.html`);
  console.log(`  Galerie itemy:    ${base}/koj-items-gallery.html`);
  console.log(`  Galerie evoluce:  ${base}/koj-evolution-gallery.html\n`);
  console.log("OBS setup:");
  console.log("  npm run obs:ensure-arena-battle-test");
  console.log("  npm run obs:ensure-arena-battle");
  console.log("  npm run obs:ensure-arena\n");
  console.log("Zastavit: npm run battle:demo:stop\n");
  console.log(JSON.stringify(res.json.demo, null, 2));
}

main().catch((err) => {
  console.error(err.message);
  console.error("Je MIA server spuštěný? (node index.js / npm start)");
  process.exit(1);
});
