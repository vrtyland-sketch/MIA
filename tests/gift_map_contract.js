"use strict";

const assert = require("assert");
const gifts = require("../shared/gifts");
const { enrichNormalizedSupport } = require("../scripts/MIA_SUPPORT_RESOLVER");

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (err) {
    console.error(`fail - ${name}`);
    throw err;
  }
}

test("normalizes Rose aliases to ROSE", () => {
  for (const name of ["Rose", "ROSE", "rose", "🌹", "Růže"]) {
    assert.equal(gifts.normalizeGiftKey(name), "ROSE");
  }
});

test("normalizes Lion aliases to LION", () => {
  for (const name of ["Lion", "LION", "🦁", "lev"]) {
    assert.equal(gifts.normalizeGiftKey(name), "LION");
  }
});

test("resolveGift maps Rose → T1 flower care LOVE", () => {
  const g = gifts.resolveGift({
    giftName: "Rose",
    coins: 1,
    count: 5,
    platform: "TikTok",
    displayName: "Tomino"
  });
  assert.equal(g.giftKey, "ROSE");
  assert.equal(g.category, "FLOWER");
  assert.equal(g.tier, "T1");
  assert.equal(g.care, "LOVE");
  assert.equal(g.totalCoins, 5);
  assert.ok(g.miaPoints > 0);
  assert.equal(g.overlay.showCoins, false);
  assert.match(g.overlay.text, /Tomino/);
  assert.ok(g.bowl.fill > 0);
  assert.ok(g.video.tierPool);
  assert.ok(g.voice.owner);
  assert.ok(g.xp.viewer >= 0);
});

test("Lion catalog tier wins over low coins", () => {
  const g = gifts.resolveGift({ giftName: "Lion", coins: 1, count: 1, displayName: "Pepa" });
  assert.equal(g.giftKey, "LION");
  assert.equal(g.tier, "T4");
  assert.ok(g.priority >= 8);
});

test("Galaxy is high priority legendary", () => {
  const g = gifts.resolveGift({ giftName: "Galaxy", coins: 1000, count: 1, displayName: "Tomino" });
  assert.equal(g.giftKey, "GALAXY");
  assert.ok(g.priority >= 8);
  assert.equal(g.category, "LEGENDARY");
});

test("Universe maps to T6 legendary catalog tier", () => {
  for (const name of ["Universe", "vesmír", "🌠"]) {
    assert.equal(gifts.normalizeGiftKey(name), "UNIVERSE");
  }
  const g = gifts.resolveGift({ giftName: "Universe", coins: 10000, count: 1, displayName: "Tomino" });
  assert.equal(g.giftKey, "UNIVERSE");
  assert.equal(g.tier, "T6");
  assert.ok(g.priority >= 10);
});

test("common TikTok english names resolve away from GENERIC", () => {
  const cases = [
    ["Hand Heart", "FINGER_HEART"],
    ["Sunflower", "ROSE"],
    ["Confetti", "CELEBRATION"],
    ["TikTok", "MUSIC_SMALL"],
    ["Panda", "ANIMAL_SMALL"],
    ["Manifesting", "MAGIC_SPACE"],
    ["Sports Car", "PREMIUM_VEHICLE"]
  ];
  for (const [name, key] of cases) {
    assert.equal(gifts.normalizeGiftKey(name), key, `${name} → ${key}`);
  }
});

test("runtime merges Rose spam into wave/combo", () => {
  const rt = gifts.createRuntime({ persist: false });
  let last = null;
  for (let i = 0; i < 4; i += 1) {
    last = rt.ingest({
      giftName: "Rose",
      coins: 1,
      count: 1,
      platform: "tiktok",
      displayName: "Tomino"
    });
  }
  assert.equal(last.gift.giftKey, "ROSE");
  assert.ok(last.gift.count >= 4);
  assert.ok(last.gift.merged || last.gift.streak.kind === "combo" || last.gift.streak.kind === "repeat");
  assert.equal(last.gift.overlay.showCoins, false);

  const galaxy = rt.ingest({
    giftName: "Galaxy",
    coins: 5000,
    count: 1,
    platform: "tiktok",
    displayName: "Tomino"
  });
  assert.equal(galaxy.gift.giftKey, "GALAXY");
  assert.ok(galaxy.gift.priority > last.gift.priority);

  const queue = rt.peekQueue();
  assert.ok(queue.length >= 1);
  assert.equal(queue[0].giftKey, "GALAXY");
});

test("support resolver attaches giftMap fields", () => {
  const normalized = enrichNormalizedSupport(
    {
      platform: "tiktok",
      user: { nickname: "Tomino" },
      support: { giftName: "Rose", coins: 1, repeatCount: 5 }
    },
    { giftName: "Rose", coins: 1, count: 5 }
  );
  assert.equal(normalized.support.giftKey, "ROSE");
  assert.equal(normalized.support.giftCategory, "FLOWER");
  assert.ok(normalized.support.giftMap);
  assert.equal(normalized.support.giftMap.overlay.showCoins, false);
  assert.equal(
    normalized.support.economy.sourceOfTruth,
    "MIA_SUPPORT_RESOLVER+shared/gifts"
  );
  assert.match(normalized.support.giftOverlay.text, /Tomino/);
});

test("Lion catalog tier drives stream and obs video tier", () => {
  const normalized = enrichNormalizedSupport(
    {
      platform: "tiktok",
      user: { nickname: "Pepa" },
      support: { giftName: "Lion", coins: 1, repeatCount: 1 }
    },
    { giftName: "Lion", coins: 1, count: 1 }
  );
  assert.equal(normalized.support.coinTier, "T1");
  assert.equal(normalized.support.streamTier, "T4");
  assert.equal(normalized.support.obsTier, "T4");
  assert.equal(normalized.support.tier, "T4");
  assert.ok(normalized.support.giftPriority >= 8);
});

test("presentation applies gift map overlay text", () => {
  const presentation = require("../scripts/MIA_GIFT_PRESENTATION");
  const support = enrichNormalizedSupport(
    {
      platform: "tiktok",
      user: { nickname: "Tomino" },
      support: { giftName: "Rose", coins: 1, repeatCount: 1 }
    },
    {}
  ).support;
  const giftEconomy = require("../scripts/MIA_GIFT_ECONOMY");
  support.giftContext = giftEconomy.buildResolvedGiftContext({
    support,
    giftProfile: support.giftProfile
  });
  const prepared = presentation.prepareGiftPresentation(
    { user: { nickname: "Tomino" }, support },
    {
      overlayPayload: { text: "generic thanks", holdMs: 4000 },
      tier: "T1"
    }
  );
  assert.match(prepared.actionResult.overlayPayload.text, /Tomino/);
  assert.match(prepared.actionResult.overlayPayload.text, /Rose/i);
  assert.equal(prepared.actionResult.overlayPayload.meta.giftMapOverlay, true);
  assert.equal(prepared.actionResult.tier, "T1");
});

test("gift memory text is not overwritten by catalog overlay", () => {
  const presentation = require("../scripts/MIA_GIFT_PRESENTATION");
  const support = enrichNormalizedSupport(
    {
      platform: "tiktok",
      user: { nickname: "Tomino" },
      support: { giftName: "Rose", coins: 1, repeatCount: 1 }
    },
    {}
  ).support;
  const giftEconomy = require("../scripts/MIA_GIFT_ECONOMY");
  support.giftContext = giftEconomy.buildResolvedGiftContext({
    support,
    giftProfile: support.giftProfile
  });
  support.giftStats = {
    achievements: [{ id: "first_gift", label: "První gift", public: true }]
  };
  const memoryText = "Tomino, dnes zase Rose. Děkujeme — to je tvoje typická podpora.";
  const prepared = presentation.prepareGiftPresentation(
    { user: { nickname: "Tomino" }, support },
    {
      overlayPayload: {
        text: memoryText,
        holdMs: 4000,
        meta: { giftMemoryApplied: true }
      },
      meta: { giftMemoryApplied: true },
      tier: "T1"
    }
  );
  assert.equal(prepared.actionResult.overlayPayload.text, memoryText);
  assert.equal(prepared.actionResult.overlayPayload.subtext, "První gift");
  assert.equal(
    prepared.actionResult.overlayPayload.meta.achievementUnlock.id,
    "first_gift"
  );
});

test("validator rejects overlay coins", () => {
  const bad = gifts.validateResolved({
    giftKey: "ROSE",
    tier: "T1",
    priority: 2,
    overlay: { showCoins: true }
  });
  assert.equal(bad.ok, false);
  assert.ok(bad.errors.includes("overlay_must_not_show_coins"));
});

test("giftVoice owner mia routes speaker to MIA", () => {
  const policy = require("../scripts/MIA_SUPPORT_REACTION_POLICY");
  const support = enrichNormalizedSupport(
    {
      platform: "tiktok",
      user: { nickname: "Tomino" },
      support: { giftName: "Heart", coins: 1, repeatCount: 1 }
    },
    {}
  ).support;
  const presentation = policy.resolveSupportPresentation(
    { support },
    { bowlPercent: 40 },
    { route: "support", reason: "SUPPORT_RESOLVED", tier: support.tier },
    { audience: { viewerCount: 20 } },
    {}
  );
  assert.equal(support.giftVoice.owner, "mia");
  assert.equal(presentation.speaker, "mia");
  assert.equal(presentation.meta.primarySpeakerPolicy, "GIFT_MAP_VOICE_MIA");
});

test("giftPriority forces full ack on large stream", () => {
  const policy = require("../scripts/MIA_SUPPORT_REACTION_POLICY");
  const support = enrichNormalizedSupport(
    {
      platform: "tiktok",
      user: { nickname: "Pepa" },
      support: { giftName: "Lion", coins: 1, repeatCount: 1 }
    },
    {}
  ).support;
  const plan = policy.resolveSupportAckPlan(
    { support },
    { bowlPercent: 40 },
    { route: "support", reason: "SUPPORT_RESOLVED", tier: support.tier },
    { audience: { viewerCount: 600 } },
    {}
  );
  assert.ok(support.giftPriority >= 8);
  assert.equal(plan.mode, "full");
  assert.equal(plan.playVideo, true);
  assert.equal(plan.reason, "gift_map_priority");
});

test("supporter XP uses giftXp.viewer multiplier", () => {
  const profileMod = require("../scripts/MIA_GIFT_SUPPORTER_PROFILE");
  const support = enrichNormalizedSupport(
    {
      platform: "tiktok",
      user: { userId: "xp1", nickname: "Fan" },
      support: { giftName: "Galaxy", coins: 1000, repeatCount: 1 }
    },
    {}
  ).support;
  assert.equal(support.giftXp.viewer, 1600);
  const recorded = profileMod.recordGiftSupport(
    profileMod.createGiftSupporterProfile(),
    { user: { userId: "xp1", nickname: "Fan" }, ts: Date.now() },
    support
  );
  assert.equal(recorded.xpBase, 1600);
  assert.equal(recorded.xpAward, 1600);
});

test("catalog covers GG Capybara Finger Heart", () => {
  assert.equal(gifts.normalizeGiftKey("GG"), "GG");
  assert.equal(gifts.normalizeGiftKey("🦫"), "CAPYBARA");
  assert.equal(gifts.normalizeGiftKey("Finger Heart"), "FINGER_HEART");
  assert.equal(gifts.resolveGift({ giftName: "Capybara", coins: 1 }).tier, "T2");
});

test("legacy TikTok names map into enterprise catalog", () => {
  assert.equal(gifts.normalizeGiftKey("Kytice"), "FLOWERS_BOUQUET");
  assert.equal(gifts.normalizeGiftKey("Kobliha"), "DONUT");
  assert.equal(gifts.normalizeGiftKey("Tančící kapybary"), "CAPYBARA");
  assert.equal(gifts.normalizeGiftKey("Osrdíčkovat"), "HEART");
  const capy = gifts.resolveGift({ giftName: "Tančící kapybary", coins: 2200, count: 1, displayName: "Pepa" });
  assert.equal(capy.giftKey, "CAPYBARA");
  assert.equal(capy.tier, "T3");
  assert.equal(gifts.normalizeGiftKey("Bagel"), "FOOD_CARE");
  assert.equal(gifts.normalizeGiftKey("Černý tygr"), "ANIMAL_PREMIUM");
  assert.equal(gifts.normalizeGiftKey("Ohňostroj"), "CELEBRATION");
  assert.equal(gifts.normalizeGiftKey("Rockyho úder"), "BATTLE_POWER");
  const premium = enrichNormalizedSupport(
    {
      platform: "tiktok",
      user: { nickname: "Fan" },
      support: { giftName: "Černý tygr", coins: 1, repeatCount: 1 }
    },
    {}
  ).support;
  assert.equal(premium.giftKey, "ANIMAL_PREMIUM");
  assert.equal(premium.streamTier, "T4");
  assert.ok(premium.giftPriority >= 8);
});

test("public gift map snapshot omits coins", () => {
  const rt = gifts.createRuntime({ persist: false });
  rt.ingest({
    giftName: "Rose",
    coins: 1,
    count: 1,
    platform: "tiktok",
    displayName: "Tomino"
  });
  const snap = rt.getPublicSnapshot(4);
  assert.ok(snap.community.totalGifts >= 1);
  assert.ok(snap.topViewers[0].favoriteGift === "ROSE");
  assert.ok(snap.recentAchievements.some((a) => a.id === "first_gift"));
  assert.equal(snap.community.biggest.miaPoints > 0, true);
  assert.equal(Object.prototype.hasOwnProperty.call(snap.community.biggest, "totalCoins"), false);
  assert.ok(snap.lastPlay.overlayText);
});

test("supporter profile stores gift map achievements", () => {
  const profileMod = require("../scripts/MIA_GIFT_SUPPORTER_PROFILE");
  let state = profileMod.createGiftSupporterProfile();
  const recorded = profileMod.recordGiftSupport(
    state,
    { user: { userId: "ach1", nickname: "Tomino" }, ts: Date.now() },
    { giftName: "Rose", totalCoins: 1, giftKey: "ROSE" }
  );
  state = recorded.state;
  const attached = profileMod.attachGiftMapAchievements(
    state,
    { user: { userId: "ach1", nickname: "Tomino" }, support: { giftKey: "ROSE" } },
    [{ id: "first_gift", label: "První gift", public: true }]
  );
  assert.equal(attached.supporter.favoriteGift, "ROSE");
  assert.ok(attached.supporter.achievements.some((a) => a.id === "first_gift"));
});

test("viewer memory personalizes support thanks", () => {
  const rt = gifts.createRuntime({ persist: false });
  for (let i = 0; i < 4; i += 1) {
    rt.ingest({
      giftName: "Rose",
      coins: 1,
      count: 1,
      platform: "tiktok",
      displayName: "Tomino"
    });
  }
  const memory = rt.getViewerMemory({
    platform: "tiktok",
    displayName: "Tomino"
  });
  assert.equal(memory.favoriteGift, "ROSE");
  assert.ok(memory.totalGifts >= 4);

  const responseEngine = require("../scripts/MIA_RESPONSE_ENGINE");
  const line = responseEngine.buildGiftMemoryLine("mia", "Tomino", "Rose", {
    giftKey: "ROSE",
    giftMemory: { ...memory, currentGiftKey: "ROSE" }
  });
  assert.match(line, /Tomino/);
  assert.match(line, /Rose|růže|typick/i);

  const feeder = responseEngine.buildGiftMemoryLine("kojnozout", "Pepa", "Donut", {
    giftKey: "DONUT",
    giftCare: "CARE",
    giftMemory: {
      totalGifts: 5,
      favoriteGift: "GALAXY",
      careRole: "feeder"
    }
  });
  assert.match(feeder, /krmíš|krmis/i);
});

test("gift map rewards roll into backpack", () => {
  const backpack = require("../scripts/MIA_KOJNOZROUT_BACKPACK");
  const lion = enrichNormalizedSupport(
    {
      platform: "tiktok",
      user: { nickname: "Pepa" },
      support: { giftName: "Lion", coins: 1, repeatCount: 1 }
    },
    {}
  ).support;
  const item = backpack.rollGiftItem(lion, { rng: () => 0 });
  assert.ok(item);
  // feast/boost + rollCanonGiftVariant obměny
  assert.ok(
    ["feast", "boost", "kolac", "box", "koruna", "prapor", "energie", "utok", "posileni"].includes(
      item.id
    )
  );
  assert.equal(item.source, "gift_map");

  const rose = enrichNormalizedSupport(
    {
      platform: "tiktok",
      user: { nickname: "Tomino" },
      support: { giftName: "Rose", coins: 1, repeatCount: 1 }
    },
    {}
  ).support;
  const miss = backpack.rollGiftItem(rose, { rng: () => 0.99 });
  assert.equal(miss, null);
  const hit = backpack.rollGiftItem(rose, { rng: () => 0 });
  // rollCanonGiftVariant může snack obměnit (granule/jablko…)
  assert.ok(["snack", "granule", "jablko", "ryba"].includes(hit.id));
  assert.equal(hit.source, "gift_map");

  let state = backpack.createBackpackState();
  state = backpack.addItemToBackpack(state, "Pepa", item, { source: "gift_map" });
  const view = backpack.getUserBackpackView(state, "Pepa");
  assert.equal(view.itemCount, 1);
  assert.equal(view.items[0].id, item.id);
});

console.log("gift_map_contract: all passed");
