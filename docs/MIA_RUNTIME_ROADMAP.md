# MIA Runtime Roadmap

**Stav:** oficiální další roadmapa (architektura / runtime)  
**Datum:** 2026-07-20  
**Cíl:** stabilní, efektní a snadno rozšiřitelný streamový systém — ne další stovka funkcí najednou.

---

## Produktové vrstvy

| Vrstva | Co to je | Co to není |
|--------|----------|------------|
| **MIA Runtime** | To, co skutečně běží na streamu (ingest → rozhodnutí → akce → OBS/TTS) | Návrh v kánonu ani editor bez live vazby |
| **MIA Studio** | Rig Desk, Gift Animation Desk, nastavení grafiky, testovací nástroje | Samostatný „produkt místo streamu“ |
| **MIA Canon** | Dokumentace, pravidla, alignment, budoucí funkce | Runtime chování |

Dokud něco není v **Runtime**, neříkáme, že to „v MIA existuje“ — může to být jen v Canonu nebo ve Studiu.

---

## Grafika (oddělená osa)

Runtime roadmapa **není** grafický inkrement.

| Položka | Stav |
|---------|------|
| Freeze / baseline | `v=32-gfx-whole` — [`GRAPHICS_CHECKPOINT_v32.md`](./GRAPHICS_CHECKPOINT_v32.md) |
| Celek produktu | [`MIA_GRAPHICS_WHOLE.md`](./MIA_GRAPHICS_WHOLE.md) |
| Active runtime bust | **`v=36-koj-unify`** (speech / Koj / bowl) |
| Gift-only polish | **`v=37-stream-polish`** |
| Předstream | [`MIA_PRESTREAM_DOD.md`](./MIA_PRESTREAM_DOD.md) |

Další grafika = inkrementální bust proti v32. Runtime práce (fronta, director, replay…) se řídí tímto dokumentem a **nemění** freeze deklaraci.

---

## Tvrdá pravidla (neměnit)

1. **Overlay nikdy neexponuje coins / hodnotu giftů** — jen `miaPoints` (a oslava / jméno).
2. **Tok:** TikFinity → MIA → OBS. OBS jen renderuje; business logika v MIA.
3. **Dual voice** default **OFF** (anti-echo / jeden hlasový výstup, dokud operátor výslovně nezapne jinak).
4. **Žádný big-bang split `index.js`** — dělení jen po fázích, inkrementálně, bez rozbití live streamu.

---

## Verdikt (priorita skoku)

Největší skok teď neudělá nová grafika ani další avatar. Udělá ho trojice:

**Action Queue + MIA Director + Replay systém**

- **Action Queue** — zabrání chaosu na obrazovce a v hlase  
- **MIA Director** — ze streamu řízená show, ne pět pluginů  
- **Replay** — chyby se dají znovu přehrát a opravit, ne lovit v logu  

Prakticky: Fáze 1 staví stabilitu (včetně fronty a replay logu); Director je první bod Fáze 2, ale je součástí stejného verdiktu.

Checklist Fáze 1: [`MIA_PHASE1_STABILITY.md`](./MIA_PHASE1_STABILITY.md)

---

## 15 bodů plánu (organizováno)

### A. Runtime páteř (body 1–4, 11–12)

#### 1. `index.js` jen jako dirigent

Cílová struktura (postupné vytahování, ne big-bang):

```text
index.js
 ├─ ingest/
 │   ├─ tikfinity.js
 │   └─ kick.js
 ├─ core/
 │   ├─ event-normalizer.js
 │   ├─ gift-engine.js
 │   ├─ chat-engine.js
 │   ├─ points-engine.js
 │   ├─ battle-engine.js
 │   └─ koj-care-engine.js
 ├─ output/
 │   ├─ obs-controller.js
 │   ├─ overlay-bus.js
 │   ├─ tts-controller.js
 │   └─ video-controller.js
 └─ config/
     ├─ gifts.json
     ├─ tiers.json
     ├─ voices.json
     └─ runtime.json
```

Výhoda: když spadne gift větev, nepřestane mluvit MIA, nezmizí Koj a nerozsype se celý stream.

#### 2. Jednotný interní event

TikFinity, Kick, test panel i budoucí platformy → stejný formát. Příklad:

```json
{
  "id": "event-123",
  "platform": "tiktok",
  "type": "gift",
  "user": { "id": "456", "name": "Pepa", "avatar": "..." },
  "gift": {
    "name": "Rose",
    "coins": 1,
    "miaPoints": 7.5,
    "count": 1
  },
  "timestamp": 1784580000000
}
```

Poznámka: `coins` smí zůstat v **interním** eventu pro výpočet / mapování; na **overlay** jdou jen `miaPoints` (a oslava), nikdy coins.

Tok po normalizaci:

```text
EVENT → rozhodnutí → akce → OBS / TTS
```

#### 3. Action Queue

Akce nesmí bojovat o obrazovku a hlas. Priorita (návrh):

| Akce | Priorita |
|------|--------:|
| Technická chyba | 100 |
| T4 / velký gift | 90 |
| Battle výsledek | 85 |
| T3 | 70 |
| T2 | 60 |
| Přímá odpověď MIA | 50 |
| T1 | 40 |
| Idle hláška | 10 |

Fronta řídí: kdo mluví, co běží za video, který overlay je vidět, co lze přerušit / sloučit / zahodit při spamu. Příklad: 30 malých giftů → jedna sloučená věta, ne 30 překřikujících se TTS.

#### 4. MIA Director (`mia-director`)

Centrální režie situace jako celku:

- nálada streamu  
- kdo mluví (MIA / Koj)  
- intenzita efektů, výběr animace  
- kamera / layout  
- klid vs. chaos  

Příklady momentů: malý gift (bublina + světlo + jemný zvuk) · velký gift (ztmavení + profilovka + 10s stage + Koj + TTS) · plná bowl (alarm + nálada + T4 video + reset + oslava).

#### 11. Stream Recovery (watchdog)

Při pádu: znovupřipojení TikFinity / OBS websocket, restart TTS, ukončení zaseknutého videa, zachování fronty, načtení bowl + Koj ze souboru.

Soubor stavu např. `runtime-state.json` — ukládat každých 5–10 s a při zásadní změně.

#### 12. Replay systém

Každý vstupní event do logu (JSONL). Spuštění nanečisto:

```bash
npm run replay stream-2026-07-20.jsonl
```

Bez živého TikToku: video nespustilo, Koj 2×, rotace, TTS skip — přehrát a opravit.

---

### B. Streamová kvalita a nástroje (body 7–10, 13)

#### 7. Gift Animation Desk — bloky

Současný 10s stage zůstává základem. Doplnit skládání z předpřipravených bloků (varianty per gift), ne AI video:

```text
ÚVOD → profilovka → gift objekt → MIA/Koj reakce → jméno + body → zakončení
```

Lokální, rychlé, opakovatelné, levné.

#### 8. Combo momenty

Rozpoznat událost jako celek (ne jen jeden gift): solo combo, community combo, first support, bowl rush, gift storm, legendary moment — vlastní overlay / zvuk / hláška.

#### 9. Paměť diváků

Lokální bezpečné streamové statistiky (`totalMiaPoints`, gift/chat count, first/last seen, favoriteGift…). Žádné citlivé věci ani celé soukromé konverzace — jen streamové statistiky a herní postup.

#### 10. MIA Control Center

Lokální admin: `http://localhost:3000/admin` — stav TikFinity / Kick / OBS / TTS, fronta, běžící akce, bowl, Koj, eventy, chyby, test tlačítka (T1–T4, points, bowl, Koj hungry, battle, STOP ALL).

#### 13. Grafický Theme Manager

Témata nad grafikou (Cyber, Purple Robot, Arena, Cute Koj, Dark Tech, Christmas, Halloween, Party…) — barvy, pozadí, částice, zvuky, MIA FX, Koj skin, gift stage. Jedním přepínačem celý stream. (Grafická osa; runtime jen přepíná aktivní theme.)

---

### C. Herní vrstva (body 5–6, 14)

#### 5. Kojnožrout 2.0

Trvalé stavy (hlad, energie, nálada, důvěra, únava, čistota, tech nabití) + viditelné projevy. Stav přetrvá mezi streamy.

#### 6. Tech Forms jako funkce, ne jen skin

Scout / Battle / Party / Guardian / Overload — každá forma mění chování (reakce, HUD, efekty, ochrana, krátký boss mode).

#### 14. Battle MVP uzavřít

Jednoduchá stabilní ~5min hra: před (oznámení, Koje, countdown) → během (energie/itemy, 1 akce / interval, jasný HUD) → po (skóre, animace, top diváci, odměna). Žádné MMORPG v první verzi.

---

### D. Produktové hranice (bod 15)

#### 15. Jasné verze produktu

Runtime / Studio / Canon — viz tabulka nahoře. Fáze 4 (instalátor, multi-tenant…) až po stabilním Runtime.

---

## Fáze realizace (pořadí)

### Fáze 1 — Stabilita

1. Jednotný event formát  
2. Rozdělení `index.js` (inkrementálně — dirigent, ne big-bang)  
3. Action Queue  
4. Runtime state (`runtime-state.json`)  
5. Watchdog / recovery  
6. Replay log  

→ checklist: [`MIA_PHASE1_STABILITY.md`](./MIA_PHASE1_STABILITY.md)

### Fáze 2 — Kvalita streamu

1. MIA Director  
2. Combo momenty  
3. Paměť diváků  
4. Control Center  
5. Gift Animation bloky  

→ progress: [`MIA_PHASE2_PROGRESS.md`](./MIA_PHASE2_PROGRESS.md) *(slice shipped 2026-07-20)*

### Fáze 3 — Herní vrstva

1. Koj dlouhodobé potřeby  
2. Tech Forms  
3. Battle MVP  
4. Inventář  
5. Divácké profily a úrovně  

→ progress: [`MIA_PHASE3_PROGRESS.md`](./MIA_PHASE3_PROGRESS.md) *(MVP shipped 2026-07-20)*

Checklist:

- [x] Koj dlouhodobé potřeby (fatigue/techCharge + persist)  
- [x] Tech Forms (flag `MIA_TECH_FORMS`)  
- [x] Battle MVP (announce → countdown → active)  
- [x] Inventář (thin)  
- [x] Divácké levels (viewer-memory)  

### Fáze 4 — Budoucí produkt

1. Konfigurační profily streamerů  
2. Instalátor  
3. Export / import nastavení  
4. User Mode  
5. Multi-tenant až úplně nakonec  

Checklist:

- [x] Konfigurační profily streamerů (`data/streamer-profiles/`, `/api/mia-admin/profiles`)  
- [x] Instalátor (docs + `npm run setup:mia` — ne EXE)  
- [x] Export / import nastavení  
- [x] User Mode stub (`MIA_USER_MODE=0`)  
- [x] Multi-tenant — deferred (docs only)  

→ progress: [`MIA_PHASE4_PROGRESS.md`](./MIA_PHASE4_PROGRESS.md) · changelog 1–4: [`MIA_PHASES_1_TO_4_CHANGELOG.md`](./MIA_PHASES_1_TO_4_CHANGELOG.md) *(MVP shipped 2026-07-20)*

---

## Co teď nedělat

- Big-bang přepis `index.js`  
- Honění nových avatarů / grafiky místo Fáze 1  
- Exponovat coins na overlay  
- Zapínat dual voice jako default  
- Tvrdit, že Canon modul „už běží“, dokud není napojený na Runtime  

---

## Související

- [`MIA_PHASE1_STABILITY.md`](./MIA_PHASE1_STABILITY.md) — checklist Fáze 1 (go)  
- [`MIA_PHASE2_PROGRESS.md`](./MIA_PHASE2_PROGRESS.md) — Fáze 2 stream quality slice  
- [`MIA_PHASE3_PROGRESS.md`](./MIA_PHASE3_PROGRESS.md) — Fáze 3 Game Layer MVP  
- [`MIA_PHASE4_PROGRESS.md`](./MIA_PHASE4_PROGRESS.md) — Fáze 4 product boundary MVP  
- [`MIA_PHASES_1_TO_4_CHANGELOG.md`](./MIA_PHASES_1_TO_4_CHANGELOG.md) — souhrn Fází 1–4  
- [`MIA_INSTALLER.md`](./MIA_INSTALLER.md) — setup / installer stub  
- [`GRAPHICS_CHECKPOINT_v32.md`](./GRAPHICS_CHECKPOINT_v32.md) — graphics freeze  
- [`MIA_GRAPHICS_WHOLE.md`](./MIA_GRAPHICS_WHOLE.md) — grafický celek  
- Guardrails: TikFinity → MIA → OBS · jen `miaPoints` na overlay · video rotace per-tier  

*Roadmapa formalizována z prioritního návrhu 2026-07-20. Implementace Fáze 1 začíná až po explicitním „go“.*
