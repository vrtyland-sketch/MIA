"use strict";

const { resolveBurstConfig, getParticlePreset } = require("./particlePresets");

let fxSeq = 0;

function nextFxId() {
  fxSeq += 1;
  return `fx_${fxSeq}_${Date.now().toString(36)}`;
}

function ensureFxParticles(doc) {
  if (!doc) return [];
  if (!Array.isArray(doc.fxParticles)) doc.fxParticles = [];
  return doc.fxParticles;
}

function createParticleEmitter(doc, opts = {}) {
  if (!doc) return { ok: false, error: "no_document" };
  const preset = getParticlePreset(opts.preset || opts.presetId || "sparkle_blue");
  const burst = resolveBurstConfig(preset.id, opts);
  const emitter = {
    id: opts.id || nextFxId(),
    preset: preset.id,
    burst: burst.burst,
    burstConfig: burst,
    x: opts.x == null ? Math.round(doc.width / 2) : Number(opts.x),
    y: opts.y == null ? Math.round(doc.height / 2) : Number(opts.y),
    accent: opts.accent || burst.accent || "#4cc9ff",
    durationMs: Math.max(200, Number(opts.durationMs) || 2000),
    loop: !!opts.loop,
    layerId: opts.layerId || null,
    createdAt: Date.now()
  };
  ensureFxParticles(doc).push(emitter);
  return { ok: true, emitter, count: doc.fxParticles.length };
}

function listFxParticles(doc) {
  return ensureFxParticles(doc).slice();
}

function removeFxParticle(doc, fxId) {
  const list = ensureFxParticles(doc);
  const idx = list.findIndex((e) => e.id === fxId);
  if (idx < 0) return { ok: false, error: "fx_not_found" };
  list.splice(idx, 1);
  return { ok: true, removed: fxId };
}

module.exports = {
  ensureFxParticles,
  createParticleEmitter,
  listFxParticles,
  removeFxParticle
};
