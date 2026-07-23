"use strict";

const { buildCatalog, saveCatalog, loadCatalog, CATALOG_PATH } = require("./MIA_MEDIA_CATALOG");
const { composeFromTemplate } = require("./MIA_MEDIA_TEMPLATE_RENDERER");

async function main() {
  const cmd = process.argv[2] || "scan";

  if (cmd === "scan") {
    const catalog = buildCatalog();
    const out = saveCatalog(catalog);
    console.log(JSON.stringify({
      ok: true,
      path: out,
      summary: catalog.summary,
      intelligence: catalog.intelligence,
      totalPhotos: catalog.totalPhotos,
      totalVideos: catalog.totalVideos,
      obsAssigned: catalog.obsAssignments.length,
      profilePool: catalog.profilePool.length,
      tierPools: Object.fromEntries(
        Object.entries(catalog.tierRotationPools || {}).map(([tier, pool]) => [tier, pool.length])
      )
    }, null, 2));
    return;
  }

  if (cmd === "status") {
    const catalog = loadCatalog();
    if (!catalog) {
      console.log(JSON.stringify({ ok: false, reason: "catalog_missing", hint: "node scripts/media_catalog_scan.js scan" }, null, 2));
      process.exitCode = 1;
      return;
    }
    console.log(JSON.stringify({
      ok: true,
      generatedAt: catalog.generatedAt,
      summary: catalog.summary,
      obsAssignments: catalog.obsAssignments,
      profilePool: catalog.profilePool.slice(0, 10)
    }, null, 2));
    return;
  }

  if (cmd === "preview") {
    const templateId = process.argv[3] || "donator_spotlight";
    const userLabel = process.argv[4] || "Top dárce";
    const catalog = loadCatalog() || buildCatalog();
    const result = await composeFromTemplate(templateId, { userLabel, catalog, tier: "T2" });
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (cmd === "preview-all") {
    const catalog = loadCatalog() || buildCatalog();
    const { loadTemplates } = require("./MIA_MEDIA_CATALOG");
    const templates = loadTemplates().templates || {};
    const results = [];
    for (const [id, tpl] of Object.entries(templates)) {
      if (tpl.type === "obs_video") {
        results.push({ templateId: id, skipped: true, reason: "obs_video" });
        continue;
      }
      const result = await composeFromTemplate(id, {
        userLabel: "Spinák komunita",
        catalog,
        tier: tpl.minTier || "T2"
      });
      results.push({ templateId: id, ok: result.ok, imageUrl: result.imageUrl });
    }
    console.log(JSON.stringify({ ok: true, previews: results }, null, 2));
    return;
  }

  console.log(`Usage:
  node scripts/media_catalog_scan.js scan
  node scripts/media_catalog_scan.js status
  node scripts/media_catalog_scan.js preview [templateId] [userLabel]
  node scripts/media_catalog_scan.js preview-all`);
  process.exitCode = 1;
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err?.stack || err);
    process.exitCode = 1;
  });
}
