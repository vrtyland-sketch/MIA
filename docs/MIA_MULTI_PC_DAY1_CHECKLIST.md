# Multi-PC — Den 1 checklist (idiot-proof)

**Status:** OPERATIONS · FREEZE-safe (docs only)  
**Datum:** 2026-08-08  
**Detail setup:** [`MIA_MULTI_PC_SETUP.md`](./MIA_MULTI_PC_SETUP.md)  
**Env:** [`.env.mia-pc.example`](../.env.mia-pc.example) · [`.env.stream-pc.example`](../.env.stream-pc.example)

**Cíl:** Až přijde switch, **ne přemýšlet** — jen odškrtávat.

---

## 0. Před fyzickým zapojením

- [ ] Switch + kabely labeled (MIA PC / STREAM PC / internet)
- [ ] Statické IP nebo DHCP reservation zapsané na papír:
  - MIA PC: `192.168.x.__`
  - STREAM PC: `192.168.x.__`
- [ ] `.env` na MIA PC z `.env.mia-pc.example`
- [ ] OBS na STREAM PC — **žádný** MIA runtime
- [ ] TikFinity nainstalovaná na STREAM PC
- [ ] Firewall pravidla: MIA port **3000** z STREAM sítě

---

## 1. Kabel A sem (fyzická vrstva)

| Krok | Akce | ✓ |
|------|------|---|
| 1.1 | Switch uplink → router/internet | ☐ |
| 1.2 | Ethernet MIA PC → switch port __ | ☐ |
| 1.3 | Ethernet STREAM PC → switch port __ | ☐ |
| 1.4 | Obě PC zapnuté, link LED svítí | ☐ |

---

## 2. Síť (IP + ping)

Na **STREAM PC** (PowerShell):

```powershell
ping <MIA-IP> -n 4
```

| Krok | Očekávání | ✓ |
|------|-----------|---|
| 2.1 | ping MIA IP → 0% loss | ☐ |
| 2.2 | ping STREAM IP z MIA → 0% loss | ☐ |

Na **MIA PC**:

```powershell
ipconfig
# ověř MIA_BIND_HOST=0.0.0.0 v .env
```

---

## 3. MIA server (port 3000)

Na **MIA PC**:

```powershell
cd C:\MIA
node index.js
# nebo existující start script
```

Na **STREAM PC**:

```powershell
curl http://<MIA-IP>:3000/health
# nebo browser → http://<MIA-IP>:3000/
```

| Krok | ✓ |
|------|---|
| 3.1 MIA běží, bind 0.0.0.0 | ☐ |
| 3.2 Health z STREAM PC OK | ☐ |

---

## 4. OBS WebSocket (STREAM PC)

| Krok | Akce | ✓ |
|------|------|---|
| 4.1 | OBS → Tools → WebSocket Server **ON**, port **4455** | ☐ |
| 4.2 | MIA `.env`: `OBS_WS_URL=ws://<STREAM-IP>:4455` | ☐ |
| 4.3 | MIA log: OBS connected (ne disconnected loop) | ☐ |
| 4.4 | `MIA_OBS_AUTO_LAUNCH=false` na MIA PC | ☐ |

---

## 5. TikFinity → ingest

| Krok | Akce | ✓ |
|------|------|---|
| 5.1 | TikFinity běží na STREAM PC | ☐ |
| 5.2 | Webhook/API → `http://<MIA-IP>:3000/ingest` | ☐ |
| 5.3 | Test comment v TikFinity test mode | ☐ |

---

## 6. COMMENT test (evidence)

| Krok | ✓ |
|------|---|
| 6.1 TikFinity pošle COMMENT | ☐ |
| 6.2 `logs/ingest-YYYY-MM-DD.jsonl` nový řádek | ☐ |
| 6.3 MIA log: event accepted | ☐ |
| 6.4 (volitelné) TTS / overlay reakce | ☐ |

**Evidence template:** viz [`PRE_MIGRATION_BASELINE_EVIDENCE.md`](./PRE_MIGRATION_BASELINE_EVIDENCE.md)

---

## 7. Rose test (gift path)

| Krok | ✓ |
|------|---|
| 7.1 TikFinity test Rose gift | ☐ |
| 7.2 ingest log: gift event + tier T1 | ☐ |
| 7.3 Overlay / Koj / video rotation (1/N) | ☐ |
| 7.4 **Žádné** coins v public overlay | ☐ |

---

## 8. Audio path

| Krok | ✓ |
|------|---|
| 8.1 TTS vygenerováno na MIA (log) | ☐ |
| 8.2 Audio slyšitelné ve streamu (~≤15 s latency) | ☐ |
| 8.3 Správný speaker (Koj vs MIA) | ☐ |

---

## 9. Video path

| Krok | ✓ |
|------|---|
| 9.1 OBS browser source načítá z MIA URL | ☐ |
| 9.2 Gift video / overlay visible | ☐ |
| 9.3 Alpha WEBM OK (bez černého fringu) | ☐ |

---

## 10. Evidence & sign-off

| Krok | ✓ |
|------|---|
| 10.1 Screenshot OBS + Task Manager RAM obou PC | ☐ |
| 10.2 Uložit ingest + mia-events log slice | ☐ |
| 10.3 Zapsat do `PRE_MIGRATION_BASELINE_EVIDENCE.md` nebo nový deník | ☐ |
| 10.4 Verdikt: PASS / PARTIAL / FAIL | ☐ |

---

## 11. Když něco failne (rychlá triáž)

| Symptom | První check |
|---------|-------------|
| ping fail | kabel, IP, firewall |
| :3000 unreachable | MIA bind, firewall, wrong IP |
| OBS disconnected | WS port, STREAM IP in .env, OBS WS enabled |
| ingest empty | TikFinity URL, MIA běží |
| TTS no audio | Edge TTS, OBS audio monitor, browser source |
| TikFinity crash | RAM na STREAM PC — zavřít Studio/Chrome |

**Neopravovat runtime během freeze** — jen evidence + docs.

---

## 12. Po úspěšném Dni 1

1. [`MIA_OPERATIONS_STATUS.md`](./MIA_OPERATIONS_STATUS.md) — update fáze B→C  
2. THAW: full preflight (`POST_FREEZE_BACKLOG.md`)  
3. Live retest R1-D checklist  
4. Teprve pak Creative Studio CS2-1 spike

---

## Quick reference card (vytisknout)

```text
MIA PC:    ___.___.___.___  :3000   (node index.js, BIND 0.0.0.0)
STREAM PC: ___.___.___.___  OBS WS :4455
INGEST:    http://<MIA-IP>:3000/ingest
TEST:      COMMENT → Rose → audio → video → log
```
