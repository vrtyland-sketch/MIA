# Kojnožrout — robot + mazlíček (herní logika)

**Stav:** návrh + minimální code hooks · **Datum:** 2026-07-19  
**Cíl:** dual nature (Pet Core vždy / Tech Forms odemykatelné) bez rozbití CARE, misky, gift/overlay pipeline.  
**Fiction (Soft Neon):** *V Soft Neon labu je Koj fialový cyborg-mazlíček — bříško projektor, oči senzory — vždy živý pet, který se na povel MIA přepne do tool režimu.*

---

## 1. Verdikt

Koj už **je** robot v artu (cyborg / soft neon / projector belly), ale runtime state je čistě **Tamagotchi × Pokémon companion**:

| Už existuje | Ještě chybí |
|-------------|-------------|
| hunger, energy, mood, vitals, sleep/sick | `robotModes` / Tech Forms |
| bowl + gift → miaPoints feed | transform unlock / cooldown / cost |
| CARE, bond, neglect | sync s MIA jako commander |
| batoh + itemy (shield, boost…) | Koj-as-weapon bez smrti pet fantasy |
| duel = MIA points race (ne HP deathmatch) | formy: Assistant, Shield, Battle Tool, Scanner, Projector |
| evoluce (egg → legend) | combatPower / miaSync jako odvozené stats |
| battle choreography (pózy) | napojení forem na choreografii |

**Pet Core zůstává vždy zapnutý.** Tech Form je vrstva *navíc* — ne náhrada mazlíčka.

---

## 2. Role v ekosystému MIA

```
Diváci (CARE / gift / chat)
        ↓
   Pet Core (živý stav)
        ↓
MIA = commander / hlas / rozhodnutí
        ↓
Koj = pet + asistent + (dočasná) zbraň/nástroj
        ↓
OBS = jen render (bez coins)
```

| Entita | Role |
|--------|------|
| **MIA** | velitelka, AI asistentka streamu, rozhoduje *kdy* a *proč* forma |
| **Koj** | mazlíček komunity + vykonavatel forem (projekce, štít, scan…) |
| **Komunita** | krmí, pečuje, odemyká sync; bez péče formy slábnou |
| **OBS** | sprite / HUD / duel overlay — nikdy coins, jen `miaPoints` / pet UI |

---

## 3. Dual nature

### 3.1 Pet Core (always on)

Nikdy se nevypíná. I ve formě Shield/Battle Tool běží:

- **Tamagotchi:** hunger ↑ v čase, energy ↓, sleep, sick, neglect
- **Péče:** CARE (`nakrm`, `podrbi`, `leč`…), bowl, batoh itemy
- **Bond:** careBond / satisfaction / neglect (`MIA_KOJNOZROUT_BOND.js`)
- **Mood / display:** vitals → expressive mood → sprite
- **Evoluce:** feedPoints → tier (`MIA_KOJNOZROUT_EVOLUTION.js`)

**Pravidlo:** forma **nesmí** zrušit hlad, spánek ani potřebu péče. Maximálně krátkodobě maskuje náladu (např. Shield overlay pose), pak Pet Core zase „prosvítá“.

### 3.2 Tech Forms (unlocked modes)

Dočasné **režimy robotického hardwaru** Koje. Výchozí = `pet`.

| Form ID | Název | Fiction hook | Gameplay |
|---------|-------|--------------|----------|
| `pet` | Mazlíček | default soft neon body | CARE, bowl, idle/wander |
| `assistant` | AI asistent | sync s MIA — tipy, menu, pece | MIA komentář + Koj „pomocník“ |
| `shield` | Obrana | bříško = energy shield | duel/item shield bonus, defend pose |
| `battle_tool` | Bojový nástroj | drápky/tool mount | choreografie attack/defend, **bez HP death** |
| `scanner` | Skener | oči = senzory | highlight potřeby (hungry/sick), care quest hint |
| `projector` | Projektor | bříško/oko = beam | gift/react video „watch“, spotlight moment |

Kotvy artu (belly / eye) z `anchors/koj.json` a Soft Neon Rig Desk jsou **vizuální kotvy forem** — ne nový 3D systém.

---

## 4. Stats (mapa na existující state)

| Herní stat | Zdroj v runtime | Poznámka |
|------------|-----------------|----------|
| **affection** | `bond.careBond` (+ satisfaction) | pet fantasy |
| **hunger** | `hunger` / vitals | Tamagotchi |
| **energy** | `energy` / sleepDepth | formy spotřebovávají energy |
| **combatPower** | odvozené: evolutionTier + bondTier + energy − neglect | Pokémon-lite; ne HP |
| **miaSync** | nové v `robotModes.miaSync` (0–100) | jak dobře Koj „slyší“ MIA |
| **bowl** | `bowlPercent` | komunita / T4 |
| **feedPoints** | evoluce | dlouhodobý růst |

**combatPower (návrh vzorce, implementace později):**

```
base(tier) + 0.08*careBond + 0.25*energy − 0.3*neglect
```

Clamp 0–100. Použít v duelu jako *bonus k týmovým miaPoints*, ne jako damage.

**Overlay:** zobrazovat affection / energy / form name / miaPoints — **nikdy coins**.

---

## 5. Transformace — pravidla

### 5.1 Kdy je forma povolená

| Podmínka | `pet` | Tech Form |
|----------|-------|-----------|
| Default | ✅ | — |
| hunger ≥ 85 nebo sick / critical neglect | ✅ only | ❌ (Pet Core lock) |
| sleeping (hluboký spánek) | ✅ | ❌ kromě `scanner` soft wake? → **ne**; nejdřív wake CARE/gift |
| aktivní feeding pulse (~9 s) | ✅ | odložit transform |
| duel aktivní | ✅ | prefer `shield` / `battle_tool` |
| MIA command / community unlock | — | ✅ pokud energy + cost OK |

### 5.2 Cooldown a délka

| Parametr | Návrh |
|----------|--------|
| Max délka formy | 45–90 s (assistant/scanner kratší; shield/battle dle duelu) |
| Cooldown po návratu do `pet` | 30–60 s |
| Stejná forma znovu | +15 s cooldown |
| Hard reset | bowl full celebrate / evoluce → vždy `pet` na 10 s (pet moment) |

### 5.3 Cost (měna = miaPoints / CARE / energy — ne coins na overlay)

| Zdroj cost | Použití |
|------------|---------|
| **energy** | primární — každá forma −X energy (5–20) |
| **miaPoints** (internal) | unlock / silný transform (gift tier T2+) |
| **CARE akce** | soft unlock (např. 3× péče → krátký assistant) |
| **batoh item** | shield item → prefer form `shield` |

Interní ledger může dál držet `totalFedCoins` pro statistiku — **overlay a chat copy ukazují jen miaPoints / péči**.

### 5.4 Kdo spouští transform

1. **MIA** (commander) — po rozhodnutí / event bridge  
2. **Systém** — duel start → nabídka shield/battle_tool  
3. **Komunita** — CARE quest / item use (ne spam chatem)

Divák **nepíše** „transform shield“ jako hlavní API; MIA to ohlásí („Koj přepíná na štít!“).

---

## 6. Battle: Koj jako zbraň bez zabití pet fantasy

Existující duel (`MIA_KOJNOZROUT_DUEL.js`):

> závod **miaPoints**, ne deathmatch HP.

**Zachovat.** Battle Tool / Shield = *nástroje v závodě*, ne „zabij soupeře“.

| Co dělat | Co nedělat |
|----------|------------|
| defend / attack pózy choreografie | permanent faint / smrt |
| item_heal, shield bonus k týmu | gore, avatar violence |
| po duelu: unava + CARE příležitost | resetovat bond / evoluci |
| „Koj pomohl MIA vyhrát“ | „Koj zničil soupeře“ |

**Pet safety v aréně:** pokud vitals = sleepy/sick/feeding, battle choreography už blokuje (`MIA_KOJ_BATTLE_CHOREOGRAPHY.js` → `resolveVitalBlock`). Formy musí respektovat stejný gate.

**Avatar rule (kánon):** viewer avatar assety ne do násilných scén — platí i pro robot weapon fantasy (jen stylizované tool FX).

---

## 7. Jak gifty už živí Koje (as-is)

```
Gift / support
  → miaPoints (preferováno; coins jen interně)
  → applySupportToKojnozout
  → bowlGain, hunger↓, energy↑, bond, vitals wake
  → batoh item (T1/T2…)
  → volitelně duel contribution
  → overlay mood (gift / celebrate) — bez coins
```

**Nové formy se nesmí vsunout do gift media runtime** jako blocking krok. Maximálně:

- po feedu: `miaSync += ε`
- T2+ gift: nabídka unlock / krátký projector flash (async, non-blocking)

Gift-animation generator práce jinde → **netahat robot modes do `MIA_GIFT_MEDIA_RUNTIME` / overlay queue.**

---

## 8. Stavový kontrakt (code hook)

Soubor: `scripts/MIA_KOJ_ROBOT_MODES.js`

```json
"robotModes": {
  "activeForm": "pet",
  "unlockedForms": ["pet"],
  "miaSync": 0,
  "combatPower": 0,
  "formExpiresAt": 0,
  "formCooldownUntil": 0,
  "lastFormId": null,
  "lastFormChangedAt": 0
}
```

- Default seed v `createKojnozoutState`
- Persist v `kojnozout-state.json` přes `PERSISTED_FIELDS`
- Pure helpers: enum, `canActivateForm`, `estimateFormCost`, `deriveCombatPower` — **zatím bez runtime aktivace v index.js**

---

## 9. Soft Neon / purple cyborg — vizuální vazba

- Art směry už v archive: soft neon, cyborg, robot projector, purple tech  
- Belly = Projector / Shield HUD kotva  
- Eyes = Scanner  
- Motion: stávající pose bank + budoucí form overlay class (CSS), ne nový 3D  

Sjednocení světa s MIA: viz `_export_mia_koj_world_unification_proposal.md` (Soft Neon Companion Lab).

---

## 10. Roadmapa implementace (bez full rewrite)

| Fáze | Co | Riziko |
|------|-----|--------|
| **0** ✅ | Doc + `MIA_KOJ_ROBOT_MODES` + state field + contract | nízké |
| **1** | Snapshot do `/overlay-state` (activeForm, miaSync) — bez UI změny | nízké |
| **2** | MIA hláška při formě; energy cost; cooldown | střední |
| **3** | Duel prefer shield/battle_tool; choreography map | střední |
| **4** | Scanner → care opportunities hint | nízké |
| **5** | Projector moment při gift video (non-blocking) | střední — koordinovat s gift anim |
| **X** | Full battle rewrite / 3D | **nedělat** |

---

## 11. Guardrails

1. Nerozbít gift / OBS / ingest pipeline.  
2. Overlay bez coins.  
3. Pet Core always on.  
4. Minimální diff; business logika v MIA, OBS jen render.  
5. Po větším zásahu stream logiky: `node --check` + `npm run test:preflight:fast`.

---

## 12. Reference v repu

| Oblast | Soubor |
|--------|--------|
| State / feed | `scripts/MIA_KOJNOZROUT_ENGINE.js` |
| Persist | `scripts/MIA_KOJNOZROUT_PERSISTENCE.js` · `data/kojnozout-state.json` |
| CARE / bond / vitals | `MIA_KOJNOZROUT_CARE*.js`, `BOND`, `VITALS` |
| Bowl | `KOJNOZROUT_BOWL_ENGINE.js` |
| Duel / batoh | `MIA_KOJNOZROUT_DUEL.js`, `BACKPACK`, `ITEM_*` |
| Battle pózy | `MIA_KOJ_BATTLE_CHOREOGRAPHY.js` |
| Kánon | `docs/KOJNOZROUT_KANON.md`, `KOJNOZROUT_VISION.md` |
| Robot modes hook | `scripts/MIA_KOJ_ROBOT_MODES.js` |
| Contract | `tests/koj_robot_modes_contract.js` |
