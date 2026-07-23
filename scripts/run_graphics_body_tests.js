"use strict";

/**
 * Graphics Body + AI anim test runner — Phase 12g–12v.
 * Usage: npm run test:graphics-body
 */

const { spawnSync } = require("child_process");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");

const SUITES = [
  "mia_graphics_studio_12g_contract.js",
  "mia_graphics_studio_12h_contract.js",
  "mia_graphics_studio_12i_contract.js",
  "mia_graphics_studio_12j_contract.js",
  "mia_graphics_studio_12k_contract.js",
  "mia_graphics_studio_12l_contract.js",
  "mia_graphics_studio_12m_contract.js",
  "mia_graphics_studio_12n_contract.js",
  "mia_graphics_studio_12o_contract.js",
  "mia_graphics_studio_12p_contract.js",
  "mia_graphics_studio_12q_contract.js",
  "mia_graphics_studio_12r_contract.js",
  "mia_graphics_studio_12s_contract.js",
  "mia_graphics_studio_12t_contract.js",
  "mia_graphics_studio_12u_contract.js",
  "mia_graphics_studio_12v_contract.js",
  "mia_graphics_studio_13a_identity_contract.js",
  "mia_graphics_studio_13b_unified_preview_contract.js",
  "mia_graphics_studio_13c_obs_revive_contract.js",
  "mia_graphics_studio_13d_composed_layout_contract.js",
  "mia_graphics_studio_13e_hero_portrait_contract.js",
  "mia_voice_revive_13f_contract.js",
  "mia_graphics_studio_13h_hero_alpha_contract.js",
  "mia_graphics_studio_13i_paint_timeline_bridge_contract.js",
  "mia_graphics_studio_13j_dashboard_ai_generate_contract.js",
  "mia_graphics_studio_13k_staging_writeback_contract.js",
  "mia_graphics_studio_13l_staging_preview_contract.js",
  "mia_graphics_studio_13m_staging_video_encode_contract.js",
  "mia_graphics_studio_13n_operator_polish_contract.js",
  "mia_graphics_studio_13o_character_motion_identity_contract.js",
  "mia_graphics_studio_13p_timeline_combo_contract.js",
  "mia_graphics_studio_13q_timeline_pro_ux_contract.js",
  "mia_graphics_studio_13r_ai_video_quality_contract.js",
  "mia_graphics_studio_13s_body_art_assemble_contract.js",
  "mia_graphics_studio_13t_assemble_v2_contract.js",
  "mia_graphics_studio_13u_lip_audio_bone_contract.js",
  "mia_graphics_studio_13v_whisper_mesh_contract.js",
  "mia_graphics_studio_13w_live_viseme_contract.js",
  "mia_graphics_studio_13x_live_audio_lip_contract.js",
  "mia_graphics_studio_13y_body_speak_lip_contract.js",
  "mia_graphics_studio_13z_visible_speak_faces_contract.js",
  "mia_graphics_studio_14a_live_presence_contract.js",
  "mia_graphics_studio_14b_mood_brain_contract.js"
];

function runSuite(file) {
  const started = Date.now();
  const result = spawnSync(process.execPath, [path.join(ROOT, "tests", file)], {
    cwd: ROOT,
    encoding: "utf8",
    env: process.env
  });
  return {
    file,
    ok: result.status === 0,
    exitCode: result.status,
    ms: Date.now() - started,
    stderr: (result.stderr || "").trim()
  };
}

function main() {
  const results = SUITES.map(runSuite);
  const passed = results.filter((row) => row.ok).length;
  const failed = results.length - passed;

  const report = {
    ok: failed === 0,
    phase: "14b",
    suite: "graphics-body",
    passed,
    failed,
    total: results.length,
    results
  };

  console.log(JSON.stringify(report, null, 2));
  process.exitCode = failed ? 1 : 0;
}

if (require.main === module) {
  main();
}

module.exports = { SUITES, runSuite };
