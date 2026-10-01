# OBS — Dual Scene Architecture (Genesis ↔ Stream Test)

**Izolace:** Genesis **nepoužívá** Stream Core runtime. Žádná změna `index.js` / produkčního live manifestu.

```text
OBS
├── MIA_GENESIS          ← VEŘEJNÁ (diváci)
│     GENESIS_FX / GENESIS_OVERLAY / GENESIS_COMMUNITY
│
└── MIA_STREAM_TEST      ← NEVEŘEJNÁ (operátor)
      TEST_* Core overlaye
```

---

## Rychlé sestavení (doporučeno pro 1. spuštění)

OBS musí běžet s WebSocket (default `ws://127.0.0.1:4455`, heslo z `.env`).

```text
node scripts/mia_genesis_obs_setup.js --set-program
```

Výsledek (ověřeno 2026-07-30): scény vytvořeny, Program = `MIA_GENESIS`, kontaminace Core na Genesis = žádná.

Opakované spuštění je idempotentní (existující scény/sources jen přenastaví URL).

Pak:
1. Spusť MIA server (`:3000`), ať Browser Sources načtou HTML.  
2. Otevři Operator: `http://127.0.0.1:3000/genesis-operator.html`  
3. Vyplň [OBS_DUAL_SCENE_VERIFICATION.md](./OBS_DUAL_SCENE_VERIFICATION.md)

**Plný OBS Controller** (obecné API) = Post-Launch Idea — ne součást Genesis v1.

---

## Scéna 1 — `MIA_GENESIS` (veřejná)

Browser Sources 1920×1080:

| Z | URL | Účel |
|---|-----|------|
| 1 | `http://127.0.0.1:3000/genesis-fx.html` | pozadí / částice |
| 2 | `http://127.0.0.1:3000/genesis-overlay.html` | HUD + avatar + unlock |
| 3 | `http://127.0.0.1:3000/genesis-community.html` | YouTube + platforms |

**Nesmí obsahovat:** gift media, Core speech/chat/bowl browser sources.

---

## Scéna 2 — `MIA_STREAM_TEST` (interní)

Kopie / sada produkčních overlayů pro ověřování (stejný MIA server, **ne** ve stream výstupu):

| Modul | Typický URL (příklad) |
|-------|------------------------|
| Voice / hero | `…/speech-overlay.html` · `…/mia-voice-overlay.html` |
| Chat | `…/chat-overlay.html` |
| Gift FX | `…/gift-animation-overlay.html` · combo |
| Bowl / Koj | `…/kojnozrout-bowl-overlay.html` · runtime |
| Video | OBS media source dle Core (neveřejný) |

Postup:

```text
Na MIA_STREAM_TEST ověř modul → PASS
  → Operator Mode → ENABLE
    → Genesis veřejně odemkne + oznámí
```

---

## Operator Mode (2. monitor)

URL: `http://127.0.0.1:3000/genesis-operator.html`

```text
VOICE        🟢 / 🟡 TEST / 🔴 OFF
GIFTS        …
BOWL         …
VIDEO        …
CHAT         …
OVERLAY      …
GENESIS      LIVE
```

- **TEST** — ověřuješ na `MIA_STREAM_TEST`  
- **ENABLE → GENESIS** — odemkne na veřejné scéně bez restartu (BroadcastChannel)  
- Oznámení např.: *„Hlasový modul úspěšně prošel ověřením.“* / *„Nový modul byl úspěšně aktivován…“*

Soubory: `assets/genesis/genesis-bus.js`, `genesis-operator.html`, `genesis-runtime.js`.

---

## Module Unlock (bez restartu scény)

1. Operátor na TEST scéně ověří modul.  
2. V Operator Mode: ENABLE.  
3. Bus → veřejný overlay → VERIFYING → LIVE + hláška + Public Modules panel.  
4. Stream Core se **nezapíná** do veřejného výstupu — jen Genesis narativ / UI stav.

Skutečné napojení Core gift/video do veřejného canvas = až po R1-D / výslovném GO (mimo tento mechanismus).

---

## Isolace (checklist)

| Položka | Stav |
|---------|------|
| `index.js` | beze změny |
| `MIA_OBS_LIVE_MANIFEST.js` | beze změny |
| Gift / video / voice Core queues | beze změny |
| Genesis = samostatné HTML | ano |
| Veřejný program = jen `MIA_GENESIS` | operátor v OBS |

Viz také `CORE_ISOLATION_AUDIT.md`.
