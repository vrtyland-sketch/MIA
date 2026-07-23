"use strict";

/**
 * MIA Graphics Studio — katalog agentních příkazů (MIA.* API).
 * Každý příkaz má stav: implemented | partial | planned
 * execution: server | client | hybrid
 */

const { listTemplates, EXPORT_FORMATS } = require("./exportTemplates");

/** @type {import('./commandCatalog').GraphicsCommand[]} */
const GRAPHICS_COMMANDS = [
  // --- Document / structure (implemented) ---
  {
    id: "new_document",
    api: "MIA.newDocument",
    category: "document",
    phase: "12a",
    status: "implemented",
    execution: "server",
    bridgeAction: "new_document",
    description: "Nový dokument"
  },
  {
    id: "set_canvas_size",
    api: "MIA.setCanvasSize",
    category: "document",
    phase: "12a",
    status: "implemented",
    execution: "server",
    bridgeAction: "set_canvas_size"
  },
  {
    id: "set_document_name",
    api: "MIA.setDocumentName",
    category: "document",
    phase: "12a",
    status: "implemented",
    execution: "server",
    bridgeAction: "set_document_name"
  },
  {
    id: "create_from_template",
    api: "MIA.createFromTemplate",
    category: "document",
    phase: "12a",
    status: "implemented",
    execution: "server",
    description: "Plátno podle šablony (tiktok, youtube_shorts, twitch, …)"
  },
  {
    id: "add_layer",
    api: "MIA.addLayer",
    category: "layers",
    phase: "12a",
    status: "implemented",
    execution: "server",
    bridgeAction: "add_layer"
  },
  {
    id: "rename_layer",
    api: "MIA.renameLayer",
    category: "layers",
    phase: "12a",
    status: "implemented",
    execution: "server",
    bridgeAction: "rename_layer"
  },
  {
    id: "remove_layer",
    api: "MIA.removeLayer",
    category: "layers",
    phase: "12a",
    status: "implemented",
    execution: "server",
    bridgeAction: "remove_layer"
  },

  // --- AI (partial / planned modules) ---
  {
    id: "generate_image",
    api: "MIA.generateImage",
    category: "ai_generate",
    phase: "12b",
    status: "implemented",
    execution: "hybrid",
    aiKind: "generate",
    description: "AI Generate — obrázek z textu"
  },
  {
    id: "generate_animation",
    api: "MIA.generateAnimation",
    category: "ai_animate",
    phase: "12v",
    status: "implemented",
    execution: "hybrid",
    description: "AI 2D animace — N PNG framů s true alpha (#FF00FF matte) → sprite sheet / WEBM"
  },
  {
    id: "promote_animation",
    api: "MIA.promoteAnimation",
    category: "ai_animate",
    phase: "12w",
    status: "implemented",
    execution: "server",
    description: "Promote AI staging clip → Animation Bank (quality ai/procedural; production jen s confirm)"
  },
  {
    id: "preview_bank_clip",
    api: "MIA.previewBankClip",
    category: "ai_animate",
    phase: "12x",
    status: "implemented",
    execution: "server",
    description: "Studio preview Animation Bank clip (sheets i pro ai; ne live gift path)"
  },
  {
    id: "bind_gift_keys",
    api: "MIA.bindGiftKeys",
    category: "ai_animate",
    phase: "12y",
    status: "implemented",
    execution: "server",
    description: "Bind giftKeys + optional known-gift override (confirmOverride; production only live)"
  },
  {
    id: "production_gate",
    api: "MIA.productionGate",
    category: "ai_animate",
    phase: "12z",
    status: "implemented",
    execution: "server",
    description: "Production readiness gate — blokuje procedural/low-alpha bez force confirm"
  },
  {
    id: "visual_identity",
    api: "MIA.visualIdentity",
    category: "ai_generate",
    phase: "13a",
    status: "implemented",
    execution: "server",
    description: "MIA holo identity lock — cyan #00DCFF paleta + prompt suffix pro AI/procedural"
  },
  {
    id: "unified_studio_preview",
    api: "MIA.unifiedStudioPreview",
    category: "ai_animate",
    phase: "13b",
    status: "implemented",
    execution: "hybrid",
    description: "Studio preview — Animation Bank sheet + MIA body mood (+ volitelné OBS)"
  },
  {
    id: "obs_body_revive",
    api: "MIA.obsBodyRevive",
    category: "obs_sync",
    phase: "13c",
    status: "implemented",
    execution: "server",
    description: "OBS body revive — portrait transform + refresh browser sources po výpadku MIA"
  },
  {
    id: "composed_body_layout",
    api: "MIA.composedBodyLayout",
    category: "obs_sync",
    phase: "13d",
    status: "implemented",
    execution: "hybrid",
    description: "Composed body layout — per-part OBS transform + chytrý preview (ne Frankensteina)"
  },
  {
    id: "hero_body_portrait",
    api: "MIA.heroBodyPortrait",
    category: "obs_sync",
    phase: "13e",
    status: "implemented",
    execution: "hybrid",
    description: "Hero body portrait — jedna MIA_HEAD nad bublinou; speech holo se ztlumí"
  },
  {
    id: "voice_revive",
    api: "MIA.voiceRevive",
    category: "obs_sync",
    phase: "13f",
    status: "implemented",
    execution: "server",
    description: "Voice revive — refresh MIA_VOICE + unmute/monitor + TTS test (MIA/Koj)"
  },
  {
    id: "voice_anti_echo",
    api: "MIA.voiceAntiEcho",
    category: "obs_sync",
    phase: "13g",
    status: "implemented",
    execution: "server",
    description: "Voice anti-echo — ztlum Desktop Audio při Monitor+Output (žádná ozvěna)"
  },
  {
    id: "hero_true_alpha",
    api: "MIA.heroTrueAlpha",
    category: "obs_sync",
    phase: "13h",
    status: "implemented",
    execution: "server",
    description: "Hero true-alpha polish — flood matte + soft fringe + padding v body parts build"
  },
  {
    id: "paint_ai_timeline_bridge",
    api: "MIA.paintAiTimelineBridge",
    category: "ai_animation",
    phase: "13i",
    status: "implemented",
    execution: "hybrid",
    description:
      "Paint AI anim ↔ timeline — generateAnimation → import frames → onion/play → Bank export"
  },
  {
    id: "dashboard_ai_generate",
    api: "MIA.dashboardAiGenerate",
    category: "ai_animation",
    phase: "13j",
    status: "implemented",
    execution: "hybrid",
    description:
      "Dashboard AI generate → staging → optional promote · Paint ?aiStaging= round-trip"
  },
  {
    id: "paint_staging_writeback",
    api: "MIA.paintStagingWriteback",
    category: "ai_animation",
    phase: "13k",
    status: "implemented",
    execution: "hybrid",
    description:
      "Paint polish → staging write-back (frames + sheet) · dashboard staging thumb · bez auto-promote"
  },
  {
    id: "staging_studio_preview",
    api: "MIA.stagingStudioPreview",
    category: "ai_animation",
    phase: "13l",
    status: "implemented",
    execution: "hybrid",
    description:
      "Staging studio preview — Koj sheet + body mood (+ OBS) před promote · nikdy live gift"
  },
  {
    id: "staging_video_encode",
    api: "MIA.stagingVideoEncode",
    category: "ai_animation",
    phase: "13m",
    status: "implemented",
    execution: "server",
    description:
      "Staging GIF/WEBM encode + download — video-generator UX bez cloud video AI"
  },
  {
    id: "true_alpha",
    api: "MIA.trueAlpha",
    category: "ai_alpha",
    phase: "12v",
    status: "implemented",
    execution: "server",
    aiKind: "true-alpha",
    description: "True alpha matte — edge flood-fill (magenta / neutral / dark)"
  },
  {
    id: "edit_region",
    api: "MIA.editRegion",
    category: "ai_edit",
    phase: "12b",
    status: "implemented",
    execution: "hybrid",
    aiKind: "inpaint",
    description: "AI Edit — úprava výběru (inpaint / neighbor fill)"
  },
  {
    id: "remove_background",
    api: "MIA.removeBackground",
    category: "ai_remove_bg",
    phase: "12b",
    status: "implemented",
    execution: "hybrid",
    aiKind: "remove-bg",
    description: "AI Remove Background (corner key); pro sprite použij MIA.trueAlpha"
  },
  {
    id: "upscale",
    api: "MIA.upscale",
    category: "ai_upscale",
    phase: "12c",
    status: "implemented",
    execution: "hybrid",
    aiKind: "upscale",
    description: "AI Upscale — vyšší rozlišení (Lanczos3 + sharpen)"
  },
  {
    id: "restore",
    api: "MIA.restore",
    category: "ai_restore",
    phase: "12c",
    status: "implemented",
    execution: "hybrid",
    aiKind: "restore",
    description: "AI Restore — denoise + sharpen + normalize"
  },
  {
    id: "recolor",
    api: "MIA.recolor",
    category: "ai_recolor",
    phase: "12c",
    status: "implemented",
    execution: "hybrid",
    aiKind: "recolor",
    description: "AI Recolor — paleta / hue shift"
  },
  {
    id: "pose",
    api: "MIA.pose",
    category: "ai_pose",
    phase: "12j",
    status: "implemented",
    execution: "hybrid",
    bridgeAction: "motion_pose_apply",
    description: "AI Pose — procedurální póza + auto-sync body state pro OBS"
  },
  {
    id: "animate",
    api: "MIA.animate",
    category: "ai_animate",
    phase: "15",
    status: "implemented",
    execution: "hybrid",
    bridgeAction: "motion_ai_generate",
    description: "AI Animate — procedurální keyframy (bounce/pulse/shake)"
  },
  {
    id: "lip_sync",
    api: "MIA.lipSync",
    category: "ai_lip_sync",
    phase: "15",
    status: "implemented",
    execution: "hybrid",
    bridgeAction: "motion_lip_sync",
    description: "Viseme track — ústa vs. text/hlas (foundation)"
  },
  {
    id: "motion",
    api: "MIA.motion",
    category: "ai_motion",
    phase: "15",
    status: "implemented",
    execution: "hybrid",
    bridgeAction: "motion_ai_generate",
    description: "AI Motion — procedurální keyframy vrstvy/kamery"
  },

  // --- Animation / video (planned) ---
  {
    id: "animate_layer",
    api: "MIA.animateLayer",
    category: "animation",
    phase: "12d",
    status: "implemented",
    execution: "hybrid",
    bridgeAction: "motion_add_layer_keyframe",
    description: "Keyframe animace vrstvy (posun, rotace, scale, opacity)"
  },
  {
    id: "bones_rig",
    api: "MIA.bonesRig",
    category: "animation",
    phase: "12d",
    status: "implemented",
    execution: "hybrid",
    bridgeAction: "motion_create_bones_rig",
    description: "2D kosterní animace (bones)"
  },
  {
    id: "camera_keyframe",
    api: "MIA.cameraKeyframe",
    category: "camera",
    phase: "12d",
    status: "implemented",
    execution: "hybrid",
    bridgeAction: "motion_add_camera_keyframe",
    description: "Kamera — zoom, pan, rotace v čase"
  },
  {
    id: "create_particles",
    api: "MIA.createParticles",
    category: "fx",
    phase: "12e",
    status: "implemented",
    execution: "hybrid",
    bridgeAction: "create_particles",
    description: "Částice — déšť, oheň, kouř (napojení na mia-2d-fx)"
  },
  {
    id: "export_video",
    api: "MIA.exportVideo",
    category: "export",
    phase: "12e",
    status: "implemented",
    execution: "hybrid",
    exportKind: "video",
    description: "Export WEBM / MP4 z timeline"
  },
  {
    id: "export_gif",
    api: "MIA.exportGif",
    category: "export",
    phase: "12e",
    status: "implemented",
    execution: "hybrid",
    exportKind: "gif",
    description: "Export animovaného GIF"
  },

  // --- Export / Koj (implemented) ---
  {
    id: "export_image",
    api: "MIA.exportImage",
    category: "export",
    phase: "12a",
    status: "implemented",
    execution: "hybrid",
    bridgeAction: "export_image",
    description: "PNG / JPG / WEBP — Paint exportRaster + bridge"
  },
  {
    id: "operator_production_checklist",
    api: "MIA.operatorProductionChecklist",
    category: "ai_animation",
    phase: "13n",
    status: "implemented",
    execution: "hybrid",
    description:
      "Operator polish — docs sync · True Alpha/MP4 UI · dashboard production checklist"
  },
  {
    id: "character_motion_identity",
    api: "MIA.characterMotionIdentity",
    category: "ai_motion",
    phase: "13o",
    status: "implemented",
    execution: "hybrid",
    description:
      "Character motion presets (hair/eyes/blink/breath/nod/sway) + body-parts --identity tint"
  },
  {
    id: "timeline_combo_maturity",
    api: "MIA.timelineComboMaturity",
    category: "timeline",
    phase: "13p",
    status: "implemented",
    execution: "hybrid",
    description:
      "Timeline onion/scrub snap/easing · dedicated head/combo.png · crop polish"
  },
  {
    id: "timeline_pro_ux",
    api: "MIA.timelineProUx",
    category: "timeline",
    phase: "13q",
    status: "implemented",
    execution: "hybrid",
    description:
      "Onion canvas ghosts + depth · easing inspector · bone IK drag · offline ease parity"
  },
  {
    id: "ai_video_quality",
    api: "MIA.aiVideoQuality",
    category: "ai_animation",
    phase: "13r",
    status: "implemented",
    execution: "hybrid",
    description:
      "Staging MP4 + inline playback · temporal consistency (seed/ref/blend)"
  },
  {
    id: "body_art_assemble",
    api: "MIA.bodyArtAssemble",
    category: "ai_animation",
    phase: "13s",
    status: "implemented",
    execution: "hybrid",
    description:
      "Body crop polish + combo master · multi-clip staging assemble (light NLE)"
  },
  {
    id: "assemble_v2",
    api: "MIA.assembleV2",
    category: "ai_animation",
    phase: "13t",
    status: "implemented",
    execution: "hybrid",
    description:
      "Assemble v2 — gap/hold between clips · optional audio mux · dashboard UX"
  },
  {
    id: "lip_audio_bone_deform",
    api: "MIA.lipAudioBoneDeform",
    category: "ai_motion",
    phase: "13u",
    status: "implemented",
    execution: "hybrid",
    description:
      "Lip sync from audio amplitude · bone tip deform (lite mesh substitute)"
  },
  {
    id: "whisper_lip_mesh_warp",
    api: "MIA.whisperLipMeshWarp",
    category: "ai_motion",
    phase: "13v",
    status: "implemented",
    execution: "hybrid",
    description:
      "Whisper STT → visemes (amplitude fallback) · soft bone skew mesh warp"
  },
  {
    id: "live_viseme_speech",
    api: "MIA.liveVisemeSpeech",
    category: "ai_motion",
    phase: "13w",
    status: "implemented",
    execution: "hybrid",
    description:
      "Live #miaHolo lip — voicePlayback lipTrack → speak/01–04 (not metronome)"
  },
  {
    id: "live_audio_lip",
    api: "MIA.liveAudioLip",
    category: "ai_motion",
    phase: "13x",
    status: "implemented",
    execution: "hybrid",
    description:
      "Live lip from TTS audio amplitude (server upgrade + client AudioContext fallback)"
  },
  {
    id: "body_speak_lip_parity",
    api: "MIA.bodySpeakLipParity",
    category: "ai_motion",
    phase: "13y",
    status: "implemented",
    execution: "hybrid",
    description:
      "MIA_EYES samples voicePlayback.lipTrack (same ladder as #miaHolo)"
  },
  {
    id: "visible_speak_faces",
    api: "MIA.visibleSpeakFaces",
    category: "ai_motion",
    phase: "13z",
    status: "implemented",
    execution: "hybrid",
    description:
      "Readable #miaHolo speak — face-crop speak-lip ladder + speak-face zoom + soft glitch"
  },
  {
    id: "live_presence",
    api: "MIA.livePresence",
    category: "ai_motion",
    phase: "14a",
    status: "implemented",
    execution: "hybrid",
    description:
      "One calm MIA — unified idle/speak face slot, hero hides ghost holo, no mood thrash on speech"
  },
  {
    id: "mood_brain",
    api: "MIA.moodBrain",
    category: "ai_motion",
    phase: "14b",
    status: "implemented",
    execution: "server",
    description:
      "Room mood from chat lexicon + intent → communityMood for MIA body, holo, and Koj display"
  },
  {
    id: "export_svg",
    api: "MIA.exportSvg",
    category: "export",
    phase: "12a",
    status: "implemented",
    execution: "server",
    bridgeAction: "export_svg"
  },
  {
    id: "export_koj_factory",
    api: "MIA.exportKojFactory",
    category: "export",
    phase: "12a",
    status: "implemented",
    execution: "hybrid",
    bridgeAction: "export_koj_factory"
  },
  {
    id: "create_avatar",
    api: "MIA.createAvatar",
    category: "avatar",
    phase: "12f",
    status: "implemented",
    execution: "hybrid",
    description: "Pipeline avataru pro stream / Koj (generate → remove BG → Koj custom + preview)"
  }
];

const COMMAND_BY_ID = new Map(GRAPHICS_COMMANDS.map((c) => [c.id, c]));
const COMMAND_BY_API = new Map(GRAPHICS_COMMANDS.map((c) => [c.api, c]));

function getCommand(idOrApi) {
  const key = String(idOrApi || "");
  return COMMAND_BY_ID.get(key) || COMMAND_BY_API.get(key) || null;
}

function listCommands(filter = {}) {
  let rows = [...GRAPHICS_COMMANDS];
  if (filter.status) rows = rows.filter((c) => c.status === filter.status);
  if (filter.category) rows = rows.filter((c) => c.category === filter.category);
  return rows;
}

function getCatalogSummary() {
  const byStatus = { implemented: 0, partial: 0, planned: 0 };
  for (const c of GRAPHICS_COMMANDS) {
    byStatus[c.status] = (byStatus[c.status] || 0) + 1;
  }
  return {
    product: "MIA Graphics Studio",
    codename: "mia-paint",
    phase: 12,
    commandCount: GRAPHICS_COMMANDS.length,
    byStatus,
    templates: listTemplates(),
    exportFormats: EXPORT_FORMATS,
    apis: GRAPHICS_COMMANDS.map((c) => ({
      api: c.api,
      status: c.status,
      phase: c.phase,
      category: c.category
    }))
  };
}

module.exports = {
  GRAPHICS_COMMANDS,
  getCommand,
  listCommands,
  getCatalogSummary
};
