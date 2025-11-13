"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Funnel } from "lucide-react";

export interface CategorySelection {
  category: string;
  subcategory?: string;
}

interface SalesCategoryFilterProps {
  selectedCategories: CategorySelection[];
  onCategoriesChange: (categories: CategorySelection[]) => void;
  availableCategories?: string[];
}

export function SalesCategoryFilter({ 
  selectedCategories, 
  onCategoriesChange, 
  availableCategories = [] 
}: SalesCategoryFilterProps) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleCategory = (category: string) => {
    const isSelected = selectedCategories.some(cat => cat.category === category);
    
    if (isSelected) {
      onCategoriesChange(selectedCategories.filter(cat => cat.category !== category));
    } else {
      onCategoriesChange([...selectedCategories, { category }]);
    }
  };

  const clearAll = () => {
    onCategoriesChange([]);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Funnel className="h-4 w-4" />
          Category Filters
          {selectedCategories.length > 0 && (
            <Badge variant="secondary" className="ml-1">
              {selectedCategories.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Filter by Category</h4>
            {selectedCategories.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearAll}>
                Clear All
              </Button>
            )}
          </div>
          
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {availableCategories.length > 0 ? (
              availableCategories.map((category) => {
                const isSelected = selectedCategories.some(cat => cat.category === category);
                return (
                  <div key={category} className="flex items-center space-x-2">
                    <Checkbox
                      id={category}
                      checked={isSelected}
                      onCheckedChange={() => toggleCategory(category)}
                    />
                    <label
                      htmlFor={category}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {category}
                    </label>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-muted-foreground">No categories available</p>
            )}
          </div>
          
          {selectedCategories.length > 0 && (
            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground mb-2">Selected:</p>
              <div className="flex flex-wrap gap-1">
                {selectedCategories.map((category, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {category.category}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

