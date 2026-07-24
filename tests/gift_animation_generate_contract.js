"use strict";

/**
 * Contract: gift animation desk / procedural generate / gift map lion alias.
 */

const assert = require("assert");
const path = require("path");
const fs = require("fs");

const giftAnim = require("../shared/mia-gift-animation");
const { buildPromptBrief, giftMotif } = require("../shared/mia-gift-animation/promptBuilder");
const { registerGiftAnimationRoutes } = require("../routes/gift_animation");

async function test(name, fn) {
  await fn();
  console.log("  ok —", name);
}

async function main() {
  console.log("gift_animation_generate_contract");

  await test("lion/lev motif + gift map resolve", () => {
    const m = giftMotif("LION", "lev");
    assert.equal(m.id, "lion");
    assert.equal(m.emoji, "🦁");
    const id = giftAnim.resolveGiftIdentity({ giftName: "lev" });
    assert.equal(id.giftKey, "LION");
    assert.match(String(id.giftLabel), /Lion|LION|Lev/i);
  });

  await test("prompt brief includes avatar scene + ask chat line", () => {
    const brief = buildPromptBrief({
      giftKey: "LION",
      giftLabel: "Lion",
      username: "Tester",
      extraWords: "zlatá hříva",
      wordsTimeoutMs: 15000
    });
    assert.ok(brief.aiVideoPrompt.includes("lion") || brief.sceneLine.includes("lion"));
    assert.ok(brief.caption.includes("zlatá hříva"));
    assert.ok(brief.askChatPrompt.includes("Tester"));
    assert.ok(brief.askChatPrompt.includes("slova"));
  });

  await test("lion motif includes MIA stage art refs", () => {
    const m = giftMotif("LION", "lev");
    assert.ok(m.art && m.art.miaHero.includes("/assets/mia/cyber/"));
    assert.ok(m.art.koj.includes("kojnozout"));
    assert.equal(m.creature, "lion");
    assert.equal(m.spectacle, "max");
    assert.ok(m.art.creatureSprite.includes("gift-creatures/lion/majestic"));
    assert.ok(m.art.creatureRoar.includes("gift-creatures/lion/roar"));
    assert.equal(m.art.bust, "37-stream-polish");
    assert.ok(fs.existsSync(path.join(__dirname, "..", "mia-output-overlay", "assets", "gift-creatures", "lion", "majestic.png")));
    assert.ok(fs.existsSync(path.join(__dirname, "..", "mia-output-overlay", "assets", "gift-creatures", "lion", "roar.png")));
  });

  await test("universe + galaxy motifs include true-alpha creature art", () => {
    const u = giftMotif("UNIVERSE", "vesmír");
    assert.equal(u.id, "universe");
    assert.equal(u.spectacle, "max");
    assert.ok(u.art.creatureSprite.includes("gift-creatures/universe/calm"));
    assert.ok(u.art.creatureRoar.includes("gift-creatures/universe/surge"));
    assert.ok(fs.existsSync(path.join(__dirname, "..", "mia-output-overlay", "assets", "gift-creatures", "universe", "calm.png")));
    assert.ok(fs.existsSync(path.join(__dirname, "..", "mia-output-overlay", "assets", "gift-creatures", "universe", "surge.png")));
    const g = giftMotif("GALAXY", "galaxy");
    assert.equal(g.id, "galaxy");
    assert.equal(g.spectacle, "high");
    assert.ok(g.art.creatureSprite.includes("gift-creatures/galaxy/calm"));
    assert.ok(g.art.creatureRoar.includes("gift-creatures/galaxy/burst"));
    assert.ok(fs.existsSync(path.join(__dirname, "..", "mia-output-overlay", "assets", "gift-creatures", "galaxy", "calm.png")));
    assert.ok(fs.existsSync(path.join(__dirname, "..", "mia-output-overlay", "assets", "gift-creatures", "galaxy", "burst.png")));
  });

  await test("generate procedural pack writes manifest", async () => {
    const result = await giftAnim.generateNow({
      giftKey: "lion",
      giftName: "lev",
      username: "ContractUser",
      extraWords: "mazlení",
      encodeVideo: false
    });
    assert.equal(result.ok, true);
    assert.equal(result.trueAiVideo, false);
    assert.equal(result.provider, "procedural_v2");
    assert.ok(result.jobId);
    assert.ok(result.manifestUrl.includes("/generated/gift-animations/"));
    const manPath = path.join(giftAnim.OUT_DIR, result.jobId, "manifest.json");
    assert.ok(fs.existsSync(manPath), "manifest on disk");
    const man = JSON.parse(fs.readFileSync(manPath, "utf8"));
    assert.equal(man.giftKey, "LION");
    assert.equal(man.play.preferred, "overlay_canvas");
  });

  await test("routes register", () => {
    const routes = [];
    const app = {
      get(path, ..._handlers) {
        routes.push("GET " + path);
      },
      post(path, ..._handlers) {
        routes.push("POST " + path);
      }
    };
    const out = registerGiftAnimationRoutes(app, {
      localAdminGuard: (_req, _res, next) => next()
    });
    assert.equal(out.ok, true);
    assert.ok(routes.includes("POST /api/gift-animation/generate"));
    assert.ok(routes.includes("GET /api/gift-animation/status"));
  });

  await test("ask-words start sets pending", async () => {
    const out = giftAnim.startAskWords({
      giftName: "lion",
      username: "AskUser",
      wordsTimeoutMs: 5000,
      encodeVideo: false
    });
    assert.equal(out.ok, true);
    assert.ok(out.pendingAsk);
    assert.equal(out.pendingAsk.status, "waiting_words");
    const hit = await giftAnim.tryCaptureWordsFromChat("AskUser", "zlatý lev");
    assert.ok(hit?.ok);
    assert.equal(hit.reason, "chat_reply");
    assert.equal(hit.extraWords, "zlatý lev");
  });

  await test("gift animation desk syncs bust from live manifest", () => {
    const fs = require("fs");
    const path = require("path");
    const desk = fs.readFileSync(
      path.join(__dirname, "..", "mia-output-overlay", "mia-paint", "gift-animation-desk.html"),
      "utf8"
    );
    assert.match(desk, /syncManifestBust/);
    assert.match(desk, /giftBustLabel/);
    assert.match(desk, /obsGiftOverlayUrl/);
  });

  console.log("gift_animation_generate_contract: all passed");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
