#!/usr/bin/env node
"use strict";

const { applyObsHands } = require("./obs_apply_hands");

async function main() {
  try {
    const report = await applyObsHands({ awayOnly: true, restartReason: "obs_apply_away_scene_cli" });
    console.log(JSON.stringify(report, null, 2));
    process.exitCode = report.ok === false ? 1 : 0;
  } catch (err) {
    console.error(
      JSON.stringify(
        {
          ok: false,
          error: err.message,
          hint: "Spusť OBS + WebSocket (port 4455)"
        },
        null,
        2
      )
    );
    process.exitCode = 1;
  }
}

if (require.main === module) {
  main();
}
