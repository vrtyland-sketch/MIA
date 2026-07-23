"use strict";

const assert = require("assert");
const {
  parseStreamerMediaCommand,
  isSoloHostMode,
  listLongMediaCandidates,
  pickRotatedMedia,
  MIN_LONG_MEDIA_MS
} = require("../scripts/MIA_STREAMER_MEDIA_COMMAND");
const { resolveStreamerAccess } = require("../scripts/MIA_STREAMER_ACCESS");

function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
  } catch (err) {
    console.error(`❌ ${name}`);
    console.error(err);
    process.exitCode = 1;
  }
}

test("parses mia play song and video commands", () => {
  assert.deepEqual(parseStreamerMediaCommand("MIA, přehraj písničku"), { kind: "song", raw: "mia prehraj pisnicku" });
  assert.deepEqual(parseStreamerMediaCommand("mia prehraj video"), { kind: "video", raw: "mia prehraj video" });
  assert.equal(parseStreamerMediaCommand("ahoj chat"), null);
  assert.equal(parseStreamerMediaCommand("prehraj video"), null);
  assert.equal(parseStreamerMediaCommand("mia pust testy"), null);
  assert.equal(parseStreamerMediaCommand("mia spust demo"), null);
});

test("VasaSpinak is streamer boss and can use media command in any mode", () => {
  const access = resolveStreamerAccess("VasaSpinak", {
    stream: { streamerUserLabels: "VasaSpinak,Spinak" }
  });
  assert.equal(access.isStreamerBoss, true);

  assert.equal(
    isSoloHostMode({ outputState: { soloStreamState: { phase: "main" } } }),
    false
  );
});

test("solo mode accepts phase solo and nejsem tu", () => {
  assert.equal(
    isSoloHostMode({
      outputState: { soloStreamState: { phase: "solo" } },
      soloStreamModule: {
        getSoloStreamState(state) {
          return state.soloStreamState;
        }
      }
    }),
    true
  );
  assert.equal(isSoloHostMode({ outputState: { worldMode: "nejsem_tu" } }), true);
  assert.equal(isSoloHostMode({ outputState: { soloStreamState: { phase: "main" } } }), false);
});

test("picks only media longer than 2 minutes", () => {
  const catalog = {
    root: "C:/MIA/incoming-images",
    items: [
      { kind: "videos", rel: "videos/short.mp4", durationMs: 30_000, contentKind: "short_animation" },
      { kind: "videos", rel: "videos/long.mp4", durationMs: 150_000, contentKind: "story_music", hasEmbeddedAudio: true, qualityScore: 8 },
      { kind: "videos", rel: "videos/epic.mp4", durationMs: 200_000, contentKind: "story_legend", qualityScore: 9 }
    ]
  };

  const songs = listLongMediaCandidates(catalog, "song");
  assert.equal(songs.length, 1);
  assert.equal(songs[0].rel, "videos/long.mp4");

  const videos = listLongMediaCandidates(catalog, "video");
  assert.equal(videos.length, 2);

  const outputState = {};
  const pick = pickRotatedMedia(catalog, "video", outputState);
  assert.ok(pick);
  assert.ok(pick.durationMs >= MIN_LONG_MEDIA_MS);
});

test("canPlayNow blocks only after playback started", () => {
  const { canPlayNow, PLAYBACK_COOLDOWN_MS } = require("../scripts/MIA_STREAMER_MEDIA_COMMAND");
  const outputState = {};

  assert.equal(canPlayNow(outputState, {}).ok, true);

  outputState.lastStreamerMediaAt = Date.now();
  const blocked = canPlayNow(outputState, {});
  assert.equal(blocked.ok, false);
  assert.equal(blocked.reason, "cooldown");

  outputState.lastStreamerMediaAt = Date.now() - PLAYBACK_COOLDOWN_MS - 1;
  assert.equal(canPlayNow(outputState, {}).ok, true);
});

test("streamer full play keeps entire catalog duration", () => {
  const { resolveGiftVideoTiming } = require("../scripts/MIA_VIDEO_ENGINE");
  const timing = resolveGiftVideoTiming(
    {
      durationMs: 600_000,
      pickedBy: "streamer_media_command",
      hasEmbeddedAudio: false
    },
    {},
    "T5"
  );

  assert.equal(timing.longAudioFullPlay, true);
  assert.ok(timing.playbackMs >= 600_000);
  assert.ok(timing.maxWaitMs >= 620_000);
});

console.log("streamer_media_command_contract: OK");
