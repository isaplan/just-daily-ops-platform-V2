/**
 * Menu Model
 * Menu cards with products and date ranges
 */

export interface MenuProduct {
  productName: string;
  price: number; // Price on this menu
  dateAdded: Date; // When product was added to menu
  dateRemoved?: Date; // When product was removed (if applicable)
}

export interface Menu {
  _id?: string;
  title: string;
  startDate: Date;
  endDate: Date;
  locationId?: string; // Location this menu is for
  productIds: string[]; // Product names assigned to this menu (legacy - for backward compatibility)
  productPrices: MenuProduct[]; // Products with prices on this menu
  isActive: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MenuInput {
  title: string;
  startDate: Date;
  endDate?: Date; // Optional - can be auto-calculated
  productIds?: string[];
  notes?: string;
  isActive?: boolean;
}

export interface MenuUpdateInput {
  title?: string;
  startDate?: Date;
  endDate?: Date;
  productIds?: string[];
  notes?: string;
  isActive?: boolean;
}

export interface MenuWithProducts extends Menu {
  products: Array<{
    productName: string;
    category?: string;
  }>;
}

/**
 * Calculate end date as day before next menu starts
 */
export function calculateEndDate(startDate: Date, nextMenuStartDate?: Date): Date {
  if (nextMenuStartDate) {
    const endDate = new Date(nextMenuStartDate);
    endDate.setDate(endDate.getDate() - 1);
    return endDate;
  }
  
  // Default: 3 months from start date
  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + 3);
  return endDate;
}

/**
 * Validate menu dates don't overlap
 */
export function validateMenuDates(
  startDate: Date,
  endDate: Date,
  existingMenus: Menu[],
  excludeMenuId?: string
): { valid: boolean; error?: string } {
  const filteredMenus = existingMenus.filter((m) => m._id !== excludeMenuId);
  
  for (const menu of filteredMenus) {
    // Check if dates overlap
    if (
      (startDate >= menu.startDate && startDate <= menu.endDate) ||
      (endDate >= menu.startDate && endDate <= menu.endDate) ||
      (startDate <= menu.startDate && endDate >= menu.endDate)
    ) {
      return {
        valid: false,
        error: `Dates overlap with existing menu "${menu.title}" (${menu.startDate.toLocaleDateString()} - ${menu.endDate.toLocaleDateString()})`,
      };
    }
  }
  
  return { valid: true };
}

