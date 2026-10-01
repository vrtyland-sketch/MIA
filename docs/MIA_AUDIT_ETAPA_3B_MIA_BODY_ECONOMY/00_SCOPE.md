# MIA Audit — Etapa 3B: MIA Body & Economy (shoda s kánonem)

**Datum:** 2026-07-27  
**Typ auditu:** Behavior correctness — **platí implementace proti kánonu** v oblasti MIA bodů, ekonomiky a veřejné expozice bodů.

---

## Co Etapa 3B pokrývá

| Oblast | Rozsah |
|--------|--------|
| **MIA body (miaPoints)** | Konverze coins→miaPoints, XP vs body, jednotná konfigurace |
| **Veřejná expozice** | Overlay `/overlay-state`, strip coin polí, naming „podpora projektu“ |
| **Tier ekonomiky** | `coinTier` · `streamTier`/`obsTier` · `spamRewardTier` (MIA body) |
| **Gift economy runtime** | Resolver, enrich, gift context, combo/streak/level |
| **Ledger & profily** | `MIA_GIFT_USER_LEDGER`, `MIA_GIFT_SUPPORTER_PROFILE` |
| **Host team body** | Split v host režimu, score bar |
| **Spam reward tiers** | Milestone vlny v miaPoints (≠ stream video tier — viz 3A pro video) |
| **Achievement moments** | Body/achievement v subtextu bez coinů |
| **Arena / duel / viewer** | Platform arena, duel power, viewer memory levels |
| **Inventář vs body** | Vazba rewards→batoh; body nejsou coin inventář |
| **Config flags** | `MIA_GIFT_ECONOMY_TIERS`, `MIA_HOST_TEAM_SPLIT_PCT`, `stream_economy_config.json` |

**Mimo rozsah 3B (odkaz na jiné audity):**

| Oblast | Kde |
|--------|-----|
| Gift video rotace, bowl fill animace, Kapybara AWAY | **Etapa 3A** `docs/MIA_AUDIT_ETAPA_3A_GIFTS/` |
| Koj vitals, CARE příkazy, sprite/mood | **Navrhovaná Etapa 3C** Kojnožrout |
| TTS pipeline obecně, OBS manifest | Etapa 2 / Capability Etapa 3 |
| Engine 2.0 composition | Jen zmínka u public API hranice |

---

## Vztah k ostatním etapám

| Etapa | Složka | Co měří |
|-------|--------|---------|
| **1** | `docs/MIA_AUDIT_ETAPA_1/` | Inventura repa |
| **2** | `docs/MIA_AUDIT_ETAPA_2/` | Flow (vč. `05_FLOW_BATTLE_ECONOMY.md`) |
| **3 (Capability)** | `docs/MIA_AUDIT_ETAPA_3/` | Schopnosti runtime (`05_ECONOMY_BATTLE_INVENTORY.md`) |
| **3A** | `docs/MIA_AUDIT_ETAPA_3A_GIFTS/` | Gift systém vs kánon (video, bowl, spam video cap) |
| **3B (tento audit)** | `docs/MIA_AUDIT_ETAPA_3B_MIA_BODY_ECONOMY/` | **MIA body & ekonomika vs kánon** |

> **Cross-link 3A:** Pravidla G-05–G-09, G-36–G-42, G-60, G-74 v 3A se týkají i body ekonomiky — zde jsou rozvedena do samostatné matrix (BE-*) s důrazem na sémantiku bodů, ne gift video matrix.

---

## Zdroje důkazů

- Kánon: `docs/MIA_GIFT_ECONOMY.md`, `docs/KANON_MIA_AGENT.md` §18, `docs/KANON_SOUCASNY_PREHLED.md`, `docs/KANON_MIA_ALIGNMENT.md` § Gift Economy / §5
- Kód: `scripts/MIA_GIFT_ECONOMY.js`, `scripts/MIA_GIFT_TIERS.js`, `scripts/MIA_SUPPORT_RESOLVER.js`, `scripts/MIA_OVERLAY_PUBLIC_RESPONSE.js`, `scripts/MIA_GIFT_USER_LEDGER.js`, `scripts/MIA_GIFT_SUPPORTER_PROFILE.js`, `scripts/MIA_HOST_TEAM_POINTS.js`, `scripts/MIA_HOST_TEAM_UI.js`, `scripts/MIA_PLATFORM_ARENA.js`, `scripts/MIA_KOJNOZROUT_DUEL.js`, `MIA_NEXT/engine_spam_session.js`, `core/event-normalizer.js`, `core/viewer-memory.js`, `shared/stream_economy_config.json`, `shared/gifts/`
- Testy: `gift_economy`, `overlay_public_response`, `spam_session`, `achievement_moment`, `gift_user_metadata`, `phase2_viewer_memory`, `phase3_game_layer`, `sprint5`, `host_team_ui`, preflight suite

---

## Metodika a statusy

| Symbol | Význam |
|--------|--------|
| ✅ | Shoda — kánon a implementace se shodují (doloženo kódem a/nebo contract testem) |
| ⚠ | Částečná shoda / drift — jádro OK, detail nebo UX/dokumentace rozchází se s kánonem |
| ❌ | Rozpor — implementace proti tvrdému kánonnímu pravidlu |
| ❓ | Neověřeno — chybí důkaz (live stream, multi-day persistence, admin surface) |

**Pravidlo:** Při nejasnosti → **❓ NEOVĚŘENO**, ne domněnka.

---

## Omezení auditu

- **Žádné změny kódu** — pouze analýza a dokumentace.
- Live stream session nebyla součástí tohoto běhu.
- „MIA Body“ ve smyslu **Graphics Studio part overlay** (`mia-body-part-overlay.html`) je zmíněno jen kde se dotýká public API; plný graphics audit není v rozsahu 3B.
