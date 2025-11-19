"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CategoryOption } from "@/models/sales/categories-products.model";

interface CategoryProductFilterProps {
  categoryOptions: CategoryOption[];
  selectedCategory: string;
  selectedProduct: string;
  onCategoryChange: (category: string) => void;
  onProductChange: (product: string) => void;
  expandedCategories?: Set<string>; // Optional - kept for compatibility
  onToggleCategory?: (category: string) => void; // Optional - kept for compatibility
}

export function CategoryProductFilter({
  categoryOptions,
  selectedCategory,
  selectedProduct,
  onCategoryChange,
  onProductChange,
}: CategoryProductFilterProps) {
  // Get selected category's products
  const selectedCategoryData = useMemo(() => {
    return categoryOptions.find(cat => cat.value === selectedCategory);
  }, [categoryOptions, selectedCategory]);

  const products = selectedCategoryData?.products || [];

  return (
    <div className="space-y-4">
      {/* Category Select */}
      <div className="space-y-2">
        <span className="text-sm font-bold text-foreground">Category</span>
        <Select value={selectedCategory} onValueChange={(value) => {
          onCategoryChange(value);
          onProductChange("all"); // Reset product when category changes
        }}>
          <SelectTrigger className="w-full max-w-md border rounded-sm">
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            {categoryOptions.map((category) => (
              <SelectItem key={category.value} value={category.value}>
                {category.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Sub Categories (Products) - Show when a category is selected */}
      {selectedCategory !== "all" && products.length > 0 && (
        <div className="space-y-2">
          <span className="text-sm font-bold text-foreground">Sub Categories</span>
          <div className="flex gap-2 flex-wrap">
            {/* All Products button */}
            <Button
              variant="outline"
              size="sm"
              className={`border rounded-sm ${
                selectedProduct === "all"
                  ? "bg-blue-500 border-blue-500 text-white"
                  : "bg-white border-black hover:bg-blue-500 hover:border-blue-500 hover:text-white"
              }`}
              onClick={() => onProductChange("all")}
            >
              All
            </Button>
            
            {/* Product buttons */}
            {products.filter(p => p.value !== "all").map((product) => {
              const isProductSelected = selectedProduct === product.value;
              
              return (
                <Button
                  key={product.value}
                  variant="outline"
                  size="sm"
                  className={`border rounded-sm ${
                    isProductSelected
                      ? "bg-blue-500 border-blue-500 text-white"
                      : "bg-white border-black hover:bg-blue-500 hover:border-blue-500 hover:text-white"
                  }`}
                  onClick={() => onProductChange(product.value)}
                >
                  {product.label}
                </Button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

