"use strict";

const paintCore = require("../mia-paint-core");
const { listParticlePresets, getParticlePreset } = require("./particlePresets");

function fxClientStep(command, args) {
  return { command, args: args && typeof args === "object" ? args : {} };
}

function runFxOnDocument(doc, commandId, args = {}) {
  if (!doc) return { ok: false, error: "no_document" };

  const key = String(commandId || "").toLowerCase();
  if (key !== "create_particles" && key !== "particles") {
    return { ok: false, error: "unknown_fx_command", commandId };
  }

  const x = args.x == null ? Math.round(doc.width / 2) : Number(args.x);
  const y = args.y == null ? Math.round(doc.height / 2) : Number(args.y);
  const result = paintCore.createParticleEmitter(doc, {
    ...args,
    preset: args.preset || args.presetId || "sparkle_blue",
    x,
    y
  });
  if (!result.ok) return result;

  return {
    ok: true,
    api: "MIA.createParticles",
    module: "create_particles",
    emitter: result.emitter,
    preset: getParticlePreset(result.emitter.preset),
    clientStep: fxClientStep("particle_spawn", {
      emitter: result.emitter,
      preset: result.emitter.preset,
      x: result.emitter.x,
      y: result.emitter.y,
      accent: result.emitter.accent,
      burst: result.emitter.burst
    })
  };
}

function listFxModules() {
  return [
    {
      id: "particles",
      api: "MIA.createParticles",
      route: "/mia/graphics/fx/particles",
      bridgeAction: "create_particles",
      presets: listParticlePresets()
    }
  ];
}

module.exports = {
  runFxOnDocument,
  listFxModules,
  fxClientStep,
  listParticlePresets,
  getParticlePreset: require("../mia-paint-core/particlePresets").getParticlePreset
};
