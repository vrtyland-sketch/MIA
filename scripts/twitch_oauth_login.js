"use strict";

/**
 * Twitch OAuth — otevře prohlížeč, uloží tokeny do secrets/local/twitch_oauth.json
 *   npm run twitch:login
 *
 * Předtím v .env:
 *   TWITCH_CLIENT_ID=...
 *   TWITCH_CLIENT_SECRET=...
 *   TWITCH_CHANNEL_LOGIN=tvuj_login
 */

const fs = require("fs");
const path = require("path");
const http = require("http");
const { execSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const ENV_PATH = path.join(ROOT, ".env");
const OUT_PATH = path.join(ROOT, "secrets", "local", "twitch_oauth.json");
const REDIRECT_URI = "http://localhost:3099/twitch/callback";
const PORT = 3099;

const SCOPES = [
  "channel:read:chat",
  "user:read:chat",
  "channel:read:subscriptions",
  "channel:read:redemptions",
  "bits:read",
  "moderator:read:followers"
].join(" ");

function loadEnv() {
  const out = {};
  if (!fs.existsSync(ENV_PATH)) return out;
  for (const line of fs.readFileSync(ENV_PATH, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i > 0) out[t.slice(0, i)] = t.slice(i + 1);
  }
  return out;
}

function upsertEnv(keys) {
  let text = fs.existsSync(ENV_PATH) ? fs.readFileSync(ENV_PATH, "utf8") : "";
  for (const [key, value] of Object.entries(keys)) {
    const line = `${key}=${value}`;
    const re = new RegExp(`^${key}=.*$`, "m");
    if (re.test(text)) text = text.replace(re, line);
    else text += `\n${line}`;
  }
  fs.writeFileSync(ENV_PATH, text, "utf8");
}

function openBrowser(url) {
  try {
    if (process.platform === "win32") {
      execSync(`start "" "${url}"`, { shell: true, stdio: "ignore" });
    } else {
      execSync(`xdg-open "${url}"`, { stdio: "ignore" });
    }
  } catch (_e) {
    console.log("Otevři v prohlížeči:", url);
  }
}

async function exchangeCode({ clientId, clientSecret, code }) {
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    grant_type: "authorization_code",
    redirect_uri: REDIRECT_URI
  });
  const res = await fetch("https://id.twitch.tv/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || JSON.stringify(data));
  return data;
}

async function fetchBroadcaster({ clientId, accessToken, login }) {
  const res = await fetch(`https://api.twitch.tv/helix/users?login=${encodeURIComponent(login)}`, {
    headers: {
      "Client-Id": clientId,
      Authorization: `Bearer ${accessToken}`
    }
  });
  const data = await res.json();
  return data?.data?.[0] || null;
}

async function run() {
  const env = loadEnv();
  const clientId = env.TWITCH_CLIENT_ID || "";
  const clientSecret = env.TWITCH_CLIENT_SECRET || "";
  const channelLogin = env.TWITCH_CHANNEL_LOGIN || "";

  if (!clientId || !clientSecret) {
    console.error("\nChybi TWITCH_CLIENT_ID / TWITCH_CLIENT_SECRET v .env");
    console.error("Vytvor app: https://dev.twitch.tv/console/apps");
    console.error("Redirect URI: " + REDIRECT_URI + "\n");
    process.exitCode = 1;
    return;
  }

  const authUrl =
    "https://id.twitch.tv/oauth2/authorize?" +
    new URLSearchParams({
      client_id: clientId,
      redirect_uri: REDIRECT_URI,
      response_type: "code",
      scope: SCOPES
    }).toString();

  console.log("\n=== Twitch OAuth login ===\n");
  console.log("Oteviram Twitch prihlaseni...\n");

  const codePromise = new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
      if (url.pathname !== "/twitch/callback") {
        res.writeHead(404);
        res.end("not found");
        return;
      }
      const code = url.searchParams.get("code");
      const err = url.searchParams.get("error");
      if (err) {
        res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
        res.end(`<h1>Chyba: ${err}</h1>`);
        reject(new Error(err));
        server.close();
        return;
      }
      if (!code) {
        res.writeHead(400);
        res.end("missing code");
        return;
      }
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end("<h1>Twitch OK — muzes zavrit toto okno</h1><p>npm run restart</p>");
      resolve(code);
      server.close();
    });

    server.listen(PORT, "127.0.0.1", () => openBrowser(authUrl));
    server.on("error", reject);
    setTimeout(() => {
      server.close();
      reject(new Error("OAuth timeout (5 min)"));
    }, 300_000);
  });

  try {
    const code = await codePromise;
    const tokens = await exchangeCode({ clientId, clientSecret, code });

    const login = channelLogin || "";
    let broadcaster = null;
    if (login) {
      broadcaster = await fetchBroadcaster({
        clientId,
        accessToken: tokens.access_token,
        login
      });
    }

    fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
    const out = {
      savedAt: new Date().toISOString(),
      clientId,
      scopes: SCOPES.split(" "),
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresIn: tokens.expires_in,
      broadcasterId: broadcaster?.id || env.TWITCH_BROADCASTER_ID || "",
      channelLogin: broadcaster?.login || login,
      displayName: broadcaster?.display_name || ""
    };
    fs.writeFileSync(OUT_PATH, JSON.stringify(out, null, 2), "utf8");

    upsertEnv({
      MIA_TWITCH_ENABLED: "true",
      TWITCH_ACCESS_TOKEN: tokens.access_token,
      TWITCH_REFRESH_TOKEN: tokens.refresh_token || "",
      TWITCH_BROADCASTER_ID: out.broadcasterId,
      TWITCH_CHANNEL_LOGIN: out.channelLogin
    });

    console.log("OK  Token ulozen: secrets/local/twitch_oauth.json");
    console.log("OK  .env aktualizovan");
    if (out.broadcasterId) console.log("OK  Broadcaster:", out.displayName, out.broadcasterId);
    console.log("\nDalsi: npm run restart\n");
  } catch (err) {
    console.error("OAuth selhalo:", err.message);
    process.exitCode = 1;
  }
}

run();
