"use strict";

const fs = require("fs");
const path = require("path");
const http = require("http");

const ROOT = path.resolve(__dirname, "..");

function loadLocalEnv() {
  const envPath = path.join(ROOT, ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!Object.prototype.hasOwnProperty.call(process.env, key)) {
      process.env[key] = val;
    }
  }
}

function request(method, urlPath, body, headers = {}) {
  const data = body == null ? null : JSON.stringify(body);
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port: 3000,
        path: urlPath,
        method,
        headers: {
          ...(data
            ? {
                "Content-Type": "application/json",
                "Content-Length": Buffer.byteLength(data)
              }
            : {}),
          ...headers
        }
      },
      (res) => {
        let raw = "";
        res.on("data", (chunk) => {
          raw += chunk;
        });
        res.on("end", () => {
          let json = null;
          try {
            json = JSON.parse(raw);
          } catch (_err) {
            json = { raw: raw.slice(0, 300) };
          }
          resolve({ status: res.statusCode, json });
        });
      }
    );
    req.on("error", reject);
    if (data) req.write(data);
    req.end();
  });
}

async function main() {
  loadLocalEnv();

  // Reset voice state to both-czech.
  await request("POST", "/mia/translate/mode", { enabled: true, clearForeign: true });

  console.log("1) CS only → SKIP");
  const skip = await request("POST", "/mia/mic/utterance", {
    text: "Ahoj kamarádi, jak se máte na streamu?",
    auto: true,
    channel: "streamer"
  });
  console.log(JSON.stringify(skip, null, 2));
  if (!skip.json.skipped) {
    throw new Error("expected skip for both-czech");
  }

  console.log("2) EN guest → TRANSLATE to CS (Koj)");
  const guest = await request("POST", "/mia/mic/utterance", {
    text: "Hello my friend, good luck in this duel!",
    auto: true,
    channel: "guest"
  });
  console.log(JSON.stringify(guest, null, 2));
  if (guest.json.skipped || guest.json.speaker !== "kojnozout") {
    throw new Error("expected guest translation via koj");
  }

  console.log("3) CS streamer with foreign partner → TRANSLATE to EN (MIA)");
  const mic = await request("POST", "/mia/mic/utterance", {
    text: "Ahoj, díky za duel, jsi legenda.",
    auto: true,
    channel: "streamer"
  });
  console.log(JSON.stringify(mic, null, 2));
  if (mic.json.skipped || mic.json.speaker !== "mia") {
    throw new Error("expected streamer outbound translation via mia");
  }

  console.log("4) state");
  const state = await request("GET", "/mia/translate/state");
  console.log(JSON.stringify(state, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
