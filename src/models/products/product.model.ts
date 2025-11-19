/**
 * Product Model
 * Product catalog with workload and MEP (prep) time metrics
 */

export type WorkloadLevel = "low" | "mid" | "high";
export type MEPLevel = "low" | "mid" | "high";
export type CourseType = 
  | "snack"
  | "voorgerecht"
  | "hoofdgerecht"
  | "nagerecht"
  | "bijgerecht"
  | "drank"
  | "overig";

export interface Product {
  _id?: string;
  productName: string;
  category?: string;
  // Workload metrics (for kitchen analysis)
  workloadLevel: WorkloadLevel;
  workloadMinutes: number; // Calculated from workloadLevel (low: 2.5, mid: 5, high: 10)
  // MEP (prep) time metrics (kitchen prep time before service)
  mepLevel: MEPLevel;
  mepMinutes: number; // Calculated from mepLevel (low: 1, mid: 2, high: 4)
  // Course type (for kitchen analysis - optional, only for food items)
  courseType?: CourseType;
  // Metadata
  isActive: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductInput {
  productName: string;
  category?: string;
  workloadLevel: WorkloadLevel;
  mepLevel: MEPLevel;
  courseType?: CourseType;
  notes?: string;
  isActive?: boolean;
}

export interface ProductUpdateInput {
  productName?: string;
  category?: string;
  workloadLevel?: WorkloadLevel;
  mepLevel?: MEPLevel;
  courseType?: CourseType;
  notes?: string;
  isActive?: boolean;
}

// Helper functions to convert levels to minutes
export function getWorkloadMinutes(level: WorkloadLevel): number {
  switch (level) {
    case "low": return 2.5;
    case "mid": return 5;
    case "high": return 10;
    default: return 2.5;
  }
}

export function getMEPMinutes(level: MEPLevel): number {
  switch (level) {
    case "low": return 1;
    case "mid": return 2;
    case "high": return 4;
    default: return 1;
  }
}

