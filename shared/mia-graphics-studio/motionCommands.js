"use strict";



const paintCore = require("../mia-paint-core");

const aiMotion = require("./aiMotionCommands");



function motionClientStep(command, args) {

  return { command, args: args && typeof args === "object" ? args : {} };

}



async function runMotionOnDocument(doc, commandId, args = {}) {

  if (!doc?.timeline) return { ok: false, error: "no_timeline" };



  const aliases = {

    "layer-keyframe": "motion_add_layer_keyframe",

    "camera-keyframe": "motion_add_camera_keyframe",

    "bones-rig": "motion_create_bones_rig",

    animate_layer: "motion_add_layer_keyframe",

    camera_keyframe: "motion_add_camera_keyframe",

    bones_rig: "motion_create_bones_rig",

    animatelayer: "motion_add_layer_keyframe",

    camerakeyframe: "motion_add_camera_keyframe",

    bonesrig: "motion_create_bones_rig",

    ai_motion: "motion_ai_generate",

    motion: "motion_ai_generate",

    animate: "motion_ai_generate",

    lip_sync: "motion_lip_sync",

    lipsync: "motion_lip_sync",

    pose: "motion_pose_apply",

    ik_solve: "motion_ik_solve",

    bone_chain: "motion_bone_chain"

  };

  const key = String(commandId || "").toLowerCase();

  const resolved = aliases[key] || key;

  const tl = doc.timeline;



  switch (resolved) {

    case "animate_layer":

    case "motion_add_layer_keyframe": {

      const layerId = args.layerId || doc.activeLayerId;

      const result = paintCore.addLayerKeyframe(tl, layerId, args);

      if (!result.ok) return result;

      return {

        ok: true,

        api: "MIA.animateLayer",

        module: "animate_layer",

        ...result,

        clientStep: motionClientStep("motion_add_layer_keyframe", { layerId, ...args })

      };

    }



    case "camera_keyframe":

    case "motion_add_camera_keyframe": {

      const result = paintCore.addCameraKeyframe(tl, args);

      if (!result.ok) return result;

      return {

        ok: true,

        api: "MIA.cameraKeyframe",

        module: "camera_keyframe",

        ...result,

        clientStep: motionClientStep("motion_add_camera_keyframe", { ...args })

      };

    }



    case "bones_rig":

    case "motion_create_bones_rig": {

      const layerId = args.layerId || doc.activeLayerId;

      const result = paintCore.createBonesRig(tl, { ...args, layerId });

      if (!result.ok) return result;

      return {

        ok: true,

        api: "MIA.bonesRig",

        module: "bones_rig",

        rig: result.rig,

        clientStep: motionClientStep("motion_create_bones_rig", { layerId, ...args })

      };

    }



    case "motion_add_bone_keyframe": {

      const result = paintCore.addBoneKeyframe(

        tl,

        args.rigId,

        args.boneId || "root",

        args.timeMs,

        args.angle

      );

      if (!result.ok) return result;

      return {

        ok: true,

        module: "motion_add_bone_keyframe",

        ...result,

        clientStep: motionClientStep("motion_add_bone_keyframe", { ...args })

      };

    }



    case "pose":

    case "motion_pose_apply": {

      const poseCommands = require("./poseCommands");
      const bodyPublishBridge = require("./bodyPublishBridge");

      const result = poseCommands.applyPoseToDocument(doc, args);

      if (!result.ok) return result;

      const bodyState = bodyPublishBridge.syncBodyStateFromMotionResult(result, args);

      return {

        ...result,

        bodyState,

        clientStep: motionClientStep("motion_pose_apply", {

          layerId: args.layerId || doc.activeLayerId,

          ...args

        })

      };

    }



    case "motion_ai_generate": {

      const layerId = args.layerId || doc.activeLayerId;

      const result = aiMotion.generateAiMotionKeyframes(tl, layerId, args);

      if (!result.ok) return result;

      return {

        ok: true,

        api: "MIA.motion",

        module: "ai_motion",

        ...result,

        clientStep: motionClientStep("motion_ai_generate", { layerId, ...args })

      };

    }



    case "motion_lip_sync": {

      const layerId = args.layerId || doc.activeLayerId;
      const bodyPublishBridge = require("./bodyPublishBridge");

      let result;
      let clientArgs = { layerId, ...args };

      if (args.audioBase64 || args.audioBuffer || args.audioPath) {
        let audioBuf = null;
        if (Buffer.isBuffer(args.audioBuffer)) audioBuf = args.audioBuffer;
        else if (args.audioBase64) audioBuf = Buffer.from(String(args.audioBase64), "base64");
        else if (args.audioPath) {
          const fs = require("fs");
          const path = require("path");
          const ROOT = path.resolve(__dirname, "..", "..");
          const p = path.isAbsolute(args.audioPath) ? args.audioPath : path.join(ROOT, args.audioPath);
          if (fs.existsSync(p)) audioBuf = fs.readFileSync(p);
        }
        const built = await paintCore.buildVisemeTrackFromAudioSmart(audioBuf, {
          startMs: Number(args.startMs) || tl.motion?.playheadMs || 0,
          stepMs: Number(args.stepMs) || 50,
          audioExt: args.audioExt,
          language: args.language || args.lang || "cs",
          useStt: args.useStt !== false,
          gateWithAmplitude: args.gateWithAmplitude !== false,
          env: args.env
        });
        if (!built.ok) return built;
        result = paintCore.applyVisemeTrack(tl, built.keyframes, layerId);
        if (!result.ok) return result;
        result = {
          ...result,
          ...built,
          visemeCount: built.keyframes.length,
          layerId,
          source: "audio",
          // Strip heavy/nested blobs from client echo
          amplitude: built.amplitude || undefined,
          transcript: built.transcript || undefined
        };
        // Do not echo large audio back to client — only keyframes
        clientArgs = {
          layerId,
          keyframes: built.keyframes,
          startMs: args.startMs,
          provider: built.provider,
          transcript: built.transcript
        };
      } else if (args.keyframes && Array.isArray(args.keyframes)) {
        result = paintCore.applyVisemeTrack(tl, args.keyframes, layerId);
        if (!result.ok) return result;
        result = { ...result, visemeCount: args.keyframes.length, layerId, source: "keyframes" };
        clientArgs = { layerId, keyframes: args.keyframes };
      } else if (args.text) {
        result = aiMotion.generateAiMotionFromSpeech(tl, layerId, args.text, args);
        clientArgs = { layerId, text: args.text, startMs: args.startMs, msPerChar: args.msPerChar };
      } else {
        result = paintCore.addVisemeKeyframe(tl, { layerId, ...args });
      }

      if (!result.ok) return result;

      const bodyState = bodyPublishBridge.syncBodyStateFromMotionResult(
        { ok: true, module: "lip_sync", ...result },
        args
      );

      return {

        ok: true,

        api: "MIA.lipSync",

        module: "lip_sync",

        phase:
          result.phase ||
          (result.source === "audio"
            ? result.provider === "whisper_viseme_v1"
              ? "13v"
              : "13u"
            : undefined),

        ...result,

        bodyState,

        clientStep: motionClientStep("motion_lip_sync", clientArgs)

      };

    }



    case "motion_ik_solve": {

      const rigId = args.rigId || tl.motion?.rigs?.[0]?.id;

      if (!rigId) return { ok: false, error: "no_rig" };

      const result = paintCore.applyIkToRig(

        tl,

        rigId,

        args.targetX ?? args.x ?? 48,

        args.targetY ?? args.y ?? -32,

        args.timeMs

      );

      if (!result.ok) return result;

      return {

        ok: true,

        api: "MIA.ikSolve",

        module: "ik_solve",

        ...result,

        clientStep: motionClientStep("motion_ik_solve", { rigId, ...args })

      };

    }



    case "motion_bone_chain": {

      const rigId = args.rigId || tl.motion?.rigs?.[0]?.id;

      const rig = tl.motion?.rigs?.find((r) => r.id === rigId);

      if (!rig) return { ok: false, error: "rig_not_found" };

      const timeMs = args.timeMs ?? tl.motion?.playheadMs ?? 0;

      const chain = paintCore.computeBoneChainForRig(rig, timeMs);

      return { ok: true, rigId, timeMs, chain };

    }



    case "motion_set_playhead": {

      const result = paintCore.setPlayhead(tl, args.timeMs);

      return {

        ok: result.ok,

        playheadMs: result.playheadMs,

        sample: paintCore.sampleMotion(tl, result.playheadMs),

        clientStep: motionClientStep("motion_set_playhead", { timeMs: result.playheadMs })

      };

    }



    case "motion_sample": {

      const timeMs = args.timeMs ?? tl.motion?.playheadMs ?? 0;

      return {

        ok: true,

        sample: paintCore.sampleMotion(tl, timeMs),

        playheadMs: timeMs

      };

    }



    default:

      return { ok: false, error: "unknown_motion_command", commandId };

  }

}



function listMotionModules() {

  return [

    {

      id: "layer-keyframe",

      api: "MIA.animateLayer",

      route: "/mia/graphics/motion/layer-keyframe",

      bridgeAction: "motion_add_layer_keyframe"

    },

    {

      id: "camera-keyframe",

      api: "MIA.cameraKeyframe",

      route: "/mia/graphics/motion/camera-keyframe",

      bridgeAction: "motion_add_camera_keyframe"

    },

    {

      id: "bones-rig",

      api: "MIA.bonesRig",

      route: "/mia/graphics/motion/bones-rig",

      bridgeAction: "motion_create_bones_rig"

    },

    {

      id: "pose",

      api: "MIA.pose",

      route: "/mia/graphics/motion/pose",

      bridgeAction: "motion_pose_apply"

    },

    {

      id: "ai-motion",

      api: "MIA.motion",

      route: "/mia/graphics/motion/ai-generate",

      bridgeAction: "motion_ai_generate"

    },

    {

      id: "lip-sync",

      api: "MIA.lipSync",

      route: "/mia/graphics/motion/lip-sync",

      bridgeAction: "motion_lip_sync"

    },

    {

      id: "ik-solve",

      api: "MIA.ikSolve",

      route: "/mia/graphics/motion/ik-solve",

      bridgeAction: "motion_ik_solve"

    },

    {

      id: "bone-chain",

      api: "MIA.boneChain",

      route: "/mia/graphics/motion/bone-chain",

      bridgeAction: "motion_bone_chain"

    },

    {

      id: "sample",

      api: "MIA.motionSample",

      route: "/mia/graphics/motion/sample",

      bridgeAction: "motion_sample"

    }

  ];

}



module.exports = {

  runMotionOnDocument,

  listMotionModules,

  motionClientStep

};

