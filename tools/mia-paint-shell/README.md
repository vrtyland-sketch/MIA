# MIA Paint Shell (Phase 7 + 10)

Nativní obal pro MIA Paint — spustí MIA server a otevře editor v app okně.

## Rychlý start (Windows)

```powershell
npm start
# v jiném terminálu — Tauri (doporučeno, Phase 10):
npm run paint:tauri
# nebo Edge/Chrome app mode:
npm run paint:shell
```

## URL

- `http://127.0.0.1:3000/mia-paint/shell.html` — Edge shell + shared bridge
- `http://127.0.0.1:3000/mia-paint/?shell=1` — přímo v prohlížeči
- `http://127.0.0.1:3000/mia-paint/?shell=1&native=tauri` — Tauri iframe

## Native capabilities

| Capability | Browser | Shell | Tauri |
|------------|---------|-------|-------|
| filesystem (server projects) | ✅ | ✅ | ✅ |
| Windows Ink (tlak pera) | částečně | ✅ | ✅ |
| nativní Open/Save | download | ❌ | ✅ |
| offline shell | ❌ | ✅ | ✅ |

Tauri detail: `tools/mia-paint-tauri/README.md`

## Pluginy

Oficiální pluginy v `plugins/mia-paint/`:
- `grid-overlay` — jemná mřížka
- `koj-factory-export` — export hint pro Koj pipeline

Manifest + whitelist v `scripts/MIA_PAINT_PLUGIN_LOADER.js`.
