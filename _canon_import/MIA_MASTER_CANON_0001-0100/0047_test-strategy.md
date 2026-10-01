# MIA MASTER CANON

# Dokument 0047

# Test Strategy

---

## Metadata

| Položka | Hodnota |
|---|---|
| ID | MIA-0047 |
| Název | Test Strategy |
| Vrstva | Foundation |
| Priorita | KRITICKÁ |
| Verze | 1.0.0 |
| Stav | ACTIVE |
| Autorita | MIA MASTER CANON |

---

# 1. Účel

**Test Strategy** je závazná implementační specifikace platformy MIA. Cursor ji musí používat jako pracovní kontrakt, nikoli jako volný návrh.

# 2. Kanonická odpovědnost

- Test Strategy má jedinou autoritativní implementaci.
- Komponenta komunikuje pouze přes verzované kontrakty.
- Chyby jsou strukturované, auditované a nesmí být tiše ignorované.
- Odpovědnost nesmí být duplicitně implementována v jiné části systému.
- Platformně specifický kód nesmí pronikat do doménové vrstvy bez adapteru.

# 3. Vstupy

Povinné vstupy obsahují verzovaný payload, correlationId, identitu zdroje, timestamp a autorizační kontext. Nevalidní vstup se odmítne před změnou stavu.

# 4. Výstupy

Komponenta vrací pouze validovaný výsledek, strukturovanou chybu, doménový Event nebo Action Result. Tiché selhání je zakázáno.

# 5. Architektonická hranice

```text
External Source
      ↓
Adapter / Contract Validator
      ↓
Test Strategy
      ↓
Command / Event / Action Result
```

# 6. Povinné rozhraní

```text
initialize()
validate(input)
execute(input, context)
getStatus()
getSnapshot()
shutdown()
```

# 7. Stavový model

Povolené stavy: CREATED, INITIALIZING, READY, RUNNING, DEGRADED, FAILED, STOPPING, STOPPED. Každý přechod je validovaný a auditovaný.

# 8. Chybový model

Každá chyba obsahuje errorCode, message, severity, retryable, component, correlationId, timestamp a details.

# 9. Idempotence

Stejný idempotency key nesmí vytvořit duplicitní gift body, bowl změny, itemy, Battle skóre, přehrání médií ani overlay.

# 10. Monitoring

Povinné metriky: počet požadavků, úspěchů, chyb, retry, odmítnutých vstupů, latence a aktuální stav komponenty.

# 11. Audit

Audit zapisuje componentId, operation, input reference, result, source, correlationId, timestamp a durationMs.

# 12. Bezpečnost

Přístup řídí Capability Manager a Policy Engine. Externí payload není důvěryhodný. Tajné klíče nesmí být v kódu ani logu.

# 13. Výkon a limity

Komponenta podporuje backpressure, timeout, omezený retry a Resource Manager. Nesmí blokovat real-time ingest ani používat nekonečné fronty.

# 14. Obnova po chybě

Po restartu lze načíst poslední konzistentní stav, obnovit nedokončené operace, odmítnout poškozený snapshot a zabránit dvojitému efektu.

# 15. Testovací minimum

Povinné testy: validní vstup, nevalidní vstup, duplicita, timeout, nedostupná závislost, restart během operace, vysoké zatížení, audit a metriky.

# 16. Implementační pravidla pro Cursor

1. Najít existující implementaci.
2. Nevytvářet paralelní duplicitu.
3. Zachovat veřejné kontrakty nebo dodat migration adapter.
4. Spustit unit, integration a preflight testy.
5. Vypsat změněné soubory, rizika a rollback.
6. Neoznačit HOTOVO bez důkazu testů.

# 17. Zakázané vzory

Zakázána je business logika v overlay HTML, přímý zápis adapteru do globálního stavu, prázdný catch, magic numbers mimo konfiguraci, neomezené retry, duplicitní handlery a změna stavu bez Command/Event stopy.

# 18. Audit Cursor

- ☐ Jediná autoritativní implementace.
- ☐ Validované kontrakty.
- ☐ Definované stavové přechody.
- ☐ Jednotný error model.
- ☐ Idempotence.
- ☐ Monitoring a audit.
- ☐ Recovery.
- ☐ Automatické testy.
- ☐ Žádné zakázané přímé vazby.

# 19. Definice HOTOVO

Dokument 0047 je implementován pouze tehdy, když existuje funkční produkční implementace, testy a preflight procházejí, monitoring a audit dokazují běh, restart nezpůsobí nekonzistenci a Cursor audit potvrzuje nulovou duplicitu odpovědnosti.

# 20. Vazba na projekt MIA

Komponenta je součástí základu pro TikTok a Kick ingest, MIA/Kojnožrout chat, gift ekonomiku, Bowl, Tier videa, Battle, inventář, playlist, overlaye, OBS a AI workflow.

```text
RAW EVENT → NORMALIZER → DECISION ENGINE → COMMAND/ACTION → EXECUTION → EVENT/PROJECTION/OVERLAY
```

# 21. Kanonický verdikt

Tento dokument je autoritativní regenerovaná pracovní specifikace pro Cursor. Při konfliktu se starším nečíslovaným návrhem má přednost tato verze, dokud nebude nahrazena vyšší verzí stejného dokumentu.

---

## Konec dokumentu 0047
