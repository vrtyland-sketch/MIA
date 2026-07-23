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

function getJson(url) {
  return new Promise((resolve, reject) => {
    http
      .get(url, (res) => {
        let body = "";
        res.on("data", (c) => (body += c));
        res.on("end", () => {
          try {
            resolve(JSON.parse(body));
          } catch (err) {
            reject(err);
          }
        });
      })
      .on("error", reject);
  });
}

async function main() {
  loadLocalEnv();
  const port = process.env.PORT || 3000;
  const tts = await getJson(`http://127.0.0.1:${port}/tts/test?fresh=1`);
  const voice = await getJson(`http://127.0.0.1:${port}/obs/ensure-voice?force=0`);
  console.log(
    JSON.stringify(
      {
        ok: tts.ok === true && voice.ok === true,
        tts,
        voice,
        hint: "Měl bys slyšet MIA v repro. TikTok diváci: VB-Cable → mikrofon v TikTok Studiu."
      },
      null,
      2
    )
  );
  process.exitCode = tts.ok && voice.ok ? 0 : 1;
}

main().catch((err) => {
  console.error(err.message);
  process.exitCode = 1;
});
