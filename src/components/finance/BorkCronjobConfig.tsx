"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, Save, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SyncConfig {
  id?: string;
  mode: 'active' | 'paused';
  sync_interval_minutes: number;
  sync_hour: number;
  enabled_locations: string[];
}

export function BorkCronjobConfig() {
  const { toast } = useToast();
  const [config, setConfig] = useState<SyncConfig>({
    mode: 'paused',
    sync_interval_minutes: 1440,
    sync_hour: 6,
    enabled_locations: []
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [locations, setLocations] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    loadConfig();
    loadLocations();
  }, []);

  const loadConfig = async () => {
    try {
      const response = await fetch('/api/bork/sync-config');
      const result = await response.json();
      
      if (result.success && result.data) {
        setConfig(result.data);
      }
    } catch (error) {
      console.error('Error loading config:', error);
      toast({
        title: "Error",
        description: "Failed to load sync configuration",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadLocations = async () => {
    try {
      const response = await fetch('/api/locations');
      const result = await response.json();
      
      if (result.success && result.data) {
        setLocations(result.data);
      }
    } catch (error) {
      console.error('Error loading locations:', error);
    }
  };

  const saveConfig = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/bork/sync-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Success",
          description: `Sync ${config.mode === 'active' ? 'activated' : 'paused'} successfully`,
        });
      } else {
        throw new Error(result.error || 'Failed to save config');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save configuration",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleMode = () => {
    setConfig(prev => ({
      ...prev,
      mode: prev.mode === 'active' ? 'paused' : 'active'
    }));
  };

  const syncFrequencies = [
    { value: 60, label: 'Every Hour' },
    { value: 360, label: 'Every 6 Hours' },
    { value: 1440, label: 'Daily' }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cronjob Scheduling</CardTitle>
        <CardDescription>
          Configure automated Bork data synchronization
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading ? (
          <div className="flex justify-center items-center h-40">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Status Toggle */}
            <div className="space-y-2">
              <Label>Status</Label>
              <div className="flex items-center gap-3">
                <Badge variant={config.mode === 'active' ? 'default' : 'secondary'}>
                  {config.mode === 'active' ? 'Active' : 'Paused'}
                </Badge>
                <Button
                  variant={config.mode === 'active' ? 'destructive' : 'default'}
                  size="sm"
                  onClick={toggleMode}
                  disabled={saving}
                >
                  {config.mode === 'active' ? (
                    <>
                      <Pause className="h-4 w-4 mr-2" />
                      Pause
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Start
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Sync Frequency */}
            <div className="space-y-2">
              <Label>Sync Frequency</Label>
              <Select
                value={config.sync_interval_minutes.toString()}
                onValueChange={(value) => setConfig(prev => ({
                  ...prev,
                  sync_interval_minutes: parseInt(value)
                }))}
                disabled={saving}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {syncFrequencies.map(freq => (
                    <SelectItem key={freq.value} value={freq.value.toString()}>
                      {freq.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Note: Cron job runs hourly. Frequency setting affects sync range.
              </p>
            </div>

            {/* Sync Hour (for daily syncs) */}
            {config.sync_interval_minutes >= 1440 && (
              <div className="space-y-2">
                <Label>Sync Hour (UTC)</Label>
                <Select
                  value={config.sync_hour.toString()}
                  onValueChange={(value) => setConfig(prev => ({
                    ...prev,
                    sync_hour: parseInt(value)
                  }))}
                  disabled={saving}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 24 }, (_, i) => (
                      <SelectItem key={i} value={i.toString()}>
                        {String(i).padStart(2, '0')}:00
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Save Button */}
            <div className="flex justify-end">
              <Button onClick={saveConfig} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Configuration
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

