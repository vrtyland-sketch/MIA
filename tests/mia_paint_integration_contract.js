"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const http = require("http");
const remoteDev = require("../scripts/MIA_REMOTE_DEV");
const paintWs = require("../scripts/MIA_PAINT_WS");
const paintBridge = require("../scripts/MIA_PAINT_BRIDGE");

const ROOT = path.resolve(__dirname, "..");

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (err) {
    console.error(`fail - ${name}`);
    throw err;
  }
}

test("WS module exports attach + broadcast", () => {
  assert.equal(paintWs.WS_PATH, "/mia/paint/ws");
  assert.equal(typeof paintWs.attachPaintWebSocket, "function");
  assert.equal(typeof paintWs.broadcastStatus, "function");
  assert.equal(typeof paintWs.getPaintWsStats, "function");
});

test("index.js wires paint WS hub via server bootstrap", () => {
  const indexSrc = fs.readFileSync(path.join(ROOT, "index.js"), "utf8");
  const bootstrapSrc = fs.readFileSync(
    path.join(ROOT, "scripts", "MIA_SERVER_BOOTSTRAP.js"),
    "utf8"
  );
  assert.match(indexSrc, /MIA_PAINT_WS/);
  assert.match(indexSrc, /miaPaintWs/);
  assert.match(bootstrapSrc, /attachPaintWebSocket/);
  assert.match(bootstrapSrc, /paintBridge: miaPaintBridge/);
});

test("routes expose ws status + broadcast hook", () => {
  const routesSrc = fs.readFileSync(path.join(ROOT, "routes", "mia_paint.js"), "utf8");
  assert.match(routesSrc, /\/mia\/paint\/ws\/status/);
  assert.match(routesSrc, /notifyPaintWs/);
  assert.match(routesSrc, /paintWs/);
});

test("remote dev classifies paint commands", () => {
  assert.equal(remoteDev.classifyCommand("Otestuj paint").kind, "run_tests");
  assert.equal(remoteDev.classifyCommand("Otestuj paint").script, "test:mia-paint");
  assert.equal(remoteDev.classifyCommand("Jaký je stav paint?").kind, "status");
  assert.equal(remoteDev.classifyCommand("Otevři paint editor").kind, "cursor_task");
});

test("preflight fast suite lists mia_paint_integration", () => {
  const preflight = fs.readFileSync(path.join(ROOT, "scripts", "run_preflight_tests.js"), "utf8");
  assert.match(preflight, /mia_paint_integration/);
});

test("browser app uses WebSocket sync fallback", () => {
  const appSrc = fs.readFileSync(
    path.join(ROOT, "mia-output-overlay", "mia-paint", "app.js"),
    "utf8"
  );
  assert.match(appSrc, /connectPaintWs/);
  assert.match(appSrc, /\/mia\/paint\/ws/);
  assert.match(appSrc, /sendPaintWs/);
});

test("WS hub accepts local upgrade and sync", async () => {
  const server = http.createServer((_req, res) => {
    res.writeHead(404);
    res.end();
  });

  paintWs.attachPaintWebSocket(server, { paintBridge });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;

  const { WebSocket } = require("ws");
  const ws = new WebSocket(`ws://127.0.0.1:${port}/mia/paint/ws`);

  await new Promise((resolve, reject) => {
    ws.on("open", resolve);
    ws.on("error", reject);
  });

  let gotStatus = false;
  ws.on("message", (raw) => {
    const msg = JSON.parse(String(raw));
    if (msg.type === "status" && msg.payload?.ok) gotStatus = true;
  });

  ws.send(JSON.stringify({ type: "connect", clientId: "contract-test" }));
  ws.send(
    JSON.stringify({
      type: "sync",
      payload: { theme: "dark", activeTool: "move", dirty: false, documentName: "WS test" }
    })
  );

  await new Promise((r) => setTimeout(r, 80));
  assert.equal(gotStatus, true);
  assert.equal(paintBridge.getPublicStatus().clientId, "contract-test");

  ws.close();
  await new Promise((resolve) => server.close(resolve));
});

console.log("mia_paint_integration_contract: all passed");
