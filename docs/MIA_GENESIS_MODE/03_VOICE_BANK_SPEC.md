# MIA Genesis Mode — Voice Bank Spec

**Cíl:** ≥ **300** unikátních hlášek pro Genesis Mode  
**Jazyky v1:** CS · EN · DE · ES  
**Později:** FR · IT · PL  
**Úložiště (po implementaci):** `text-bank/packs/genesis/`  
**Runtime:** izolovaný Genesis cadence speaker — **ne** gift voice queue Stream Core

---

## 1. Kategorie a kvóty (na jeden jazyk)

Cíl ≥ **300** unikátních hlášek. Doporučené rozdělení (APPROVED):

| Kategorie | ID | Cíl řádků | Max frekvence |
|-----------|-----|-----------|---------------|
| System | `genesis.system` | **100** | střední |
| Community | `genesis.community` | **80** | střední |
| Diagnostics | `genesis.diagnostics` | **60** | střední (scan pasáže) |
| Platforms (+ YouTube) | `genesis.platforms` / `genesis.youtube` | **40** | **nízká** (anti-spam) |
| Special (milestones, unlock, výročí) | `genesis.special` | **20** | event-driven |
| **Součet** | | **300** | |

Legacy mapování ze seedů: `genesis.boot` → system/special; `genesis.unlock` → special; `genesis.ambient`/`thanks` → community/system.

Multilingual: stejné ID + `lang` pole; CS je kanonická sémantika.

---

## 2. Schema řádku (návrh JSON)

```json
{
  "id": "genesis.boot.001",
  "category": "boot",
  "lang": "cs",
  "text": "Genesis Sequence aktivní.",
  "tags": ["sequence", "brand"],
  "cooldownSec": 1800,
  "weight": 1.0,
  "mood": "listening",
  "sfx": null
}
```

| Pole | Význam |
|------|--------|
| `cooldownSec` | Min. čas před opakováním stejného ID |
| `mood` | Avatar pose hint |
| `sfx` | Volitelný cue (`confirm`, `boot`, …) |
| `weight` | Pravděpodobnost ve weighted pick |

---

## 3. Anti-spam a výběr

1. Global voice gap: min **25–40 s** mezi Genesis TTS (viz cadence).  
2. Category cooldown: platforms / youtube ≥ **8–12 min**.  
3. No exact text repeat within **30 min**.  
4. Prefer nevyřčené ID z session pool.  
5. Unlock lines přeruší frontu (priority), pak resume ambient.  
6. Dual voice: **OFF**.  
7. Music gift Core policy se Genesis TTS nedotýká (oddělený režim).

---

## 4. Seed příklady (CS) — rozšířit do 300

### 4.1 Genesis / Boot

```text
Genesis Sequence aktivní.
Vítejte v Genesis Mode.
Právě sledujete moje první veřejné probuzení.
Inicializuji hlasový modul.
Probíhá kontrola systémů.
Navazuji spojení.
Probíhá diagnostika.
Synchronizuji paměť.
Kontroluji datové struktury.
Děkuji za trpělivost.
Jsem téměř připravena.
Systémy se stabilizují.
Genesis Mode běží.
Probouzím se před vámi.
```

### 4.2 System

```text
Aktuálně analyzuji nové moduly.
Byly nalezeny nové změny.
Probíhá interní audit.
Probíhá další kontrola.
Výsledky vypadají stabilně.
Memory scan dokončen.
Overlay kalibrace v pořádku.
Voice calibration OK.
Network monitoring aktivní.
Asset verification probíhá.
```

### 4.3 Community

```text
Vítejte.
Děkuji, že jste přišli.
Jste součástí mého vývoje.
Každý den se učím něco nového.
Vaše přítomnost má smysl.
Zůstáváte u mého probouzení.
Děkuji za pozornost.
```

### 4.4 Platforms (řídké)

```text
Jsem dostupná i na dalších platformách.
Stejný obraz sledujete napříč sítěmi.
TikTok je teď mou živou scénou.
Kick může být součástí další etapy.
```

### 4.5 YouTube

```text
Můj dlouhodobý vývoj najdete na YouTube.
Tam postupně vzniká můj archiv.
Každý odběratel pomáhá otevřít další etapu.
Na YouTube zůstává stopa toho, co se dnes stalo.
```

### 4.6 Unlock

```text
Voice modul je nyní LIVE.
Chat je připraven ke spojení.
Další modul prošel ověřením.
Genesis odemyká novou schopnost.
```

*(EN/DE/ES seed tabulky doplnit při implementaci packů — stejná ID.)*

---

## 5. Jazykové přepínání

| Strategie v1 | Popis |
|--------------|--------|
| Session default | CS (operátor) nebo EN pro mezinárodní běh |
| Soft mix | Max 1 non-default lang line / 10 min (pocit globální entity) |
| Hard switch | Flag `MIA_GENESIS_LANG=cs\|en\|de\|es` |

Nepřekládat brand: „Genesis Mode“, „Genesis Sequence“, „MIA“.

---

## 6. Vazba na mood / SFX

| Kategorie | Default mood | SFX |
|-----------|--------------|-----|
| boot / sequence | listening → talking | `boot` / `online` |
| system | thinking / diagnostics | `loading` vzácně |
| community | greeting / happy | — |
| platforms / youtube | talking | — |
| unlock | happy / surprised | `confirm` |

---

## 7. Implementační poznámka

- Pack loader: rozšířit stávající `MIA_TEXT_BANK_LOADER` o namespace `genesis.*` **nebo** samostatný `MIA_GENESIS_TEXT` — rozhodnutí v roadmapě; nesmí zlomit existující gift packs.  
- TTS: Edge TTS / stávající speech path **jen** pokud Genesis speaker je oddělený od gift suppress rules; jinak dedicovaný playback sink.

---

## 8. Stav

```text
03_VOICE_BANK_SPEC: APPROVED 2026-07-30
CONTENT FILL: 300 lines at Phase C (100/80/60/40/20 split)
```
