# MIA Gift Economy — kánon v1 (herní ekonomika streamu)

Referenční specifikace pro Cursor. Mapa souladu s kódem: [`KANON_MIA_ALIGNMENT.md`](./KANON_MIA_ALIGNMENT.md) § Gift Economy.

**Gift Map není tabulka dárků** — je to **kompletní gamifikační vrstva streamu**.

Související soubory:
- `scripts/MIA_GIFT_MAP.js` — metadata giftů (animace, rodina, owner)
- `scripts/MIA_GIFT_TIERS.js` — coin prahy, bucket prahy, MIA_POINTS_PER_COIN
- `scripts/MIA_SUPPORT_RESOLVER.js` — tier + MIA body (source-of-truth; `legacy/` = shim)
- `scripts/MIA_GIFT_PRESENTATION.js` — orchestrátor combo/speech/visual/story
- `MIA_NEXT/engine_spam_session.js` — combo / spam session
- `scripts/MIA_KOJNOZROUT_DUEL.js` — duel power
- `scripts/MIA_GIFT_USER_LEDGER.js` — runtime seznam dárců

---

## Základní princip (neměnit)

Gift z platformy **není přímo hra** — je **RAW událost**, kterou MIA zpracuje.

```
Platforma (TikTok / Kick)
    ↓ RAW event
INGEST (jen sběr, bez logiky)
    ↓
NORMALIZACE (společný formát)
    ↓
GIFT MAP + SUPPORT RESOLVER (význam, tier, XP)
    ↓
DECISION LAYER
    ↓
MIA / Kojnožrout reakce
    ↓
BODY · MISKA · INVENTÁŘ · DUEL · OVERLAY · TTS · VIDEO
```

### Co ingest ukládá (RAW)

- platforma, userId, nickname, avatarUrl  
- giftId, giftName, giftCount, repeatCount, streak  
- giftValue / coins (**jen interně**)  
- timestamp, event metadata  

### Co overlay **nikdy** neukazuje

- coiny, diamondy, Kč, €  
- „Galaxy za 500“  

### Co overlay **ukazuje**

- profil, nickname  
- **MIA body / XP / level** (interní gamifikace)  
- logo platformy  
- „děkuji za podporu projektu“  

---

## Tier systém streamu (T0–T6)

Každý tier definuje **balíček efektů**, ne jen video.

| Tier | Název | Coin rozsah (interní) | Stream tier / OBS | Klíčové funkce |
|------|-------|----------------------|-------------------|----------------|
| **T0** | Interakce | — (ne gift) | — | Like, Follow, Share, Komentář |
| **T1** | Podpora | 1–99 | `T1_VIDEO_01…04` rotace | video, animace, avatar, MIA přečte jméno |
| **T2** | Fanoušek | 100–999 | T2 sloty | větší animace, hlas MIA, +Team XP |
| **T3** | Elita | 1 000–4 999 | T3 sloty | full overlay, speciální zvuk, AI reakce |
| **T4** | Boss | 5 000–9 999 | T4 + Boss Event | stop běžných efektů, „PŘIŠEL BOSS“ |
| **T5** | Mega Boss | 10 000–24 999 | T5 sloty | cutscéna, MIA interrupt, speciální hudba, může vyvolat duel |
| **T6** | Legenda | 25 000+ | vlastní event | celá stream událost, síň slávy |

**Mapování na dnešní kód:** video engine používá **T1–T5** (`rotationIndexByTier`). Resolver dnes mapuje spíš na **T1–T4** podle `miaPoints` — viz alignment; Tier 5–6 jsou **vize / částečně slot T5**.

### Tier 0 — Interakce

| Event | Funkce | Odměna |
|-------|--------|--------|
| Like | MIA poděkuje, avatar, statistiky | 1 XP |
| Follow | welcome overlay | 1 XP |
| Share | SHARE větev | dle share režimu |
| Komentář | chat brain, péče Koj | 1–2 XP |

---

## Co má mít každý gift v Gift Map

Každý záznam (stovky TikTok giftů) nese:

| Dimenez | Popis |
|---------|--------|
| **hodnota** | interní coin → XP (nikdy na overlay) |
| **význam** | `small_support`, `care_feed`, `pet_react`, … |
| **animace** | `effectProgram` + varianty dle Koj nálady / péče |
| **reakce MIA** | hlas, AI text, video (odděleně zapínatelné) |
| **vliv na duel** | power = f(coins) → progress bar |
| **vliv na profil** | kumulativní XP, level, streak |
| **vliv na komunitu** | miska, bond, neglect, evoluce Koj |
| **odměny** | item do batohu, quest progress |
| **žebříček** | team points, hall of fame (T6) |

---

## Gift XP a levely

### XP z coinů (interní)

```
1 coin = 1 XP   (vize produktu; resolver dnes používá miaPoints = coins × 7.5)
```

Příklad: 100 coinů → 100 XP (vize) / 750 miaPoints (aktuální resolver).

### Gift Level (kumulativní XP uživatele)

| Level | Název |
|-------|--------|
| Lv1 | Nováček |
| Lv2 | Fanoušek |
| Lv3 | Podporovatel |
| Lv4 | Elita |
| Lv5 | Hrdina |
| Lv6 | Legenda |
| Lv7 | Titan |
| Lv8 | Mýtus |

**Stav:** 🔴 level systém per user není implementován — jen runtime ledger + session.

---

## Combo systém

| Opakování stejného giftu | Efekt |
|--------------------------|--------|
| ×10 | **COMBO ×10** |
| ×50 | **SUPER COMBO** |
| ×100 | **ULTIMATE COMBO** |

**Stav:** 🟢 `engine_spam_session.js` + combo overlay wave HUD (`combo-overlay.html`, `/assets/combo-wave-ui.js`).

---

## Gift Streak (stejný uživatel, dny po sobě)

| Streak | Bonus XP |
|--------|----------|
| 3 dny | +10 % |
| 7 dní | +25 % |
| 30 dní | +100 % |

**Stav:** 🔴 vyžaduje per-user streak cache (runtime / krátká persistence).

---

## Týmový systém a duely

- Týmy: **TEAM PRSTITEL**, **TEAM ŠPIŇÁK** (a další streamy)
- Každý gift → **team points** + **duel power**  
  `100 coinů ≈ 100 power` (vize; duel modul používá `itemPower` / `miaPoints`)
- MIA zobrazí sílu obou stran: `██████████`
- **Host režim:** body sdílené nebo rozdělené mezi hosty (`OBS Ninja`)

**Stav:** 🟢 duel bodový závod · 🟡 host split · 🔴 vizuální power bar

---

## Reakce MIA — nezávislé kanály

Každý tier / gift může zapínat **samostatně**:

| Kanál | Příklad |
|-------|---------|
| `voiceReaction` | TTS Edge |
| `videoReaction` | tier rotace OBS |
| `avatarFlyby` | avatar prolétne streamem |
| `aiText` | LLM / text banka |
| `animation` | Koj sprite / gift visual |
| `soundEffect` | OBS audio |
| `overlay` | bublina / boss banner |

Speaker routing: MIA primary · Koj companion · duo u milníků.

---

## Animace podle Koj stavu

Stejný gift → **různé animace** podle:

- nálady Koj (happy, hungry, sick, …)  
- hlad / miska  
- péče komunity vs neglect  
- care bond  

Detail: [`KANON_MIA_AGENT.md`](./KANON_MIA_AGENT.md) §10 · `resolveVariantIndex()`.

**Kapybara** (`animal_small`, `pet_react`): reprezentativní gift s extra chatem v AWAY (20s → wait comment → AI).

---

## Normalizovaný formát (po ingestu)

```json
{
  "eventType": "GIFT",
  "platform": "tiktok",
  "source": "tikfinity",
  "user": {
    "userId": "2743946",
    "nickname": "Pepa",
    "username": "pepa_tt",
    "avatarUrl": "https://..."
  },
  "support": {
    "giftId": "5655",
    "giftName": "Rose",
    "coins": 1,
    "repeatCount": 1,
    "giftCount": 1,
    "giftValue": 1,
    "totalCoins": 1
  }
}
```

---

## Resolved gift context (výstup Gift Map + Resolver)

Cílová struktura pro decision layer a Cursor backend:

```json
{
  "giftName": "Rose",
  "giftKey": "rose",
  "giftValue": 100,
  "streamTier": "T1",
  "obsTier": "T1",
  "animationSlot": "T1_VIDEO_03",
  "xp": 100,
  "miaPoints": 750,
  "power": 100,
  "teamPoints": 100,
  "teamId": "team_prstitel",
  "giftLevel": 3,
  "giftLevelLabel": "Podporovatel",
  "comboEligible": true,
  "comboTier": null,
  "streakBonusPct": 0,
  "voiceReaction": true,
  "videoReaction": true,
  "overlay": true,
  "avatarFlyby": true,
  "animation": {
    "effectProgram": "flower_support",
    "animationOwner": "mia",
    "variantIndex": 12,
    "kojMood": "happy"
  },
  "duelImpact": { "power": 100, "side": "local" },
  "communityImpact": { "bowlDelta": 1, "bondDelta": 0.5 },
  "rewards": [{ "type": "item", "itemId": "snack" }],
  "leaderboard": { "hallOfFameEligible": false }
}
```

Pole `giftValue` / `coins` **nikdy** neposílat do overlay payloadu pro diváky.

---

## Gift Map — mapování významu (ne cena)

Gift mapa mapuje **název → význam**, ne Kč:

| TikTok gift | Interní klíč | Význam |
|-------------|--------------|--------|
| Rose | `rose` | `small_support` |
| Perfume | `perfume` | `medium_support` |
| Galaxy | `galaxy` | `big_support` |
| Kapybara | `animal_small` | `pet_react` + chat loop (AWAY) |

Coin rozsah určuje **stream tier T1–T6**; název určuje **animaci a Koj reakci**.

---

## Tok podle kánonu (checklist)

1. TikTok/Kick RAW  
2. INGEST — bez logiky  
3. NORMALIZACE — `normalize_event.js`  
4. GIFT MAP — `resolveGiftProfile()`  
5. SUPPORT RESOLVER — tier, miaPoints, giftProfile  
6. DECISION — `decision_engine.js`, spam session, duel  
7. MIA / Koj — response engine, speaker routing  
8. BODY — overlay bez coinů  
9. MISKA — Koj engine  
10. INVENTÁŘ — backpack reward  
11. OVERLAY + TTS + VIDEO  

---

## Battle / Combat (omezení)

- Fan avatary: **jen prezentace**, ne bojové scény  
- Gift **nesmí** ničit avatary fanoušků  
- Combat FX = **realtime** shader / neon / transformace — **ne** předrenderované bojové video  
- Duely = **body týmů**, ne deathmatch video  

---

## Implementační roadmap (pro Cursor)

| Priorita | Úkol | Stav |
|----------|------|------|
| 1 | Sjednotit tier prahy T1–T6 (coin) s resolverem + T5 video | 🟢 |
| 2 | Rozšířit Gift Map o `reactions`, `rewards`, `teamPoints` schema | 🟡 |
| 3 | Gift Level + streak cache per user (runtime) | 🟢 |
| 4 | COMBO / SUPER / ULTIMATE overlay | 🟢 |
| 5 | Boss T4 / Mega T5 / Legend T6 event stavový automat | 🟡 banner |
| 6 | Automatické mapování stovek TikTok giftů → tier | 🟡 coin auto, jména v gift map |
| 7 | Care-aware animace (`resolveVariantIndex` + vitals) | 🟢 |
| 8 | Host team point split | 🟡 |

---

## Verze

- **Gift Economy Canon:** v1  
- **Gift Map kód:** `GIFT_MAP_VERSION` v `MIA_GIFT_MAP.js`  
- **Support resolver:** `MIA_SUPPORT_RESOLVER` + `SUPPORT_TIER_THRESHOLDS`
