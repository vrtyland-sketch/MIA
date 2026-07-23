"use strict";

/**
 * MIA Graphics Studio — sjednocené AI moduly (Phase 12b–12c).
 */

const { getCommand } = require("./commandCatalog");

const AI_MODULE_IDS = [
  "generate_image",
  "edit_region",
  "remove_background",
  "upscale",
  "restore",
  "recolor",
  "true_alpha"
];

const AI_ROUTE_ALIASES = {
  generate: "generate_image",
  edit: "edit_region",
  "remove-background": "remove_background",
  remove_bg: "remove_background",
  removeBackground: "remove_background",
  generateImage: "generate_image",
  editRegion: "edit_region",
  upscaleImage: "upscale",
  restoreImage: "restore",
  recolorImage: "recolor",
  "true-alpha": "true_alpha",
  trueAlpha: "true_alpha"
};

const LAYER_NAMES = {
  generate_image: (args) => `AI: ${String(args.prompt || args.text || "").slice(0, 24) || "generováno"}`,
  remove_background: () => "Bez pozadí",
  edit_region: () => "AI edit",
  upscale: (args) => `Upscale ${args.scale || 2}×`,
  restore: () => "Obnoveno",
  recolor: (args) => `Paleta: ${args.palette || args.preset || "cyberpunk"}`,
  true_alpha: () => "True alpha"
};

function resolveModuleId(idOrApi) {
  const key = String(idOrApi || "").trim();
  if (!key) return null;
  if (AI_MODULE_IDS.includes(key)) return key;
  if (AI_ROUTE_ALIASES[key]) return AI_ROUTE_ALIASES[key];
  const def = getCommand(key);
  if (def && def.aiKind) return def.id;
  return null;
}

function buildClientImportStep(pngBase64, layerName, opts = {}) {
  return {
    command: "import_image",
    args: {
      dataBase64: pngBase64,
      name: layerName || "AI vrstva",
      fit: opts.fit !== false,
      replaceDocumentSize: !!opts.replaceDocumentSize,
      width: opts.width,
      height: opts.height
    }
  };
}

async function prepareJobArgs(id, args, ctx) {
  const jobArgs = { ...args };

  if (id === "generate_image") {
    jobArgs.prompt = jobArgs.prompt || jobArgs.text || "MIA asset";
    return { jobKind: "generate", jobArgs };
  }

  if (id === "remove_background") {
    if (!jobArgs.dataBase64 && ctx.lastImageBase64) jobArgs.dataBase64 = ctx.lastImageBase64;
    return { jobKind: "remove-bg", jobArgs };
  }

  if (id === "edit_region") {
    if (!jobArgs.dataBase64 && ctx.lastImageBase64) jobArgs.dataBase64 = ctx.lastImageBase64;
    if (!jobArgs.maskBase64 && jobArgs.maskRect) {
      jobArgs.maskBase64 = await buildRectMaskBase64(
        jobArgs.maskRect,
        jobArgs.docWidth,
        jobArgs.docHeight
      );
    }
    return { jobKind: "inpaint", jobArgs };
  }

  if (id === "upscale" || id === "restore" || id === "recolor") {
    if (!jobArgs.dataBase64 && ctx.lastImageBase64) jobArgs.dataBase64 = ctx.lastImageBase64;
    return { jobKind: id, jobArgs };
  }

  if (id === "true_alpha") {
    if (!jobArgs.dataBase64 && ctx.lastImageBase64) jobArgs.dataBase64 = ctx.lastImageBase64;
    return { jobKind: "true-alpha", jobArgs };
  }

  return { jobKind: null, jobArgs };
}

function validateJob(id, jobKind, jobArgs, def) {
  if (
    jobKind === "remove-bg" ||
    jobKind === "upscale" ||
    jobKind === "restore" ||
    jobKind === "recolor" ||
    jobKind === "true-alpha"
  ) {
    if (!jobArgs.dataBase64) {
      return { ok: false, error: "missing_image_data", api: def.api, module: id };
    }
  }
  if (jobKind === "inpaint" && (!jobArgs.dataBase64 || !jobArgs.maskBase64)) {
    return {
      ok: false,
      error: "missing_image_or_mask",
      api: def.api,
      module: id,
      hint: "Pošli maskBase64 nebo maskRect { x, y, width, height } + docWidth/docHeight"
    };
  }
  return { ok: true };
}

async function runAiModule(moduleId, args = {}, ctx = {}) {
  const id = resolveModuleId(moduleId);
  if (!id) {
    return { ok: false, error: "unknown_ai_module", module: moduleId };
  }

  const def = getCommand(id);
  const aiBridge = ctx.aiBridge;
  const paintAi = ctx.paintAi;
  if (!def || def.status === "planned" || !aiBridge || typeof aiBridge.runAiJob !== "function") {
    return { ok: false, error: "ai_bridge_unavailable", module: id };
  }

  const { jobKind, jobArgs } = await prepareJobArgs(id, args, ctx);
  const validation = validateJob(id, jobKind, jobArgs, def);
  if (!validation.ok) return validation;

  const result = await aiBridge.runAiJob(jobKind, jobArgs);
  if (typeof paintAi?.logPaintAi === "function") {
    paintAi.logPaintAi({
      kind: `graphics_${id}`,
      api: def.api,
      provider: result.provider,
      byteLength: result.byteLength,
      documentId: args.documentId,
      palette: result.palette,
      scale: result.scale
    });
  }

  if (!result.pngBase64) {
    return {
      ok: false,
      error: result.error || "ai_job_failed",
      api: def.api,
      module: id
    };
  }

  const layerName =
    args.layerName ||
    args.name ||
    (LAYER_NAMES[id] ? LAYER_NAMES[id](jobArgs) : "AI vrstva");

  const clientOpts = {
    fit: id !== "upscale",
    replaceDocumentSize: id === "upscale",
    width: result.width,
    height: result.height
  };

  return {
    ok: true,
    api: def.api,
    module: id,
    phase: def.phase,
    provider: result.provider,
    width: result.width,
    height: result.height,
    byteLength: result.byteLength,
    note: result.note,
    palette: result.palette,
    scale: result.scale,
    strength: result.strength,
    pngBase64: result.pngBase64,
    clientStep: buildClientImportStep(result.pngBase64, layerName, clientOpts)
  };
}

/** Obdélníková maska (bílá = editovat) jako PNG base64 — Node (sharp). */
async function buildRectMaskBase64(rect, docWidth, docHeight) {
  const w = Math.max(1, Math.round(Number(docWidth) || 512));
  const h = Math.max(1, Math.round(Number(docHeight) || 512));
  const x = Math.max(0, Math.round(Number(rect?.x) || 0));
  const y = Math.max(0, Math.round(Number(rect?.y) || 0));
  const rw = Math.max(1, Math.round(Number(rect?.width) || 1));
  const rh = Math.max(1, Math.round(Number(rect?.height) || 1));

  const sharp = require("sharp");
  const svg = `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="black"/>
    <rect x="${x}" y="${y}" width="${rw}" height="${rh}" fill="white"/>
  </svg>`;
  const buf = await sharp(Buffer.from(svg)).png().toBuffer();
  return buf.toString("base64");
}

function listAiModules() {
  const routes = {
    generate_image: "/mia/graphics/ai/generate",
    edit_region: "/mia/graphics/ai/edit",
    remove_background: "/mia/graphics/ai/remove-background",
    upscale: "/mia/graphics/ai/upscale",
    restore: "/mia/graphics/ai/restore",
    recolor: "/mia/graphics/ai/recolor",
    true_alpha: "/mia/graphics/ai/true-alpha"
  };
  return AI_MODULE_IDS.map((id) => {
    const def = getCommand(id);
    return {
      id,
      api: def?.api,
      status: def?.status,
      phase: def?.phase,
      description: def?.description,
      route: routes[id]
    };
  });
}

module.exports = {
  AI_MODULE_IDS,
  AI_ROUTE_ALIASES,
  resolveModuleId,
  runAiModule,
  buildClientImportStep,
  buildRectMaskBase64,
  listAiModules
};
