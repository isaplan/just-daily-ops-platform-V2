/**
 * Product Catalog - Client Component (OPTIMIZED)
 * 
 * ✅ Fast first paint: Uses lightweight category metadata (no products)
 * ✅ Lazy loading: Products load only when category is expanded
 * ✅ Client-side filtering: All filters work on cached data (no API calls)
 * ✅ Debounced search: Smooth typing experience
 * ✅ Memoized components: Optimized re-renders
 */

"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingState } from "@/components/view-data/LoadingState";
import { ErrorState } from "@/components/view-data/ErrorState";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronRight, Search, Loader2 } from "lucide-react";
import { getBreadcrumb } from "@/lib/navigation/breadcrumb-registry";
import { CategoryAggregate, ProductAggregate } from "@/models/sales/categories-products.model";
import { CourseType } from "@/models/products/product.model";
import { getLocations } from "@/lib/services/graphql/queries";
import { useQuery } from "@tanstack/react-query";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { useDebounce } from "@/hooks/useDebounce";
import { useLazyCategoryProducts } from "@/hooks/useLazyCategoryProducts";
import { CategoryMetadata } from "@/lib/services/graphql/queries";

interface ProductsClientProps {
  initialData?: {
    categoriesMetadata?: {
      success: boolean;
      categories: CategoryMetadata[];
      totals: {
        quantity: number;
        revenueExVat: number;
        revenueIncVat: number;
        transactionCount: number;
      };
    };
    locations?: any[];
    dateRange?: {
      startDate: string;
      endDate: string;
    };
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
  "Tap Bier": "Bar",
  "Fles Bier": "Bar",
  "Cocktails": "Bar",
  "Wijn": "Bar",
  "Spirits": "Bar",
  "Frisdrank": "Bar",
  "Koffie": "Bar",
  "Thee": "Bar",
  "Warme Dranken": "Bar",
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
  
  // Get date range from initialData or use current week
  const dateRange = useMemo(() => {
    if (initialData?.dateRange) {
      return initialData.dateRange;
    }
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() + diffToMonday);
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);
    return {
      startDate: startOfWeek.toISOString().split('T')[0],
      endDate: endOfWeek.toISOString().split('T')[0],
    };
  }, [initialData?.dateRange]);

  // Get categories metadata from initialData (lightweight - no products)
  const categoriesMetadata = initialData?.categoriesMetadata;
  
  // Fetch locations
  const { data: locations = initialData?.locations || [] } = useQuery({
    queryKey: ["locations"],
    queryFn: getLocations,
    initialData: initialData?.locations,
    staleTime: 60 * 60 * 1000, // 60 minutes
  });

  // Lazy loading hook for products
  const lazyProducts = useLazyCategoryProducts({
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    filters: {
      locationId: 'all', // Will be filtered client-side
    },
  });

  // Filter state (all client-side)
  const [selectedMainCategory, setSelectedMainCategory] = useState<"all" | "Bar" | "Keuken" | "Other">("all");
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>("all");
  const [selectedMenu, setSelectedMenu] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedWorkloadLevel, setSelectedWorkloadLevel] = useState<string>("all");
  const [selectedMEPLevel, setSelectedMEPLevel] = useState<string>("all");
  const [showActiveOnly, setShowActiveOnly] = useState<boolean>(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [loadingCategories, setLoadingCategories] = useState<Set<string>>(new Set());
  const [menus, setMenus] = useState<any[]>([]);

  // Debounce search query (300ms delay)
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Load menus
  useEffect(() => {
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

  // Convert metadata to category-like structure for filtering
  const allCategories = useMemo(() => {
    if (!categoriesMetadata?.success || !categoriesMetadata.categories) return [];
    
    return categoriesMetadata.categories
      .filter(cat => cat && cat.categoryName && cat.categoryName.trim() !== '')
      .map(cat => ({
        categoryName: cat.categoryName,
        mainCategoryName: cat.mainCategoryName,
        productCount: cat.productCount,
        total: cat.total,
        // Products will be loaded lazily - start with empty array
        products: [] as ProductAggregate[],
      }));
  }, [categoriesMetadata]);

  // Group categories by main category
  const groupedCategories = useMemo(() => {
    const grouped: Record<"Bar" | "Keuken" | "Other", typeof allCategories> = {
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

  // ✅ CLIENT-SIDE FILTERING (no API calls)
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
    
    // Search filter (on category name and product count)
    if (debouncedSearchQuery) {
      const query = debouncedSearchQuery.toLowerCase();
      categories = categories.filter((cat) =>
        cat.categoryName.toLowerCase().includes(query)
      );
    }
    
    // Workload/MEP/Active filters will be applied when products are loaded
    // (we can't filter by product properties until products are loaded)
    
    return categories;
  }, [allCategories, groupedCategories, selectedMainCategory, selectedSubCategory, debouncedSearchQuery]);

  // Get unique sub-categories
  const subCategories = useMemo(() => {
    let categories = allCategories;
    if (selectedMainCategory !== "all") {
      categories = groupedCategories[selectedMainCategory];
    }
    return Array.from(new Set(categories.map((cat) => cat.categoryName)))
      .filter(name => name && name.trim() !== '')
      .sort();
  }, [allCategories, groupedCategories, selectedMainCategory]);

  // Location options
  const locationOptions = useMemo(() => {
    const validLocations = locations.filter(
      (loc: any) => loc && loc.id && loc.id.trim() !== '' && loc.name && loc.name.trim() !== ''
    ).filter(
      (loc: any) => 
        loc.name !== "All HNHG Locations" && 
        loc.name !== "All HNG Locations" &&
        loc.name !== "Default Location"
    );
    return [
      { value: "all", label: "All Locations" },
      ...validLocations.map((loc: any) => ({ value: loc.id, label: loc.name })),
    ];
  }, [locations]);

  // Year options
  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);
  }, []);

  // Toggle category expansion with lazy loading
  const toggleCategory = useCallback(async (categoryName: string) => {
    const isExpanded = expandedCategories.has(categoryName);
    
    if (isExpanded) {
      // Collapse
      setExpandedCategories((prev) => {
        const next = new Set(prev);
        next.delete(categoryName);
        return next;
      });
    } else {
      // Expand - load products if not already loaded
      setExpandedCategories((prev) => new Set(prev).add(categoryName));
      
      if (!lazyProducts.isCategoryLoaded(categoryName)) {
        setLoadingCategories((prev) => new Set(prev).add(categoryName));
        try {
          await lazyProducts.loadCategory(categoryName);
          // Prefetch next 3 categories in background
          const allCategoryNames = allCategories.map(c => c.categoryName);
          lazyProducts.prefetchNextCategories(categoryName, allCategoryNames);
        } catch (error) {
          console.error(`Error loading products for ${categoryName}:`, error);
        } finally {
          setLoadingCategories((prev) => {
            const next = new Set(prev);
            next.delete(categoryName);
            return next;
          });
        }
      }
    }
  }, [expandedCategories, lazyProducts, allCategories]);

  // Get category with products (merged metadata + lazy-loaded products)
  const getCategoryWithProducts = useCallback((categoryMetadata: typeof allCategories[0]): CategoryAggregate | null => {
    const isExpanded = expandedCategories.has(categoryMetadata.categoryName);
    if (!isExpanded) {
      // Return metadata only (no products)
      return {
        ...categoryMetadata,
        products: [],
        daily: { quantity: 0, revenueExVat: 0, revenueIncVat: 0, transactionCount: 0 },
        weekly: { quantity: 0, revenueExVat: 0, revenueIncVat: 0, transactionCount: 0 },
        monthly: { quantity: 0, revenueExVat: 0, revenueIncVat: 0, transactionCount: 0 },
      };
    }

    // Get loaded products
    const categoryData = lazyProducts.getCategoryProducts(categoryMetadata.categoryName);
    if (!categoryData) {
      // Still loading
      return {
        ...categoryMetadata,
        products: [],
        daily: { quantity: 0, revenueExVat: 0, revenueIncVat: 0, transactionCount: 0 },
        weekly: { quantity: 0, revenueExVat: 0, revenueIncVat: 0, transactionCount: 0 },
        monthly: { quantity: 0, revenueExVat: 0, revenueIncVat: 0, transactionCount: 0 },
      };
    }

    // Filter products client-side
    let products = categoryData.products || [];

    // Menu filter
    if (selectedMenu !== "all") {
      const menu = menus.find((m) => m._id === selectedMenu);
      if (menu && menu.productIds && menu.productIds.length > 0) {
        products = products.filter((prod) =>
          menu.productIds.includes(prod.productName)
        );
      }
    }

    // Search filter (on product names)
    if (debouncedSearchQuery) {
      const query = debouncedSearchQuery.toLowerCase();
      products = products.filter((prod) =>
        prod.productName.toLowerCase().includes(query)
      );
    }

    // Workload Level filter
    if (selectedWorkloadLevel !== "all") {
      products = products.filter((prod) =>
        prod.workloadLevel === selectedWorkloadLevel
      );
    }

    // MEP Level filter
    if (selectedMEPLevel !== "all") {
      products = products.filter((prod) =>
        prod.mepLevel === selectedMEPLevel
      );
    }

    // Active Only filter
    if (showActiveOnly) {
      products = products.filter((prod) => prod.isActive === true);
    }

    return {
      ...categoryMetadata,
      products,
      daily: categoryData.daily || { quantity: 0, revenueExVat: 0, revenueIncVat: 0, transactionCount: 0 },
      weekly: categoryData.weekly || { quantity: 0, revenueExVat: 0, revenueIncVat: 0, transactionCount: 0 },
      monthly: categoryData.monthly || { quantity: 0, revenueExVat: 0, revenueIncVat: 0, transactionCount: 0 },
      total: categoryData.total || categoryMetadata.total,
    };
  }, [expandedCategories, lazyProducts, selectedMenu, menus, debouncedSearchQuery, selectedWorkloadLevel, selectedMEPLevel, showActiveOnly]);

  // Handle workload update
  const handleUpdateWorkload = useCallback(async (
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
  }, []);

  // Handle MEP update
  const handleUpdateMEP = useCallback(async (
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
  }, []);

  // Handle course type update
  const handleUpdateCourseType = useCallback(async (
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
  }, []);

  // Bulk update workload
  const handleBulkUpdateWorkload = useCallback(async (
    category: CategoryAggregate,
    level: 'low' | 'mid' | 'high'
  ) => {
    const minutes = level === 'low' ? 2.5 : level === 'mid' ? 5 : 10;
    const updates = category.products.map((product) =>
      handleUpdateWorkload(product.productName, level, minutes)
    );
    await Promise.all(updates);
    alert(`Updated workload to ${level} for all products in ${category.categoryName}`);
  }, [handleUpdateWorkload]);

  // Bulk update MEP
  const handleBulkUpdateMEP = useCallback(async (
    category: CategoryAggregate,
    level: 'low' | 'mid' | 'high'
  ) => {
    const minutes = level === 'low' ? 1 : level === 'mid' ? 2 : 4;
    const updates = category.products.map((product) =>
      handleUpdateMEP(product.productName, level, minutes)
    );
    await Promise.all(updates);
    alert(`Updated MEP to ${level} for all products in ${category.categoryName}`);
  }, [handleUpdateMEP]);

  // Bulk update course type
  const handleBulkUpdateCourseType = useCallback(async (
    category: CategoryAggregate,
    courseType: CourseType
  ) => {
    const updates = category.products.map((product) =>
      handleUpdateCourseType(product.productName, courseType)
    );
    await Promise.all(updates);
    alert(`Updated course type to ${courseType} for all products in ${category.categoryName}`);
  }, [handleUpdateCourseType]);

  if (!categoriesMetadata?.success) {
    return (
      <div className="container mx-auto py-6">
        <ErrorState error={new Error('Failed to load categories metadata')} message="Failed to load product catalog" />
      </div>
    );
  }

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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-9 gap-4">
            {/* Year Filter - TODO: Implement year selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Year</label>
              <Select value={new Date().getFullYear().toString()} disabled>
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
            
            {/* Location Filter - TODO: Implement location filtering */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Location</label>
              <Select value="all" disabled>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {locationOptions
                    .filter(option => option.value && option.value.trim() !== '')
                    .map((option) => (
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
                setSelectedSubCategory("all");
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
                  {subCategories
                    .filter(subCat => subCat && subCat.trim() !== '')
                    .map((subCat) => (
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
                  {menus
                    .filter(menu => menu && menu._id && menu._id.toString().trim() !== '')
                    .map((menu) => (
                      <SelectItem key={menu._id} value={menu._id.toString()}>
                        {menu.title}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Search */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            
            {/* Workload Level Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Workload Level</label>
              <Select value={selectedWorkloadLevel} onValueChange={setSelectedWorkloadLevel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="mid">Mid</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* MEP Level Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">MEP Level</label>
              <Select value={selectedMEPLevel} onValueChange={setSelectedMEPLevel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="low">Low (1 min)</SelectItem>
                  <SelectItem value="mid">Mid (2 min)</SelectItem>
                  <SelectItem value="high">High (4 min)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Active Only Toggle */}
            <div className="space-y-2 flex items-end">
              <Button
                variant={showActiveOnly ? "default" : "outline"}
                onClick={() => setShowActiveOnly(!showActiveOnly)}
                className="w-full"
              >
                {showActiveOnly ? "Active Only" : "Show All"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Categories & Products */}
      <div className="space-y-4">
        {filteredCategories.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No categories found matching your filters.
            </CardContent>
          </Card>
        ) : (
          filteredCategories
            .filter(category => category.categoryName && category.categoryName.trim() !== '')
            .map((categoryMetadata, index) => {
              const isExpanded = expandedCategories.has(categoryMetadata.categoryName);
              const isLoading = loadingCategories.has(categoryMetadata.categoryName);
              const mainCat = getMainCategory(categoryMetadata.categoryName);
              const mainCatColor = mainCat === "Bar" ? "blue" : mainCat === "Keuken" ? "green" : "gray";
              
              const categoryKey = categoryMetadata.categoryName && categoryMetadata.categoryName.trim() !== '' 
                ? categoryMetadata.categoryName 
                : `category-${index}`;
              
              // Get category with products (lazy-loaded)
              const category = getCategoryWithProducts(categoryMetadata);
              if (!category) return null;
              
              return (
                <Card key={categoryKey}>
                  <Collapsible open={isExpanded} onOpenChange={() => toggleCategory(categoryMetadata.categoryName)}>
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
                              {category.productCount || category.products.length} products
                            </span>
                            {isLoading && (
                              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Total: {formatNumber(category.total.quantity, 0, false)} items • {formatCurrency(category.total.revenueIncVat)}
                          </div>
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent>
                      <CardContent className="space-y-4">
                        {isLoading ? (
                          <div className="py-8 text-center text-muted-foreground">
                            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                            Loading products...
                          </div>
                        ) : category.products.length === 0 ? (
                          <div className="py-8 text-center text-muted-foreground">
                            No products found matching your filters.
                          </div>
                        ) : (
                          <>
                            {/* Bulk Actions */}
                            <div className="flex gap-2 pb-4 border-b">
                              <span className="text-sm font-medium self-center">Bulk Actions:</span>
                              <Select onValueChange={(val) => handleBulkUpdateWorkload(category, val as any)}>
                                <SelectTrigger className="w-40">
                                  <SelectValue placeholder="Set All Workload" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="low">Low</SelectItem>
                                  <SelectItem value="mid">Mid</SelectItem>
                                  <SelectItem value="high">High</SelectItem>
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
                              {category.products
                                .filter(product => product && product.productName && product.productName.trim() !== '')
                                .map((product, productIndex) => {
                                  const productKey = category.categoryName && category.categoryName.trim() !== '' && product.productName && product.productName.trim() !== ''
                                    ? `${category.categoryName}-${product.productName}`
                                    : `product-${productIndex}`;
                                  
                                  return (
                                    <ProductRow
                                      key={productKey}
                                      product={product}
                                      categoryName={category.categoryName}
                                      onUpdateWorkload={handleUpdateWorkload}
                                      onUpdateMEP={handleUpdateMEP}
                                      onUpdateCourseType={handleUpdateCourseType}
                                    />
                                  );
                                })}
                            </div>
                          </>
                        )}
                      </CardContent>
                    </CollapsibleContent>
                  </Collapsible>
                </Card>
              );
            })
        )}
      </div>
    </div>
  );
}

// ✅ Memoized Product Row Component
const ProductRow = React.memo(({
  product,
  categoryName,
  onUpdateWorkload,
  onUpdateMEP,
  onUpdateCourseType,
}: {
  product: ProductAggregate;
  categoryName: string;
  onUpdateWorkload: (productName: string, level: 'low' | 'mid' | 'high', minutes: number) => void;
  onUpdateMEP: (productName: string, level: 'low' | 'mid' | 'high', minutes: number) => void;
  onUpdateCourseType: (productName: string, courseType: CourseType | null) => void;
}) => {
  const handleWorkloadChange = useCallback((val: string) => {
    const level = val as 'low' | 'mid' | 'high';
    const minutes = level === 'low' ? 2.5 : level === 'mid' ? 5 : 10;
    onUpdateWorkload(product.productName, level, minutes);
  }, [product.productName, onUpdateWorkload]);

  const handleMEPChange = useCallback((val: string) => {
    const level = val as 'low' | 'mid' | 'high';
    const minutes = level === 'low' ? 1 : level === 'mid' ? 2 : 4;
    onUpdateMEP(product.productName, level, minutes);
  }, [product.productName, onUpdateMEP]);

  const handleCourseTypeChange = useCallback((val: string) => {
    onUpdateCourseType(product.productName, val === "none" ? null : val as CourseType);
  }, [product.productName, onUpdateCourseType]);

  return (
    <div className="grid grid-cols-12 gap-4 items-center py-2 hover:bg-gray-50">
      <div className="col-span-3 font-medium">{product.productName}</div>
      <div className="col-span-1 text-right">{formatNumber(product.total.quantity, 0, false)}</div>
      <div className="col-span-2 text-right">{formatCurrency(product.total.revenueIncVat)}</div>
      
      {/* Workload Select */}
      <div className="col-span-2">
        <Select
          value={product.workloadLevel || 'mid'}
          onValueChange={handleWorkloadChange}
        >
          <SelectTrigger className="h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="mid">Mid</SelectItem>
            <SelectItem value="high">High</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {/* MEP Select */}
      <div className="col-span-2">
        <Select
          value={product.mepLevel || 'low'}
          onValueChange={handleMEPChange}
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
          value={product.courseType && product.courseType.trim() !== "" ? product.courseType : "none"}
          onValueChange={handleCourseTypeChange}
        >
          <SelectTrigger className="h-8">
            <SelectValue placeholder="Select..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            {courseTypeOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}, (prev, next) => {
  // Custom comparison for React.memo
  return (
    prev.product.productName === next.product.productName &&
    prev.product.workloadLevel === next.product.workloadLevel &&
    prev.product.mepLevel === next.product.mepLevel &&
    prev.product.courseType === next.product.courseType &&
    prev.product.total.quantity === next.product.total.quantity &&
    prev.product.total.revenueIncVat === next.product.total.revenueIncVat &&
    prev.categoryName === next.categoryName
  );
});

ProductRow.displayName = 'ProductRow';
