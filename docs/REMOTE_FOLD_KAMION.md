# MIA + Cursor z Foldu na mobilních datech (kamion)

Notebook **doma**, ty **v kamionu** — potřebuješ dvě věci:

| Co | Jak | K čemu |
|---|---|---|
| **Celý notebook + Cursor** | Chrome Remote Desktop | Psát, diktovat, programovat v Cursoru |
| **MIA (stream, overlaye, testy)** | Tailscale + `/mia-fold` | Ovládat MIA bez celé plochy |

> **Cursor na Androidu neexistuje.** Na Foldu vidíš domácí obrazovku notebooku přes vzdálenou plochu.

---

## Krok 1 — Tailscale (VPN domů, zdarma)

Propojí Fold a notebook — jako bys byl na domácí Wi-Fi, i na mobilních datech.

### Na notebooku (doma, jednou)

```powershell
npm run remote:install-tailscale
```

Nebo ručně: https://tailscale.com/download → Windows → přihlas se (Google/Apple).

Po instalaci:
```powershell
tailscale ip -4
```
→ dostaneš IP typu `100.x.y.z` — tu si ulož.

### Na Foldu (Chrome / Play Store)

1. **Tailscale** app z Play Store → přihlas **stejný účet** jako na notebooku
2. Zapni VPN (zelená)

### MIA z kamionu

```
http://100.x.y.z:3000/mia-fold
```

(IP z `tailscale ip -4` na notebooku — ne `192.168.…`, ta funguje jen doma.)

Ověření:
```powershell
npm run remote:check
```

---

## Krok 2 — Chrome Remote Desktop (Cursor na Foldu)

Plná plocha notebooku v telefonu — včetně Cursoru.

### Notebook (doma, jednou)

1. Chrome → https://remotedesktop.google.com/access
2. **Set up Remote Access** → stáhni hostitele → pojmenuj „MIA-DOMOV"
3. Nastav **PIN** (6+ číslic) — ulož do `secrets/local/CREDENTIALS.md`
4. Notebook **nesmí usínat** když chceš pracovat:
   - Nastavení → Systém → Napájení → **Nikdy** uspávat při napájení ze sítě
   - Volitelně: BIOS Wake-on-LAN (pokud notebook zůstane zapnutý, stačí)

### Fold (v kamionu)

1. Play Store → **Chrome Remote Desktop**
2. Přihlas **stejný Google účet**
3. Klepni na **MIA-DOMOV** → PIN → vidíš celou plochu
4. Otevři **Cursor** na vzdálené ploše

### Diktování hlasem v Cursoru

Ve vzdálené relaci:
- Android **klávesnice → mikrofon** (Gboard) → mluvíš → text jde do Cursor chatu
- Nebo v Cursor chatu: diktuj úkoly jako teď píšeš mně

---

## Krok 3 — Telegram (rychlé příkazy bez Cursoru)

Když řídíš a nechceš celou plochu — krátké věci pro MIA:

1. Telegram → @BotFather → `/newbot` → token
2. Do `.env`:
   ```
   MIA_TELEGRAM_ENABLED=1
   MIA_TELEGRAM_BOT_TOKEN=...
   MIA_TELEGRAM_ALLOWED_USER_IDS=TVÉ_ID
   ```
3. `npm run restart`
4. Botovi napiš: `mia restart`, `mia status`, `mia řekni ahoj`

Tvé Telegram user ID: napiš botovi @userinfobot → `/start`

---

## Bezpečnost

- **Tailscale** = jen tvoje zařízení, ne celý internet
- **Chrome RD** = Google účet + PIN
- **MIA token** = v `/mia-fold`, nesdílej mimo sebe
- Notebook doma: **zamkni obrazovku** když nejsi u něj (CRD jde i tak, ale PIN chrání)

---

## Rychlý checklist před odjezdem kamionem

- [ ] Tailscale běží na notebooku i Foldu (stejný účet)
- [ ] `npm run remote:check` → OK
- [ ] Chrome Remote Desktop hostitel běží, PIN vyzkoušen z Foldu
- [ ] Notebook napájen ze sítě, neusíná
- [ ] MIA běží: `npm run restart` nebo služba
- [ ] Odkaz v `secrets/local/FOLD_OTEVRI_TOTO.txt` aktualizován (`npm run setup:secrets`)

---

## Řešení problémů

| Problém | Řešení |
|---|---|
| MIA nejde z kamionu | Tailscale zapnutý na obou? Zkus `100.x.y.z` ne `192.168` |
| CRD nevidí PC | Notebook online? Hostitel běží? Stejný Google účet? |
| Pomalé na datech | CRD → kvalita → **Adaptivní** nebo **Rychlost** |
| MIA spadla doma | Telegram bot / někdo doma restartuje; nebo CRD → `npm run restart` |
