# MIA Character Bible

**Status:** DESIGN ONLY · FREEZE-safe  
**Datum:** 2026-08-08  
**Rozšiřuje:** [`MIA_KOJ_VOICE_BIBLE_DRAFT.md`](./MIA_KOJ_VOICE_BIBLE_DRAFT.md) (hlas)  
**Problém k řešení:** AI generuje „příbuzného z Moravy“ místo Koje — viz `visualIdentity` MIA holo lock

---

## 1. Účel

Jeden **master vzhled** per postava + povolené varianty + **zakázané odchylky**.  
Použití: AI prompty, QC, Character Studio, Gift Factory, stream overlay.

---

## 2. MIA (hologram)

### Master identity
| Atribut | Hodnota |
|---------|---------|
| Forma | Holografická ženská postava, futuristický stream AI |
| Paleta | Cyan `#00E5FF`, magenta akcent `#FF00AA`, tmavé pozadí |
| Proporce | Elegantní, ~7 hlav výšky, ne chibi |
| Oči | Svítící, výrazné — **ne** realistické lidské |
| Outfits | Default holo suit; varianty: formal, battle, casual holo |
| **Není MIA** | Realistická fotka, anime generic, jiná barva očí, chibi Koj-style |

### Výrazy (povolené)
`neutral` · `smile` · `thinking` · `excited` · `concerned` · `battle_ready`

### Pohledy
`front` · `3/4_left` · `3/4_right` · `profile_left` (profile_right rare)

### Reference paths (repo)
- Overlay speech bubble assets  
- `visualIdentity` v animation path (správně pro MIA, ne pro Koj)

### Voice
Vlasta Neural CS · viz voice bible draft

---

## 3. Kojnožrout (Koj)

### Master identity
| Atribut | Hodnota |
|---------|---------|
| Forma | Malý **chibi** kabeložrout, kulatý, roztomilý-agresivní |
| Paleta | Oranžová `#FF8C00`, tmavě hnědá `#5C4033`, bílé bříško |
| Proporce | **Velká hlava : malé tělo** (~1:1 nebo větší hlava) |
| Oči | Velké, kulaté, černé zorničky |
| Signature | **Kabely** v tlamě / packu / ruce — vždy motiv „žere kabely“ |
| **Není Koj** | Realistický pes, jiná species, MIA holo style, slim humanoid, bez kabelů |

### Výrazy (povolené)
`hungry` · `chewing` · `smug` · `angry_cute` · `sleepy` · `shocked`

### Pohledy
`front` · `3/4` · `side_chew` (profil při žraní)

### Varianty (povolené)
| Variant | Popis |
|---------|-------|
| `koj_default` | Standardní oranžový |
| `koj_battle` | Helma / štít (duel) |
| `koj_sleep` | Spící s kabelem jako deka |
| `koj_rich` | Po velkém giftu (T4+) — **ne** měnit proporce |

### Zakázané
- Změna species (pes → kočka)  
- Realistický render bez schválení  
- MIA cyan/magenta paleta  
- Proporce „normálního“ humanoida  

### Reference paths
- `assets/` Koj sprites (část gitignored)  
- Rig Desk anchors v mia-paint  
- Koj Factory custom PNG export  

### Voice
Antonín Neural CS · krátké věty · viz [`MIA_KOJ_VOICE_BIBLE_DRAFT.md`](./MIA_KOJ_VOICE_BIBLE_DRAFT.md)

---

## 4. Další postavy (placeholder registry)

| ID | Status | Poznámka |
|----|--------|----------|
| `viewer_avatar` | PLÁNOVANÉ | Generic, ne brand |
| `duel_opponent` | PLÁNOVANÉ | Battle engine |
| `npc_shopkeeper` | PLÁNOVANÉ | World engine canon |

Každá nová postava = stejná šablona sekce jako MIA/Koj.

---

## 5. Character Profile (pro AI router)

```json
{
  "characterId": "koj",
  "positivePrompt": "cute chibi orange cable-eating creature, big head small body, holding ethernet cables in mouth, cartoon style, white belly, brown accents",
  "negativePrompt": "realistic, photorealistic, human, hologram, cyan magenta, slim proportions, dog breed, cat",
  "palette": ["#FF8C00", "#5C4033", "#FFFFFF"],
  "referenceImages": ["refs/koj_master_front.png"],
  "qcRules": ["head_body_ratio", "cable_present", "palette_delta"]
}
```

Uložení (cíl): `content-pass/character-profiles/koj.json`

---

## 6. QC pravidla (automatizovatelná)

| Rule | MIA | Koj |
|------|-----|-----|
| Dominant color in palette | cyan family | orange family |
| Aspect / silhouette | tall elegant | round chibi |
| Required motif | holo glow | cable |
| Face style | stylized AI | big round eyes |

Fail → retry s jiným providerem → human review → **ne** auto-promote do MASTER.

---

## 7. Asset status per postava

| Asset | MIA | Koj |
|-------|-----|-----|
| MASTER refs | 🟡 partial | 🟡 partial |
| ACTIVE stream | 🟢 overlay | 🟢 overlay |
| AI gen lock | 🟢 (bug: používá se i pro Koj) | 🔴 needs profile |
| Animation bank | 🟡 | 🟡 |

---

## 8. Akční body (post-freeze)

1. Vytvořit `character-profiles/*.json`  
2. Opravit `visualIdentity` — bind per character, ne global MIA  
3. QC script: palette + silhouette heuristika  
4. Schválit 1 MASTER PNG front + 3/4 per postavu (human sign-off)
