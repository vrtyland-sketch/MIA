"use strict";

const graphicsStudio = require("../shared/mia-graphics-studio");
const paintBridge = require("./MIA_PAINT_BRIDGE");
const paintAiBridge = require("./MIA_PAINT_AI");

function getGraphicsCatalog() {
  return {
    ok: true,
    ...graphicsStudio.getCatalogSummary(),
    aiModules: graphicsStudio.listAiModules(),
    aiAnimationModules: graphicsStudio.listAiAnimationModules(),
    motionModules: graphicsStudio.listMotionModules(),
    fxModules: graphicsStudio.listFxModules(),
    exportModules: graphicsStudio.listExportModules(),
    avatarModules: graphicsStudio.listAvatarModules(),
    obsHook: graphicsStudio.getObsHook(Number(process.env.PORT) || 3000)
  };
}

function aiContext() {
  return {
    bridge: paintBridge,
    aiBridge: paintAiBridge,
    paintAi: require("../shared/mia-paint-ai")
  };
}

async function runGraphicsAiCommand(body = {}) {
  const module = body.module || body.command || body.api;
  const args = { ...(body.args && typeof body.args === "object" ? body.args : body) };
  delete args.module;
  delete args.command;
  delete args.api;
  delete args.args;
  delete args.lastImageBase64;
  const ctx = aiContext();
  if (body.lastImageBase64) ctx.lastImageBase64 = body.lastImageBase64;

  const result = await graphicsStudio.runAiModule(module, args, ctx);
  return {
    ...result,
    catalog: "/mia/graphics/catalog",
    aiModules: "/mia/graphics/ai"
  };
}

async function runGraphicsPipeline(body = {}) {
  const steps = Array.isArray(body.steps) ? body.steps : [];
  let resolved = steps;

  if (!resolved.length && body.intent) {
    const intent = graphicsStudio.resolveIntentToPipeline(body.intent);
    if (!intent.ok) return intent;
    resolved = intent.steps;
  }

  if (!resolved.length) {
    return { ok: false, error: "empty_pipeline", hint: "Použij steps[] nebo intent text" };
  }

  const ctx = aiContext();
  if (body.lastImageBase64) ctx.lastImageBase64 = body.lastImageBase64;

  const result = await graphicsStudio.runPipeline(resolved, ctx);

  return {
    ...result,
    stepCount: resolved.length,
    catalog: "/mia/graphics/catalog"
  };
}

async function runGraphicsMotionCommand(body = {}) {
  const module = body.module || body.command || body.api;
  const args = { ...(body.args && typeof body.args === "object" ? body.args : body) };
  delete args.module;
  delete args.command;
  delete args.api;
  delete args.args;

  const doc = paintBridge.getSession().document;
  const commandId = String(module || "")
    .replace(/^MIA\./, "")
    .replace(/([A-Z])/g, "_$1")
    .toLowerCase()
    .replace(/^_/, "");

  const result = await graphicsStudio.runMotionOnDocument(doc, commandId, args);
  return {
    ...result,
    catalog: "/mia/graphics/catalog",
    motionModules: "/mia/graphics/motion"
  };
}

async function runGraphicsFxCommand(body = {}) {
  const args = { ...(body.args && typeof body.args === "object" ? body.args : body) };
  delete args.module;
  delete args.command;
  delete args.api;
  delete args.args;
  const doc = paintBridge.getSession().document;
  const result = graphicsStudio.runFxOnDocument(doc, "create_particles", args);
  return {
    ...result,
    catalog: "/mia/graphics/catalog",
    fxModules: "/mia/graphics/fx"
  };
}

async function runCreateAvatarCommand(body = {}) {
  const args = { ...(body.args && typeof body.args === "object" ? body.args : body) };
  delete args.module;
  delete args.command;
  delete args.api;
  delete args.args;
  const result = await graphicsStudio.runCreateAvatar(args, aiContext());
  return {
    ...result,
    catalog: "/mia/graphics/catalog",
    avatarModules: "/mia/graphics/avatar",
    obsHook: "/mia/graphics/obs"
  };
}

async function runGenerateAnimationCommand(body = {}) {
  const args = { ...(body.args && typeof body.args === "object" ? body.args : body) };
  delete args.module;
  delete args.command;
  delete args.api;
  delete args.args;
  const result = await graphicsStudio.generateAnimation(args, aiContext());
  return {
    ...result,
    catalog: "/mia/graphics/catalog",
    aiModules: "/mia/graphics/ai",
    animationModules: "/mia/graphics/ai/animation"
  };
}

async function runPromoteAnimationCommand(body = {}) {
  const args = { ...(body.args && typeof body.args === "object" ? body.args : body) };
  delete args.module;
  delete args.command;
  delete args.api;
  delete args.args;
  const result = await graphicsStudio.promoteAnimationCommand(args);
  return {
    ...result,
    catalog: "/mia/graphics/catalog",
    animationModules: "/mia/graphics/ai/animation"
  };
}

function getPreviewState() {
  return graphicsStudio.getPreviewStateFromBridge(paintBridge);
}

function getGraphicsObsHook() {
  return graphicsStudio.getObsHook(Number(process.env.PORT) || 3000);
}

async function runGraphicsExportCommand(body = {}) {
  const module = body.module || body.command || body.format || "gif";
  const args = { ...(body.args && typeof body.args === "object" ? body.args : body) };
  delete args.module;
  delete args.command;
  delete args.format;
  delete args.args;
  const commandId =
    String(module).toLowerCase() === "gif" || String(module).toLowerCase() === "export_gif"
      ? "export_gif"
      : "export_video";
  if (!args.format && String(module).toLowerCase() === "mp4") args.format = "mp4";
  if (!args.format && String(module).toLowerCase() === "webm") args.format = "webm";
  const result = await graphicsStudio.runExportModule(commandId, args, aiContext());
  return {
    ...result,
    catalog: "/mia/graphics/catalog",
    exportModules: "/mia/graphics/export"
  };
}

module.exports = {
  getGraphicsCatalog,
  runGraphicsAiCommand,
  runGraphicsMotionCommand,
  runGraphicsFxCommand,
  runCreateAvatarCommand,
  runGenerateAnimationCommand,
  runPromoteAnimationCommand,
  getPreviewState,
  getGraphicsObsHook,
  runGraphicsExportCommand,
  runGraphicsPipeline
};
