# MIA Audit — Etapa 3A: Gift systém (shoda s kánonem)

**Datum:** 2026-07-27  
**Typ auditu:** Behavior correctness — **platí implementace proti kánonu**, ne „co kód umí“.

---

## Co Etapa 3A pokrývá

| Oblast | Rozsah |
|--------|--------|
| Gift ingest → normalizace → resolver → decision → delivery | Tok dárků od RAW eventu po overlay/TTS/video |
| Tier systém T0–T6 | Coin prahy, streamTier, obsTier, playback tier |
| MIA body vs coins | Public overlay policy |
| Video rotace | Per-tier index bez resetu |
| Gift Map | `shared/gifts/` + legacy `MIA_GIFT_MAP.js` (animace) |
| Spam / combo | Community wave, milestone, combo ×10/50/100 |
| Large gift mimo spam | Reaction policy, throttle bypass |
| Bowl | Naplnění, 100 %, reset, T4 special video |
| Koj integrace | Bowl fill, vitals, care-aware animace |
| Kapybara / pet chat loop | AWAY flow |
| Metadata | recentGifts, recentParticipants, giftContext |
| Dual-path architektura | Enterprise mapa vs legacy animační profil |

**Mimo rozsah 3A:** inventář detail, duely/arena, TTS obecně, ingest auth, OBS manifest, Graphics Studio, Engine 2.0 (jen zmínka kde koliduje s gift public API).

---

## Vztah k ostatním etapám

| Etapa | Složka | Co měří |
|-------|--------|---------|
| **1** | `docs/MIA_AUDIT_ETAPA_1/` | Co v repu existuje |
| **2** | `docs/MIA_AUDIT_ETAPA_2/` | Jak data tečou (flow) |
| **3 (Capability)** | `docs/MIA_AUDIT_ETAPA_3/` | **Inventář schopností** — co runtime umí spustit; **není** audit shody s kánonem |
| **3A (tento audit)** | `docs/MIA_AUDIT_ETAPA_3A_GIFTS/` | **Shoda chování gift systému s kánonem** |
| **3B** | `docs/MIA_AUDIT_ETAPA_3B_MIA_BODY_ECONOMY/` | **MIA body & ekonomika** (miaPoints, ledger, profily, spam reward tiers) |

> **Poznámka k `docs/MIA_AUDIT_ETAPA_3/`:** Dokumenty jako `02_GIFTS_VIDEO.md` a `03_KOJ_BOWL.md` popisují **Capability** (funguje / nefunguje / testy existují). Etapa 3A je nezávislá vrstva: stejná oblast může být ✅ capability a ⚠ canon drift.

---

## Zdroje důkazů

- Kánon: `docs/MIA_GIFT_ECONOMY.md`, `docs/KANON_MIA_AGENT.md`, `docs/KANON_SOUCASNY_PREHLED.md`, `docs/KANON_MIA_ALIGNMENT.md`, `docs/KOJNOZROUT_KANON.md`, `.cursor/rules/mia-canon.mdc`
- Kód: `shared/gifts/`, `scripts/MIA_GIFT_*`, `scripts/MIA_SUPPORT_RESOLVER.js`, `scripts/MIA_VIDEO_ENGINE.js`, `MIA_NEXT/engine_spam_session.js`, `scripts/KOJNOZROUT_BOWL_ENGINE.js`, `scripts/MIA_BOWL_FULL_VIDEO.js`, `scripts/MIA_CAPYBARA_FLOW.js`, `scripts/MIA_OVERLAY_PUBLIC_RESPONSE.js`
- Testy: `tests/gift_*`, `tests/overlay_public_*`, `tests/video_rotation_smoke.js`, `tests/spam_session_contract.js`, `tests/combo_*`, preflight suite v `scripts/run_preflight_tests.js`

---

## Metodika a statusy

| Symbol | Význam |
|--------|--------|
| ✅ | Shoda — kánon a implementace se shodují (doloženo kódem a/nebo contract testem) |
| ⚠ | Částečná shoda / drift — jádro OK, detail nebo dokumentace rozchází se s kánonem |
| ❌ | Rozpor — implementace proti tvrdému kánonnímu pravidlu |
| ❓ | Neověřeno — chybí důkaz (live stream, test, nebo nejednoznačný kánon) |

**Pravidlo:** Při nejasnosti → **❓ NEOVĚŘENO**, ne domněnka.

---

## Omezení auditu

- **Žádné změny kódu** — pouze analýza a dokumentace.
- Live OBS session nebyla součástí tohoto běhu (historické R1-C PASS citováno jako ❓ doplněk).
- Kánon T5/T6 „cutscéna / celá stream událost“ je částečně vize — hodnoceno proti explicitním tvrdým pravidlům a alignment mapě.
