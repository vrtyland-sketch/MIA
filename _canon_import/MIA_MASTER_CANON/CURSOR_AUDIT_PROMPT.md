# CURSOR AUDIT PROMPT

Proveď audit projektu vůči dokumentu `<CANON_DOCUMENT>`.

Pravidla:
1. Nic neměň, dokud nedokončíš audit.
2. Prohledej celý repozitář, ne pouze soubory s podobným názvem.
3. Výsledek označ:
   - `OK`
   - `ČÁSTEČNĚ`
   - `CHYBÍ`
   - `KONFLIKT`
   - `MRTVÝ KÓD`
4. U každého tvrzení uveď přesný soubor, symbol a řádky.
5. Rozliš:
   - aktuálně používaný kód,
   - legacy provider,
   - nepoužívaný kód,
   - testovací kód.
6. Zkontroluj event kontrakty, konfiguraci, logování, timeouty, recovery a testy.
7. Navrhni nejmenší bezpečný implementační krok.
8. Před úpravou vytvoř regresní test.
9. Po změně aktualizuj `IMPLEMENTATION_MATRIX.csv`.
10. Neprováděj hromadný refaktor bez výslovného schválení.

Výstup:
- Stav dokumentu
- Nalezená implementace
- Chybějící části
- Konflikty
- Rizika
- Testovací plán
- Přesný seznam souborů k úpravě
