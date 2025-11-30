'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Database,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
  Activity,
  Mail,
  Share2,
  Loader2,
  Calendar,
  Clock,
  Server,
  Plug,
  BarChart3,
} from 'lucide-react';
import { useDataStatusViewModel } from '@/viewmodels/settings/useDataStatusViewModel';
import { formatDateDDMMYYTime } from '@/lib/dateFormatters';

function formatRelativeTime(date: Date | string | undefined): string {
  if (!date) return 'Never';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return 'Invalid date';
  
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  return formatDateDDMMYYTime(d);
}

export function DataStatusClient() {
  const {
    databaseStats,
    databaseStatsLastUpdated,
    isLoadingStats,
    databaseIntegrity,
    databaseIntegrityLastUpdated,
    isLoadingIntegrity,
    systemStatus,
    systemStatusLastUpdated,
    isLoadingSystemStatus,
    loginHistory,
    isLoadingLoginHistory,
    loginHistoryPage,
    setLoginHistoryPage,
    loginHistoryLimit,
    triggerReaggregation,
    isReaggregating,
    refreshAll,
  } = useDataStatusViewModel();

  const [activeTab, setActiveTab] = useState('data');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Data & Status</h1>
          <p className="text-muted-foreground">
            Monitor database health, system status, and integrations
          </p>
        </div>
        <Button onClick={refreshAll} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh All
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="data">Data</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="system">System Status</TabsTrigger>
          <TabsTrigger value="history">Login History</TabsTrigger>
        </TabsList>

        {/* Data Tab */}
        <TabsContent value="data" className="space-y-6">
          {/* Active Database Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Database className="h-5 w-5" />
                <span>Active Database</span>
              </CardTitle>
              <CardDescription>MongoDB Atlas connection status</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingStats ? (
                <div className="flex items-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Loading database status...</span>
                </div>
              ) : databaseStats ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Connection Status</span>
                    <Badge
                      variant={
                        databaseStats.connectionStatus === 'connected'
                          ? 'default'
                          : databaseStats.connectionStatus === 'error'
                          ? 'destructive'
                          : 'secondary'
                      }
                    >
                      {databaseStats.connectionStatus === 'connected' && (
                        <CheckCircle className="h-3 w-3 mr-1" />
                      )}
                      {databaseStats.connectionStatus === 'error' && (
                        <XCircle className="h-3 w-3 mr-1" />
                      )}
                      {databaseStats.connectionStatus}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Database Name</span>
                    <span className="text-sm text-muted-foreground">
                      {databaseStats.databaseName}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Last Refresh</span>
                    <span className="text-sm text-muted-foreground">
                      {formatRelativeTime(databaseStats.lastRefresh)}
                    </span>
                  </div>
                  {databaseStatsLastUpdated && (
                    <div className="flex items-center justify-between pt-2 border-t">
                      <span className="text-xs text-muted-foreground">API Last Updated</span>
                      <span className="text-xs text-muted-foreground">
                        {formatRelativeTime(databaseStatsLastUpdated)}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">No data available</div>
              )}
            </CardContent>
          </Card>

          {/* Database Statistics Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center space-x-2">
                    <BarChart3 className="h-5 w-5" />
                    <span>Database Statistics</span>
                  </CardTitle>
                  <CardDescription>Collection counts and record statistics</CardDescription>
                </div>
                {databaseStatsLastUpdated && (
                  <span className="text-xs text-muted-foreground">
                    Updated {formatRelativeTime(databaseStatsLastUpdated)}
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingStats ? (
                <div className="flex items-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Loading statistics...</span>
                </div>
              ) : databaseStats ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2 bg-muted rounded">
                    <span className="text-sm font-medium">Total Records</span>
                    <span className="text-sm font-bold">{databaseStats.totalRecords.toLocaleString()}</span>
                  </div>
                  <div className="space-y-1">
                    {databaseStats.collections.map((collection) => (
                      <div
                        key={collection.name}
                        className="flex items-center justify-between p-2 hover:bg-muted/50 rounded"
                      >
                        <span className="text-sm">{collection.name}</span>
                        <div className="flex items-center space-x-2">
                          {collection.lastRecordDate && (
                            <span className="text-xs text-muted-foreground">
                              {formatRelativeTime(collection.lastRecordDate)}
                            </span>
                          )}
                          <Badge variant="outline">{collection.count.toLocaleString()}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">No statistics available</div>
              )}
            </CardContent>
          </Card>

          {/* Database Integrity Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center space-x-2">
                    <AlertCircle className="h-5 w-5" />
                    <span>Database Integrity</span>
                  </CardTitle>
                  <CardDescription>Check for missing dates and data gaps</CardDescription>
                </div>
                {databaseIntegrityLastUpdated && (
                  <span className="text-xs text-muted-foreground">
                    Updated {formatRelativeTime(databaseIntegrityLastUpdated)}
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingIntegrity ? (
                <div className="flex items-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Checking integrity...</span>
                </div>
              ) : databaseIntegrity ? (
                <div className="space-y-4">
                  {/* Bork Aggregated */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Bork Aggregated</span>
                      <Badge
                        variant={
                          databaseIntegrity.borkAggregated.integrityStatus === 'complete'
                            ? 'default'
                            : databaseIntegrity.borkAggregated.integrityStatus === 'missing_dates'
                            ? 'destructive'
                            : 'secondary'
                        }
                      >
                        {databaseIntegrity.borkAggregated.integrityStatus}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground pl-4">
                      Records: {databaseIntegrity.borkAggregated.totalRecords.toLocaleString()}
                      {databaseIntegrity.borkAggregated.dateRange.min && (
                        <span>
                          {' '}
                          | Range:{' '}
                          {databaseIntegrity.borkAggregated.dateRange.min} to{' '}
                          {databaseIntegrity.borkAggregated.dateRange.max}
                        </span>
                      )}
                      {databaseIntegrity.borkAggregated.missingDates.length > 0 && (
                        <div className="mt-1 text-destructive">
                          Missing {databaseIntegrity.borkAggregated.missingDates.length} date(s)
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Eitje Aggregated */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Eitje Aggregated</span>
                      <Badge
                        variant={
                          databaseIntegrity.eitjeAggregated.integrityStatus === 'complete'
                            ? 'default'
                            : databaseIntegrity.eitjeAggregated.integrityStatus === 'missing_dates'
                            ? 'destructive'
                            : 'secondary'
                        }
                      >
                        {databaseIntegrity.eitjeAggregated.integrityStatus}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground pl-4">
                      Records: {databaseIntegrity.eitjeAggregated.totalRecords.toLocaleString()}
                      {databaseIntegrity.eitjeAggregated.dateRange.min && (
                        <span>
                          {' '}
                          | Range:{' '}
                          {databaseIntegrity.eitjeAggregated.dateRange.min} to{' '}
                          {databaseIntegrity.eitjeAggregated.dateRange.max}
                        </span>
                      )}
                      {databaseIntegrity.eitjeAggregated.missingDates.length > 0 && (
                        <div className="mt-1 text-destructive">
                          Missing {databaseIntegrity.eitjeAggregated.missingDates.length} date(s)
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Products Aggregated */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Products Aggregated</span>
                      <Badge
                        variant={
                          databaseIntegrity.productsAggregated.integrityStatus === 'complete'
                            ? 'default'
                            : 'secondary'
                        }
                      >
                        {databaseIntegrity.productsAggregated.integrityStatus}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground pl-4">
                      Records: {databaseIntegrity.productsAggregated.totalRecords.toLocaleString()}
                      {databaseIntegrity.productsAggregated.lastUpdated && (
                        <span>
                          {' '}
                          | Last updated: {formatRelativeTime(databaseIntegrity.productsAggregated.lastUpdated)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Reaggregate Buttons */}
                  <div className="flex flex-wrap gap-2 pt-4 border-t">
                    <Button
                      onClick={() => triggerReaggregation('products')}
                      disabled={isReaggregating}
                      variant="outline"
                      size="sm"
                    >
                      {isReaggregating ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4 mr-2" />
                      )}
                      Reaggregate Products
                    </Button>
                    <Button
                      onClick={() => triggerReaggregation('sales')}
                      disabled={isReaggregating}
                      variant="outline"
                      size="sm"
                    >
                      {isReaggregating ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4 mr-2" />
                      )}
                      Reaggregate Sales
                    </Button>
                    <Button
                      onClick={() => triggerReaggregation('labor')}
                      disabled={isReaggregating}
                      variant="outline"
                      size="sm"
                    >
                      {isReaggregating ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4 mr-2" />
                      )}
                      Reaggregate Labor
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">No integrity data available</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Integrations Tab */}
        <TabsContent value="integrations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Share2 className="h-5 w-5" />
                <span>Social Media</span>
              </CardTitle>
              <CardDescription>Social media integration status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                Social media integrations coming soon
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Mail className="h-5 w-5" />
                <span>Email</span>
              </CardTitle>
              <CardDescription>Email service integration status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                Email integrations coming soon
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* System Status Tab */}
        <TabsContent value="system" className="space-y-6">
          {/* Bork API Status */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center space-x-2">
                    <Plug className="h-5 w-5" />
                    <span>Bork API</span>
                  </CardTitle>
                  <CardDescription>Bork API connection and cron job status</CardDescription>
                </div>
                {systemStatusLastUpdated && (
                  <span className="text-xs text-muted-foreground">
                    Updated {formatRelativeTime(systemStatusLastUpdated)}
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingSystemStatus ? (
                <div className="flex items-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Loading Bork API status...</span>
                </div>
              ) : systemStatus?.bork ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Connection Status</span>
                    <Badge
                      variant={
                        systemStatus.bork.connectionStatus === 'connected'
                          ? 'default'
                          : systemStatus.bork.connectionStatus === 'error'
                          ? 'destructive'
                          : 'secondary'
                      }
                    >
                      {systemStatus.bork.connectionStatus === 'connected' && (
                        <CheckCircle className="h-3 w-3 mr-1" />
                      )}
                      {systemStatus.bork.connectionStatus}
                    </Badge>
                  </div>
                  {systemStatus.bork.lastSync && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Last Sync</span>
                      <span className="text-sm text-muted-foreground">
                        {formatRelativeTime(systemStatus.bork.lastSync)}
                      </span>
                    </div>
                  )}
                  <div className="space-y-2 pt-2 border-t">
                    <div className="text-sm font-medium">Cron Jobs</div>
                    <div className="space-y-1 pl-4">
                      <div className="flex items-center justify-between text-xs">
                        <span>Daily Data</span>
                        <Badge variant={systemStatus.bork.cronJobs.dailyData.isActive ? 'default' : 'secondary'}>
                          {systemStatus.bork.cronJobs.dailyData.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      {systemStatus.bork.cronJobs.dailyData.lastRun && (
                        <div className="text-xs text-muted-foreground pl-4">
                          Last run: {formatRelativeTime(systemStatus.bork.cronJobs.dailyData.lastRun)}
                        </div>
                      )}
                      <div className="flex items-center justify-between text-xs">
                        <span>Historical Data</span>
                        <Badge variant={systemStatus.bork.cronJobs.historicalData.isActive ? 'default' : 'secondary'}>
                          {systemStatus.bork.cronJobs.historicalData.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span>Master Data</span>
                        <Badge variant={systemStatus.bork.cronJobs.masterData.isActive ? 'default' : 'secondary'}>
                          {systemStatus.bork.cronJobs.masterData.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">No Bork API status available</div>
              )}
            </CardContent>
          </Card>

          {/* Eitje API Status */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center space-x-2">
                    <Plug className="h-5 w-5" />
                    <span>Eitje API</span>
                  </CardTitle>
                  <CardDescription>Eitje API connection and cron job status</CardDescription>
                </div>
                {systemStatusLastUpdated && (
                  <span className="text-xs text-muted-foreground">
                    Updated {formatRelativeTime(systemStatusLastUpdated)}
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingSystemStatus ? (
                <div className="flex items-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Loading Eitje API status...</span>
                </div>
              ) : systemStatus?.eitje ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Connection Status</span>
                    <Badge
                      variant={
                        systemStatus.eitje.connectionStatus === 'connected'
                          ? 'default'
                          : systemStatus.eitje.connectionStatus === 'error'
                          ? 'destructive'
                          : 'secondary'
                      }
                    >
                      {systemStatus.eitje.connectionStatus === 'connected' && (
                        <CheckCircle className="h-3 w-3 mr-1" />
                      )}
                      {systemStatus.eitje.connectionStatus}
                    </Badge>
                  </div>
                  {systemStatus.eitje.lastSync && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Last Sync</span>
                      <span className="text-sm text-muted-foreground">
                        {formatRelativeTime(systemStatus.eitje.lastSync)}
                      </span>
                    </div>
                  )}
                  <div className="space-y-2 pt-2 border-t">
                    <div className="text-sm font-medium">Cron Jobs</div>
                    <div className="space-y-1 pl-4">
                      <div className="flex items-center justify-between text-xs">
                        <span>Daily Data</span>
                        <Badge variant={systemStatus.eitje.cronJobs.dailyData.isActive ? 'default' : 'secondary'}>
                          {systemStatus.eitje.cronJobs.dailyData.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      {systemStatus.eitje.cronJobs.dailyData.lastRun && (
                        <div className="text-xs text-muted-foreground pl-4">
                          Last run: {formatRelativeTime(systemStatus.eitje.cronJobs.dailyData.lastRun)}
                        </div>
                      )}
                      <div className="flex items-center justify-between text-xs">
                        <span>Historical Data</span>
                        <Badge variant={systemStatus.eitje.cronJobs.historicalData.isActive ? 'default' : 'secondary'}>
                          {systemStatus.eitje.cronJobs.historicalData.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span>Master Data</span>
                        <Badge variant={systemStatus.eitje.cronJobs.masterData.isActive ? 'default' : 'secondary'}>
                          {systemStatus.eitje.cronJobs.masterData.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">No Eitje API status available</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Login History Tab */}
        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="h-5 w-5" />
                <span>Login History</span>
              </CardTitle>
              <CardDescription>Recent user login activity</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingLoginHistory ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  <span>Loading login history...</span>
                </div>
              ) : loginHistory ? (
                <div className="space-y-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Timestamp</TableHead>
                        <TableHead>IP Address</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loginHistory.records.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground">
                            No login history available
                          </TableCell>
                        </TableRow>
                      ) : (
                        loginHistory.records.map((entry) => (
                          <TableRow key={entry._id}>
                            <TableCell>
                              {entry.userName || entry.userEmail || entry.userId || 'Unknown'}
                            </TableCell>
                            <TableCell>{formatDateDDMMYYTime(entry.timestamp)}</TableCell>
                            <TableCell>{entry.ipAddress || '-'}</TableCell>
                            <TableCell>
                              <Badge variant={entry.success ? 'default' : 'destructive'}>
                                {entry.success ? 'Success' : 'Failed'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                  {loginHistory.totalPages > 1 && (
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-muted-foreground">
                        Page {loginHistory.page} of {loginHistory.totalPages} ({loginHistory.total} total)
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => setLoginHistoryPage((p) => Math.max(1, p - 1))}
                          disabled={loginHistoryPage === 1}
                          variant="outline"
                          size="sm"
                        >
                          Previous
                        </Button>
                        <Button
                          onClick={() => setLoginHistoryPage((p) => p + 1)}
                          disabled={loginHistoryPage >= loginHistory.totalPages}
                          variant="outline"
                          size="sm"
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">No login history available</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

