let sendMessageFn = null;

function registerChatSender(fn) {
  sendMessageFn = fn;
}

async function sendChatMessage(text) {
  if (!sendMessageFn) {
    console.log("CHAT ENGINE: no sender registered");
    return false;
  }

  try {
    await sendMessageFn(text);
    return true;
  } catch (err) {
    console.log("CHAT SEND ERROR:", err.message);
    return false;
  }
}

module.exports = {
  registerChatSender,
  sendChatMessage
};