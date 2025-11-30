/**
 * Productivity Goals Utilities (Client-Safe)
 * Pure functions and constants - no MongoDB imports
 * Can be safely imported in client components
 */

import { ProductivityGoals } from '@/models/workforce/productivity.model';

/**
 * Productivity goals and thresholds
 */
export const PRODUCTIVITY_GOALS: ProductivityGoals = {
  productivityThresholds: {
    bad: 45, // Below 45
    notGreat: { min: 45, max: 55 },
    ok: { min: 55, max: 65 },
    great: 65, // 65+
  },
  laborCostThresholds: {
    great: 30, // Below 30%
    ok: { min: 30, max: 32.5 },
    notGood: 32.5, // Above 32.5%
  },
};

/**
 * Apply productivity goals to determine status
 */
export function applyProductivityGoals(
  revenuePerHour: number,
  laborCostPercentage: number
): 'bad' | 'not_great' | 'ok' | 'great' {
  // Determine productivity status
  let productivityStatus: 'bad' | 'not_great' | 'ok' | 'great' = 'bad';
  
  if (revenuePerHour >= PRODUCTIVITY_GOALS.productivityThresholds.great) {
    productivityStatus = 'great';
  } else if (revenuePerHour >= PRODUCTIVITY_GOALS.productivityThresholds.ok.min) {
    productivityStatus = 'ok';
  } else if (revenuePerHour >= PRODUCTIVITY_GOALS.productivityThresholds.notGreat.min) {
    productivityStatus = 'not_great';
  } else {
    productivityStatus = 'bad';
  }
  
  // Determine labor cost status (can override productivity status if very bad)
  if (laborCostPercentage > PRODUCTIVITY_GOALS.laborCostThresholds.notGood) {
    // If labor cost is too high, downgrade status
    if (productivityStatus === 'great') productivityStatus = 'ok';
    else if (productivityStatus === 'ok') productivityStatus = 'not_great';
  } else if (laborCostPercentage < PRODUCTIVITY_GOALS.laborCostThresholds.great) {
    // If labor cost is very good, can upgrade status
    if (productivityStatus === 'not_great') productivityStatus = 'ok';
  }
  
  return productivityStatus;
}

/**
 * Get color class for goal status badge
 */
export function getGoalStatusColor(status?: 'bad' | 'not_great' | 'ok' | 'great'): string {
  switch (status) {
    case 'bad':
      return 'bg-red-100 text-red-800 border-red-300';
    case 'not_great':
      return 'bg-orange-100 text-orange-800 border-orange-300';
    case 'ok':
      return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case 'great':
      return 'bg-green-100 text-green-800 border-green-300';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-300';
  }
}

/**
 * Get label for goal status
 */
export function getGoalStatusLabel(status?: 'bad' | 'not_great' | 'ok' | 'great'): string {
  switch (status) {
    case 'bad':
      return 'Bad';
    case 'not_great':
      return 'Not Great';
    case 'ok':
      return 'OK';
    case 'great':
      return 'Great';
    default:
      return 'Unknown';
  }
}






