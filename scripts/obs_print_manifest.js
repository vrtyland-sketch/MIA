#!/usr/bin/env node
"use strict";

const { buildLiveManifest, formatManifestText } = require("./MIA_OBS_LIVE_MANIFEST");
const { formatAwaySceneText, buildAwaySceneManifest } = require("./MIA_OBS_AWAY_SCENE");

const port = Number(process.env.PORT || 3000);
console.log(formatManifestText(buildLiveManifest({ port })));
console.log("");
console.log(formatAwaySceneText(buildAwaySceneManifest({ port })));
