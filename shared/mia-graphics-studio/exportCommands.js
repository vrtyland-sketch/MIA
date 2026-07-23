"use strict";

const { encodeGifFromPngBuffers, encodeVideoFromPngBuffers } = require("./animationEncoder");

function exportClientStep(format, args = {}) {
  return {
    command: "export_collect_frames",
    args: {
      format: format || "gif",
      fps: args.fps || (format === "gif" ? 12 : 30),
      ...args
    }
  };
}

async function runExportModule(commandId, args = {}) {
  const id = String(commandId || "").toLowerCase();
  const frames = args.frames || args.framesBase64;
  const format =
    id === "export_gif" ? "gif" : String(args.format || (id === "export_video" ? "webm" : "gif")).toLowerCase();
  const fps = Number(args.fps) || (format === "gif" ? 12 : 30);

  if (!frames || !frames.length) {
    return {
      ok: true,
      partial: true,
      api: id === "export_gif" ? "MIA.exportGif" : "MIA.exportVideo",
      module: id,
      clientStep: exportClientStep(format, { fps, width: args.width, height: args.height }),
      note: "requires_client_frames"
    };
  }

  let encoded;
  if (format === "gif") {
    encoded = await encodeGifFromPngBuffers(frames, { fps, loop: args.loop });
  } else if (format === "webm" || format === "mp4") {
    encoded = encodeVideoFromPngBuffers(frames, { format, fps });
  } else {
    return { ok: false, error: "unsupported_format", format };
  }

  if (!encoded.ok) return { ...encoded, api: id === "export_gif" ? "MIA.exportGif" : "MIA.exportVideo" };

  return {
    ok: true,
    api: id === "export_gif" ? "MIA.exportGif" : "MIA.exportVideo",
    module: id,
    format: encoded.format,
    frameCount: encoded.frameCount,
    fps: encoded.fps,
    byteLength: encoded.byteLength,
    provider: encoded.provider,
    dataBase64: encoded.buffer.toString("base64"),
    mime:
      encoded.format === "gif"
        ? "image/gif"
        : encoded.format === "mp4"
          ? "video/mp4"
          : "video/webm"
  };
}

function listExportModules() {
  return [
    { id: "gif", api: "MIA.exportGif", route: "/mia/graphics/export/gif", format: "gif" },
    { id: "webm", api: "MIA.exportVideo", route: "/mia/graphics/export/webm", format: "webm" },
    { id: "mp4", api: "MIA.exportVideo", route: "/mia/graphics/export/mp4", format: "mp4" }
  ];
}

module.exports = {
  runExportModule,
  listExportModules,
  exportClientStep
};
