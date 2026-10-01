# TIKFINITY STATIC AUDIT — read-only mapa event řetězce

**Status:** READ-ONLY · 2026-08-13 · Feature freeze ON  
**Účel:** zrekonstruovat cestu TikTok → TikFinity → MIA → TTS/overlay **bez úprav kódu**  
**STOP:** žádná větev v repu nemění COMMENT/GIFT před `/ingest` — pouze zdokumentováno

Související: [`OBS_STATIC_AUDIT.md`](./OBS_STATIC_AUDIT.md) · [`GENESIS_OPS_PRIORITY.md`](./GENESIS_OPS_PRIORITY.md)

---

## 0. Executive mapa (celý řetězec)

```text
TikTok LIVE room
    │
    ├─► [EXTERNÍ] TikFinity Actions (Read Comments / TTS / Sound) — mimo MIA repo
    │       └─► audio přímo do OBS / systému (RIZIKO dvojí TTS)
    │
    └─► TikFinity HTTP webhook
            POST/GET → /ingest | /tikfinity/webhook | /tikfinity/ingest | /tiktok/ingest
                → ingestAuthGuard
                → handleIngest (fastAck 200)
                → MIA_INGEST_QUEUE (lane: community | support)
                → processEvent → normalize_event.js
                → pipeline (8 fází)
                    → shadow decision → actionResult
                    → deliverActionVoice → MIA_TTS_ENGINE
                    → executeOverlay / executeVideo
                → logs + /health lastIngest
                    → OBS browser sources poll /overlay-state
                    → MIA_VOICE reroute → VB-Cable → TikTok mic
```

**Klíč:** MIA reaguje **jen** na HTTP ingest (nebo interní debug/admin simulaci stejného pipeline).  
**Fold/Shadow období:** riziko není v MIA kódu, ale v **paralelních TikFinity Actions** + OBS widgetu `tikfinity.zerody.one/widget/myactions`.

---

## 1. ENTRY POINTS

### 1.1 Kanonické HTTP endpointy (TikFinity/TikTok)

| Endpoint | Handler | Soubor | Klasifikace |
|----------|---------|--------|-------------|
| `POST/GET /ingest` | `handleIngest` | `routes/ingest.js:22-28` | **RUNTIME_DEFAULT** |
| `POST/GET /tikfinity/webhook` | stejný handler | `routes/ingest.js:8` | **RUNTIME_ALIAS** |
| `POST/GET /tikfinity/ingest` | stejný handler | `routes/ingest.js:9` | **RUNTIME_ALIAS** |
| `POST/GET /tiktok/ingest` | stejný handler | `routes/ingest.js:10` | **RUNTIME_ALIAS** |
| `GET/POST /ingest/audience` | `handleAudienceIngest` | `routes/ingest.js:31-32` | **RUNTIME_ACTION** (viewer count, ne chat) |

**Config SoT:** `scripts/MIA_CONFIG.js:505-514` — `tiktok.authMode: "tikfinity"`, aliasy shodné.

**Bootstrap log:** `scripts/MIA_SERVER_BOOTSTRAP.js:62-63` vypisuje všechny cesty při startu.

### 1.2 Auth & guard

| Krok | Soubor | Chování |
|------|--------|---------|
| `ingestAuthGuard` | `scripts/MIA_RUNTIME_SECURITY.js:60-94` | localhost open (default); jinak `MIA_INGEST_SECRET` |
| Empty payload reject | `scripts/MIA_INGEST_HTTP.js:107-126` | 400 `empty_payload` |
| Fast ack | `MIA_INGEST_HTTP.js:128-142` | 200 `{ queued: true, lane }` **před** pipeline |

**Multi-PC:** `.env.mia-pc.example` doporučuje secret pro webhook z STREAM PC přes LAN.

### 1.3 Paralelní ingressy (ne TikFinity, ale stejný pipeline)

| Cesta | Soubor | Do pipeline | Poznámka |
|-------|--------|-------------|----------|
| Kick WS/webhook | `MIA_KICK_BRIDGE.js` → `postToIngest` | HTTP `/ingest` když `onEvent=null` | Default v `MIA_PLATFORM_BRIDGES.js:89-92` |
| Twitch EventSub | `MIA_TWITCH_BRIDGE.js` | HTTP `/ingest` | default OFF |
| YouTube Live Chat | `MIA_YOUTUBE_BRIDGE.js` | HTTP `/ingest` | default OFF |
| Debug simulace | `routes/debug.js` → `processEvent` | **přímý** pipeline | localhost / secret |
| Admin test | `routes/admin.js` `/api/mia-admin/test/*` | **přímý** pipeline | localAdminGuard |
| Legacy ingest route | `src/routes/ingestroute.js` | deprecated re-export | **LEGACY** — nepoužívat |

### 1.4 Handler chain (TikFinity HTTP)

```text
endpoint
  → ingestAuthGuard (MIA_RUNTIME_SECURITY.js)
  → handleIngest (MIA_INGEST_HTTP.js)
      → merge query+body payload
      → resolveIngestLane (MIA_INGEST_LANE.js) — community vs support
      → enqueue (MIA_INGEST_QUEUE.js)
  → processEvent (MIA_EVENT_PIPELINE.js)
      → normalizeIncomingEvent → normalize_event.js
      → runEventPipeline (pipeline/run.js × 8 fází)
  → log: ingest / mia-events / gift-mapping
  → /health lastIngest (MIA_HEALTH_RUNTIME.js)
```

---

## 2. COMMENT PATH

### 2.1 Normalizace

**Soubor:** `shared/platform_normalizers/normalize_event.js`

| Krok | Funkce | Výstup |
|------|--------|--------|
| Platform | `detectPlatform()` | `tiktok` (tikfinityUserId, profilePictureUrl, …) |
| Source | `detectSource()` | `tikfinity` pokud tikfinityUserId/Username |
| Typ | `detectEventType()` | `COMMENT` — explicit type má přednost před gift poli |
| Sanitize | `sanitizeRawInput()` | u COMMENT **maže** giftId/giftName/coins (anti false-gift) |
| User | `normalizeUser()` | userId, username, nickname, avatarUrl |
| Identity | `buildEventIdentity()` | eventId, traceId, ts |
| Route | — | `community` |
| Jazyk | `MIA_LANGUAGE.attachLanguageToEvent` | language metadata |

**TikFinity typický payload** (test): `value1`, `value2`, `content`, `commandParams`, `tikfinityUserId`, `tikfinityUsername` — viz `scripts/stream_validation_02_ingest_gate.js:84-94`.

### 2.2 Pipeline fáze (COMMENT)

| # | Fáze | Soubor | Co dělá pro COMMENT |
|---|------|--------|---------------------|
| 1 | session | `phase_session.js` | dedupe 4.5s; `writeLog("ingest")`; `recordIngestSummary` |
| 2 | observe | `phase_observe.js` | chatFeed, session memory, mood brain, solo stream reset, T0 engagement |
| 3 | enrich | `phase_enrich.js` | viewerMemory.recordChat, director plan (flagged) |
| 4 | command_gate | `phase_command_gate.js` | !care, !duel, … (chat commands) |
| 5 | decide | `phase_decide.js` | `shadowRuntime.runShadowPipeline` → actionResult |
| 6 | present | `phase_present.js` | chat translation, LLM enhance, **`deliverActionVoice`** |
| 7 | execute | `phase_execute.js` | overlay emit, execution bridge |
| 8 | post | `phase_post.js` | state commit, deferred voice hooks |

### 2.3 Decision / response

| Modul | Soubor | Role |
|-------|--------|------|
| Shadow pipeline | `MIA_NEXT/engine_shadow_runtime.js` | decision_engine + action_builder |
| Fallback | `MIA_ACTION_BUILDER_RUNTIME.js:18-86` | `buildDirectChatAction` pokud shadow nevrátí action |
| Chat brain | `scripts/MIA_CHAT_BRAIN.js` (via action builder) | intent, speaker hint (MIA vs Koj) |
| Response engine | `scripts/MIA_RESPONSE_ENGINE.js` | overlay text, voice plan |

### 2.4 TTS (MIA strana)

```text
phase_present → deliverActionVoice (MIA_DELIVERY_RUNTIME.js:1018)
  → resolveVoiceDeliveryPlan (MIA_SPEAKER_ROUTING.js)
  → maybeDeliverMiaVoice
      → tts dedupe 4.5s / utterance dedupe 6s
      → MIA_TTS_ENGINE.speak (Edge default, OpenAI pokud API key)
      → voicePlaybackState + writeLog stage "tts_speak"
  → OBS MIA_VOICE browser source → VB-Cable → TikTok mic
```

**Guard:** `MIA_TTS_ENABLED` (default true), `resolveVoiceDeliveryPlan.shouldSpeak === false` → skip.

### 2.5 Overlay (COMMENT)

```text
executeOverlay → overlayState.miaOverlay / kojnozoutOverlay
  → GET /overlay-state (routes/overlay.js)
  → speech-overlay.html, kojnozrout-runtime.html (OBS browser)
```

### 2.6 Alternativní větve (COMMENT-related, v repu)

| Větev | Soubor | Účel | Klasifikace |
|-------|--------|------|-------------|
| Proactive host | `MIA_PROACTIVE_HOST.js` + runtime loops | TTS **bez** ingest — idle/quiet chat | **RUNTIME_ACTION** (timer) |
| Deferred community queue | `MIA_OUTPUT_STATE.js` | odložené community overlaye | **RUNTIME_ACTION** |
| Chat translation public | `phase_present.js` deliverChatTranslation | může změnit jazyk TTS (EN Jenny vs CS Vlasta) | **RUNTIME_ACTION** |
| Capybara flow | `MIA_CAPYBARA_FLOW_RUNTIME.js` | gift-triggered chat loop | **RUNTIME_ACTION** (gift, ne raw comment) |
| Fold remote | `routes/remote_fold.js` | snapshot `/mia/remote/snapshot` — **read-only** | **MONITORING** |
| Kick/Twitch COMMENT | platform bridges | stejný pipeline, jiná platforma | **PARALLEL PLATFORM** |

**Nenalezeno v repu:** `comment reader`, `auto-read`, `driver mode`, `fold TTS` jako MIA modul — to bylo **TikFinity UI/OBS**, ne Node kód.

---

## 3. DOUBLE-RESPONSE RISK

### 3.1 TikFinity vlastní TTS + MIA TTS — **HIGH (externí)**

| Důkaz | Detail |
|-------|--------|
| OBS backup | Browser source `https://tikfinity.zerody.one/widget/myactions?cid=2743946&screen=1` ve scéně `SPINAK_HLAVNI` |
| MIA kód | `MIA_OBS_OVERLAY_SYNC.js:186-188` detekuje `tikfinity\|zerody.one/widget` — **nekontroluje** actions |
| Mechanismus | TikFinity Actions (Read Comments / TTS / Play Sound) běží v **TikFinity app nebo widgetu**, paralelně k webhooku `/ingest` |

**Jeden COMMENT může:** TikFinity přečíst nahlas **a** poslat webhook → MIA TTS.

**Repo to neumí vypnout** — jen doma v TikFinity UI.

### 3.2 Více MIA TTS větví — **MEDIUM (konfigurace)**

| Riziko | Cesta | Mitigace v kódu |
|--------|-------|-----------------|
| MIA + Koj dual speak | `MIA_DUAL_VOICE=1` | default **OFF** (`MIA_DUAL_VOICE.js`) |
| MIA + Koj same utterance | `deliverActionVoice` | `tts_speak_deduped_utterance` 6s |
| Duplicate pipeline | fastAck + retry webhook | ingest deduper 4.5s (`MIA_INGEST_GUARD` createIngestDeduper) |
| 2× community parallel | `MIA_INGEST_COMMUNITY_PARALLEL` default 2 | stejný eventId → dedupe |
| Více MIA_VOICE v OBS | duplicate browser sources | `MIA_OBS_OVERLAY_SYNC.js:220-223` varování `doubleAudioRisk` |
| Gift deferred MIA voice | `phase_post` scheduleDeferredMiaVoice | záměrné zpoždění, ne duplikát |

### 3.3 Duplicate `/ingest` — **LOW–MEDIUM**

| Scénář | Chování |
|--------|---------|
| TikFinity retry stejný payload | `phase_session` dedupe → halt, log `ingest-deduped` |
| Alias `/ingest` + `/tikfinity/webhook` stejný event | stejný handler — dedupe pokud stejný eventId/message |
| Kick + TikFinity stejný text | různé platform v dedupe key → **projde 2×** (různé platformy) |

### 3.4 Více overlayů — **LOW**

Jeden COMMENT typicky: 1× speech bubble (+ optional companion visual bez TTS). Combo/boss/immersive jen při flag/intent match.

---

## 4. GIFT PATH

### 4.1 Normalizace GIFT

| Pole (RAW) | NORMALIZED | Poznámka |
|------------|------------|----------|
| giftName, giftId, gift | `support.giftName`, `support.giftId` | |
| coins, coinValue, diamondCount | `support.coins`, `support.totalCoins` | |
| repeatCount, count, quantity | `support.repeatCount`, `support.giftCount` | |
| route | `support` | lane `support` (serial queue) |

**Tier/miaPoints:** **ne** v normalizeru — `MIA_SUPPORT_RESOLVER.enrichNormalizedSupport` v `phase_enrich.js`.

### 4.2 Gift pipeline chain

```text
ingest (lane=support, serial)
  → normalize → enrichNormalizedSupport + gift-mapping log
  → shadow pipeline + supportReactionPolicy + spamVerdict
  → prepareGiftEconomyPresentation
  → executeGiftPresentationOverlays (phase_present)
  → executeVideo (MIA_VIDEO_ENGINE) — tier slots T1–T5, rotationIndexByTier
  → deliverActionVoice (Koj primary pro support)
  → schedulePostGiftMediaExperiences (phase_post)
  → bowl/Koj vitals via runtime impact
```

### 4.3 Paralelní gift/video větve (ne mazat — mapovat)

| Větev | Soubor / overlay | Default | Klasifikace |
|-------|------------------|---------|-------------|
| Tier video (FFmpeg/OBS slots) | `MIA_VIDEO_ENGINE.js` | **ON** pro support | **RUNTIME_DEFAULT** |
| Gift animation stage | `gift-animation-overlay.html` / `MIA_GIFT_ANIMATION` | auto-queue min tier (config) | **RUNTIME_ACTION** |
| Gift moment composer | `gift-moment-overlay.html` | parallel, often OFF | **LEGACY-PARALLEL** |
| Boss cinematic | `boss-cinematic-overlay.html` | T5+ moments | **RUNTIME_ACTION** |
| Combo overlay | `combo-overlay.html` | spam/combo | **RUNTIME_ACTION** |
| Procedural generated jobs | `generated/gift-animations/` | per-job | **TEMP output** |

**Stará vs nová:** video engine + gift-animation overlay **koexistují** — není jedna vypnutá v kódu; rozhoduje tier, flags (`MIA_GIFT_ANIM_AUTO`), presentation plan.

### 4.4 Rose (GP-S) expected chain

```text
TikFinity GIFT webhook
  → normalize GIFT Rose
  → support resolver → streamTier ~T1
  → Koj reaction + optional T1 video slot
  → overlay (gift card — miaPoints only, no coins on overlay)
  → Koj TTS (Antonín default)
  → log: ingest + gift-mapping + mia-events (tts_speak, video_job_enqueued)
```

**PMB 2026-08-08:** Rose ingest OK; video jen 1/6 — infra stabilita, ne chybějící endpoint.

---

## 5. IDENTITY / PAYLOAD COVERAGE

### 5.1 COMMENT

| Pole | RAW RECEIVED | NORMALIZED | LOGGED | DROPPED |
|------|--------------|------------|--------|---------|
| timestamp | TikFinity (někdy implicit) | `ts`, `isoTime` (MIA generated) | ingest log | — |
| platform | optional | `tiktok` | ano | — |
| source | — | `tikfinity` | ano | — |
| userId | userId, tikfinityUserId | `user.userId` (stable resolve) | ano | placeholder `0` → fallback username |
| username | username, uniqueId, tikfinityUsername | `user.username` | ano | — |
| nickname | nickname, value1, displayName | `user.nickname` | ano | — |
| avatar | profilePictureUrl | `user.avatarUrl` | partial | — |
| comment text | content, value2, commandParams, message | `message`, `content` | ingest (160 chars) | — |
| eventId | messageId/id if present | `eventId` (generated if missing) | ano | — |
| language | — | `language` (detected) | mia-events | — |
| coins/gift fields on dirty test payload | sometimes present | **stripped** for COMMENT | — | sanitizeRawInput |

### 5.2 GIFT

| Pole | RAW | NORMALIZED | LOGGED | DROPPED |
|------|-----|------------|--------|---------|
| giftName | giftName, gift | `support.giftName` | gift-mapping | — |
| giftId | giftId | `support.giftId` | gift-mapping | — |
| coins/value | coins, diamondCount | `support.coins`, `totalCoins` | gift-mapping (internal) | **ne na overlay** (guardrail) |
| count/repeat | repeatCount, count | `support.repeatCount` | ano | — |
| miaPoints | — | `support.miaPoints` (resolver) | gift-mapping | overlay uses miaPoints |
| tier | — | `support.streamTier`, obsTier | gift-mapping | — |
| combo/spam | — | shadow spamVerdict | mia-events | throttled gifts |

**Viewer memory:** `phase_enrich` → `viewerMemory.recordChat/recordGift` → `data/viewer-memory.json` (Phase 2, flagged).

---

## 6. TIKFINITY EXTERNAL CONFIG GAP

### 6.1 Co lze dokázat z repa

- Očekávaný webhook URL: `http://<MIA-IP>:3000/ingest` (aliases ekvivalentní)
- Payload shape pro test COMMENT (viz §2.1)
- MIA TTS path a dedupe
- Že OBS může mít TikFinity widget **nezávisle** na webhooku
- Kick default enabled separately — not TikTok duplicate unless misconfigured

### 6.2 Co MUSÍ doma fyzicky TikFinity UI (+ OBS)

| # | Kontrola | Proč |
|---|----------|------|
| 1 | **Webhook URL** = `http://192.168.137.20:3000/ingest` (PC2) | multi-PC |
| 2 | **Secret header** pokud `MIA_INGEST_SECRET` set | auth |
| 3 | **Actions → COMMENT:** seznam všech akcí — Read Text / TTS / Sound / Webhook | **dvojí TTS riziko** |
| 4 | Vypnout nebo přesměrovat staré **Read Comments** / **Text-to-Speech** actions | Fold/Shadow období |
| 5 | Každá COMMENT action: buď **jen webhook**, nebo **jen** local TTS — ne obojí |
| 6 | **GIFT actions:** webhook vs overlay vs sound — inventář |
| 7 | TikFinity **Connected** k live room (ne jen test button) | SV2 FAIL A |
| 8 | OBS: odstranit/ztlumit **tikfinity widget** pokud actions duplikují webhook |
| 9 | Ověřit **Event Types** enabled: Comment, Gift (min) | |
| 10 | Screenshot Actions tab + Webhook tab **před změnou** | rollback |

**Widget v OBS backup:** `myactions?cid=2743946` — cid ověřit proti aktuálnímu TikFinity účtu.

---

## 7. LOG / DŮKAZNÉ STOPY

| Co | Kde hledat | PASS signál |
|----|------------|-------------|
| Ingest received | `logs/ingest-YYYY-MM-DD.jsonl` | řádek `eventType: COMMENT/GIFT` |
| Dedupe drop | `logs/ingest-deduped` (via mia-events?) / `ingest-deduped` writeLog | duplicate suppressed |
| Decision | `logs/mia-events-*.jsonl` | shadow / decision stages |
| TTS | `mia-events` stage `tts_speak` | textPreview, speaker |
| TTS skip | `tts_speak_deduped` | intentional suppress |
| Gift map | `logs/gift-mapping-*.jsonl` | Rose → tier, miaPoints |
| Video | `mia-events` `video_job_enqueued` | tier slot |
| Live health | `GET /health` → `lastIngest` | eventType, user, message |
| FastAck errors | `mia-errors` source `ingest_async` | pipeline fail after 200 |

**Test script (bez TikFinity UI):** `node scripts/stream_validation_02_ingest_gate.js --post-control`

---

## 8. FINDINGS

1. **Jediný TikTok ingress do MIA = HTTP `/ingest` (+ aliasy)** — well-defined, fastAck, lane queue.
2. **Fold/Shadow „TikFinity čte samo“ není v Node kódu** — je to TikFinity **Actions** a/nebo OBS **widget**, paralelně k webhooku.
3. **MIA má jednu TTS frontu** s dedupe; dual MIA+Koj hlas jen při `MIA_DUAL_VOICE=1` (default OFF).
4. **COMMENT může dostat EN TTS** při translation path (PMB evidence) — konfigurace jazyka, ne duplikát engine.
5. **Gift má paralelní presentation větve** (video engine + gift-animation overlay) — obě aktivní dle tier/flags; legacy gift-moment existuje parallel.
6. **Kick bridge** (default ON) jde přes HTTP ingest (`onEvent: null`) — ne přímý processEvent; TikTok/Kick se míchají jen pokud oba enabled.
7. **Debug/admin routes** obcházejí queue, ale **stejný** pipeline — localhost only.

---

## 9. DUPLICATE RISKS (shrnutí)

| ID | Riziko | Severity | Kde |
|----|--------|----------|-----|
| D1 | TikFinity Action TTS + MIA webhook TTS | **HIGH** | TikFinity UI / OBS widget |
| D2 | Dva MIA_VOICE browser sources | **MEDIUM** | OBS scéna |
| D3 | MIA_DUAL_VOICE=1 | **MEDIUM** | .env |
| D4 | Webhook retry duplicate | **LOW** | deduper 4.5s |
| D5 | community parallel 2× same comment | **LOW** | eventId dedupe |

---

## 10. LEGACY RISKS (pochopit, ne hned mazat)

| Položka | Co to je | Proč existuje | GENESIS |
|---------|----------|---------------|---------|
| `src/routes/ingestroute.js` | deprecated shim | historický entry | ignore |
| TikFinity widget v OBS | myactions browser | staré actions UI | audit actions |
| gift-moment overlay | parallel composer | pre-unify visuals | OUT default |
| Shadow runtime name | „shadow“ = runtime mode | MIA_NEXT architecture | **CURRENT** path |
| Proactive host | auto TTS bez chat | engagement | optional OFF |
| chat translation EN | Jenny voice | multi-lang | review for CS host |

---

## 11. PAYLOAD COVERAGE (shrnutí)

- **NORMALIZED contract stabilní** pro COMMENT/GIFT (`normalize_event.js`).
- **Coins never on overlay** — business rule v guardrails + resolver → miaPoints.
- **eventId** generován pokud TikFinity nepošle — dedupe spoléhá na message+user fallback.
- **Viewer memory** partial — enrich phase, flagged; ne blocker pro GP-S.

---

## 12. HOME_VERIFICATION (20 min checklist)

**TikFinity (STREAM PC):**

- [ ] Webhook = `http://<MIA-PC-IP>:3000/ingest`
- [ ] Test Comment → `/health` lastIngest = COMMENT
- [ ] Screenshot **všechny Actions** pro event Comment
- [ ] Pro každou Comment action: typ = Webhook only **nebo** TTS only (ne obojí)
- [ ] Stejný inventář pro **Gift**
- [ ] Vypnout/disable staré Read Comments / Auto-read / Play sound (pokud duplikuje MIA)
- [ ] Connect k **live** room (ne offline test)

**MIA (PC2):**

- [ ] `curl http://127.0.0.1:3000/health` — tikfinity ingest aliases listed
- [ ] `.env`: `MIA_TTS_ENABLED=1`, `MIA_DUAL_VOICE` unset nebo `0`
- [ ] `logs/ingest-*.jsonl` roste při live comment

**OBS (STREAM PC):**

- [ ] Počet MIA_VOICE sources = **1**
- [ ] TikFinity widget — potřeba / mute / remove pokud actions duplikují
- [ ] VB-Cable → TikTok mic slyšitelný

**End-to-end:**

- [ ] 1 live comment → max **1** slyšitelná TTS odpověď
- [ ] 1 Rose → ingest + koj TTS + (video pokud tier slot OK) + overlay

---

## 13. MINIMAL FIX CANDIDATES (NEPROVÁDĚT z notebooku)

| # | Fix | Typ | Kdy |
|---|-----|-----|-----|
| F1 | TikFinity: COMMENT actions → **jen Webhook** na `/ingest`; vypnout local Read/TTS | **config** | doma první |
| F2 | OBS: odstranit nebo mute `tikfinity.zerody.one/widget/myactions` pokud F1 nestačí | **OBS** | po F1 test |
| F3 | Ověřit jeden MIA_VOICE source | **OBS** | stream prep |
| F4 | `.env`: explicit `MIA_DUAL_VOICE=0` | **env** | prevent accident |
| F5 | Multi-PC: `MIA_INGEST_SECRET` + header v TikFinity | **env** | LAN security |
| F6 | CS host: vypnout nebo omezit public chat translation EN TTS | **config** | po GP-S |
| F7 | Rose: ověřit gift-mapping + video slot — infra, ne ingest | **ops** | GP-S test |

**Nepouštět:** refactor ingest, mazání shadow runtime, hromadné vypínání gift-moment bez audit vizuálu.

---

## 14. STOP CONDITION — větve před `/ingest`

Prohledáno: **žádná produkční větev v repu nezpracovává TikTok COMMENT/GIFT před HTTP ingest.**

| Potenciální pre-ingest | Verdikt |
|------------------------|---------|
| TikFinity Actions (externí) | **ANO — mimo repo** → dokumentováno, STOP |
| TikFinity widget OBS (externí) | **ANO — mimo repo** → dokumentováno, STOP |
| Kick/Twitch/YouTube bridges | jiná platforma, ne TikTok |
| Debug/admin | simulace, ne live TikTok |

**Žádná automatická oprava neprovedena.**
