"use strict";

/**
 * NDI discovery CLI — mapuje ndi_source ve OBS na CAM sloty.
 * Usage: npm run obs:discover-ndi-cameras
 */

const fs = require("fs");
const path = require("path");
const OBSWebSocket = require("obs-websocket-js").default;
const { buildNdiManifest } = require("./MIA_OBS_STREAMER_CAMERAS");

const OUT = path.join(__dirname, "..", "data", "obs-ndi-camera-map.json");

async function main() {
  const obs = new OBSWebSocket();
  const password = process.env.OBS_WS_PASSWORD || "";
  await obs.connect(process.env.OBS_WS_URL || "ws://127.0.0.1:4455", password ? { password } : undefined);

  const inputList = await obs.call("GetInputList");
  const manifest = buildNdiManifest(inputList?.inputs || []);
  manifest.generatedAt = new Date().toISOString();

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  await obs.disconnect();
  console.log(JSON.stringify({ ok: true, wrote: OUT, ...manifest }, null, 2));
}

main().catch((err) => {
  console.error(JSON.stringify({ ok: false, error: err.message }));
  process.exitCode = 1;
});
