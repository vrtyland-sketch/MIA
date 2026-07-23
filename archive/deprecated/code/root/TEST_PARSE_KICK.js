const path = require("path");
const { parseKickRawFile } = require("./scripts/MIA_PARSER_KICK");

const inputFile = path.join(__dirname, "logs", "kick-raw-2026-03-07.jsonl");
const outputFile = path.join(__dirname, "logs", "kick-events-2026-03-07.jsonl");

try {
  const parsedEvents = parseKickRawFile({
    inputFile,
    outputFile,
    streamer: "SPINAK",
    alsoAppendDailyLog: false,
  });

  console.log("KICK PARSER OK");
  console.log("INPUT:", inputFile);
  console.log("OUTPUT:", outputFile);
  console.log("PARSED COUNT:", parsedEvents.length);

  if (parsedEvents.length > 0) {
    console.log("FIRST EVENT:", parsedEvents[0]);
  } else {
    console.log("NO EVENTS PARSED");
  }
} catch (err) {
  console.error("KICK PARSER ERROR:", err.message);
}