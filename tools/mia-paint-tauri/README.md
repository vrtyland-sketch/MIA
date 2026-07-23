# MIA Paint — Tauri 2 (Phase 10)

Nativní Windows obal s **Windows Ink** (Pointer Events + tlak pera), nativními dialogy a stejným `MIA_PAINT_NATIVE` API jako `shell.html`.

## Požadavky

1. **MIA server** — `npm start` v kořeni `C:\MIA`
2. **Rust** — [rustup.rs](https://rustup.rs/) (`rustc` + `cargo`)
3. **WebView2** — na Windows 11 obvykle předinstalovaný

## Rychlý start

```powershell
# terminál 1
npm start

# terminál 2
npm run paint:tauri
```

Launcher zkontroluje MIA server a Rust toolchain:
- **Rust OK** → `tauri dev` (nativní okno)
- **Rust chybí** → fallback na Edge/Chrome app mode (`paint:shell`)

## Příkazy

| Příkaz | Popis |
|--------|--------|
| `npm run paint:tauri` | Spustí Tauri dev nebo fallback shell |
| `npm run paint:shell` | Edge/Chrome app mode (Phase 7) |
| `cd tools/mia-paint-tauri && npm run build` | Release build (vyžaduje ikony — viz níže) |

## Native API

| Capability | Browser | Shell | Tauri |
|------------|---------|-------|-------|
| Tlak pera (Ink) | částečně | ✅ | ✅ |
| Nativní Open/Save | download | 🟡 | ✅ |
| Offline shell | ❌ | ✅ | ✅ |

Editor URL: `http://127.0.0.1:3000/mia-paint/?shell=1&native=tauri`

## Release build

```powershell
npm run paint:tauri:icons    # vygeneruje ikony (sharp)
cd tools/mia-paint-tauri
npm install
npm run build                # .exe installer v src-tauri/target/release/bundle/
```

Vyžaduje Rust + WebView2. Ikony: `src-tauri/icons/`.

## Architektura

```
tools/mia-paint-tauri/ui/shell.html  → iframe → MIA Paint
         ↓ postMessage
mia-paint-native-shell.js            → Tauri invoke (dialog, fs)
         ↓
src-tauri/src/lib.rs                 → pick_open/save, read/write bytes
```

Stejný bridge modul: `mia-output-overlay/mia-paint/lib/mia-paint-native-shell.js`
