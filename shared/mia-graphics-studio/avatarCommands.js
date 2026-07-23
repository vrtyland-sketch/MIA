"use strict";

const fs = require("fs");
const path = require("path");
const paintAi = require("../mia-paint-ai");
const { getTemplate } = require("./exportTemplates");
const { runAiModule } = require("./aiModules");

const AVATAR_PRESETS = {
  mia: {
    id: "mia",
    label: "MIA mascot",
    prompt:
      "MIA holographic stream mascot avatar, cyan turquoise glow, translucent AI projection, friendly, clean silhouette, centered",
    template: "koj_sprite"
  },
  koj: {
    id: "koj",
    label: "Koj styl",
    prompt: "cute capybara stream pet avatar, kawaii, transparent friendly pose, centered",
    template: "koj_sprite"
  },
  stream: {
    id: "stream",
    label: "Stream overlay",
    prompt: "streamer avatar portrait, bold colors, game stream overlay character, centered",
    template: "koj_sprite"
  }
};

function getAvatarPreset(id) {
  const key = String(id || "mia").toLowerCase();
  return AVATAR_PRESETS[key] || AVATAR_PRESETS.mia;
}

function listAvatarPresets() {
  return Object.values(AVATAR_PRESETS);
}

async function saveAvatarToKojFactory(pngBase64, name) {
  const dir = paintAi.ensureKojFactoryDir();
  const safe = paintAi.safeExportName(name);
  const file = path.join(dir, `${safe}.png`);
  fs.writeFileSync(file, Buffer.from(String(pngBase64), "base64"));
  paintAi.logPaintAi({ kind: "create_avatar", path: file, name: safe });
  return {
    ok: true,
    path: file,
    fileName: `${safe}.png`,
    relativePath: `mia-output-overlay/assets/kojnozrout/custom/${safe}.png`,
    assetUrl: `/assets/kojnozrout/custom/${safe}.png`
  };
}

function kojAssetUrl(relativePath) {
  const rel = String(relativePath || "");
  const idx = rel.indexOf("/assets/");
  return idx >= 0 ? rel.slice(idx) : rel;
}

function setBridgePreview(bridge, preview) {
  if (!bridge?.getSession) return null;
  const session = bridge.getSession();
  session.preview = {
    enabled: preview.enabled !== false,
    mode: preview.mode || "avatar",
    name: preview.name || "avatar",
    width: Number(preview.width) || 512,
    height: Number(preview.height) || 512,
    pngBase64: preview.pngBase64 || null,
    kojPath: preview.kojPath || null,
    assetUrl: preview.assetUrl || (preview.kojPath ? kojAssetUrl(preview.kojPath) : null),
    updatedAt: Date.now()
  };
  return session.preview;
}

function getPreviewStateFromBridge(bridge) {
  const session = bridge?.getSession?.();
  const p = session?.preview;
  if (!p) {
    return { ok: true, enabled: false, mode: "document", updatedAt: 0 };
  }
  const out = {
    ok: true,
    enabled: !!p.enabled,
    mode: p.mode || "document",
    name: p.name || "",
    width: p.width || 512,
    height: p.height || 512,
    updatedAt: p.updatedAt || 0,
    documentId: session?.document?.id || null
  };
  if (p.assetUrl) out.imageUrl = p.assetUrl;
  else if (p.kojPath) out.imageUrl = kojAssetUrl(p.kojPath);
  else if (p.pngBase64) out.pngBase64 = p.pngBase64;
  return out;
}

function avatarClientSteps(steps = []) {
  return steps.filter(Boolean);
}

async function runCreateAvatar(args = {}, ctx = {}) {
  const bridge = ctx.bridge || {};
  const preset = getAvatarPreset(args.preset || args.style);
  const tpl = getTemplate(args.template || preset.template || "koj_sprite");
  const prompt = String(args.prompt || preset.prompt || "MIA avatar");
  const name = args.name || args.avatarName || preset.id || "avatar";
  const width = tpl?.width || 512;
  const height = tpl?.height || 512;

  if (typeof bridge.runCommand === "function") {
    bridge.runCommand({ action: "set_canvas_size", width, height });
    bridge.runCommand({ action: "set_document_name", name });
  }

  const clientSteps = [];
  let pngBase64 = args.dataBase64 || args.pngBase64 || null;

  if (!pngBase64) {
    const gen = await runAiModule(
      "generate_image",
      { prompt, width, height },
      ctx
    );
    if (!gen.ok) {
      return { ok: false, api: "MIA.createAvatar", error: gen.error || "generate_failed", hint: gen.hint };
    }
    pngBase64 = gen.pngBase64;
    if (gen.clientStep) clientSteps.push(gen.clientStep);
  }

  if (args.removeBackground !== false) {
    const rmbg = await runAiModule("remove_background", { dataBase64: pngBase64 }, ctx);
    if (!rmbg.ok) {
      return { ok: false, api: "MIA.createAvatar", error: rmbg.error || "remove_bg_failed" };
    }
    pngBase64 = rmbg.pngBase64;
    if (rmbg.clientStep) clientSteps.push(rmbg.clientStep);
  }

  if (args.palette || args.recolor) {
    const recolor = await runAiModule(
      "recolor",
      { dataBase64: pngBase64, palette: args.palette || args.recolor },
      ctx
    );
    if (recolor.ok) {
      pngBase64 = recolor.pngBase64;
      if (recolor.clientStep) clientSteps.push(recolor.clientStep);
    }
  }

  let kojExport = null;
  if (args.exportToKoj !== false && pngBase64) {
    kojExport = await saveAvatarToKojFactory(pngBase64, name);
  }

  const preview = setBridgePreview(bridge, {
    enabled: args.preview !== false,
    mode: "avatar",
    name,
    width,
    height,
    pngBase64: kojExport ? null : pngBase64,
    kojPath: kojExport?.relativePath || null,
    assetUrl: kojExport?.assetUrl || null
  });

  const bodyPublishBridge = require("./bodyPublishBridge");
  const bodyState = bodyPublishBridge.syncBodyStateFromAvatar({
    mood: preset.id === "koj" ? "gift" : "happy",
    parts: args.bodyParts,
    syncBody: args.syncBody
  });

  clientSteps.push({
    command: "preview_sync",
    args: {
      enabled: true,
      mode: "avatar",
      name,
      pngBase64: kojExport ? null : pngBase64,
      assetUrl: kojExport?.assetUrl || null,
      kojPath: kojExport?.relativePath || null,
      width,
      height
    }
  });

  if (kojExport) {
    clientSteps.push({
      command: "avatar_export_notice",
      args: {
        name,
        assetUrl: kojExport.assetUrl,
        kojPath: kojExport.relativePath
      }
    });
  }

  return {
    ok: true,
    api: "MIA.createAvatar",
    module: "create_avatar",
    preset: preset.id,
    prompt,
    name,
    width,
    height,
    kojPath: kojExport?.relativePath || null,
    assetUrl: kojExport?.assetUrl || null,
    byteLength: pngBase64 ? Buffer.byteLength(pngBase64, "base64") : null,
    preview,
    bodyState,
    previewUrl: "/mia-graphics-preview.html",
    obs: {
      inputName: "MIA_GRAPHICS_PREVIEW",
      browserUrl: "/mia-graphics-preview.html",
      catalog: "/mia/graphics/obs"
    },
    clientSteps: avatarClientSteps(clientSteps)
  };
}

function listAvatarModules() {
  return [
    {
      id: "create",
      api: "MIA.createAvatar",
      route: "/mia/graphics/avatar/create",
      presets: listAvatarPresets()
    }
  ];
}

function getObsHook(port = 3000) {
  const base = `http://127.0.0.1:${port}`;
  const bodyPartsCatalog = require("./bodyPartsCatalog");
  const bodyParts = bodyPartsCatalog.getObsBodyLayers(base);
  return {
    ok: true,
    product: "MIA Graphics Studio",
    phase: "12u",
    inputName: "MIA_GRAPHICS_PREVIEW",
    browserUrl: `${base}/mia-graphics-preview.html`,
    previewStateUrl: `${base}/mia/graphics/preview/state`,
    editorUrl: `${base}/mia-paint/`,
    bodyParts,
    bodyStateUrl: `${base}/mia/graphics/body/state`,
    graphicsSyncUrls: bodyPartsCatalog.buildBodyPartUrls(base, { syncGraphics: true }),
    hybridSyncUrls: bodyPartsCatalog.buildBodyPartUrls(base, { syncHybrid: true }),
    note:
      "Browser Source 512×512 preview + volitelné MIA body vrstvy (MIA_HEAD, MIA_EYES, MIA_HANDS, MIA_FEET, MIA_TORSO). Live stream syncuje /overlay-state → /mia/graphics/body/state. Pro OBS použij graphicsSyncUrls nebo hybridSyncUrls. npm run obs:apply-hands"
  };
}

module.exports = {
  AVATAR_PRESETS,
  getAvatarPreset,
  listAvatarPresets,
  runCreateAvatar,
  saveAvatarToKojFactory,
  getPreviewStateFromBridge,
  setBridgePreview,
  listAvatarModules,
  getObsHook
};
