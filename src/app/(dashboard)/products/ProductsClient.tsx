/**
 * Products Management - Client Component
 * Handles all interactivity - receives initial data from Server Component
 */

"use client";

import React, { useState, useMemo } from "react";
import { usePathname } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingState } from "@/components/view-data/LoadingState";
import { ErrorState } from "@/components/view-data/ErrorState";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronRight } from "lucide-react";
import { AutocompleteSearch, AutocompleteOption } from "@/components/view-data/AutocompleteSearch";
import { getBreadcrumb } from "@/lib/navigation/breadcrumb-registry";
import { CategoryAggregate, ProductAggregate } from "@/models/sales/categories-products.model";
import { CourseType } from "@/models/products/product.model";
import { useCategoriesProductsViewModel } from "@/viewmodels/sales/useCategoriesProductsViewModel";
import { formatCurrency, formatNumber } from "@/lib/utils";

interface ProductsClientProps {
  initialData?: {
    aggregatedData?: any;
    locations?: any[];
  };
}

// Course type options
const courseTypeOptions: { value: CourseType; label: string }[] = [
  { value: "snack", label: "Snack" },
  { value: "voorgerecht", label: "Voorgerecht" },
  { value: "hoofdgerecht", label: "Hoofdgerecht" },
  { value: "nagerecht", label: "Nagerecht" },
  { value: "bijgerecht", label: "Bijgerecht" },
  { value: "drank", label: "Drank" },
  { value: "overig", label: "Overig" },
];

// Main category mapping (category -> main category)
const categoryToMainCategoryMap: Record<string, "Bar" | "Keuken" | "Other"> = {
  // Bar categories
  "Tap Bier": "Bar",
  "Fles Bier": "Bar",
  "Cocktails": "Bar",
  "Wijn": "Bar",
  "Spirits": "Bar",
  "Frisdrank": "Bar",
  "Koffie": "Bar",
  "Thee": "Bar",
  "Warme Dranken": "Bar",
  
  // Keuken categories
  "Lunch": "Keuken",
  "Diner": "Keuken",
  "Voorgerecht": "Keuken",
  "Hoofdgerecht": "Keuken",
  "Nagerecht": "Keuken",
  "Bijgerecht": "Keuken",
  "Snacks": "Keuken",
  "Brood": "Keuken",
};

function getMainCategory(categoryName: string): "Bar" | "Keuken" | "Other" {
  return categoryToMainCategoryMap[categoryName] || "Other";
}

export function ProductsClient({ initialData }: ProductsClientProps) {
  const pathname = usePathname();
  const pageMetadata = getBreadcrumb(pathname);
  
  // Use ViewModel for data fetching and state management
  const viewModel = useCategoriesProductsViewModel(initialData);
  
  // Additional local state
  const [selectedMainCategory, setSelectedMainCategory] = useState<"all" | "Bar" | "Keuken" | "Other">("all");
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>("all");
  const [selectedMenu, setSelectedMenu] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [menus, setMenus] = useState<any[]>([]);
  
  // Extract data from ViewModel
  const aggregatedData = viewModel.aggregatedData;
  const isLoading = viewModel.isLoading;
  const error = viewModel.error;
  
  // Load menus
  React.useEffect(() => {
    const loadMenus = async () => {
      try {
        const response = await fetch('/api/menus?activeOnly=true');
        const data = await response.json();
        if (data.success) {
          setMenus(data.menus);
        }
      } catch (error) {
        console.error('Error loading menus:', error);
      }
    };
    loadMenus();
  }, []);
  
  // Flatten categories from hierarchical structure
  const allCategories = useMemo(() => {
    if (!aggregatedData) return [];
    
    const categories: CategoryAggregate[] = [];
    
    // Add categories from mainCategories (flatten the hierarchy)
    if (aggregatedData.mainCategories) {
      for (const mainCat of aggregatedData.mainCategories) {
        if (mainCat.categories) {
          categories.push(...mainCat.categories);
        }
      }
    }
    
    // Add standalone categories (those without main category)
    if (aggregatedData.categories) {
      categories.push(...aggregatedData.categories);
    }
    
    return categories;
  }, [aggregatedData]);
  
  // Group categories by main category (Bar, Keuken, Other)
  const groupedCategories = useMemo(() => {
    const grouped: Record<"Bar" | "Keuken" | "Other", CategoryAggregate[]> = {
      Bar: [],
      Keuken: [],
      Other: [],
    };
    
    for (const category of allCategories) {
      const mainCat = getMainCategory(category.categoryName);
      grouped[mainCat].push(category);
    }
    
    return grouped;
  }, [allCategories]);
  
  // Filter categories based on selected filters
  const filteredCategories = useMemo(() => {
    let categories = allCategories;
    
    // Main category filter
    if (selectedMainCategory !== "all") {
      categories = groupedCategories[selectedMainCategory];
    }
    
    // Sub category filter
    if (selectedSubCategory !== "all") {
      categories = categories.filter((cat) => cat.categoryName === selectedSubCategory);
    }
    
    // Menu filter (filter by products in menu)
    if (selectedMenu !== "all") {
      const menu = menus.find((m) => m._id === selectedMenu);
      if (menu && menu.productIds && menu.productIds.length > 0) {
        const menuProductIds = menu.productIds;
        categories = categories
          .map((cat) => ({
            ...cat,
            products: cat.products.filter((prod) =>
              menuProductIds.includes(prod.productName)
            ),
          }))
          .filter((cat) => cat.products.length > 0);
      }
    }
    
    // Search filter (search in both category name and product names)
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      categories = categories
        .map((cat) => ({
          ...cat,
          products: cat.products.filter((prod) =>
            prod.productName.toLowerCase().includes(query)
          ),
        }))
        .filter((cat) => 
          cat.categoryName.toLowerCase().includes(query) || cat.products.length > 0
        );
    }
    
    return categories;
  }, [allCategories, groupedCategories, selectedMainCategory, selectedSubCategory, selectedMenu, searchQuery, menus]);

  // Search options for autocomplete (categories and products)
  const searchOptions = useMemo<AutocompleteOption[]>(() => {
    const options: AutocompleteOption[] = [];
    // Add categories
    allCategories.forEach(cat => {
      options.push({
        value: cat.categoryName,
        label: cat.categoryName,
        type: 'category',
      });
    });
    // Add products from filtered categories
    filteredCategories.forEach(cat => {
      cat.products.forEach(prod => {
        options.push({
          value: prod.productName,
          label: prod.productName,
          type: 'product',
          category: cat.categoryName,
        });
      });
    });
    return options;
  }, [allCategories, filteredCategories]);
  
  // Get unique sub-categories for selected main category
  const subCategories = useMemo(() => {
    let categories = allCategories;
    if (selectedMainCategory !== "all") {
      categories = groupedCategories[selectedMainCategory];
    }
    return Array.from(new Set(categories.map((cat) => cat.categoryName))).sort();
  }, [allCategories, groupedCategories, selectedMainCategory]);
  
  // Use location options from ViewModel
  const locationOptions = viewModel.locationOptions;
  
  // Year options (last 3 years + current year + next year)
  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);
  }, []);
  
  // Toggle category expansion
  const toggleCategory = (categoryName: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryName)) {
        next.delete(categoryName);
      } else {
        next.add(categoryName);
      }
      return next;
    });
  };
  
  // Handle workload update
  const handleUpdateWorkload = async (
    productName: string,
    level: 'low' | 'mid' | 'high',
    minutes: number
  ) => {
    try {
      const response = await fetch('/api/products/update-workload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productName,
          workloadLevel: level,
          workloadMinutes: minutes,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update workload');
      }

      // TODO: Refresh data after update
      console.log('Workload updated:', productName, level, minutes);
    } catch (error) {
      console.error('Error updating workload:', error);
      alert('Failed to update workload');
    }
  };

  // Handle MEP update
  const handleUpdateMEP = async (
    productName: string,
    level: 'low' | 'mid' | 'high',
    minutes: number
  ) => {
    try {
      const response = await fetch('/api/products/update-mep', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productName,
          mepLevel: level,
          mepMinutes: minutes,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update MEP time');
      }

      // TODO: Refresh data after update
      console.log('MEP updated:', productName, level, minutes);
    } catch (error) {
      console.error('Error updating MEP:', error);
      alert('Failed to update MEP time');
    }
  };
  
  // Handle course type update
  const handleUpdateCourseType = async (
    productName: string,
    courseType: CourseType | null
  ) => {
    try {
      const response = await fetch('/api/products/update-course-type', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productName,
          courseType,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update course type');
      }

      // TODO: Refresh data after update
      console.log('Course type updated:', productName, courseType);
    } catch (error) {
      console.error('Error updating course type:', error);
      alert('Failed to update course type');
    }
  };
  
  // Bulk update workload for all products in category
  const handleBulkUpdateWorkload = async (
    category: CategoryAggregate,
    level: 'low' | 'mid' | 'high'
  ) => {
    const minutes = level === 'low' ? 2.5 : level === 'mid' ? 5 : 10;
    const updates = category.products.map((product) =>
      handleUpdateWorkload(product.productName, level, minutes)
    );
    await Promise.all(updates);
    alert(`Updated workload to ${level} for all products in ${category.categoryName}`);
  };
  
  // Bulk update MEP for all products in category
  const handleBulkUpdateMEP = async (
    category: CategoryAggregate,
    level: 'low' | 'mid' | 'high'
  ) => {
    const minutes = level === 'low' ? 1 : level === 'mid' ? 2 : 4;
    const updates = category.products.map((product) =>
      handleUpdateMEP(product.productName, level, minutes)
    );
    await Promise.all(updates);
    alert(`Updated MEP to ${level} for all products in ${category.categoryName}`);
  };
  
  // Bulk update course type for all products in category
  const handleBulkUpdateCourseType = async (
    category: CategoryAggregate,
    courseType: CourseType
  ) => {
    const updates = category.products.map((product) =>
      handleUpdateCourseType(product.productName, courseType)
    );
    await Promise.all(updates);
    alert(`Updated course type to ${courseType} for all products in ${category.categoryName}`);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Page Title */}
      {pageMetadata && (
        <div className="pt-20 space-y-1">
          <h1 className="text-2xl font-semibold">{pageMetadata.label}</h1>
          {pageMetadata.subtitle && (
            <p className="text-sm text-muted-foreground">{pageMetadata.subtitle}</p>
          )}
        </div>
      )}
      
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            {/* Year Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Year</label>
              <Select value={viewModel.selectedYear.toString()} onValueChange={(val) => viewModel.setSelectedYear(Number(val))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Location Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Location</label>
              <Select value={viewModel.selectedLocation} onValueChange={viewModel.setSelectedLocation}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {locationOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Main Category Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Main Category</label>
              <Select value={selectedMainCategory} onValueChange={(val) => {
                setSelectedMainCategory(val as any);
                setSelectedSubCategory("all"); // Reset sub category when main changes
              }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="Bar">Bar</SelectItem>
                  <SelectItem value="Keuken">Keuken</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Sub Category Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Sub Category</label>
              <Select value={selectedSubCategory} onValueChange={setSelectedSubCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {subCategories.map((subCat) => (
                    <SelectItem key={subCat} value={subCat}>
                      {subCat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Menu Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Menu</label>
              <Select value={selectedMenu} onValueChange={setSelectedMenu}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Products</SelectItem>
                  {menus.map((menu) => (
                    <SelectItem key={menu._id} value={menu._id}>
                      {menu.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Search */}
            <AutocompleteSearch
              options={searchOptions}
              value={searchQuery}
              onValueChange={setSearchQuery}
              placeholder="Search products..."
              label="Search"
              emptyMessage="No products found."
              renderOption={(option) => (
                <div>
                  <div className="font-medium">{option.label}</div>
                  {option.category && (
                    <div className="text-xs text-muted-foreground">{option.category}</div>
                  )}
                </div>
              )}
            />
          </div>
        </CardContent>
      </Card>
      
      {/* Loading/Error States */}
      {isLoading && <LoadingState />}
      {error && <ErrorState error={error} message="Failed to load products data" />}
      
      {/* Categories & Products */}
      {!isLoading && !error && (
      <div className="space-y-4">
        {filteredCategories.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No products found matching your filters.
            </CardContent>
          </Card>
        ) : (
          filteredCategories.map((category) => {
            const isExpanded = expandedCategories.has(category.categoryName);
            const mainCat = getMainCategory(category.categoryName);
            const mainCatColor = mainCat === "Bar" ? "blue" : mainCat === "Keuken" ? "green" : "gray";
            
            return (
              <Card key={category.categoryName}>
                <Collapsible open={isExpanded} onOpenChange={() => toggleCategory(category.categoryName)}>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <ChevronRight className={`h-5 w-5 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                          <CardTitle className="text-lg">{category.categoryName}</CardTitle>
                          <Badge variant="outline" className={`bg-${mainCatColor}-50 text-${mainCatColor}-700`}>
                            {mainCat}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {category.products.length} products
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Total: {formatNumber(category.total.quantity)} items • {formatCurrency(category.total.revenueIncVat)}
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <CardContent className="space-y-4">
                      {/* Bulk Actions */}
                      <div className="flex gap-2 pb-4 border-b">
                        <span className="text-sm font-medium self-center">Bulk Actions:</span>
                        <Select onValueChange={(val) => handleBulkUpdateWorkload(category, val as any)}>
                          <SelectTrigger className="w-40">
                            <SelectValue placeholder="Set All Workload" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Low (2.5m)</SelectItem>
                            <SelectItem value="mid">Mid (5m)</SelectItem>
                            <SelectItem value="high">High (10m)</SelectItem>
                          </SelectContent>
                        </Select>
                        
                        <Select onValueChange={(val) => handleBulkUpdateMEP(category, val as any)}>
                          <SelectTrigger className="w-40">
                            <SelectValue placeholder="Set All MEP" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Low (1m)</SelectItem>
                            <SelectItem value="mid">Mid (2m)</SelectItem>
                            <SelectItem value="high">High (4m)</SelectItem>
                          </SelectContent>
                        </Select>
                        
                        <Select onValueChange={(val) => handleBulkUpdateCourseType(category, val as any)}>
                          <SelectTrigger className="w-48">
                            <SelectValue placeholder="Set All Course Type" />
                          </SelectTrigger>
                          <SelectContent>
                            {courseTypeOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {/* Products Table */}
                      <div className="space-y-2">
                        {/* Header */}
                        <div className="grid grid-cols-12 gap-4 text-sm font-medium text-muted-foreground pb-2 border-b">
                          <div className="col-span-3">Product Name</div>
                          <div className="col-span-1 text-right">Quantity</div>
                          <div className="col-span-2 text-right">Revenue (Inc VAT)</div>
                          <div className="col-span-2">Workload</div>
                          <div className="col-span-2">MEP Time</div>
                          <div className="col-span-2">Course Type</div>
                        </div>
                        
                        {/* Product Rows */}
                        {category.products.map((product) => (
                          <div key={product.productName} className="grid grid-cols-12 gap-4 items-center py-2 hover:bg-gray-50">
                            <div className="col-span-3 font-medium">{product.productName}</div>
                            <div className="col-span-1 text-right">{formatNumber(product.total.quantity)}</div>
                            <div className="col-span-2 text-right">{formatCurrency(product.total.revenueIncVat)}</div>
                            
                            {/* Workload Select */}
                            <div className="col-span-2">
                              <Select
                                value={product.workloadLevel || 'mid'}
                                onValueChange={(val) => {
                                  const level = val as 'low' | 'mid' | 'high';
                                  const minutes = level === 'low' ? 2.5 : level === 'mid' ? 5 : 10;
                                  handleUpdateWorkload(product.productName, level, minutes);
                                }}
                              >
                                <SelectTrigger className="h-8">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="low">Low (2.5m)</SelectItem>
                                  <SelectItem value="mid">Mid (5m)</SelectItem>
                                  <SelectItem value="high">High (10m)</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            
                            {/* MEP Select */}
                            <div className="col-span-2">
                              <Select
                                value={product.mepLevel || 'low'}
                                onValueChange={(val) => {
                                  const level = val as 'low' | 'mid' | 'high';
                                  const minutes = level === 'low' ? 1 : level === 'mid' ? 2 : 4;
                                  handleUpdateMEP(product.productName, level, minutes);
                                }}
                              >
                                <SelectTrigger className="h-8">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="low">Low (1m)</SelectItem>
                                  <SelectItem value="mid">Mid (2m)</SelectItem>
                                  <SelectItem value="high">High (4m)</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            
                            {/* Course Type Select */}
                            <div className="col-span-2">
                              <Select
                                value={product.courseType || ''}
                                onValueChange={(val) => {
                                  handleUpdateCourseType(product.productName, val ? val as CourseType : null);
                                }}
                              >
                                <SelectTrigger className="h-8">
                                  <SelectValue placeholder="Select..." />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="">None</SelectItem>
                                  {courseTypeOptions.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                      {option.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            );
          })
        )}
      </div>
      )}
    </div>
  );
}

