#!/usr/bin/env node
"use strict";

const { buildAwaySceneManifest, formatAwaySceneText } = require("./MIA_OBS_AWAY_SCENE");

const port = Number(process.env.PORT || 3000);
console.log(formatAwaySceneText(buildAwaySceneManifest({ port })));
