"use strict";

/**
 * Ověří vzdálený přístup k MIA (Tailscale + LAN).
 *   npm run remote:check
 */

const fs = require("fs");
const path = require("path");
const os = require("os");
const { execSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const PORT = process.env.PORT || "3000";

function getLanIp() {
  for (const nets of Object.values(os.networkInterfaces())) {
    for (const net of nets || []) {
      if (net.family === "IPv4" && !net.internal && net.address.startsWith("192.168.")) {
        return net.address;
      }
    }
  }
  return null;
}

function getTailscaleIp() {
  const candidates = [
    "tailscale",
    "C:\\Program Files\\Tailscale\\tailscale.exe",
  ];
  for (const bin of candidates) {
    try {
      return execSync(`"${bin}" ip -4`, { encoding: "utf8", timeout: 5000 }).trim();
    } catch (_e) {
      /* try next */
    }
  }
  return null;
}

async function probe(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    return { url, ok: res.ok, status: res.status };
  } catch (err) {
    return { url, ok: false, error: err.message };
  }
}

async function run() {
  console.log("\n---- MIA remote connectivity ----\n");

  const lan = getLanIp();
  const ts = getTailscaleIp();
  const secret = (() => {
    const p = path.join(ROOT, ".env");
    if (!fs.existsSync(p)) return "";
    for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
      if (line.startsWith("MIA_INGEST_SECRET=")) return line.split("=").slice(1).join("=").trim();
    }
    return "";
  })();

  console.log("LAN IP (doma):     ", lan || "(nenalezeno)");
  console.log("Tailscale IP:      ", ts || "(Tailscale neběží — npm run remote:install-tailscale)");
  console.log("MIA port:          ", PORT);
  console.log("");

  const urls = [];
  if (lan) urls.push(`http://${lan}:${PORT}/health`);
  if (ts) urls.push(`http://${ts}:${PORT}/health`);
  urls.push(`http://127.0.0.1:${PORT}/health`);

  for (const u of urls) {
    const r = await probe(u);
    console.log(r.ok ? "✅" : "❌", u, r.ok ? "" : (r.error || r.status));
  }

  console.log("\n--- Odkazy pro Fold ---\n");
  if (lan) console.log("Doma (Wi-Fi):     ", `http://${lan}:${PORT}/mia-fold`);
  let serveDns = null;
  try {
    const tsExe = "C:\\Program Files\\Tailscale\\tailscale.exe";
    if (require("fs").existsSync(tsExe)) {
      const json = JSON.parse(execSync(`"${tsExe}" status --json`, { encoding: "utf8", timeout: 5000 }));
      serveDns = json?.Self?.DNSName?.replace(/\.$/, "") || null;
    }
  } catch (_e) {
    /* ignore */
  }
  if (serveDns) {
    console.log("Mobilni data:     ", `https://${serveDns}/mia-fold  <- HTTPS (npm run remote:serve)`);
  }
  if (ts) {
    console.log("Mobilni data HTTP:", `http://${ts}:${PORT}/mia-fold  (potrebuje npm run remote:firewall)`);
  } else {
    console.log("Z kamionu:        ", "Nejdřív nainstaluj Tailscale na notebook + Fold");
  }
  console.log("\nCursor:           ", "Chrome Remote Desktop (viz docs/REMOTE_FOLD_KAMION.md)");
  console.log("");

  if (!ts) process.exitCode = 1;
}

run();
