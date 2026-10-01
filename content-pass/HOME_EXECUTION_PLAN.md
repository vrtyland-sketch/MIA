# HOME EXECUTION PLAN — kuchařka na 30–45 min doma

**Status:** OPERATIONS · 2026-08-13 · Feature freeze ON  
**Zdroje (hotové audity — nic dalšího neauditovat):**

- [`OBS_STATIC_AUDIT.md`](./OBS_STATIC_AUDIT.md)
- [`TIKFINITY_STATIC_AUDIT.md`](./TIKFINITY_STATIC_AUDIT.md)
- [`STARTUP_PC3_INDEPENDENCE_AUDIT.md`](./STARTUP_PC3_INDEPENDENCE_AUDIT.md)

**Pravidlo:** Žádný nový kód. Žádný refactor. Jen ověření a **env/OBS/TikFinity GUI** kde audit říká.

---

## HOME SESSION — live stav (2026-08-13 večer)

**Fáze A (LAN): UZAVŘENA ✅** · **Aktivní priorita: REMOTE DEV GATE (Fáze B→C→D)** — před migrací MIA

### Fyzická topologie (potvrzeno)

| Switch port | Stroj | Role | Ethernet IPv4 | Stav |
|-------------|-------|------|---------------|------|
| **1** | PC3 notebook `LAPTOP-0K9HIOHE` | DEV | `192.168.137.30` /24 | **PASS** |
| **2** | **PC1 STREAM** | OBS + TikFinity | `192.168.137.1` /24 | **PASS** |
| **switch** | **PC2 MIA** | MIA runtime | **`192.168.137.20`** | **PASS** |

### Ping matice — **6/6 PASS** (foto + PC3 verify)

| Cesta | Výsledek |
|-------|----------|
| PC1 `.1` → PC2 `.20` | **PASS** 4/4 |
| PC2 `.20` → PC1 `.1` | **PASS** 4/4 |
| PC3 `.30` → PC1 `.1` | **PASS** 4/4 |
| PC3 `.30` → PC2 `.20` | **PASS** 4/4 |
| PC1 `.1` → PC3 `.30` | **PASS** |
| PC2 `.20` → PC3 `.30` | **PASS** |

### PC1 STREAM — potvrzeno (nic neměnit na síti)

- Ethernet do switche **port 2**, IPv4 **`192.168.137.1`**, maska **`255.255.255.0`**, **bez gateway** na Ethernetu ✅
- Wi‑Fi **`192.168.1.198`**, gateway **`192.168.1.1`** — internet, **nemíchat** s MIA LAN `137.x`
- ARP z PC3: `.1` → MAC `ac-22-0b-89-e5-b3`

### PC3 notebook — reference

- MIA LAN: **Ethernet 2** (Realtek USB GbE) → `192.168.137.30`
- Tailscale: **`100.93.161.52`** (`vrtyland@`, online)
- Wi‑Fi: internet only — **nemíchat** s `137.x`

### HOLD (platí)

- Na **PC1 nic neměnit** (IP, gateway, Wi‑Fi) — jen REMOTE DEV GATE software (Tailscale/SSH/RustDesk)
- **Archer VR300** zatím mimo hru
- **Migrace MIA** (kroky 2–12 níže) **až po REMOTE DEV GATE PASS** — nebo na dálku z kamionu po GATE

---

## REMOTE DEV GATE — vývoj MIA odkudkoliv

**Priorita před migrací MIA.** Cíl: notebook může odjet → PC1 + PC2 zůstanou doma → Cursor/MIA vývoj pokračuje z kamionu.

### Tvrdá podmínka PASS

> **REMOTE DEV GATE = PASS pouze tehdy, když PC3 není na domácí síti a přesto z něj lze ovládat PC1 STREAM i PC2 MIA.**

Domácí LAN ping nebo RDP/SSH přes `192.168.137.x` **nestačí** pro finální PASS. Ten přichází až ve **Fázi C** (hotspot).

### Nástroje (ne RDP-only)

| Vrstva | Nástroj | Proč |
|--------|---------|------|
| **Síť** | **Tailscale** (stejný účet na PC1, PC2, PC3) | VPN domů bez port forwardu |
| **Terminál / Cursor** | **OpenSSH** + Cursor Remote SSH | Kód, `npm`, logy na PC2 |
| **Plná obrazovka** | **RustDesk** | OBS, TikFinity, Studio — **RDP na Windows Home často nejde** |

Reference: [`docs/MIA_MULTI_PC_SETUP.md`](../docs/MIA_MULTI_PC_SETUP.md) · skript [`scripts/home_remote_dev_gate_setup.ps1`](../scripts/home_remote_dev_gate_setup.ps1)

---

### Fáze A — LAN ✅ UZAVŘENA

| | Kritérium | Stav |
|---|-----------|------|
| **PASS** | Ping matice 6/6 (tabulka výše) | **PASS** |
| **FAIL** | Jakýkoli timeout na `137.x` | — |

**STOP:** dokud Fáze A není PASS → Fáze B **zakázána**. *(splněno 2026-08-13)*

---

### Fáze B — Vzdálené ovládání (PC1 + PC2)

**Kdo:** lokálně na **PC1** a **PC2** (Admin) · ověření z **PC3**

#### B1 — Setup na každém stroji (Admin PowerShell)

Repo na stroji (nebo zkopíruj skript):

```powershell
cd C:\MIA
powershell -ExecutionPolicy Bypass -File .\scripts\home_remote_dev_gate_setup.ps1 -Role Stream   # PC1
powershell -ExecutionPolicy Bypass -File .\scripts\home_remote_dev_gate_setup.ps1 -Role Mia      # PC2
```

Skript: Tailscale, OpenSSH (`sshd` auto), firewall SSH (Tailscale + `137.0/24`), u PC2 navíc port **3000**, návrh RustDesk.

#### B2 — Tailscale přihlášení

Na **PC1** i **PC2**: ikona Tailscale → **stejný účet** jako PC3 (`vrtyland@`).

Z **PC3**:

```powershell
tailscale status
```

Očekáváš **3 online** stroje (PC1, PC2, notebook).

#### B3 — RustDesk (GUI)

Na **PC1** i **PC2**: spusť RustDesk, zapiš **ID + permanent password** do tabulky níže (ne do gitu).

#### B4 — Ověření z PC3 (ještě na domácí síti — sanity, ne finální GATE)

| Test | Příkaz / akce | PASS |
|------|----------------|------|
| Tailscale vidí oba | `tailscale status` | PC1 + PC2 **online** |
| SSH → PC2 | `ssh <user>@<PC2-tailscale-ip>` | shell na PC2 |
| SSH → PC1 | `ssh <user>@<PC1-tailscale-ip>` | shell na PC1 |
| RustDesk → PC1 | připojení přes Tailscale ID | vidíš plochu OBS |
| RustDesk → PC2 | připojení | vidíš plochu PC2 |
| MIA health (až běží) | `curl http://<PC2-ts-ip>:3000/health` | HTTP 200 |

#### Tabulka — vyplnit po B2

| Stroj | Hostname | Tailscale IP | RustDesk ID | SSH user |
|-------|----------|--------------|-------------|----------|
| PC1 STREAM | | | | |
| PC2 MIA | | | | |
| PC3 DEV | `LAPTOP-0K9HIOHE` | `100.93.161.52` | — | *(klient)* |

| | Kritérium |
|---|-----------|
| **PASS** | Tailscale 3× online + SSH na PC1 i PC2 + RustDesk na oba |
| **FAIL** | Chybí stroj v tailnetu, SSH timeout, RustDesk nejde |

**STOP:** Fáze C **zakázána**, dokud Fáze B není PASS (aspoň na domácí Wi‑Fi přes Tailscale).

---

### Fáze C — Hotspot test (skutečný GATE)

**Kdo:** PC3 notebook · PC1 + PC2 **doma**, běží, **nesmí** záviset na PC3

#### Akce

1. **Odpoj PC3 od domácí sítě** — Wi‑Fi off, **Ethernet 2 (137.x) vytáhnout**
2. Zapni **hotspot telefonu** (mobilní data)
3. Připoj PC3 jen na hotspot
4. Ověř: `ipconfig` — **žádná** `192.168.137.x` ani domácí `192.168.1.x` na aktivní cestě k internetu
5. Tailscale: `tailscale status` → PC1 + PC2 stále **online**
6. **SSH** na PC1 i PC2 (Tailscale IP, ne LAN)
7. **RustDesk** na PC1 i PC2 — OBS/TikFinity ovládání
8. (Volitelně) `curl http://<PC2-ts-ip>:3000/health` — až MIA běží

| | Kritérium |
|---|-----------|
| **PASS** | PC3 **mimo domácí LAN** + SSH + RustDesk na **oba** domácí stroje |
| **FAIL** | Tailscale offline, SSH/RustDesk jen přes `137.x`, nebo PC1/PC2 nedostupné |

**Toto je jediný finální REMOTE DEV GATE PASS.**

---

### Fáze D — Deploy workflow (po Fázi C PASS)

Notebook může do kamionu. Minimální loop:

| Krok | Kde | Akce |
|------|-----|------|
| 1 | PC3 | Cursor + git commit/push (nebo pull na PC2) |
| 2 | PC3 → PC2 | `ssh pc2-mia "cd C:\MIA && git pull && npm run restart"` |
| 3 | PC3 | `curl http://<PC2-ts-ip>:3000/health` |
| 4 | PC3 | RustDesk → PC1 pokud potřebuješ OBS/TikFinity GUI |

**SSH config na PC3** (`~/.ssh/config`):

```sshconfig
Host pc1-stream
    HostName <PC1-tailscale-ip>
    User <windows-user>

Host pc2-mia
    HostName <PC2-tailscale-ip>
    User <windows-user>
```

Cursor: **Remote-SSH → pc2-mia** → složka `C:\MIA`.

| | Kritérium |
|---|-----------|
| **PASS** | Jedna testovací změna (nebo `git pull`) + restart MIA na PC2 **bez fyzické přítomnosti doma** |
| **FAIL** | Deploy jen funguje na LAN |

---

### REMOTE DEV GATE — verdikt

| Fáze | PASS | FAIL | NOT TESTED |
|------|:----:|:----:|:----------:|
| **A — LAN** | ☑ | ☐ | ☐ |
| **B — Setup (sanity)** | ☐ | ☐ | ☐ |
| **C — Hotspot (GATE)** | ☐ | ☐ | ☐ |
| **D — Deploy** | ☐ | ☐ | ☐ |

```text
REMOTE DEV GATE = GO  ⟺  C = PASS  (+ doporučeně B a D)
```

Po **C = PASS** → migrace MIA (kroky 2–12 níže) může pokračovat **odkudkoliv**.

---

## Tvrdá zásada

> **Neopravujeme tři chyby současně.**

Když selže vrstva N, **STOP** — neřeš vrstvu N+1, nesah na OBS/TikFinity/Rose, dokud N není PASS.

| Vrstva | Co testuje | Kdy STOP |
|--------|------------|----------|
| **0** | Backup + baseline | před jakoukoli změnou |
| **1** | SÍŤ | ping PC1↔PC2 |
| **2–3** | MIA HTTP | `/health` z PC1 |
| **4** | OBS WS | `obsConnected:true` |
| **5–6** | OBS OBRAZ | browser URL + Program architektura |
| **7** | TIKFINITY | webhook + Actions inventář |
| **8** | COMMENT | golden path |
| **9** | ROSE | golden path |
| **10** | PC3 PRYČ | notebook offline |
| **11** | RECOVERY | restart OBS / MIA |
| **12** | VERDICT | GO / NO GO |

**Příklad:** PC1 neotevře `http://<PC2>:3000/health` → **nesahat** na OBS scény, TikFinity Actions ani Rose. Dokud není síť + HTTP PASS, vše nad tím je irelevantní.

---

## Role strojů (cíl)

| Role | Co běží | Co **nesmí** běžet |
|------|---------|-------------------|
| **PC1 STREAM** | OBS, TikTok LIVE Studio, TikFinity UI, kamera | `node` / `npm start` / MIA runtime |
| **PC2 MIA** | `npm start`, ingest, TTS, overlay HTTP, logy | OBS Studio (kromě watchdog rizika — viz krok 2) |
| **PC3 NOTEBOOK** | Cursor, dev | **Žádná produkční závislost** — od kroku 10 odpojen |

**Plánované IP (doplň skutečné — nepředpokládat naslepo):**

| Stroj | Plánovaná IP | Skutečná IP (doma vyplnit) | Gateway / subnet |
|-------|--------------|----------------------------|------------------|
| PC1 STREAM | _______________ | _______________ | _______________ |
| PC2 MIA | _______________ | _______________ | _______________ |
| PC3 DEV | (volitelné) | _______________ | **nesmí být gateway** |

---

## FIRST 15 MINUTES AT HOME

> Otevři tento dokument. Jdi **pouze** kroky 0 → 1 → 2 → 3. Každý krok dokonči PASS/FAIL. Při FAIL — STOP, oprav **jen tu vrstvu**, znovu stejný krok.

| Min | Krok | Akce v jedné větě |
|-----|------|-------------------|
| 0–3 | **0** | Záloha OBS + zapsat IP a `.env` názvy (bez secrets) |
| 3–6 | **1** | `ping` PC1↔PC2, zapsat subnet — **ne** 192.168.137.x naslepo |
| 6–9 | **2** | PC2: ověř `.env` (bind, OBS WS, AUTO_LAUNCH=false, scene) |
| 9–12 | **3** | PC1: `curl http://<PC2>:3000/health` → HTTP 200 |
| 12–15 | **4** | Stejný health → `obsConnected: true` (OBS běží na PC1) |

**Po 15 min:** buď máš vrstvy 0–4 PASS a pokračuješ krokem 5, nebo STOP a řešíš jen to, co faillo.

---

## Krok 0 — SAFETY / BACKUP

**Vrstva:** 0  
**Kdo:** PC1 (OBS) + PC2 (`.env` snapshot)

### Akce

1. **OBS záloha** (PC1): File → Show Profile Folder **nebo** Export/Backup celé scene collection + profily. Zkopírovat složku na bezpečné místo (USB / PC2 disk / cloud).
2. **Zapsat baseline** do tabulky níže — **jen názvy proměnných a IP, žádné hesla/tokeny.**

| Položka | Hodnota (bez secrets) |
|---------|------------------------|
| PC1 hostname | *(doplnit z PC1)* |
| PC1 IPv4 Ethernet | **`192.168.137.1`** (switch port 2) ✅ |
| PC1 IPv4 Wi‑Fi | **`192.168.1.198`** / gw `192.168.1.1` (internet only) |
| PC2 hostname | *(čeká zapojení)* |
| PC2 IPv4 | cíl **`192.168.137.20`** |
| PC3 IPv4 Ethernet | **`192.168.137.30`** (switch port 1) ✅ |
| Subnet mask MIA LAN | **`255.255.255.0`** |
| Default gateway MIA LAN | **žádná** (správně na PC1 Ethernet) |
| PC2 `MIA_BIND_HOST` | |
| PC2 `OBS_WS_URL` | (host:port only) |
| PC2 `OBS_AUTO_LAUNCH` | |
| PC2 `OBS_SCENE_NAME` / `MIA_OBS_CAMERA_SCENE` | |
| PC2 `MIA_DUAL_VOICE` | |
| PC2 `MIA_INGEST_SECRET` | **SET / UNSET** (ne hodnota) |
| OBS Program scéna (teď) | |
| TikFinity webhook URL (teď) | |

3. **Nepouštět:** `mia_genesis_*`, `genesis:birth-prepare`, skripty co volají `SetCurrentProgramScene(MIA_GENESIS)`.

### Očekávaný výsledek

- Záloha OBS existuje a je pojmenovaná (datum).
- Baseline tabulka vyplněná.

### PASS / FAIL

| | Kritérium |
|---|-----------|
| **PASS** | Záloha hotová + baseline zapsaný |
| **FAIL** | Žádná záloha → **STOP celý plán** |

### Při FAIL

- Dokončit zálohu OBS. Bez ní **nepokračovat** ke kroku 1.

### STOP CONDITION

**STOP** — pokud není OBS backup. Žádné úpravy scén, `.env`, firewallu.

---

## Krok 1 — NETWORK

**Vrstva:** SÍŤ  
**Kdo:** PC1 + PC2 (+ volitelně PC3 jen pro ping, ne jako gateway)

### Akce

Na **PC1** (PowerShell):

```powershell
ipconfig
ping <PC2-IP> -n 4
```

Na **PC2**:

```powershell
ipconfig
ping <PC1-IP> -n 4
```

1. Zapsat **skutečný** subnet (může být `192.168.1.x`, `192.168.137.x`, nebo jiný — **nepředpokládat** plán z notebooku).
2. Ověřit: PC3 **není** default gateway ani DHCP server pro PC1/PC2.
3. PC3 může být na síti pro dev, ale **nesmí** být nutný pro ping PC1↔PC2.

### Očekávaný výsledek

- 0 % packet loss oběma směry.
- PC1 a PC2 ve **stejné routovatelné** LAN (ne APIPA `169.254.x.x`).

### PASS / FAIL

| | Kritérium |
|---|-----------|
| **PASS** | Ping 4/4 oběma směry, žádné APIPA na produkčních NIC |
| **FAIL** | Timeout, APIPA, asymetrický ping |

### Při FAIL

- Kabel, switch port, statická IP / DHCP reservation.
- **Nesahej** na MIA, OBS, TikFinity, Rose.
- Oprav síť → **opakuj krok 1**.

### STOP CONDITION

**STOP** — dokud ping PC1↔PC2 není PASS. Kroky 2–12 **zakázány**.

---

## Krok 2 — PC2 MIA CONFIG

**Vrstva:** MIA HTTP (příprava)  
**Kdo:** PC2

### Akce

1. Ověř, že MIA běží (nebo spusť):

```powershell
cd C:\MIA
npm start
# nebo: npm run restart
```

2. Otevři `C:\MIA\.env` — **jen ověř / uprav env, ne kód:**

| Proměnná | Požadovaná hodnota | Proč |
|----------|-------------------|------|
| `MIA_BIND_HOST` | `0.0.0.0` | ingest z PC1 přes LAN |
| `OBS_WS_URL` | `ws://<PC1-SKUTEČNÁ-IP>:4455` | OBS běží na PC1 |
| `OBS_AUTO_LAUNCH` | `false` | watchdog nesmí spouštět obs64 na PC2 |
| `OBS_SCENE_NAME` nebo `MIA_OBS_CAMERA_SCENE` | `SPINAK_ENGINE_GIFTS` (pokud scéna v OBS tak existuje) | MIA WS operace míří sem |
| `MIA_DUAL_VOICE` | unset nebo `0` | jedna TTS cesta |
| `PORT` | `3000` (default) | |

3. Po změně `.env`: `npm run restart` na PC2.

4. Lokálně na PC2:

```powershell
curl http://127.0.0.1:3000/health
```

### Očekávaný výsledek

- MIA proces běží, port 3000 poslouchá.
- `/health` → HTTP 200, `service: MIA`.

### PASS / FAIL

| | Kritérium |
|---|-----------|
| **PASS** | MIA běží + lokální `/health` OK + `.env` hodnoty v tabulce splněny |
| **FAIL** | Port busy, boot error, špatný bind, `OBS_AUTO_LAUNCH` stále true |

### Při FAIL

- Oprav **pouze** `.env` / restart MIA na PC2.
- **Nesahej** na OBS scény ani TikFinity.
- Opakuj krok 2 → pak krok 3.

### STOP CONDITION

**STOP** — pokud MIA na PC2 lokálně neodpovídá na `/health`. Kroky 3+ **zakázány**.

---

## Krok 3 — FIREWALL / HTTP

**Vrstva:** MIA HTTP  
**Kdo:** PC1 (test) → PC2 (cíl)

### Akce

Na **PC1**:

```powershell
curl http://<PC2-IP>:3000/health
# nebo: Invoke-WebRequest http://<PC2-IP>:3000/health
```

1. Ověř HTTP **200**.
2. V JSON: `service`, `lastIngest` (může být null před TikFinity), **ne** nutně `obsConnected` yet.

Pokud FAIL → na PC2 firewall (Admin PowerShell, uprav subnet):

```powershell
New-NetFirewallRule -DisplayName "MIA ingest LAN" -Direction Inbound -Protocol TCP -LocalPort 3000 -RemoteAddress <PC1-SUBNET> -Action Allow
```

*(Subnet z kroku 1 — ne hardcoded 192.168.137.0/24 pokud realita jiná.)*

### Očekávaný výsledek

- PC1 dosáhne PC2:3000.
- Tělo `/health` obsahuje MIA runtime info.

### PASS / FAIL

| | Kritérium |
|---|-----------|
| **PASS** | HTTP 200 z PC1 na PC2:3000/health |
| **FAIL** | Timeout, connection refused, 403 |

### Při FAIL

- **Jen** firewall + `MIA_BIND_HOST` + MIA běží.
- **Nesahej** na OBS WS, browser sources, TikFinity, Rose.
- Opakuj krok 3.

### STOP CONDITION

**STOP** — dokud PC1 nevidí PC2 `/health`. Kroky 4–12 **zakázány**.

---

## Krok 4 — OBS WS

**Vrstva:** OBS WS  
**Kdo:** PC1 (OBS server) + PC2 (MIA klient)

### Akce

**PC1:**

1. Spusť OBS Studio (normálně, **ne Safe Mode**).
2. Tools → WebSocket Server Settings → **Enable**, port **4455**, heslo = shodné s PC2 `OBS_WS_PASSWORD`.
3. Firewall PC1: inbound **4455** jen z PC2 IP.

**PC2:**

1. `.env` `OBS_WS_URL=ws://<PC1-IP>:4455` (už z kroku 2).
2. `npm run restart` pokud OBS právě naběhlo.

**Test z PC1:**

```powershell
curl http://<PC2-IP>:3000/health
```

Hledej: `"obsConnected": true`

Alternativa PC2 log: `[OBS] connected ws://...`

### Očekávaný výsledek

- MIA WS klient na PC2 připojen k OBS na PC1.
- `/health.obsConnected === true`.

### PASS / FAIL

| | Kritérium |
|---|-----------|
| **PASS** | `obsConnected: true` do ~30 s po OBS startu |
| **FAIL** | false, reconnect loop, auth error |

### Při FAIL

- **Jen:** WS enabled, heslo, IP v `.env`, firewall 4455, OBS ne Safe Mode.
- **Nesahej** na browser URL, Program scénu, TikFinity, Rose.
- Opakuj krok 4.

### STOP CONDITION

**STOP** — dokud `obsConnected` není true. Kroky 5–12 **zakázány**.

---

## Krok 5 — OBS BROWSER SOURCES

**Vrstva:** OBS OBRAZ  
**Kdo:** PC1 (OBS GUI)

### Akce

1. V OBS otevři scénu **`SPINAK_ENGINE_GIFTS`** (nebo scénu z `OBS_SCENE_NAME` na PC2).
2. Projdi **všechny** Browser Sources, které patří MIA/Koj (manifest — viz OBS audit §4):

   - `MIA_SPEECH` / `MIA_BUBBLE` → `speech-overlay.html`
   - `MIA_VOICE` → `mia-voice-overlay.html`
   - `MIA_KOJ_RUNTIME` / `KOJNOZROUT_RUNTIME` → `kojnozrout-runtime.html`
   - `MIA_BOWL` / `KOJNOZROUT_BOWL_V2` → bowl overlay
   - `MIA_ENTITY`, `MIA_GIFT_ANIMATION`, `MIA_COMBO`, …
   - **Vyloučit z MIA pravidla:** `tikfinity.zerody.one` widget (TikFinity audit — jiná vrstva)

3. U každého MIA source zkontroluj URL:

| | |
|---|---|
| **FAIL URL** | `http://127.0.0.1:3000/...` nebo `http://localhost:3000/...` |
| **PASS URL** | `http://<PC2-IP>:3000/...` |

4. Po opravě URL: Refresh cache browser source (Properties → Refresh).

5. Počet **`MIA_VOICE`** sources = **1** (TikFinity audit D2).

### Očekávaný výsledek

- Žádný produkční MIA browser source na PC1 neukazuje na localhost.
- Všechny míří na PC2:3000.

### PASS / FAIL

| | Kritérium |
|---|-----------|
| **PASS** | 0× `127.0.0.1:3000` / `localhost:3000` u MIA sources; 1× MIA_VOICE |
| **FAIL** | Jakýkoli MIA source stále na localhost |

### Při FAIL

- **Jen** přepiš URL v OBS na PC2 IP (env/GUI, ne kód).
- **Nesahej** na TikFinity webhook ani Rose test.
- Opakuj krok 5 → pak 6.

### STOP CONDITION

**STOP** — dokud existuje produkční MIA browser source na localhost. Kroky 8–9 (COMMENT/ROSE) **zakázány** — overlay by stejně nešel z PC2.

---

## Krok 6 — OBS PROGRAM ARCHITECTURE

**Vrstva:** OBS OBRAZ  
**Kdo:** PC1 (OBS)

### Akce

1. Zapiš **aktuální Program scénu** (Studio Mode / Program preview).
2. Ověř architekturu (OBS audit §1):

   **Preferovaný model:**

   ```text
   Program = SPINAK_HLAVNI (9:16)
     └─ Scene Item: SPINAK_ENGINE_GIFTS (visible = true)
          └─ MIA browser sources (krok 5)
     └─ Kamera, TikFinity widget (widget ≠ MIA overlay)
   ```

3. Checklist visibility v **`SPINAK_ENGINE_GIFTS`**:

   - [ ] MIA_SPEECH / MIA_BUBBLE — visible
   - [ ] MIA_VOICE — visible, audio monitor dle setupu
   - [ ] KOJNOZROUT_RUNTIME — visible
   - [ ] KOJNOZROUT_BOWL_V2 — visible
   - [ ] MIA_GIFT_ANIMATION — visible (Rose visual)
   - [ ] T1_VIDEO_01… (gift video slots) — existují

4. **`MIA_GENESIS`:** může existovat — **nesmí** být Program scéna pro live reakce, pokud Core overlaye nejsou uvnitř.

5. **ZAKÁZÁNO spouštět:** `npm run genesis:*`, `mia_genesis_obs_setup.js`, cokoli co nastaví Program = `MIA_GENESIS` bez Core overlayů.

6. PC2 `/health` → pole `giftScene` — musí matchovat scénu, kde MIA operuje (`SPINAK_ENGINE_GIFTS`).

7. TikTok LIVE Studio: zdroj = OBS Virtual Camera — zapiš, která OBS scéna jde ven.

### Očekávaný výsledek

- Divák (Program) vidí vertikální master **s viditelným nested engine** nebo ekvivalentní setup.
- Reakce MIA se vykreslí v tom, co jde do Virtual Camera.

### PASS / FAIL

| | Kritérium |
|---|-----------|
| **PASS** | Program = HLAVNI + visible nested ENGINE_GIFTS **nebo** vědomý ekvivalent; `giftScene` match; GENESIS není Program pro GP test |
| **FAIL** | Program = MIA_GENESIS bez overlayů; nested ENGINE skrytý; scéna mismatch |

### Při FAIL

- **Jen** visibility / Program scéna v OBS (po záloze z kroku 0).
- Preferuj: nested model, ne refactor kódu.
- **Nespouštěj** genesis skripty.
- **Nesahej** na TikFinity, dokud krok 5 PASS.
- Opakuj krok 6.

### STOP CONDITION

**STOP** — pokud Program architektura neumožňuje vidět ENGINE_GIFTS overlaye v Program output. COMMENT/ROSE testy by daly falešný FAIL (log OK, obraz ne).

---

## Krok 7 — TIKFINITY

**Vrstva:** TIKFINITY  
**Kdo:** PC1 (TikFinity UI + OBS widget audit)

### Akce

1. **Screenshot** TikFinity Webhook tab + Actions tab (**před** změnou — rollback).

2. **Webhook** (TikFinity UI):

   | | |
   |---|---|
   | URL | `http://<PC2-IP>:3000/ingest` |
   | Secret | pokud PC2 `MIA_INGEST_SECRET=SET` → header dle TikFinity docs |

3. **Connect** k **live** TikTok room (ne jen offline test button).

4. **Actions inventář — COMMENT** (TikFinity audit §6, D1):

   - Vypsat všechny akce pro Comment event.
   - **Pro test:** dočasně **vypnout** externí Read Comments / TTS / Play sound, které **duplikují** MIA webhook.
   - **Nemaž** ostatní Actions — jen disable nebo dokumentuj.
   - Cíl: Comment → **webhook only** do MIA (jedna cesta).

5. **Actions inventář — GIFT:** dokumentuj; pro Rose test stačí webhook + žádný paralelní gift sound/TTS mimo MIA.

6. **OBS widget** `tikfinity.zerody.one/widget/myactions` — pokud přehrává TTS paralelně, **mute/remove pro test** (TikFinity audit F2).

7. Rychlý test (TikFinity test comment nebo live):

   - PC2: `logs/ingest-YYYY-MM-DD.jsonl` nový řádek
   - PC1: `curl http://<PC2-IP>:3000/health` → `lastIngest.eventType`

### Očekávaný výsledek

- TikFinity posílá eventy na PC2.
- Žádná paralelní externí TTS cesta pro Comment (test konfigurace).

### PASS / FAIL

| | Kritérium |
|---|-----------|
| **PASS** | Webhook = PC2; test comment → ingest log + lastIngest; duplicitní Comment TTS disabled pro test |
| **FAIL** | Webhook localhost; 401 ingest; žádný ingest řádek; dvě aktivní TTS cesty |

### Při FAIL

- **Jen** TikFinity webhook URL, secret, Connect, Actions disable pro duplicitní TTS.
- **Nesahej** na OBS scény (pokud 5–6 PASS).
- Opakuj krok 7.

### STOP CONDITION

**STOP** — dokud test comment neprojde do PC2 ingest logu. Kroky 8–9 **zakázány**.

---

## Krok 8 — COMMENT GOLDEN PATH

**Vrstva:** COMMENT  
**Kdo:** PC1 (live/TikFinity) + PC2 (logy) + telefon/OBS preview

### Akce

1. Pošli **jeden reálný COMMENT** (live room nebo kontrolovaný test).
2. Sleduj současně:

| Stopa | Kde | PASS signál |
|-------|-----|-------------|
| Ingest | PC2 `logs/ingest-*.jsonl` | **přesně 1** nový řádek COMMENT (ne 0, ne 2+ duplicit) |
| Pipeline | PC2 `logs/mia-events-*.jsonl` | decision / tts stages |
| TTS | mia-events `tts_speak` | 1× speak (ne `tts_speak_deduped` pokud měl mluvit) |
| Health | PC1 → PC2 `/health` | `lastIngest` = COMMENT |
| Audio | telefon / Studio preview | **max 1** slyšitelná MIA odpověď |
| Obraz | OBS Program | speech overlay pokud očekáváno |

3. **FAIL signály:**

   - 2× TTS audio → TikFinity Actions nebo 2× MIA_VOICE (vrátit krok 7 / 5)
   - ingest OK, obraz nic → krok 6
   - ingest 0 → krok 7

### Očekávaný výsledek

- Jeden comment → jeden ingest → maximálně jedna slyšitelná MIA odpověď.

### PASS / FAIL

| | Kritérium |
|---|-----------|
| **PASS** | 1 ingest + ≤1 audible TTS + lastIngest OK |
| **FAIL** | duplicitní ingest/TTS, ticho, nebo log bez ingest |

### Při FAIL

- Diagnostika **podle vrstvy** (tabulka výše) — **ne** opravovat vše najednou.
- Opakuj **jen** failed vrstvu → znovu krok 8.

### STOP CONDITION

**STOP** — dokud COMMENT GP není PASS. **Nepouštět Rose** (krok 9).

---

## Krok 9 — ROSE GOLDEN PATH

**Vrstva:** ROSE  
**Kdo:** PC1 + PC2 + telefon (divák)

### Akce

1. Pošli **jednu reálnou Rose** (live nebo kontrolovaný gift test).

2. Důkazní řetězec:

| # | Stopa | Kde | PASS |
|---|-------|-----|------|
| 1 | Ingest | `logs/ingest-*.jsonl` | GIFT, giftName Rose |
| 2 | Normalize | mia-events | support tier / miaPoints |
| 3 | Gift map | `logs/gift-mapping-*.jsonl` | Rose → T1 (nebo očekávaný tier) |
| 4 | Video/overlay | mia-events `video_job_enqueued` / overlay | job started |
| 5 | OBS | Program preview | **viditelná** reakce (Koj / gift anim / video) |
| 6 | Audio | telefon | slyšitelná reakce pokud tier vyžaduje |
| 7 | Guardrail | overlay / log | **žádné coins** na public overlay |

3. Latence: zapiš od gift po viditelnou reakci (orientačně ≤15–30 s).

### Očekávaný výsledek

- Rose projde celým řetězcem a je **viditelná/slyšitelná na telefonu** (ne jen v logu).

### PASS / FAIL

| | Kritérium |
|---|-----------|
| **PASS** | ingest GIFT + visible/s audible reakce na telefonu + log chain complete |
| **FAIL** | log OK ale telefon nic (typický scéna/URL bug); nebo ingest chybí |

### Při FAIL

| Symptom | Vrať se na |
|---------|------------|
| ingest OK, telefon nic | krok **6** (Program / nested) nebo **5** (browser URL) |
| ingest chybí | krok **7** |
| video log OK, OBS nic | krok **5–6** |
| double audio | krok **7** |

### STOP CONDITION

**STOP** — Rose GP FAIL → **nepouštět** PC3 kill test jako PASS. Oprav vrstvu → opakuj krok 9.

---

## Krok 10 — PC3 KILL TEST

**Vrstva:** PC3 PRYČ  
**Kdo:** PC3 odpojit; PC1 + PC2 nechat běžet

### Akce

1. **Notebook úplně odpojit** od domácí LAN (Wi-Fi off / ethernet out / sleep).
2. Ověř z PC1: stále `curl http://<PC2-IP>:3000/health` → OK.
3. Opakuj **jeden COMMENT** a **jednu Rose** (zkráceně — stejná kritéria jako kroky 8–9).
4. PC3 **nesmí** být zapnutý pro routing, DNS, proxy, gateway.

### Očekávaný výsledek

- PC1+PC2 produkce funguje bez PC3.

### PASS / FAIL

| | Kritérium |
|---|-----------|
| **PASS** | health OK + COMMENT + Rose stejně jako bez PC3 |
| **FAIL** | cokoli přestane fungovat po odpojení PC3 |

### Při FAIL

- PC3 pravděpodobně hrál roli, kterou neměl (gateway, MIA runtime, TikFinity) — zmapuj co běželo na PC3 → přesuň na PC1/PC2.
- **Ne** maskovat fail — zapis VERDICT PC3-INDEPENDENCE = FAIL.

### STOP CONDITION

**STOP** — pokud bez PC3 health nebo ingest padá → architektura ještě není nezávislá; **GENESIS = NO GO**.

---

## Krok 11 — RECOVERY TEST

**Vrstva:** RECOVERY  
**Kdo:** PC1 + PC2 (PC3 stále offline)

### Akce

**Test A — Restart OBS (PC1):**

1. Zavři OBS úplně (ne Safe Mode).
2. Spusť OBS znovu, WS ON.
3. Sleduj PC2 `/health` → `obsConnected` do **30 s**.
4. Jeden krátký COMMENT — ingest OK?

| Výsledek | Klasifikace |
|----------|-------------|
| obsConnected auto true | **AUTO RECOVER** |
| musel jsi ručně start OBS | **MANUAL RECOVER** (očekávané) |
| MIA nikdy reconnect | **FAIL** → krok 4 |

**Test B — Restart MIA (PC2):**

1. `npm run stop` nebo kill + `npm start`.
2. Z PC1: `/health` OK do 30 s.
3. `obsConnected` true po OBS běžícím na PC1.
4. Jeden COMMENT — ingest OK?

| Výsledek | Klasifikace |
|----------|-------------|
| po `npm start` vše OK | **MANUAL RECOVER** (očekávané — není Windows service) |
| musel restart OBS taky | zapis obě |

5. Zapiš tabulku:

| Event | AUTO | MANUAL | FAIL |
|-------|------|--------|------|
| OBS restart PC1 | | | |
| MIA restart PC2 | | | |

### Očekávaný výsledek

- WS reconnect automaticky po OBS návratu.
- MIA restart = ruční `npm start` na PC2 (dle Startup audit).

### PASS / FAIL

| | Kritérium |
|---|-----------|
| **PASS** | OBS restart → obsConnected do 30 s; MIA restart → health + ingest po manuálním startu |
| **FAIL** | trvalý disconnect loop; ingest dead po restartu |

### Při FAIL

- Dokumentuj — **ne** rozsáhlé opravy v freeze. VERDICT RECOVERY = FAIL.

### STOP CONDITION

Informativní — neblokuje VERDICT tabulku, ale **GENESIS NO GO** pokud RECOVERY FAIL na kritických scénářích.

---

## Krok 12 — VERDICT

**Kdo:** operátor — vyplnit po všech krocích

### Tabulka verdiktů

| Oblast | PASS | FAIL | NOT TESTED |
|--------|:----:|:----:|:----------:|
| **NETWORK** (krok 1) | ☐ | ☐ | ☐ |
| **COMMENT** (krok 8) | ☐ | ☐ | ☐ |
| **ROSE** (krok 9) | ☐ | ☐ | ☐ |
| **PC3-INDEPENDENCE** (krok 10) | ☐ | ☐ | ☐ |
| **RECOVERY** (krok 11) | ☐ | ☐ | ☐ |

### Pravidlo GENESIS

```text
GENESIS = NO GO
```

dokud **jakákoli** z těchto položek není **PASS**:

- NETWORK
- COMMENT
- ROSE
- PC3-INDEPENDENCE

RECOVERY = doporučené PASS, ale NOT TESTED neblokuje, pokud ostatní PASS a operátor akceptuje manuální restart MIA.

### GO kritérium (budoucí generálka — krok G)

```text
GENESIS = GO  ⟺  všechny 5 oblastí PASS
```

### Poznámky / časová osa

| Čas | Krok | Výsledek |
|-----|------|----------|
| | | |
| | | |

---

## Rychlá reference — FAIL → která vrstva

| Symptom | Oprav vrstvu | Krok |
|---------|--------------|------|
| ping fail | SÍŤ | 1 |
| health timeout z PC1 | MIA HTTP / firewall | 2–3 |
| obsConnected false | OBS WS | 4 |
| overlay prázdný, log OK | OBS OBRAZ (URL nebo Program) | 5–6 |
| ingest prázdný | TIKFINITY | 7 |
| double TTS | TIKFINITY Actions / MIA_VOICE | 7, 5 |
| log OK, telefon nic | OBS Program nested | 6 |
| funguje jen s notebookem | PC3 dependency | 10 |

---

## Co **nesmíš** dělat během tohoto plánu

- Spouštět `mia_genesis_*` / přepínat Program na `MIA_GENESIS` bez plánu.
- Měnit kód v repu (freeze).
- Mazat TikFinity Actions — jen disable + screenshot.
- Opravovat Rose, když failne síť.
- Spouštět další audity z notebooku.

---

## Po dokončení plánu

1. Vyplnit VERDICT tabulku (krok 12).
2. Uložit baseline + screenshoty do deníku (volitelně `docs/PRE_MIGRATION_BASELINE_EVIDENCE.md`).
3. **Pauza auditů** — další práce jen podle PASS/FAIL, ne nové mapy.

---

*Sestaveno ze tří hotových auditů. Architektura PC1 STREAM + PC2 MIA + PC3 DEV **technicky dává smysl** — teď ji jen nakonfigurovat a prokázat.*
