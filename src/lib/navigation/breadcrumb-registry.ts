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

  // Data Labor
  registerBreadcrumb('/data/labor', {
    label: 'Labor',
    subtitle: 'View and manage labor data (Hours, Costs, Workers, Planning)',
  });
  registerBreadcrumb('/data/labor/hours', {
    label: 'Hours',
    subtitle: 'View processed and aggregated hours data from Eitje',
    parentPath: '/data/labor',
    parentLabel: 'Labor',
  });
  registerBreadcrumb('/data/labor/costs', {
    label: 'Labor Costs',
    subtitle: 'Calculate and view labor costs per year, month, week, day, and hour',
    parentPath: '/data/labor',
    parentLabel: 'Labor',
  });
  registerBreadcrumb('/data/labor/workers', {
    label: 'Workers',
    subtitle: 'Manage editable hourly wages, contract types, and contract hours',
    parentPath: '/data/labor',
    parentLabel: 'Labor',
  });
  registerBreadcrumb('/data/labor/productivity', {
    label: 'Productivity',
    subtitle: 'View productivity metrics by location, division, team, and worker',
    parentPath: '/data/labor',
    parentLabel: 'Labor',
  });
  registerBreadcrumb('/data/labor/productivity/by-location', {
    label: 'By Location',
    subtitle: 'Productivity metrics grouped by location',
    parentPath: '/data/labor/productivity',
    parentLabel: 'Productivity',
  });
  registerBreadcrumb('/data/labor/productivity/by-division', {
    label: 'By Division',
    subtitle: 'Productivity metrics grouped by division (Food/Beverage/Management)',
    parentPath: '/data/labor/productivity',
    parentLabel: 'Productivity',
  });
  registerBreadcrumb('/data/labor/productivity/by-team', {
    label: 'By Team',
    subtitle: 'Productivity metrics grouped by team category',
    parentPath: '/data/labor/productivity',
    parentLabel: 'Productivity',
  });
  registerBreadcrumb('/data/labor/productivity/by-worker', {
    label: 'By Worker',
    subtitle: 'Productivity metrics per worker per day',
    parentPath: '/data/labor/productivity',
    parentLabel: 'Productivity',
  });
  registerBreadcrumb('/data/labor/locations-teams', {
    label: 'Locations & Teams',
    subtitle: 'View workers by location, team, and contract type',
    parentPath: '/data/labor',
    parentLabel: 'Labor',
  });
  registerBreadcrumb('/data/labor/productivity', {
    label: 'Productivity',
    subtitle: 'View productivity metrics by location, division, team, and worker',
    parentPath: '/data/labor',
    parentLabel: 'Labor',
  });
  registerBreadcrumb('/data/labor/productivity/by-location', {
    label: 'By Location',
    subtitle: 'Productivity metrics grouped by location',
    parentPath: '/data/labor/productivity',
    parentLabel: 'Productivity',
  });
  registerBreadcrumb('/data/labor/productivity/by-division', {
    label: 'By Division',
    subtitle: 'Productivity metrics grouped by division (Food/Beverage/Management)',
    parentPath: '/data/labor/productivity',
    parentLabel: 'Productivity',
  });
  registerBreadcrumb('/data/labor/productivity/by-team', {
    label: 'By Team',
    subtitle: 'Productivity metrics grouped by team category',
    parentPath: '/data/labor/productivity',
    parentLabel: 'Productivity',
  });
  registerBreadcrumb('/data/labor/productivity/by-worker', {
    label: 'By Worker',
    subtitle: 'Productivity metrics per worker per day',
    parentPath: '/data/labor/productivity',
    parentLabel: 'Productivity',
  });

  // Daily Ops
  registerBreadcrumb('/daily-ops', {
    label: 'Daily Ops',
    subtitle: 'Daily operations dashboard and analytics',
  });
  registerBreadcrumb('/daily-ops/labor', {
    label: 'Labor',
    subtitle: 'Labor operations dashboard with KPIs and analytics',
    parentPath: '/daily-ops',
    parentLabel: 'Daily Ops',
  });
  registerBreadcrumb('/daily-ops/keuken-analyses', {
    label: 'Keuken Analyses',
    subtitle: 'Kitchen analysis and performance metrics',
    parentPath: '/daily-ops',
    parentLabel: 'Daily Ops',
  });

  // Data Sales
  registerBreadcrumb('/data/sales', {
    label: 'Sales',
    subtitle: 'View and manage sales data',
  });
registerBreadcrumb('/data/sales/daily', {
  label: 'Daily Sales',
  subtitle: 'View sales data from Bork POS system',
  parentPath: '/data/sales',
  parentLabel: 'Sales',
});

registerBreadcrumb('/data/sales/daily/waiters', {
  label: 'Waiter Performance',
  subtitle: 'Sales performance metrics per waiter',
  parentPath: '/data/sales/daily',
  parentLabel: 'Daily Sales',
});

registerBreadcrumb('/data/sales/daily/revenue', {
  label: 'Revenue Analysis',
  subtitle: 'Revenue breakdown by date and location',
  parentPath: '/data/sales/daily',
  parentLabel: 'Daily Sales',
});

registerBreadcrumb('/data/sales/daily/payment-methods', {
  label: 'Payment Methods',
  subtitle: 'Payment method statistics and breakdown',
  parentPath: '/data/sales/daily',
  parentLabel: 'Daily Sales',
});

registerBreadcrumb('/data/sales/daily/categories-products', {
  label: 'Categories & Products',
  subtitle: 'Sales analysis by categories and products',
  parentPath: '/data/sales/daily',
  parentLabel: 'Daily Sales',
});

registerBreadcrumb('/daily-ops/labor/products', {
  label: 'Product Performance',
  subtitle: 'Product sales performance and metrics',
  parentPath: '/daily-ops/labor',
  parentLabel: 'Labor',
});

registerBreadcrumb('/daily-ops/labor/time-analysis', {
  label: 'Time-Based Analysis',
  subtitle: 'Sales patterns by hour of day',
  parentPath: '/daily-ops/labor',
  parentLabel: 'Labor',
});

registerBreadcrumb('/daily-ops/labor/tables', {
  label: 'Table Analysis',
  subtitle: 'Table performance and metrics',
  parentPath: '/daily-ops/labor',
  parentLabel: 'Labor',
});

registerBreadcrumb('/daily-ops/labor/transactions', {
  label: 'Transaction Analysis',
  subtitle: 'Transaction-level analysis and insights',
  parentPath: '/daily-ops/labor',
  parentLabel: 'Labor',
});

// Products Management (Operations)
registerBreadcrumb('/operations/products/catalog', {
  label: 'Product Catalog',
  subtitle: 'Manage products, workload, MEP time, and course types with advanced filters',
  parentPath: '/operations/products',
  parentLabel: 'Products',
});

registerBreadcrumb('/operations/products', {
  label: 'Products',
  subtitle: 'Manage products and product catalog',
  parentPath: '/operations',
  parentLabel: 'Operations',
});

// Operations
registerBreadcrumb('/operations', {
  label: 'Operations',
  subtitle: 'Manage products, menus, and operational settings',
});

// Operations - Menus
registerBreadcrumb('/operations/menus', {
  label: 'Manage Menus',
  subtitle: 'Create and manage menu cards with products and date ranges',
  parentPath: '/operations',
  parentLabel: 'Operations',
});

// Operations - Events & Promotions
registerBreadcrumb('/operations/events-promotions', {
  label: 'Events & Promotions',
  subtitle: 'Manage events and promotions',
  parentPath: '/operations',
  parentLabel: 'Operations',
});

registerBreadcrumb('/operations/events-promotions/events', {
  label: 'Events',
  subtitle: 'Create and manage events with support for single and repeating events',
  parentPath: '/operations/events-promotions',
  parentLabel: 'Events & Promotions',
});

registerBreadcrumb('/operations/events-promotions/socials', {
  label: 'Socials',
  subtitle: 'Instagram Promotions',
  parentPath: '/operations/events-promotions',
  parentLabel: 'Events & Promotions',
});

  // Workforce V2 (for backwards compatibility)
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

  // Settings
  registerBreadcrumb('/settings/products', {
    label: 'Product Catalog',
    subtitle: 'Manage products with workload and MEP (prep) time metrics',
    parentPath: '/settings',
    parentLabel: 'Settings',
  });
  
  registerBreadcrumb('/settings/menus', {
    label: 'Manage Menus',
    subtitle: 'Create and manage menu cards with products and date ranges',
    parentPath: '/settings',
    parentLabel: 'Settings',
  });
}

// Initialize immediately - this is static data, safe for SSR
initializeBreadcrumbRegistry();


