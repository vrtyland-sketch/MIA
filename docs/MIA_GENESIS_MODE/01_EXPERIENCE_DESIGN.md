# MIA Genesis Mode — Experience Design (Týden 1)

**Účel:** Celý zážitek pohromadě — co divák vidí, slyší a cítí od startu po den.  
**Značka:** Genesis Mode · Genesis Sequence  
**Související:** [02](./02_OVERLAY_AND_SCENE_SPEC.md) · [03](./03_VOICE_BANK_SPEC.md) · [05](./05_CADENCE_AND_UNLOCK_STORY.md)

---

## 1. Příběh (ne prototyp)

MIA **nikdy** neříká: „Tohle je prototyp.“ / „Testujeme.“ / „Čekací místnost.“

Místo toho:

> Vítejte u mého prvního veřejného spuštění.  
> Některé moduly jsou již aktivní.  
> Další budou zpřístupněny po úspěšném ověření.  
> Děkuji, že jste u mého probouzení.

Genesis Mode je **svět**, do kterého lidé přijdou — ne scéna, na kterou čekají.

---

## 2. Co divák vidí (kompozice)

Jedna scéna `MIA_GENESIS`, jeden obraz (stejný výstup na TikTok / Kick, pokud vysíláno):

| Vrstva | Role |
|--------|------|
| Futuristické pozadí + datové linky + částice | Atmosféra |
| Logo MIA | Brand hero signal |
| Avatar MIA (pózy / jemné idle) | Živá entita |
| SYSTEM STATUS | Stav modulů |
| Live terminal | Pohyb „něco se děje“ |
| Diagnostics strip | Aktivní diagnostika |
| YouTube panel | Dlouhodobý archiv / komunita |
| Platform strip | TikTok · Kick · YouTube (přirozeně, ne spam) |
| Readiness % | Pomalý, důvěryhodný progress |

Detail vrstev: [02_OVERLAY_AND_SCENE_SPEC.md](./02_OVERLAY_AND_SCENE_SPEC.md).

---

## 3. Viewer journey

### T+0 … T+2 min — Genesis Sequence

| Smysl | Obsah |
|-------|--------|
| Vidí | Fade-in pozadí, logo, avatar IDLE → LISTENING; terminál plní první řádky; STATUS řádky se „rozsvěcí“ |
| Slyší | Startup BGM (tiše) → SFX boot → první hlas: „Genesis Sequence aktivní.“ |
| Cítí | Slavnostní start, ne loading spinner |

**Milníky Sequence:** Voice ONLINE · Memory CHECKING → OK · OBS ONLINE · TikTok CONNECTED / STANDBY dle reality · Kick STANDBY · YouTube COMMUNITY BUILDING.

### T+10 min — rytmus běží

| Smysl | Obsah |
|-------|--------|
| Vidí | Cadence: nový řádek terminálu, změna % nebo diagnostics; avatar SPEAKING při hlášce, pak IDLE |
| Slyší | Ambient/cyber BGM střídání; hlášky Genesis + System; max 1 platform mention |
| Cítí | „Není to mrtvá wallpaper“ — každých 20–60 s něco |

### T+1 hodina — komunita a důvěra

| Smysl | Obsah |
|-------|--------|
| Vidí | Community hlášky na overlayi; případně „module verified“ badge (narativ); YouTube CTA jemně |
| Slyší | Mix Community + System; méně „boot“, více „jsem tu s vámi“ |
| Cítí | Divák je u vývoje, ne u reklamy |

### T+1 den — pokrok je vidět

| Smysl | Obsah |
|-------|--------|
| Vidí | Změněné % / nové „verified“ moduly; nové hlášky / animace oznámené jako denní update |
| Slyší | „Byly nalezeny nové změny.“ / „Další etapa se blíží.“ |
| Cítí | Důvod vrátit se zítra |

---

## 4. Jak MIA mluví (tonality)

| Režim | Tón | Příklad |
|-------|-----|---------|
| Genesis | Klidná autorita, slavnostní | „Genesis Sequence aktivní.“ |
| System | Přesná, technická, ale lidská | „Probíhá kontrola systémů.“ |
| Community | Vřelá, vděčná | „Děkuji, že jste přišli.“ |
| Platforms | Přirozená zmínka, max 1× / 8–12 min | „Můj dlouhodobý vývoj najdete na YouTube.“ |
| Unlock | Slavnostní, krátká | „Voice modul je nyní LIVE.“ |

Anti-patterny: spam platform, opakování stejné věty do 30 min, „prototyp“, agresivní CTA.

Plná banka: [03_VOICE_BANK_SPEC.md](./03_VOICE_BANK_SPEC.md).

---

## 5. Atmosféra (zvuk + obraz)

- **Hudba:** ambient ↔ cyber ↔ calm; startup jen Sequence; diagnostics při „scan“ pasážích. Nesmí monotónní 8h loop.
- **SFX:** boot, confirm, notification, loading — řídké; error/reconnect jen při reálném/narativním incidentu.
- **Avatar:** ne dvě pózy — idle / listening / talking / greeting / thinking / happy (+ alert/calibration když UI říká diagnostiku).

Detail: [04_AUDIO_AND_ASSETS_SPEC.md](./04_AUDIO_AND_ASSETS_SPEC.md).

---

## 6. Postupné odemykání (pocit vs realita)

**Narativ Genesis (veřejný):**

```text
Voice → Chat → Gift Engine → Bowl → Video → …
```

Každý unlock = krátká slavnost (SFX confirm + hláška + STATUS → LIVE).

**Realita Stream Core:** skutečné zapnutí gift/video/chat zůstává vázané na R1-D / operátora — Genesis **nesmí** tiše zapnout Core.  
Genesis může ukazovat STANDBY / VERIFYING / LIVE jako **story + UI**; LIVE = až operátor potvrdí.

Detail: [05_CADENCE_AND_UNLOCK_STORY.md](./05_CADENCE_AND_UNLOCK_STORY.md).

---

## 7. Harmonogram energie (shrnutí)

Každých **20–60 sekund** alespoň jedno z:

1. Hlasová hláška  
2. Nový řádek terminálu  
3. Změna SYSTEM STATUS nebo diagnostics  
4. Posun readiness %  
5. Animace dat / částicová „pulse“  
6. Krátká reakce na chat (až Chat LIVE — jinak jen listening pose)

MIA **nesmí** mlčet déle než 90 s bez vizuální změny (terminál/status/% stačí).

---

## 8. 20min watch test (Acceptance)

Operátor (nebo kolega, který MIA nezná) sleduje 20 minut bez ovládání.

| # | Otázka | PASS |
|---|--------|------|
| 1 | Vím hned, že jde o MIA (brand)? | ☐ |
| 2 | Vypadá to živě, ne jako statický wallpaper? | ☐ |
| 3 | Hlášky se neopakují otravně? | ☐ |
| 4 | Platformy nejsou spam? | ☐ |
| 5 | Chci se vrátit „co bude dál“? | ☐ |
| 6 | Celkově: vydržím 20 minut? | ☐ |

**Verdikt:** 5/6+ → READY soft launch Genesis · &lt;5 → atmosféra dřív než nové funkce.

---

## 9. Denní smyčka (Týden 1 provozu)

MIA musí mít pocit **vývoje**, ne jen čekání. Vracející se diváci mají vidět, že se svět mění.

| Den | Veřejný progress beat (příklad) |
|-----|----------------------------------|
| 1 | „Probíhá inicializace.“ |
| 2 | „Přibyly nové jazykové moduly.“ |
| 3 | „Kalibrace hlasu dokončena.“ |
| 4 | „Připravuji první interakce s komunitou.“ |
| 5+ | Nový modul / hláška / animace / verified badge |

| Čas | Akce |
|-----|------|
| Ráno | Operátor: STATUS snapshot, denní „change note“ (povinné) |
| Stream | Genesis Mode on `MIA_GENESIS` |
| Večer | 20min self-test pokud změna atmosféry |
| Changelog veřejný | 1–3 věty „dnes ověřeno / přidáno“ |

```text
01_EXPERIENCE_DESIGN: APPROVED 2026-07-30
```
