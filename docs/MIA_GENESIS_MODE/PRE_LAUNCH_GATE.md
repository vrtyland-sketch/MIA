# Genesis Mode — Pre-Launch Gate

**Branch:** `feature/mia-genesis-mode` (lokálně)

```text
==========================================
MIA GENESIS
PRE-LAUNCH GATE
==========================================
STATUS:
🟡 HOLD

Důvod:
Čekáme na reálné ověření, ne na další návrh.
==========================================
☐ First 60 Seconds Test
☐ Soak Test (2–3 h)
☐ Stranger Test (3–5 lidí)
☐ Úpravy podle dat
☐ Retest
☐ Release Review (GO/NO GO)
==========================================
Při GO:
☑ COMMIT Genesis v1
☑ PUSH
☑ Public Activation Day 1
==========================================
```

Gate **neotevírá** Cursor. Body uzavírá operátor hlášením (např. `First 60 Seconds PASS`, `Soak PASS`) → postupné zaškrtnutí až k:

> **🟢 GO — Public Activation Day 1.**

---

## Co je začátek Day 1

**Ne** okamžik spuštění OBS.

**Ano** okamžik, kdy přijde **první skutečný divák**, který neví nic o vývoji MIA.

Od té chvíle vznikají první reálná data (Daily Report, metriky).

---

## Pravidlo Public Activation Day 1

Během Day 1 **neopravovat drobnosti za běhu**, pokud nejde o **kritickou** chybu (crash, coin leak, totální ticho, scéna mrtvá).

Lepší postup:

1. Zaznamenat připomínky  
2. Nechat den doběhnout  
3. Večer Daily Report  
4. Balík změn až pro **Day 2**  

Cíl: čistá data o **jedné** verzi Genesis, ne směs hot-fixů.

---

## Detaily testů (reference)

### First 60 Seconds

Nejde jen o techniku. Očima nového diváka:

| # | Otázka | PASS |
|---|--------|------|
| 1 | Je během prvních **10 s** jasné, že sleduji MIA? | ☐ |
| 2 | Vím během **první minuty**, co se právě děje? | ☐ |
| 3 | Mám důvod zůstat dalších **5 minut**? | ☐ |
| 4 | Chápu, že nové moduly budou **postupně odemykány**? | ☐ |

**PASS First 60s:** všechna 4× ano.

Doplňkově: alespoň jedna zajímavá událost v první minutě (hlas / animace / status / unlock).

### Soak (2–3 h)

Hlášky, animace, CPU/RAM, cadence, terminál — viz dřívější checklist.

### Stranger (3–5 lidí) — cíle

| Metrika | Cíl |
|---------|----:|
| Pochopil během 60 s, co je MIA | ≥ 80 % |
| Vydržel ≥ 10 min | ≥ 70 % |
| Přišel by znovu | ≥ 60 % |
| Uměl popsat Genesis Mode | ≥ 80 % |

### Release Review (před commit)

```text
☐ Stream Core stále beze změn
☐ Core Isolation Audit = PASS
☐ Soak = PASS
☐ Stranger = PASS
☐ First 60s = PASS
☐ Žádný kritický bug
☐ Žádná rozpracovaná změna
☐ Schválení operátorem
```

---

## Stav projektu (aktuální)

```text
✅ Genesis v1 Design Complete
✅ Release proces definovaný
✅ Stream Core oddělený
🟡 Gate HOLD — otevře až reálné testování
COMMIT: HOLD
PUSH: HOLD
```

Veřejný název po GO: `MIA GENESIS · Public Activation · Day N`
