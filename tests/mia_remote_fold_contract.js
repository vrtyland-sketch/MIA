"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const remoteHtml = fs.readFileSync(
  path.join(ROOT, "mia-output-overlay", "mia-remote.html"),
  "utf8"
);
const indexJs = fs.readFileSync(path.join(ROOT, "index.js"), "utf8");

function pass(label) {
  console.log(`✅ ${label}`);
}

function run() {
  assert.match(remoteHtml, /Co MIA právě ukazuje/, "monitor section");
  assert.match(remoteHtml, /Chat \(čtení \+ simulace\)/, "chat section");
  assert.match(remoteHtml, /Video tier \(test\)/, "video tier grid");
  assert.match(remoteHtml, /Kojnožrout — péče & itemy/, "koj items section");
  assert.match(remoteHtml, /Duel & platform aréna/, "duel arena section");
  assert.match(remoteHtml, /Náhled overlayů/, "preview section");
  assert.match(remoteHtml, /\/mia\/remote\/snapshot/, "snapshot polling");
  assert.match(remoteHtml, /fold_ts|fold_https|fold_lan/, "mobile data failover urls");
  assert.match(remoteHtml, /data-chat="item use boost"/, "item use chat shortcut");
  assert.match(remoteHtml, /Programovat \(Cursor\)/, "cursor dev section");
  assert.match(remoteHtml, /id="progText"/, "cursor task textarea");
  assert.match(remoteHtml, /id="sendCursor"/, "send cursor button");
  assert.match(remoteHtml, /\/mia\/remote\/dev\/command/, "cursor command api");
  assert.match(remoteHtml, /\/mia\/remote\/dev\/status/, "cursor status api");
  assert.match(remoteHtml, /createSpeechHub/, "web speech hub");
  assert.match(remoteHtml, /id="micChat"/, "chat mic");
  assert.match(remoteHtml, /id="micProg"/, "cursor mic");
  assert.match(remoteHtml, /id="micSayMia"/, "say mia mic");
  assert.match(remoteHtml, /createSpeechHub/, "web speech hub");
  pass("mia-remote.html has fold monitor + koj/arena + cursor/speech");

  const fxJs = fs.readFileSync(path.join(ROOT, "mia-output-overlay", "assets", "mia-2d-fx.js"), "utf8");
  assert.match(fxJs, /MIA_2D_FX/, "unified 2d fx engine");
  pass("mia-2d-fx engine present");

  assert.match(indexJs, /app\.get\("\/mia\/remote\/snapshot"/, "snapshot route");
  pass("index.js exposes /mia/remote/snapshot");

  const arenaBattle = require("../scripts/MIA_ARENA_BATTLE");
  const move = arenaBattle.resolveMoveFromItem({ id: "box", role: "duel", label: "Box" });
  assert.equal(move.projectile, "box");
  pass("arena battle projectile aligned with item effect");

  console.log("\n---- MIA REMOTE FOLD CONTRACT ----");
  console.log("passed");
}

run();
