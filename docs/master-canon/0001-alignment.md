# Master Canon 0001 — soulad s projektem

Audit [`0001-project-constitution.md`](./0001-project-constitution.md) vůči stavu `C:\MIA` k 2026-07-15.

Legenda: ✅ implementováno · 🟡 částečně · ❌ chybí

---

## §1 Účel dokumentu

| Bod | Stav | Důkaz / poznámka |
|-----|------|------------------|
| Ústava jako nejvyšší autorita | ✅ | `docs/master-canon/` založeno; hierarchie v `README.md` |
| Žádný rozpor s nižšími dokumenty | 🟡 | `KANON_MIA_AGENT.md` sladěn odkazem; průběžná kontrola přes alignment |
| Dokument není technický | ✅ | 0001 bez implementačních detailů |

---

## §2 Co je MIA

| Bod | Stav | Důkaz / poznámka |
|-----|------|------------------|
| Modulární platforma (ne jen chatbot) | ✅ | `index.js` orchestrátor + 59× HOST/CTX, `routes/`, `shared/` |
| Propojení AI + grafika + animace + ekonomika | ✅ | shadow pipeline, Graphics Studio, Animation Bank, gift mapa |
| Samostatné moduly tvoří celek | ✅ | TikFinity/Kick → MIA → OBS; overlaye pollují `/overlay-state` |
| Digitální entity | 🟡 | MIA + Kojnožrout 🟢; formální definice entity → **dokument 0002** |

---

## §3 Hlavní poslání

| Cíl | Stav | Důkaz / poznámka |
|-----|------|------------------|
| 1. Komunikovat s lidmi | ✅ | ingest chat, TTS, `speech-overlay.html`, multi-platform chat overlay |
| 2. Učit se z vlastních dat | 🟡 | `data/mia-session-memory.json`, lexicon, gift-map-stats, story-memory; bez plného ML retréningu |
| 3. Ovládat grafické prostředí | ✅ | `MIA_OBS_*`, Graphics Studio, body parts, Animation Bank |
| 4. Reagovat na události | ✅ | `MIA_EVENT_PIPELINE.js`, fázový pipeline, gift/video reakce |
| 5. Řídit další moduly | ✅ | HOST vrstvy, delivery runtime, orchestrace OBS/TTS/video |
| 6. Vytvářet vlastní obsah | 🟡 | MIA Paint, AI graphics agent, staging encode; ne plně autonomní tvorba |
| 7. Dlouhodobě se rozvíjet | 🟡 | Koj evoluce, story arcs, platform arena; User Mode / multi-tenant ❌ |

---

## §4 Základní principy

| Princip | Stav | Důkaz / poznámka |
|---------|------|------------------|
| Modularita | ✅ | HOST refactor, `routes/`, `shared/mia-*` balíčky |
| Rozšiřitelnost | ✅ | gift mapa `shared/gifts/`, plugin-like command catalog |
| Stabilita | ✅ | `npm run test:preflight:fast` (140+ testů), guardrails v `.cursor/rules/` |
| Transparentnost | 🟡 | shadow pipeline, `logs/ingest-*.jsonl`; ne všechny rozhodnutí mají audit trail |
| Kontrolovatelnost | 🟡 | `/health`, `/status`, `/gift-map/status`, `audit:live`; chybí jednotný „why“ log |
| Dokumentace | 🟡 | `docs/` + kánon; Master Canon dříve chyběl — doplněno 0001 |

---

## §5 Rozsah projektu

| Oblast | Stav | Vstupní body |
|--------|------|--------------|
| AI systémy | ✅ | shadow runtime, LLM hybrid, interpreter |
| Správa paměti | 🟡 | session memory, lexicon, achievements; bez globální user DB |
| Grafický editor | ✅ | `mia-output-overlay/mia-paint/` |
| Animace | ✅ | Animation Bank, Graphics Studio, body live sync |
| Streamovací nástroje | ✅ | ingest, stream session, platform bridges |
| OBS integrace | ✅ | `MIA_OBS_BOOTSTRAP.js`, overlay sync, vision |
| Ekonomika | ✅ | `MIA_GIFT_ECONOMY.md`, gift mapa, MIA body |
| Herní mechaniky | ✅ | Koj vitals, duely/arena, boss mise |
| Kojnožrout | ✅ | `KOJNOZROUT_KANON.md`, CARE, batoh, bond |
| Gift systém | ✅ | `shared/gifts/`, video rotace per-tier |
| Komunitní funkce | 🟡 | spam wave, participants strip; sociální síť ❌ |
| API | ✅ | `routes/`, ingest, overlay-state, paint API |
| Webové rozhraní | ✅ | overlaye, dashboard, paint editor |
| Mobilní rozšíření | ❌ | vize mimo tento repozitář |
| Další platformy | 🟡 | Kick bridge 🟢; TikTok přes TikFinity 🟢; další dle potřeby |

---

## §6 Pravidlo jediného zdroje pravdy

| Bod | Stav | Důkaz / poznámka |
|-----|------|------------------|
| Master Canon = hlavní zdroj | ✅ | `docs/master-canon/README.md` hierarchie |
| Záznam rozporů | ✅ | `KANON_MIA_ALIGNMENT.md` 🟢/🟡/🔴 |
| Postup řešení rozporu | 🟡 | proces popsaný; bez automatického ticketování |

---

## §7 Definice dokončení

| Kritérium | Stav | Důkaz / poznámka |
|-----------|------|------------------|
| Implementováno | ✅ | měřeno alignment mapou |
| Otestováno | ✅ | preflight + doménové contract testy |
| Zdokumentováno | 🟡 | většina stream domén ano; nové fáze Graphics Studio průběžně |
| Soulad s Master Canonem | ✅ | tento dokument + `mia_master_canon_0001_contract.js` |

---

## §8 Poznámka pro Cursor

| Bod | Stav | Důkaz / poznámka |
|-----|------|------------------|
| Systematické porovnání | ✅ | alignment soubory + contract test |
| Symboly ✅/🟡/❌ | ✅ | použito v tomto dokumentu a `KANON_MIA_ALIGNMENT.md` |

---

## Shrnutí 0001

| Sekce | ✅ | 🟡 | ❌ |
|-------|----|----|-----|
| §1 Účel | 2 | 1 | 0 |
| §2 Co je MIA | 3 | 1 | 0 |
| §3 Poslání | 4 | 3 | 0 |
| §4 Principy | 3 | 3 | 0 |
| §5 Rozsah | 10 | 3 | 1 |
| §6 Zdroj pravdy | 2 | 1 | 0 |
| §7 Hotovo | 3 | 1 | 0 |
| §8 Cursor | 2 | 0 | 0 |

**Celkově:** ústava je v souladu s direction projektu. Největší mezery: **formální definice entity (0002)**, **User Mode / mobil**, **plná transparentnost rozhodnutí**.

---

## Další krok

**Dokument 0002 — Definice entity v MIA** (základ pro MIA, Kojnožrout, budoucí třetí entitu a modulové agenty).
