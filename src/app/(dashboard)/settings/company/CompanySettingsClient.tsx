'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Save, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { updateCompanySettings } from '@/lib/services/graphql/mutations';
import { clearWorkingDayCache } from '@/lib/utils/working-day-cache';

interface CompanySettingsClientProps {
  initialSettings: {
    id: string;
    workingDayStartHour: number;
  };
}

export function CompanySettingsClient({ initialSettings }: CompanySettingsClientProps) {
  const [workingDayStartHour, setWorkingDayStartHour] = useState(initialSettings.workingDayStartHour);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (workingDayStartHour < 0 || workingDayStartHour > 23) {
      toast.error('Working day start hour must be between 0 and 23');
      return;
    }

    setIsSaving(true);
    try {
      await updateCompanySettings(workingDayStartHour);
      clearWorkingDayCache(); // Clear cache so new setting is used immediately
      toast.success('Company settings saved successfully');
    } catch (error: any) {
      console.error('[Company Settings] Error saving:', error);
      toast.error(error.message || 'Failed to save company settings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Company Settings</h1>
        <p className="text-muted-foreground mt-2">
          Configure company-wide settings that affect data calculations and reporting
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Working Hours
          </CardTitle>
          <CardDescription>
            Configure when your working day starts. This affects how revenue and hours are attributed to days.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertDescription>
              <strong>Working Day Rule:</strong> Your working day starts at the configured hour and ends at (hour-1):59:59 the next day.
              <br />
              Example: If set to 6 (06:00), a working day runs from 06:00 to 05:59:59 the next day.
              <br />
              This ensures revenue and hours from late-night shifts (e.g., 22:00-02:00) are attributed to the correct working day.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="workingDayStartHour">Working Day Start Hour</Label>
            <div className="flex items-center gap-4">
              <Input
                id="workingDayStartHour"
                type="number"
                min="0"
                max="23"
                value={workingDayStartHour}
                onChange={(e) => setWorkingDayStartHour(parseInt(e.target.value) || 0)}
                className="w-32"
              />
              <span className="text-sm text-muted-foreground">
                (0-23, current: {String(workingDayStartHour).padStart(2, '0')}:00)
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              Enter the hour when your working day starts (0 = midnight, 6 = 06:00, 23 = 23:00)
            </p>
          </div>

          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Settings
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

