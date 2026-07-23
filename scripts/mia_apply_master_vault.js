"use strict";

/**
 * Nastavi jednotne master heslo do .env a secrets/local/.
 *   node scripts/mia_apply_master_vault.js
 *   node scripts/mia_apply_master_vault.js --master=Heslo123
 */

const fs = require("fs");
const path = require("path");
const os = require("os");
const { execSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const ENV_PATH = path.join(ROOT, ".env");
const SECRETS_DIR = path.join(ROOT, "secrets", "local");

function parseArg(name) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split("=").slice(1).join("=") : "";
}

function upsertEnv(key, value) {
  if (!fs.existsSync(ENV_PATH)) return;
  let text = fs.readFileSync(ENV_PATH, "utf8");
  const line = `${key}=${value}`;
  const re = new RegExp(`^${key}=.*$`, "m");
  if (re.test(text)) {
    text = text.replace(re, line);
  } else {
    text += `\n${line}\n`;
  }
  fs.writeFileSync(ENV_PATH, text, "utf8");
}

function getLanIp() {
  for (const nets of Object.values(os.networkInterfaces())) {
    for (const net of nets || []) {
      if (net.family === "IPv4" && !net.internal && net.address.startsWith("192.168.")) {
        return net.address;
      }
    }
  }
  return "192.168.1.189";
}

function getTailscaleIp() {
  try {
    const ts = "C:\\Program Files\\Tailscale\\tailscale.exe";
    const cmd = fs.existsSync(ts) ? `"${ts}" ip -4` : "tailscale ip -4";
    const ip = execSync(cmd, { encoding: "utf8", timeout: 5000 }).trim();
    return /^\d+\.\d+\.\d+\.\d+$/.test(ip) ? ip : null;
  } catch (_e) {
    return null;
  }
}

function run() {
  const master = parseArg("master") || process.env.MIA_MASTER_PASSWORD || "";
  if (!master) {
    console.error("Chybi master heslo. Pouzij --master=... nebo MIA_MASTER_PASSWORD v .env");
    process.exitCode = 1;
    return;
  }

  const envBefore = fs.existsSync(ENV_PATH) ? fs.readFileSync(ENV_PATH, "utf8") : "";
  const obsMatch = envBefore.match(/^OBS_WS_PASSWORD=(.*)$/m);
  const obsExisting = obsMatch ? obsMatch[1].trim() : "";

  upsertEnv("MIA_MASTER_PASSWORD", master);
  upsertEnv("MIA_INGEST_SECRET", master);
  upsertEnv("MIA_CRD_PIN", master);

  const port = (envBefore.match(/^PORT=(.*)$/m) || [])[1] || "3000";
  const lan = getLanIp();
  const tsIp = getTailscaleIp() || "100.93.161.52";
  const httpsDns = "laptop-0k9hiohe.tailb0a7c8.ts.net";

  fs.mkdirSync(SECRETS_DIR, { recursive: true });

  const vault = {
    updatedAt: new Date().toISOString(),
    masterPassword: master,
    roles: {
      MIA_MASTER_PASSWORD: {
        use: "Hlavni heslo projektu MIA (odkaz na ostatni)",
        auto: false
      },
      MIA_INGEST_SECRET: {
        use: "Token Fold /mia-fold — MIA automaticky vklada do odkazu",
        auto: true,
        value: master
      },
      MIA_CRD_PIN: {
        use: "Chrome Remote Desktop PIN na Foldu (zadej rucne pri pripojeni)",
        auto: false,
        value: master,
        note: "Nastav stejny PIN v remotedesktop.google.com na notebooku"
      },
      OBS_WS_PASSWORD: {
        use: "MIA automaticky pripojuje OBS WebSocket",
        auto: true,
        value: obsExisting || "(beze zmeny v .env)"
      }
    },
    fold: {
      miaMobile: `http://${tsIp}:${port}/mia-fold`,
      miaWifi: `http://${lan}:${port}/mia-fold`,
      miaHttps: `https://${httpsDns}/mia-fold`,
      cursor: "Chrome Remote Desktop app → MIA-DOMOV → PIN viz MIA_CRD_PIN"
    }
  };

  fs.writeFileSync(path.join(SECRETS_DIR, "mia_vault.json"), JSON.stringify(vault, null, 2), "utf8");

  const cred = [
    "# MIA — hesla (SOUKROME, gitignore)",
    "",
    `> Aktualizovano: ${vault.updatedAt}`,
    "",
    "## Jedno master heslo",
    "",
    "| Ucel | Hodnota | Kdo to pouziva |",
    "|---|---|---|",
    `| **Master** | \`${master}\` | Ty — zapamatuj si |`,
    `| Fold token (/mia-fold) | \`${master}\` | MIA vklada automaticky do odkazu |`,
    `| Chrome Remote Desktop PIN | \`${master}\` | Ty na Foldu pri pripojeni k notebooku |`,
    `| OBS WebSocket | \`${obsExisting || "(viz .env)"}\` | MIA automaticky pri startu |`,
    "",
    "## Co MIA pripoji automaticky",
    "",
    "- **OBS** — pri startu pres OBS_WS_PASSWORD",
    "- **Fold token** — /mia-fold redirect s mia_secret",
    "",
    "## Co zadas rucne na Foldu",
    "",
    "- **Chrome Remote Desktop** — PIN = master heslo",
    "- **Tailscale** — prihlaseny ucet (bez hesla v MIA)",
    "",
    "## Odkazy Fold",
    "",
    `- Mobilni data: http://${tsIp}:${port}/mia-fold`,
    `- Doma Wi-Fi: http://${lan}:${port}/mia-fold`,
    `- HTTPS (volitelne): https://${httpsDns}/mia-fold`,
    "",
    "## Cursor z kamionu",
    "",
    "1. Chrome Remote Desktop → MIA-DOMOV",
    `2. PIN: ${master}`,
    "3. Otevri Cursor → C:\\MIA",
    ""
  ].join("\n");

  fs.writeFileSync(path.join(SECRETS_DIR, "CREDENTIALS.md"), cred, "utf8");

  const fold = [
    "=== MIA + CURSOR Z FOLDU ===",
    "",
    "MASTER HESLO (token + CRD PIN): viz secrets/local/CREDENTIALS.md",
    "",
    "MIA (mobilni data):",
    `http://${tsIp}:${port}/mia-fold`,
    "",
    "CURSOR (mobilni data):",
    "Chrome Remote Desktop → MIA-DOMOV → PIN = master heslo",
    "",
    "Tailscale: ZAPNUTO",
    ""
  ].join("\n");
  fs.writeFileSync(path.join(SECRETS_DIR, "FOLD_OTEVRI_TOTO.txt"), fold, "utf8");

  console.log("\nOK  Master vault nastaven");
  console.log("OK  .env: MIA_MASTER_PASSWORD, MIA_INGEST_SECRET, MIA_CRD_PIN");
  console.log("OK  secrets/local/mia_vault.json");
  console.log("OK  secrets/local/CREDENTIALS.md");
  console.log("\nDalsi: npm run restart");
  console.log("CRD: nastav PIN na notebooku = master heslo (remotedesktop.google.com)\n");
}

run();
