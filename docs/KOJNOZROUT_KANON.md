# KOJNOŽROUT — kompletní kánon, logika, funkce a toky

Referenční kodex entity Kojnožrout v ekosystému MIA.  
Implementační mapa: [KOJNOZROUT_CANON_ALIGNMENT.md](./KOJNOZROUT_CANON_ALIGNMENT.md)

---

## Základní identita

Kojnožrout je **samostatná AI entita** a komunitní herní vrstva v ekosystému MIA.

Není to jen chatbot, avatar ani overlay efekt.

Kombinace:

- virtuálního mazlíčka
- komunitního maskota
- herního systému
- sociálního indikátoru nálady komunity
- dlouhodobě rostoucí entity
- budoucího gameplay prvku

**Inspirace:** Tamagotchi · Pokémon · virtuální pet systémy · komunitní event systémy

---

## Hlavní role

### 1. Živý člen streamu

Neustále přítomen. Nečeká pouze na gifty.

Sleduje: chat · support · náladu · aktivitu komunity · chování streamera

### 2. Komunitní mazlíček

Komunita se o něj stará — krmí · léčí · uklidňuje · baví · chrání

### 3. Zdroj komunitních momentů

Vytváří vtipné situace, spontánní eventy a společné cíle.

**Příklad:** Kojnožrout je smutný → MIA oznámí stav → komunita reaguje → mini-event péče

---

## Umístění na streamu

| Pravidlo | Detail |
|----------|--------|
| Trvalá pozice | Pravý dolní roh, vždy viditelný |
| Priorita | Streamer → **Kojnožrout** → MIA (nejvyšší priorita AI entit) |
| OBS overlay | `kojnozrout-runtime.html` + `kojnozrout-bowl-overlay.html` |

---

## Chování

### Výchozí stav

Většinu času **spí / odpočívá / pozoruje** (`watching`, `calm`, `cozy`, `sleepy`).

Není hyperaktivní. Nereaguje na všechno.

### Aktivace

Probouzí se při: gifech · podpoře · péči · silných emocích · speciálních eventech

### Zdroje energie (ne jen gifty)

| Zdroj | Význam |
|-------|--------|
| Chat | aktivní komunikace |
| CARE | přímá péče |
| Support | podpora projektu |
| Nálada komunity | pozitivní atmosféra |
| Přítomnost | aktivní sledující |

---

## Doménová hierarchie

```
Community Activity
        ↓
      CARE
        ↓
    SUPPORT
        ↓
 Major Events (T1–T4)
```

CARE je **silnější** než běžná aktivita chatu.

---

## CARE doména

Samostatný systém s vlastní logikou.

| Péče | Chat / příkazy | Modul |
|------|----------------|-------|
| Krmení | nakrmit, krmím, papání | `MIA_KOJNOZROUT_CARE.js` |
| Podrbání | podrbej, drbání | ↑ |
| Uklidnění | klid, uklidni se | ↑ |
| Léčení | vyléčit, obvaz, lék | ↑ |
| Pozornost | pozornost, pomazlit | ↑ |
| Venčení | vencit, procházka | `MIA_KOJNOZROUT_WALK.js` (stub+) |

Menu: příkaz **`pece`** → `MIA_KOJNOZROUT_CARE_OPPORTUNITIES.js`

### CARE validace

Každá péče prochází validací (`MIA_KOJNOZROUT_CARE_VALIDATION.js`):

- **kdo** péči provedl (per-user cooldown)
- **jak často** (anti-spam stejné akce)
- **kontext** (léčení když není nemocný = soft péče, ne blok)

### CARE výstupy

Péče ovlivňuje: **Mood** · **Bond** · **Trust** · **Activity** · **Neglect**

Moduly: `MIA_KOJNOZROUT_BOND.js` · `MIA_KOJNOZROUT_VITALS.js`

---

## NEGLECT (zanedbání)

Dlouho bez péče → smutek · únava · spánek · pasivita

Zobrazení v bowl overlay + `describeBehavior()` v care opportunities.

---

## BOWL systém (miska)

Hlavní interakční prvek komunity.

| Stav | Popis |
|------|-------|
| prázdná | 0–30 % |
| částečně plná | 31–94 % |
| plná | ≥ 95 % → oslava + **T4 event** |

**Naplňování:** gifty · support · speciální akce · CARE krmení

**Vyvrcholení:** plná miska → `celebrate` sprite → T4 video (`MIA_BOWL_FULL_VIDEO.js`, `KOJNOZROUT_BOWL_ENGINE.js`)

Modul cyklu: `processBowlCycle` každých 750 ms v `index.js`

---

## Eventy (T1–T4)

| Tier | Význam |
|------|--------|
| T1 | menší událost |
| T2 | střední |
| T3 | velká |
| T4 | speciální — **aktivace plnou miskou** |

---

## Reakční logika

**Pořadí:** nejdříve **MIA**, poté **Kojnožrout** (`MIA_KOJNOZROUT_REACTION_ORDER.js`)

Příklad:

> Divák: „Jsem dnes smutný.“  
> MIA: „To mě mrzí, drž se.“  
> Kojnožrout (po ~3 s): „Přinesu imaginární ponožku štěstí.“

Emoční intenty → deferred Koj overlay přes runtime execution bridge.

---

## Nálady a sprity

Kojnožrout sleduje: radost · smutek · naštvanost · nemoc · únavu · chaos · oslavu

**290 PNG** v `assets/kojnozrout/moods/` — mapování v `MIA_KOJNOZROUT_DISPLAY.js`:

| Kontext | Sprite |
|---------|--------|
| Vitals (sleepy, sick, sad…) | vital moods |
| Krmení | `eating-01`…`eating-12` rotace |
| Plná miska | `celebrate` |
| Combo / duel / gift | `combo`, `duel`, `gift` |
| Video reakce | `watch` → `groove` → `dance` → `hype` |
| Klid / odpočinek | `calm`, `cozy` |

---

## Vícepozicová animace (výtah – aktuální stav grafiky)

Cíl: **skutečný pohyb, ne klouzání jedné statické PNG**. Každá hlavní nálada
má vícesnímkový cyklus přehrávaný v runtime overlayi.

**Katalog:** `scripts/kojnozrout_pose_frames.js`
- `POSE_CYCLES` — sekvence snímků + kadence (`halfMs`) + `moods`/`when`
- `PAIRED_FRAME_SOURCES` — definice AI párů (`{mood}-a`, `{mood}-b`) z kánonické reference
- `MOOD_F2_SPECS` / `DERIVED_F2_SPECS` — fallback: druhý snímek transformem (squash/lean) přes `kojnozrout_canon_transform.js`

**Runtime:** `kojnozrout-runtime.html` načítá **`assets/kojnozrout/pose-catalog.js`**
(auto-generováno `npm run generate:koj-poses` ze `scripts/kojnozrout_pose_frames.js`).
Katalog je jediný zdroj `POSE_CYCLES` + `resolvePoseCycle` — runtime už nedrží duplicitní kopii.

**Pravidla pohybu (sjednoceno):**
- **Wander (CSS traverse)** jen u `CALM_WANDER_MOODS` (idle, calm, warm, happy, curious, thinking, story…).
  Explicitní ambient (hop, wave, sit, watch…) zůstane stát a hraje svůj pose cyklus.
- **Walk-a/b** jen když wander + klidná nálada; kadence kroků = `--koj-step-dur` (sync s `lastStepDurMs`).
  Při walk-a/b je CSS waddle vypnutý (`pose-walk-frames`) — jeden autor kroku.
- **Video/groove/dance/hype:** při aktivním pose cyklu vypnutá slot CSS animace (`pose-frames-active`).
- **Bugfix:** `full` → cyklus `full-a/b`, ne `stretch`.

**Pipeline tvorby snímku:**
1. AI generace s kánonickou referencí (fialové tělo, zelené bříško, 2 tesáky, chochol, drápky; **bez** černého obrysu / rohů / ocasu) na bílém pozadí
2. Alpha-key: `scripts/kojnozrout_prepare_sprite.js` (flood-fill neutrálního pozadí → RGBA)
3. Normalizace: `scripts/kojnozrout_normalize_frames.js` (sharp/libvips) — trim → horizontální střed na **768**, nohy na baseline **995**, airborne pózy nadzvednuté. Odstraňuje horizontální klouzání i poskakování nohou mezi framy. Záloha v `_prenorm_backup`.
4. Audit + manifest: `scripts/kojnozrout_generate_pose_frames.js`

**npm:** `prepare:sprites` · `normalize:frames` · `normalize:frames:check` · `generate:koj-poses` · `koj:self-check`

**MIA smysly (vizuální self-check):**
- **Záměr** — server `kojDisplay` v `/overlay-state`
- **Propriocepce** — overlay POSTuje `/mia/koj/render-report` (cyklus, frame, rozbitý PNG)
- **Zrak** — `MIA_EYES` screenshot + `analyzePngBase64Coverage` (pokrytí, bbox)
- **Koj self-check:** `npm run koj:self-check` → VERDIKT OK/WARN/FAIL

**MIA celozobrazový zrak (všechny overlaye):** `scripts/MIA_DISPLAY_VISION.js` + `/mia/display/self-check`
- Čte canvas (`GetVideoSettings`) a layout všech overlayů (`GetSceneItemList`/`GetSceneItemTransform`).
- Posoudí: overlay **mimo obraz**, **překryvy** trvalých overlayů (miska × Koj…),
  **velikost/čitelnost**, chybějící/vypnutý trvalý overlay, **prázdný** overlay (chybí PNG).
- Bublina je průhledný full-area kontejner → bbox překryv se neřeší; skutečnou bublinu
  hlásí propriocepce (`/mia/speech/render-report`): přetékající text, zásah mimo rámec,
  překryv s hologramem i **přesný překryv s Kojem** (mapování viewport→canvas).
- **Blikání:** dvě měření po ~1.2 s — když overlay skáče blank↔obsah.
- **Spuštění:** `npm run display:self-check` → VERDIKT OK/WARN/FAIL s návrhy.

**Orientace plátna (DŮLEŽITÉ pro TikTok):** TikTok LIVE je 9:16 → OBS plátno musí být
**na výšku 1080×1920**, jinak se overlaye rozloží na šířku.
- `npm run obs:portrait` → přepne plátno na 1080×1920 (TikTok) a přerovná overlaye.
- `npm run obs:landscape` → 1920×1080 (na šířku).
- Skript dočasně vypne virtuální kameru/stream (OBS neměnní plátno za běhu výstupu) a zase je zapne.

**Pokrytí (k 249 cyklovým snímkům):** ~58 nálad má reálný AI pár `-a/-b`
(walk, hop, dance, wave, sit, play, munch, stretch, guard, love, excited, sad,
sleepy, hungry, warm, full, annoyed, laugh, celebrate, gift, duel, combo, watch,
sick, happy, thinking, proud, curious, shy, peek, wink, calm, comfort, surprised,
react-gift, react-video, react-chat, thanks-bow, hatch-wiggle, neglect-droop,
party-pop, hype-jump, heal-glow, cozy, yawn, love-hug, bond-warm, groove, party,
snack, sip, alert, proud-stand, cozy-blanket, shy-hide, calm-deep, egg-rest,
stressed, rest). Zbylé méně časté stavy (`idle`, `eating` rotace 01–12, `bounce`,
`perch`…) běží na `f2` fallbacku nebo dedikované eating sekvenci.

---

## Adaptace a evoluce

Dlouhodobě se mění podle komunity, podpory, chatu a historie streamů.

Modul: `MIA_KOJNOZROUT_EVOLUTION.js` · tiery: egg → legend

---

## Batoh (inventář)

`item` · `batoh` · `použij jablko` · fronta diváků

`MIA_KOJNOZROUT_BACKPACK.js` · `MIA_KOJNOZROUT_ITEM_COMMAND.js`

---

## Battle / duel

Koj A vs Koj B · 5 min · body nepod HP · `MIA_KOJNOZROUT_DUEL.js`

---

## Avatar interakce *(budoucí)*

Viewer s avatarem může vizuálně: krmit · podrbat · léčit · pečovat

**Omezení:** avatar assety **nesmí** do bojových scén ani násilných situací.

---

## Playlist vrstva *(budoucí)*

Song Queue — support se ukládá i bez okamžitého video eventu.

---

## Vztah k MIA

| MIA | Kojnožrout |
|-----|------------|
| hlavní inteligence | emoce + komunita |
| hlavní hlas | péče + herní vrstva |
| rozhodování | gift lane, CARE, miska |

### Tři vrstvy existence

1. **Interní AI** — MIA + Koj spolupracují v pipeline
2. **Streamová** — diváci vidí MIA + Kojnožrouta
3. **Aplikační** — účty, profily, body, odměny

---

## Budoucí směr

nálady · levely · vztahy · komunitní úkoly · předměty · batoh · péče · léčení · krmení · evoluce · avatar interakce · dlouhodobá paměť · propojení s MIA světem · režim **NEJSEM TU**

**Cíl:** živá komunitní entita odrážející chování celé komunity — vlastní příběhy, eventy a motivace k pravidelné interakci.

---

## Implementační index

| Oblast | Soubor |
|--------|--------|
| Core state | `MIA_KOJNOZROUT_ENGINE.js` |
| Display / sprites | `MIA_KOJNOZROUT_DISPLAY.js` |
| CARE | `MIA_KOJNOZROUT_CARE.js` |
| CARE validace | `MIA_KOJNOZROUT_CARE_VALIDATION.js` |
| CARE questy | `MIA_KOJNOZROUT_CARE_QUEST.js` |
| Bowl | `KOJNOZROUT_BOWL_ENGINE.js` |
| Bowl T4 | `MIA_BOWL_FULL_VIDEO.js` |
| Vitals | `MIA_KOJNOZROUT_VITALS.js` |
| Bond / neglect | `MIA_KOJNOZROUT_BOND.js` |
| Reakční pořadí | `MIA_KOJNOZROUT_REACTION_ORDER.js` |
| Runtime sprite | `kojnozrout-runtime.html` |
| Miska HUD | `kojnozrout-bowl-overlay.html` |
| Overlay API | `GET /overlay-state` v `index.js` |
