# MIA Genesis Mode — Overlay & Scene Spec

**OBS scéna:** `MIA_GENESIS`  
**Flag (budoucí):** `MIA_GENESIS_MODE=1` (default OFF)  
**Nesmí:** sdílet / přepisovat `SPINAK_ENGINE_GIFTS` live manifest

---

## 1. OBS scéna — vrstvy (zdola nahoru)

| Z | Zdroj | Popis |
|---|--------|--------|
| 0 | Color / media | Futuristické pozadí (statické nebo pomalá smyčka) |
| 1 | Browser | `genesis-fx.html` — datové linky, částice (GPU-light) |
| 2 | Browser | `genesis-overlay.html` — HUD: STATUS, terminal, diagnostics, % |
| 3 | Browser | Avatar / speech presence (dedicated genesis host nebo reuse speech s genesis skin) |
| 4 | Image/Browser | Logo MIA (brand, dominantní, ne drobný eyebrow) |
| 5 | Browser | `genesis-community.html` — YouTube panel + platform strip |
| 6 | (optional) | Safe margins / TikTok UI dodge |

**Pravidlo:** jeden obraz pro všechny platformy ve Fázi Genesis (stejný OBS výstup). Platform-specific rendering = mimo Genesis v1.

---

## 2. Overlay inventory

### 2.1 SYSTEM STATUS

```text
SYSTEM STATUS
─────────────
Voice ............ ONLINE | VERIFYING | STANDBY
Memory ........... CHECKING | OK | WARNING
OBS .............. ONLINE | RECONNECT
TikTok ........... CONNECTED | STANDBY
Kick ............. STANDBY | CONNECTED
YouTube .......... COMMUNITY BUILDING
Gift Engine ...... LOCKED | VERIFYING | LIVE
Chat ............. LOCKED | LIVE
Bowl ............. LOCKED | LIVE
Video ............ LOCKED | LIVE
```

- Aktualizace: při reálné změně stavu nebo cadence tick (ne flicker &lt; 3 s).
- Barvy: ONLINE/LIVE = klidná cyan/zelená · VERIFYING = jantar · LOCKED/STANDBY = tlumená · WARNING = červená (vzácně).

### 2.2 Active diagnostics

Krátký strip (3–5 řádků rotujících, ne spam):

```text
Active diagnostics
· Memory scan
· Asset verification
· Overlay calibration
· Voice calibration
· Network monitoring
```

Každý řádek má stav: RUNNING · DONE · QUEUED. Po DONE zmizí / nahradí další z fronty.

### 2.3 Live terminal (anti-repeat)

Animovaný log, např.:

```text
> Loading Voice Engine...
> Checking Assets...
> Synchronizing Memory...
> Overlay verified...
> Genesis Sequence stable...
> Listening...
```

**Pravidla anti-repeat:**

1. Stejný přesný řádek max 1× / 45 min.  
2. Pool ≥ 40 unikátních řádků (CS + EN mix OK).  
3. Weighted random + cooldown na tag (voice / memory / overlay / network).  
4. Žádná nekonečná smyčka 5 stejných vět.  
5. Při unlock: 1 priority řádek + SFX confirm.

### 2.4 Readiness %

- Start Sequence: 0 → ~12 % za 2 min (easing).  
- Pak pomalý drift (např. +0.1–0.5 % / 5–10 min) + skok při narrativním unlock.  
- Nikdy neskákat 0→100 za minutu.  
- Strop před „full live“ např. 92 % dokud operátor neotevře Core.

### 2.5 YouTube panel

- Titulek: dlouhodobý archiv / vývoj  
- CTA: odběr / playlist (bez coins, bez agresivního countdown)  
- 1 vizuální změna / 10–20 min (nový „episode note“)

### 2.6 Platform strip

```text
TikTok · Kick · YouTube
```

Jemné; zvýraznění jen při voice mention. Ne rotující banner každou minutu.

### 2.7 COMMUNITY MILESTONES

Panel progressu (viditelný posun pro vracející se diváky):

```text
COMMUNITY MILESTONES
YouTube ........ 142 / 1000
Genesis Day .... 3
Modules Online . 5 / 12
```

- Čísla aktualizuje operátor / `genesis-state` (ne fake spam každých 5 s).
- Při změně: jemný highlight + volitelný SFX `notification`.

---

## 3. Layout (landscape jádro)

```text
┌──────────────────────────────────────────────────────────┐
│  LOGO                         readiness %                │
│                                                          │
│     ┌─────────┐      SYSTEM STATUS                       │
│     │ AVATAR  │      Live terminal                       │
│     │  MIA    │      Diagnostics                         │
│     └─────────┘      COMMUNITY MILESTONES                │
│                                                          │
│  Platform strip              YouTube panel               │
└──────────────────────────────────────────────────────────┘
```

Portrait = mimo Genesis v1 jádro (poznámka v roadmapě).

---

## 4. Soubory (návrh po implementaci)

| Soubor | Účel |
|--------|------|
| `mia-output-overlay/genesis-overlay.html` | STATUS + terminal + diagnostics + % + milestones |
| `mia-output-overlay/genesis-fx.html` | částice / datové linky |
| `mia-output-overlay/genesis-community.html` | YouTube + platforms |
| `mia-output-overlay/assets/genesis/*` | CSS, particle presets, logo |
| (optional) `genesis-operator.html` | interní PASS/FAIL panel — ne ve veřejném canvas |

State: `data/genesis-state.json` + client poll **nebo** demo mode — **nesmí** přepisovat `/overlay-state` gift payload.

---

## 5. Guardrails

- Veřejný Genesis overlay: **žádné coins / gift value** — jen miaPoints pokud vůbec economy zmíněna.  
- Dual voice default OFF.  
- Genesis scéna izolovaná od gift media slotů.

---

## 6. Stav

```text
02_OVERLAY_AND_SCENE_SPEC: APPROVED 2026-07-30
```
