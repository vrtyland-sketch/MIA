# MIA MASTER CANON — Dokument 0037

**Název:** Visual Rendering System – Renderovací systém MIA  
**Verze:** 1.0  
**Stav:** Platný dokument  
**Priorita:** Absolutně kritická (Visual Core)

**Nadřazené dokumenty:**

- [0035 – Speech Engine](./0035-speech-engine.md)
- [0036 – Animation Engine](./0036-animation-engine.md)
- [0029 – Action Orchestrator](./0029-action-orchestrator.md)

---

## 1. Účel dokumentu

Visual Rendering System je centrální grafický subsystém platformy MIA. Je odpovědný za vykreslení všech vizuálních prvků. Neobsahuje logiku — pouze převádí interní stav systému na výsledný obraz. Řídí MIA, Kojnožrouta, Battle, overlaye, OBS a budoucí Live2D i 3D.

---

## 2. Definice

Rendering znamená vytvoření finálního obrazu. Každý snímek vzniká až po dokončení Decision Engine, Emotion Engine, Animation Engine a Speech Engine. Renderer nikdy nerozhoduje — pouze vykresluje.

---

## 3. Architektura

```
VISUAL RENDERING SYSTEM
├── Render Manager
├── Scene Manager
├── Layer Renderer
├── Camera Manager
├── Overlay Renderer
├── Effect Renderer
├── Runtime Renderer
├── OBS Renderer
├── GPU Manager
├── Render Optimizer
├── Render Metrics
└── Render API
```

Každý modul řeší pouze vykreslování.

---

## 4. Hlavní princip

Každý obraz vzniká stejným způsobem:

```
Data → Animace → Renderer → GPU → OBS → Divák
```

Renderovací systém nikdy nemění vstupní data.

---

## 5. Render Manager

Spravuje celý renderovací proces — pořadí, FPS, vrstvy, synchronizaci a obnovování. Je hlavním koordinátorem renderingu.

---

## 6. Scene Manager

Každý obraz patří do jedné scény — Main Stream, Battle, Intro, Ending, Settings, Editor. Každá scéna má vlastní konfiguraci.

---

## 7. Layer Renderer

Scéna je rozdělena do vrstev: Background → Environment → MIA → Kojnožrout → Battle → Overlay → Particles → HUD. Každá vrstva je vykreslována samostatně.

---

## 8. Camera Manager

Spravuje pohled — zoom, posun, otáčení, přiblížení, více kamer. Současná MIA používá statickou kameru; architektura je připravena na budoucí rozšíření.

---

## 9. Overlay Renderer

Vykresluje HTML overlaye — Bowl, Chat, Speech, Gift, Battle. Každý overlay je samostatná renderovací jednotka.

---

## 10. Effect Renderer

Spravuje efekty — částice, světla, záře, kouř, konfety, Battle efekty a speciální animace. Efekty jsou odděleny od hlavních animací.

---

## 11. Runtime Renderer

Řídí běžící animace — PNG Runtime, PixiJS, HTML Canvas, WebGL. Je nezávislý na technologii.

---

## 12. OBS Renderer

Komunikuje přímo s OBS — viditelnost zdrojů, pořadí, aktivní scénu, transformace a efekty. Navazuje na OBS WebSocket.

---

## 13. GPU Manager

Řídí využití grafické karty — GPU Load, VRAM, Shader Cache, Texture Cache. Při přetížení snižuje náročnost renderingu.

---

## 14. Render Optimizer

Optimalizuje výkon — slučování vrstev, omezení překreslování, cache textur, vypnutí neviditelných objektů. Optimalizace nesmí změnit vizuální výsledek.

---

## 15. Render Metrics

Měří FPS, Frame Time, GPU Load, CPU Load, počet objektů, draw callů a využití VRAM. Monitoring využívá tyto informace.

---

## 16. Integrace s MIA

Visual Rendering System vykresluje MIA, Kojnožrouta, Bowl, Chat, Battle, Speech, Gift Moment, Runtime Editor a budoucí Live2D. Je jedinou renderovací vrstvou.

---

## 17. Integrace s Animation Engine

Animation Engine vytváří stav, Renderer jej vykresluje: Animation State → Renderer → Frame → OBS. Obě vrstvy jsou oddělené.

---

## 18. Podporované renderery

Architektura podporuje HTML, Canvas, PixiJS, WebGL, Live2D, Three.js, Unity a Unreal. Renderer lze měnit bez změny architektury.

---

## 19. Zakázané činnosti

Visual Rendering System nesmí měnit Decision Engine, Animation Engine, Emotion Engine, vytvářet vlastní logiku ani vykonávat AI. Je pouze zobrazovací vrstvou.

---

## 20. Kontrolní seznam implementace

- Existuje Render Manager
- Funguje Scene Manager
- Existuje Layer Renderer
- Funguje Overlay Renderer
- Existuje OBS Renderer
- Funguje GPU Manager
- Existuje Render Optimizer
- Fungují metriky
- Jsou oddělené vrstvy
- Přístup probíhá přes Render API

---

## 21. Vazba na současnou MIA

Visual Rendering System sjednotí HTML overlaye, Bowl, Speech, Chat, Gift, Battle, PNG Runtime, PixiJS Runtime, grafický editor a budoucí Live2D. Vznikne jednotný grafický systém.

---

## 22. Budoucí evoluce

Renderer bude možné rozšířit o ray tracing, 3D scénu, více monitorů, VR, AR, AI generované efekty, procedurální prostředí a filmové efekty. Architektura zůstane stejná.

---

## 23. Standard renderovací pipeline

Každý snímek platformy vzniká podle pipeline:

```
Decision Engine → Emotion Engine → Animation Engine → Speech Sync
→ Scene Manager → Layer Renderer → Effects → GPU → OBS → Stream
```

Každý krok musí být dokončen před vykreslením výsledného snímku.

---

## 24. Poznámka architekta

Visual Rendering System je obraz MIA. Animation Engine je pohyb, Speech Engine hlas — Renderer je plátno, na kterém se vše spojí. Oddělení logiky od vykreslování umožní měnit grafickou technologii bez zásahu do zbytku platformy.

Dokument **0038** bude věnován **OBS Integration Layer** — specializované vrstvě pro komunikaci s OBS Studio.
