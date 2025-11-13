# P&L Balance Calculation Analysis

## Reference Images Structure

Based on the provided images, we have:
- **Compact**: Revenue, Main COGS, Result only
- **Normal**: Main COGS with sub-COGS (as currently built)
- **Large**: All COGS expanded

## Target Structure

### Compact View Structure
```
Netto-omzet groepen
  ├── Netto-omzet uit leveringen geproduceerde goederen
  └── Netto-omzet uit verkoop van handelsgoederen

Kostprijs van de omzet
  └── Inkoopwaarde handelsgoederen

Arbeidskosten
  ├── Contract Arbeid
  ├── Flex Arbeid
  └── Overige Arbeid

Overige bedrijfskosten
Afschrijvingen op immateriële en materiële vaste activa
Financiële baten en lasten
Resultaat
```

## Calculation Formula

```
Resultaat = Revenue - COST_OF_SALES - LABOR_COST - OTHER_UNDEFINED_COGS
```

Where:
- Revenue = Netto-omzet groepen (positive)
- COST_OF_SALES = Kostprijs van de omzet (negative)
- LABOR_COST = Arbeidskosten (negative)
- OTHER_UNDEFINED_COGS = Sum of Overige bedrijfskosten + Afschrijvingen + Financiële baten en lasten (negative)

## Validation Points

1. Revenue totals must match
2. Cost totals must match
3. Resultaat must match within 1% margin
4. All three locations must be verified
5. Test with positive and negative results

## Test Cases Needed

For each location (Kinsbergen, Bar Bea, Lamour):
- Month with positive Resultaat (2024)
- Month with positive Resultaat (2025)
- Month with negative Resultaat (2024)
- Month with negative Resultaat (2025)

