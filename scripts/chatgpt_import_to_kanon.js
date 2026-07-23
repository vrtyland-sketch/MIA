"use strict";

/**
 * Import ChatGPT exportů (conversations.json ze 2 účtů) → MIA kánon extract.
 *
 *   npm run chatgpt:import
 *
 * Očekává:
 *   imports/chatgpt/account1/conversations.json  (nebo export.zip)
 *   imports/chatgpt/account2/conversations.json
 */

const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const ROOT = path.resolve(__dirname, "..");
const IMPORT_ROOT = path.join(ROOT, "imports", "chatgpt");
const OUT_MD = path.join(ROOT, "docs", "KANON_MIA_CHATGPT_EXTRACT.md");
const OUT_REPORT = path.join(ROOT, "generated", "chatgpt", "import-report.json");

const MIA_KEYWORDS = [
  "mia", "kojnožrout", "kojnozout", "kojnozrout", "obs", "tiktok", "tik finity",
  "tikfinity", "overlay", "stream", "gift", "duel", "tts", "hologram", "spinak",
  "kánon", "kanon", "browser source", "websocket", "suno", "dron", "dji"
];

function safeString(v, fb = "") {
  return typeof v === "string" && v.trim() ? v.trim() : fb;
}

function extractTextFromMessage(msg) {
  if (!msg) return "";
  const c = msg.content;
  if (typeof c === "string") return c;
  if (c && typeof c === "object" && c.parts) {
    return c.parts.map((p) => (typeof p === "string" ? p : p?.text || "")).join("\n");
  }
  if (Array.isArray(c)) {
    return c.map((p) => (typeof p === "string" ? p : p?.text || "")).join("\n");
  }
  return "";
}

function scoreConversation(conv) {
  const title = safeString(conv.title, "").toLowerCase();
  const mapping = conv.mapping || {};
  let text = title;
  for (const node of Object.values(mapping)) {
    const msg = node?.message;
    if (msg?.author?.role === "user" || msg?.author?.role === "assistant") {
      text += " " + extractTextFromMessage(msg).slice(0, 2000);
    }
  }
  const lower = text.toLowerCase();
  let score = 0;
  for (const kw of MIA_KEYWORDS) {
    if (lower.includes(kw)) score += 1;
  }
  if (title.includes("mia")) score += 5;
  return score;
}

function loadConversationsFromFile(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  const data = JSON.parse(raw);
  return Array.isArray(data) ? data : data.conversations || [];
}

function findConversationFiles(dir) {
  const found = [];
  if (!fs.existsSync(dir)) return found;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) found.push(...findConversationFiles(full));
    else if (entry.name === "conversations.json") found.push(full);
    else if (entry.name.endsWith(".zip")) found.push(full);
  }
  return found;
}

function extractZipConversations(zipPath) {
  // Jednoduchý fallback: požádej uživatele o rozbalení, pokud zip nelze bez knihovny.
  try {
    const AdmZip = require("adm-zip");
    const zip = new AdmZip(zipPath);
    const entry = zip.getEntries().find((e) => e.entryName.endsWith("conversations.json"));
    if (!entry) return [];
    const raw = entry.getData().toString("utf8");
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : data.conversations || [];
  } catch (_e) {
    console.warn(`⚠️  ZIP ${zipPath}: rozbal ručně nebo npm install adm-zip`);
    return [];
  }
}

function summarizeConversation(conv, accountLabel) {
  const mapping = conv.mapping || {};
  const messages = [];
  for (const node of Object.values(mapping)) {
    const msg = node?.message;
    if (!msg) continue;
    const role = msg.author?.role;
    if (role !== "user" && role !== "assistant") continue;
    const text = extractTextFromMessage(msg).trim();
    if (text) messages.push({ role, text: text.slice(0, 4000) });
  }
  return {
    account: accountLabel,
    id: conv.id || conv.conversation_id,
    title: safeString(conv.title, "(bez názvu)"),
    createTime: conv.create_time || conv.created_at,
    messageCount: messages.length,
    messages: messages.slice(-20) // posledních 20 zpráv pro extract
  };
}

function run() {
  fs.mkdirSync(path.dirname(OUT_REPORT), { recursive: true });

  const files = findConversationFiles(IMPORT_ROOT);
  if (!files.length) {
    console.log("\n❌ Žádný export v imports/chatgpt/");
    console.log("   Postup: viz imports/chatgpt/README.md");
    console.log("   Potřebuješ conversations.json ze 2 účtů (Export data v ChatGPT).\n");
    process.exitCode = 1;
    return;
  }

  const all = [];
  for (const file of files) {
    const accountLabel = path.basename(path.dirname(file)) || "unknown";
    let convs = [];
    if (file.endsWith(".zip")) convs = extractZipConversations(file);
    else convs = loadConversationsFromFile(file);
    console.log(`📂 ${file} → ${convs.length} konverzací`);
    for (const c of convs) {
      const score = scoreConversation(c);
      if (score >= 2) {
        all.push({ ...summarizeConversation(c, accountLabel), score });
      }
    }
  }

  all.sort((a, b) => b.score - a.score);

  const lines = [];
  lines.push("# MIA — extract z ChatGPT exportů");
  lines.push("");
  lines.push(`Import: ${new Date().toISOString()}`);
  lines.push(`Relevantních konverzací: **${all.length}** (skóre ≥ 2)`);
  lines.push("");
  lines.push("> Zdroj: oficiální Export data (conversations.json). Doplňuje kánon — nekoliduje s `KANON_MIA_AGENT.md`.");
  lines.push("");

  for (const conv of all.slice(0, 80)) {
    lines.push(`## ${conv.title}`);
    lines.push("");
    lines.push(`- Účet: \`${conv.account}\` · zpráv: ${conv.messageCount} · skóre: ${conv.score}`);
    lines.push("");
    for (const m of conv.messages.slice(-8)) {
      lines.push(`**${m.role === "user" ? "Uživatel" : "ChatGPT"}:**`);
      lines.push("");
      lines.push(m.text.slice(0, 2000));
      lines.push("");
    }
    lines.push("---");
    lines.push("");
  }

  fs.writeFileSync(OUT_MD, lines.join("\n"));
  fs.writeFileSync(
    OUT_REPORT,
    JSON.stringify(
      {
        importedAt: new Date().toISOString(),
        files,
        relevantCount: all.length,
        topTitles: all.slice(0, 30).map((c) => ({ title: c.title, account: c.account, score: c.score }))
      },
      null,
      2
    )
  );

  console.log(`\n✅ Kánon extract: ${OUT_MD}`);
  console.log(`📊 Report: ${OUT_REPORT}`);
  console.log(`   Relevantních konverzací: ${all.length}\n`);
}

run();
