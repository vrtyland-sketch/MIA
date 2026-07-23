"use strict";

/**
 * NDI discovery — mapování OBS ndi_source vstupů na CAM_02..06 sloty.
 */

const { listCameraSlots } = require("./streamerCameraRig");

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function isNdiInput(input = {}) {
  return /ndi/i.test(safeString(input.inputKind));
}

function listNdiSourcesFromInputs(inputs = []) {
  return (inputs || [])
    .filter(isNdiInput)
    .map((row) => ({
      inputName: row.inputName,
      inputKind: row.inputKind,
      unversionedInputKind: row.unversionedInputKind || row.inputKind
    }));
}

function suggestNdiCameraMapping(ndiSources = [], options = {}) {
  const slots = listCameraSlots().filter(
    (slot) => slot.useForMatte && slot.id !== "CAM_01"
  );
  const sources = [...(ndiSources || [])];
  const explicit = options.explicitMap && typeof options.explicitMap === "object"
    ? options.explicitMap
    : {};

  const mapping = [];
  let sourceIdx = 0;

  for (const slot of slots) {
    const envKey = `MIA_${slot.id}_NDI_NAME`;
    const envName = process.env[envKey];
    const explicitName = explicit[slot.id] || explicit[slot.obsName];

    let ndiSourceName = safeString(explicitName) || safeString(envName);
    if (!ndiSourceName && sources[sourceIdx]) {
      ndiSourceName = sources[sourceIdx].inputName;
      sourceIdx += 1;
    }

    mapping.push({
      cameraId: slot.id,
      obsName: slot.obsName,
      role: slot.role,
      ndiSourceName: ndiSourceName || null,
      mapped: !!ndiSourceName,
      envKey
    });
  }

  return {
    ok: true,
    ndiCount: sources.length,
    mappedCount: mapping.filter((row) => row.mapped).length,
    unmappedSlots: mapping.filter((row) => !row.mapped).map((row) => row.cameraId),
    sources,
    mapping
  };
}

function buildNdiManifest(inputs = [], options = {}) {
  const plan = suggestNdiCameraMapping(listNdiSourcesFromInputs(inputs), options);
  return {
    generatedAt: new Date().toISOString(),
    provider: "mia_ndi_discovery_v1",
    ...plan
  };
}

module.exports = {
  isNdiInput,
  listNdiSourcesFromInputs,
  suggestNdiCameraMapping,
  buildNdiManifest
};
