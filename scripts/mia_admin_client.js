"use strict";

const http = require("http");

function postJson(url, body = {}, timeoutMs = 15000) {
  return new Promise((resolve) => {
    const payload = JSON.stringify(body || {});
    const target = new URL(url);
    const req = http.request(
      {
        hostname: target.hostname,
        port: target.port,
        path: `${target.pathname}${target.search}`,
        method: "POST",
        timeout: timeoutMs,
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload)
        }
      },
      (res) => {
        let raw = "";
        res.on("data", (chunk) => (raw += chunk));
        res.on("end", () => {
          try {
            resolve({
              ok: res.statusCode >= 200 && res.statusCode < 300,
              status: res.statusCode,
              data: raw ? JSON.parse(raw) : null
            });
          } catch (_err) {
            resolve({ ok: false, status: res.statusCode, data: raw });
          }
        });
      }
    );
    req.on("error", (err) => resolve({ ok: false, error: err.message }));
    req.on("timeout", () => {
      req.destroy();
      resolve({ ok: false, error: "timeout" });
    });
    req.write(payload);
    req.end();
  });
}

function baseUrl(port = 3000) {
  return `http://127.0.0.1:${port}`;
}

async function requestObsHands(port = 3000, body = {}) {
  return postJson(`${baseUrl(port)}/system/obs-hands`, body);
}

async function requestRestart(port = 3000, reason = "admin_client") {
  return postJson(`${baseUrl(port)}/system/restart`, { reason });
}

module.exports = {
  postJson,
  requestObsHands,
  requestRestart
};
