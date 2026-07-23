let lastOverlayMessage = {
  text: "",
  ts: 0,
  action: null
};

function setOverlayMessage(text, meta = {}) {
  lastOverlayMessage = {
    text: String(text || ""),
    ts: Date.now(),
    action: meta.action || null
  };

  console.log("OVERLAY MESSAGE SET:", lastOverlayMessage);
  return getOverlayMessage();
}

function getOverlayMessage() {
  return JSON.parse(JSON.stringify(lastOverlayMessage));
}

function clearOverlayMessage() {
  lastOverlayMessage = {
    text: "",
    ts: 0,
    action: null
  };

  return getOverlayMessage();
}

module.exports = {
  setOverlayMessage,
  getOverlayMessage,
  clearOverlayMessage
};