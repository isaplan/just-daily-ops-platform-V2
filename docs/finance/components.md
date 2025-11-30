# Components Documentation

Complete documentation of React components used in the Just Daily Ops Platform.

## 📋 Overview

This document lists all components in the application, organized by category. Components follow the MVVM pattern and use shadcn/ui as the base UI library.

---

## 🎨 UI Components (shadcn/ui)

All UI components are from shadcn/ui and located in `src/components/ui/`. These are production-ready, accessible components.

### Layout Components
- **Sidebar** (`sidebar.tsx`) - Main application sidebar
- **Separator** (`separator.tsx`) - Visual separator
- **Resizable** (`resizable.tsx`) - Resizable panels
- **Scroll Area** (`scroll-area.tsx`) - Custom scrollable area

### Navigation Components
- **Breadcrumb** (`breadcrumb.tsx`) - Breadcrumb navigation
- **Navigation Menu** (`navigation-menu.tsx`) - Navigation menu
- **Menubar** (`menubar.tsx`) - Menu bar component

### Form Components
- **Button** (`button.tsx`) - Button component with variants
- **Input** (`input.tsx`) - Text input field
- **Textarea** (`textarea.tsx`) - Multi-line text input
- **Label** (`label.tsx`) - Form label
- **Checkbox** (`checkbox.tsx`) - Checkbox input
- **Radio Group** (`radio-group.tsx`) - Radio button group
- **Select** (`select.tsx`) - Dropdown select
- **Switch** (`switch.tsx`) - Toggle switch
- **Slider** (`slider.tsx`) - Range slider
- **Input OTP** (`input-otp.tsx`) - OTP input field
- **Form** (`form.tsx`) - Form wrapper with validation

### Display Components
- **Card** (`card.tsx`) - Card container
- **Badge** (`badge.tsx`) - Badge/tag component
- **Avatar** (`avatar.tsx`) - User avatar
- **Skeleton** (`skeleton.tsx`) - Loading skeleton
- **Progress** (`progress.tsx`) - Progress bar
- **Chart** (`chart.tsx`) - Chart component (Recharts wrapper)

### Feedback Components
- **Alert** (`alert.tsx`) - Alert message
- **Alert Dialog** (`alert-dialog.tsx`) - Alert dialog modal
- **Dialog** (`dialog.tsx`) - Modal dialog
- **Toast** (`toast.tsx`) - Toast notification
- **Toaster** (`toaster.tsx`) - Toast container
- **Sonner** (`sonner.tsx`) - Sonner toast library wrapper
- **Tooltip** (`tooltip.tsx`) - Tooltip
- **Hover Card** (`hover-card.tsx`) - Hover card

### Data Display Components
- **Table** (`table.tsx`) - Data table
- **Tabs** (`tabs.tsx`) - Tab navigation
- **Accordion** (`accordion.tsx`) - Collapsible accordion
- **Collapsible** (`collapsible.tsx`) - Collapsible content
- **Carousel** (`carousel.tsx`) - Carousel/slider

### Overlay Components
- **Popover** (`popover.tsx`) - Popover overlay
- **Sheet** (`sheet.tsx`) - Side sheet/drawer
- **Drawer** (`drawer.tsx`) - Drawer component
- **Dropdown Menu** (`dropdown-menu.tsx`) - Dropdown menu
- **Context Menu** (`context-menu.tsx`) - Context menu
- **Command** (`command.tsx`) - Command palette

### Utility Components
- **Calendar** (`calendar.tsx`) - Date picker calendar
- **Aspect Ratio** (`aspect-ratio.tsx`) - Aspect ratio container
- **Toggle** (`toggle.tsx`) - Toggle button
- **Toggle Group** (`toggle-group.tsx`) - Toggle button group
- **Language Switcher** (`language-switcher.tsx`) - Language selection

---

## 🧭 Navigation Components

Located in `src/components/navigation/`:

### App Sidebar
- **AppSidebar** (`app-sidebar.tsx`) - Main application sidebar
  - Navigation structure
  - Menu items organization
  - Active route highlighting
  - Collapsible sections

### Top Navigation
- **AppTopNavV2** (`app-topnav-v2.tsx`) - Top navigation bar
  - Breadcrumb navigation
  - Filter controls
  - User menu

### Breadcrumb
- **TopnavBreadcrumb** (`topnav-breadcrumb.tsx`) - Breadcrumb navigation
  - Dynamic breadcrumb generation
  - Route-based breadcrumbs

### Filter Components
- **FilterDrawer** (`filter-drawer.tsx`) - Filter drawer
- **FilterSheet** (`filter-sheet.tsx`) - Filter sheet
- **FilterResizablePanel** (`filter-resizable-panel.tsx`) - Resizable filter panel
- **TopnavFilterDrawerV2** (`topnav-filter-drawer-v2.tsx`) - Top nav filter drawer
- **TopnavFilterDropdownV2** (`topnav-filter-dropdown-v2.tsx`) - Filter dropdown
- **AutoFilterRegistry** (`auto-filter-registry.tsx`) - Auto filter registration

---

## 📊 View Data Components

Located in `src/components/view-data/`:

### Data Display
- **UITable** (`UITable.tsx`) - Universal data table
  - Pagination
  - Sorting
  - Column visibility
  - Responsive design

### Filters
- **DateFilterPresets** (`DateFilterPresets.tsx`) - Date filter presets
  - Quick date ranges (Today, This Week, This Month, etc.)
  - Custom date range picker
  - Date preset selection

- **SmartMonthFilter** (`SmartMonthFilter.tsx`) - Smart month/year filter
  - Month selection
  - Year selection
  - Quick navigation

- **LocationFilterButtons** (`LocationFilterButtons.tsx`) - Location filter
  - Location selection
  - "All Locations" option
  - Multi-location support

- **CategoryProductFilter** (`CategoryProductFilter.tsx`) - Category/product filter
  - Category selection
  - Product selection
  - Top categories highlighting

- **EitjeDataFilters** (`EitjeDataFilters.tsx`) - Eitje data filters
  - Team filter
  - Worker filter
  - Location filter

### Search & Selection
- **AutocompleteSearch** (`AutocompleteSearch.tsx`) - Autocomplete search
- **WorkerSearch** (`WorkerSearch.tsx`) - Worker search component

### Utilities
- **SimplePagination** (`SimplePagination.tsx`) - Simple pagination controls
- **ShowMoreColumnsToggle** (`ShowMoreColumnsToggle.tsx`) - Column visibility toggle
- **AggregatedCostsSummary** (`AggregatedCostsSummary.tsx`) - Cost summary display

### States
- **LoadingState** (`LoadingState.tsx`) - Loading state component
- **ErrorState** (`ErrorState.tsx`) - Error state component

---

## 👥 Workforce Components

Located in `src/components/workforce/`:

### Worker Profile
- **WorkerProfileSheet** (`WorkerProfileSheet.tsx`) - Worker profile sheet
  - Worker details
  - Hours and costs
  - Performance metrics
  - Team information

- **WorkerProfileSheetContent** (`WorkerProfileSheetContent.tsx`) - Profile content
  - Detailed worker information
  - Historical data
  - Performance charts

- **WorkerProfileResizablePanel** (`worker-profile-resizable-panel.tsx`) - Resizable profile panel

### Worker Interactions
- **ClickableWorkerName** (`ClickableWorkerName.tsx`) - Clickable worker name
  - Opens worker profile on click
  - Hover effects

### Productivity
- **ProductivityGoals** (`ProductivityGoals.tsx`) - Productivity goals display
  - Goal setting
  - Goal tracking
  - Progress visualization

---

## 📈 Daily Ops Components

Located in `src/components/daily-ops/`:

### Calculations
- **CalculationBreakdown** (`CalculationBreakdown.tsx`) - Calculation breakdown display
  - Step-by-step calculations
  - Formula visualization
  - Result breakdown

---

## 🔌 Provider Components

Located in `src/components/providers/`:

### Query Client Provider
- **QueryClientProvider** (`query-client-provider.tsx`) - React Query provider
  - Query client setup
  - Default options
  - Error handling

### Worker Profile Provider
- **WorkerProfileSheetProvider** (`worker-profile-sheet-provider.tsx`) - Worker profile context
  - Global worker profile state
  - Sheet open/close management

### Toaster Provider
- **ToasterProvider** (`toaster-provider.tsx`) - Toast notifications provider
  - Global toast configuration
  - Toast positioning

---

## 🎯 Component Patterns

### MVVM Pattern
Components follow the MVVM pattern:
- **View**: Components in `src/components/` (presentation only)
- **ViewModel**: Custom hooks in `src/viewmodels/` (business logic)
- **Model**: Type definitions in `src/models/` (data structures)

### Server Components vs Client Components
- **Server Components**: Default in Next.js (no "use client")
  - Used for data fetching
  - Better performance
  - SEO-friendly

- **Client Components**: Marked with "use client"
  - Used for interactivity
  - State management
  - Browser APIs

### Component Composition
- Components are composed of smaller components
- Reusable UI components from shadcn/ui
- Domain-specific components for business logic

### Styling
- **Tailwind CSS**: Utility-first CSS
- **shadcn/ui**: Pre-styled components
- **CVA**: Class Variance Authority for variants
- **Dark Mode**: Supported via Tailwind dark mode

---

## 📦 Component Usage Examples

### Using UI Components
```tsx
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export function MyComponent() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Title</CardTitle>
      </CardHeader>
      <CardContent>
        <Button>Click me</Button>
      </CardContent>
    </Card>
  );
}
```

### Using View Data Components
```tsx
import { DateFilterPresets } from "@/components/view-data/DateFilterPresets";
import { LocationFilterButtons } from "@/components/view-data/LocationFilterButtons";

export function DataPage() {
  return (
    <div>
      <DateFilterPresets />
      <LocationFilterButtons />
      {/* Data table */}
    </div>
  );
}
```

### Using ViewModel Pattern
```tsx
import { useMyViewModel } from "@/viewmodels/my/useMyViewModel";

export function MyPage() {
  const { data, isLoading, error } = useMyViewModel();
  
  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState error={error} />;
  
  return <div>{/* Render data */}</div>;
}
```

---

## 🔗 Related Documentation

- **[Pages](./pages.md)** - Pages that use these components
- **[API Endpoints](./api-endpoints.md)** - API endpoints used by components
- **[Data Flow](./data-flow.md)** - How data flows through components

---

**Last Updated**: 2025-01-XX








