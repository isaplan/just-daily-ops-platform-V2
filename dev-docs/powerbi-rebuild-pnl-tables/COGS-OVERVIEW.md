# COGS Overview - Data Import Structure

## Missing Files
⚠️ **The `kinsbergen-large.png` files are missing from the repository.**
- Expected: `kinsbergen-2023-large.png`, `kinsbergen-2024-large.png`, `kinsbergen-2025-large.png`
- Found: Only `kinsbergen-*-tiny.png` files exist

## Current COGS Structure (from code)

### MAIN COGS (Level 1)

1. **Netto-omzet groepen** (Revenue Groups)
   - SUB: Netto-omzet uit leveringen geproduceerde goederen
   - SUB: Netto-omzet uit verkoop van handelsgoederen

2. **Kostprijs van de omzet** (Cost of Sales)
   - SUB: Inkoopwaarde handelsgoederen

3. **Arbeidskosten** (Labor Costs)
   - SUB: Contract Arbeid
     - SUB SUB: Lonen en salarissen
     - SUB SUB: Overige lasten uit hoofde van personeelsbeloningen
     - SUB SUB: Pensioenlasten
     - SUB SUB: Sociale lasten
   - SUB: Flex Arbeid
     - SUB SUB: Werkkostenregeling - detail
   - SUB: Overige Arbeid
     - SUB SUB: Overige personeelsgerelateerde kosten

4. **Overige bedrijfskosten** (Other Operating Costs)
   - SUB: Accountants- en advieskosten
   - SUB: Administratieve lasten
   - SUB: Andere kosten
   - SUB: Assurantiekosten
   - SUB: Autokosten
   - SUB: Exploitatie- en machinekosten
   - SUB: Huisvestingskosten
   - SUB: Kantoorkosten
   - SUB: Verkoop gerelateerde kosten

5. **Afschrijvingen op immateriële en materiële vaste activa** (Depreciation)
   - SUB: Afschrijvingen op immateriële vaste activa
   - SUB: Afschrijvingen op materiële vaste activa

6. **Financiële baten en lasten** (Financial Income and Expenses)
   - SUB: Rentebaten en soortgelijke opbrengsten
   - SUB: Rentelasten en soortgelijke kosten
   - SUB: Opbrengst van vorderingen die tot de vaste activa behoren en van effecten

7. **Resultaat** (Profit/Loss) - Calculated

## Database Schema (powerbi_pnl_aggregated)

### Summary Columns
- `revenue_food`
- `revenue_beverage`
- `revenue_total`
- `cost_of_sales_food`
- `cost_of_sales_beverage`
- `cost_of_sales_total`
- `labor_contract`
- `labor_flex`
- `labor_total`
- `other_costs_total`
- `opbrengst_vorderingen`
- `resultaat`

### Detailed Columns
- `netto_omzet_uit_levering_geproduceerd`
- `netto_omzet_verkoop_handelsgoederen`
- `inkoopwaarde_handelsgoederen`
- `lonen_en_salarissen`
- `huisvestingskosten`
- `exploitatie_kosten`
- `verkoop_kosten`
- `autokosten`
- `kantoorkosten`
- `assurantiekosten`
- `accountantskosten`
- `administratieve_lasten`
- `andere_kosten`
- `afschrijvingen`
- `financiele_baten_lasten`

## Raw Data Table (powerbi_pnl_data)

This table stores the original imported data with:
- `category` (MAIN COGS)
- `subcategory` (SUB COGS)
- `gl_account` (SUB SUB COGS / GL Account level)

## API Endpoint

Created `/api/finance/pnl-balance/cogs-overview` to query actual data:
- Query params: `?location=all&year=2025` (optional)
- Returns: All MAIN, SUB, and SUB SUB COGS from `powerbi_pnl_data` table

## Next Steps

1. **Query actual data** from `powerbi_pnl_data` using the API endpoint
2. **Compare** with the PowerBI PNG structure (once large PNGs are available)
3. **Map** database columns to COGS hierarchy
4. **Verify** calculations match PowerBI output

