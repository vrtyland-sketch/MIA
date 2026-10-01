# GENESIS STREAM VOICE — charakter & text banky (notebook pass)

**Status:** LOCK · 2026-08-13 · FREEZE-safe  
**Scope:** `text-bank/packs/` only — **žádný** runtime / ingest / OBS kód

Související: [`docs/MIA_KOJ_VOICE_BIBLE_DRAFT.md`](../docs/MIA_KOJ_VOICE_BIBLE_DRAFT.md) · [`ASSET_GENESIS_CUT.md`](./ASSET_GENESIS_CUT.md)

---

## Cíl passu

1. Méně otravného „děkuju děkuju“ u malých giftů  
2. Silnější charakter MIA vs Koj (ne stejná věta jiným hlasem)  
3. Reakce na **ticho**, **nové/návratové diváky**, **malé gifty**, **spam/combo**  
4. Připravit banky pro GP — loader je načte automaticky (`MIA_TEXT_BANK_LOADER.js`)

---

## Pack mapa (GENESIS hot path)

| Situace | MIA key | Koj key | Soubor |
|---------|---------|---------|--------|
| T1 / Rose | `support_small_mia` | `support_small_kojnozout` | `support/support-mia-koj.json` |
| T2–T3 | `support_medium_*` | `support_medium_*` | stejný |
| T4+ | `support_big_*` | `support_big_*` | stejný |
| Spam OK | `support_spam_success_*` | `support_spam_success_*` | `support/support-spam-bowl.json` |
| Spam fail | `support_spam_fail_*` | `support_spam_fail_*` | stejný |
| Plná miska | `support_full_bowl_*` | `support_full_bowl_*` | stejný |
| Combo | `support_combo` | (shared) | stejný |
| Ticho / nuda | `idle_bored` | (Koj přes proactive) | `idle/idle.json` |
| Hlad / ticho | `idle_hungry` | — | `idle/idle.json` |
| Probuzení | `wake_up_chat_mia` | `wake_up_chat_kojnozout` | `community/wake.json` |
| Návrat diváka | `mia_returning_ack` | `koj_returning_ack` | `mia|koj/returning-viewer.json` |
| **Nový divák** | `mia_first_visit_ack` | `koj_first_visit_ack` | `stream-core/first-visit.json` **(nový, wiring later)** |

---

## Pravidla (zkráceno z Voice Bible)

### MIA

- Vede stream — mluví **k** lidem, ne reportuje „komunitu“  
- Krátké mluvené věty, TTS-friendly  
- Děkování **max 1× ve větě**, ne v každé variantě  
- Zakázáno: *drží tempo*, *kolektivní síla*, *provozní*, *nálada prostoru*

### Kojnožrout

- Prožívá — hlad, miska, drzost, spánek  
- Děkování může být nevděčné / vtipné (*teď dejte pokoj*)  
- Není MIA s Antonínovým hlasem

### Test výměny jména

Přečti větu jako Koj — pokud sedí, přepiš.

---

## Co bylo změněno (2026-08-13 notebook pass)

| Soubor | Změna |
|--------|-------|
| `support/support-mia-koj.json` | `support_small_*` — méně „Děkuju“ openerů, víc konkrétní reakce, `{name}` kde dává smysl |
| `support/support-spam-bowl.json` | MIA spam success — odstraněn korporátní „komunita“ jazyk |
| `idle/idle.json` | `idle_bored` — sladěno s voice bible (ticho) |
| `mia/returning-viewer.json` | kratší, méně formální návraty |
| `koj/returning-viewer.json` | víc Koj tónu |
| `stream-core/first-visit.json` | **nový** — first visit ack (runtime wiring až po thaw) |

**Nezměněno:** `genesis/cs.json` (300-line Genesis izolace — OUT pro Stream Core GP).

---

## Doporučení doma (bez kódu)

| Env / toggle | Doporučení |
|--------------|------------|
| `MIA_DUAL_VOICE=0` | jedna TTS cesta |
| TikFinity Actions TTS | OFF (TikFinity audit D1) |
| Proactive host | OFF pokud otravuje během GP testu |

---

## POST-GENESIS (až po thaw)

- Wire `mia_first_visit_ack` / `koj_first_visit_ack` v `MIA_RESPONSE_ENGINE.js`  
- PF-01: gift voice ≠ announce template v charakterových bankách  
- Projít `support_medium/big` stejným character passem

*Notebook pass hotov. Dál jen doma dle HOME EXECUTION PLAN.*
