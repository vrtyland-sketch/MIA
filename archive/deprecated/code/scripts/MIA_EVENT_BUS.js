const { sendToIngest } = require("./MIA_INGEST_CLIENT");
const { toIngestPayload } = require("./MIA_EVENT_SCHEMA");

async function publishEvent(event) {
  try {
    console.log("EVENT BUS IN:", JSON.stringify(event, null, 2));

    const ingestPayload = toIngestPayload(event);

    if (!ingestPayload) {
      console.log("EVENT BUS DROP: invalid event");
      return null;
    }

    if (ingestPayload.type === "ignore") {
      console.log("EVENT BUS IGNORE:", ingestPayload);
      return null;
    }

    console.log("EVENT BUS OUT:", JSON.stringify(ingestPayload, null, 2));

    const result = await sendToIngest(ingestPayload);
    return result;
  } catch (err) {
    console.log("EVENT BUS ERROR:", err.message);
    return null;
  }
}

module.exports = {
  publishEvent
};