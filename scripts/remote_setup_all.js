"use strict";

/**
 * Kompletni nastaveni vzdaleneho pristupu (Fold z kamionu).
 *   npm run remote:setup
 */

const fs = require("fs");
const path = require("path");
const os = require("os");
const { execSync, spawnSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const TS_EXE = "C:\\Program Files\\Tailscale\\tailscale.exe";
const PORT = process.env.PORT || "3000";

function loadEnv() {
  const p = path.join(ROOT, ".env");
  const out = {};
  if (!fs.existsSync(p)) return out;
  for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq <= 0) continue;
    out[t.slice(0, eq).trim()] = t.slice(eq + 1).trim();
  }
  return out;
}

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
  const bins = [TS_EXE, "tailscale"];
  for (const bin of bins) {
    try {
      const ip = execSync(`"${bin}" ip -4`, { encoding: "utf8", timeout: 5000 }).trim();
      if (ip && /^\d+\.\d+\.\d+\.\d+$/.test(ip)) return ip;
    } catch (_e) {
      /* next */
    }
  }
  return null;
}

function getTailscaleStatus() {
  try {
    return execSync(`"${TS_EXE}" status`, { encoding: "utf8", timeout: 5000 });
  } catch (_e) {
    return "";
  }
}

function ensureEnvBind() {
  const envPath = path.join(ROOT, ".env");
  if (!fs.existsSync(envPath)) return;
  let text = fs.readFileSync(envPath, "utf8");
  if (!/MIA_BIND_HOST=0\.0\.0\.0/.test(text)) {
    if (/MIA_BIND_HOST=/.test(text)) {
      text = text.replace(/MIA_BIND_HOST=.*/g, "MIA_BIND_HOST=0.0.0.0");
    } else {
      text += "\nMIA_BIND_HOST=0.0.0.0\n";
    }
    fs.writeFileSync(envPath, text, "utf8");
    console.log("OK  .env MIA_BIND_HOST=0.0.0.0");
  }
}

function writeFoldFile(lan, tsIp, hasSecret) {
  const dir = path.join(ROOT, "secrets", "local");
  fs.mkdirSync(dir, { recursive: true });
  const lines = [
    "=== MIA — OTEVRI NA FOLDU V CHROME ===",
    "",
    "DULEZITE: Na Foldu musi byt zapnuty Tailscale (Play Store, stejny ucet).",
    "",
  ];
  if (tsIp && hasSecret) {
    lines.push(">>> Z KAMIONU (mobilni data) — TOTO <<<");
    lines.push(`http://${tsIp}:${PORT}/mia-fold`);
    lines.push("");
  }
  if (lan && hasSecret) {
    lines.push("Doma (stejna Wi-Fi):");
    lines.push(`http://${lan}:${PORT}/mia-fold`);
    lines.push("");
  }
  lines.push(
    "1. Tailscale app na Foldu — VPN ZAPNUTA (zelena)",
    "2. Odkaz vyse do Chrome",
    "3. Obě tečky zelené = Server + Token OK",
    "4. Napiš text → MIA řekni",
    "",
    "Cursor z kamionu: Chrome Remote Desktop (viz docs/REMOTE_FOLD_KAMION.md)",
    "",
    "Firewall na notebooku: npm run remote:firewall  (potvrd UAC Ano)",
    "",
    "Hesla: secrets/local/CREDENTIALS.md"
  );
  fs.writeFileSync(path.join(dir, "FOLD_OTEVRI_TOTO.txt"), lines.join("\r\n"), "utf8");
  console.log("OK  secrets/local/FOLD_OTEVRI_TOTO.txt");
}

async function probe(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    return res.ok;
  } catch (_e) {
    return false;
  }
}

async function run() {
  console.log("\n=== MIA remote setup ===\n");

  ensureEnvBind();
  const env = loadEnv();
  const lan = getLanIp();
  const tsIp = getTailscaleIp();
  const status = getTailscaleStatus();
  const hasSecret = Boolean(env.MIA_INGEST_SECRET);

  console.log("LAN:       ", lan || "(—)");
  console.log("Tailscale: ", tsIp || "(nebezi — otevri Tailscale u hodin)");
  if (status.includes("galaxy-z-fold6")) {
    console.log("Fold:      ", "pripojen v Tailscale");
  } else if (status) {
    console.log("Fold:      ", "NENI v Tailscale — nainstaluj app na Fold");
  }
  console.log("Token:     ", hasSecret ? "OK" : "CHYBI MIA_INGEST_SECRET");
  console.log("");

  writeFoldFile(lan, tsIp, hasSecret);

  console.log("Spoustim firewall setup (UAC dialog — klepni ANO)...");
  const fw = spawnSync(
    "powershell.exe",
    ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", path.join(__dirname, "remote_setup_firewall.ps1")],
    { stdio: "inherit", shell: false }
  );

  if (fw.status !== 0 && fw.status !== 0) {
    console.log("\nTip: bez admin pravidla spust PowerShell jako admin:");
    console.log("  npm run remote:firewall\n");
  }

  await new Promise((r) => setTimeout(r, 3000));

  console.log("\n--- Test ---\n");
  if (lan) console.log(await probe(`http://${lan}:${PORT}/health`) ? "OK" : "FAIL", "LAN health");
  if (tsIp) console.log(await probe(`http://${tsIp}:${PORT}/health`) ? "OK" : "FAIL", "Tailscale health");

  console.log("\n--- Odkaz pro Fold (zkopiruj do Chrome) ---\n");
  if (tsIp && hasSecret) {
    console.log(`http://${tsIp}:${PORT}/mia-fold\n`);
  } else {
    console.log("(doplň Tailscale + MIA_INGEST_SECRET)\n");
  }

  console.log("Soubor pro telefon: secrets/local/FOLD_OTEVRI_TOTO.txt\n");
}

run().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
