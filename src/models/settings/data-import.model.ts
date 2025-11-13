/**
 * Settings Data Import Model Layer
 * Type definitions for data import settings
 */

export interface ImportConfig {
  id: string;
  name: string;
  source: string;
  frequency: string;
  lastImport?: string;
  isActive: boolean;
}




