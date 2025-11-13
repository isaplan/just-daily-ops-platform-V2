/**
 * P&L Balance View Layer
 * Updated with multi-select filters, seasons, and comparison mode
 */

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChevronDown, ChevronRight, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LanguageSwitcher } from '@/components/ui/language-switcher';
import { Badge } from '@/components/ui/badge';
import { usePnLBalanceViewModel } from '@/viewmodels/finance/usePnLBalanceViewModel';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { mapAggregatedToDisplay } from '@/lib/finance/pnl-balance-utils';

export default function PnLBalancePage() {
  const {
    // State
    selectedYears,
    selectedMonths,
    selectedSeasons,
    selectedLocations,
    isComparisonMode,
    toggleYear,
    toggleMonth,
    toggleSeason,
    toggleLocation,
    setAllMonths,
    setIsComparisonMode,
    setSelectedYears,
    setSelectedMonths,
    setSelectedSeasons,
    setSelectedLocations,
    
    // Data
    processedDataByCombination,
    availableMonths,
    validationResults,
    isLoading,
    error,
    queries,
    queryParamsList,
    
    // Options
    AVAILABLE_YEARS,
    MONTHS,
    LOCATIONS,
    SEASONS,
    
    // Actions
    toggleExpansion,
    
    // Utilities
    formatCurrency,
    
    // Translations
    canUseTranslations,
    t,
  } = usePnLBalanceViewModel();

  // Get month label
  const getMonthLabel = (month: number) => {
    return MONTHS.find(m => m.value === month)?.label || `M${month}`;
  };

  // Get location label
  const getLocationLabel = (locationId: string) => {
    return LOCATIONS.find(l => l.value === locationId)?.label || locationId;
  };

  // Render single table
  const renderTable = (data: any[], title: string, validation?: any, displayMonths?: number[]) => {
    if (!data || data.length === 0) {
      return (
        <div className="text-center text-muted-foreground p-4">
          No data available
        </div>
      );
    }

    // Use provided months or fall back to available months
    const months = displayMonths && displayMonths.length > 0 
      ? displayMonths.sort((a, b) => a - b)
      : (availableMonths.length > 0 ? availableMonths : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);

    return (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[300px]">Categorie</TableHead>
              {months.map(month => (
                <TableHead key={month} className="text-center min-w-[100px]">
                  {getMonthLabel(month)}
                </TableHead>
              ))}
              <TableHead className="text-center min-w-[100px] font-bold">Totaal</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((item: any, index: number) => {
              // Skip subcategories that should be hidden when parent is collapsed
              if (item.isSubcategory && item.parentCategory) {
                const parentIndex = data.findIndex((p: any) => p.category === item.parentCategory && !p.isSubcategory);
                if (parentIndex !== -1 && !data[parentIndex].isExpanded) {
                  return null;
                }
              }

              // Determine indentation level
              let indentLevel = 0;
              if (item.isSubcategory && item.parentCategory) {
                indentLevel = 1;
                if (item.subcategory) {
                  indentLevel = 2;
                }
              }

              return (
                <TableRow 
                  key={`${item.category}-${item.subcategory || 'main'}-${index}`}
                  className={`
                    ${item.category === 'Resultaat' ? 'font-bold bg-muted' : ''}
                    ${item.isSubcategory ? 'bg-muted/50' : ''}
                    ${item.isMissing ? 'bg-red-50 border-l-4 border-red-400' : ''}
                  `}
                >
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {indentLevel > 0 && <span className={`w-${indentLevel * 4}`} />}
                      
                      {!item.isSubcategory && item.isCollapsible && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => toggleExpansion(index)}
                        >
                          {item.isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                      
                      {item.isSubcategory && item.isCollapsible && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => toggleExpansion(index)}
                        >
                          {item.isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                      
                      <span className={item.category === 'Resultaat' ? 'font-bold' : ''}>
                        {item.subcategory || item.category}
                        {item.isMissing && (
                          <span className="ml-2 text-red-500 text-xs font-medium">
                            (MISSING DATA)
                          </span>
                        )}
                      </span>
                    </div>
                  </TableCell>
                  {months.map(month => (
                    <TableCell key={month} className="text-right">
                      {formatCurrency(item.amounts[month] || 0)}
                    </TableCell>
                  ))}
                  <TableCell className="text-right font-bold">
                    {formatCurrency(item.total)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    );
  };

  return (
    <div className="w-full space-y-6 p-6">
      {/* Page Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">W&V Balans</h1>
          <p className="text-muted-foreground">
            Monthly P&L balance tables with expandable COGS categories
          </p>
        </div>
        <LanguageSwitcher />
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Jaar & Locatie</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Comparison Mode Toggle */}
          <div className="flex items-center gap-2 pb-2 border-b">
            <Switch
              id="comparison-mode"
              checked={isComparisonMode}
              onCheckedChange={setIsComparisonMode}
            />
            <Label htmlFor="comparison-mode" className="cursor-pointer">
              Comparison Mode (Max 6 months)
            </Label>
          </div>

          {/* Year Buttons */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">Jaar:</span>
            <div className="flex gap-2">
              <Button
                variant={selectedYears.length === 0 ? 'default' : 'outline'}
                size="sm"
                onClick={() => toggleYear('all')}
              >
                All
              </Button>
              {AVAILABLE_YEARS.map(year => {
                const isSelected = selectedYears.includes(year);
                return (
                  <Button
                    key={year}
                    variant={isSelected ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => toggleYear(year)}
                  >
                    {year}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Month Buttons */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">Month:</span>
            <div className="flex gap-2 flex-wrap">
              {MONTHS.map(month => {
                const isSelected = selectedMonths.includes(month.value);
                const isSeasonActive = selectedSeasons.length > 0 && !isComparisonMode;
                return (
                  <Button
                    key={month.value}
                    variant={isSelected ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => toggleMonth(month.value)}
                    disabled={isSeasonActive}
                  >
                    {month.label}
                  </Button>
                );
              })}
            </div>
            {isComparisonMode && selectedMonths.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {selectedMonths.length}/6
              </Badge>
            )}
            {!isComparisonMode && selectedMonths.length === 0 && (
              <span className="text-xs text-muted-foreground ml-2">(All months)</span>
            )}
          </div>

          {/* Season Buttons */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">Season:</span>
            <div className="flex gap-2">
              {Object.entries(SEASONS).map(([key, season]) => {
                const isSelected = selectedSeasons.includes(key);
                const isMonthActive = selectedMonths.length > 0 && !isComparisonMode;
                return (
                  <Button
                    key={key}
                    variant={isSelected ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => toggleSeason(key)}
                    disabled={isMonthActive}
                  >
                    {season.name}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Location Buttons */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">Locatie:</span>
            <div className="flex gap-2">
              {LOCATIONS.map(location => {
                const isSelected = selectedLocations.includes(location.value);
                // Disable "all" in comparison mode
                const isDisabled = isComparisonMode && location.value === 'all';
                // In comparison mode, allow max 2 locations (excluding "all")
                const isMaxReached = isComparisonMode && 
                  selectedLocations.filter(l => l !== 'all').length >= 2 && 
                  !selectedLocations.includes(location.value) &&
                  location.value !== 'all';
                
                return (
                  <Button
                    key={location.value}
                    variant={isSelected ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => toggleLocation(location.value)}
                    disabled={isDisabled || isMaxReached}
                  >
                    {location.label}
                  </Button>
                );
              })}
            </div>
            {isComparisonMode && (
              <Badge variant="secondary" className="ml-2">
                {selectedLocations.filter(l => l !== 'all').length}/2
              </Badge>
            )}
          </div>

          {/* Clear Button */}
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsComparisonMode(false);
                setSelectedYears([2025]); // Default: 2025
                setSelectedMonths([]); // Default: all months
                setSelectedSeasons([]);
                setSelectedLocations(['all']); // Default: all locations
              }}
            >
              Wissen
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Validation Alerts - Show one per year/location combination */}
      {!isComparisonMode && (() => {
        const yearsToShow = selectedYears.length > 0 ? selectedYears : AVAILABLE_YEARS;
        return yearsToShow.flatMap(year => {
          return selectedLocations.map(location => {
          // Get validation for the first available month for this year/location
          const months = selectedMonths.length > 0 ? selectedMonths : 
                        selectedSeasons.length > 0 ? 
                          Array.from(new Set(selectedSeasons.flatMap(s => SEASONS[s as keyof typeof SEASONS].months))).sort((a, b) => a - b) :
                          availableMonths.length > 0 ? availableMonths.sort((a, b) => a - b) : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
          
          const firstMonth = months[0];
          if (!firstMonth) return null;
          
          const key = `${year}-${firstMonth}-${location}`;
          const validation = validationResults[key];
          
          if (!validation) return null;
          
          return (
            <Alert key={`${year}-${location}`} variant={validation.isValid ? 'default' : 'destructive'}>
              {validation.isValid ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <AlertTriangle className="h-4 w-4" />
              )}
              <AlertDescription>
                {validation.isValid ? (
                  `Balance validation passed (Error margin: ${validation.errorMargin.toFixed(2)}%)`
                ) : (
                  <div>
                    <div>Balance validation failed (Error margin: {validation.errorMargin.toFixed(2)}%)</div>
                    <div>Calculated: {formatCurrency(validation.calculatedResult)} | Actual: {formatCurrency(validation.actualResult)}</div>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          );
        });
        });
      })()}
      
      {/* Comparison Mode Validation Alerts */}
      {isComparisonMode && Object.entries(validationResults).map(([key, validation]) => (
        validation && (
          <Alert key={key} variant={validation.isValid ? 'default' : 'destructive'}>
            {validation.isValid ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <AlertTriangle className="h-4 w-4" />
            )}
            <AlertDescription>
              {validation.isValid ? (
                `Balance validation passed (Error margin: ${validation.errorMargin.toFixed(2)}%) - ${key}`
              ) : (
                <div>
                  <div>Balance validation failed (Error margin: {validation.errorMargin.toFixed(2)}%) - {key}</div>
                  <div>Calculated: {formatCurrency(validation.calculatedResult)} | Actual: {formatCurrency(validation.actualResult)}</div>
                </div>
              )}
            </AlertDescription>
          </Alert>
        )
      ))}

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Loading State */}
      {isLoading && (
        <Card>
          <CardContent className="flex justify-center items-center h-40">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading P&L data...</span>
          </CardContent>
        </Card>
      )}

      {/* Comparison Mode: Side-by-side tables */}
      {isComparisonMode && !isLoading && (
        <div className="space-y-6">
          {(() => {
            // Get years to display (if none selected, show all)
            const yearsToShow = selectedYears.length > 0 ? selectedYears : AVAILABLE_YEARS;
            // Get months to display
            const monthsToShow = selectedMonths.length > 0 ? selectedMonths : 
                              selectedSeasons.length > 0 ? 
                                Array.from(new Set(selectedSeasons.flatMap(s => SEASONS[s as keyof typeof SEASONS].months))).sort((a, b) => a - b) :
                                availableMonths.length > 0 ? availableMonths.sort((a, b) => a - b) : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
            // Filter out "all" from selected locations
            const comparisonLocations = selectedLocations.filter(l => l !== 'all');
            
            // Create all (year, month) combinations
            const combinations: Array<{year: number, month: number}> = [];
            yearsToShow.forEach(year => {
              monthsToShow.forEach(month => {
                combinations.push({ year, month });
              });
            });
            
            // Group by month if multiple years, or show as columns
            // If only one year selected, show months as columns with locations side by side
            // If multiple years, show year-month combinations as columns
            
            return combinations.map(({ year, month }) => {
              const locationData = comparisonLocations.map(location => {
                const key = `${year}-${month}-${location}`;
                const data = processedDataByCombination[key] || [];
                const validation = validationResults[key];
                return { location, data, validation, key };
              });

              return (
                <Card key={`${year}-${month}`}>
                  <CardHeader>
                    <CardTitle>
                      {year} - {getMonthLabel(month)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className={`grid grid-cols-1 ${comparisonLocations.length === 2 ? 'lg:grid-cols-2' : comparisonLocations.length === 1 ? 'lg:grid-cols-1' : 'lg:grid-cols-3'} gap-4`}>
                      {locationData.map(({ location, data, validation, key }) => (
                        <div key={location} className="space-y-2">
                          <h3 className="font-semibold text-lg">{getLocationLabel(location)}</h3>
                          {validation && (
                            <Badge variant={validation.isValid ? 'default' : 'destructive'} className="mb-2">
                              {validation.isValid ? '✓ Valid' : '✗ Invalid'}
                            </Badge>
                          )}
                          {renderTable(data, `${year}-${month}-${location}`, validation, [month])}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            });
          })()}
        </div>
      )}

      {/* Single View Mode - Combine all months in one table */}
      {!isComparisonMode && !isLoading && (
        <div className="space-y-6">
          {(() => {
            // If no years selected, show all years
            const yearsToShow = selectedYears.length > 0 ? selectedYears : AVAILABLE_YEARS;
            return yearsToShow.flatMap(year => {
              return selectedLocations.map(location => {
              // Get all months for this year/location combination
              const months = selectedMonths.length > 0 ? selectedMonths : 
                            selectedSeasons.length > 0 ? 
                              Array.from(new Set(selectedSeasons.flatMap(s => SEASONS[s as keyof typeof SEASONS].months))).sort((a, b) => a - b) :
                              availableMonths.length > 0 ? availableMonths.sort((a, b) => a - b) : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
              
              // Collect all raw aggregated data for this year/location across all months
              const allRawData: any[] = [];
              
              // Check if we have a query without month filter (for "All" months)
              const allMonthsQueryIndex = (queryParamsList || []).findIndex((p: any) => 
                p.year === year && p.month === undefined && p.location === location
              );
              
              if (allMonthsQueryIndex >= 0 && queries && queries[allMonthsQueryIndex]) {
                // We have a query that returns all months
                const query = queries[allMonthsQueryIndex];
                if (query.data?.success && query.data.data) {
                  let dataToProcess = query.data.data;
                  
                  // If location is "all", aggregate data from all locations per month
                  if (location === 'all') {
                    // Group by month and sum across all locations
                    const aggregatedByMonth = new Map<number, any>();
                    
                    dataToProcess.forEach((record: any) => {
                      const month = record.month;
                      if (!aggregatedByMonth.has(month)) {
                        // Initialize with structure from first record
                        aggregatedByMonth.set(month, {
                          id: `all-${year}-${month}`,
                          year: record.year,
                          month: month,
                          location_id: 'all',
                          revenue_total: 0,
                          netto_omzet_uit_levering_geproduceerd: 0,
                          netto_omzet_verkoop_handelsgoederen: 0,
                          inkoopwaarde_handelsgoederen: 0,
                          labor_total: 0,
                          labor_contract: 0,
                          labor_flex: 0,
                          other_costs_total: 0,
                          huisvestingskosten: 0,
                          exploitatie_kosten: 0,
                          verkoop_kosten: 0,
                          autokosten: 0,
                          kantoorkosten: 0,
                          assurantiekosten: 0,
                          accountantskosten: 0,
                          administratieve_lasten: 0,
                          andere_kosten: 0,
                          afschrijvingen: 0,
                          financiele_baten_lasten: 0,
                          opbrengst_vorderingen: 0,
                          resultaat: 0,
                        });
                      }
                      
                      const aggregated = aggregatedByMonth.get(month)!;
                      aggregated.revenue_total += (record.revenue_total || 0);
                      aggregated.netto_omzet_uit_levering_geproduceerd += (record.netto_omzet_uit_levering_geproduceerd || 0);
                      aggregated.netto_omzet_verkoop_handelsgoederen += (record.netto_omzet_verkoop_handelsgoederen || 0);
                      aggregated.inkoopwaarde_handelsgoederen += (record.inkoopwaarde_handelsgoederen || 0);
                      aggregated.labor_total += (record.labor_total || record.lonen_en_salarissen || 0);
                      aggregated.labor_contract += (record.labor_contract || 0);
                      aggregated.labor_flex += (record.labor_flex || 0);
                      aggregated.other_costs_total += (record.other_costs_total || 0);
                      aggregated.huisvestingskosten += (record.huisvestingskosten || 0);
                      aggregated.exploitatie_kosten += (record.exploitatie_kosten || 0);
                      aggregated.verkoop_kosten += (record.verkoop_kosten || 0);
                      aggregated.autokosten += (record.autokosten || 0);
                      aggregated.kantoorkosten += (record.kantoorkosten || 0);
                      aggregated.assurantiekosten += (record.assurantiekosten || 0);
                      aggregated.accountantskosten += (record.accountantskosten || 0);
                      aggregated.administratieve_lasten += (record.administratieve_lasten || 0);
                      aggregated.andere_kosten += (record.andere_kosten || 0);
                      aggregated.afschrijvingen += (record.afschrijvingen || 0);
                      aggregated.financiele_baten_lasten += (record.financiele_baten_lasten || 0);
                      aggregated.opbrengst_vorderingen += (record.opbrengst_vorderingen || 0);
                      aggregated.resultaat += (record.resultaat || 0);
                    });
                    
                    dataToProcess = Array.from(aggregatedByMonth.values());
                  }
                  
                  allRawData.push(...dataToProcess);
                }
              } else {
                // We have individual month queries - collect from each
                months.forEach(month => {
                  const queryIndex = (queryParamsList || []).findIndex((p: any) => 
                    p.year === year && p.month === month && p.location === location
                  );
                  if (queryIndex >= 0 && queries && queries[queryIndex]) {
                    const query = queries[queryIndex];
                    if (query.data?.success && query.data.data) {
                      let dataToProcess = query.data.data;
                      
                      // If location is "all", aggregate data from all locations for this month
                      if (location === 'all' && dataToProcess.length > 0) {
                        const aggregated = {
                          id: `all-${year}-${month}`,
                          year: dataToProcess[0].year,
                          month: month,
                          location_id: 'all',
                          revenue_total: 0,
                          netto_omzet_uit_levering_geproduceerd: 0,
                          netto_omzet_verkoop_handelsgoederen: 0,
                          inkoopwaarde_handelsgoederen: 0,
                          labor_total: 0,
                          labor_contract: 0,
                          labor_flex: 0,
                          other_costs_total: 0,
                          huisvestingskosten: 0,
                          exploitatie_kosten: 0,
                          verkoop_kosten: 0,
                          autokosten: 0,
                          kantoorkosten: 0,
                          assurantiekosten: 0,
                          accountantskosten: 0,
                          administratieve_lasten: 0,
                          andere_kosten: 0,
                          afschrijvingen: 0,
                          financiele_baten_lasten: 0,
                          opbrengst_vorderingen: 0,
                          resultaat: 0,
                        };
                        
                        dataToProcess.forEach((record: any) => {
                          aggregated.revenue_total += (record.revenue_total || 0);
                          aggregated.netto_omzet_uit_levering_geproduceerd += (record.netto_omzet_uit_levering_geproduceerd || 0);
                          aggregated.netto_omzet_verkoop_handelsgoederen += (record.netto_omzet_verkoop_handelsgoederen || 0);
                          aggregated.inkoopwaarde_handelsgoederen += (record.inkoopwaarde_handelsgoederen || 0);
                          aggregated.labor_total += (record.labor_total || record.lonen_en_salarissen || 0);
                          aggregated.labor_contract += (record.labor_contract || 0);
                          aggregated.labor_flex += (record.labor_flex || 0);
                          aggregated.other_costs_total += (record.other_costs_total || 0);
                          aggregated.huisvestingskosten += (record.huisvestingskosten || 0);
                          aggregated.exploitatie_kosten += (record.exploitatie_kosten || 0);
                          aggregated.verkoop_kosten += (record.verkoop_kosten || 0);
                          aggregated.autokosten += (record.autokosten || 0);
                          aggregated.kantoorkosten += (record.kantoorkosten || 0);
                          aggregated.assurantiekosten += (record.assurantiekosten || 0);
                          aggregated.accountantskosten += (record.accountantskosten || 0);
                          aggregated.administratieve_lasten += (record.administratieve_lasten || 0);
                          aggregated.andere_kosten += (record.andere_kosten || 0);
                          aggregated.afschrijvingen += (record.afschrijvingen || 0);
                          aggregated.financiele_baten_lasten += (record.financiele_baten_lasten || 0);
                          aggregated.opbrengst_vorderingen += (record.opbrengst_vorderingen || 0);
                          aggregated.resultaat += (record.resultaat || 0);
                        });
                        
                        dataToProcess = [aggregated];
                      }
                      
                      allRawData.push(...dataToProcess);
                    }
                  }
                });
              }
              
              // Process combined data once with all months
              const finalData = allRawData.length > 0 
                ? mapAggregatedToDisplay(allRawData, MONTHS)
                : [];
              
              const validation = validationResults[`${year}-${months[0]}-${location}`]; // Use first month's validation
              
              return (
                <Card key={`${year}-${location}`}>
                  <CardHeader>
                    <CardTitle>
                      W&V Balans - {year} - {getLocationLabel(location)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {renderTable(finalData, `${year}-${location}`, validation, months)}
                  </CardContent>
                </Card>
              );
            });
            });
          })()}
        </div>
      )}
    </div>
  );
}
