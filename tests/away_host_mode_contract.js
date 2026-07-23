"use strict";

const assert = require("assert/strict");
const awayMode = require("../scripts/MIA_AWAY_MODE");
const giftPresentation = require("../scripts/MIA_GIFT_PRESENTATION");
const giftEconomy = require("../scripts/MIA_GIFT_ECONOMY");

function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
  } catch (err) {
    console.error(`❌ ${name}`);
    console.error(err && err.stack ? err.stack : err);
    process.exitCode = 1;
  }
}

console.log("\n---- AWAY HOST MODE CONTRACT ----\n");

test("nejsem_tu world mode is detected", () => {
  assert.equal(
    awayMode.isNejsemTuWorldMode({ outputState: { worldMode: "nejsem_tu" } }),
    true
  );
  assert.equal(
    awayMode.isNejsemTuWorldMode({ outputState: { worldMode: "default" } }),
    false
  );
});

test("host snapshot distinguishes away vs solo vs live", () => {
  const away = awayMode.buildHostModeSnapshot({
    outputState: { worldMode: "nejsem_tu", soloStreamState: { phase: "main" } }
  });
  assert.equal(away.hostMode, "nejsem_tu");
  assert.match(away.label, /NEJSEM TU/);

  const solo = awayMode.buildHostModeSnapshot({
    outputState: { worldMode: "default", soloStreamState: { phase: "solo" } }
  });
  assert.equal(solo.hostMode, "solo_stream");
  assert.match(solo.label, /SOLO/);

  const live = awayMode.buildHostModeSnapshot({
    outputState: { worldMode: "default", soloStreamState: { phase: "main" } }
  });
  assert.equal(live.hostMode, "live");
});

test("away scene resolves from env", () => {
  const scene = awayMode.resolveAwaySceneName({}, {
    MIA_AWAY_SCENE: "SPINAK_NEJSEM_TU"
  });
  assert.equal(scene, "SPINAK_NEJSEM_TU");
});

console.log("\n---- GIFT PRESENTATION CONTRACT ----\n");

test("T4 boss uses combo flash only", () => {
  const policy = giftEconomy.resolveBossPresentationPolicy("T4");
  assert.equal(policy.useComboFlash, true);
  assert.equal(policy.useSpeechBossSubtext, false);
  assert.equal(policy.miaInterrupt, false);
});

test("T5 boss enables speech interrupt", () => {
  const policy = giftEconomy.resolveBossPresentationPolicy("T5");
  assert.equal(policy.useComboFlash, true);
  assert.equal(policy.useSpeechBossSubtext, true);
  assert.equal(policy.miaInterrupt, true);
});

test("presentation plan merges combo and boss without duplicate speech on T4", () => {
  const plan = giftPresentation.resolveGiftPresentationPlan(
    {
      streamTier: "T4",
      bossEvent: "boss_arrival",
      bossBanner: "PŘIŠEL BOSS",
      giftName: "Galaxy"
    },
    { userLabel: "Rose" }
  );

  assert.equal(plan.comboMoment.kind, "BOSS");
  assert.equal(plan.comboSpeechPayload, null);
  assert.equal(plan.voicePreempt, false);

  const patched = giftPresentation.applyBossSpeechPatch(
    { overlayPayload: { text: "Děkuju", subtext: "", priority: 3 } },
    {
      streamTier: "T4",
      bossEvent: "boss_arrival",
      giftName: "Galaxy"
    }
  );
  assert.equal(patched.overlayPayload.text, "Děkuju");
});

test("T6 boss speech patch replaces main text and preempts voice", () => {
  const patched = giftPresentation.applyBossSpeechPatch(
    { overlayPayload: { text: "Děkuju", subtext: "", priority: 3 }, meta: {} },
    {
      streamTier: "T6",
      bossEvent: "legend_event",
      bossBanner: "LEGENDA STREAMU",
      giftName: "Universe"
    }
  );

  assert.equal(patched.overlayPayload.text, "LEGENDA STREAMU");
  assert.equal(patched.voicePreempt, true);
  assert.equal(patched.meta.miaInterrupt, true);
});
