"use strict";

/**
 * Aplikuje ruční vizuální review na config/media-visual-review.json
 * a synchronizuje tier do media-intake + OBS overrides.
 */

const fs = require("fs");
const path = require("path");
const { loadManifest, saveManifest } = require("./media_visual_review");

const PROJECT_ROOT = path.resolve(__dirname, "..");
const INTAKE_PATH = path.join(PROJECT_ROOT, "config", "media-intake-overrides.json");
const OVERRIDES_PATH = path.join(PROJECT_ROOT, "config", "stream-media-overrides.json");

/** obsSlot nebo rel → finální review po prohlédnutí snímku */
const CURATED = {
  "videos/hailuo_1769712635.mp4": {
    tier: "T1",
    contentKind: "short_animation",
    theme: "cute_ai",
    visualSummary: "Hailuo AI — medvídek s galaxii v srdci, cute T1 animace",
    tags: ["hailuo", "cute", "love"]
  },
  "videos/hailuo_1769864687 (1).mp4": {
    tier: "T1",
    contentKind: "short_animation",
    theme: "cute_ai",
    visualSummary: "Hailuo AI — krátká cute/fantasy animace, T1 slot",
    tags: ["hailuo", "cute"]
  },
  "videos/hailuo_1769864687.mp4": {
    tier: "T1",
    contentKind: "short_animation",
    theme: "cute_ai",
    visualSummary: "Hailuo AI — krátká cute animace, T1 slot",
    tags: ["hailuo", "cute"]
  },
  "videos/hailuo_1769867013.mp4": {
    tier: "T2",
    contentKind: "donator_moment",
    theme: "fantasy_animal",
    visualSummary: "Hailuo AI — divoká prasata + fialový lightning, silnější než cute T1 → T2",
    tags: ["hailuo", "fantasy", "epic_short"]
  },
  "videos/hailuo_1769867637.mp4": {
    tier: "T1",
    contentKind: "short_animation",
    theme: "cute_ai",
    visualSummary: "Hailuo AI — krátká AI animace, T1 rotace",
    tags: ["hailuo"]
  },
  "videos/hailuo_1769880564.mp4": {
    tier: "T1",
    contentKind: "short_animation",
    theme: "cute_ai",
    visualSummary: "Hailuo AI — krátká AI animace, T1 rotace",
    tags: ["hailuo"]
  },
  "videos/VID-20260201-WA0011.mp4": {
    tier: "T3",
    contentKind: "story_music",
    theme: "pixverse_epic",
    visualSummary: "PixVerse — King Kong gorilla + blesky, krátký ale epic moment → T3",
    tags: ["whatsapp", "pixverse", "epic"]
  },
  "videos/VID-20260201-WA0009.mp4": {
    tier: "T2",
    contentKind: "donator_moment",
    theme: "community_clip",
    visualSummary: "WhatsApp komunitní clip — střední energie, T2",
    tags: ["whatsapp", "community"]
  },
  "videos/VID-20260305-WA0020.mp4": {
    tier: "T2",
    contentKind: "donator_moment",
    theme: "community_clip",
    visualSummary: "WhatsApp komunitní clip, T2",
    tags: ["whatsapp"]
  },
  "videos/VID-20260318-WA0186.mp4": {
    tier: "T2",
    contentKind: "donator_moment",
    theme: "community_clip",
    visualSummary: "WhatsApp komunitní clip, T2",
    tags: ["whatsapp"]
  },
  "videos/lv_0_20260131151957.mp4": {
    tier: "T2",
    contentKind: "donator_moment",
    theme: "action_sport",
    visualSummary: "CapCut — BMX fialové kolo, akční sport clip, T2",
    tags: ["lv_edit", "sport", "capcut"]
  },
  "videos_2/lv_0_20260411124814.mp4": {
    tier: "T2",
    contentKind: "donator_moment",
    theme: "czech_meme",
    visualSummary: "LV — ŠÉFKUCHAŘ CHAOSU český kuchyňský meme, 3 s, T2 hit",
    tags: ["lv_edit", "meme", "czech", "koj_overlay"]
  },
  "videos_2/VID-20260318-WA0333.mp4": {
    tier: "T3",
    contentKind: "story_music",
    theme: "prague_pixverse",
    visualSummary: "PixVerse Praha — gargoyle vs dívka na Karlův mostě, fantasy série, T3",
    tags: ["whatsapp", "pixverse", "prague", "story_arc"]
  },
  "videos_2/2026-06-25-152308764.mp4": {
    tier: "T3",
    contentKind: "story_music",
    theme: "wholesome_romance",
    visualSummary: "Pixar styl — berušky romance západ slunce, wholesome T3",
    tags: ["photos_export", "wholesome", "romance"]
  },
  "videos/lv_7518394866301209909_20260302101327.mp4": {
    tier: "T3",
    contentKind: "story_music",
    theme: "community_brand",
    visualSummary: "LV — PRSTITEL TEAM van u řeky, komunitní branding clip, T3",
    tags: ["lv_edit", "community", "brand"]
  },
  "videos/lv_7518585147663322421_20260305173214.mp4": {
    tier: "T3",
    contentKind: "story_music",
    theme: "lv_story",
    visualSummary: "LV edit — příběhový komunitní clip, T3 rotace",
    tags: ["lv_edit", "story"]
  },
  "videos/VID-20260401-WA0022.mp4": {
    tier: "T3",
    contentKind: "story_music",
    theme: "community_story",
    visualSummary: "WhatsApp — delší příběhový clip s hudbou, T3",
    tags: ["whatsapp", "story"]
  },
  "videos/VID-20260305-WA0019.mp4": {
    tier: "T3",
    contentKind: "story_music",
    theme: "community_story",
    visualSummary: "WhatsApp — příběh + hudba, T3",
    tags: ["whatsapp"]
  },
  "videos_2/lv_0_20260411115550.mp4": {
    tier: "T3",
    contentKind: "story_music",
    theme: "vfx_abstract",
    visualSummary: "LV — fialový energy swirl abstraktní VFX, spíš T3 přechod než T4 boss",
    tags: ["lv_edit", "vfx", "abstract"]
  },
  "videos_2/2026-04-19-121304490.mp4": {
    tier: "T4",
    contentKind: "story_epic",
    theme: "cyber_matrix",
    visualSummary: "CapCut — muž digital rain Matrix styl, 156 s vertikál, T4 cyber epic",
    tags: ["photos_export", "cyber", "capcut"]
  },
  "videos_2/VID-20260419-WA0070.mp4": {
    tier: "T4",
    contentKind: "story_epic",
    theme: "cyber_matrix",
    visualSummary: "DUPLICITNÍ kopie 2026-04-19-121304490 — stejný Matrix clip",
    tags: ["duplicate", "block_candidate"]
  },
  "videos_2/2026-06-30-170837281.mp4": {
    tier: "T2",
    contentKind: "donator_moment",
    theme: "action_sport",
    visualSummary: "CapCut vertikál — bike jump z rampy, 36 s akce, T2 ne epic",
    tags: ["photos_export", "sport", "capcut"]
  },
  "videos_2/VID-20260504-WA0001.mp4": {
    tier: "T3",
    contentKind: "story_music",
    theme: "pixverse_fairy",
    visualSummary: "PixVerse — dlouhá ladybug pohádka 198 s, cozy fantasy → T3 story (ne T4 boss)",
    tags: ["whatsapp", "pixverse", "fairy", "long"]
  },
  "videos/lv_7569904188230995253_20260217112138.mp4": {
    tier: "T3",
    contentKind: "donator_moment",
    theme: "top_donator",
    visualSummary: "PixVerse — TOP DONATORS Martin279 personal tribute, komunitní T3",
    tags: ["lv_edit", "donator", "personal"]
  },
  "videos_2/lv_0_20260411115935.mp4": {
    tier: "T5",
    contentKind: "story_legend",
    theme: "mia_koj_signature",
    visualSummary: "LV — Kojnožrout glitch mascot srdce, signature MIA T5 WOW",
    tags: ["lv_edit", "koj", "signature", "boss_cinematic_pair"]
  },
  "videos_2/lv_0_20260411120454.mp4": {
    tier: "T5",
    contentKind: "story_legend",
    theme: "mia_koj_signature",
    visualSummary: "LV — Kojnožrout celebrate party, signature T5",
    tags: ["lv_edit", "koj", "signature"]
  },
  "videos_2/2026-06-21-201620647.mp4": {
    tier: "T4",
    contentKind: "story_epic",
    theme: "community_duel_promo",
    visualSummary: "LAJKOVACÍ DUELY promo — Prstitel vs Tomino, VS grafika + auta; intro černé, obsah od ~90 s",
    tags: ["photos_export", "duel", "community", "promo"]
  },
  "videos_2/lv_7574590375705480453_20260516152347 (1).mp4": {
    tier: "T5",
    contentKind: "story_legend",
    theme: "mia_koj_signature",
    visualSummary: "LV — Koj FEED ME / DATA IS LOVE, kanon pet T5 signature",
    tags: ["lv_edit", "koj", "signature", "feed_me"]
  },
  "videos_2/VID-20260318-WA0328.mp4": {
    tier: "PROFILE",
    contentKind: "profile_reel",
    theme: "prague_romance",
    visualSummary: "PixVerse — pár na Karlův mostě 5 s, profilové video dárce",
    tags: ["whatsapp", "pixverse", "prague", "profile"]
  },
  "videos_2/VID-20260419-WA0095.mp4": {
    tier: "PROFILE",
    contentKind: "profile_reel",
    theme: "cute_profile",
    visualSummary: "PixVerse — roztomilá koule ve dřezu splash, 5 s PROFILE",
    tags: ["whatsapp", "pixverse", "cute", "profile"]
  },
  "videos/VID-20260201-WA0015.mp4": {
    tier: "PROFILE",
    contentKind: "profile_reel",
    theme: "rose_meme",
    visualSummary: "PixVerse — Rose meme muž s růží, bláznivý PROFILE / T1 Rose reakce",
    tags: ["whatsapp", "pixverse", "rose", "meme", "profile"]
  },
  "videos/VID-20260201-WA0019.mp4": {
    tier: "PROFILE",
    contentKind: "profile_reel",
    theme: "community_profile",
    visualSummary: "WhatsApp — krátké profilové video dárce, PROFILE slot",
    tags: ["whatsapp", "profile"]
  }
};

function applyProvisionalTier(item = {}) {
  const rel = item.rel || "";
  const pattern = item.pattern || "";
  const dur = item.durationSec || 0;
  const name = (item.name || "").toLowerCase();

  const signatureT5 = new Set([
    "videos_2/lv_0_20260411115935.mp4",
    "videos_2/lv_0_20260411120454.mp4",
    "videos_2/lv_7574590375705480453_20260516152347 (1).mp4"
  ]);
  if (signatureT5.has(rel)) {
    return {
      tier: "T5",
      contentKind: "story_legend",
      theme: "mia_koj_signature",
      visualSummary: "LV Koj signature — vizuálně ověřeno",
      tags: ["lv_edit", "koj", "signature"]
    };
  }

  if (pattern === "hailuo_ai" || /^hailuo_/.test(name)) {
    const tier = name.includes("7013") ? "T2" : "T1";
    return {
      tier,
      contentKind: tier === "T2" ? "donator_moment" : "short_animation",
      theme: tier === "T2" ? "fantasy_animal" : "cute_ai",
      visualSummary: tier === "T2" ? "Hailuo — epic krátká animace" : "Hailuo — cute T1 animace",
      tags: ["hailuo"]
    };
  }

  if (rel.includes("20260411124814")) {
    return {
      tier: "T2",
      contentKind: "donator_moment",
      theme: "czech_meme",
      visualSummary: "LV ŠÉFKUCHAŘ CHAOSU — český meme",
      tags: ["lv_edit", "meme", "czech"]
    };
  }

  if (rel.includes("2026-06-30-170940174")) {
    return {
      tier: "T4",
      contentKind: "story_epic",
      theme: "cinematic_sunset",
      visualSummary: "CapCut — zvonice + západ slunce nad náměstím, cinematic T4",
      tags: ["photos_export", "cinematic"]
    };
  }

  if (pattern === "whatsapp_video" || pattern === "wa_desktop_video") {
    if (dur > 0 && dur < 15) {
      return {
        tier: "PROFILE",
        contentKind: "profile_reel",
        theme: "community_profile",
        visualSummary: "WhatsApp krátké profilové video",
        tags: ["whatsapp", "profile"]
      };
    }
    if (dur < 45) {
      return {
        tier: "T2",
        contentKind: "donator_moment",
        theme: "community_clip",
        visualSummary: "WhatsApp komunitní clip T2",
        tags: ["whatsapp"]
      };
    }
    if (dur < 120) {
      return {
        tier: "T3",
        contentKind: "story_music",
        theme: "community_story",
        visualSummary: "WhatsApp příběhový clip T3",
        tags: ["whatsapp", "story"]
      };
    }
    return {
      tier: "T4",
      contentKind: "story_epic",
      theme: "community_epic",
      visualSummary: "WhatsApp dlouhý epic clip T4",
      tags: ["whatsapp", "long"]
    };
  }

  if (pattern === "lv_edit") {
    if (dur < 20) {
      return {
        tier: "T2",
        contentKind: "donator_moment",
        theme: "lv_short",
        visualSummary: "LV krátký edit T2",
        tags: ["lv_edit"]
      };
    }
    if (dur < 75) {
      return {
        tier: "T3",
        contentKind: "story_music",
        theme: "lv_story",
        visualSummary: "LV příběhový edit T3",
        tags: ["lv_edit"]
      };
    }
    return {
      tier: "T4",
      contentKind: "story_epic",
      theme: "lv_epic",
      visualSummary: "LV dlouhý edit — cap T4 bez Koj signature",
      tags: ["lv_edit", "long"]
    };
  }

  if (pattern === "photos_export") {
    if (dur < 15) {
      return {
        tier: "T2",
        contentKind: "donator_moment",
        theme: "capcut_short",
        visualSummary: "Photos export krátký clip T2",
        tags: ["photos_export"]
      };
    }
    if (dur < 45) {
      return {
        tier: "T3",
        contentKind: "story_music",
        theme: "capcut_story",
        visualSummary: "Photos export střední clip T3",
        tags: ["photos_export"]
      };
    }
    return {
      tier: "T4",
      contentKind: "story_epic",
      theme: "capcut_epic",
      visualSummary: "Photos export dlouhý clip — cap T4 (vizuálně neověřeno na T5)",
      tags: ["photos_export", "long"]
    };
  }

  let tier = safeString(item.autoTier, "T3").toUpperCase();
  if (tier === "T5") tier = "T4";
  return {
    tier,
    contentKind: item.autoKind || "story_music",
    theme: pattern || "library",
    visualSummary: `Provisional tier z auto klasifikace (${pattern || "other"})`,
    tags: item.tags || []
  };
}

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function applyProvisional(manifest) {
  const now = new Date().toISOString();
  let provisional = 0;

  for (const item of manifest.items || []) {
    if (item.visualReviewed || CURATED[item.rel]) continue;
    if (!item.framePath) continue;

    const row = applyProvisionalTier(item);
    item.tier = row.tier;
    item.contentKind = row.contentKind;
    item.theme = row.theme;
    item.visualSummary = row.visualSummary;
    item.tags = [...new Set([...(item.tags || []), ...(row.tags || [])])];
    item.visualReviewed = true;
    item.reviewConfidence = "provisional";
    item.reviewedAt = now;
    provisional += 1;
  }

  manifest.provisionalCount = provisional;
  return manifest;
}

function applyCurated(manifest) {
  const now = new Date().toISOString();
  let reviewed = 0;

  for (const item of manifest.items || []) {
    const row = CURATED[item.rel];
    if (!row) continue;
    item.tier = row.tier;
    item.contentKind = row.contentKind;
    item.theme = row.theme;
    item.visualSummary = row.visualSummary;
    item.tags = [...new Set([...(item.tags || []), ...(row.tags || [])])];
    item.visualReviewed = true;
    item.reviewConfidence = "curated";
    item.reviewedAt = now;
    reviewed += 1;
  }

  manifest.reviewedCount = reviewed;
  manifest.reviewedAt = now;
  return manifest;
}

function buildIntakeFromManifest(manifest) {
  const assignments = [];
  for (const item of manifest.items || []) {
    if (!item.visualReviewed) continue;
    assignments.push({
      rel: item.rel,
      tier: item.tier,
      contentKind: item.contentKind,
      theme: item.theme || null,
      obsSlot: item.obsSlot || null,
      note: item.visualSummary
    });
  }
  return {
    version: 1,
    description: "Finální tier po vizuálním review (OBS pinned + intake)",
    updatedAt: manifest.reviewedAt,
    assignments
  };
}

function syncPinnedSlots(manifest, overrides) {
  const next = { ...(overrides.pinnedSlots || {}) };
  for (const item of manifest.items || []) {
    if (!item.obsSlot || !item.visualReviewed) continue;
    next[item.obsSlot] = item.rel;
  }

  const blocked = new Set(overrides.blockedRel || []);
  blocked.add("videos_2/VID-20260419-WA0070.mp4");

  return {
    ...overrides,
    description: "OBS sloty — tier po vizuálním review 2026-07-04",
    pinnedSlots: next,
    blockedRel: [...blocked]
  };
}

function main() {
  const manifest = loadManifest();
  if (!manifest?.items?.length) {
    console.error(JSON.stringify({ ok: false, reason: "run media_visual_review.js pinned first" }));
    process.exitCode = 1;
    return;
  }

  applyCurated(manifest);
  applyProvisional(manifest);

  const saved = saveManifest(manifest.items, {
    mode: manifest.mode || "all",
    count: manifest.items.length,
    probed: manifest.probed,
    framed: manifest.framed,
    reviewedCount: manifest.reviewedCount,
    provisionalCount: manifest.provisionalCount,
    reviewedAt: manifest.reviewedAt
  });

  const intake = buildIntakeFromManifest(manifest);
  fs.writeFileSync(INTAKE_PATH, JSON.stringify(intake, null, 2), "utf8");

  const overrides = JSON.parse(fs.readFileSync(OVERRIDES_PATH, "utf8"));
  const synced = syncPinnedSlots(manifest, overrides);
  fs.writeFileSync(OVERRIDES_PATH, JSON.stringify(synced, null, 2), "utf8");

  console.log(
    JSON.stringify(
      {
        ok: true,
        reviewed: manifest.reviewedCount,
        provisional: manifest.provisionalCount || 0,
        intakePath: INTAKE_PATH,
        overridesPath: OVERRIDES_PATH,
        blocked: synced.blockedRel
      },
      null,
      2
    )
  );
}

if (require.main === module) {
  main();
}

module.exports = { CURATED, applyCurated, applyProvisional, buildIntakeFromManifest };
