"use strict";

/**
 * Kanonické MIA body vrstvy pro OBS (hlava, oči, ruce, nohy, torso).
 * Assety: mia-output-overlay/assets/mia/parts/ (dedicated crops, Phase 12u)
 */

const { BODY_PART_ASSETS, getBodyPartAssetManifest } = require("./bodyPartsAssets");

const MIA_FACE = { ...BODY_PART_ASSETS.head.moods };

const MIA_SPEAK_FRAMES = [...BODY_PART_ASSETS.eyes.speak];

const BODY_PARTS = [
  {
    id: "mia_torso",
    label: "MIA torso",
    inputName: "MIA_TORSO",
    part: "torso",
    file: "mia-body-part-overlay.html",
    urlKey: "miaTorso",
    urlQuery: "part=torso",
    width: 280,
    height: 360,
    defaultVisible: false,
    moment: true,
    rerouteAudio: false,
    zIndex: 49,
    obs: true,
    note: "Graphics Studio — dedicated torso crop (assets/mia/parts/torso); defaultně skryté."
  },
  {
    id: "mia_head",
    label: "MIA hlava",
    inputName: "MIA_HEAD",
    part: "head",
    file: "mia-body-part-overlay.html",
    urlKey: "miaHead",
    urlQuery: "part=head",
    width: 240,
    height: 240,
    defaultVisible: false,
    moment: true,
    rerouteAudio: false,
    zIndex: 51,
    obs: true,
    note: "Graphics Studio — dedicated part PNG (assets/mia/parts/head); live avatar = #miaHolo."
  },
  {
    id: "mia_eyes",
    label: "MIA oči / ústa",
    inputName: "MIA_EYES",
    part: "eyes",
    file: "mia-body-part-overlay.html",
    urlKey: "miaEyes",
    urlQuery: "part=eyes",
    width: 200,
    height: 120,
    defaultVisible: false,
    moment: true,
    rerouteAudio: false,
    zIndex: 52,
    obs: true,
    note: "Graphics Studio — dedicated speak crops (assets/mia/parts/eyes)."
  },
  {
    id: "mia_hands",
    label: "MIA ruce",
    inputName: "MIA_HANDS",
    part: "hands",
    file: "mia-body-part-overlay.html",
    urlKey: "miaHands",
    urlQuery: "part=hands",
    width: 220,
    height: 160,
    defaultVisible: false,
    moment: true,
    rerouteAudio: false,
    zIndex: 48,
    obs: true,
    note: "Graphics Studio — dedicated gesture crops (assets/mia/parts/hands)."
  },
  {
    id: "mia_feet",
    label: "MIA nohy",
    inputName: "MIA_FEET",
    part: "feet",
    file: "mia-body-part-overlay.html",
    urlKey: "miaFeet",
    urlQuery: "part=feet",
    width: 200,
    height: 100,
    defaultVisible: false,
    moment: true,
    rerouteAudio: false,
    zIndex: 47,
    obs: true,
    note: "Graphics Studio — dedicated feet crop (assets/mia/parts/feet)."
  }
];

/**
 * OBS layout pro TikTok portrait 1080×1920.
 * Každá část má vlastní transform — společná pozice dělala „rozřezanou“ MIA.
 * alignment 5 = LEFT|TOP.
 */
const BODY_PART_OBS_TRANSFORMS = {
  head: { positionX: 36, positionY: 1260, scaleX: 1.45, scaleY: 1.45, alignment: 5 },
  eyes: { positionX: 78, positionY: 1324, scaleX: 1.05, scaleY: 1.05, alignment: 5 },
  hands: { positionX: 8, positionY: 1488, scaleX: 1.15, scaleY: 1.15, alignment: 5 },
  torso: { positionX: 48, positionY: 1410, scaleX: 1.1, scaleY: 1.1, alignment: 5 },
  feet: { positionX: 72, positionY: 1548, scaleX: 0.9, scaleY: 0.9, alignment: 5 }
};

/** @deprecated alias — prefer getBodyPartObsTransform(part) */
const BODY_PARTS_OBS_TRANSFORM = { ...BODY_PART_OBS_TRANSFORMS.head };

function getBodyPartObsTransform(partOrId) {
  const key = String(partOrId || "").toLowerCase().replace(/^mia_/, "");
  return { ...(BODY_PART_OBS_TRANSFORMS[key] || BODY_PART_OBS_TRANSFORMS.head) };
}

/** Ověření, že transform + source size zůstane na canvasu (default portrait). */
function isBodyTransformOnCanvas(transform = BODY_PARTS_OBS_TRANSFORM, options = {}) {
  const canvasW = Number(options.canvasW) || 1080;
  const canvasH = Number(options.canvasH) || 1920;
  const srcW = Number(options.sourceWidth) || 360;
  const srcH = Number(options.sourceHeight) || 360;
  const t = transform && typeof transform === "object" ? transform : BODY_PARTS_OBS_TRANSFORM;
  const scaleX = Number(t.scaleX) || 1;
  const scaleY = Number(t.scaleY) || 1;
  const w = srcW * scaleX;
  const h = srcH * scaleY;
  const x = Number(t.positionX) || 0;
  const y = Number(t.positionY) || 0;
  const align = Number(t.alignment) || 5;
  // OBS: 1=left, 2=right, 4=top, 8=bottom; 5=LEFT|TOP; 0/none vertical → center
  const left = align & 1 ? x : align & 2 ? x - w : x - w / 2;
  const top = align & 4 ? y : align & 8 ? y - h : y - h / 2;
  const right = left + w;
  const bottom = top + h;
  const margin = Number(options.margin) || 8;
  return (
    left >= -margin &&
    top >= -margin &&
    right <= canvasW + margin &&
    bottom <= canvasH + margin &&
    w >= 80 &&
    h >= 80
  );
}

function areBodyPartTransformsOnCanvas(options = {}) {
  return Object.keys(BODY_PART_OBS_TRANSFORMS).every((part) =>
    isBodyTransformOnCanvas(BODY_PART_OBS_TRANSFORMS[part], {
      canvasW: options.canvasW,
      canvasH: options.canvasH,
      sourceWidth: options.sourceWidth || 360,
      sourceHeight: options.sourceHeight || 360,
      margin: options.margin
    })
  );
}

function listBodyParts() {
  return BODY_PARTS.map((row) => ({ ...row }));
}

function getBodyPart(id) {
  const key = String(id || "").toLowerCase();
  return BODY_PARTS.find((row) => row.id === key || row.part === key) || null;
}

function appendUrlQuery(query, extra) {
  if (!extra) return query;
  return query ? `${query}&${extra}` : extra;
}

function resolveSyncQuery(options = {}) {
  if (options.syncHybrid === true) return "sync=hybrid";
  if (options.syncGraphics === true) return "sync=graphics";
  return "";
}

function buildBodyPartUrls(baseUrl = "http://127.0.0.1:3000", options = {}) {
  const base = String(baseUrl).replace(/\/$/, "");
  const syncQuery = resolveSyncQuery(options);
  const urls = {};
  for (const row of BODY_PARTS) {
    const query = appendUrlQuery(row.urlQuery, syncQuery);
    urls[row.urlKey] = `${base}/${row.file}?${query}`;
  }
  return urls;
}

function getObsBodyLayers(baseUrl = "http://127.0.0.1:3000", options = {}) {
  const base = String(baseUrl).replace(/\/$/, "");
  const syncQuery = resolveSyncQuery(options);
  return BODY_PARTS.map((row) => ({
    ...row,
    url: `${base}/${row.file}?${appendUrlQuery(row.urlQuery, syncQuery)}`,
    sceneItemEnabled: row.defaultVisible === true
  }));
}

module.exports = {
  MIA_FACE,
  MIA_SPEAK_FRAMES,
  BODY_PARTS,
  BODY_PARTS_OBS_TRANSFORM,
  BODY_PART_OBS_TRANSFORMS,
  getBodyPartObsTransform,
  isBodyTransformOnCanvas,
  areBodyPartTransformsOnCanvas,
  listBodyParts,
  getBodyPart,
  buildBodyPartUrls,
  getObsBodyLayers,
  getBodyPartAssetManifest
};
