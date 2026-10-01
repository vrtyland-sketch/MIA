# Návrh: sjednocení světa MIA ↔ Kojnožrout

**Stav:** návrh (ne implementace) · **Datum:** 2026-07-19  
**Zdroje:** `kojnozrout-runtime.html`, `speech-overlay.html`, `mia-holo-motion.js`, `tiktok-viewer-zones.css`, `kojnozrout-bowl-overlay.html`, `visualIdentity.js`, OBS layout (`docs/OBS_LIVE_SETUP.md`)

---

## 1. Verdikt — proč to nesedí

Dva problémy najednou: **pohyb** a **svět**.

**Pohyb.** Koj má čitelnou mascot řeč těla: kotva u nohou (`transform-origin: 50% 100%`), dýchání se squash/stretch, bob ~6–10 px, gift/celebrate/hype s nadskočením 12–18 px, chůze s waddle + squash. MIA (`MiaHoloMotion`) má organický multi-sine, ale **amplitudy jsou mikroskopické** (breath ~0,7 % výšky zóny ≈ 3–5 px, rotace ~0,4°, speak scale +1,2 %). Servo ticky jsou vzácné a jemné. Divák to čte jako „stojí / levituje“, ne jako živou postavu. Glow/scan/flicker maskují absenci váhy — FX místo pohybu.

**Svět.** Koj = cute pet (mint `#8aff9d`, teplé hungry orange, měkký drop-shadow, Tamagotchi×Pokémon). MIA = hard cyan hologram (`#00DCFF`, Orbitron, scanline, glitch, beam) + identity lock „cyberpunk AI projection / not a green animal“. Bowl UI je zelený pečovatelský chrome; MIA bublina je ledově cyan; Koj bublina je fialová — tři chrome jazyky. Na transparentním OBS canvasu + webcam hosta vzniká **trojitý clash**: realita (kamera) × Blade Runner AI girl × cute mascot. Prior verdict drží: prázdné plátno + style clash.

Shrnutí: MIA „vypadá hezky“, ale **nežije ve stejném rytmu ani ve stejném světě** jako Koj.

---

## 2. Cílová vize — „stejný svět“

Jeden sdílený vesmír: **měkké sci-fi pečovatelské studio** — vibe jméno: **Soft Neon Companion Lab**.

MIA = **něžný holo-guardian** (přátelský cyborg-mascot, lehká projekce, teplý mint–aqua, zaoblené siluety, žádný horror chrome). Koj = **živý mazlíček** v téže místnosti (už skoro hotový). Společná podlaha světla, společná mint/aqua paleta, společná řeč pohybu (squash, bob, reakce na gift). Ne Blade Runner, ne čistá kawaii — **soft sci-fi pet companion + gentle hologram guardian**.

---

## 3. Motion — co je špatně a jak má být

| | Koj (referenční) | MIA teď | Cíl MIA |
|--|------------------|---------|---------|
| Kotva | nohy / spodní střed | center bottom (OK) | držet; přidat kontaktní stín jako Koj walkShadow |
| Idle | breath 5–6 s, ±Y 3–6 px + squash | breath ~0,7 % + sway, skoro neviditelné | **2–2,5× amplituda**; jemný squash `scaleY` 0,985↔1,015 |
| Speak | bob + scale 1,04 | lean +1,2 % scale | **čitelný nod/bob 6–10 px**, scale ~1,04 jako Koj speak |
| Gift | `kojGift` −12 px + scale 1,05 | jen CSS mood gold glow | **stejný bounce jazyk** (1 cyklus), ne jen tint |
| Float vs ground | grounded + stín | holo beam + base, postava „visí“ | méně float; **váha u nohou**, slabší beam/scan |
| Secondary | waddle, blink, props | servo ticky | méně mech ticků; více **secondary** (vlasy/rameno/lean) v rytmu řeči |

Konkrétní směry v `mia-holo-motion.js` (až půjde implementace):

1. Zvýšit idle mul / breathY / weightX tak, aby idle byl vidět na telefonu na 1 s pohled.
2. Speak: silnější leanY + krátký bob (ne jen glow).
3. Gift/combo hook: one-shot pulse (translateY + squash), sdílený „reaction vocabulary“ s Kojem.
4. Ztlumit FX, které simulují život (glitch/flicker) — nahradit pohybem.

---

## 4. Art direction — sjednocení

**Doporučený směr: restyle MIA → svět Koje** (ne naopak).

Proč: Koj má silnější brand attachment, zralejší motion banku a pečovatelský gameplay (miska, vitals, batoh). MIA art je novější cyber experiment + identity lock stále tlačí hard cyan hologram — to je hlavní clash. Lehký tint Koje směrem k MIA by zabil cute pet.

| Prvek | Teď MIA | Cíl (Soft Neon) |
|-------|---------|-----------------|
| Paleta | ledový cyan 0,230,255 | mint–aqua most k `#8aff9d` + teplý aqua (ne fialový horror) |
| Line / shape | ostrý cyborg / suit | měkčí silueta, větší hlava/oči (mascot proportions) |
| Materiál | chrome + scan + glitch | soft glow, slabý rim; glitch jen při glitch-momentu |
| Typo | Orbitron | sdílený friendly UI font s bowlem (méně „HUD“) |
| Role | „AI projection“ | **guardian companion** ve stejném labu jako Koj |

Fáze A = jen CSS paleta/glow (wow/effort nejvyšší). Fáze B = nový PNG set (friendly cyborg-mascot + true alpha). Identity prompt v `visualIdentity.js` přepsat až s Fází B.

---

## 5. Kompozice scény (TikTok / OBS)

Kanón zóny drží (`tiktok-viewer-zones.css` + OBS):

```
Portrait 1080×1920 (cíl live):
┌─────────────────────────┐
│  ENTITY        BOWL     │  ← chrome ve Soft Neon paletě
│                         │
│  MIA (L, velká)  bubble │  ← MIA ~ hero presence
│         ▲               │
│         └── Koj (R dock)│  ← pet ~ ⅓–½ výšky MIA
│              + ground   │  ← sdílený „floor glow“ (vizuální most)
└─────────────────────────┘
```

- **MIA** = levý dolní hero (větší), guardian.
- **Koj** = pravý dolní dock (~400×400 zdroj), pet; clear-right v bublině.
- **Bowl** = pravý horní pečovatelský HUD — sjednotit border/glow s MIA (mint, ne tři styly).
- **Kamera** = host realita; overlay postavy musí působit jako **společná vrstva nad světem**, ne tři cizí stickery. Žádný nový full-bleed background nutný ve Fázi A — stačí **sdílený kontaktní glow / podlaha** pod MIA i Kojem.
- Scale: MIA dominantní řečník; Koj čitelný mazlíček vedle — ne stejně velcí (sourozenci v jednom labu, ne duel twinů).

---

## 6. Roadmapa (wow / effort)

### Fáze A — 1–2 h (dělat první)
- Motion: zvednout amplitudy + speak bob + gift one-shot v `mia-holo-motion.js` / speech mood class.
- Palette CSS: `--holo-c1/c2` směrem k mint–aqua; ztlumit scan/glitch; sjednotit bubble border s bowl mint.
- Volitelně: kontaktní stín pod MIA (CSS ellipse), slabší beam.
- **Wow/effort: nejvyšší.** Okamžitě „hne se“ + méně clash.

### Fáze B — ~½ dne
- Nový MIA art: soft-neon guardian, mascot proportions, true alpha (`mia_build_cyber_alpha` pipeline).
- Update `visualIdentity.js` prompt (friendly guardian, ne Blade Runner).
- Lip/speak faces v novém stylu.
- **Wow: velký**, effort střední–vyšší (závisí na generaci artu).

### Fáze C — sdílený jazyk
- Shared reaction vocabulary: gift/combo/duel stejné bounce křivky MIA↔Koj.
- Event bridge: gift → MIA pulse + Koj gift pose synchronně.
- Volitelně: lehký „lab floor“ strip / společný ambient (stále transparent OBS).
- **Wow: vysoký dlouhodobě**, effort vyšší (orchestrace).

Priorita: **A → B → C**. Bez A nemá smysl nový art (krásná socha). Bez B A jen zmírní clash.

---

## 7. Doporučení „dělej teď“ (top 3)

Až řekneš go:

1. **Motion pass A** — `mia-holo-motion.js`: 2–2,5× idle amp, speak bob jako Koj speak, gift one-shot squash; méně float.
2. **Palette pass A** — speech-overlay + zones: mint–aqua holo, ztlumit glitch/scan, bubble border blíže bowl `#8aff9d`.
3. **Art brief B** — 1 stránka promptů + referenční moodboard (Koj mint + soft guardian), pak generace 2–3 PNG (idle/speak) přes stávající alpha pipeline.

---

## Poznámky k implementaci (až půjde kód)

- Guardrails: minimální diff; OBS jen render; overlay bez coins.
- Po zásahu do motion/overlay: `node --check` relevantních JS + `npm run test:preflight:fast` pokud sahá stream/OBS.
- Nerestylovat Koj jako primární cestu.
- Tento dokument = export pro ChatGPT / rozhodnutí; **není commitnutý požadavek** — commit jen na výslovný pokyn.
