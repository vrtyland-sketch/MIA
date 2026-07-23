"use strict";

/**
 * Vytvoří složku secrets/local/ s přehledem všech hesel a klíčů + odkaz pro Fold.
 *   npm run setup:secrets
 */

const fs = require("fs");
const path = require("path");
const os = require("os");

const ROOT = path.resolve(__dirname, "..");
const SECRETS_DIR = path.join(ROOT, "secrets", "local");
const ENV_PATH = path.join(ROOT, ".env");

function loadEnv(filePath) {
  const out = {};
  if (!fs.existsSync(filePath)) return out;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq <= 0) continue;
    out[t.slice(0, eq).trim()] = t.slice(eq + 1).trim();
  }
  return out;
}

function getLanIp() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === "IPv4" && !net.internal && /^192\.168\.|^10\.|^172\.(1[6-9]|2\d|3[01])\./.test(net.address)) {
        return net.address;
      }
    }
  }
  return "192.168.1.189";
}

function maskKey(key, visible = 8) {
  if (!key) return "(prázdné — doplň v .env)";
  if (key.length <= visible + 4) return key;
  return key.slice(0, visible) + "…" + key.slice(-4);
}

function run() {
  fs.mkdirSync(SECRETS_DIR, { recursive: true });
  const env = loadEnv(ENV_PATH);
  const port = env.PORT || "3000";
  const lan = getLanIp();
  let tailscaleIp = null;
  try {
    const tsExe = "C:\\Program Files\\Tailscale\\tailscale.exe";
    const cmd = require("fs").existsSync(tsExe) ? `"${tsExe}" ip -4` : "tailscale ip -4";
    tailscaleIp = require("child_process").execSync(cmd, { encoding: "utf8", timeout: 3000 }).trim();
    if (!tailscaleIp || tailscaleIp.includes("no")) tailscaleIp = null;
  } catch (_e) {
    tailscaleIp = null;
  }
  const remoteSecret = env.MIA_INGEST_SECRET || "";
  const foldUrlLan = remoteSecret ? `http://${lan}:${port}/mia-fold` : "";
  const foldUrlRemote = remoteSecret && tailscaleIp ? `http://${tailscaleIp}:${port}/mia-fold` : "";

  const credLines = [];
  credLines.push("# MIA — přehled hesel a klíčů");
  credLines.push("");
  credLines.push("> **Soukromé.** Tato složka je v `.gitignore` — necommituj ji.");
  credLines.push(`> Vygenerováno: ${new Date().toISOString()}`);
  credLines.push("");
  credLines.push("## Fold — ovládání MIA");
  credLines.push("");
  if (foldUrlRemote) {
    credLines.push("**Z kamionu (mobilní data) — Tailscale:**");
    credLines.push("```");
    credLines.push(foldUrlRemote);
    credLines.push("```");
    credLines.push("");
  }
  credLines.push("**Doma (stejná Wi-Fi):**");
  credLines.push("```");
  credLines.push(foldUrlLan || "(doplň MIA_INGEST_SECRET)");
  credLines.push("```");
  credLines.push("");
  credLines.push("**Cursor z kamionu:** Chrome Remote Desktop → viz `docs/REMOTE_FOLD_KAMION.md`");
  credLines.push("");
  credLines.push("---");
  credLines.push("");
  credLines.push("## Všechny klíče (plné hodnoty z `.env`)");
  credLines.push("");
  credLines.push("| Proměnná | K čemu slouží | Hodnota |");
  credLines.push("|---|---|---|");

  const entries = [
    ["MIA_INGEST_SECRET", "Token pro Fold / dálkové ovládání MIA", env.MIA_INGEST_SECRET],
    ["OBS_WS_PASSWORD", "OBS WebSocket (port 4455)", env.OBS_WS_PASSWORD],
    ["OPENAI_API_KEY", "OpenAI LLM (fallback)", env.OPENAI_API_KEY],
    ["GROQ_API_KEY", "Groq LLM (primární, zdarma)", env.GROQ_API_KEY],
    ["MIA_TELEGRAM_BOT_TOKEN", "Telegram bot (User Mode)", env.MIA_TELEGRAM_BOT_TOKEN],
    ["MIA_BIND_HOST", "Síťové naslouchání (0.0.0.0 = LAN)", env.MIA_BIND_HOST],
    ["PORT", "Port MIA serveru", port]
  ];

  for (const [name, desc, val] of entries) {
    const v = val || "(prázdné)";
    credLines.push(`| \`${name}\` | ${desc} | \`${v}\` |`);
  }

  credLines.push("");
  credLines.push("---");
  credLines.push("");
  credLines.push("## Rychlé odkazy");
  credLines.push("");
  credLines.push(`- MIA health: http://127.0.0.1:${port}/health`);
  credLines.push(`- Fold MIA (kamion): ${foldUrlRemote || "(nainstaluj Tailscale — npm run remote:install-tailscale)"}`);
  credLines.push(`- Fold MIA (doma): ${foldUrlLan || "—"}`);
  credLines.push(`- OBS WebSocket: ws://127.0.0.1:4455 (heslo výše)`);
  credLines.push(`- LAN IP notebooku: **${lan}**`);

  fs.writeFileSync(path.join(SECRETS_DIR, "CREDENTIALS.md"), credLines.join("\n"));

  const foldTxt = [
    "=== MIA — OTEVŘI NA FOLDU ===",
    "",
    foldUrlRemote ? "Z KAMIONU (mobilní data, Tailscale VPN):" : "Z KAMIONU: nejdřív npm run remote:install-tailscale",
    foldUrlRemote || "",
    "",
    "DOMA (stejná Wi-Fi):",
    foldUrlLan || "",
    "",
    "CURSOR z kamionu: Chrome Remote Desktop (návod docs/REMOTE_FOLD_KAMION.md)",
    "",
    "1. Tailscale na Foldu (Play Store) — stejný účet jako notebook",
    "2. Chrome Remote Desktop — celá plocha + Cursor",
    "3. MIA ovládání — odkaz výše /mia-fold",
    "",
    "Hesla: secrets/local/CREDENTIALS.md",
    ""
  ].join("\n");
  fs.writeFileSync(path.join(SECRETS_DIR, "FOLD_OTEVRI_TOTO.txt"), foldTxt);

  const readme = [
    "# secrets/",
    "",
    "Přehled citlivých údajů MIA projektu.",
    "",
    "| Soubor | Obsah |",
    "|---|---|",
    "| `local/CREDENTIALS.md` | **Všechna hesla a klíče** (plné hodnoty) |",
    "| `local/FOLD_OTEVRI_TOTO.txt` | Odkaz pro ovládání z Foldu |",
    "",
    "Vygenerovat znovu: `npm run setup:secrets`",
    "",
    "⚠️ Složka `local/` je v `.gitignore` — necommituj ji do gitu.",
    ""
  ].join("\n");
  fs.writeFileSync(path.join(ROOT, "secrets", "README.md"), readme);

  console.log("\n✅ secrets/local/CREDENTIALS.md — všechna hesla");
  console.log("✅ secrets/local/FOLD_OTEVRI_TOTO.txt — odkaz pro Fold");
  console.log("\n📱 Doma (Wi-Fi):\n   " + (foldUrlLan || "—"));
  if (foldUrlRemote) console.log("\n🚛 Z kamionu (Tailscale):\n   " + foldUrlRemote);
  else console.log("\n🚛 Z kamionu: nainstaluj Tailscale → npm run remote:install-tailscale");
  if (!remoteSecret) {
    console.log("⚠️  Chybí MIA_INGEST_SECRET v .env\n");
    process.exitCode = 1;
  }
}

run();
