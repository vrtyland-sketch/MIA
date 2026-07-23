# MIA Checkpoint — 2026-06-23

Audit před dalším laděním. Všechny kontroly prošly.

## Audit výsledky

| Kontrola | Výsledek |
|----------|----------|
| `npm run audit:canon` | **16/16 OK** |
| `preflight` (full v canon) | **43/43 OK** |
| `preflight --fast` | **16/16 OK** |
| `obs:stream-ready --human` | **100 % připraveno** |
| OBS kontroly | 53/53 |
| Browser overlaye | 13/13 |
| Koj assets `inspectKojnozoutAssets` | **ok: true** |
| Vision | běží · platform **tiktok** · canvas **1280×720** |

## Co je hotové (tato session)

### OBS / TikTok layout
- `MIA_STREAM_PLATFORM=tiktok`
- Vision auto-layout zapnutý (`MIA_OBS_LAYOUT_LOCKED=false`)
- Portrait-safe zóny + `tiktok-viewer-zones.css` v overlay HTML
- Browser zdroje: speech strip 1080×400, Koj 520×640, miska 300×220

### Gift video (profesionální chování)
- Video se škáluje do středu (`MIA_OBS_MUTATE_VIDEO_LAYOUT=true`)
- Koj PNG **zůstává na místě** (neposouvá se do rohu)
- Miska/chat se při videu skryjí
- Koj reaguje na délku videa: watch → groove → dance → party
- Smutný Koj **při videu tančí** (přebije sad affliction jen během videa)

### PNG assety Kojnožrout
- Procedurální „mlhovina“ odstraněna
- `npm run generate:koj-moods` = **kopie z kanonické fialové grafiky**
- Mapování: dance←excited, party←laugh, groove←happy, watch←warm, …

## Aktuální `.env` (bez tajemství)

```
MIA_STREAM_PLATFORM=tiktok
MIA_OBS_LAYOUT_LOCKED=false
MIA_OBS_MUTATE_VIDEO_LAYOUT=true
MIA_OBS_VOICE_MONITOR=and_output
```

## Ověření po restartu

```powershell
npm run restart
npm run audit:canon
npm run obs:stream-ready -- --human
npm run generate:koj-moods
```

Test v OBS:
- `http://127.0.0.1:3000/video/test?tier=T3`
- Refresh browser source `KOJNOZROUT_RUNTIME`

## Známý stav / poznámky

- OBS canvas: **1280×720** (pro plný TikTok vertical na telefonu ideální **1080×1920** + `npm run obs:fix-layout`)
- Koj může být v engine stále `affliction: sad` — po videu se vrátí smutný, dokud diváci nepotěší
- Git v tomto prostředí není v PATH — checkpoint je tento soubor (ne commit)

## Další ladění (backlog)

- [ ] Vizuál HTML/CSS (bubble, miska, badge)
- [ ] Vlastní PNG pózy pro dance/party do `moods/_raw/`
- [ ] OBS canvas 1080×1920 pokud TikTok Studio vyžaduje portrait
- [ ] Doladit timing/animace Koje při videu
- [ ] Vision AI (LLM analýza screenshotů) — backlog

---
*Vygenerováno po audit:canon 2026-06-23T16:34:40Z*
