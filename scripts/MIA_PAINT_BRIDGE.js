"use strict";

const path = require("path");
const fs = require("fs");
const paintCore = require("../shared/mia-paint-core");
const paintIo = require("../shared/mia-paint-io");
const paintAiBridge = require("./MIA_PAINT_AI");
const paintAi = require("../shared/mia-paint-ai");

const AUTOSAVE_DIR = path.join(__dirname, "..", "data", "mia-paint", "autosave");
const PROJECTS_DIR = path.join(__dirname, "..", "data", "mia-paint", "projects");

let session = {
  connectedAt: null,
  clientId: null,
  document: null,
  viewport: null,
  activeTool: "move",
  theme: "dark",
  dirty: false,
  lastAutosaveAt: null,
  preview: { enabled: false, mode: "document", updatedAt: 0 },
  gpu: { backend: "none", webgpuAvailable: false, tileSize: 512, painted: 0, tiles: 0 }
};

function ensureAutosaveDir() {
  if (!fs.existsSync(AUTOSAVE_DIR)) {
    fs.mkdirSync(AUTOSAVE_DIR, { recursive: true });
  }
}

function ensureProjectsDir() {
  if (!fs.existsSync(PROJECTS_DIR)) {
    fs.mkdirSync(PROJECTS_DIR, { recursive: true });
  }
}

function resetSession() {
  session = {
    connectedAt: null,
    clientId: null,
    document: paintCore.createDocument({ name: "Nový projekt" }),
    viewport: paintCore.createViewport(),
    activeTool: "move",
    theme: "dark",
    dirty: false,
    lastAutosaveAt: null,
    preview: { enabled: false, mode: "document", updatedAt: 0 },
    gpu: { backend: "none", webgpuAvailable: false, tileSize: 512, painted: 0, tiles: 0 }
  };
  return session;
}

function getSession() {
  if (!session.document) resetSession();
  return session;
}

function connectClient(clientId) {
  const s = getSession();
  s.connectedAt = Date.now();
  s.clientId = clientId || `client_${Date.now()}`;
  return s;
}

function updateFromClient(payload = {}) {
  const s = getSession();
  if (payload.theme === "light" || payload.theme === "dark") s.theme = payload.theme;
  if (typeof payload.activeTool === "string") s.activeTool = payload.activeTool;
  if (payload.dirty != null) s.dirty = !!payload.dirty;
  if (payload.viewport && s.viewport) {
    s.viewport.setState(payload.viewport);
  }
  if (payload.gpu && typeof payload.gpu === "object") {
    s.gpu = {
      backend: payload.gpu.backend || s.gpu?.backend || "unknown",
      webgpuAvailable: !!payload.gpu.webgpuAvailable,
      tileSize: payload.gpu.tileSize || 512,
      painted: Number(payload.gpu.painted) || 0,
      tiles: Number(payload.gpu.tiles) || 0
    };
  }
  if (payload.documentName) {
    s.document.name = String(payload.documentName);
    paintCore.touchDocument(s.document);
  }
  return s;
}

function getPublicStatus() {
  const s = getSession();
  const doc = s.document;
  return {
    ok: true,
    connected: !!s.connectedAt,
    clientId: s.clientId,
    theme: s.theme,
    activeTool: s.activeTool,
    dirty: s.dirty,
    document: doc
      ? {
          id: doc.id,
          name: doc.name,
          width: doc.width,
          height: doc.height,
          layerCount: doc.layers.length,
          activeLayerId: doc.activeLayerId,
          layers: doc.layers.map((l) => ({
            id: l.id,
            name: l.name,
            visible: l.visible,
            locked: l.locked,
            opacity: l.opacity,
            kind: l.kind
          }))
        }
      : null,
    viewport: s.viewport ? s.viewport.state : null,
    preview: s.preview
      ? {
          enabled: !!s.preview.enabled,
          mode: s.preview.mode || "document",
          name: s.preview.name || "",
          assetUrl: s.preview.assetUrl || null,
          updatedAt: s.preview.updatedAt || 0
        }
      : { enabled: false },
    gpu: s.gpu || null,
    lastAutosaveAt: s.lastAutosaveAt,
    agentCommands: paintAi.AGENT_COMMANDS
  };
}

async function runCommandAsync(body = {}) {
  const action = String(body.action || "").toLowerCase();
  if (action === "import_image") return importImageBase64(body);
  if (action === "export_image") return exportImageFromBundle(body);
  if (action === "export_koj_factory") return paintAiBridge.exportKojFactory(body.bundle, body);
  if (action === "ai_generate") return paintAiBridge.runAiJob("generate", body);
  if (action === "ai_remove_bg") return paintAiBridge.runAiJob("remove-bg", body);
  if (action === "ai_inpaint") return paintAiBridge.runAiJob("inpaint", body);
  return runCommand(body);
}

function runCommand(body = {}) {
  const s = getSession();
  const action = String(body.action || "").toLowerCase();
  const doc = s.document;

  switch (action) {
    case "new_document":
      s.document = paintCore.createDocument({
        name: body.name || "Nový projekt",
        width: body.width,
        height: body.height
      });
      s.dirty = false;
      return { ok: true, action, documentId: s.document.id };

    case "add_layer": {
      const layer = paintCore.addLayer(doc, { name: body.name || "Vrstva" });
      s.dirty = true;
      return { ok: true, action, layerId: layer.id };
    }

    case "add_vector_layer": {
      const layer = paintCore.addVectorLayer(doc, { name: body.name || "Vektor" });
      s.dirty = true;
      return { ok: true, action, layerId: layer.id, kind: layer.kind };
    }

    case "export_svg": {
      const vectorLayers = doc.layers.filter((l) => l.kind === "vector");
      const svg = paintCore.exportDocumentToSvg(doc, vectorLayers);
      return { ok: true, action, svg, byteLength: Buffer.byteLength(svg, "utf8") };
    }

    case "set_active_layer":
      if (!paintCore.setActiveLayer(doc, body.layerId)) {
        return { ok: false, error: "layer_not_found" };
      }
      s.dirty = true;
      return { ok: true, action, activeLayerId: doc.activeLayerId };

    case "set_tool":
      s.activeTool = String(body.tool || "move");
      return { ok: true, action, activeTool: s.activeTool };

    case "set_document_name":
      doc.name = String(body.name || doc.name);
      paintCore.touchDocument(doc);
      s.dirty = true;
      return { ok: true, action, name: doc.name };

    case "set_canvas_size": {
      const w = Math.max(64, Math.min(8192, Number(body.width) || doc.width));
      const h = Math.max(64, Math.min(8192, Number(body.height) || doc.height));
      doc.width = w;
      doc.height = h;
      paintCore.touchDocument(doc);
      s.dirty = true;
      return { ok: true, action, width: w, height: h };
    }

    case "rename_layer": {
      const layer = doc.layers.find((l) => l.id === body.layerId);
      if (!layer) return { ok: false, error: "layer_not_found" };
      layer.name = String(body.name || layer.name);
      paintCore.touchDocument(doc);
      s.dirty = true;
      return { ok: true, action, layerId: layer.id, name: layer.name };
    }

    case "remove_layer": {
      if (!paintCore.removeLayer(doc, body.layerId)) {
        return { ok: false, error: "remove_layer_failed" };
      }
      s.dirty = true;
      return { ok: true, action, activeLayerId: doc.activeLayerId };
    }

    case "agent_snapshot":
      return paintAiBridge.getAgentSnapshot(s, paintCore);

    case "undo":
      return { ok: true, action, note: "undo delegated to client" };

    case "redo":
      return { ok: true, action, note: "redo delegated to client" };

    case "autosave":
      return autosave();

    case "save_project": {
      const bundle = body.bundle;
      if (!bundle?.document) return { ok: false, error: "invalid_bundle" };
      return saveProject(bundle);
    }

    case "load_project": {
      const id = String(body.documentId || body.id || "");
      if (!id) return { ok: false, error: "missing_document_id" };
      return loadProject(id);
    }

    case "list_projects":
      return { ok: true, action, projects: listProjects() };

    case "import_image": {
      if (!body.dataBase64) return { ok: false, error: "missing_image_data" };
      return importImageBase64(body);
    }

    case "export_image": {
      const bundle = body.bundle;
      if (!bundle?.document || !bundle?.tiles) return { ok: false, error: "invalid_bundle" };
      return exportImageFromBundle(body);
    }

    case "motion_add_layer_keyframe": {
      const layerId = body.layerId || doc.activeLayerId;
      const result = paintCore.addLayerKeyframe(doc.timeline, layerId, body);
      s.dirty = true;
      return { ok: !!result.ok, action, ...result };
    }

    case "motion_add_camera_keyframe": {
      const result = paintCore.addCameraKeyframe(doc.timeline, body);
      s.dirty = true;
      return { ok: !!result.ok, action, ...result };
    }

    case "motion_create_bones_rig": {
      const layerId = body.layerId || doc.activeLayerId;
      const result = paintCore.createBonesRig(doc.timeline, { ...body, layerId });
      s.dirty = true;
      return { ok: !!result.ok, action, rig: result.rig };
    }

    case "motion_add_bone_keyframe": {
      const result = paintCore.addBoneKeyframe(
        doc.timeline,
        body.rigId,
        body.boneId || "root",
        body.timeMs,
        body.angle
      );
      s.dirty = true;
      return { ok: !!result.ok, action, ...result };
    }

    case "motion_ai_generate": {
      const aiMotion = require("../shared/mia-graphics-studio/aiMotionCommands");
      const layerId = body.layerId || doc.activeLayerId;
      const result = aiMotion.generateAiMotionKeyframes(doc.timeline, layerId, body);
      s.dirty = true;
      return { ok: !!result.ok, action, ...result };
    }

    case "motion_lip_sync": {
      const aiMotion = require("../shared/mia-graphics-studio/aiMotionCommands");
      const layerId = body.layerId || doc.activeLayerId;
      const result = body.text
        ? aiMotion.generateAiMotionFromSpeech(doc.timeline, layerId, body.text, body)
        : paintCore.addVisemeKeyframe(doc.timeline, { layerId, ...body });
      s.dirty = true;
      return { ok: !!result.ok, action, ...result };
    }

    case "motion_ik_solve": {
      const rigId = body.rigId || doc.timeline?.motion?.rigs?.[0]?.id;
      const result = paintCore.applyIkToRig(
        doc.timeline,
        rigId,
        body.targetX ?? body.x ?? 48,
        body.targetY ?? body.y ?? -32,
        body.timeMs
      );
      s.dirty = true;
      return { ok: !!result.ok, action, ...result };
    }

    case "motion_bone_chain": {
      const rigId = body.rigId || doc.timeline?.motion?.rigs?.[0]?.id;
      const rig = doc.timeline?.motion?.rigs?.find((r) => r.id === rigId);
      if (!rig) return { ok: false, error: "rig_not_found", action };
      const timeMs = body.timeMs ?? doc.timeline?.motion?.playheadMs ?? 0;
      return {
        ok: true,
        action,
        chain: paintCore.computeBoneChainForRig(rig, timeMs)
      };
    }

    case "motion_set_playhead": {
      const result = paintCore.setPlayhead(doc.timeline, body.timeMs);
      return {
        ok: !!result.ok,
        action,
        playheadMs: result.playheadMs,
        sample: paintCore.sampleMotion(doc.timeline, result.playheadMs)
      };
    }

    case "motion_sample":
      return {
        ok: true,
        action,
        sample: paintCore.sampleMotion(doc.timeline, body.timeMs ?? doc.timeline?.motion?.playheadMs ?? 0)
      };

    case "create_particles": {
      const result = paintCore.createParticleEmitter(doc, body);
      s.dirty = true;
      return { ok: !!result.ok, action, emitter: result.emitter, count: result.count };
    }

    case "publish_preview": {
      s.preview = {
        enabled: body.enabled !== false,
        mode: body.mode || "document",
        name: body.name || doc.name,
        width: Number(body.width) || doc.width,
        height: Number(body.height) || doc.height,
        pngBase64: body.dataBase64 || body.pngBase64 || null,
        assetUrl: body.assetUrl || null,
        kojPath: body.kojPath || null,
        updatedAt: Date.now()
      };
      return { ok: true, action, preview: { enabled: s.preview.enabled, updatedAt: s.preview.updatedAt } };
    }

    case "clear_preview":
      s.preview = { enabled: false, mode: "document", updatedAt: Date.now() };
      return { ok: true, action };

    case "get_preview":
      return { ok: true, action, preview: s.preview || { enabled: false } };

    default:
      return { ok: false, error: "unknown_action", action };
  }
}

function autosave() {
  const s = getSession();
  ensureAutosaveDir();
  const file = path.join(AUTOSAVE_DIR, `${s.document.id}.miapaint`);
  const bundle = paintIo.packBundle(s.document, {});
  fs.writeFileSync(file, paintIo.encodeMiapaintFile(bundle));
  const metaFile = path.join(AUTOSAVE_DIR, `${s.document.id}.json`);
  const payload = {
    savedAt: new Date().toISOString(),
    session: getPublicStatus(),
    document: s.document,
    miapaintPath: file
  };
  fs.writeFileSync(metaFile, JSON.stringify(payload, null, 2), "utf8");
  s.lastAutosaveAt = payload.savedAt;
  s.dirty = false;
  return { ok: true, path: file, metaPath: metaFile, savedAt: s.lastAutosaveAt };
}

function saveProject(bundle) {
  ensureProjectsDir();
  const id = bundle.document?.id || getSession().document.id;
  const file = path.join(PROJECTS_DIR, `${id}.miapaint`);
  fs.writeFileSync(file, paintIo.encodeMiapaintFile(bundle));
  const s = getSession();
  s.document = paintIo.manifestToDocument(bundle, paintCore);
  s.dirty = false;
  s.lastAutosaveAt = new Date().toISOString();
  return { ok: true, path: file, documentId: id, savedAt: s.lastAutosaveAt };
}

function loadProject(documentId) {
  ensureProjectsDir();
  const file = path.join(PROJECTS_DIR, `${documentId}.miapaint`);
  if (!fs.existsSync(file)) return { ok: false, error: "project_not_found" };
  const bundle = paintIo.decodeMiapaintFile(fs.readFileSync(file));
  const s = getSession();
  s.document = paintIo.manifestToDocument(bundle, paintCore);
  s.dirty = false;
  return { ok: true, bundle, documentId, path: file };
}

function listProjects() {
  ensureProjectsDir();
  return fs
    .readdirSync(PROJECTS_DIR)
    .filter((f) => f.endsWith(".miapaint"))
    .map((f) => {
      const full = path.join(PROJECTS_DIR, f);
      const stat = fs.statSync(full);
      return { id: f.replace(/\.miapaint$/, ""), path: full, size: stat.size, mtime: stat.mtime.toISOString() };
    });
}

async function importImageBase64(body) {
  const buffer = Buffer.from(String(body.dataBase64), "base64");
  const ext = String(body.ext || body.format || "").toLowerCase();
  let rgba;
  if (ext === "psd") {
    const psd = await paintIo.importPsdFlat(buffer);
    if (!psd.ok) return { ok: false, error: "psd_import_failed" };
    rgba = psd.rgba;
  } else {
    rgba = await paintIo.decodeImageBuffer(buffer);
  }
  const layer = paintCore.addLayer(getSession().document, {
    name: body.layerName || "Import"
  });
  getSession().dirty = true;
  return {
    ok: true,
    layerId: layer.id,
    width: rgba.width,
    height: rgba.height,
    pngBase64: paintIo.rgbaToBase64Png(rgba),
    note: ext === "psd" ? "psd_flat_composite" : "image_import"
  };
}

async function exportImageFromBundle(body) {
  const format = String(body.format || "png").toLowerCase();
  const doc = paintIo.manifestToDocument(body.bundle, paintCore);
  const buffer = await paintIo.exportDocumentImage(
    doc,
    body.bundle.tiles || {},
    format,
    body.quality
  );
  return {
    ok: true,
    format,
    dataBase64: buffer.toString("base64"),
    byteLength: buffer.length
  };
}

function exportSvg() {
  const s = getSession();
  const doc = s.document;
  if (!doc) return { ok: false, error: "no_document" };
  const vectorLayers = doc.layers.filter((l) => l.kind === "vector");
  const svg = paintCore.exportDocumentToSvg(doc, vectorLayers);
  return { ok: true, svg, byteLength: Buffer.byteLength(svg, "utf8") };
}

resetSession();

module.exports = {
  getSession,
  resetSession,
  connectClient,
  updateFromClient,
  getPublicStatus,
  runCommand,
  runCommandAsync,
  autosave,
  exportSvg,
  saveProject,
  loadProject,
  listProjects,
  importImageBase64,
  exportImageFromBundle,
  AUTOSAVE_DIR,
  PROJECTS_DIR,
  paintAiBridge
};
