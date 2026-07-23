"use strict";

/**
 * Manifest 6 kamer pro OBS — nepřepisuje NOTEBOOK_CAMERA, jen dokumentuje sloty.
 * npm run obs:register-streamer-cameras
 */

const fs = require("fs");
const path = require("path");
const { listCameraSlots } = require("../shared/mia-scene-engine/streamerCameraRig");

const OUT = path.join(__dirname, "..", "data", "obs-streamer-camera-rig.json");

function main() {
  const slots = listCameraSlots();
  const manifest = {
    generatedAt: new Date().toISOString(),
    multiCam: true,
    maxCameras: 6,
    ingestEndpoint: "POST /mia/scene/matte/ingest",
    matteStateEndpoint: "GET /mia/scene/matte-state",
    note: "Přiřaď OBS Video Capture / Virtual Cam / NDI ke slotům MIA_CAM_01..06. Legacy NOTEBOOK_CAMERA → CAM_01. Auto-setup: npm run obs:ensure-streamer-cameras",
    slots
  };
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  console.log(`Wrote ${OUT}`);
  for (const slot of slots) {
    console.log(`  ${slot.id}  ${slot.obsName}  (${slot.role})`);
  }
}

main();
