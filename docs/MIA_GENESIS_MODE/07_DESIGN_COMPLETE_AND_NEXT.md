# Genesis v1 — Design Complete

**Datum uzavření:** 2026-07-30  
**Stav:** **GENESIS v1 DESIGN COMPLETE**  
**Branch (kód):** `feature/mia-genesis-mode` — commit/push stále dle [PRE_LAUNCH_GATE.md](./PRE_LAUNCH_GATE.md)

---

## Proč Design Complete (ne „kód hotový“)

Uzavíráme návrhovou kapitolu, protože je definované:

| Vrstva | Co |
|--------|-----|
| Architektura | Stream Core ≠ Genesis Mode |
| Hranice | Core Isolation — žádné zásahy do runtime jádra |
| UX | Experience Design, First 60s, cadence, unlock story |
| Release proces | Soak → Strangers → Retest → **GO/NO GO** → Commit → Push → Public Activation |
| Kvalitativní brány | Metriky stranger testu, soak checklist |

To je pevnější základ než programovat bez bran.

```text
GENESIS v1 DESIGN COMPLETE
IMPLEMENTATION: Phases A–E existují lokálně
COMMIT/PUSH: HOLD until PRE_LAUNCH_GATE GO
STREAM CORE: FROZEN (vůči Genesis experimentům)
```

---

## Po Public Activation Day 1 — nejdřív data, ne funkce

Po prvním veřejném dni **nepřidávat** hned nové funkce. Nejdřív sbírat data.

### Genesis Daily Report (rituál)

Po **každém** Public Activation dni jedna stručná zpráva (data → rozhodnutí, ne pocit):

```text
GENESIS DAY N
Uptime:
…
Noví diváci:
…
Průměrná doba sledování:
…
Nejlepší hláška:
…
Nejvíce reakcí:
…
Největší problém:
…
Rozhodnutí:
☐ Pokračovat beze změn
☐ Připravit drobné úpravy
```

Šablona: kopírovat do `docs/MIA_GENESIS_MODE/reports/DAY_N.md` až při reálném běhu (ne předem plnit).

### Metriky (sběr)

**Komunita**

| Metrika | Poznámka |
|---------|----------|
| Průměrná délka sledování | platform analytics |
| Kolik lidí se vrací další den | Day N → Day N+1 retention |
| Počet zpráv v chatu | engagement |
| Noví sledující / odběratelé | TikTok + YouTube |

**Genesis**

| Metrika | Poznámka |
|---------|----------|
| Hlášky s největší reakcí | chat / emotes / mentions |
| Kde lidé odcházejí | drop-off vs cadence events |
| Moduly s největším zájmem | unlock / STATUS mentions |

**Technika**

| Metrika | Poznámka |
|---------|----------|
| Stabilita po několika hodinách | crash / freeze |
| CPU / GPU / RAM | OBS + browser sources |
| Chyby overlayů / sync | visual glitches, desync |

**Pravidlo:** nové funkce až když jsou podložené tím, co se na veřejném streamu osvědčilo.

---

## Stav větví projektu

```text
1. Stream Core     🔒 FROZEN — čeká R1-D / validaci — žádné nové funkce
2. Genesis Mode    🎬 Public Experience Layer — oddělený — testovat dle Gate
```

**Design dokumenty Genesis:** uzavřené (žádné další design packy).  
Další milník: Gate GO → Public Activation → Daily Reports → ladění podle dat.

---

## Genesis jako trvalá součást identity MIA

Genesis **není** jednorázová úvodní obrazovka.

Při každé velké aktualizaci může MIA znovu vstoupit do Genesis:

| Událost | Veřejný rámec |
|---------|----------------|
| První veřejná aktivace | **Genesis** · Public Activation · Day 1… |
| Další kapitola | **Genesis v2** |
| Rozšíření světa | **Genesis Expansion** |
| Velký AI / schopnostní skok | **Genesis AI Upgrade** |

Komunita si zvykne: **Genesis Mode = významná změna / nová kapitola.**

Až kapitola skončí, MIA může uzavřít:

> „Genesis byla úspěšně dokončena. Přecházím do standardního provozního režimu.“

Tím se Genesis stává příběhem, ke kterému se lidé vracejí — ne čekáním na „začátek streamu“.

---

## Další krok operátora

1. Living room: First 60s + soak + strangers (viz Pre-Launch Gate)  
2. RELEASE REVIEW → GO  
3. COMMIT / PUSH / Public Activation Day 1  
4. Sběr metrik výše  
5. Teprve pak plán Day 2+ / případné úpravy  

Cursor: žádný nový Genesis **design** doc. Žádný nový Genesis feature work, dokud operátor neřekne po Gate GO nebo po Day N Daily Report.
