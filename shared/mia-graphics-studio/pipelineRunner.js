"use strict";

const { getCommand } = require("./commandCatalog");
const { getTemplate } = require("./exportTemplates");
const { runAiModule, buildClientImportStep } = require("./aiModules");
const { runFxOnDocument } = require("./fxCommands");
const { runExportModule } = require("./exportCommands");
const { runCreateAvatar } = require("./avatarCommands");
const { runMotionOnDocument } = require("./motionCommands");
const { generateAnimation } = require("./aiAnimationCommands");

/**
 * Spustí sekvenci MIA Graphics příkazů.
 * Server-side kroky jdou přes bridge/AI; hybrid vrací clientSteps pro editor.
 */

function normalizeStep(raw) {
  if (!raw) return null;
  if (typeof raw === "string") return { command: raw, args: {} };
  const command = raw.command || raw.id || raw.api || "";
  return { command: String(command), args: raw.args && typeof raw.args === "object" ? raw.args : {} };
}

function resolveCommandKey(step) {
  const key = String(step.command || "");
  let def = getCommand(key);
  if (def) return def;

  const aliases = {
    generateImage: "generate_image",
    generateAnimation: "generate_animation",
    promoteAnimation: "promote_animation",
    trueAlpha: "true_alpha",
    removeBackground: "remove_background",
    editRegion: "edit_region",
    exportImage: "export_image",
    exportSvg: "export_svg",
    exportVideo: "export_video",
    exportGif: "export_gif",
    exportKojFactory: "export_koj_factory",
    createFromTemplate: "create_from_template",
    animateLayer: "animate_layer",
    createParticles: "create_particles",
    createAvatar: "create_avatar",
    lipSync: "lip_sync",
    motion: "motion",
    animate: "animate",
    newDocument: "new_document",
    setCanvasSize: "set_canvas_size",
    upscale: "upscale",
    restore: "restore",
    recolor: "recolor",
    bonesRig: "bones_rig",
    cameraKeyframe: "camera_keyframe"
  };
  if (aliases[key]) return getCommand(aliases[key]);

  if (key.startsWith("MIA.")) return getCommand(key);

  const snake = key.replace(/([A-Z])/g, "_$1").toLowerCase().replace(/^_/, "");
  return getCommand(snake);
}

async function runPipeline(steps = [], ctx = {}) {
  const bridge = ctx.bridge || {};
  const aiBridge = ctx.aiBridge || {};
  const paintAi = ctx.paintAi || {};
  const normalized = steps.map(normalizeStep).filter(Boolean);
  const executed = [];
  const pending = [];
  const clientSteps = [];
  let lastImageBase64 = null;

  for (const step of normalized) {
    const def = resolveCommandKey(step);
    if (!def) {
      pending.push({
        command: step.command,
        ok: false,
        error: "unknown_command"
      });
      continue;
    }

    if (def.status === "planned") {
      pending.push({
        command: def.api,
        id: def.id,
        ok: false,
        error: "not_implemented",
        phase: def.phase,
        description: def.description
      });
      continue;
    }

    try {
      if (def.id === "create_from_template") {
        const tpl = getTemplate(step.args.template || step.args.platform);
        if (!tpl) {
          executed.push({ command: def.api, ok: false, error: "unknown_template" });
          continue;
        }
        if (typeof bridge.runCommand === "function") {
          bridge.runCommand({
            action: "set_canvas_size",
            width: tpl.width,
            height: tpl.height
          });
          if (step.args.name) {
            bridge.runCommand({ action: "set_document_name", name: step.args.name });
          }
        }
        executed.push({
          command: def.api,
          ok: true,
          template: tpl.id,
          width: tpl.width,
          height: tpl.height
        });
        continue;
      }

      if (def.aiKind) {
        const aiResult = await runAiModule(def.id, step.args, {
          bridge,
          aiBridge,
          paintAi,
          lastImageBase64
        });
        if (!aiResult.ok) {
          executed.push({
            command: def.api,
            ok: false,
            error: aiResult.error,
            hint: aiResult.hint
          });
          continue;
        }
        lastImageBase64 = aiResult.pngBase64;
        if (aiResult.clientStep) clientSteps.push(aiResult.clientStep);
        executed.push({
          command: def.api,
          ok: true,
          module: def.id,
          provider: aiResult.provider,
          width: aiResult.width,
          height: aiResult.height,
          byteLength: aiResult.byteLength,
          note: aiResult.note
        });
        continue;
      }

      if (def.id === "create_particles") {
        const doc = typeof bridge.getSession === "function" ? bridge.getSession()?.document : null;
        const fxResult = doc
          ? runFxOnDocument(doc, "create_particles", step.args)
          : { ok: false, error: "no_document" };
        if (fxResult.clientStep) clientSteps.push(fxResult.clientStep);
        executed.push({
          command: def.api,
          ok: !!fxResult.ok,
          module: def.id,
          emitter: fxResult.emitter,
          preset: fxResult.preset?.id,
          error: fxResult.error
        });
        continue;
      }

      if (def.id === "pose" || def.id === "motion" || def.id === "animate" || def.id === "lip_sync") {
        const doc = typeof bridge.getSession === "function" ? bridge.getSession()?.document : null;
        const motionResult = doc
          ? await runMotionOnDocument(doc, def.id, step.args)
          : { ok: false, error: "no_document" };
        if (motionResult.clientStep) clientSteps.push(motionResult.clientStep);
        executed.push({
          command: def.api,
          ok: !!motionResult.ok,
          module: def.id,
          pose: motionResult.pose,
          keyframeCount: motionResult.keyframeCount,
          visemeCount: motionResult.visemeCount,
          provider: motionResult.provider,
          bodyState: motionResult.bodyState || null,
          error: motionResult.error
        });
        continue;
      }

      if (def.exportKind === "gif" || def.exportKind === "video" || def.id === "export_gif" || def.id === "export_video") {
        const exportResult = await runExportModule(def.id, step.args, ctx);
        if (exportResult.clientStep) clientSteps.push(exportResult.clientStep);
        executed.push({
          command: def.api,
          ok: !!exportResult.ok,
          module: def.id,
          format: exportResult.format,
          byteLength: exportResult.byteLength,
          provider: exportResult.provider,
          partial: exportResult.partial,
          error: exportResult.error,
          hint: exportResult.hint
        });
        if (exportResult.dataBase64) {
          lastImageBase64 = exportResult.dataBase64;
        }
        continue;
      }

      if (def.id === "create_avatar") {
        const avatarResult = await runCreateAvatar(step.args, ctx);
        if (avatarResult.clientSteps?.length) {
          clientSteps.push(...avatarResult.clientSteps);
        }
        executed.push({
          command: def.api,
          ok: !!avatarResult.ok,
          module: def.id,
          kojPath: avatarResult.kojPath,
          assetUrl: avatarResult.assetUrl,
          previewUrl: avatarResult.previewUrl,
          error: avatarResult.error,
          hint: avatarResult.hint
        });
        continue;
      }

      if (def.id === "generate_animation") {
        const animResult = await generateAnimation(step.args, ctx);
        if (animResult.clientStep) clientSteps.push(animResult.clientStep);
        if (animResult.previewFrameBase64) lastImageBase64 = animResult.previewFrameBase64;
        executed.push({
          command: def.api,
          ok: !!animResult.ok,
          module: def.id,
          clipId: animResult.clipId,
          frameCount: animResult.frameCount,
          avgAlphaRatio: animResult.avgAlphaRatio,
          provider: animResult.provider,
          outDir: animResult.outDir,
          error: animResult.error
        });
        continue;
      }

      if (def.id === "promote_animation") {
        const { promoteAnimationCommand } = require("./aiAnimationCommands");
        const promoteResult = await promoteAnimationCommand(step.args);
        executed.push({
          command: def.api,
          ok: !!promoteResult.ok,
          module: def.id,
          clipId: promoteResult.clipId,
          quality: promoteResult.quality,
          liveSheetEligible: promoteResult.liveSheetEligible,
          error: promoteResult.error
        });
        continue;
      }

      if (def.bridgeAction && typeof bridge.runCommand === "function") {
        const payload = { action: def.bridgeAction, ...step.args };
        const result = bridge.runCommand(payload);
        executed.push({
          command: def.api,
          ok: !!result.ok,
          action: def.bridgeAction,
          result
        });
        continue;
      }

      if (def.status === "partial") {
        pending.push({
          command: def.api,
          ok: false,
          error: "partial_requires_client_bundle",
          phase: def.phase
        });
        continue;
      }

      pending.push({ command: def.api, ok: false, error: "no_executor", phase: def.phase });
    } catch (err) {
      executed.push({
        command: def.api,
        ok: false,
        error: String(err?.message || err)
      });
    }
  }

  const ok = executed.some((e) => e.ok);
  const partial = pending.length > 0;
  return {
    ok,
    partial,
    executed,
    pending,
    clientSteps,
    lastImageBase64: lastImageBase64 ? `[${lastImageBase64.length} b64 chars]` : null
  };
}

/**
 * Jednoduchý intent → pipeline (bez LLM — klíčová slova).
 * Plný NL parser = budoucí MIA chat brain.
 */
function resolveIntentToPipeline(text = "") {
  const lower = String(text)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "");

  const steps = [];
  const promptMatch = lower.match(/(?:vytvor|vygeneruj|generate)\s+(.+?)(?:,|$)/);
  const prompt = promptMatch ? promptMatch[1].trim() : "MIA stream asset";

  if (/tiktok|shorts|9:16|vertikal/.test(lower)) {
    steps.push({ command: "create_from_template", args: { template: "tiktok" } });
  } else if (/twitch|16:9|stream overlay/.test(lower)) {
    steps.push({ command: "create_from_template", args: { template: "twitch" } });
  }

  if (/avatar|vytvor.*postav|mascot/.test(lower) && !/keyframe|bones/.test(lower)) {
    steps.push({
      command: "createAvatar",
      args: { preset: /koj/.test(lower) ? "koj" : "mia", prompt }
    });
  }

  if (/cyberpunk|obrazek|obrázek|mia|postav/.test(lower) || promptMatch) {
    steps.push({ command: "generateImage", args: { prompt } });
  }

  if (/odstran.*pozad|remove.*background|bez pozadi/.test(lower)) {
    steps.push({ command: "removeBackground" });
  }

  if (/upscale|zvys.*rozlis|2x|4x|zvětš/.test(lower)) {
    steps.push({ command: "upscale", args: { scale: /4x/.test(lower) ? 4 : 2 } });
  }

  if (/obnov|restore|rozmaz|stara foto|oprav foto/.test(lower)) {
    steps.push({ command: "restore" });
  }

  if (/prebarv|recolor|paleta|cyberpunk|vintage|neon/.test(lower)) {
    let palette = "cyberpunk";
    if (/vintage/.test(lower)) palette = "vintage";
    else if (/neon/.test(lower)) palette = "neon";
    else if (/warm|tepla/.test(lower)) palette = "warm";
    else if (/cold|studena/.test(lower)) palette = "cold";
    steps.push({ command: "recolor", args: { palette } });
  }

  if (/uprav.*vyber|edit.*region|inpaint|oprav.*vybran/.test(lower)) {
    steps.push({ command: "editRegion", args: { note: "requires_mask_from_client" } });
  }

  if (/animac|animation|sprite.?sheet|true.?alpha.*anim|2d anim/.test(lower)) {
    let motion = "idle";
    if (/wave|mava|máva/.test(lower)) motion = "wave";
    else if (/bounce|skok/.test(lower)) motion = "bounce";
    else if (/nod|kyv/.test(lower)) motion = "nod";
    else if (/speak|mluv/.test(lower)) motion = "speak";
    steps.push({
      command: "generateAnimation",
      args: {
        prompt,
        motion,
        frameCount: /12|dvanact/.test(lower) ? 12 : 8,
        trueAlpha: true
      }
    });
  }

  if (/animuj|keyframe|posun.*vrstv/.test(lower) && !/animac|animation|sprite.?sheet/.test(lower)) {
    steps.push({ command: "animateLayer", args: { x: 24, timeMs: 0 } });
    steps.push({ command: "animateLayer", args: { x: 120, timeMs: 1000 } });
  }

  if (/kamera|zoom.*pan|camera/.test(lower)) {
    steps.push({ command: "cameraKeyframe", args: { zoom: 1, timeMs: 0 } });
    steps.push({ command: "cameraKeyframe", args: { zoom: 1.2, panX: 40, timeMs: 1000 } });
  }

  if (/bones|kost|rig/.test(lower)) {
    steps.push({ command: "bonesRig", args: {} });
  }

  if (/poza|pose|zamavej|zamávej|mava|máva/.test(lower)) {
    let pose = "wave";
    if (/gift|darek|dárek/.test(lower)) pose = "gift";
    else if (/duel|souboj/.test(lower)) pose = "duel";
    else if (/think|premysl|přemýšl/.test(lower)) pose = "think";
    else if (/combo/.test(lower)) pose = "combo";
    else if (/happy|radost/.test(lower)) pose = "happy";
    steps.push({ command: "pose", args: { pose } });
  }

  if (/mrk|oci|vlas|motion|pohyb|bounce|pulse|shake/.test(lower)) {
    steps.push({ command: "motion", args: { style: /shake/.test(lower) ? "shake" : /pulse/.test(lower) ? "pulse" : "bounce" } });
  }

  if (/lip|viseme|usta|ústa|mluv/.test(lower)) {
    steps.push({ command: "lip_sync", args: { text: promptMatch ? promptMatch[1].trim() : "ahoj mia", viseme: "A" } });
  }

  if (/castice|particles|modre|modré|kour|ohen|dest/.test(lower)) {
    steps.push({ command: "createParticles", args: { preset: "sparkle_blue" } });
  }

  if (/webm|mp4|video|exportuj.*video/.test(lower)) {
    steps.push({
      command: "exportVideo",
      args: { format: /mp4/.test(lower) ? "mp4" : "webm" }
    });
  } else if (/gif/.test(lower)) {
    steps.push({ command: "exportGif" });
  } else if (/koj|factory/.test(lower)) {
    steps.push({ command: "exportKojFactory" });
  }

  if (steps.length === 0) {
    return { ok: false, error: "intent_unrecognized", hint: "Použij explicitní steps[] nebo /mia/graphics/catalog" };
  }

  return { ok: true, intent: text.trim(), steps };
}

module.exports = {
  normalizeStep,
  runPipeline,
  resolveIntentToPipeline
};
