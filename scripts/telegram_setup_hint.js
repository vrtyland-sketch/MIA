"use strict";

/**
 * Rychlý návod pro zapnutí Telegram bota MIA.
 */

const telegram = require("./MIA_TELEGRAM_BRIDGE");

console.log(`
---- MIA TELEGRAM SETUP ----

1) V Telegramu otevři @BotFather → /newbot → zkopíruj token.
2) Do .env doplň:
   MIA_TELEGRAM_ENABLED=1
   MIA_TELEGRAM_BOT_TOKEN=123456:ABC...
   MIA_TELEGRAM_ALLOWED_USER_IDS=TVÉ_TELEGRAM_USER_ID
3) npm run restart
4) Napiš botovi: "mia ahoj"

Bezpečnost:
- MIA_TELEGRAM_STREAMER_ONLY=1 (default) povolí jen streamera (VasaSpinak).
- Nebo explicitní allow-list přes MIA_TELEGRAM_ALLOWED_USER_IDS.

Stav: ${JSON.stringify(telegram.getTelegramBridgeStatus(), null, 2)}
`);
