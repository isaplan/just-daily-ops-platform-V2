/**
 * Clickable Worker Name Component
 * Reusable component for displaying clickable worker names with consistent styling
 */

"use client";

import { useState } from "react";
import { useWorkerProfileSheet } from "@/contexts/WorkerProfileSheetContext";
import { WorkerProfile, getWorkerProfileByName } from "@/lib/services/graphql/queries";
import { cn } from "@/lib/utils";

// Extend WorkerProfile to include teams field
interface WorkerProfileWithTeams extends WorkerProfile {
  teams?: Array<{
    team_id: string;
    team_name: string;
    team_type?: string;
    is_active?: boolean;
  }>;
  teamName?: string | null;
  // Support for different worker data structures
  user_name?: string;
  eitje_user_id?: number;
}

interface ClickableWorkerNameProps {
  worker: WorkerProfileWithTeams | {
    id?: string;
    eitjeUserId?: number;
    eitje_user_id?: number;
    userName?: string | null;
    user_name?: string | null;
    [key: string]: any;
  };
  className?: string;
  showId?: boolean;
}

export function ClickableWorkerName({ worker, className, showId = false }: ClickableWorkerNameProps) {
  const { openWorkerSheet } = useWorkerProfileSheet();
  const [isLoading, setIsLoading] = useState(false);

  // Normalize worker data to handle different structures
  const normalizedWorker: WorkerProfileWithTeams = {
    id: worker.id || String(worker.eitjeUserId || worker.eitje_user_id || ''),
    eitjeUserId: worker.eitjeUserId || worker.eitje_user_id || 0,
    userName: worker.userName || worker.user_name || null,
    locationId: worker.locationId || worker.location_id || null,
    locationName: worker.locationName || worker.location_name || null,
    contractType: worker.contractType || worker.contract_type || null,
    contractHours: worker.contractHours || worker.contract_hours || null,
    hourlyWage: worker.hourlyWage || worker.hourly_wage || null,
    wageOverride: worker.wageOverride || worker.wage_override || false,
    effectiveFrom: worker.effectiveFrom || worker.effective_from || null,
    effectiveTo: worker.effectiveTo || worker.effective_to || null,
    notes: worker.notes || null,
    isActive: worker.isActive !== undefined ? worker.isActive : (worker.is_active !== undefined ? worker.is_active : true),
    createdAt: worker.createdAt || worker.created_at || null,
    updatedAt: worker.updatedAt || worker.updated_at || null,
    teams: worker.teams || null,
    teamName: worker.teamName || worker.team_name || null,
  };

  const displayName = normalizedWorker.userName || `User ${normalizedWorker.eitjeUserId}`;
  const workerId = normalizedWorker.eitjeUserId;

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // If we have a full worker profile with ID, use it directly
    if (normalizedWorker.id && normalizedWorker.eitjeUserId > 0) {
      openWorkerSheet(normalizedWorker);
      return;
    }
    
    // If we only have a name, look up the worker profile using unified_users
    if (normalizedWorker.userName && !normalizedWorker.eitjeUserId) {
      setIsLoading(true);
      try {
        const workerProfile = await getWorkerProfileByName(normalizedWorker.userName);
        if (workerProfile) {
          openWorkerSheet(workerProfile as WorkerProfileWithTeams);
        } else {
          // Fallback: open with what we have (limited data)
          openWorkerSheet(normalizedWorker);
        }
      } catch (error) {
        console.error('[ClickableWorkerName] Error looking up worker:', error);
        // Fallback: open with what we have
        openWorkerSheet(normalizedWorker);
      } finally {
        setIsLoading(false);
      }
    } else {
      // Fallback: open with what we have
      openWorkerSheet(normalizedWorker);
    }
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        "text-left underline cursor-pointer font-medium text-primary",
        "hover:text-primary/80 hover:decoration-primary/80",
        "transition-colors duration-200",
        className
      )}
      type="button"
    >
      {displayName}
      {showId && workerId && (
        <span className="text-xs text-muted-foreground ml-1">({workerId})</span>
      )}
    </button>
  );
}


