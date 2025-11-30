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
  
  const {
    verificationData,
    isLoading,
    error,
    refetch,
    summary,
    finance,
    hours,
  } = useEitjeDataCheckViewModel(dateFilter);
  
  const handleFilterChange = (value: string) => {
    setDateFilter(value as DateFilter);
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
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading verification data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
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
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Eitje Data Check</h1>
            <p className="text-muted-foreground">
              Verify Excel data against aggregated database
            </p>
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Eitje Data Check</h1>
          <p className="text-muted-foreground">
            Verify Excel data from eitje-data-check-30NOV2025/ against aggregated database
          </p>
        </div>
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
          <Button onClick={() => refetch()} variant="outline" size="sm" disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>
      
      {dateFilter !== 'all' && (
        <div className="rounded-md border bg-muted/50 p-3">
          <p className="text-sm text-muted-foreground">
            <strong>Filter Active:</strong> Showing data for <strong>{getFilterLabel(dateFilter)}</strong>
          </p>
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

      {/* Finance Verification */}
      {finance && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Database className="h-5 w-5" />
              <span>Finance Data Verification</span>
            </CardTitle>
            <CardDescription>
              Revenue data from Excel vs eitje_aggregated.totalRevenue
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
                      <TableHead className="text-right">Revenue/Hour</TableHead>
                      <TableHead className="text-right">Labor Cost %</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {finance.verifications.slice(0, 20).map((v, idx) => (
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
                        <TableCell className="text-right">{formatCurrency(v.dbRevenuePerHour)}</TableCell>
                        <TableCell className="text-right">{formatNumber(v.dbLaborCostPercentage)}%</TableCell>
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
                  {finance.discrepancies.slice(0, 10).map((d, idx) => (
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
      )}

      {/* Hours Verification */}
      {hours && (
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
                <Badge variant={hours.discrepancies.length === 0 ? 'default' : 'destructive'}>
                  {hours.discrepancies.length} discrepancy{hours.discrepancies.length !== 1 ? 'ies' : ''}
                </Badge>
              </div>
            </div>

            {hours.verifications.length > 0 && (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Location</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Excel Hours</TableHead>
                      <TableHead className="text-right">DB Hours</TableHead>
                      <TableHead className="text-right">Difference</TableHead>
                      <TableHead className="text-right">% Diff</TableHead>
                      <TableHead className="text-right">Workers</TableHead>
                      <TableHead className="text-right">Teams</TableHead>
                      <TableHead className="text-right">Revenue/Hour</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {hours.verifications.slice(0, 20).map((v, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{v.location}</TableCell>
                        <TableCell>{v.date}</TableCell>
                        <TableCell className="text-right">{formatNumber(v.excelHours, 2)}h</TableCell>
                        <TableCell className="text-right">{formatNumber(v.dbHours, 2)}h</TableCell>
                        <TableCell className={`text-right ${v.difference > 0.5 ? 'text-orange-600' : ''}`}>
                          {formatNumber(v.difference, 2)}h
                        </TableCell>
                        <TableCell className={`text-right ${parseFloat(v.percentDiff) > 5 ? 'text-orange-600' : ''}`}>
                          {v.percentDiff}%
                        </TableCell>
                        <TableCell className="text-right">{v.workerCount}</TableCell>
                        <TableCell className="text-right">{v.teamCount}</TableCell>
                        <TableCell className="text-right">{formatCurrency(v.dbRevenuePerHour)}</TableCell>
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

            {hours.discrepancies.length > 0 && (
              <div className="rounded-md border border-orange-200 bg-orange-50 p-4">
                <h4 className="font-semibold text-orange-900 mb-2 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-2" />
                  Discrepancies ({hours.discrepancies.length})
                </h4>
                <div className="space-y-2">
                  {hours.discrepancies.slice(0, 10).map((d, idx) => (
                    <div key={idx} className="text-sm text-orange-800">
                      <strong>{d.location}</strong> - {d.date}: {d.message}
                    </div>
                  ))}
                  {hours.discrepancies.length > 10 && (
                    <div className="text-sm text-orange-600 italic">
                      ... and {hours.discrepancies.length - 10} more
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

