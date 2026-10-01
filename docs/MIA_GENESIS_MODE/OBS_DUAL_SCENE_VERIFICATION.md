# OBS Dual-Scene Verification Checklist

**Účel:** Manuální ověření, že veřejná `MIA_GENESIS` a interní `MIA_STREAM_TEST` jsou oddělené a Module Unlock funguje bez zásahu do Stream Core.  
**Ref:** [OBS_SCENE_SETUP.md](./OBS_SCENE_SETUP.md) · [CORE_ISOLATION_AUDIT.md](./CORE_ISOLATION_AUDIT.md)  
**Pravidla:** žádné nové funkce · žádná změna Core · žádný commit/push v tomto kroku  

```text
Genesis infrastruktura: READY
Core Isolation: PASS
Gate: HOLD
Commit/Push: HOLD
```

| Pole | Hodnota |
|------|---------|
| Operátor | |
| Datum / čas | |
| OBS verze | |
| MIA server | `http://127.0.0.1:3000` (nebo: _____) |
| Commit / větev | `feature/mia-genesis-mode` (lokálně) |

**Výsledky řádků:** `PASS` · `FAIL` · `BLOCKED`  
**Evidence:** 1 řádek (screenshot / poznámka / čas)

---

## 1. Vytvoření scény `MIA_GENESIS`

| | |
|--|--|
| **Kroky** | OBS → Scény → `+` → název přesně `MIA_GENESIS`. Nesmí přejmenovat / přepsat live gift scénu. |
| **Očekávání** | Scéna existuje, je prázdná nebo jen genesis zdroje. |
| **Result** | ☐ PASS · ☐ FAIL · ☐ BLOCKED |
| **Evidence** | |

---

## 2. Přidání všech `genesis-*` Browser Sources

Podle [OBS_SCENE_SETUP.md](./OBS_SCENE_SETUP.md) — 1920×1080, FPS 30, pořadí zdola:

| Z | URL | Visible |
|---|-----|---------|
| 1 | `http://127.0.0.1:3000/genesis-fx.html` | ☐ |
| 2 | `http://127.0.0.1:3000/genesis-overlay.html` | ☐ |
| 3 | `http://127.0.0.1:3000/genesis-community.html` | ☐ |

| | |
|--|--|
| **Očekávání** | Viditelné pozadí/FX, HUD MIA, YouTube/platform strip. **Žádný** Core gift/chat/bowl source v této scéně. |
| **Result** | ☐ PASS · ☐ FAIL · ☐ BLOCKED |
| **Evidence** | |

---

## 3. Vytvoření neveřejné scény `MIA_STREAM_TEST`

| | |
|--|--|
| **Kroky** | Nová scéna `MIA_STREAM_TEST`. **Není** nastavená jako program / stream výstup. |
| **Očekávání** | Scéna existuje; Studio Mode: Preview může být TEST, Program = `MIA_GENESIS`. |
| **Result** | ☐ PASS · ☐ FAIL · ☐ BLOCKED |
| **Evidence** | |

---

## 4. Core overlaye **pouze** do `MIA_STREAM_TEST`

Přidej stávající produkční overlaye (příklady):

| Modul | URL (typicky) | V TEST | V GENESIS |
|-------|---------------|--------|-----------|
| Speech / hero | `/speech-overlay.html` | ☐ | musí ☐ NE |
| Voice | `/mia-voice-overlay.html` | ☐ | musí ☐ NE |
| Chat | `/chat-overlay.html` | ☐ | musí ☐ NE |
| Gift FX | `/gift-animation-overlay.html` | ☐ | musí ☐ NE |
| Combo | `/combo-overlay.html` | ☐ | musí ☐ NE |
| Bowl | `/kojnozrout-bowl-overlay.html` | ☐ | musí ☐ NE |
| Koj runtime | `/kojnozrout-runtime.html` | ☐ | musí ☐ NE |

| | |
|--|--|
| **Očekávání** | Žádný Core overlay není zdrojem ve `MIA_GENESIS`. |
| **Result** | ☐ PASS · ☐ FAIL · ☐ BLOCKED |
| **Evidence** | |

---

## 5. Operator Mode na druhém monitoru

| | |
|--|--|
| **Kroky** | Otevřít `http://127.0.0.1:3000/genesis-operator.html` (prohlížeč / OBS projector mimo stream). |
| **Očekávání** | Vidět matice modulů (GENESIS / Voice / Chat / Gifts / …) a tlačítka TEST / OFF / ENABLE. |
| **Result** | ☐ PASS · ☐ FAIL · ☐ BLOCKED |
| **Evidence** | |

---

## 6. BroadcastChannel komunikace

| | |
|--|--|
| **Kroky** | Na Operator: Voice → **TEST**. Sledovat log v operatoru + SYSTEM STATUS na `genesis-overlay` (stejný origin `127.0.0.1:3000`). |
| **Očekávání** | Stav se projeví na veřejném Genesis HUD (VERIFYING / TEST) **bez** reloadu. Pokud browser izoluje storage mezi OBS CEF a Chrome, ověř oba na stejném origin v OBS Browser Source + operator v okně se stejným hostem; při FAIL = BLOCKED + poznámka „cross-process bus“. |
| **Result** | ☐ PASS · ☐ FAIL · ☐ BLOCKED |
| **Evidence** | |

---

## 7. Modulový cyklus OFF → TEST → PASS → ENABLE

Pro každý modul níže (PASS na TEST scéně = operátor ověřil chování Core vizuálně/audio):

| Modul | OFF | TEST | PASS (ruční) | ENABLE → Genesis | Public announce | Result | Evidence |
|-------|-----|------|--------------|------------------|-----------------|--------|----------|
| Voice | ☐ | ☐ | ☐ | ☐ | ☐ | | |
| Chat | ☐ | ☐ | ☐ | ☐ | ☐ | | |
| Gift Engine | ☐ | ☐ | ☐ | ☐ | ☐ | | |
| Bowl | ☐ | ☐ | ☐ | ☐ | ☐ | | |
| Video | ☐ | ☐ | ☐ | ☐ | ☐ | | |

| | |
|--|--|
| **Očekávání** | ENABLE jen po vědomém PASS. Announce např. „Hlasový modul úspěšně prošel ověřením.“ |
| **Celkový řádek 7** | ☐ PASS · ☐ FAIL · ☐ BLOCKED |
| **Evidence** | |

---

## 8. ENABLE bez restartu Browser Source

| | |
|--|--|
| **Kroky** | Po ENABLE **ne** Refresh cache na genesis-overlay. Sledovat VERIFYING → LIVE + Public Modules. |
| **Očekávání** | Změna bez restartu source / scény. |
| **Result** | ☐ PASS · ☐ FAIL · ☐ BLOCKED |
| **Evidence** | |

---

## 9. Diváci nikdy nevidí `MIA_STREAM_TEST`

| | |
|--|--|
| **Kroky** | Program / Stream výstup = `MIA_GENESIS`. Přepnout Preview na TEST; Program zůstane GENESIS. Volitelně: krátký recording Programu. |
| **Očekávání** | V Programu / nahrávce jen Genesis. Žádný Core gift/chat canvas. |
| **Result** | ☐ PASS · ☐ FAIL · ☐ BLOCKED |
| **Evidence** | |

**Anti-mix pojistky (doporučeno):**

- [ ] Scéna `MIA_STREAM_TEST` nemá barvu / prefix „INTERNAL“ v názvu ok  
- [ ] Hotkey na přepnutí Program → GENESIS jen (ne TEST)  
- [ ] Stream výstup / VOD kontrola 30 s  

---

## 10. Refresh Browser Source + restart OBS

| Krok | Očekávání | Result | Evidence |
|------|-----------|--------|----------|
| Refresh `genesis-overlay` po ENABLE Voice | Stav se obnoví z bus/storage **nebo** dokumentovaný reset na LOCKED (zapsat chování) | ☐ P · ☐ F · ☐ B | |
| Restart OBS, Program = GENESIS | Genesis naběhne; TEST scéna stále neveřejná | ☐ P · ☐ F · ☐ B | |
| Operator po restartu | Matice čitelná; lze znovu ENABLE | ☐ P · ☐ F · ☐ B | |

| | |
|--|--|
| **Řádek 10 celkově** | ☐ PASS · ☐ FAIL · ☐ BLOCKED |
| **Evidence** | |

---

## 11. Nouzový postup — chybné odemčení

Pokud byl modul ENABLE omylem nebo selže:

1. Operator → modul **OFF** (okamžitě).  
2. Ověřit, že veřejný STATUS už není LIVE / Public Modules bez daného modulu.  
3. **NEpřepínat** Program na `MIA_STREAM_TEST`.  
4. Zapsat do Evidence + Daily Report (až při veřejném dni).  
5. Znovu jen po PASS na TEST.  

| | |
|--|--|
| **Dry-run:** ENABLE Chat → hned OFF → UI OK | ☐ PASS · ☐ FAIL · ☐ BLOCKED |
| **Evidence** | |

---

## 12. Finální verdikt

| Kontrola | Result |
|----------|--------|
| 1 Scéna GENESIS | ☐ PASS · ☐ FAIL · ☐ BLOCKED |
| 2 genesis-* sources | ☐ PASS · ☐ FAIL · ☐ BLOCKED |
| 3 Scéna STREAM_TEST | ☐ PASS · ☐ FAIL · ☐ BLOCKED |
| 4 Core jen v TEST | ☐ PASS · ☐ FAIL · ☐ BLOCKED |
| 5 Operator Mode | ☐ PASS · ☐ FAIL · ☐ BLOCKED |
| 6 BroadcastChannel | ☐ PASS · ☐ FAIL · ☐ BLOCKED |
| 7 OFF→TEST→PASS→ENABLE | ☐ PASS · ☐ FAIL · ☐ BLOCKED |
| 8 Bez restartu source | ☐ PASS · ☐ FAIL · ☐ BLOCKED |
| 9 Diváci nevidí TEST | ☐ PASS · ☐ FAIL · ☐ BLOCKED |
| 10 Refresh / OBS restart | ☐ PASS · ☐ FAIL · ☐ BLOCKED |
| 11 Nouzové OFF | ☐ PASS · ☐ FAIL · ☐ BLOCKED |

### Celkový výsledek dual-scene setup

```text
☐ PASS   — vše výše PASS; lze jít na First 60 Seconds Test
☐ FAIL   — opravit setup (stále bez Core patch); znovu checklist
☐ BLOCKED — chybí OBS/server/bus mezi procesy; vyřešit prostředí
```

| Pole | Obsah |
|------|--------|
| **Celkový Result** | |
| **Evidence (souhrn)** | |
| **Operátor podpis** | |
| **Další krok** | Při PASS → **First 60 Seconds Test** (Gate stále HOLD do GO) |

---

## Poznámky

- Tento checklist **neotevírá** Pre-Launch Gate.  
- Commit / Push zůstávají **HOLD**.  
- Stream Core beze změny.
