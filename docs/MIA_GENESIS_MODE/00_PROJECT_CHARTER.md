# MIA Genesis Mode — Project Charter

**Datum:** 2026-07-30  
**Verze:** 1.0 (design)  
**Owner:** Váša Špíňák  

---

## 1. Mise

Postavit **první veřejnou fázi MIA** — Genesis Mode — ve které MIA několik dní až týdnů „ožívá“ před diváky před plným provozem Stream Core.

Výsledek není testovací scéna. Výsledek je pocit, že diváci sledují **živou digitální entitu**, která se připravuje na plný provoz a postupně odemyká ověřené moduly.

---

## 2. Značka

| Termín | Použití |
|--------|---------|
| **Genesis Mode** | Veřejný název režimu |
| **MIA Genesis** | Produktová / dokumentační značka projektu |
| **Genesis Sequence** | Úvodní 0–2 min fáze při startu scény |
| **MIA_GENESIS** | Technický název OBS scény |

**Nepoužívat navenek:** „Boot Screen“, „prototyp“, „testovací stream“, „čekací místnost“, „Test stream“, „Beta“.

**Veřejný název běhu:** `MIA GENESIS · Public Activation · Day N` (Day 1, Day 2, …).

**Uzavření Genesis (později):** „Genesis byla úspěšně dokončena. Přecházím do standardního provozního režimu.“

MIA říká například:

- „Genesis Sequence aktivní.“
- „Vítejte v Genesis Mode.“
- „Právě sledujete moje první veřejné probuzení.“

---

## 3. Uzamčená rozhodnutí

| Položka | Volba |
|---------|--------|
| Timing | **Paralelně** ke Stream Core / R1-D |
| Stream Core | **Beze změny** |
| R1-D | **Neohrožen** — Genesis není náhrada Live gate |
| První dodávka | **Celý návrh Týden-1 zážitku** (Etapy 1–7 + 10–11) |
| Implementace | Až po schválení design packu |

```text
Stream Core (FROZEN → R1-D)     ← odděleně
Genesis Mode (parallel)         ← nová veřejná fáze
```

---

## 4. Hranice

### Smí

- Nová OBS scéna `MIA_GENESIS` (ne `SPINAK_ENGINE_GIFTS`)
- Nové HTML overlaye (`genesis-*.html` pod `mia-output-overlay/`)
- Nové text-bank packy (`text-bank/packs/genesis/…`)
- Assety, SFX, BGM mimo live gift pipeline
- Feature flag `MIA_GENESIS_MODE` (default **OFF**) — jen scéna / overlaye

### Nesmí (do výslovného schválení)

- Gift economy, video queue, voice queue jádra, persistence, ingest
- Contaminace `scripts/MIA_OBS_LIVE_MANIFEST.js`
- Změna R1-D kritérií, Evidence Layer, Stream Core Lock gate
- Engine 2.0 / games / battle

### Inspirace (reuse, ne přepis)

- `mia-output-overlay/startup-check.html`
- Away (`SPINAK_NEJSEM_TU`)
- `speech-overlay.html` / hero presence
- `text-bank/packs/`
- `mia-sound-cues.js`

---

## 5. Úspěch (Acceptance)

Hlavní otázka po večerním sledování na TV / monitoru:

> **„Kdybych MIA vůbec neznal, vydržel bych na tom koukat 20 minut?“**

| Odpověď | Akce |
|---------|------|
| Ano | Pokračovat / soft launch Genesis |
| Ne | Ne přidávat funkce — zlepšit atmosféru |

Sekundární: komunita se vrací kvůli „co se dnes změnilo“, ne jen „až začne stream“.

---

## 6. Scope mapování na původní etapy

| Původní etapa | V design packu | Implementace |
|---------------|----------------|--------------|
| 1 OBS Boot scéna | 02 | po APPROVE |
| 2 Systémové overlaye | 02 | po APPROVE |
| 3 Hlas 300+ | 03 | po APPROVE |
| 4 Více jazyků | 03 | po APPROVE |
| 5 Assety | 04 | po APPROVE |
| 6 Zvuky | 04 | po APPROVE |
| 7 Hudba | 04 | po APPROVE |
| 8 Unlock modulů | 05 (narativ) | wiring Core až výslovně |
| 9 Operátorský panel | 05 (design) | live metriky později |
| 10 Příběh | 01 | po APPROVE |
| 11 Harmonogram | 05 | po APPROVE |
| 12 Konečný cíl | 01 Acceptance | průběžně |

---

## 7. Stav dokumentu

```text
GENESIS DESIGN PACK: APPROVED 2026-07-30
GENESIS v1 DESIGN COMPLETE: YES
STREAM CORE: FROZEN
IMPLEMENTATION: Phases A–E on feature/mia-genesis-mode (COMMIT/PUSH HOLD)
```
