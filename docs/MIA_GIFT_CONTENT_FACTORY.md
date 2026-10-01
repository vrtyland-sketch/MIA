# MIA Gift Content Factory

**Status:** DESIGN ONLY · FREEZE-safe  
**Datum:** 2026-08-08  
**Vstup:** `shared/gifts/gift_map` · tier video · Animation Bank

---

## 1. Problém

Bez factory linky = stovky náhodných obrázků/videí bez vazby na gift tier, reakci postavy a bank slot.

---

## 2. Výrobní linka

```text
TikTok gift (canonical name)
    ↓ normalize
gift_map → tier (T1…T6) + miaPoints + category
    ↓
visual motif (icon, color, motion language)
    ↓
character reaction (MIA voice / Koj voice / both / silent)
    ↓
content slots: image | video | SFX | overlay text key
    ↓
Animation Bank pack (promote gate)
    ↓
Stream: tier rotation + OBS overlay
```

---

## 3. Gift map → kategorie

| Tier | Příklad gifts | Motiv | Reakce | Media |
|------|---------------|-------|--------|-------|
| T1 | Rose, Heart | jemný, rychlý | Koj krátký | 3–6 s loop |
| T2 | … | … | Koj + MIA line | 5–8 s |
| T3 | … | střední energie | dual possible | 8–12 s |
| T4+ | velké gifty | epic, particles | MIA lead | 12–20 s |
| T5–T6 | whale | cinematic | full duo | 15–30 s |

**Zdroj pravdy:** existující `gift_map` — factory jen **doplňuje** sloty, nemění ekonomiku.

---

## 4. Content slot schema

```json
{
  "giftKey": "ROSE",
  "tier": "T1",
  "motif": { "primaryColor": "#FF69B4", "icon": "rose", "motion": "float_up" },
  "reactions": {
    "koj": { "expression": "smug", "voiceKey": "gift.rose.koj", "durationMs": 2000 },
    "mia": { "voiceKey": "gift.rose.mia", "optional": true }
  },
  "assets": {
    "video": { "bankSlot": "gift/T1/rose", "rotationGroup": "T1", "status": "ACTIVE" },
    "sfx": { "path": "assets/sfx/rose_pop.wav" },
    "overlay": { "template": "gift_rose_v2" }
  },
  "textBankKeys": ["gift.rose.koj", "gift.rose.mia"],
  "qc": { "maxDurationMs": 6000, "alphaRequired": true }
}
```

Uložení (cíl): `content-pass/gift-factory/ROSE.json` (+ index)

---

## 5. Rotation pravidla (guardrail)

- **Per-tier index** `rotationIndexByTier` — bez resetu tier indexu  
- Chybějící video v rotaci → skip slot, log warn (PMB: 1/6 Rose)  
- Nikdy neexponovat coins — jen `miaPoints` v overlay

---

## 6. Výrobní workflow (offline / studio)

1. **Intake** — nový gift z TikTok catalog diff  
2. **Map** — přiřadit tier + kategorii (existující map)  
3. **Brief** — Director: „T1 rose, Koj olízne růži, 4s alpha WEBM“  
4. **Generate** — AI + Character Bible + true-alpha  
5. **Edit** — mia-paint / timeline trim  
6. **QC** — duration, alpha, tier, no coins  
7. **Promote** — Animation Bank pack + preflight gate  
8. **Register** — ASSET_REGISTRY + gift-factory JSON  

---

## 7. Stav dnes

| Krok | Status |
|------|--------|
| gift_map | 🟢 HOTOVO |
| tier video rotation | 🟡 NEDOTAŽENO |
| text bank gift keys | 🟢 86 keys |
| factory JSON per gift | 🔴 PLÁNOVANÉ |
| auto Director brief | 🔴 PLÁNOVANÉ |

---

## 8. Priorita seed (doporučení)

1. ROSE (T1) — PMB proven path  
2. Top 10 gifts by frequency (z logů po multi-PC)  
3. T4+ whale set (méně kusů, větší dopad)

---

## 9. Odkazy

- [`MIA_CREATIVE_PIPELINE.md`](./MIA_CREATIVE_PIPELINE.md)  
- [`MIA_CHARACTER_BIBLE.md`](./MIA_CHARACTER_BIBLE.md)  
- [`ASSET_INVENTORY.md`](./ASSET_INVENTORY.md)
