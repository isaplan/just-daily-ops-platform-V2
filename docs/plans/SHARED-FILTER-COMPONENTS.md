# Shared Filter Components Documentation

## Overview

This document describes the shared filter components used across data pages in the MVVM architecture. These components follow the controlled component pattern and are designed to be reusable across multiple pages.

## Components

### 1. EitjeDataFilters

**Location**: `src/components/view-data/EitjeDataFilters.tsx`

**Purpose**: Comprehensive date and location filter component for Eitje data pages.

**Props**:
- `selectedYear: number` - Currently selected year
- `onYearChange: (year: number) => void` - Year change handler
- `selectedMonth: number | null` - Currently selected month (null = all months)
- `onMonthChange: (month: number | null) => void` - Month change handler
- `selectedDay: number | null` - Currently selected day (null = all days)
- `onDayChange: (day: number | null) => void` - Day change handler
- `selectedLocation: string` - Currently selected location ID or "all"
- `onLocationChange: (location: string) => void` - Location change handler
- `selectedDatePreset: DatePreset` - Currently selected date preset
- `onDatePresetChange: (preset: DatePreset) => void` - Date preset change handler
- `locations?: Array<{ value: string; label: string }>` - Available location options
- `onResetToDefault?: () => void` - Optional reset handler

**Features**:
- Year selection (previous, current, next year)
- Month dropdown (with "all" option)
- Day dropdown (enabled only when month is selected)
- Date preset buttons (Today, Yesterday, This Week, etc.)
- Location filter buttons
- Automatic filtering of invalid locations ("All HNHG Locations", "All HNG Locations")
- Memoized for performance

**Usage Pattern**:
```typescript
<EitjeDataFilters
  selectedYear={viewModel.selectedYear}
  onYearChange={viewModel.setSelectedYear}
  selectedMonth={viewModel.selectedMonth}
  onMonthChange={viewModel.setSelectedMonth}
  selectedDay={viewModel.selectedDay}
  onDayChange={viewModel.setSelectedDay}
  selectedLocation={viewModel.selectedLocation}
  onLocationChange={viewModel.setSelectedLocation}
  selectedDatePreset={viewModel.selectedDatePreset}
  onDatePresetChange={viewModel.setSelectedDatePreset}
  locations={viewModel.locationOptions}
/>
```

**MVVM Integration**:
- State managed in ViewModel
- Component receives state and handlers as props
- Pure presentational component (no business logic)

---

### 2. LocationFilterButtons

**Location**: `src/components/view-data/LocationFilterButtons.tsx`

**Purpose**: Reusable button group for filtering by any option list (not just locations).

**Props**:
- `options: Array<{ value: string; label: string }>` - Available options
- `selectedValue: string` - Currently selected value
- `onValueChange: (value: string) => void` - Value change handler
- `label?: string` - Optional label (default: "Location")

**Features**:
- Generic filter button group
- Can be used for any option list (Team, Shift Type, Location, etc.)
- Consistent styling with active/inactive states

**Usage Pattern**:
```typescript
<LocationFilterButtons
  options={viewModel.teamOptions}
  selectedValue={viewModel.selectedTeam}
  onValueChange={viewModel.setSelectedTeam}
  label="Team"
/>
```

**MVVM Integration**:
- State managed in ViewModel
- Component receives state and handlers as props
- Pure presentational component

---

### 3. DateFilterPresets

**Location**: `src/components/view-data/DateFilterPresets.tsx`

**Purpose**: Quick date range preset buttons (Today, Yesterday, This Week, etc.).

**Props**:
- `selectedPreset: DatePreset` - Currently selected preset
- `onPresetChange: (preset: DatePreset) => void` - Preset change handler
- `className?: string` - Optional CSS class
- `disabled?: boolean` - Disable all buttons

**Date Presets**:
- `today` - Current day
- `yesterday` - Previous day
- `this-week` - Current week (Monday to Sunday)
- `last-week` - Previous week
- `this-month` - Current month
- `last-month` - Previous month
- `this-year` - Current year
- `last-year` - Previous year
- `custom` - User-defined range

**Helper Function**:
- `getDateRangeForPreset(preset: DatePreset): DateRange | null` - Converts preset to date range

**Usage Pattern**:
```typescript
<DateFilterPresets
  selectedPreset={viewModel.selectedDatePreset}
  onPresetChange={viewModel.setSelectedDatePreset}
  disabled={viewModel.selectedMonth !== null}
/>
```

**MVVM Integration**:
- State managed in ViewModel
- Component receives state and handlers as props
- Pure presentational component

---

## MVVM Pattern Usage

### State Management
All filter state is managed in the ViewModel layer:

```typescript
// ViewModel
const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
const [selectedLocation, setSelectedLocation] = useState<string>("all");
// ... other filter state

return {
  selectedYear,
  selectedMonth,
  selectedLocation,
  setSelectedYear,
  setSelectedMonth,
  setSelectedLocation,
  // ... other state and setters
};
```

### View Usage
The View component uses the filter components with ViewModel state:

```typescript
// View
const viewModel = useHoursV2ViewModel();

return (
  <div>
    <EitjeDataFilters
      selectedYear={viewModel.selectedYear}
      onYearChange={viewModel.setSelectedYear}
      // ... other props from ViewModel
    />
  </div>
);
```

## Best Practices

1. **Controlled Components**: All filter components are controlled - they receive state and handlers as props
2. **No Business Logic**: Filter components are pure presentational - no data fetching or business logic
3. **Memoization**: `EitjeDataFilters` uses `memo` for performance optimization
4. **Type Safety**: All props are strongly typed with TypeScript interfaces
5. **Reusability**: Components can be used across multiple pages with different ViewModels

## Future Enhancements

- Create variants for different data types (Sales filters, Finance filters, etc.)
- Add more filter types (Team filters, Status filters, etc.)
- Create shared table components for consistent data display
- Add filter persistence (URL params, localStorage)




