# ChatGPT export → MIA kánon

Data z **ChatGPT aplikace v telefonu** ani přes Chrome **nepřečteme přímo** (sandbox, přihlášení, ochrana účtu). Oficiální cesta je **Export data** — dostaneš ZIP se **všemi** konverzacemi včetně projektů.

## Postup pro každý účet (2×)

1. V Chrome na Foldu / PC otevři **https://chatgpt.com**
2. Přihlas se k **účtu 1**
3. **Settings** (profil vlevo dole) → **Data controls** → **Export data** → Confirm
4. Počkej na e-mail s odkazem → stáhni **ZIP**
5. Rozbal ZIP — uvnitř je `conversations.json`
6. Zkopíruj sem:
   ```
   imports/chatgpt/account1/conversations.json
   ```
7. Odhlaš se, přihlas se k **účtu 2**, opakuj →
   ```
   imports/chatgpt/account2/conversations.json
   ```

Alternativa: celý ZIP hoď do `imports/chatgpt/account1/export.zip` — importer ho sám rozbalí.

## Import do kánonu

```powershell
npm run chatgpt:import
```

Vytvoří:
- `docs/KANON_MIA_CHATGPT_EXTRACT.md` — vytažené konverzace k projektu MIA
- `generated/chatgpt/import-report.json` — statistiky

## Co importer hledá

Klíčová slova: `MIA`, `Kojnožrout`, `OBS`, `TikTok`, `overlay`, `stream`, `gift`, …  
Projekty v exportu (pokud jsou v metadatech) se přiřadí k souboru.

## Dálkové ovládání MIA z Foldu

Po nastavení LAN (viz `.env` → `MIA_BIND_HOST=0.0.0.0`):

1. Fold musí být na **stejné Wi-Fi** jako notebook
2. V Chrome na Foldu otevři:
   ```
   http://192.168.1.189:3000/mia-remote.html
   ```
   (IP se může změnit — na notebooku: `ipconfig` → IPv4)
3. Vlož **token** z `.env` (`MIA_INGEST_SECRET`) → Uložit
4. Ovládáš MIA, dárky, combo, TTS, display check

**Firewall:** pokud se Fold nepřipojí, spusť v PowerShell **jako admin**:
```powershell
New-NetFirewallRule -DisplayName "MIA Remote 3000 (LAN)" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 3000 -RemoteAddress LocalSubnet -Profile Private
```
