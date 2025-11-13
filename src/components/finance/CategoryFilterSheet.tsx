"use client";

import { useState } from "react";
import { Sheet, SheetPortal, SheetOverlay } from "@/components/ui/sheet";
import * as SheetPrimitive from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { ChevronDown, ChevronRight, X } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Revenue: { bg: "bg-green-50 dark:bg-green-950", text: "text-green-700 dark:text-green-300", border: "border-green-200 dark:border-green-800" },
  COGS: { bg: "bg-orange-50 dark:bg-orange-950", text: "text-orange-700 dark:text-orange-300", border: "border-orange-200 dark:border-orange-800" },
  Labor: { bg: "bg-blue-50 dark:bg-blue-950", text: "text-blue-700 dark:text-blue-300", border: "border-blue-200 dark:border-blue-800" },
  OPEX: { bg: "bg-purple-50 dark:bg-purple-950", text: "text-purple-700 dark:text-purple-300", border: "border-purple-200 dark:border-purple-800" },
  Depreciation: { bg: "bg-gray-50 dark:bg-gray-950", text: "text-gray-700 dark:text-gray-300", border: "border-gray-200 dark:border-gray-800" },
  Finance: { bg: "bg-red-50 dark:bg-red-950", text: "text-red-700 dark:text-red-300", border: "border-red-200 dark:border-red-800" }
};

export interface CategorySelection {
  category: string;
  subcategory?: string;
  glAccount?: string;
}

interface CategoryFilterSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCategories: CategorySelection[];
  onCategoriesChange: (categories: CategorySelection[]) => void;
}

// Category hierarchy structure
const CATEGORY_HIERARCHY = {
  Revenue: {
    "Food": ["Kitchen Sales", "Breakfast", "Lunch", "Dinner", "Desserts"],
    "Beverages": ["Beer & Wine", "Spirits", "Non-Alcoholic", "Coffee & Tea"]
  },
  COGS: {
    "Kitchen": ["Raw Materials", "Prepared Ingredients"],
    "Beverages": ["Beer & Wine", "Spirits", "Non-Alcoholic"]
  },
  Labor: {
    "Contract Workers": ["Kitchen (Contract)", "Service (Contract)"],
    "Flex Workers": ["Kitchen (Flex)", "Service (Flex)"],
    "Other": ["Bruto Salaris", "Social Charges", "Pension", "Vacation Pay"]
  },
  OPEX: {
    "Rent & Premises": [],
    "Utilities": [],
    "Maintenance": [],
    "Marketing": [],
    "Insurance": [],
    "Administrative": []
  },
  Depreciation: {
    "Material Assets": [],
    "Immaterial Assets": []
  },
  Finance: {
    "Finance Costs": []
  }
};

export function CategoryFilterSheet({
  open,
  onOpenChange,
  selectedCategories,
  onCategoriesChange
}: CategoryFilterSheetProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(["Revenue"]));

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const isMainCategorySelected = (mainCategory: string) => {
    return selectedCategories.some(s => s.category === mainCategory && !s.subcategory);
  };

  const isSubcategorySelected = (mainCategory: string, subcategory: string) => {
    return selectedCategories.some(
      s => s.category === mainCategory && s.subcategory === subcategory
    );
  };

  const toggleMainCategory = (category: string) => {
    if (isMainCategorySelected(category)) {
      // Remove all selections for this category
      onCategoriesChange(selectedCategories.filter(s => s.category !== category));
    } else {
      // Add main category (will include all subcategories)
      const newSelection = selectedCategories.filter(s => s.category !== category);
      newSelection.push({ category });
      if (newSelection.length > 5) {
        return; // Max limit
      }
      onCategoriesChange(newSelection);
    }
  };

  const toggleSubcategory = (mainCategory: string, subcategory: string) => {
    const isSelected = isSubcategorySelected(mainCategory, subcategory);
    
    if (isSelected) {
      // Remove this subcategory
      onCategoriesChange(
        selectedCategories.filter(
          s => !(s.category === mainCategory && s.subcategory === subcategory)
        )
      );
    } else {
      // Add this subcategory
      if (selectedCategories.length >= 5) {
        return; // Max limit
      }
      onCategoriesChange([...selectedCategories, { category: mainCategory, subcategory }]);
    }
  };

  const clearAll = () => {
    onCategoriesChange([]);
  };

  const getSelectionLabel = (selection: CategorySelection): string => {
    if (selection.subcategory) {
      return `${selection.category} > ${selection.subcategory}`;
    }
    return selection.category;
  };

  const isAtMaxLimit = selectedCategories.length >= 5;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetPortal>
        <SheetOverlay className="bg-black/20" />
        <SheetPrimitive.Content className="fixed inset-y-0 right-0 z-50 h-full w-[500px] gap-4 border-l bg-background p-6 shadow-lg transition ease-in-out data-[state=closed]:duration-300 data-[state=open]:duration-500 data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:w-[540px] flex flex-col">
          <div className="flex flex-col space-y-2 text-left">
            <SheetPrimitive.Title className="text-lg font-semibold text-foreground">
              Category Filters
            </SheetPrimitive.Title>
            <SheetPrimitive.Description className="text-sm text-muted-foreground">
              Select up to 5 categories to compare. Select main categories or specific subcategories.
            </SheetPrimitive.Description>
          </div>

          {/* Selected Categories Chips */}
          {selectedCategories.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Selected ({selectedCategories.length}/5)</Label>
                <Button variant="ghost" size="sm" onClick={clearAll}>
                  Clear All
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedCategories.map((selection, idx) => {
                  const categoryColor = CATEGORY_COLORS[selection.category] || CATEGORY_COLORS.Revenue;
                  return (
                    <div
                      key={idx}
                      className={cn(
                        "inline-flex items-center gap-1 px-2 py-1 rounded-md text-sm border",
                        categoryColor.bg,
                        categoryColor.text,
                        categoryColor.border
                      )}
                    >
                      <span>{getSelectionLabel(selection)}</span>
                      <button
                        onClick={() => {
                          onCategoriesChange(selectedCategories.filter((_, i) => i !== idx));
                        }}
                        className="hover:opacity-70 rounded-sm p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
              <Separator />
            </div>
          )}

          {/* Category Tree */}
          <ScrollArea className="flex-1">
            <div className="space-y-2 pr-4">
              {Object.entries(CATEGORY_HIERARCHY).map(([mainCategory, subcategories]) => (
                <Collapsible
                  key={mainCategory}
                  open={expandedCategories.has(mainCategory)}
                  onOpenChange={() => toggleCategory(mainCategory)}
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="p-0 h-6 w-6">
                          {expandedCategories.has(mainCategory) ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                      </CollapsibleTrigger>
                      <div className="flex items-center gap-2 flex-1">
                        <Checkbox
                          id={mainCategory}
                          checked={isMainCategorySelected(mainCategory)}
                          onCheckedChange={() => toggleMainCategory(mainCategory)}
                          disabled={isAtMaxLimit && !isMainCategorySelected(mainCategory)}
                        />
                        <Label
                          htmlFor={mainCategory}
                          className="font-semibold cursor-pointer flex-1"
                        >
                          {mainCategory}
                        </Label>
                      </div>
                    </div>

                    <CollapsibleContent className="pl-8 space-y-2">
                      {Object.entries(subcategories).map(([subcategory, items]) => (
                        <div key={subcategory} className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id={`${mainCategory}-${subcategory}`}
                              checked={isSubcategorySelected(mainCategory, subcategory)}
                              onCheckedChange={() => toggleSubcategory(mainCategory, subcategory)}
                              disabled={
                                (isAtMaxLimit && !isSubcategorySelected(mainCategory, subcategory)) ||
                                isMainCategorySelected(mainCategory)
                              }
                            />
                            <Label
                              htmlFor={`${mainCategory}-${subcategory}`}
                              className="cursor-pointer text-sm"
                            >
                              {subcategory}
                            </Label>
                          </div>
                          {items.length > 0 && (
                            <div className="pl-6 text-xs text-muted-foreground">
                              {items.join(", ")}
                            </div>
                          )}
                        </div>
                      ))}
                    </CollapsibleContent>
                  </div>
                  <Separator className="my-2" />
                </Collapsible>
              ))}
            </div>
          </ScrollArea>

          {/* Apply Button */}
          <div className="pt-4 border-t">
            <Button onClick={() => onOpenChange(false)} className="w-full">
              Apply Filters
            </Button>
          </div>
          
          <SheetPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </SheetPrimitive.Close>
        </SheetPrimitive.Content>
      </SheetPortal>
    </Sheet>
  );
}