'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  FileCheck,
  Database,
  FileSpreadsheet,
  Calendar,
  Clock,
  DollarSign,
  Users,
} from 'lucide-react';
import { useEitjeDataCheckViewModel, DateFilter } from '@/viewmodels/settings/useEitjeDataCheckViewModel';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}

function formatNumber(num: number, decimals: number = 2): string {
  return new Intl.NumberFormat('nl-NL', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
}

export function EitjeDataCheckClient() {
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [activeTab, setActiveTab] = useState('hours');
  
  const {
    verificationData,
    isLoading,
    error,
    refetch,
    summary,
    finance,
    hours,
    dateRange,
    actualDataRange,
    sampleDates,
  } = useEitjeDataCheckViewModel(dateFilter);
  
  const handleFilterChange = (value: string) => {
    // Prevent any default behavior that might cause page reload
    setDateFilter(value as DateFilter);
    // The ViewModel will automatically refetch when dateFilter changes
    // due to the queryKey dependency in useQuery
  };
  
  const getFilterLabel = (filter: DateFilter): string => {
    switch (filter) {
      case 'this-week': return 'This Week';
      case 'this-month': return 'This Month';
      case 'last-month': return 'Last Month';
      case 'this-year': return 'This Year';
      case 'last-year': return 'Last Year';
      case 'all': return 'All Time';
      default: return 'All Time';
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Loading verification data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="pt-20 space-y-1">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Eitje Data Check</h1>
              <p className="text-muted-foreground">
                Verify Excel data against aggregated database
              </p>
            </div>
            <Button onClick={() => refetch()} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <XCircle className="h-5 w-5 text-destructive" />
              <span>Error</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-destructive">
              {error instanceof Error ? error.message : 'Failed to load verification data'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!verificationData || !summary) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="pt-20 space-y-1">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Eitje Data Check</h1>
              <p className="text-muted-foreground">
                Verify Excel data against aggregated database
              </p>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>No Data</CardTitle>
            <CardDescription>No verification data available</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const matchRate = summary.totalVerified > 0
    ? ((summary.matchCount / summary.totalVerified) * 100).toFixed(1)
    : '0';

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="pt-20 space-y-1">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Eitje Data Check</h1>
          <p className="text-muted-foreground">
            Verify Excel data from eitje-data-check-30NOV2025/ against aggregated database
          </p>
        </div>
      </div>
      
      {dateFilter !== 'all' && (
        <div className="rounded-md border bg-muted/50 p-3">
          <p className="text-sm text-muted-foreground">
            <strong>Filter Active:</strong> Showing data for <strong>{getFilterLabel(dateFilter)}</strong>
            {dateRange && (
              <span className="ml-2">
                ({dateRange.start} to {dateRange.end})
              </span>
            )}
          </p>
          {actualDataRange && (
            <p className="text-xs text-muted-foreground mt-1">
              <strong>Data Available:</strong> {actualDataRange.start} to {actualDataRange.end}
            </p>
          )}
          {sampleDates && sampleDates.length > 0 && (
            <details className="mt-2">
              <summary className="text-xs text-muted-foreground cursor-pointer">
                Show sample dates found in Excel files ({sampleDates.length} dates shown)
              </summary>
              <div className="mt-2 text-xs text-muted-foreground font-mono bg-muted p-2 rounded max-h-32 overflow-y-auto">
                {sampleDates.join(', ')}
              </div>
            </details>
          )}
          {summary && summary.totalVerified === 0 && (
            <div className="mt-2 rounded-md border border-orange-200 bg-orange-50 p-2">
              <p className="text-sm text-orange-800">
                <AlertCircle className="h-4 w-4 inline mr-1" />
                No data found for the selected filter. The Excel files contain data from {actualDataRange?.start} to {actualDataRange?.end}.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Verified</CardTitle>
            <FileCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalVerified}</div>
            <p className="text-xs text-muted-foreground">Records checked</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Matches</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{summary.matchCount}</div>
            <p className="text-xs text-muted-foreground">{matchRate}% match rate</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Discrepancies</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{summary.discrepancyCount}</div>
            <p className="text-xs text-muted-foreground">Need attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Files Processed</CardTitle>
            <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(finance?.files || 0) + (hours?.files || 0)}
            </div>
            <p className="text-xs text-muted-foreground">Excel files</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Hours and Finance */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="hours" className="flex items-center space-x-2">
              <Clock className="h-4 w-4" />
              <span>Hours</span>
            </TabsTrigger>
            <TabsTrigger value="finance" className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4" />
              <span>Finance</span>
            </TabsTrigger>
          </TabsList>
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Select value={dateFilter} onValueChange={handleFilterChange}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="this-week">This Week</SelectItem>
                  <SelectItem value="this-month">This Month</SelectItem>
                  <SelectItem value="last-month">Last Month</SelectItem>
                  <SelectItem value="this-year">This Year</SelectItem>
                  <SelectItem value="last-year">Last Year</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button 
              onClick={(e) => {
                e.preventDefault();
                refetch();
              }} 
              variant="outline" 
              size="sm" 
              disabled={isLoading}
              type="button"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Hours Tab */}
        <TabsContent value="hours" className="space-y-6">
          {hours ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Database className="h-5 w-5" />
                  <span>Hours Data Verification</span>
                </CardTitle>
                <CardDescription>
                  Worked hours from Excel vs eitje_aggregated.totalHoursWorked
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <Badge variant="outline">
                      {hours.files} file{hours.files !== 1 ? 's' : ''}
                    </Badge>
                    <Badge variant="outline">
                      {hours.records} record{hours.records !== 1 ? 's' : ''}
                    </Badge>
                    <Badge variant={hours.workerDiscrepancies && hours.workerDiscrepancies.length > 0 ? 'destructive' : 'default'}>
                      {hours.workerDiscrepancies ? hours.workerDiscrepancies.length : 0} worker discrepancy{hours.workerDiscrepancies && hours.workerDiscrepancies.length !== 1 ? 'ies' : ''}
                    </Badge>
                  </div>
                </div>

                {/* November 2025 Diagnostics (after cron job) */}
                {verificationData?.diagnostics?.november2025 && (
                  <div className="rounded-md border border-blue-200 bg-blue-50 p-4">
                    <h4 className="font-semibold text-blue-900 mb-3 flex items-center">
                      <Database className="h-4 w-4 mr-2" />
                      November 2025 Data Check (After Cron Job)
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                      <div>
                        <span className="text-blue-800">Excel Workers:</span>
                        <span className="ml-2 font-semibold">{verificationData.diagnostics.november2025.excelWorkers}</span>
                      </div>
                      <div>
                        <span className="text-blue-800">DB Workers:</span>
                        <span className="ml-2 font-semibold">{verificationData.diagnostics.november2025.dbWorkers}</span>
                      </div>
                      <div>
                        <span className="text-blue-800">Missing Workers:</span>
                        <span className={`ml-2 font-semibold ${verificationData.diagnostics.november2025.missingWorkers > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                          {verificationData.diagnostics.november2025.missingWorkers}
                        </span>
                      </div>
                      <div>
                        <span className="text-blue-800">Raw Data Records:</span>
                        <span className="ml-2 font-semibold">{verificationData.diagnostics.november2025.rawDataRecords}</span>
                      </div>
                      <div>
                        <span className="text-blue-800">Processed Records:</span>
                        <span className="ml-2 font-semibold">{verificationData.diagnostics.november2025.processedRecords}</span>
                      </div>
                      <div>
                        <span className="text-blue-800">Aggregated Records:</span>
                        <span className="ml-2 font-semibold">{verificationData.diagnostics.november2025.aggregatedRecords}</span>
                      </div>
                    </div>
                    {verificationData.diagnostics.november2025.missingWorkers > 0 && (
                      <div className="mt-3">
                        <p className="text-sm font-semibold text-blue-900 mb-1">Missing Worker Names (first 20):</p>
                        <p className="text-sm text-blue-800">
                          {verificationData.diagnostics.november2025.missingWorkerNames.join(', ')}
                          {verificationData.diagnostics.november2025.missingWorkers > 20 && ` ... and ${verificationData.diagnostics.november2025.missingWorkers - 20} more`}
                        </p>
                      </div>
                    )}
                    {verificationData.diagnostics.november2025.rawDataRecords === 0 && (
                      <div className="mt-3 rounded border border-yellow-300 bg-yellow-100 p-2">
                        <p className="text-sm text-yellow-800">
                          ⚠️ No raw data found in eitje_raw_data for November 2025. The cron job may not have synced this data yet.
                        </p>
                      </div>
                    )}
                    {verificationData.diagnostics.november2025.processedRecords === 0 && verificationData.diagnostics.november2025.rawDataRecords > 0 && (
                      <div className="mt-3 rounded border border-yellow-300 bg-yellow-100 p-2">
                        <p className="text-sm text-yellow-800">
                          ⚠️ Raw data exists but no processed records in processed_hours_aggregated. Run the aggregation cron job.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Worker-Level Verification (Per Worker Per Day) - ONLY TABLE */}
                {hours.workerVerifications && hours.workerVerifications.length > 0 ? (
                  <div className="mt-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center">
                      <Users className="h-5 w-5 mr-2" />
                      Worker-Level Hours Verification (Per Worker Per Day)
                      <Badge variant="outline" className="ml-2">
                        {hours.workerVerifications.length} worker{hours.workerVerifications.length !== 1 ? 's' : ''}
                      </Badge>
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      This table shows individual worker hours per day, matching Excel worker records to database worker records.
                    </p>
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Location</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Worker</TableHead>
                            <TableHead>Team</TableHead>
                            <TableHead className="text-right">Excel Hours</TableHead>
                            <TableHead className="text-right">DB Hours</TableHead>
                            <TableHead className="text-right">Difference</TableHead>
                            <TableHead className="text-right">% Diff</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {[...hours.workerVerifications]
                            .filter((v) => {
                              // Only show 2025 dates (and today/before)
                              const recordDate = new Date(v.date);
                              const today = new Date();
                              today.setHours(23, 59, 59, 999); // End of today
                              const year2025 = recordDate.getFullYear() === 2025;
                              const notFuture = recordDate <= today;
                              return year2025 && notFuture;
                            })
                            .sort((a, b) => {
                              // Sort by date descending (newest first), then by location, then by worker
                              const dateCompare = b.date.localeCompare(a.date);
                              if (dateCompare !== 0) return dateCompare;
                              const locationCompare = a.location.localeCompare(b.location);
                              if (locationCompare !== 0) return locationCompare;
                              return a.worker.localeCompare(b.worker);
                            })
                            // Show all 2025 records (no limit for now)
                            .map((v, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="font-medium">{v.location}</TableCell>
                              <TableCell>{v.date}</TableCell>
                              <TableCell>{v.worker}</TableCell>
                              <TableCell>{v.team || 'N/A'}</TableCell>
                              <TableCell className="text-right font-medium">{formatNumber(v.excelHours, 2)}h</TableCell>
                              <TableCell className={`text-right ${!v.foundInDb ? 'text-muted-foreground' : ''}`}>
                                {v.foundInDb ? formatNumber(v.dbHours, 2) + 'h' : 'Not found'}
                              </TableCell>
                              <TableCell className={`text-right ${v.difference > 0.1 ? 'text-orange-600' : ''}`}>
                                {v.foundInDb ? formatNumber(v.difference, 2) + 'h' : 'N/A'}
                              </TableCell>
                              <TableCell className={`text-right ${parseFloat(v.percentDiff) > 1 ? 'text-orange-600' : ''}`}>
                                {v.foundInDb ? v.percentDiff + '%' : 'N/A'}
                              </TableCell>
                              <TableCell>
                                {!v.foundInDb ? (
                                  <Badge variant="outline" className="bg-yellow-50 text-yellow-800 border-yellow-300">
                                    <AlertCircle className="h-3 w-3 mr-1" />
                                    Not in DB
                                  </Badge>
                                ) : v.isMatch ? (
                                  <Badge variant="default" className="bg-green-600">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Match
                                  </Badge>
                                ) : (
                                  <Badge variant="destructive">
                                    <XCircle className="h-3 w-3 mr-1" />
                                    Mismatch
                                  </Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    {(() => {
                      const today = new Date();
                      today.setHours(23, 59, 59, 999);
                      const filtered = hours.workerVerifications.filter((v) => {
                        const recordDate = new Date(v.date);
                        const year2025 = recordDate.getFullYear() === 2025;
                        const notFuture = recordDate <= today;
                        return year2025 && notFuture;
                      });
                      const filteredCount = filtered.length;
                      const notFoundCount = filtered.filter(v => !v.foundInDb).length;
                      const matchCount = filtered.filter(v => v.foundInDb && v.isMatch).length;
                      const mismatchCount = filtered.filter(v => v.foundInDb && !v.isMatch).length;
                      
                      return (
                        <>
                          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">Total Workers (2025):</span>
                              <span className="ml-2 font-semibold">{filteredCount}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Matches:</span>
                              <span className="ml-2 font-semibold text-green-600">{matchCount}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Mismatches:</span>
                              <span className="ml-2 font-semibold text-orange-600">{mismatchCount}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Not in DB:</span>
                              <span className="ml-2 font-semibold text-yellow-600">{notFoundCount}</span>
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground mt-2">
                            Showing all {filteredCount} worker records from 2025 (today and before). Excel is the source of truth - all registered hours are shown.
                          </p>
                        </>
                      );
                    })()}
                  </div>
                ) : (
                  <div className="mt-6 rounded-md border border-yellow-200 bg-yellow-50 p-4">
                    <h3 className="text-lg font-semibold mb-2 flex items-center text-yellow-900">
                      <AlertCircle className="h-5 w-5 mr-2" />
                      Worker-Level Verification Not Available
                    </h3>
                    <p className="text-sm text-yellow-800">
                      No worker-level verification data found. This could mean:
                    </p>
                    <ul className="text-sm text-yellow-800 mt-2 list-disc list-inside space-y-1">
                      <li>Excel files don't contain worker-level data (only daily totals)</li>
                      <li>Worker names in Excel don't match worker names in database</li>
                      <li>No data found in processed_hours_aggregated for the selected date range</li>
                    </ul>
                    <p className="text-sm text-yellow-800 mt-2">
                      Check the daily totals table above for location/date level verification.
                    </p>
                  </div>
                )}

                {hours.workerDiscrepancies && hours.workerDiscrepancies.length > 0 && (
                  <div className="mt-4 rounded-md border border-orange-200 bg-orange-50 p-4">
                    <h4 className="font-semibold text-orange-900 mb-2 flex items-center">
                      <AlertCircle className="h-4 w-4 mr-2" />
                      Worker-Level Discrepancies ({hours.workerDiscrepancies.length})
                    </h4>
                    <ul className="space-y-1 text-sm text-orange-800">
                      {hours.workerDiscrepancies.slice(0, 20).map((d, idx) => (
                        <li key={idx}>• {d.message}</li>
                      ))}
                      {hours.workerDiscrepancies.length > 20 && (
                        <li className="text-orange-600 italic">
                          ... and {hours.workerDiscrepancies.length - 20} more
                        </li>
                      )}
                    </ul>
                  </div>
                )}

              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>No Hours Data</CardTitle>
                <CardDescription>No hours verification data available</CardDescription>
              </CardHeader>
            </Card>
          )}
        </TabsContent>

        {/* Finance Tab */}
        <TabsContent value="finance" className="space-y-6">
          {finance ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Database className="h-5 w-5" />
                  <span>Finance Data Verification</span>
                </CardTitle>
                <CardDescription>
                  Match labor/productivity data from eitje financien Excel files against eitje_aggregated:
                  <br />
                  • Revenue (Excel vs DB totalRevenue)
                  <br />
                  • Revenue per Hour (Excel vs DB revenuePerHour)
                  <br />
                  • Labor Cost % (Excel vs DB laborCostPercentage)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <Badge variant="outline">
                      {finance.files} file{finance.files !== 1 ? 's' : ''}
                    </Badge>
                    <Badge variant="outline">
                      {finance.records} record{finance.records !== 1 ? 's' : ''}
                    </Badge>
                    <Badge variant={finance.discrepancies.length === 0 ? 'default' : 'destructive'}>
                      {finance.discrepancies.length} discrepancy{finance.discrepancies.length !== 1 ? 'ies' : ''}
                    </Badge>
                  </div>
                </div>

                {finance.verifications.length > 0 && (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Location</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead className="text-right">Excel Revenue</TableHead>
                          <TableHead className="text-right">DB Revenue</TableHead>
                          <TableHead className="text-right">Difference</TableHead>
                          <TableHead className="text-right">% Diff</TableHead>
                          <TableHead className="text-right">Excel Rev/Hour</TableHead>
                          <TableHead className="text-right">DB Rev/Hour</TableHead>
                          <TableHead className="text-right">Excel Labor %</TableHead>
                          <TableHead className="text-right">DB Labor %</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {[...finance.verifications]
                          .sort((a, b) => {
                            // Sort by date descending (newest first), then by location
                            const dateCompare = b.date.localeCompare(a.date);
                            return dateCompare !== 0 ? dateCompare : a.location.localeCompare(b.location);
                          })
                          .slice(0, 20)
                          .map((v, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">{v.location}</TableCell>
                            <TableCell>{v.date}</TableCell>
                            <TableCell className="text-right">{formatCurrency(v.excelRevenue)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(v.dbRevenue)}</TableCell>
                            <TableCell className={`text-right ${v.difference > 1 ? 'text-orange-600' : ''}`}>
                              {formatCurrency(v.difference)}
                            </TableCell>
                            <TableCell className={`text-right ${parseFloat(v.percentDiff) > 1 ? 'text-orange-600' : ''}`}>
                              {v.percentDiff}%
                            </TableCell>
                            <TableCell className={`text-right ${v.revenuePerHourMatch === false ? 'text-orange-600' : ''}`}>
                              {v.excelRevenuePerHour ? formatCurrency(v.excelRevenuePerHour) : 'N/A'}
                            </TableCell>
                            <TableCell className={`text-right ${v.revenuePerHourMatch === false ? 'text-orange-600' : ''}`}>
                              {formatCurrency(v.dbRevenuePerHour)}
                            </TableCell>
                            <TableCell className={`text-right ${v.laborCostPercentMatch === false ? 'text-orange-600' : ''}`}>
                              {v.excelLaborCostPercentage ? formatNumber(v.excelLaborCostPercentage) : 'N/A'}%
                            </TableCell>
                            <TableCell className={`text-right ${v.laborCostPercentMatch === false ? 'text-orange-600' : ''}`}>
                              {formatNumber(v.dbLaborCostPercentage)}%
                            </TableCell>
                            <TableCell>
                              {v.isMatch ? (
                                <Badge variant="default" className="bg-green-600">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Match
                                </Badge>
                              ) : (
                                <Badge variant="destructive">
                                  <XCircle className="h-3 w-3 mr-1" />
                                  Mismatch
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {finance.discrepancies.length > 0 && (
                  <div className="rounded-md border border-orange-200 bg-orange-50 p-4">
                    <h4 className="font-semibold text-orange-900 mb-2 flex items-center">
                      <AlertCircle className="h-4 w-4 mr-2" />
                      Discrepancies ({finance.discrepancies.length})
                    </h4>
                    <div className="space-y-2">
                      {[...finance.discrepancies]
                        .sort((a, b) => {
                          // Sort by date descending (newest first), then by location
                          const dateA = a.date || '';
                          const dateB = b.date || '';
                          const dateCompare = dateB.localeCompare(dateA);
                          return dateCompare !== 0 ? dateCompare : (a.location || '').localeCompare(b.location || '');
                        })
                        .slice(0, 10)
                        .map((d, idx) => (
                        <div key={idx} className="text-sm text-orange-800">
                          <strong>{d.location}</strong> - {d.date}: {d.message}
                        </div>
                      ))}
                      {finance.discrepancies.length > 10 && (
                        <div className="text-sm text-orange-600 italic">
                          ... and {finance.discrepancies.length - 10} more
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>No Finance Data</CardTitle>
                <CardDescription>
                  {finance && finance.files === 0 
                    ? 'No finance Excel files found. Make sure files contain "financien" in the filename.'
                    : finance && finance.filteredRecords === 0
                    ? `No finance records match the selected date filter. Found ${finance.records} total records in ${finance.files} file(s).`
                    : 'No finance verification data available. Check console logs for details.'
                  }
                </CardDescription>
              </CardHeader>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

