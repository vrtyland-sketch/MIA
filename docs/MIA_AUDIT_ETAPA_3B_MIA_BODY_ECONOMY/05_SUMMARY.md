# Etapa 3B — Shrnutí (MIA Body & Economy vs kánon)

**Datum:** 2026-07-27  
**Status:** **Etapa 3B HOTOVO** (docs only, uncommitted OK)

---

## Počty z compliance matrix (60 pravidel)

| Stav | Počet | Podíl |
|------|-------|-------|
| ✅ Shoda | 48 | 80 % |
| ⚠ Drift / částečná | 8 | 13 % |
| ❌ Rozpor | 0 | 0 % |
| ❓ Neověřeno | 4 | 7 % |

---

## Verdikt

Systém **MIA body (miaPoints)** a stream ekonomiky je **kánonicky stabilní v guardrails**:

- **8/8 tvrdých guardrails ✅** — overlay nikdy neexpozuje coins; public API strip na hranici `/overlay-state`
- Konverze **1 coin = 7.5 miaPoints** + coin tier T1–T6 z jedné config ✅
- Oddělené **`coinTier` / `streamTier` / `spamRewardTier`** ✅
- Supporter profile (XP, level, streak), ledger, host team split, arena/duel v miaPoints ✅
- Achievement moments a viewer memory **bez coin expozice** ✅

**Žádný tvrdý rozpor (❌)** proti `.cursor/rules/mia-canon.mdc` a `KANON_MIA_AGENT.md` §18 nebyl nalezen.

Drift se koncentruje do **UX naming** („podpora projektu“ vs label `miaPoints`), **spam T4 shadow cap** (sdíleno s 3A), **persistence streak**, **internal giftValue v ctx** a **admin audit surfaces**.

---

## Top 5 rizik (priorita)

1. **Spam T4 milestone → shadow cap T3** — wave HUD v MIA bodech slibuje T4, shadow runtime capne reward (GAP-B01, sdíleno s 3A G-42).

2. **Streak persistence scope** — runtime supporter profile funguje v unit testech; multi-day / restart produkce ❓ (GAP-B03).

3. **Public UX naming drift** — kánon „podpora projektu“, některé subtexty doslovně „miaPoints“ (GAP-B02).

4. **Internal giftValue v resolved context** — strip na API OK; riziko budoucího leaku novým kanálem (GAP-B04).

5. **Chybějící contracty** — shadow spam cap, legacy tier mode, event-normalizer overlay projection (T-B01–T-B04).

---

## Co je silné (neměnit bez důvodu)

1. `MIA_OVERLAY_PUBLIC_RESPONSE.stripValueFieldsForPublic` — hranice veřejného API  
2. `shared/stream_economy_config.json` — single source tier + spam prahů  
3. `MIA_SUPPORT_RESOLVER` + `tierKinds` — oddělení coin/stream/spam sémantiky  
4. `MIA_GIFT_SUPPORTER_PROFILE` + `MIA_GIFT_USER_LEDGER` — runtime ekonomické metadata  
5. `core/viewer-memory.js` — persist levelů z miaPoints, ne coins  

*(Shodné s `KANON_MIA_ALIGNMENT.md` § Gift Economy, §5)*

---

## Vztah k Etapa 3A (Gifts)

| Dokument | Zaměření |
|----------|----------|
| **3A** | Gift video, bowl, Kapybara, dual path mapa |
| **3B (tento)** | **Body sémantika** — konverze, tier druhy, ledger, profily, host split, spam reward miaPoints, achievement/arena |

Příklad: 3A ✅ spam session engine + 3B ⚠ shadow T4 cap = obojí pravda.

---

## Doporučená Etapa 3C — Kojnožrout (bez kódování)

| Oblast | Proč 3C |
|--------|---------|
| **Koj vitals → overlay snapshot** | Shoda `KOJNOZROUT_KANON` vitals/mood/sprite s runtime HTML |
| **CARE doména vs chat příkazy** | Validace, cooldown, bond — kánon vs `MIA_KOJNOZROUT_CARE_*` |
| **Bowl vizuální pásma & full cycle** | Mimo body-only scope 3B; navazuje na 3A bowl wiring |
| **Neglect / bond vizuální projev** | Bowl + overlay + speech |
| **Speaker routing mimo gift** | Chat, SHARE, AWAY |
| **MIA hologram / body gift moment T3+** | Graphics canon vs efemérní body vrstvy |

Výstup 3C: `docs/MIA_AUDIT_ETAPA_3C_KOJNOZROUT/` (stejná struktura složky).

---

## Artefakty Etapa 3B

| Soubor | Obsah |
|--------|--------|
| `00_SCOPE.md` | Rozsah body/ekonomika, vztah k 3A/3C |
| `01_CANON_RULES_EXTRACT.md` | 50 kánonních pravidel |
| `02_COMPLIANCE_MATRIX.md` | 60 řádků BE-* |
| `03_GAPS.md` | 11 mezer se severity |
| `04_TESTS_COVERAGE.md` | Contract map + 7 chybějících testů |
| `05_SUMMARY.md` | Tento dokument |

---

## Etapa 3B HOTOVO

Audit shody MIA Body & Economy behavior s kánonem je **kompletní**.  
**Žádné změny kódu** nebyly provedeny.

*Příští krok: **Etapa 3C Kojnožrout** ✅ hotovo — viz `docs/MIA_AUDIT_ETAPA_3C_KOJNOZROUT/05_SUMMARY.md`. Persist/recovery (viewer-memory, streak gap) → **Etapa 3G** ✅ `docs/MIA_AUDIT_ETAPA_3G_PERSISTENCE_RECOVERY/`.*

---

## Povinná souhrnná tabulka (audit standard)

| Kategorie | Počet |
|-----------|-------|
| Guardrails | 8 |
| Implementováno | 56 |
| Testováno | 46 |
| Chybí test | 14 |
| Drift | 8 |
| Rozpor | 0 |
| Riziko vysoké | 1 |
| Riziko střední | 5 |
| Riziko nízké | 3 |

**Poznámky k tabulce:**
- **Guardrails** = tvrdá pravidla BE-05…BE-45 subset (8 pravidel, všechna ✅).
- **Implementováno** = 48 ✅ + 8 ⚠ (kód existuje, detail/UX drift).
- **Testováno** = matrix řádky s 🟢 contract pokrytím (preflight:fast nebo dedicated suite).
- **Chybí test** = 60 − 46 řádků bez 🟢 test důkazu (7 navržených nových contractů v `04_TESTS_COVERAGE.md`).
- **Drift** = ⚠ v matrix; **Rozpor** = ❌ (0).
- **Rizika** dle `03_GAPS.md`: 1 VYSOKÁ, 5 STŘEDNÍ, 3 NÍZKÁ (+ 2 ❓ INFO).
