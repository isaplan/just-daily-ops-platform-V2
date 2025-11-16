/**
 * Bork Data Optimizer
 * 
 * Extracts only essential fields from Bork API tickets to reduce storage size.
 * Stores ~70-80% less data by keeping only what's needed for aggregation/UI.
 */

/**
 * Essential fields to extract from Bork tickets
 * These are the only fields needed for aggregation and UI display
 */
const ESSENTIAL_BORK_FIELDS = [
  'ActualDate',        // Date (YYYYMMDD)
  'TicketNumber',      // Transaction ID
  'ProductName',       // Product name
  'ProductSku',        // SKU
  'Category',          // Category
  'Quantity',          // Quantity sold
  'Price',             // Unit price
  'TotalPrice',         // Total price (quantity × price)
  'Revenue',            // Revenue (if available)
  'RevenueExVat',       // Revenue excluding VAT
  'RevenueIncVat',      // Revenue including VAT
  'VatRate',            // VAT rate
  'VatAmount',          // VAT amount
  'CostPrice',          // Cost price
  'PaymentMethod',      // Payment method (cash, card, etc.)
  'TableNumber',        // Table number (for context)
  'WaiterName',         // Waiter name (for context)
] as const;

/**
 * Extracts only essential fields from a Bork ticket
 * Reduces storage by ~70-80% compared to full raw response
 */
export function extractEssentialBorkFields(ticket: any): Record<string, any> {
  const essential: Record<string, any> = {};
  
  for (const field of ESSENTIAL_BORK_FIELDS) {
    if (ticket[field] !== undefined && ticket[field] !== null) {
      essential[field] = ticket[field];
    }
  }
  
  return essential;
}

/**
 * Extracts essential fields from an array of Bork tickets
 * Returns optimized array with only essential fields
 */
export function optimizeBorkTickets(tickets: any[]): Record<string, any>[] {
  return tickets.map(ticket => extractEssentialBorkFields(ticket));
}

/**
 * Calculates storage reduction percentage
 */
export function calculateStorageReduction(original: any[], optimized: any[]): number {
  const originalSize = JSON.stringify(original).length;
  const optimizedSize = JSON.stringify(optimized).length;
  
  if (originalSize === 0) return 0;
  
  return Math.round(((originalSize - optimizedSize) / originalSize) * 100);
}


