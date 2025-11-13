# P&L Data Mapping Reference

This document serves as the **Single Source of Truth (SSoT)** for all P&L category and subcategory mappings. It should be updated whenever new insights are discovered or data inconsistencies are found.

## Purpose

This mapping ensures that:
- Raw P&L data from `powerbi_pnl_data` is correctly aggregated into `powerbi_pnl_aggregated`
- Category-level and subcategory-level data are both captured
- Data inconsistencies (typos, alternative naming) are handled
- Calculations match PowerBI structure within 1% margin

## Revenue Category Mappings

### Netto-omzet uit leveringen geproduceerde goederen
**Category-Level Matches:**
- `Netto-omzet uit leveringen geproduceerde goederen`

**Subcategory-Level Matches:**
- `Omzet snacks (btw laag)`
- `Verkopen snacks (btw laag)` ⚠️ Alternative naming variant
- `Omzet lunch (btw laag)`
- `Omzet diner (btw laag)`
- `Omzet menu's (btw laag)`
- `Omzet keuken overig (btw laag)`

### Netto-omzet uit verkoop van handelsgoederen
**Category-Level Matches:**
- `Netto-omzet uit verkoop van handelsgoederen`

**Subcategory-Level Matches:**
- `Omzet wijnen (btw hoog)`
- `Omzet gedestilleerd (btw hoog)`
- `Omzet cocktails (btw hoog)`
- `Omzet cider (btw hoog)`
- `Omzet hoog overig (btw hoog)`
- `Omzet hoog alcoholische warme dranken (btw hoog)` ⚠️ Additional variant
- `Omzet speciaalbier fles (btw hoog)`
- `Omzet speciaalbier tap (btw hoog)`
- `Omzet tap pilsner (btw hoog)`
- `Omzet koffie / thee (btw laag)`
- `Verkopen koffie/thee(btw laag)` ⚠️ Alternative naming variant
- `Omzet frisdranken (btw laag)`
- `Omzet frisdtranken (btw laag)` ⚠️ Typo variant in data
- `Omzet alcohol vrij (btw laag)`
- `Omzet alcohol virj (btw laag)` ⚠️ Typo variant in data
- `Omzet laag overig (btw laag)`
- `Omzet non food (btw hoog)`

## Cost Category Mappings

### Cost of Sales

#### Inkoopwaarde handelsgoederen
**Category-Level Matches:**
- `Inkoopwaarde handelsgoederen`
- `Kostprijs van de omzet`

**Subcategory-Level Matches:**
- `Inkopen bieren fles (btw hoog)`
- `Inkopen sterke dranken (btw hoog)`
- `Inkopen wijnen (btw hoog)`
- `Inkopen speciaalbier fles (btw hoog)`
- `Inkopen speciaalbier tap (btw hoog)`
- `Inkopen pilsner tap (btw hoog)`
- `Inkopen koffie (btw laag)`
- `Inkopen frisdrank (btw laag)`
- `Inkopen bieren (btw laag)`
- `Inkopen alcohol vrije drank (btw laag)`
- `Inkopen bar overige (btw laag)`
- `Statiegeld`
- `Inkopen keuken (btw hoog)`
- `Inkopen keuken (btw laag)`
- `Inkopen (geheel vrijgesteld van btw)`

### Labor Costs

#### Lonen en salarissen
**Category-Level Matches:**
- `Lonen en salarissen`
- `Arbeidskosten`

**Subcategory-Level Matches (Contract):**
- `Bruto Salarissen Keuken`
- `Doorberekende loonkosten keuken`
- `Mutatie reservering vakantietoeslag keuken`
- `Mutatie reservering vakantiedagen keuken`
- `Werkgeversdeel overige fondsen keuken`
- `Werkgeversdeel pensioenen keuken`
- `Onkostenvergoeding keuken`
- `Bruto Salarissen Bediening`
- `Doorberekende loonkosten bediening`
- `Mutatie reservering vakantietoeslag bediening`
- `Mutatie reservering vakantiedagen bediening`
- `Werkgeversdeel overige fondsen bediening`
- `Werkgeversdeel pensioenen bediening`
- `Onkostenvergoeding bediening`
- `Bruto Salarissen overhead`
- `Doorberekende loonkosten Overhead`
- `Mutatie reservering vakantietoeslag overhead`
- `Mutatie reservering vakantiedagen overhead`
- `Werkgeversdeel pensioenen overhead`
- `HOP premie`
- `Studie- en opleidsingskosten personeel`
- `Ziekengeldverzekering`
- `Arbodienst`
- `Bedrijfskleding`
- `Overige personeelskosten`
- `Waskosten uniformen`
- `Uitkering ziekengeld`
- `Onkostenvergoeding`
- `Overige lasten uit hoofde van personeelsbeloningen`
- `Overige personeelsgerelateerde kosten`
- `Pensioenlasten`
- `Sociale lasten`
- `Werkkostenregeling - detail`

**Subcategory-Level Matches (Flex):**
- `Inhuur F&B`
- `Inhuur Afwas`
- `Inhuur keuken`
- `Inhuur overhead`
- `Loonkosten Overhead`

### Other Costs

#### Huisvestingskosten
**Category-Level Matches:**
- `Huisvestingskosten`

**Subcategory-Level Matches:**
- `Elektra`
- `Huur gebouwen`
- `Huur`
- `Gas`
- `Water`
- `Onderhoud gebouwen`
- `Schoonmaakkosten`
- `Gemeentelijke lasten etc.`
- `Overige huisvestingskosten`

#### Exploitatie- en machinekosten
**Category-Level Matches:**
- `Exploitatie- en machinekosten`

**Subcategory-Level Matches:**
- `Huur machines`
- `Kleine aanschaffingen`
- `Kleine aanschaffingen bar`
- `Kleine aanschaffingen keuken`
- `Waskosten Linnen`
- `Papierwaren`
- `Reparatie en onderhoud`
- `Reparatie en onderhoud keuken`
- `Glaswerk / bestek`

#### Verkoop gerelateerde kosten
**Category-Level Matches:**
- `Verkoop gerelateerde kosten`

**Subcategory-Level Matches:**
- `Decoratie`
- `Advertenties`
- `Reclame`
- `Sponsoring`
- `Muziek en entertainment`
- `Representatiekosten`
- `Reis- en verblijfkosten`
- `Overige verkoopkosten`

#### Autokosten
**Category-Level Matches:**
- `Autokosten`

**Subcategory-Level Matches:**
- `Brandstoffen`
- `Onderhoud auto(\`s)`
- `Leasekosten auto(\`s)`

#### Kantoorkosten
**Category-Level Matches:**
- `Kantoorkosten`

**Subcategory-Level Matches:**
- `Kantoorbenodigdheden`
- `Kosten automatisering`
- `Telecommunicatie`
- `Drukwerk`
- `Bedrijfsschadeverzekering`
- `Contributies-abonnementen`

#### Assurantiekosten
**Category-Level Matches:**
- `Assurantiekosten`

**Subcategory-Level Matches:**
- `Overige verzekeringen`

#### Accountants- en advieskosten
**Category-Level Matches:**
- `Accountants- en advieskosten`

**Subcategory-Level Matches:**
- `Salarisadministratie`
- `Administratiekosten`
- `Advieskosten`
- `Juridische advieskosten`

#### Administratieve lasten
**Category-Level Matches:**
- `Administratieve lasten`

**Subcategory-Level Matches:**
- `Boetes`
- `Kosten betalingsverkeer`

#### Andere kosten
**Category-Level Matches:**
- `Andere kosten`

**Subcategory-Level Matches:**
- `Kleine aanschaffingen`
- `Kosten betalingsverkeer Formitable B.V.`

#### Afschrijvingen
**Category-Level Matches:**
- `Afschrijvingen op immateriële en materiële vaste activa`
- `Afschrijvingen op immateriële vaste activa`
- `Afschrijvingen op materiële vaste activa`

**Subcategory-Level Matches:**
- `Afschrijvingen op immateriële vaste activa`
- `Afschrijvingen op materiële vaste activa`
- `Afschrijvingskosten goodwill`
- `Afschrijvingskosten gebouw verbouwingen`
- `Afschrijvingskosten inventaris, machines`
- `Afschrijvingskosten transportmiddelen`

#### Financiële baten en lasten
**Category-Level Matches:**
- `Financiële baten en lasten`

**Subcategory-Level Matches:**
- `Rentelasten en soortgelijke kosten`
- `Rentebaten en soortgelijke opbrengsten`
- `Rente Rabobank lening 0050083496`
- `Rente lening o/g Kluin Beheer`
- `Rente Lening o/g Floryn`
- `Rente lening Kluin Beheer B.V.`
- `Rente lening VOF Bar BEA`
- `Rente belastingen`

#### Opbrengst van vorderingen
**Category-Level Matches:**
- `Opbrengst van vorderingen die tot de vaste activa behoren en van effecten`

**Subcategory-Level Matches:**
- `Opbrengst van vorderingen die tot de vaste activa behoren en van effecten`

## Implementation Notes

### Matching Logic
The aggregation function uses a dual-matching approach:
1. **Category-Level Matching**: Matches records where `category` field equals a mapped category name
2. **Subcategory-Level Matching**: Matches records where `subcategory` field equals a mapped subcategory name

This ensures both aggregated category-level data and granular subcategory-level data are captured correctly.

### Data Inconsistencies
⚠️ **Known Variants**: Items marked with ⚠️ represent alternative naming or typos found in actual data. These are included to ensure all data is captured.

### Related Files
- **Implementation**: [`src/lib/finance/powerbi/aggregation-service.ts`](../../src/lib/finance/powerbi/aggregation-service.ts)
- **Validation**: [`src/lib/finance/pnl-balance/calculation-validator.ts`](../../src/lib/finance/pnl-balance/calculation-validator.ts)
- **Category Mapper**: [`src/lib/finance/pnl-balance/category-mapper.ts`](../../src/lib/finance/pnl-balance/category-mapper.ts)

## Update History

- **2025-01-XX**: Initial mapping created with category-level and subcategory-level matches
- **2025-01-XX**: Added variant/typo names found in actual data (Verkopen snacks, Omzet frisdtranken, etc.)
- **2025-01-XX**: Added "Omzet hoog alcoholische warme dranken" variant

## How to Update This Document

When discovering new category/subcategory names or data inconsistencies:

1. Add the new mapping to the appropriate section
2. Mark with ⚠️ if it's a variant/typo
3. Update the "Update History" section with date and description
4. Update the corresponding code in `aggregation-service.ts`
5. Test the aggregation with the new mapping
6. Re-aggregate affected data

---

*This is a living document. Update it whenever new insights are discovered.*

