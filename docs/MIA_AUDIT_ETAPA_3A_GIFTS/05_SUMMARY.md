# Etapa 3A — Shrnutí (Gift systém vs kánon)

**Datum:** 2026-07-27  
**Status:** **Etapa 3A HOTOVO** (docs only, uncommitted OK)

---

## Počty z compliance matrix (76 pravidel)

| Stav | Počet | Podíl |
|------|-------|-------|
| ✅ Shoda | 62 | 82 % |
| ⚠ Drift / částečná | 10 | 13 % |
| ❌ Rozpor | 0 | 0 % |
| ❓ Neověřeno | 4 | 5 % |

---

## Verdikt

Gift systém MIA Stream Mode je **kánonicky stabilní v jádru**:

- TikFinity → MIA → OBS tok ✅
- Overlay public API bez coinů, jen miaPoints ✅
- Coin tier T1–T6 + playback `max(coin, catalog)` ✅
- Enterprise `shared/gifts/` jako ekonomický source of truth ✅
- Per-tier `rotationIndexByTier` v kódu ✅
- Spam wave, combo, throttle, gift presentation orchestrátor ✅
- Bowl fill, full trigger, T4 special video wiring ✅
- Kapybara AWAY chat loop ✅

**Žádný tvrdý rozpor (❌)** proti guardrails v `.cursor/rules/mia-canon.mdc` nebyl nalezen.

Drift se koncentruje do **milestone/spam video cap**, **test mezer**, **vize T5 cutscény**, **care variant hloubky** a **dual-path synchronizace** legacy vs enterprise katalog.

---

## Top 5 rizik (priorita)

1. **Spam T4 milestone → T3 video** (`engine_shadow_runtime.js` cap) — divák vidí T4 wave milestone, video hraje T3; rozpor s `KANON_SOUCASNY_PREHLED` spam prahy T4.

2. **Cross-tier rotace bez contract testu** — guardrail #2 v mia-canon.mdc; kód OK, regrese nehlídaná.

3. **Dual path Gift Map** — ekonomika v `shared/gifts/`, animace/chatLoop v `MIA_GIFT_MAP.js`; CAPYBARA chat loop jen v legacy — riziko při migraci na single path.

4. **Care-aware animace** — kánon slibuje tabulku neglect/care/pece; implementace mood + partial care offset — vizuální slib vs realita.

5. **Live neověřeno** — OBS end-to-end tier video, full bowl T4 sync, TikTok gift name completeness (❓) — spoléhá na historické R1-C, ne tento audit běh.

---

## Co je silné (neměnit bez důvodu)

1. `MIA_OVERLAY_PUBLIC_RESPONSE.stripValueFieldsForPublic` — hranice API  
2. `MIA_SUPPORT_RESOLVER` + `shared/stream_economy_config.json` — tier konstanty  
3. `MIA_VIDEO_ENGINE.rotationIndexByTier` — per-tier index  
4. `engine_spam_session` + oddělený user ack throttle  
5. `MIA_GIFT_PRESENTATION` jedna cesta prezentace  

*(Shodné s `KANON_MIA_ALIGNMENT.md` §23)*

---

## Vztah k Etapa 3 (Capability)

| Dokument | Typ |
|----------|-----|
| `docs/MIA_AUDIT_ETAPA_3/02_GIFTS_VIDEO.md` | Capability — „funguje“ |
| `docs/MIA_AUDIT_ETAPA_3/03_KOJ_BOWL.md` | Capability — „funguje“ |
| **Tento audit 3A** | **Canon compliance** — „odpovídá kánonu“ |

Příklad: Capability ✅ spam session + Canon ⚠ T4 cap = obojí pravda v různých rovinách.

---

## Navazující audity (functional area)

| Etapa | Složka | Status |
|-------|--------|--------|
| **3B MIA Body & Economy** | `docs/MIA_AUDIT_ETAPA_3B_MIA_BODY_ECONOMY/` | ✅ hotovo (miaPoints, ledger, profily, spam reward tiers) |
| **3C Kojnožrout** | `docs/MIA_AUDIT_ETAPA_3C_KOJNOZROUT/` | ✅ hotovo (vitals, CARE, bowl vizuální, neglect/bond) |

---

## Artefakty Etapa 3A

| Soubor | Obsah |
|--------|--------|
| `00_SCOPE.md` | Rozsah, vztah k Capability Etapa 3 |
| `01_CANON_RULES_EXTRACT.md` | 60 kánonních pravidel se zdroji |
| `02_COMPLIANCE_MATRIX.md` | 76 řádků ✅/⚠/❓ |
| `03_GAPS.md` | 13 mezer se severity |
| `04_TESTS_COVERAGE.md` | Contract map + 7 chybějících testů |
| `05_SUMMARY.md` | Tento dokument |

---

## Etapa 3A HOTOVO

Audit shody gift behavior s kánonem je **kompletní**.  
**Žádné změny kódu** nebyly provedeny.

*Příští krok (volitelně): Etapa 3C Kojnožrout — viz `docs/MIA_AUDIT_ETAPA_3B_MIA_BODY_ECONOMY/05_SUMMARY.md`.*
