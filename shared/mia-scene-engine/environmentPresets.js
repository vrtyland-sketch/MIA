"use strict";

const ENVIRONMENTS = Object.freeze([
  {
    id: "space_cockpit",
    label: "Galaktický kokpit",
    category: "space",
    motionHint: "cruise",
    parallaxSpeed: 0.35,
    backdrop: "#050814",
    windows: [
      { id: "left", x: 0.08, y: 0.18, w: 0.28, h: 0.42, layer: "nebula_slow" },
      { id: "center", x: 0.36, y: 0.12, w: 0.28, h: 0.48, layer: "starfield_fast" },
      { id: "right", x: 0.64, y: 0.2, w: 0.28, h: 0.4, layer: "planet_pass" }
    ],
    layers: ["starfield", "nebula", "planet_moon"],
    filterProfile: "space_glass_v1",
    tags: ["space", "ship", "drive", "truck-map"]
  },
  {
    id: "galactic_cruise",
    label: "Galaktická plavba",
    category: "space",
    motionHint: "warp",
    parallaxSpeed: 0.55,
    backdrop: "#030611",
    windows: [
      { id: "main", x: 0.12, y: 0.1, w: 0.76, h: 0.55, layer: "warp_streaks" }
    ],
    layers: ["starfield", "galaxy_band", "comet_trail"],
    filterProfile: "space_warp_v1",
    tags: ["space", "fast", "highway", "kamion"]
  },
  {
    id: "forest_path",
    label: "Lesní stezka",
    category: "nature",
    motionHint: "walk",
    parallaxSpeed: 0.18,
    backdrop: "#0a1a12",
    windows: [{ id: "panorama", x: 0, y: 0, w: 1, h: 0.72, layer: "forest_parallax" }],
    layers: ["trees_back", "mist", "fireflies"],
    filterProfile: "nature_soft_v1",
    tags: ["forest", "nature", "calm"]
  },
  {
    id: "arena_combat_neon",
    label: "Neon aréna",
    category: "combat",
    motionHint: "combat",
    parallaxSpeed: 0.12,
    backdrop: "#120018",
    windows: [{ id: "arena", x: 0, y: 0, w: 1, h: 1, layer: "arena_grid" }],
    layers: ["neon_grid", "smoke", "impact_sparks"],
    filterProfile: "combat_neon_v1",
    tags: ["combat", "battle", "arena"]
  },
  {
    id: "studio_neutral",
    label: "Neutrální studio",
    category: "studio",
    motionHint: "idle",
    parallaxSpeed: 0,
    backdrop: "#1a1a24",
    windows: [],
    layers: ["soft_gradient"],
    filterProfile: "matte_neutral_v1",
    tags: ["default", "studio"]
  }
]);

function listEnvironments() {
  return ENVIRONMENTS.map((row) => ({ ...row, windows: row.windows.map((w) => ({ ...w })) }));
}

function getEnvironment(id = "") {
  const key = String(id || "").toLowerCase();
  return ENVIRONMENTS.find((row) => row.id === key) || ENVIRONMENTS[0];
}

module.exports = {
  ENVIRONMENTS,
  listEnvironments,
  getEnvironment
};
