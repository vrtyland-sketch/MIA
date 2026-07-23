"use strict";

/**
 * MIA Paint WebSocket hub — live sync + status broadcast (localhost only).
 * Path: /mia/paint/ws
 */

const { WebSocketServer } = require("ws");

const WS_PATH = "/mia/paint/ws";

let wss = null;
let bridgeRef = null;

function isLocalConnection(req) {
  const ip = String(req?.socket?.remoteAddress || "");
  return (
    ip === "127.0.0.1" ||
    ip === "::1" ||
    ip === "::ffff:127.0.0.1" ||
    ip.endsWith("127.0.0.1")
  );
}

function safeStatus() {
  if (!bridgeRef || typeof bridgeRef.getPublicStatus !== "function") {
    return { ok: false, error: "paint_unavailable" };
  }
  return bridgeRef.getPublicStatus();
}

function broadcastStatus() {
  if (!wss) return;
  const payload = safeStatus();
  const msg = JSON.stringify({ type: "status", payload });
  for (const client of wss.clients) {
    if (client.readyState === 1) {
      try {
        client.send(msg);
      } catch (_err) {
        /* ignore */
      }
    }
  }
}

function sendJson(ws, obj) {
  if (!ws || ws.readyState !== 1) return;
  try {
    ws.send(JSON.stringify(obj));
  } catch (_err) {
    /* ignore */
  }
}

function handleMessage(ws, raw) {
  let msg;
  try {
    msg = JSON.parse(String(raw));
  } catch (_err) {
    return;
  }
  if (!msg || typeof msg !== "object") return;

  const type = String(msg.type || "");

  if (type === "connect" && typeof bridgeRef?.connectClient === "function") {
    const clientId = String(msg.clientId || "ws").trim() || "ws";
    bridgeRef.connectClient(clientId);
    ws.clientId = clientId;
    sendJson(ws, { type: "status", payload: safeStatus() });
    broadcastStatus();
    return;
  }

  if (type === "sync" && typeof bridgeRef?.updateFromClient === "function") {
    bridgeRef.updateFromClient(msg.payload && typeof msg.payload === "object" ? msg.payload : {});
    sendJson(ws, { type: "status", payload: safeStatus() });
    broadcastStatus();
    return;
  }

  if (type === "command" && typeof bridgeRef?.runCommand === "function") {
    const body = msg.payload && typeof msg.payload === "object" ? msg.payload : {};
    const result = bridgeRef.runCommand(body);
    sendJson(ws, { type: "command_result", payload: result, status: safeStatus() });
    broadcastStatus();
    return;
  }

  if (type === "ping") {
    sendJson(ws, { type: "pong", at: Date.now() });
  }
}

function attachPaintWebSocket(server, ctx = {}) {
  if (!server || typeof server.on !== "function") {
    return { ok: false, error: "invalid_server" };
  }
  if (wss) {
    return { ok: true, path: WS_PATH, alreadyAttached: true, broadcastStatus, getPaintWsStats };
  }

  bridgeRef = ctx.paintBridge || null;
  wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (req, socket, head) => {
    let pathname = "";
    try {
      pathname = new URL(req.url || "", "http://127.0.0.1").pathname;
    } catch (_err) {
      pathname = "";
    }
    if (pathname !== WS_PATH) return;

    if (!isLocalConnection(req)) {
      socket.write("HTTP/1.1 403 Forbidden\r\n\r\n");
      socket.destroy();
      return;
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit("connection", ws, req);
    });
  });

  wss.on("connection", (ws) => {
    ws.clientId = null;
    sendJson(ws, { type: "hello", path: WS_PATH });
    sendJson(ws, { type: "status", payload: safeStatus() });

    ws.on("message", (raw) => handleMessage(ws, raw));
  });

  return { ok: true, path: WS_PATH, broadcastStatus, getPaintWsStats };
}

function getPaintWsStats() {
  return {
    ok: true,
    path: WS_PATH,
    attached: !!wss,
    clients: wss ? wss.clients.size : 0
  };
}

module.exports = {
  WS_PATH,
  attachPaintWebSocket,
  broadcastStatus,
  getPaintWsStats
};
