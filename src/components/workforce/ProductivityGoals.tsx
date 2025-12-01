/**
 * Productivity Goals Component
 * Displays productivity goals and thresholds with visual indicators
 */

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ProductivityGoalsProps {
  revenuePerHour?: number;
  laborCostPercentage?: number;
  goalStatus?: 'bad' | 'not_great' | 'ok' | 'great';
  className?: string;
}

export function ProductivityGoals({
  revenuePerHour,
  laborCostPercentage,
  goalStatus,
  className,
}: ProductivityGoalsProps) {
  const getGoalStatusColor = (status?: 'bad' | 'not_great' | 'ok' | 'great') => {
    switch (status) {
      case 'bad': return 'bg-red-100 text-red-800 border-red-300';
      case 'not_great': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'ok': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'great': return 'bg-green-100 text-green-800 border-green-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getGoalStatusLabel = (status?: 'bad' | 'not_great' | 'ok' | 'great') => {
    switch (status) {
      case 'bad': return 'Bad';
      case 'not_great': return 'Not Great';
      case 'ok': return 'OK';
      case 'great': return 'Great';
      default: return 'Unknown';
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div className="text-sm font-semibold">Goals & Thresholds</div>
      
      <div className="grid grid-cols-2 gap-4">
        {/* Productivity Thresholds */}
        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground">Productivity (Revenue/Hour)</div>
          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-2">
              <Badge className="bg-red-100 text-red-800 border-red-300">Bad</Badge>
              <span className="text-muted-foreground">Below 45</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-orange-100 text-orange-800 border-orange-300">Not Great</Badge>
              <span className="text-muted-foreground">45 - 55</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">OK</Badge>
              <span className="text-muted-foreground">55 - 65</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-green-100 text-green-800 border-green-300">Great</Badge>
              <span className="text-muted-foreground">65+</span>
            </div>
          </div>
        </div>
        
        {/* Labor Cost Thresholds */}
        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground">Labor Cost %</div>
          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-2">
              <Badge className="bg-green-100 text-green-800 border-green-300">Great</Badge>
              <span className="text-muted-foreground">Below 30%</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">OK</Badge>
              <span className="text-muted-foreground">30 - 32.5%</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-red-100 text-red-800 border-red-300">Not Good</Badge>
              <span className="text-muted-foreground">Above 32.5%</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Current Status */}
      {(revenuePerHour !== undefined || laborCostPercentage !== undefined) && (
        <div className="pt-4 border-t">
          <div className="text-xs font-medium text-muted-foreground mb-2">Current Status</div>
          <div className="flex items-center gap-4">
            {revenuePerHour !== undefined && (
              <div className="text-sm">
                Revenue/Hour: <span className="font-semibold">€{revenuePerHour.toFixed(2)}</span>
              </div>
            )}
            {laborCostPercentage !== undefined && (
              <div className="text-sm">
                Labor Cost: <span className="font-semibold">{laborCostPercentage.toFixed(1)}%</span>
              </div>
            )}
            {goalStatus && (
              <Badge className={cn("border", getGoalStatusColor(goalStatus))}>
                {getGoalStatusLabel(goalStatus)}
              </Badge>
            )}
          </div>
        </div>
      )}
    </div>
  );
}













