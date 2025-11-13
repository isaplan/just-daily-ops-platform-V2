/**
 * Operations Products Model Layer
 * Type definitions for products management
 */

export interface Product {
  id: string;
  name: string;
  description?: string;
  category?: string;
  price?: number;
  unit?: string;
}




