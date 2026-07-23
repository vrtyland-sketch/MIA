"use strict";

const {
  loadCatalog,
  loadTemplates,
  pickProfileForUser,
  resolveMediaAbs
} = require("./MIA_MEDIA_CATALOG");
const { composeFromTemplate } = require("./MIA_MEDIA_TEMPLATE_RENDERER");
const { composeGiftMoment, shouldComposeGiftVisual } = require("./MIA_GIFT_VISUAL_COMPOSER");
const giftAnimationContext = require("./MIA_GIFT_ANIMATION_CONTEXT");

function buildComposeInput(normalized = {}, actionResult = {}, giftProfile = {}) {
  const giftAnimation =
    actionResult?.giftAnimation ||
    normalized?.giftAnimation ||
    giftAnimationContext.buildGiftAnimationContext(
      actionResult?.kojnozoutState || normalized?.kojnozoutState || {},
      actionResult?.streamState || normalized?.streamState || {},
      giftProfile
    );

  const kojMood = giftAnimationContext.resolveGiftReactionMood(giftAnimation, giftProfile);
  const careOffset = giftAnimationContext.resolveCareVariantOffset(giftAnimation);

  return {
    giftAnimation,
    kojMood,
    careOffset,
    primaryNeed: giftAnimation.primaryNeed
  };
}

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function tierRank(tier = "T1") {
  return Number(safeString(tier, "T1").replace(/\D/g, "")) || 1;
}

function resolveGiftTemplateId(tier = "T1", templates = loadTemplates()) {
  const t = tierRank(tier);
  if (t >= 4) return "donator_spotlight";
  if (t >= 3) return "profile_card_warm";
  if (t >= 2) return "donator_spotlight";
  return null;
}

async function composeGiftOverlay(normalized = {}, actionResult = {}) {
  if (typeof shouldComposeGiftVisual === "function" && !shouldComposeGiftVisual(normalized, actionResult)) {
    return { ok: false, reason: "skipped_by_policy" };
  }

  const support = normalized?.support || {};
  const tier = safeString(actionResult?.tier || support.tier, "T1").toUpperCase();
  const userLabel = safeString(
    normalized?.user?.nickname ||
      normalized?.user?.username ||
      normalized?.username ||
      normalized?.nickname,
    "Divák"
  );
  const catalog = loadCatalog();
  const avatarLocalPath = pickProfileForUser(catalog, userLabel);
  const templateId = resolveGiftTemplateId(tier);

  const giftProfile =
    typeof require("./MIA_GIFT_MAP").resolveGiftProfile === "function"
      ? require("./MIA_GIFT_MAP").resolveGiftProfile(support)
      : {};

  const anim = buildComposeInput(normalized, actionResult, giftProfile);

  const baseInput = {
    userLabel,
    avatarUrl: safeString(
      normalized?.user?.avatarUrl ||
        normalized?.user?.avatar ||
        normalized?.avatarUrl
    ),
    avatarLocalPath,
    profilePath: avatarLocalPath,
    catalog,
    tier,
    giftName: safeString(support.giftName || normalized.giftName),
    thankText: safeString(actionResult?.overlayPayload?.text),
    caption: safeString(actionResult?.overlayPayload?.text),
    subcaption: `${tier} · Spinák · děkujeme`,
    giftKey: safeString(giftProfile.key),
    kojMood: anim.kojMood,
    giftAnimation: anim.giftAnimation,
    careOffset: anim.careOffset,
    primaryNeed: anim.primaryNeed
  };

  if (templateId) {
    const tpl = await composeFromTemplate(templateId, baseInput);
    if (tpl?.ok) {
      return {
        ...tpl,
        deliveryMode: "template_overlay",
        templateId,
        tier,
        kojMood: anim.kojMood,
        primaryNeed: anim.primaryNeed
      };
    }
  }

  const classic = await composeGiftMoment({
    ...baseInput,
    effectProgram: safeString(giftProfile.effectProgram, "generic_support")
  });

  return {
    ...classic,
    deliveryMode: "classic_gift_moment",
    tier,
    kojMood: anim.kojMood,
    primaryNeed: anim.primaryNeed
  };
}

function getCatalogSnapshot() {
  const catalog = loadCatalog();
  if (!catalog) return { ok: false, reason: "catalog_missing" };

  return {
    ok: true,
    generatedAt: catalog.generatedAt,
    summary: catalog.summary,
    obsAssignments: catalog.obsAssignments,
    profilePoolCount: catalog.profilePool?.length || 0,
    tiers: {
      T1: catalog.obsAssignments?.filter((a) => a.tier === "T1").length || 0,
      T2: catalog.obsAssignments?.filter((a) => a.tier === "T2").length || 0,
      T3: catalog.obsAssignments?.filter((a) => a.tier === "T3").length || 0,
      T4: catalog.obsAssignments?.filter((a) => a.tier === "T4").length || 0
    }
  };
}

module.exports = {
  tierRank,
  resolveGiftTemplateId,
  composeGiftOverlay,
  getCatalogSnapshot,
  resolveMediaAbs
};
