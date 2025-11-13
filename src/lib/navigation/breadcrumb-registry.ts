/**
 * Breadcrumb Registry
 * Centralized registry for breadcrumb metadata from layouts
 */

export interface BreadcrumbMetadata {
  label: string;
  subtitle?: string;
  parentPath?: string;
  parentLabel?: string;
}

export type BreadcrumbRegistry = Record<string, BreadcrumbMetadata>;

/**
 * Centralized breadcrumb metadata registry
 * This should be populated by layouts as they mount
 */
const breadcrumbRegistry: BreadcrumbRegistry = {};

/**
 * Register breadcrumb metadata for a path
 */
export function registerBreadcrumb(path: string, metadata: BreadcrumbMetadata): void {
  breadcrumbRegistry[path] = metadata;
}

/**
 * Get breadcrumb metadata for a path
 */
export function getBreadcrumb(path: string): BreadcrumbMetadata | undefined {
  return breadcrumbRegistry[path];
}

/**
 * Get breadcrumb path segments
 */
export function getBreadcrumbSegments(path: string): Array<{ path: string; label: string }> {
  const segments: Array<{ path: string; label: string }> = [];
  const parts = path.split('/').filter(Boolean);
  
  let currentPath = '';
  for (const part of parts) {
    currentPath += `/${part}`;
    const metadata = getBreadcrumb(currentPath);
    if (metadata) {
      segments.push({
        path: currentPath,
        label: metadata.label,
      });
    }
  }
  
  return segments;
}

/**
 * Initialize breadcrumb registry with known layouts
 * This is a fallback - layouts should register themselves
 */
export function initializeBreadcrumbRegistry(): void {
  // Data Finance
  registerBreadcrumb('/data/finance', {
    label: 'Finance Data',
    subtitle: 'View and analyze financial data',
  });
  registerBreadcrumb('/data/finance/pnl-balance', {
    label: 'PNL Balance',
    subtitle: 'View PNL balance data',
    parentPath: '/data/finance',
    parentLabel: 'Finance Data',
  });
  registerBreadcrumb('/data/finance/data-view', {
    label: 'Data View',
    subtitle: 'View raw financial data',
    parentPath: '/data/finance',
    parentLabel: 'Finance Data',
  });

  // Workforce V2
  registerBreadcrumb('/data/workforce', {
    label: 'Workforce V2',
    subtitle: 'View and manage workforce data (Hours and Workers)',
  });
  registerBreadcrumb('/data/workforce/hours', {
    label: 'Hours',
    subtitle: 'View processed and aggregated hours data from Eitje',
    parentPath: '/data/workforce',
    parentLabel: 'Workforce V2',
  });
  registerBreadcrumb('/data/workforce/workers', {
    label: 'Workers',
    subtitle: 'Manage editable hourly wages, contract types, and contract hours',
    parentPath: '/data/workforce',
    parentLabel: 'Workforce V2',
  });

  // Finance Eitje Data
  registerBreadcrumb('/finance/data/eitje-data', {
    label: 'Eitje Data',
    subtitle: 'Select a section to view detailed data',
  });
  registerBreadcrumb('/finance/data/eitje-data/hours', {
    label: 'Hours',
    subtitle: 'View time registration shifts and labor hours data from Eitje',
    parentPath: '/finance/data/eitje-data',
    parentLabel: 'Eitje Data',
  });
  registerBreadcrumb('/finance/data/eitje-data/workers', {
    label: 'Workers',
    subtitle: 'View employee information from Eitje',
    parentPath: '/finance/data/eitje-data',
    parentLabel: 'Eitje Data',
  });
  registerBreadcrumb('/finance/data/eitje-data/finance', {
    label: 'Sales by Bork',
    subtitle: 'View sales and revenue data from Bork (via Eitje integration)',
    parentPath: '/finance/data/eitje-data',
    parentLabel: 'Eitje Data',
  });
}

// Initialize on module load
if (typeof window !== 'undefined') {
  initializeBreadcrumbRegistry();
}



