"use client";

import { useState, useEffect } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { RefreshCw, X } from "lucide-react";
import { createClient } from "@/integrations/supabase/client";

interface MasterDataUpdateNotificationProps {
  onUpdateMasterData?: () => void;
}

export function MasterDataUpdateNotification({ onUpdateMasterData }: MasterDataUpdateNotificationProps) {
  const [showNotification, setShowNotification] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    // Check for unknown references in sales data
    const checkForUnknownReferences = async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("bork_sales_data")
          .select("category, raw_data")
          .eq("category", "STEP6_PROCESSED_DATA")
          .limit(10);

        if (error) {
          console.error("Error checking for unknown references:", error);
          return;
        }

        // Check if any processed data contains "Unknown" references
        const hasUnknownReferences = data?.some(item => {
          const rawData = item.raw_data;
          if (typeof rawData === 'object' && rawData !== null) {
            return Object.values(rawData).some(value => 
              typeof value === 'string' && value.includes('Unknown')
            );
          }
          return false;
        });

        setShowNotification(hasUnknownReferences || false);
      } catch (error) {
        console.error("Error checking master data status:", error);
      }
    };

    checkForUnknownReferences();
  }, []);

  const handleUpdateMasterData = async () => {
    setIsUpdating(true);
    try {
      // Call the master data sync function
      const supabase = createClient();
      const { data, error } = await supabase.functions.invoke('bork-master-sync', {
        body: { sync_type: 'full' }
      });

      if (error) {
        console.error("Error syncing master data:", error);
        return;
      }

      // Call the parent callback if provided
      if (onUpdateMasterData) {
        onUpdateMasterData();
      }

      // Hide the notification after successful update
      setShowNotification(false);
    } catch (error) {
      console.error("Error updating master data:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDismiss = () => {
    setShowNotification(false);
  };

  if (!showNotification) {
    return null;
  }

  return (
    <Alert className="mb-4 border-yellow-200 bg-yellow-50">
      <RefreshCw className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between">
        <div>
          <strong>Master Data Update Available</strong>
          <p className="text-sm text-muted-foreground mt-1">
            Some sales data contains &quot;Unknown&quot; references. Update master data to improve data quality.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={handleUpdateMasterData}
            disabled={isUpdating}
            className="bg-yellow-600 hover:bg-yellow-700"
          >
            {isUpdating ? (
              <>
                <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                Updating...
              </>
            ) : (
              <>
                <RefreshCw className="h-3 w-3 mr-1" />
                Update Now
              </>
            )}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleDismiss}
            className="text-yellow-700 hover:text-yellow-800"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}

