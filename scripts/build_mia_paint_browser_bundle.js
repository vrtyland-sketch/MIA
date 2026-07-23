"use strict";

/**
 * Sestaví browser bundle z shared/mia-paint-core (CJS → jeden IIFE).
 * npm run build:mia-paint
 */

const fs = require("fs");
const path = require("path");

const CORE_DIR = path.join(__dirname, "..", "shared", "mia-paint-core");
const SHARED_DIR = path.join(__dirname, "..", "shared");
const OUT = path.join(__dirname, "..", "mia-output-overlay", "mia-paint", "lib", "mia-paint-core.js");
const PRIMITIVES_OUT = path.join(__dirname, "..", "mia-output-overlay", "mia-paint", "lib", "mia-svg-primitives.js");

const EXTRA = [
  { file: path.join(SHARED_DIR, "mia-svg-primitives.js"), name: "./../mia-svg-primitives" }
];

const ORDER = [
  "constants.js",
  "EventBus.js",
  "Layer.js",
  "Document.js",
  "HistoryStack.js",
  "Viewport.js",
  "pressureCurve.js",
  "Selection.js",
  "VectorShape.js",
  "svgExport.js",
  "svgRender.js",
  "Animation.js",
  "timelineClock.js",
  "boneRig.js",
  "LipSync.js",
  "cameraPresets.js",
  "Motion.js",
  "FxParticles.js",
  "particlePresets.js",
  "spriteSheetExport.js",
  "PluginHost.js",
  "commands/PaintStrokeCommand.js",
  "commands/TileSnapshotCommand.js",
  "selectionOps.js",
  "index.js"
];

function stripModuleExports(src, exportNames) {
  let out = src.replace(/^"use strict";\s*/m, "");
  out = out.replace(/module\.exports\s*=\s*\{([^}]+)\};?\s*$/m, "");
  out = out.replace(/module\.exports\s*=\s*(\w+);?\s*$/m, "");
  return { out: out.trim(), exports: exportNames };
}

function bundleModule(parts, name, filePath) {
  let src = fs.readFileSync(filePath, "utf8");
  src = src.replace(/^"use strict";\s*/m, "");

  const exportMatch = src.match(/module\.exports\s*=\s*(\{[\s\S]*?\});?\s*$/m);
  let exportExpr = "{}";
  if (exportMatch) {
    exportExpr = exportMatch[1];
    src = src.replace(/module\.exports\s*=\s*\{[\s\S]*?\};?\s*$/m, "");
  } else {
    const single = src.match(/module\.exports\s*=\s*(\w+);?\s*$/m);
    if (single) {
      exportExpr = `{ default: ${single[1]}, ...(${single[1]} && typeof ${single[1]} === "object" ? ${single[1]} : {}) }`;
      src = src.replace(/module\.exports\s*=\s*\w+;?\s*$/m, "");
    }
  }

  src = src.replace(/require\("\.\/([^"]+)"\)/g, (_, mod) => `__require("./${mod}")`);
  src = src.replace(/require\("\.\.\/mia-svg-primitives"\)/g, `__require("./../mia-svg-primitives")`);
  src = src.replace(/if \(typeof globalThis !== "undefined"\)[\s\S]*?globalThis\.MIA_SVG_PRIMITIVES = api;\s*\}/m, "");

  parts.push(`  __modules["${name}"] = { exports: (function () {\n${src}\n    return ${exportExpr};\n  })() };\n`);
}

function build() {
  const parts = [`(function (global) {\n"use strict";\n`];

  parts.push(`  const __modules = {};\n`);
  parts.push(`  function __require(name) {\n`);
  parts.push(`    if (__modules[name]) return __modules[name].exports;\n`);
  parts.push(`    throw new Error("missing module: " + name);\n`);
  parts.push(`  }\n`);

  for (const extra of EXTRA) {
    bundleModule(parts, extra.name, extra.file);
  }

  for (const file of ORDER) {
    bundleModule(parts, "./" + file.replace(/\.js$/, ""), path.join(CORE_DIR, file));
  }

  parts.push(`  global.MIA_PAINT_CORE = __require("./index");\n`);
  parts.push(`})(typeof globalThis !== "undefined" ? globalThis : window);\n`);

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, parts.join(""), "utf8");
  console.log("Wrote", OUT);

  const primSrc = fs.readFileSync(path.join(SHARED_DIR, "mia-svg-primitives.js"), "utf8");
  const primOut = `(function (global) {\n"use strict";\n${primSrc.replace(/^"use strict";\s*/m, "").replace(/if \(typeof module[\s\S]*$/m, "")}\n  global.MIA_SVG_PRIMITIVES = { SVG_NS, escXml, clamp, lerp, lerpRgb, rgb, createSvgElement, drawShapeOnCanvas };\n})(typeof globalThis !== "undefined" ? globalThis : window);\n`;
  fs.writeFileSync(PRIMITIVES_OUT, primOut, "utf8");
  console.log("Wrote", PRIMITIVES_OUT);
  const overlayPrim = path.join(__dirname, "..", "mia-output-overlay", "mia-svg-primitives.js");
  fs.writeFileSync(overlayPrim, primOut, "utf8");
  console.log("Wrote", overlayPrim);
}

build();
