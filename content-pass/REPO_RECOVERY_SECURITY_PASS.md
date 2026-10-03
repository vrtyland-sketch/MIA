# REPO RECOVERY & SECURITY PASS

**Status:** PASS (git hygiene + preflight) · 2026-10-03  
**Branch:** `feature/mia-genesis-mode`  
**Pravidlo:** **Žádný history rewrite, žádný merge.** GitHub commit `611bc781` **necháváme** — tento pass chrání **budoucí** commity a dává plán rozdělení práce.

---

## 0. Cíl

| # | Úkol | Stav |
|---|------|------|
| 1 | Odstranit runtime / osobní data z **budoucích** commitů | ✅ `.gitignore` + `git rm --cached` (~220 souborů) |
| 2 | Audit tracked dat a secrets | ✅ §2 |
| 3 | Rozdělit obří sync `611bc781` na **logické PR slice** (jen plán) | ✅ §3 |
| 4 | `npm run test:preflight` (full) na větvi | ✅ §4 |

**Později (mimo tento pass):** BFG / filter-repo pro vymazání citlivých blobů z historie na GitHubu — až operátor rozhodne.

---

## 1. Co jsme udělali (bez přepisování historie)

1. Rozšířen `.gitignore` o live `data/*.json`, avatar cache, media review frames, live evidence `.jsonl`.
2. `git rm --cached` u již trackovaných runtime souborů — **soubory zůstávají na disku**, zmizí jen z indexu.
3. **Nepushnuté force, žádný rebase** — remote `611bc781` zůstává beze změny obsahu.

---

## 2. Audit tracked dat & secrets

### 2.1 Secrets — OK

| Cesta | Trackováno? | Poznámka |
|-------|:-----------:|----------|
| `.env` | **Ne** | `.gitignore` |
| `secrets/local/` | **Ne** | `.gitignore` |
| `secrets/README.md` | Ano | jen dokumentace, bez hodnot |

Skener klíčových vzorů: **žádný API key v trackovaných souborech** (`.env` lokálně existuje, není v gitu).

### 2.2 Runtime / osobní data — bylo trackováno (611bc781)

| Kategorie | Příklady | Riziko |
|-----------|----------|--------|
| Viewer / session | `viewer-memory.json`, `viewer-inventory.json`, `mia-session-memory.json` | nicky, historie |
| Live stav | `runtime-state.json`, `kojnozout-*.json`, `platform-arena.json`, `story-memory.json` | provoz + kontext |
| Avatar cache | `data/avatar-cache/*.bin` | profilové obrázky |
| Chat lexicon | `mia-chat-lexicon.json` | viewer fráze |
| Live evidence | `docs/*EVIDENCE*.jsonl`, `STREAM_VALIDATION_*.jsonl` | ingest / jména |
| Media review | `data/media-review-frames/**` | velikost + soukromé video názvy |

**Audit canon:** `docs/MIA_AUDIT_ETAPA_3/08_PERSISTENCE_WATCHDOG_RECOVERY.md` — `data/*.json` = live stav, **necommitovat**.

### 2.3 Co může zůstat trackované (struktura / audit fixture)

| Soubor | Důvod |
|--------|--------|
| `data/koj-2d-factory-audit.json` | statický audit výstup |
| `data/koj-obs-visual-audit.json` | statický audit výstup |
| `data/obs-streamer-camera-rig.json` | konfigurace rigu (bez secrets) |

---

## 3. Logické rozdělení sync commitu `611bc781` (pro review / budoucí PR)

> **Nepřepisujeme historii.** Toto je mapa pro **lidské review** a případné **nové** commity po recovery.

| Slice | ID | Obsah (orientačně) | Doporučený PR titulek |
|-------|-----|-------------------|------------------------|
| A | `ops-home` | `content-pass/`, `scripts/home_*.ps1`, `.env.*.example` | docs(ops): home execution + remote dev gate |
| B | `docs-audit` | `docs/MIA_AUDIT_*`, asset pass, capability inventory | docs: audit etapy + asset pass |
| C | `content-text` | `text-bank/packs/**` | content: text-bank packs |
| D | `canon-import` | `_canon_import/`, `docs/master-canon/` | docs: master canon import |
| E | `overlay-genesis` | `mia-output-overlay/genesis-*`, assets | feat(overlay): genesis HTML/assets |
| F | `runtime-platform` | `routes/`, `scripts/MIA_*`, `shared/*-core/` | feat: platform bridges + cores |
| G | `tests` | `tests/**` | test: contract suites |
| H | `data-leak` | trackované `data/*` + evidence jsonl | **security: untrack runtime data** (tento pass) |

**Pořadí merge (až po thaw):** H → A → C → B → D → E → F → G (security a ops first).

---

## 4. Preflight

```powershell
node --check index.js
npm run test:preflight
```

Výsledek doplnit:

| Run | Datum | PASS/FAIL | Poznámka |
|-----|-------|-----------|----------|
| `node --check index.js` | 2026-10-03 | **PASS** | exit 0 |
| `npm run test:preflight` (full) | 2026-10-03 | **PASS** | **292/292**, `failed: 0` |

---

## 5. Checklist operátora

- [ ] Pull recovery commit na PC2 až bude pushnut
- [ ] Ověřit, že `git status` neukazuje runtime JSON jako staged
- [ ] Rotace klíčů **jen pokud** byly kdy v trackovaném souboru (YouTube key v `.env` only → OK)
- [ ] Volitelně: GitHub secret scanning / nový branch pro review slices

---

*Feature freeze: tento pass nemění ingest/OBS runtime chování — jen git hygienu a preflight.*
