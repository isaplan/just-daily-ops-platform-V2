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
import { ChevronRight, Loader2 } from "lucide-react";
import { AutocompleteSearch, AutocompleteOption } from "@/components/view-data/AutocompleteSearch";
import { getBreadcrumb } from "@/lib/navigation/breadcrumb-registry";
import { CategoryAggregate, ProductAggregate } from "@/models/sales/categories-products.model";
import { CourseType } from "@/models/products/product.model";
import { getLocations } from "@/lib/services/graphql/queries";
import { useQuery } from "@tanstack/react-query";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { useDebounce } from "@/hooks/useDebounce";
import { useLazyCategoryProducts } from "@/hooks/useLazyCategoryProducts";
import { CategoryMetadata } from "@/lib/services/graphql/queries";
import { fetchCategoriesMetadata } from "@/lib/services/sales/categories-products.service";
import { LocationFilterButtons } from "@/components/view-data/LocationFilterButtons";

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
// This is a fallback when mainCategoryName is not available in the database
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
  "Bier": "Bar",
  "Drank": "Bar",
  "Dranken": "Bar",
  "Alcohol": "Bar",
  "Non-alcohol": "Bar",
  "Non-alcoholisch": "Bar",
  // Keuken categories
  "Lunch": "Keuken",
  "Diner": "Keuken",
  "Voorgerecht": "Keuken",
  "Hoofdgerecht": "Keuken",
  "Nagerecht": "Keuken",
  "Bijgerecht": "Keuken",
  "Snacks": "Keuken",
  "Brood": "Keuken",
  "Gerecht": "Keuken",
  "Gerechten": "Keuken",
  "Eten": "Keuken",
  "Food": "Keuken",
};

// Bar-related keywords
const barKeywords = ["bier", "cocktail", "wijn", "spirit", "frisdrank", "koffie", "thee", "drank", "alcohol"];

// Keuken-related keywords
const keukenKeywords = ["lunch", "diner", "gerecht", "voorgerecht", "hoofdgerecht", "nagerecht", "bijgerecht", "snack", "brood", "eten", "food"];

function getMainCategory(categoryName: string): "Bar" | "Keuken" | "Other" {
  // Check exact match first
  if (categoryToMainCategoryMap[categoryName]) {
    return categoryToMainCategoryMap[categoryName];
  }
  
  // Check case-insensitive match by checking all keys
  const lowerName = categoryName.toLowerCase();
  for (const [key, value] of Object.entries(categoryToMainCategoryMap)) {
    if (key.toLowerCase() === lowerName) {
      return value;
    }
  }
  
  // Check for Bar keywords
  for (const keyword of barKeywords) {
    if (lowerName.includes(keyword)) {
      return "Bar";
    }
  }
  
  // Check for Keuken keywords
  for (const keyword of keukenKeywords) {
    if (lowerName.includes(keyword)) {
      return "Keuken";
    }
  }
  
  return "Other";
}

export function ProductsClient({ initialData }: ProductsClientProps) {
  const pathname = usePathname();
  const pageMetadata = getBreadcrumb(pathname);
  
  // Filter state (all client-side)
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1; // getMonth() returns 0-11, we need 1-12
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(currentMonth); // Start with current month
  const [selectedLocation, setSelectedLocation] = useState<string>("all");
  const [selectedMainCategory, setSelectedMainCategory] = useState<"all" | "Bar" | "Keuken" | "Other">("all");
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>("all");
  const [selectedMenu, setSelectedMenu] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedWorkloadLevel, setSelectedWorkloadLevel] = useState<string>("all");
  const [selectedMEPLevel, setSelectedMEPLevel] = useState<string>("all");
  const [activeFilter, setActiveFilter] = useState<"active" | "all" | "inactive">("all"); // Default to all - show all products
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [loadingCategories, setLoadingCategories] = useState<Set<string>>(new Set());
  const [menus, setMenus] = useState<any[]>([]);

  // Month options
  const MONTHS = [
    { value: 1, label: "Jan" },
    { value: 2, label: "Feb" },
    { value: 3, label: "Mar" },
    { value: 4, label: "Apr" },
    { value: 5, label: "May" },
    { value: 6, label: "Jun" },
    { value: 7, label: "Jul" },
    { value: 8, label: "Aug" },
    { value: 9, label: "Sep" },
    { value: 10, label: "Oct" },
    { value: 11, label: "Nov" },
    { value: 12, label: "Dec" },
  ];

  // Year options (only show 2024, 2025 - not 2026 until we're in 2026)
  const yearOptions = useMemo(() => {
    const years = [currentYear - 1, currentYear]; // 2024, 2025
    // Only add next year if we're already in it or past it
    if (currentYear >= 2026) {
      years.push(currentYear + 1);
    }
    return years;
  }, [currentYear]);

  // Get date range from initialData or use full year/month for selected year
  const dateRange = useMemo(() => {
    // If month is selected, use that month
    if (selectedMonth) {
      const startOfMonth = new Date(selectedYear, selectedMonth - 1, 1);
      startOfMonth.setHours(0, 0, 0, 0);
      
      const endOfMonth = new Date(selectedYear, selectedMonth, 0); // Last day of selected month
      endOfMonth.setHours(23, 59, 59, 999);
      
      return {
        startDate: startOfMonth.toISOString().split('T')[0],
        endDate: endOfMonth.toISOString().split('T')[0],
      };
    }
    
    // Otherwise, use the full year (January 1 to December 31)
    // This applies when no month is selected, regardless of whether it's the current year
    const startOfYear = new Date(selectedYear, 0, 1); // January 1
    startOfYear.setHours(0, 0, 0, 0);
    
    const endOfYear = new Date(selectedYear, 11, 31); // December 31
    endOfYear.setHours(23, 59, 59, 999);
    
    return {
      startDate: startOfYear.toISOString().split('T')[0],
      endDate: endOfYear.toISOString().split('T')[0],
    };
  }, [selectedYear, selectedMonth]);

  // Check if filters have changed from initial data
  const filtersChanged = useMemo(() => {
    if (!initialData?.dateRange) return true;
    const initialLocation = 'all'; // Server always fetches with 'all'
    const initialYear = new Date(initialData.dateRange.startDate).getFullYear();
    const initialMonth = new Date(initialData.dateRange.startDate).getMonth() + 1; // 1-12
    
    return (
      dateRange.startDate !== initialData.dateRange.startDate ||
      dateRange.endDate !== initialData.dateRange.endDate ||
      selectedLocation !== initialLocation ||
      selectedYear !== initialYear ||
      selectedMonth !== initialMonth // Compare with initial month instead of null
    );
  }, [dateRange, selectedLocation, selectedYear, selectedMonth, initialData?.dateRange]);

  // Fetch categories metadata (refetch when filters change)
  // Don't use initialData when filters have changed - force a fresh fetch
  const { data: categoriesMetadataResponse, isLoading: categoriesLoading, error: categoriesError } = useQuery({
    queryKey: ['categories-metadata', dateRange.startDate, dateRange.endDate, selectedLocation],
    queryFn: async () => {
      console.log('[ProductsClient] Fetching categories metadata with filters:', {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        locationId: selectedLocation,
      });
      try {
        const result = await fetchCategoriesMetadata({
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
          locationId: selectedLocation,
          category: 'all',
        });
        console.log('[ProductsClient] Fetched categories metadata:', {
          filters: { startDate: dateRange.startDate, endDate: dateRange.endDate, locationId: selectedLocation },
          categoriesCount: result.categories?.length || 0,
          success: result.success,
        });
        return result;
      } catch (error: any) {
        // Ignore AbortError - expected when requests are cancelled
        if (error?.name === 'AbortError' || error?.message?.includes('aborted')) {
          throw error; // Re-throw so React Query handles it
        }
        console.error('[ProductsClient] Error fetching categories metadata:', error);
        throw error;
      }
    },
    // Only use initialData if filters haven't changed
    initialData: !filtersChanged ? initialData?.categoriesMetadata : undefined,
    placeholderData: initialData?.categoriesMetadata,
    staleTime: 0, // Always consider data stale - refetch when query key changes
    gcTime: 0, // Don't cache - always fetch fresh data
    enabled: true,
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
  });
  
  // Use query data if available, otherwise fall back to initialData
  const categoriesMetadata = categoriesMetadataResponse || initialData?.categoriesMetadata;
  
  // Use initialData locations directly, or fetch if not available
  // This ensures we use server-fetched data immediately
  const locationsFromInitialData = initialData?.locations || [];
  const hasInitialLocations = locationsFromInitialData.length > 0;
  
  const { data: locationsFromQuery, error: locationsError, isLoading: locationsLoading } = useQuery({
    queryKey: ["locations"],
    queryFn: getLocations,
    enabled: !hasInitialLocations, // Only fetch if we don't have initial data
    initialData: locationsFromInitialData,
    placeholderData: locationsFromInitialData,
    staleTime: 60 * 60 * 1000, // 60 minutes
    retry: 1, // Only retry once if it fails
  });
  
  // Use initialData if available, otherwise use query data
  const locations = hasInitialLocations ? locationsFromInitialData : (locationsFromQuery || []);


  // Lazy loading hook for products
  const lazyProducts = useLazyCategoryProducts({
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    filters: {
      locationId: selectedLocation,
    },
  });

  // Clear cache and refetch when year, month, or location changes
  useEffect(() => {
    console.log('[ProductsClient] Filters changed:', {
      selectedYear,
      selectedMonth,
      selectedLocation,
      dateRange,
    });
    const { clearCache } = lazyProducts;
    clearCache();
    // Collapse all categories when filters change
    setExpandedCategories(new Set());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYear, selectedMonth, selectedLocation, dateRange.startDate, dateRange.endDate]);

  // Debounce search query (300ms delay)
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

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

  // Category search options for autocomplete
  const categorySearchOptions = useMemo<AutocompleteOption[]>(() => {
    return allCategories.map((cat) => ({
      value: cat.categoryName,
      label: cat.categoryName,
      category: cat,
    }));
  }, [allCategories]);

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

  // Helper to get main category from metadata or fallback to mapping
  const getMainCategoryFromMetadata = useCallback((category: typeof allCategories[0]): "Bar" | "Keuken" | "Other" => {
    // Use mainCategoryName from metadata if available
    if (category.mainCategoryName) {
      const mainCat = category.mainCategoryName.trim();
      // Normalize: check case-insensitive and handle variations
      const lowerMainCat = mainCat.toLowerCase();
      if (lowerMainCat === "bar" || lowerMainCat === "drank" || lowerMainCat === "dranken") {
        return "Bar";
      }
      if (lowerMainCat === "keuken" || lowerMainCat === "kitchen" || lowerMainCat === "eten" || lowerMainCat === "food" || lowerMainCat === "gerecht" || lowerMainCat === "gerechten") {
        return "Keuken";
      }
      // If it's a valid main category name, use it
      if (mainCat === "Bar" || mainCat === "Keuken") {
        return mainCat;
      }
    }
    // Fallback to intelligent mapping based on category name
    return getMainCategory(category.categoryName);
  }, []);

  // Group categories by main category
  const groupedCategories = useMemo(() => {
    const grouped: Record<"Bar" | "Keuken" | "Other", typeof allCategories> = {
      Bar: [],
      Keuken: [],
      Other: [],
    };
    
    for (const category of allCategories) {
      const mainCat = getMainCategoryFromMetadata(category);
      grouped[mainCat].push(category);
    }
    
    return grouped;
  }, [allCategories, getMainCategoryFromMetadata]);

  // ✅ CLIENT-SIDE FILTERING (no API calls)
  const filteredCategories = useMemo(() => {
    console.log('[ProductsClient] Filtering categories with:', {
      allCategoriesCount: allCategories.length,
      selectedMainCategory,
      selectedSubCategory,
      searchQuery: debouncedSearchQuery,
    });
    
    let categories = allCategories;
    
    // Main category filter
    if (selectedMainCategory !== "all") {
      categories = groupedCategories[selectedMainCategory] || [];
      console.log('[ProductsClient] After main category filter:', categories.length);
    }
    
    // Sub category filter
    if (selectedSubCategory !== "all") {
      const beforeCount = categories.length;
      categories = categories.filter((cat) => cat.categoryName === selectedSubCategory);
      console.log('[ProductsClient] After sub category filter:', { before: beforeCount, after: categories.length });
    }
    
    // Search filter (on main category, sub category name, and product names)
    // Note: Product name search happens in getCategoryWithProducts when products are loaded
    // For now, we show categories that match main/sub category names
    // Users can expand categories to see products that match the search query
    if (debouncedSearchQuery) {
      const beforeCount = categories.length;
      const query = debouncedSearchQuery.toLowerCase();
      categories = categories.filter((cat) => {
        // Search in sub category name (e.g., "Tap Bier", "Lunch")
        if (cat.categoryName.toLowerCase().includes(query)) {
          return true;
        }
        // Search in main category name (e.g., "Bar", "Keuken", "Other")
        const mainCat = getMainCategoryFromMetadata(cat);
        if (mainCat.toLowerCase().includes(query)) {
          return true;
        }
        // Note: Product name search happens in getCategoryWithProducts
        // We don't filter out categories here if only products match,
        // because products are lazy-loaded and we can't check them at this stage
        return false;
      });
      console.log('[ProductsClient] After search filter:', { before: beforeCount, after: categories.length, query });
    }
    
    // Workload/MEP/Active filters will be applied when products are loaded
    // (we can't filter by product properties until products are loaded)
    
    console.log('[ProductsClient] Final filtered categories:', categories.length);
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
    if (!locations || locations.length === 0) {
      return [{ value: "all", label: "All Locations" }];
    }
    
    // First pass: filter out invalid locations
    const validLocations = locations.filter((loc: any) => {
      if (!loc) return false;
      
      // Check if location has id (can be string or number)
      const hasId = loc.id !== null && loc.id !== undefined && loc.id !== '';
      if (!hasId) return false;
      
      // Check if location has name
      const hasName = loc.name !== null && loc.name !== undefined && String(loc.name).trim() !== '';
      if (!hasName) return false;
      
      return true;
    });
    
    // Second pass: filter out aggregate/system locations
    const filteredLocations = validLocations.filter((loc: any) => {
      const name = String(loc.name).trim();
      return (
        name !== "All HNHG Locations" && 
        name !== "All HNG Locations" &&
        name !== "Default Location"
      );
    });
    
    // Build options array
    const options = [
      { value: "all", label: "All Locations" },
      ...filteredLocations.map((loc: any) => ({
        value: String(loc.id).trim(),
        label: String(loc.name).trim(),
      })),
    ];
    
    return options;
  }, [locations]);


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

    // ✅ For Uncategorized, skip ALL filters - show all products immediately
    if (categoryMetadata.categoryName === 'Uncategorized') {
      return {
        ...categoryMetadata,
        products, // Show all products without any filtering
        daily: categoryData.daily || { quantity: 0, revenueExVat: 0, revenueIncVat: 0, transactionCount: 0 },
        weekly: categoryData.weekly || { quantity: 0, revenueExVat: 0, revenueIncVat: 0, transactionCount: 0 },
        monthly: categoryData.monthly || { quantity: 0, revenueExVat: 0, revenueIncVat: 0, transactionCount: 0 },
        total: categoryData.total || categoryMetadata.total,
      };
    }

    // Menu filter
    if (selectedMenu !== "all") {
      const menu = menus.find((m) => m._id === selectedMenu);
      if (menu && menu.productIds && menu.productIds.length > 0) {
        products = products.filter((prod) =>
          menu.productIds.includes(prod.productName)
        );
      }
    }

    // Search filter (on product names) - searches Main Category, Sub Category, and Product names
    if (debouncedSearchQuery) {
      const query = debouncedSearchQuery.toLowerCase();
      // Check if category matches (main or sub)
      const mainCat = getMainCategoryFromMetadata(categoryMetadata);
      const categoryMatches = 
        categoryMetadata.categoryName.toLowerCase().includes(query) ||
        mainCat.toLowerCase().includes(query);
      
      // Filter products by name
      const matchingProducts = products.filter((prod) =>
        prod.productName.toLowerCase().includes(query)
      );
      
      // If category matches OR has matching products, show all products (category is already shown)
      // If only products match, show only matching products
      if (categoryMatches) {
        // Category matches - show all products (category filter already handled this)
        products = products;
      } else {
        // Only product names match - show only matching products
        products = matchingProducts;
      }
    }

    // Workload Level filter
    // Note: Only filter if workloadLevel is set - don't exclude products without workloadLevel
    if (selectedWorkloadLevel !== "all") {
      products = products.filter((prod) =>
        prod.workloadLevel === selectedWorkloadLevel || !prod.workloadLevel
      );
    }

    // MEP Level filter
    // Note: Only filter if mepLevel is set - don't exclude products without mepLevel
    if (selectedMEPLevel !== "all") {
      products = products.filter((prod) =>
        prod.mepLevel === selectedMEPLevel || !prod.mepLevel
      );
    }

    // Active filter
    // Note: Handle null/undefined isActive values - treat them as "active" for display purposes
    if (activeFilter === "active") {
      products = products.filter((prod) => prod.isActive === true || prod.isActive === null || prod.isActive === undefined);
    } else if (activeFilter === "inactive") {
      products = products.filter((prod) => prod.isActive === false);
    }
    // "all" shows both active, inactive, and null/undefined

    return {
      ...categoryMetadata,
      products,
      daily: categoryData.daily || { quantity: 0, revenueExVat: 0, revenueIncVat: 0, transactionCount: 0 },
      weekly: categoryData.weekly || { quantity: 0, revenueExVat: 0, revenueIncVat: 0, transactionCount: 0 },
      monthly: categoryData.monthly || { quantity: 0, revenueExVat: 0, revenueIncVat: 0, transactionCount: 0 },
      total: categoryData.total || categoryMetadata.total,
    };
  }, [expandedCategories, lazyProducts, selectedMenu, menus, debouncedSearchQuery, selectedWorkloadLevel, selectedMEPLevel, activeFilter]);

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

  // Handle category assignment (for Uncategorized products)
  const handleUpdateCategory = useCallback(async (
    productName: string,
    category: string
  ) => {
    try {
      // Update product category via API
      const response = await fetch('/api/products/update-category', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productName,
          category,
        }),
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to update category');
      }

      // Refresh the page data
      window.location.reload();
    } catch (error: any) {
      console.error('Error updating category:', error);
      alert(`Failed to update category: ${error.message}`);
    }
  }, []);

  // Handle location assignment (for Uncategorized products)
  const handleUpdateLocation = useCallback(async (
    productName: string,
    locationId: string
  ) => {
    try {
      // Update product location via API
      const response = await fetch('/api/products/update-location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productName,
          locationId: locationId === 'all' ? null : locationId,
        }),
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to update location');
      }

      // Refresh the page data
      window.location.reload();
    } catch (error: any) {
      console.error('Error updating location:', error);
      alert(`Failed to update location: ${error.message}`);
    }
  }, []);

  // Get all available categories for dropdown (excluding Uncategorized)
  const availableCategories = useMemo(() => {
    return allCategories
      .filter(cat => cat.categoryName !== 'Uncategorized')
      .map(cat => cat.categoryName)
      .sort();
  }, [allCategories]);

  // Show loading state while fetching categories metadata
  if (categoriesLoading && !categoriesMetadata) {
    return (
      <div className="container mx-auto py-6">
        <LoadingState message="Loading product catalog..." />
      </div>
    );
  }

  // Show error state if categories metadata failed to load
  if (categoriesError || !categoriesMetadata?.success) {
    return (
      <div className="container mx-auto py-6">
        <ErrorState 
          error={categoriesError || new Error(categoriesMetadata?.error || 'Failed to load categories metadata')} 
          message="Failed to load product catalog" 
        />
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
      <div className="space-y-6">
        {/* Year and Month Filters */}
        <div className="space-y-4">
          {/* Year Filter - Buttons */}
            <div className="space-y-2">
            <span className="text-sm font-bold text-foreground">Year</span>
            <div className="flex gap-2 flex-wrap">
              {yearOptions.map((year) => {
                const isActive = selectedYear === year;
                return (
                  <Button
                    key={year}
                    variant="outline"
                    size="sm"
                    className={`border rounded-sm ${
                      isActive
                        ? "bg-blue-500 border-blue-500 text-white"
                        : "bg-white border-black hover:bg-blue-500 hover:border-blue-500 hover:text-white"
                    }`}
                    onClick={() => {
                      setSelectedYear(year);
                      setSelectedMonth(null); // Clear month when changing year
                    }}
                  >
                      {year}
                  </Button>
                );
              })}
            </div>
            </div>
            
          {/* Month Filter - Buttons */}
            <div className="space-y-2">
            <span className="text-sm font-bold text-foreground">Month</span>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                className={`border rounded-sm ${
                  selectedMonth === null
                    ? "bg-blue-500 border-blue-500 text-white"
                    : "bg-white border-black hover:bg-blue-500 hover:border-blue-500 hover:text-white"
                }`}
                onClick={() => setSelectedMonth(null)}
              >
                All Months
              </Button>
              {MONTHS.map((month) => {
                const isActive = selectedMonth === month.value;
                return (
                  <Button
                    key={month.value}
                    variant="outline"
                    size="sm"
                    className={`border rounded-sm ${
                      isActive
                        ? "bg-blue-500 border-blue-500 text-white"
                        : "bg-white border-black hover:bg-blue-500 hover:border-blue-500 hover:text-white"
                    }`}
                    onClick={() => setSelectedMonth(month.value)}
                  >
                    {month.label}
                  </Button>
                );
              })}
            </div>
          </div>
            </div>
            
        {/* Location Filter - Buttons */}
        <LocationFilterButtons
          options={locationOptions}
          selectedValue={selectedLocation}
          onValueChange={setSelectedLocation}
          label="Location"
        />

        {/* Other Filters - Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Main Category Filter - Dropdown */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Main Category</label>
              <Select value={selectedMainCategory} onValueChange={(val) => {
                setSelectedMainCategory(val as any);
                setSelectedSubCategory("all");
              }}>
              <SelectTrigger className="border rounded-sm bg-white border-black">
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
            
          {/* Sub Category Filter - Dropdown */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Sub Category</label>
              <Select value={selectedSubCategory} onValueChange={setSelectedSubCategory}>
              <SelectTrigger className="border rounded-sm bg-white border-black">
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
            
          {/* Menu Filter - Dropdown */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Menu</label>
              <Select value={selectedMenu} onValueChange={setSelectedMenu}>
                <SelectTrigger className="border rounded-sm bg-white border-black">
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
            
          {/* Search - Input with Autocomplete */}
          <AutocompleteSearch
            options={categorySearchOptions}
            value={searchQuery}
            onValueChange={setSearchQuery}
            placeholder="Search products..."
            label="Search"
            emptyMessage="No products found."
            className="space-y-2"
          />
            
          {/* Workload Level Filter - Dropdown */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Workload Level</label>
              <Select value={selectedWorkloadLevel} onValueChange={setSelectedWorkloadLevel}>
              <SelectTrigger className="border rounded-sm bg-white border-black">
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
            
          {/* MEP Level Filter - Dropdown */}
            <div className="space-y-2">
              <label className="text-sm font-medium">MEP Level</label>
              <Select value={selectedMEPLevel} onValueChange={setSelectedMEPLevel}>
              <SelectTrigger className="border rounded-sm bg-white border-black">
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
            
          {/* Active Filter - Buttons */}
          <div className="space-y-2">
            <span className="text-sm font-bold text-foreground">Status</span>
            <div className="flex gap-2 flex-wrap">
              {[
                { value: "active", label: "Active" },
                { value: "all", label: "All" },
                { value: "inactive", label: "Inactive" },
              ].map((option) => {
                const isActive = activeFilter === option.value;
                return (
              <Button
                    key={option.value}
                    variant="outline"
                    size="sm"
                    className={`border rounded-sm ${
                      isActive
                        ? "bg-blue-500 border-blue-500 text-white"
                        : "bg-white border-black hover:bg-blue-500 hover:border-blue-500 hover:text-white"
                    }`}
                    onClick={() => setActiveFilter(option.value as "active" | "all" | "inactive")}
                  >
                    {option.label}
              </Button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      
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
              const mainCat = getMainCategoryFromMetadata(categoryMetadata);
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
                          {/* Hide totals for Uncategorized */}
                          {category.categoryName !== 'Uncategorized' && (
                          <div className="text-sm text-muted-foreground">
                            Total: {formatNumber(category.total.quantity, 0, false)} items • {formatCurrency(category.total.revenueIncVat)}
                          </div>
                          )}
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent>
                      <CardContent className="space-y-4">
                        {/* ✅ Show different actions for Uncategorized vs regular categories */}
                        {category.categoryName === 'Uncategorized' ? (
                          /* Uncategorized: Show bulk assignment and reaggregate */
                          <div className="space-y-3 pb-4 border-b">
                            <div className="flex gap-2 flex-wrap items-center">
                              <span className="text-sm font-medium">Bulk Actions:</span>
                              <Select 
                                onValueChange={async (selectedCategory) => {
                                  if (!selectedCategory || selectedCategory === 'none') return;
                                  if (!confirm(`Assign all ${category.products.length} products to category "${selectedCategory}"?`)) return;
                                  
                                  try {
                                    const updates = category.products.map((product) =>
                                      handleUpdateCategory(product.productName, selectedCategory)
                                    );
                                    await Promise.all(updates);
                                    alert(`Assigned ${category.products.length} products to "${selectedCategory}"`);
                                    window.location.reload();
                                  } catch (error: any) {
                                    console.error('Error bulk updating category:', error);
                                    alert(`Failed to update: ${error.message}`);
                                  }
                                }}
                                disabled={isLoading || category.products.length === 0}
                              >
                                <SelectTrigger className="w-48 border rounded-sm bg-white border-black">
                                  <SelectValue placeholder="Assign All to Category" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">Select category...</SelectItem>
                                  {availableCategories.map((cat) => (
                                    <SelectItem key={cat} value={cat}>
                                      {cat}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              
                              <Select 
                                onValueChange={async (selectedLocation) => {
                                  if (!selectedLocation || selectedLocation === 'all') return;
                                  if (!confirm(`Assign all ${category.products.length} products to location "${locationOptions.find(l => l.value === selectedLocation)?.label}"?`)) return;
                                  
                                  try {
                                    const updates = category.products.map((product) =>
                                      handleUpdateLocation(product.productName, selectedLocation)
                                    );
                                    await Promise.all(updates);
                                    alert(`Assigned ${category.products.length} products to location`);
                                    window.location.reload();
                                  } catch (error: any) {
                                    console.error('Error bulk updating location:', error);
                                    alert(`Failed to update: ${error.message}`);
                                  }
                                }}
                                disabled={isLoading || category.products.length === 0}
                              >
                                <SelectTrigger className="w-48 border rounded-sm bg-white border-black">
                                  <SelectValue placeholder="Assign All to Location" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="all">All Locations</SelectItem>
                                  {locationOptions.filter(loc => loc.value !== 'all').map((loc) => (
                                    <SelectItem key={loc.value} value={loc.value}>
                                      {loc.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                          </div>
                            
                            <div className="flex gap-2 flex-wrap items-center">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={async () => {
                                  if (!confirm(`Re-process raw data to update categories for ${category.products.length} uncategorized products? This will only update uncategorized products, not all products.`)) return;
                                  
                                  try {
                                    const response = await fetch('/api/products/reaggregate-uncategorized', {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                    });
                                    const result = await response.json();
                                    if (result.success) {
                                      alert(`Reaggregation complete: ${result.updated} products updated${result.errors ? ` (${result.errors.length} errors)` : ''}`);
                                      // Refresh the page data
                                      window.location.reload();
                                    } else {
                                      throw new Error(result.error || 'Reaggregation failed');
                                    }
                                  } catch (error: any) {
                                    console.error('Error reaggregating products:', error);
                                    alert(`Failed to reaggregate: ${error.message}`);
                                  }
                                }}
                                disabled={loadingCategories.has(category.categoryName)}
                              >
                                <Loader2 className={`h-4 w-4 mr-2 ${loadingCategories.has(category.categoryName) ? 'animate-spin' : ''}`} />
                                Reaggregate Uncategorized
                              </Button>
                              <span className="text-xs text-muted-foreground">
                                Re-process raw data to update categories for uncategorized products only
                              </span>
                            </div>
                          </div>
                        ) : (
                          /* Regular categories: Show bulk actions */
                            <div className="flex gap-2 pb-4 border-b">
                              <span className="text-sm font-medium self-center">Bulk Actions:</span>
                            <Select 
                              onValueChange={(val) => handleBulkUpdateWorkload(category, val as any)}
                              disabled={isLoading}
                            >
                                <SelectTrigger className="w-40">
                                  <SelectValue placeholder="Set All Workload" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="low">Low</SelectItem>
                                  <SelectItem value="mid">Mid</SelectItem>
                                  <SelectItem value="high">High</SelectItem>
                                </SelectContent>
                              </Select>
                              
                            <Select 
                              onValueChange={(val) => handleBulkUpdateMEP(category, val as any)}
                              disabled={isLoading}
                            >
                                <SelectTrigger className="w-40">
                                  <SelectValue placeholder="Set All MEP" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="low">Low (1m)</SelectItem>
                                  <SelectItem value="mid">Mid (2m)</SelectItem>
                                  <SelectItem value="high">High (4m)</SelectItem>
                                </SelectContent>
                              </Select>
                              
                            <Select 
                              onValueChange={(val) => handleBulkUpdateCourseType(category, val as any)}
                              disabled={isLoading}
                            >
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
                        )}

                        {/* ✅ Show loading message while data is being fetched */}
                        {isLoading ? (
                          <div className="py-8 text-center text-muted-foreground">
                            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                            <p>Loading the data, one moment.</p>
                          </div>
                        ) : category.products.length === 0 ? (
                          <div className="py-8 text-center text-muted-foreground">
                            <p>No products found matching your filters.</p>
                            {categoryMetadata.productCount > 0 && (
                              <p className="text-xs mt-2">
                                Note: {categoryMetadata.productCount} products exist in this category, but none match the current filters.
                                Try adjusting your filters (Status, Workload Level, MEP Level, Menu, or Search).
                              </p>
                            )}
                          </div>
                        ) : (
                          <>
                            
                            {/* Products Table */}
                            <div className="space-y-2">
                              {/* Header */}
                              <div className={`grid gap-4 text-sm font-medium text-muted-foreground pb-2 border-b ${
                                category.categoryName === 'Uncategorized' 
                                  ? 'grid-cols-12' 
                                  : 'grid-cols-12'
                              }`}>
                                <div className="col-span-3">Product Name</div>
                                {category.categoryName === 'Uncategorized' ? (
                                  <>
                                    <div className="col-span-2">Assign Category</div>
                                    <div className="col-span-2">Assign Location</div>
                                    <div className="col-span-2">Workload</div>
                                    <div className="col-span-2">MEP Time</div>
                                    <div className="col-span-1">Course Type</div>
                                  </>
                                ) : (
                                  <>
                                <div className="col-span-1 text-right">Quantity</div>
                                <div className="col-span-2 text-right">Revenue (Inc VAT)</div>
                                <div className="col-span-2">Workload</div>
                                <div className="col-span-2">MEP Time</div>
                                <div className="col-span-2">Course Type</div>
                                  </>
                                )}
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
                                      isUncategorized={category.categoryName === 'Uncategorized'}
                                      availableCategories={availableCategories}
                                      locationOptions={locationOptions}
                                      onUpdateWorkload={handleUpdateWorkload}
                                      onUpdateMEP={handleUpdateMEP}
                                      onUpdateCourseType={handleUpdateCourseType}
                                      onUpdateCategory={handleUpdateCategory}
                                      onUpdateLocation={handleUpdateLocation}
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
  isUncategorized = false,
  availableCategories = [],
  locationOptions = [],
  onUpdateWorkload,
  onUpdateMEP,
  onUpdateCourseType,
  onUpdateCategory,
  onUpdateLocation,
}: {
  product: ProductAggregate;
  categoryName: string;
  isUncategorized?: boolean;
  availableCategories?: string[];
  locationOptions?: Array<{ value: string; label: string }>;
  onUpdateWorkload: (productName: string, level: 'low' | 'mid' | 'high', minutes: number) => void;
  onUpdateMEP: (productName: string, level: 'low' | 'mid' | 'high', minutes: number) => void;
  onUpdateCourseType: (productName: string, courseType: CourseType | null) => void;
  onUpdateCategory?: (productName: string, category: string) => void;
  onUpdateLocation?: (productName: string, locationId: string) => void;
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

  const handleCategoryChange = useCallback((val: string) => {
    if (onUpdateCategory && val) {
      onUpdateCategory(product.productName, val);
    }
  }, [product.productName, onUpdateCategory]);

  const handleLocationChange = useCallback((val: string) => {
    if (onUpdateLocation) {
      onUpdateLocation(product.productName, val);
    }
  }, [product.productName, onUpdateLocation]);

  return (
    <div className="grid grid-cols-12 gap-4 items-center py-2 hover:bg-gray-50">
      <div className="col-span-3 font-medium">{product.productName}</div>
      
      {isUncategorized ? (
        <>
          {/* Category Assignment */}
          <div className="col-span-2">
            <Select
              value=""
              onValueChange={handleCategoryChange}
            >
              <SelectTrigger className="h-8 border rounded-sm bg-white border-black">
                <SelectValue placeholder="Select category..." />
              </SelectTrigger>
              <SelectContent>
                {availableCategories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Location Assignment */}
          <div className="col-span-2">
            <Select
              value=""
              onValueChange={handleLocationChange}
            >
              <SelectTrigger className="h-8 border rounded-sm bg-white border-black">
                <SelectValue placeholder="Select location..." />
              </SelectTrigger>
              <SelectContent>
                {locationOptions.map((loc) => (
                  <SelectItem key={loc.value} value={loc.value}>
                    {loc.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
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
          <div className="col-span-1">
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
        </>
      ) : (
        <>
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
        </>
      )}
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
    prev.categoryName === next.categoryName &&
    prev.isUncategorized === next.isUncategorized &&
    prev.availableCategories.length === next.availableCategories.length &&
    prev.locationOptions.length === next.locationOptions.length
  );
});

ProductRow.displayName = 'ProductRow';
