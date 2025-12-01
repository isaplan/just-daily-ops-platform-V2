# 🎨 REBUILD: Default Page Structure & Formatting Standards

## 📋 Default Page Structure

### **Standard Page Layout Component**

**File:** `src/components/page/DefaultPageLayout.tsx`

```typescript
'use client';

import { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DateFilterPresets } from '@/components/view-data/DateFilterPresets';
import { LocationFilterButtons } from '@/components/view-data/LocationFilterButtons';
import { LoadingState } from '@/components/view-data/LoadingState';
import { ErrorState } from '@/components/view-data/ErrorState';

interface DefaultPageLayoutProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  isLoading?: boolean;
  error?: Error | string | null;
  // Filters
  showDateFilter?: boolean;
  showLocationFilter?: boolean;
  onDateFilterChange?: (startDate: string, endDate: string) => void;
  onLocationFilterChange?: (locationId: string | null) => void;
  // Initial values
  initialStartDate?: string;
  initialEndDate?: string;
  initialLocationId?: string | null;
}

export function DefaultPageLayout({
  title,
  subtitle,
  children,
  isLoading = false,
  error = null,
  showDateFilter = true,
  showLocationFilter = true,
  onDateFilterChange,
  onLocationFilterChange,
  initialStartDate,
  initialEndDate,
  initialLocationId,
}: DefaultPageLayoutProps) {
  if (isLoading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">{title}</h1>
        <LoadingState />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">{title}</h1>
        <ErrorState error={error} />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        {subtitle && <p className="text-muted-foreground mt-1">{subtitle}</p>}
      </div>

      {/* Filters */}
      {(showDateFilter || showLocationFilter) && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4">
              {showDateFilter && (
                <DateFilterPresets
                  onPresetSelect={(preset) => {
                    if (onDateFilterChange) {
                      onDateFilterChange(preset.startDate, preset.endDate);
                    }
                  }}
                  initialStartDate={initialStartDate}
                  initialEndDate={initialEndDate}
                />
              )}
              {showLocationFilter && (
                <LocationFilterButtons
                  selectedLocation={initialLocationId}
                  onLocationChange={(locationId) => {
                    if (onLocationFilterChange) {
                      onLocationFilterChange(locationId);
                    }
                  }}
                />
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Content */}
      {children}
    </div>
  );
}
```

---

## 📅 Date Formatting: DD.MM.YY (Default)

### **Enhanced Date Formatter**

**File:** `src/lib/dateFormatters.ts` (Update existing)

```typescript
// Format date as DD.MM.YY (DEFAULT FOR ALL PAGES)
export function formatDateDDMMYY(date: Date | string | null | undefined): string {
  if (!date) return "-";
  
  // If it's a string in YYYY-MM-DD format, parse it directly
  if (typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const [year, month, day] = date.split('-');
    const yearShort = year.slice(-2);
    return `${day}.${month}.${yearShort}`; // ✅ Changed: DD.MM.YY (not DD.MM'YY)
  }
  
  // Otherwise, parse as Date object
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "-";
  
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = String(d.getFullYear()).slice(-2);
  return `${day}.${month}.${year}`; // ✅ Changed: DD.MM.YY (not DD.MM'YY)
}

// Format date as DD.MM.YY HH:MM
export function formatDateDDMMYYTime(date: Date | string | null | undefined): string {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "-";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = String(d.getFullYear()).slice(-2);
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${day}.${month}.${year} ${hours}:${minutes}`; // ✅ Changed: DD.MM.YY
}
```

**Usage in all pages:**
```typescript
import { formatDateDDMMYY } from '@/lib/dateFormatters';

// In table cells
<TableCell>{formatDateDDMMYY(record.date)}</TableCell>
// Output: "15.01.25" (not "15.01'25")
```

---

## 🔢 Number Formatting: Large Numbers with No Decimals (>1000)

### **Enhanced Number Formatter**

**File:** `src/lib/utils.ts` (Update existing)

```typescript
/**
 * Format number with European notation (1.000, 100K, 1.4M)
 * - Numbers > 1000: No decimals, use abbreviations (100K, 1.4M)
 * - Numbers <= 1000: Show decimals if needed
 * @param num - Number to format
 * @param decimals - Number of decimal places (default: 2, but ignored for numbers > 1000)
 * @param useAbbreviation - Whether to use abbreviations for large numbers (default: true)
 */
export function formatNumber(
  num: number | null | undefined, 
  decimals: number = 2, 
  useAbbreviation: boolean = true
): string {
  if (num === null || num === undefined || isNaN(num)) return '-';
  
  const absNum = Math.abs(num);
  const sign = num < 0 ? '-' : '';
  
  // ✅ NEW RULE: Numbers > 1000 have NO decimals
  if (useAbbreviation && absNum >= 1000) {
    // Millions (>= 1.000.000)
    if (absNum >= 1000000) {
      const millions = absNum / 1000000;
      // ✅ No decimals for millions (round to nearest)
      const rounded = Math.round(millions * 10) / 10; // Round to 1 decimal
      const formatted = rounded % 1 === 0 
        ? rounded.toString() 
        : rounded.toFixed(1); // Only show decimal if not whole number
      return `${sign}${formatted}M`;
    }
    
    // Thousands (>= 1.000)
    if (absNum >= 1000) {
      const thousands = absNum / 1000;
      // ✅ No decimals for thousands (round to nearest)
      const rounded = Math.round(thousands * 10) / 10; // Round to 1 decimal
      const formatted = rounded % 1 === 0 
        ? rounded.toString() 
        : rounded.toFixed(1); // Only show decimal if not whole number
      return `${sign}${formatted}K`;
    }
  }
  
  // ✅ Numbers <= 1000: Use European notation with decimals
  // Format with European notation (dots for thousands, comma for decimals)
  const fixed = num.toFixed(decimals);
  const parts = fixed.split('.');
  const integerPart = parts[0];
  const decimalPart = parts[1];
  
  // Add thousand separators (dots) to integer part
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  
  // Return with comma as decimal separator
  return decimalPart ? `${formattedInteger},${decimalPart}` : formattedInteger;
}

/**
 * Format currency with European notation (€1.000, €100K, €1.4M)
 * - Numbers > 1000: No decimals, use abbreviations (€100K, €1.4M)
 * - Numbers <= 1000: Show decimals (€999,50)
 * @param num - Number to format
 * @param decimals - Number of decimal places (default: 2, but ignored for numbers > 1000)
 * @param useAbbreviation - Whether to use abbreviations for large numbers (default: true)
 */
export function formatCurrency(
  num: number | null | undefined, 
  decimals: number = 2, 
  useAbbreviation: boolean = true
): string {
  if (num === null || num === undefined || isNaN(num)) return '-';
  
  const formatted = formatNumber(num, decimals, useAbbreviation);
  return formatted === '-' ? '-' : `€${formatted}`;
}
```

### **Examples:**

```typescript
formatNumber(500)        // "500" (no decimals needed)
formatNumber(999.50)    // "999,50" (decimals for <= 1000)
formatNumber(1000)       // "1K" (no decimals, abbreviation)
formatNumber(1500)       // "1.5K" (1 decimal if needed)
formatNumber(1500.75)    // "1.5K" (rounded, no decimals)
formatNumber(10000)      // "10K" (no decimals)
formatNumber(1500000)    // "1.5M" (1 decimal if needed)
formatNumber(2000000)    // "2M" (no decimals)

formatCurrency(500)      // "€500"
formatCurrency(999.50)   // "€999,50"
formatCurrency(1000)     // "€1K"
formatCurrency(1500)     // "€1.5K"
formatCurrency(1500000)  // "€1.5M"
```

---

## 📊 Default Page Structure Usage

### **Example: Labor Hours Page**

**File:** `src/app/(dashboard)/data/labor/hours/page.tsx`

```typescript
import { DefaultPageLayout } from '@/components/page/DefaultPageLayout';
import { HoursTable } from './HoursTable';
import { fetchLaborHours } from '@/lib/services/labor/labor-hours.service';

export const revalidate = 1800; // 30 minutes ISR

export default async function LaborHoursPage() {
  const today = new Date();
  const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
  const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  
  const initialData = await fetchLaborHours({
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
  });
  
  return (
    <DefaultPageLayout
      title="Labor Hours"
      subtitle="View processed and aggregated hours data from Eitje"
      initialStartDate={startDate.toISOString().split('T')[0]}
      initialEndDate={endDate.toISOString().split('T')[0]}
    >
      <HoursTable initialData={initialData} />
    </DefaultPageLayout>
  );
}
```

**File:** `src/app/(dashboard)/data/labor/hours/HoursClient.tsx`

```typescript
'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DefaultPageLayout } from '@/components/page/DefaultPageLayout';
import { HoursTable } from './HoursTable';
import { getLaborHours } from '@/lib/services/graphql/queries';

export function HoursClient({ initialData }: { initialData: any }) {
  const [filters, setFilters] = useState({
    startDate: initialData?.startDate || new Date().toISOString().split('T')[0],
    endDate: initialData?.endDate || new Date().toISOString().split('T')[0],
    locationId: null as string | null,
  });
  
  const { data, isLoading, error } = useQuery({
    queryKey: ['labor-hours', filters],
    queryFn: () => getLaborHours(filters),
    initialData,
    staleTime: 30 * 60 * 1000,
  });
  
  return (
    <DefaultPageLayout
      title="Labor Hours"
      subtitle="View processed and aggregated hours data from Eitje"
      isLoading={isLoading}
      error={error}
      showDateFilter={true}
      showLocationFilter={true}
      onDateFilterChange={(startDate, endDate) => {
        setFilters({ ...filters, startDate, endDate });
      }}
      onLocationFilterChange={(locationId) => {
        setFilters({ ...filters, locationId });
      }}
      initialStartDate={filters.startDate}
      initialEndDate={filters.endDate}
      initialLocationId={filters.locationId}
    >
      <HoursTable data={data} />
    </DefaultPageLayout>
  );
}
```

---

## ✅ Implementation Checklist

### **1. Create Default Page Layout Component**
- [ ] Create `src/components/page/DefaultPageLayout.tsx`
- [ ] Add date filter support
- [ ] Add location filter support
- [ ] Add loading/error states
- [ ] Add title/subtitle props

### **2. Update Date Formatting**
- [ ] Update `formatDateDDMMYY()` to use `DD.MM.YY` (not `DD.MM'YY`)
- [ ] Update `formatDateDDMMYYTime()` to use `DD.MM.YY`
- [ ] Ensure all pages use `formatDateDDMMYY()` as default

### **3. Update Number Formatting**
- [ ] Update `formatNumber()` to show no decimals for numbers > 1000
- [ ] Update `formatCurrency()` to show no decimals for numbers > 1000
- [ ] Test with examples: 500, 999.50, 1000, 1500, 10000, 1500000

### **4. Apply to All Pages**
- [ ] Update all labor pages to use `DefaultPageLayout`
- [ ] Update all sales pages to use `DefaultPageLayout`
- [ ] Update all date displays to use `formatDateDDMMYY()`
- [ ] Update all number displays to use `formatNumber()` / `formatCurrency()`

---

## 🎯 Benefits

1. **Consistent UI:** All pages follow same structure
2. **Default Formatting:** DD.MM.YY dates, large number abbreviations
3. **Less Code:** Reusable layout component
4. **Better UX:** Standard filters, loading states, error handling
5. **Maintainability:** Change formatting in one place

---

**Status:** Ready to Implement  
**Priority:** High - Foundation for all pages

