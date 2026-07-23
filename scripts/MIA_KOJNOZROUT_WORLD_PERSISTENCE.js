"use strict";

const fs = require("fs");
const path = require("path");

const DEFAULT_STORE = path.resolve(__dirname, "..", "data", "kojnozout-world.json");

function loadWorldSeed(filePath = DEFAULT_STORE) {
  if (!fs.existsSync(filePath)) {
    return { backpack: null, duel: null };
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
    return {
      backpack: parsed?.backpack || null,
      duel: parsed?.duel || null
    };
  } catch (_err) {
    return { backpack: null, duel: null };
  }
}

function scheduleSaveWorld(worldState = {}, filePath = DEFAULT_STORE) {
  if (!worldState.__saveTimer) {
    worldState.__saveTimer = setTimeout(() => {
      worldState.__saveTimer = null;
      try {
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(
          filePath,
          JSON.stringify(
            {
              version: 1,
              updatedAt: Date.now(),
              backpack: worldState.backpack,
              duel: worldState.duel
            },
            null,
            2
          ),
          "utf8"
        );
      } catch (_err) {
      }
    }, 2500);
  }
}

module.exports = {
  DEFAULT_STORE,
  loadWorldSeed,
  scheduleSaveWorld
};
