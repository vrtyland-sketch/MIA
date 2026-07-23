# MIA Remote Dev Mode

Cíl: z telefonu (Android) diktovat úkoly, které MIA připraví pro **Cursor na domácím PC**.

Toto **není** plná vzdálená plocha (na to RustDesk/AnyDesk).  
Je to vrstva: **hlas/text → MIA fronta → prompt pro Cursor**.

---

## Tok

```
Telefon (mia-remote-dev.html)
   │  Web Speech / diktování / text
   ▼
MIA API  POST /mia/remote/dev/command   (admin token)
   │
   ├─ run_tests / status     → MIA provede lokálně (npm test, snapshot)
   └─ cursor_task            → data/remote-dev/LATEST_PROMPT.md + inbox.jsonl
                                    │
                                    ▼
                         npm run remote:dev-watch   (na PC)
                                    │  toast + otevře prompt v Cursoru
                                    ▼
                         Cursor Agent — potvrdíš a necháš pracovat
```

Volitelně: RustDesk na plochu PC, když potřebuješ vidět diffy.

---

## Mobil

1. Domácí PC: běží `npm start` (MIA) + Cursor + **`npm run remote:dev-watch`**.
2. Telefon na stejné síti / Tailscale: otevři  
   - `http://<pc>:3000/mia-fold-dev` (token v URL), nebo  
   - z dálkového ovládání tlačítko **Programovat**.
3. Drž 🎤, diktuj, pusť — úkol se odešle.
4. Watcher dá Windows toast a otevře `LATEST_PROMPT.md` v Cursoru.
5. V Cursor Agent chatu potvrď / vlož obsah promptu a nech agenta pracovat.

Env (volitelné):

| Proměnná | Význam |
|----------|--------|
| `MIA_REMOTE_DEV_POLL_MS` | interval poll (default 2000) |
| `MIA_REMOTE_DEV_OPEN=0` | nevytvářet okno s promptem |
| `MIA_REMOTE_DEV_TOAST=0` | vypnout balloon toast |
| `CURSOR_PATH` | cesta k `Cursor.exe` |

---

## API (localAdminGuard)

| Metoda | Cesta | Účel |
|--------|--------|------|
| GET | `/mia/remote/dev/status` | fronta, poslední job |
| GET | `/mia/remote/dev/jobs` | seznam jobů |
| POST | `/mia/remote/dev/command` | `{ text, source }` |

Klasifikace textu:

- „spusť testy gift mapy“ → `npm run test:gift-map`
- „preflight“ → `npm run test:preflight:fast`
- „stav gift mapy“ → snapshot do výsledku jobu
- jinak → `cursor_task` (čeká na Cursor)

---

## Soubory

| Cesta | Role |
|--------|------|
| `scripts/MIA_REMOTE_DEV.js` | fronta, klasifikace, lokální běh |
| `mia-output-overlay/mia-remote-dev.html` | mobilní UI |
| `data/remote-dev/LATEST_PROMPT.md` | aktuální prompt pro Cursor |
| `data/remote-dev/inbox.jsonl` | historie úkolů |
| `data/remote-dev/state.json` | stav jobů |

---

## Budoucnost (ne teď)

- Automatický Cursor Agent runner (SDK / CLI) bez ručního otevření promptu
- Hlasová odpověď MIA se shrnutím
- Náhled plochy v MIA app
- Orchestrace více AI nástrojů

Stream Mode a Remote Dev jsou oddělené: Remote Dev je **dev/asistentská** vrstva, ne live gift pipeline.
