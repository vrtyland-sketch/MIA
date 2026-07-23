"use strict";

const fs = require("fs");
const path = require("path");
const paintAi = require("../shared/mia-paint-ai");
const paintIo = require("../shared/mia-paint-io");

async function runAiJob(kind, body = {}) {
  paintAi.logPaintAi({ kind, prompt: body.prompt, documentId: body.documentId });

  if (kind === "generate") {
    const result = await paintAi.generateImage({
      prompt: body.prompt,
      width: body.width || 512,
      height: body.height || 512,
      trueAlpha: body.trueAlpha === true,
      applyMatte: body.applyMatte !== false,
      alphaMode: body.alphaMode,
      frameIndex: body.frameIndex,
      frameCount: body.frameCount,
      motion: body.motion,
      env: process.env
    });
    const pngBase64 = result.buffer.toString("base64");
    return {
      ok: true,
      kind,
      provider: result.provider,
      width: result.width,
      height: result.height,
      trueAlpha: result.trueAlpha,
      alpha: result.alpha,
      pngBase64,
      byteLength: result.buffer.length
    };
  }

  if (kind === "remove-bg") {
    if (!body.dataBase64) return { ok: false, error: "missing_image_data" };
    const input = Buffer.from(String(body.dataBase64), "base64");
    const out = await paintAi.removeBackgroundBuffer(input, { tolerance: body.tolerance });
    return {
      ok: true,
      kind,
      pngBase64: out.toString("base64"),
      byteLength: out.length
    };
  }

  if (kind === "inpaint") {
    if (!body.dataBase64 || !body.maskBase64) {
      return { ok: false, error: "missing_image_or_mask" };
    }
    const input = Buffer.from(String(body.dataBase64), "base64");
    const out = await paintAi.inpaintFillBuffer(input, body.maskBase64);
    return {
      ok: true,
      kind,
      pngBase64: out.toString("base64"),
      byteLength: out.length,
      note: "inpaint_neighbor_fill"
    };
  }

  if (kind === "upscale") {
    if (!body.dataBase64) return { ok: false, error: "missing_image_data" };
    const input = Buffer.from(String(body.dataBase64), "base64");
    const result = await paintAi.upscaleBuffer(input, body);
    return {
      ok: true,
      kind,
      provider: result.provider,
      width: result.width,
      height: result.height,
      scale: result.scale,
      pngBase64: result.buffer.toString("base64"),
      byteLength: result.buffer.length,
      note: "upscale_lanczos3"
    };
  }

  if (kind === "restore") {
    if (!body.dataBase64) return { ok: false, error: "missing_image_data" };
    const input = Buffer.from(String(body.dataBase64), "base64");
    const result = await paintAi.restoreBuffer(input, body);
    return {
      ok: true,
      kind,
      provider: result.provider,
      width: result.width,
      height: result.height,
      strength: result.strength,
      pngBase64: result.buffer.toString("base64"),
      byteLength: result.buffer.length,
      note: "restore_sharpen_denoise"
    };
  }

  if (kind === "recolor") {
    if (!body.dataBase64) return { ok: false, error: "missing_image_data" };
    const input = Buffer.from(String(body.dataBase64), "base64");
    const result = await paintAi.recolorBuffer(input, body);
    return {
      ok: true,
      kind,
      provider: result.provider,
      width: result.width,
      height: result.height,
      palette: result.palette,
      pngBase64: result.buffer.toString("base64"),
      byteLength: result.buffer.length,
      note: "recolor_modulate"
    };
  }

  if (kind === "true-alpha") {
    if (!body.dataBase64) return { ok: false, error: "missing_image_data" };
    const input = Buffer.from(String(body.dataBase64), "base64");
    const result = await paintAi.applyTrueAlphaBuffer(input, { mode: body.mode || "auto" });
    return {
      ok: true,
      kind,
      provider: result.provider,
      width: result.width,
      height: result.height,
      transparentPixels: result.transparentPixels,
      alphaRatio: result.alphaRatio,
      mode: result.mode,
      pngBase64: result.buffer.toString("base64"),
      byteLength: result.buffer.length,
      note: "true_alpha_edge_flood"
    };
  }

  return { ok: false, error: "unknown_ai_kind", kind };
}

async function exportKojFactory(bundle, opts = {}) {
  if (!bundle?.document || !bundle?.tiles) {
    return { ok: false, error: "invalid_bundle" };
  }
  const paintCore = require("../shared/mia-paint-core");
  const doc = paintIo.manifestToDocument(bundle, paintCore);
  const png = await paintIo.exportDocumentImage(doc, bundle.tiles || {}, "png");
  const dir = paintAi.ensureKojFactoryDir();
  const name = paintAi.safeExportName(opts.name || doc.name);
  const file = path.join(dir, `${name}.png`);
  fs.writeFileSync(file, png);
  paintAi.logPaintAi({ kind: "export_koj_factory", path: file, documentId: doc.id });
  return {
    ok: true,
    path: file,
    relativePath: `mia-output-overlay/assets/kojnozrout/custom/${name}.png`,
    byteLength: png.length
  };
}

function getAgentSnapshot(session, paintCore) {
  const doc = session?.document;
  if (!doc) return { ok: false, error: "no_document" };
  return {
    ok: true,
    commands: paintAi.AGENT_COMMANDS,
    session: {
      activeTool: session.activeTool,
      dirty: session.dirty,
      theme: session.theme,
      clientId: session.clientId
    },
    document: {
      id: doc.id,
      name: doc.name,
      width: doc.width,
      height: doc.height,
      activeLayerId: doc.activeLayerId,
      layers: doc.layers.map((l) => ({
        id: l.id,
        name: l.name,
        kind: l.kind,
        visible: l.visible,
        locked: l.locked,
        opacity: l.opacity
      })),
      timelineFrames: doc.timeline?.frames?.length || 0
    },
    viewport: session.viewport?.state || null
  };
}

module.exports = {
  runAiJob,
  exportKojFactory,
  getAgentSnapshot
};
