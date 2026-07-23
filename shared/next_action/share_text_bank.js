"use strict";

/**
 * shared/next_action/share_text_bank.js
 *
 * ČISTÁ TEXTOVÁ VRSTVA PRO NOVOU SHARE ARCHITEKTURU
 *
 * Cíl:
 * - oddělit texty od action builderu
 * - připravit prostor pro další ladění osobnosti
 * - zatím stále bezpečně bokem od live runtime
 */

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function firstName(label = "") {
  const normalized = safeString(label).replace(/\s+/g, " ").trim();
  if (!normalized) return "někdo";
  return normalized.split(" ")[0] || normalized;
}

function pickVariant(list = [], seed = 0, fallback = "") {
  if (!Array.isArray(list) || list.length === 0) {
    return fallback;
  }

  const safeSeed = Math.abs(toNumber(seed, 0));
  const index = safeSeed % list.length;
  return list[index] || fallback;
}

function buildSeed(input = {}) {
  const userShareCount = toNumber(input.userShareCount, 0);
  const totalCommunityShares = toNumber(input.totalCommunityShares, 0);
  const bowlPercent = toNumber(input.bowlPercent, 0);
  return userShareCount + totalCommunityShares + bowlPercent;
}

function getShareTextVariants(mode = "", speaker = "mia", ctx = {}) {
  const name = firstName(ctx.userLabel);

  if (speaker === "kojnozout") {
    if (mode === "share_wave") {
      return [
        "Tohle už je share lavina. Komunita nás žene dál.",
        "Tohle už není jedno sdílení. Tohle je share vlna.",
        "Komunita to tlačí dál. Tohle už je pořádná share jízda."
      ];
    }

    if (mode === "share_milestone") {
      return [
        `Máme ${ctx.totalCommunityShares} sdílení. To už pěkně šustí prostorem.`,
        `Už jsme na ${ctx.totalCommunityShares} sdíleních. To se mi zatraceně líbí.`,
        `${ctx.totalCommunityShares} sdílení. Tohle už není náhoda.`
      ];
    }

    if (mode === "share_streak") {
      return [
        `${name} nás sdílí už potřetí. To je pěkně podezřelá oddanost.`,
        `${name} jede share streak. To už začíná být skoro posedlost.`,
        `${name} nás posílá dál zase a zase. To beru.`
      ];
    }

    if (mode === "share_repeat") {
      return [
        `${name} nás poslal dál znovu. Dobře ty.`,
        `${name} jede další share. To se počítá.`,
        `${name} nás nenechal ležet na místě. Další share je doma.`
      ];
    }

    return [
      `${name} nás poslal dál. To se počítá.`,
      `${name} hodil share. Pěknej tah.`,
      `${name} nás šoupnul dál mezi lidi. Dobrá práce.`
    ];
  }

  if (mode === "share_wave") {
    return [
      "Tohle už je share vlna. Děkujeme celé komunitě, že nás posílá dál.",
      "Komunita to krásně rozjela. Tohle už je opravdová share vlna.",
      "Děkujeme, tohle už je silný komunitní share moment."
    ];
  }

  if (mode === "share_milestone") {
    return [
      `Máme už ${ctx.totalCommunityShares} sdílení. To je krásný komunitní posun.`,
      `Už jsme na ${ctx.totalCommunityShares} sdíleních. Děkujeme, tohle má sílu.`,
      `${ctx.totalCommunityShares} sdílení. To už je opravdu vidět.`
    ];
  }

  if (mode === "share_streak") {
    return [
      `${name}, ty nás dnes šíříš ve velkém. Děkujeme za share streak.`,
      `${name}, další sdílení od tebe. Toho si moc vážíme.`,
      `${name}, jedeš share streak. Děkujeme, že nás posíláš dál.`
    ];
  }

  if (mode === "share_repeat") {
    return [
      `${name}, děkujeme za další sdílení.`,
      `${name}, poslal jsi nás dál znovu. Díky moc.`,
      `${name}, další share od tebe. Toho si všímáme.`
    ];
  }

  return [
    `${name}, děkujeme za sdílení.`,
    `${name}, díky, že nás posíláš dál.`,
    `${name}, vážíme si toho, že jsi nás sdílel.`
  ];
}

function getShareSubtextVariants(mode = "", platform = "unknown", ctx = {}) {
  if (mode === "share_wave") {
    return [
      `share vlna • komunita • ${platform}`,
      `community wave • ${platform}`,
      `více sdílení najednou • ${platform}`
    ];
  }

  if (mode === "share_milestone") {
    return [
      `milestone • celkem ${ctx.totalCommunityShares} share • ${platform}`,
      `komunitní mezník • ${ctx.totalCommunityShares} • ${platform}`,
      `share milestone • ${platform}`
    ];
  }

  if (mode === "share_streak") {
    return [
      `share streak • opakované sdílení • ${platform}`,
      `opakovaný share support • ${platform}`,
      `share streak aktivní • ${platform}`
    ];
  }

  if (mode === "share_repeat") {
    return [
      `repeat share • ${platform}`,
      `další sdílení od stejného člověka • ${platform}`,
      `repeat support • ${platform}`
    ];
  }

  return [
    `single share • ${platform}`,
    `jednotlivé sdílení • ${platform}`,
    `share support • ${platform}`
  ];
}

function resolveHoldMs(mode = "") {
  if (mode === "share_wave") return 5200;
  if (mode === "share_milestone") return 4800;
  if (mode === "share_streak") return 4600;
  if (mode === "share_repeat") return 4200;
  return 3800;
}

function resolvePriority(mode = "") {
  if (mode === "share_wave") return 3;
  if (mode === "share_milestone") return 3;
  if (mode === "share_streak") return 2;
  if (mode === "share_repeat") return 2;
  return 1;
}

function buildShareTextPackage(input = {}) {
  const mode = safeString(input.mode, "share_single");
  const speaker = safeString(input.speaker, "mia");
  const platform = safeString(input.platform, "unknown");

  const ctx = {
    userLabel: safeString(input.userLabel, "někdo"),
    userShareCount: toNumber(input.userShareCount, 0),
    totalCommunityShares: toNumber(input.totalCommunityShares, 0),
    bowlPercent: toNumber(input.bowlPercent, 0),
    mood: safeString(input.mood, "neutral")
  };

  const seed = buildSeed(ctx);

  const text = pickVariant(
    getShareTextVariants(mode, speaker, ctx),
    seed,
    "Děkujeme za sdílení."
  );

  const subtext = pickVariant(
    getShareSubtextVariants(mode, platform, ctx),
    seed,
    `share • ${platform}`
  );

  return {
    text,
    subtext,
    holdMs: resolveHoldMs(mode),
    priority: resolvePriority(mode)
  };
}

module.exports = {
  buildShareTextPackage,
  resolveHoldMs,
  resolvePriority
};