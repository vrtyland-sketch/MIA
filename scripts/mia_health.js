"use strict";

const http = require("http");

function pingHealth(port = 3000, timeoutMs = 8000) {
  return new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:${port}/health`, { timeout: timeoutMs }, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        try {
          const data = body ? JSON.parse(body) : null;
          resolve({
            ok: res.statusCode === 200 && data?.ok === true,
            status: res.statusCode,
            data
          });
        } catch (_err) {
          resolve({ ok: res.statusCode === 200, status: res.statusCode, data: null });
        }
      });
    });
    req.on("error", (err) => resolve({ ok: false, reason: err.message }));
    req.on("timeout", () => {
      req.destroy();
      resolve({ ok: false, reason: "timeout" });
    });
  });
}

async function waitForHealth(port = 3000, options = {}) {
  const timeoutMs = Number(options.timeoutMs || 15000);
  const intervalMs = Number(options.intervalMs || 400);
  const started = Date.now();

  while (Date.now() - started < timeoutMs) {
    const probe = await pingHealth(port, Math.min(3000, timeoutMs));
    if (probe.ok) {
      return {
        ok: true,
        waitedMs: Date.now() - started,
        data: probe.data || null
      };
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  return {
    ok: false,
    waitedMs: Date.now() - started,
    reason: "health_timeout"
  };
}

module.exports = {
  pingHealth,
  waitForHealth
};
