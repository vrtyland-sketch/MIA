# MIA MASTER CANON — Dokument 0038

**Název:** OBS Integration Layer – Integrační vrstva OBS Studio  
**Verze:** 1.0  
**Stav:** Platný dokument  
**Priorita:** Absolutně kritická (Streaming Core)

**Nadřazené dokumenty:**

- [0029 – Action Orchestrator](./0029-action-orchestrator.md)
- [0036 – Animation Engine](./0036-animation-engine.md)
- [0037 – Visual Rendering System](./0037-visual-rendering-system.md)

---

## 1. Účel dokumentu

OBS Integration Layer je specializovaná vrstva zajišťující komunikaci mezi platformou MIA a OBS Studio. Je odpovědná za správu scén, zdrojů, videí, synchronizaci overlayů, Battle scén, komunikaci přes OBS WebSocket, obnovu spojení a monitoring stavu OBS. OBS je výstupní zobrazovací systém — veškerá logika zůstává uvnitř MIA.

---

## 2. Definice

OBS Integration Layer funguje jako překladač mezi interním světem MIA a OBS:

```
Decision → Action → OBS Layer → OBS Studio → Stream
```

OBS nikdy nerozhoduje — pouze vykonává příkazy.

---

## 3. Architektura

```
OBS INTEGRATION LAYER
├── OBS Connection Manager
├── WebSocket Client
├── Scene Manager
├── Source Manager
├── Media Manager
├── Overlay Manager
├── Filter Manager
├── Transform Manager
├── Event Listener
├── Recovery Manager
├── OBS Metrics
└── OBS API
```

Každý modul řeší jednu oblast.

---

## 4. Hlavní princip

Každá změna v OBS vzniká pouze přes OBS Layer:

```
Decision Engine → Action Orchestrator → OBS Integration Layer → OBS WebSocket → OBS Studio
```

Přímé ovládání OBS z jiných modulů je zakázáno.

---

## 5. OBS Connection Manager

Řídí spojení s OBS — IP, port, autentizaci, stav spojení, heartbeat a reconnect. Používá WebSocket 5.x.

---

## 6. WebSocket Client

Zajišťuje komunikaci — Request, Response, Event, Batch Request. Komunikace je plně asynchronní.

---

## 7. Scene Manager

Spravuje OBS scény — MAIN, STARTING, ENDING, BATTLE, SETTINGS. Každá scéna má vlastní SceneID.

---

## 8. Source Manager

Řídí zdroje — MIA, Kojnožrout, Bowl, Chat, Speech, Kamera, Video, GIF. Každý zdroj má vlastní SourceID.

---

## 9. Media Manager

Řídí média T1_VIDEO_01–04, T2_VIDEO_05–08, T3_VIDEO_09–12, T4_VIDEO_13–15. Podporuje Play, Stop, Pause, Restart a Loop.

---

## 10. Overlay Manager

Řídí HTML overlaye — Bowl, Chat, Speech, Gift, Battle, Kojnožrout Runtime. Každý overlay funguje nezávisle.

---

## 11. Filter Manager

Řídí OBS filtry — Blur, Color Correction, Chroma Key, Crop, Glow, Shadow. Filtry mohou být měněny za běhu.

---

## 12. Transform Manager

Spravuje pozici, velikost, otočení, průhlednost a zrcadlení. Všechny transformace jsou animovatelné.

---

## 13. Event Listener

Naslouchá událostem OBS — změna scény, konec videa, odpojení, chyba média, změna zdroje. Události jsou předávány do Event Busu MIA.

---

## 14. Recovery Manager

Při výpadku: Výpadek → Reconnect → Kontrola scén → Obnovení overlayů → Synchronizace. Po obnovení musí být stav MIA i OBS identický.

---

## 15. OBS Metrics

Sleduje Connected, FPS, Dropped Frames, CPU, Render Time, Active Scene a Active Sources. Monitoring využívá tato data.

---

## 16. Integrace s MIA

OBS Layer komunikuje s Action Orchestrator, Animation Engine, Speech Engine, Overlay Engine, Battle Engine, Bowl Engine a Monitoring. Je jedinou vstupní branou do OBS.

---

## 17. Integrace s Battle

Battle: Battle Start → Battle Overlay → Battle Video → Battle Speech → Battle Runtime → Battle End. Celý Battle je řízen přes OBS Layer.

---

## 18. Integrace se současnou MIA

Architektura počítá s existujícími videi T1–T4, overlayi (BOWL, CHAT, MIA_BUBBLE, KOJNOZROUT_BUBBLE, GIFT_MOMENT, KOJNOZROUT_RUNTIME) a body vrstvami MIA_HEAD, MIA_EYES, MIA_HANDS, MIA_FEET.

---

## 19. Zakázané činnosti

OBS Layer nesmí rozhodovat o Battle, měnit ekonomiku, Memory, generovat AI odpovědi ani měnit Personality. Je pouze komunikační vrstvou.

---

## 20. Kontrolní seznam implementace

- Existuje OBS Connection Manager
- Funguje WebSocket
- Existuje Scene Manager
- Funguje Source Manager
- Existuje Media Manager
- Funguje Overlay Manager
- Existuje Recovery Manager
- Události jdou do Event Busu
- Funguje Monitoring
- Přístup pouze přes OBS API

---

## 21. Budoucí rozšíření

OBS Layer bude podporovat více OBS instancí, vzdálené OBS, cloudové OBS, automatické přepínání kamer, virtuální kamery, více streamů, NDI, SDI a profesionální broadcast systémy.

---

## 22. Standard životního cyklu spojení

Každé spojení prochází: Inicializace → Handshake → Autentizace → Synchronizace → Aktivní provoz → Heartbeat → Odpojení → Reconnect → Obnovení stavu. Žádný krok nesmí být přeskočen.

---

## 23. Poznámka architekta

OBS Integration Layer je most mezi inteligencí MIA a obrazem, který vidí diváci. Veškerá komunikace s OBS je soustředěna do jediné vrstvy — díky tomu lze přidat další výstupní systémy bez změny Decision Engine, Animation Engine ani ostatních částí architektury.

Dokument **0039** bude věnován **Battle Engine** — kompletní architektuře Battle systému.
