const axios = require("axios");

const INGEST_URL = "http://localhost:3000/ingest";

async function sendToIngest(event) {
  try {
    const response = await axios.post(INGEST_URL, event, {
      headers: {
        "Content-Type": "application/json"
      },
      timeout: 5000
    });

    console.log("INGEST OK:", response.data);
    return response.data;
  } catch (err) {
    if (err.response) {
      console.log("INGEST HTTP ERROR:", err.response.status, err.response.data);
    } else {
      console.log("INGEST FAIL:", err.message);
    }
    return null;
  }
}

module.exports = {
  sendToIngest
};