"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, CheckCircle, XCircle, Clock, Loader2 } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

interface SyncHistoryItem {
  id: string;
  provider: 'bork' | 'eitje';
  location: string;
  locationId: string;
  syncType: string;
  status: string;
  success: boolean;
  recordsInserted: number;
  errorMessage?: string;
  startedAt: string;
  completedAt?: string;
  duration?: number;
}

interface CronStatus {
  bork: boolean;
  eitje: boolean;
}

interface SyncHistoryData {
  history: SyncHistoryItem[];
  cronStatus: CronStatus;
  total: number;
}

export function CronSyncHistory() {
  const [history, setHistory] = useState<SyncHistoryItem[]>([]);
  const [cronStatus, setCronStatus] = useState<CronStatus>({ bork: false, eitje: false });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/cron/sync-history?limit=10');
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch sync history');
      }

      const data: SyncHistoryData = result.data;
      setHistory(data.history);
      setCronStatus(data.cronStatus);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error fetching sync history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
    // Refresh every 30 seconds
    const interval = setInterval(fetchHistory, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatDuration = (ms: number | null) => {
    if (!ms) return '-';
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  const getStatusBadge = (item: SyncHistoryItem) => {
    if (item.status === 'completed' && item.success) {
      return <Badge variant="default" className="bg-green-500">Success</Badge>;
    }
    if (item.status === 'failed' || item.errorMessage) {
      return <Badge variant="destructive">Failed</Badge>;
    }
    if (item.status === 'running' || item.status === 'pending') {
      return <Badge variant="secondary">Running</Badge>;
    }
    return <Badge variant="outline">{item.status}</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Cron Job Sync History</CardTitle>
            <CardDescription>
              Last 10 automated syncs from Bork and Eitje
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex gap-2 text-sm">
              <Badge variant={cronStatus.bork ? "default" : "secondary"}>
                Bork: {cronStatus.bork ? "Active" : "Inactive"}
              </Badge>
              <Badge variant={cronStatus.eitje ? "default" : "secondary"}>
                Eitje: {cronStatus.eitje ? "Active" : "Inactive"}
              </Badge>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchHistory}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading && history.length === 0 ? (
          <div className="flex justify-center items-center h-40">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="text-center text-red-500 p-4">{error}</div>
        ) : history.length === 0 ? (
          <div className="text-center text-muted-foreground p-4">
            No sync history found. Cron jobs may not have run yet.
          </div>
        ) : (
          <div className="space-y-2">
            {history.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
              >
                <div className="flex items-center gap-3 flex-1">
                  <div>
                    {item.success ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="uppercase">
                        {item.provider}
                      </Badge>
                      <span className="font-medium">{item.location}</span>
                      {getStatusBadge(item)}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {item.recordsInserted > 0 && (
                        <span>{item.recordsInserted.toLocaleString()} records • </span>
                      )}
                      {item.startedAt && (
                        <span>
                          {formatDistanceToNow(new Date(item.startedAt), { addSuffix: true })}
                        </span>
                      )}
                      {item.duration && (
                        <span> • {formatDuration(item.duration)}</span>
                      )}
                    </div>
                    {item.errorMessage && (
                      <div className="text-xs text-red-500 mt-1">
                        {item.errorMessage}
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  {item.startedAt && format(new Date(item.startedAt), 'HH:mm:ss')}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

