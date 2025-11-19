# Menu Kaarten (Menu Cards) Feature - Summary

**Date:** 2025-11-19  
**Status:** ✅ **COMPLETE - Ready for Testing**

---

## 🎯 What Was Built

### **Menu Kaarten System**
A complete menu management system that allows you to:
- ✅ Create menu cards with title, start date, and end date
- ✅ Automatically calculate end dates (day before next menu starts)
- ✅ Assign products to menus
- ✅ Use menus as filters throughout the app (starting with Products page)
- ✅ Validate date ranges to prevent overlaps
- ✅ Manage active/inactive menus

---

## 📁 Files Created

### **Models:**
1. `src/models/menu/menu.model.ts` - Menu types and validation functions

### **API Routes:**
2. `src/app/api/menus/route.ts` - GET (list), POST (create)
3. `src/app/api/menus/[id]/route.ts` - GET (single), PUT (update), DELETE
4. `src/app/api/menus/[id]/products/route.ts` - POST (assign), DELETE (remove products)

### **UI Pages:**
5. `src/app/(dashboard)/settings/menus/page.tsx` - Server Component
6. `src/app/(dashboard)/settings/menus/MenusClient.tsx` - Client Component with full CRUD

---

## 📝 Files Modified

### **Database:**
1. `src/lib/mongodb/v2-schema.ts` - Added `Menu` interface
2. `src/lib/mongodb/v2-indexes.ts` - Added menus collection indexes

### **Navigation:**
3. `src/components/app-sidebar.tsx` - Added "Manage Menus" to Settings
4. `src/lib/navigation/breadcrumb-registry.ts` - Added breadcrumb for menus page

### **Products Page:**
5. `src/app/(dashboard)/products/ProductsClient.tsx` - Added menu filter functionality

---

## 🗄️ Database Structure

### **Collection: `menus`**

```typescript
{
  _id: ObjectId,
  title: string,                    // e.g., "Summer Menu 2025"
  startDate: Date,                  // Start date of menu
  endDate: Date,                    // End date (auto-calculated or manual)
  productIds: string[],             // Array of product names
  isActive: boolean,                // Active/inactive status
  notes?: string,                   // Optional notes
  createdAt: Date,
  updatedAt: Date
}
```

### **Indexes Created:**
```typescript
- { title: 1 }                      // Query by title
- { startDate: -1 }                 // Sort by start date
- { endDate: -1 }                   // Sort by end date
- { isActive: 1 }                   // Filter active menus
- { startDate: 1, endDate: 1 }      // Compound for date range queries
```

---

## 🔧 API Endpoints

### **1. GET /api/menus**
**Description:** Get all menus  
**Query Parameters:**
- `activeOnly=true` - Filter only active menus
- `currentDate=YYYY-MM-DD` - Get menus that overlap with this date

**Response:**
```json
{
  "success": true,
  "menus": [
    {
      "_id": "...",
      "title": "Summer Menu 2025",
      "startDate": "2025-06-01T00:00:00.000Z",
      "endDate": "2025-08-31T00:00:00.000Z",
      "productIds": ["Pizza Margherita", "Pasta Carbonara"],
      "isActive": true,
      "notes": "",
      "createdAt": "...",
      "updatedAt": "..."
    }
  ]
}
```

---

### **2. POST /api/menus**
**Description:** Create a new menu  
**Body:**
```json
{
  "title": "Summer Menu 2025",
  "startDate": "2025-06-01",
  "endDate": "2025-08-31",  // Optional - auto-calculated if not provided
  "productIds": [],
  "notes": "Seasonal summer dishes",
  "isActive": true
}
```

**Auto End-Date Logic:**
- If `endDate` is not provided, system finds the next menu's start date
- Sets end date as **day before next menu starts**
- If no next menu exists, defaults to **3 months from start date**

**Validation:**
- Checks for date overlaps with existing menus
- Returns error if dates conflict

---

### **3. GET /api/menus/[id]**
**Description:** Get a single menu by ID

---

### **4. PUT /api/menus/[id]**
**Description:** Update a menu  
**Body:**
```json
{
  "title": "Updated Menu Title",
  "startDate": "2025-06-01",
  "endDate": "2025-08-31",
  "productIds": ["Product 1", "Product 2"],
  "notes": "Updated notes",
  "isActive": false
}
```

**Smart Date Adjustment:**
- When updating a menu's start date, automatically adjusts previous menu's end date
- Validates no overlaps with other menus

---

### **5. DELETE /api/menus/[id]**
**Description:** Delete a menu

---

### **6. POST /api/menus/[id]/products**
**Description:** Assign products to a menu  
**Body:**
```json
{
  "productIds": ["Pizza Margherita", "Pasta Carbonara", "Tiramisu"]
}
```

**Validation:**
- Verifies all products exist in the `products` collection
- Returns error if any product is not found

---

### **7. DELETE /api/menus/[id]/products**
**Description:** Remove products from a menu  
**Body:**
```json
{
  "productIds": ["Pizza Margherita"]
}
```

---

## 🖥️ UI Features

### **Settings > Manage Menus Page**

**Features:**
1. **List View:**
   - Shows all menus sorted by start date (newest first)
   - Badge indicators:
     - 🟢 "Current" - Menu is active during current date
     - ⚪ "Inactive" - Menu is not active
   - Displays date range and duration in days

2. **Create Menu:**
   - Modal dialog with form
   - Fields: Title, Start Date, End Date (optional), Notes, Active toggle
   - Auto-calculates end date if not provided

3. **Edit Menu:**
   - Modal dialog with pre-filled form
   - Update all menu properties
   - Date validation on save

4. **Delete Menu:**
   - Confirmation dialog
   - Permanent deletion

5. **Manage Products:**
   - Modal dialog for product assignment
   - Add products by name
   - Remove products from menu
   - Shows count of assigned products
   - Validates products exist before saving

---

### **Products Page - Menu Filter**

**Location:** `/products` → Filters section  

**How It Works:**
- New "Menu" dropdown filter added between Sub Category and Search
- Options:
  - "All Products" (default) - Show all products
  - Menu titles (e.g., "Summer Menu 2025") - Filter by menu

**Behavior:**
- When a menu is selected, only products assigned to that menu are shown
- Categories with no products in the menu are hidden
- Works in combination with other filters (Year, Location, Main Category, Sub Category, Search)

---

## 📊 Use Cases

### **1. Seasonal Menus**
```
Spring Menu 2025:    01 Mar 2025 - 31 May 2025
Summer Menu 2025:    01 Jun 2025 - 31 Aug 2025
Autumn Menu 2025:    01 Sep 2025 - 30 Nov 2025
Winter Menu 2025:    01 Dec 2025 - 28 Feb 2026
```

### **2. Special Event Menus**
```
Valentine's Day Menu:  10 Feb 2025 - 14 Feb 2025
Easter Menu:           15 Apr 2025 - 20 Apr 2025
Christmas Menu:        20 Dec 2025 - 26 Dec 2025
```

### **3. Limited Time Offers**
```
Summer Specials:       01 Jul 2025 - 31 Jul 2025
Oktoberfest Menu:      15 Sep 2025 - 05 Oct 2025
```

### **4. Location-Specific Menus**
```
Terrace Menu (May-Sep)
Indoor Dining Menu (Oct-Apr)
Bar Snacks Menu (Year-round)
```

---

## 🔄 Workflow Example

### **Creating a New Menu:**

1. **Navigate to Settings > Manage Menus**
2. **Click "Create New Menu"**
3. **Fill in form:**
   - Title: "Summer Menu 2025"
   - Start Date: 2025-06-01
   - End Date: Leave empty (auto-calculated)
   - Notes: "Fresh summer dishes with seasonal ingredients"
   - Active: ✅ Checked
4. **Click "Create Menu"**
5. **System automatically calculates end date:**
   - Finds next menu (if exists)
   - Sets end date = next menu start date - 1 day
   - Or defaults to 3 months from start

### **Assigning Products:**

1. **Click "Products (0)" button** on the menu card
2. **In modal dialog:**
   - Type product name: "Pizza Margherita"
   - Click "Add" or press Enter
   - Repeat for more products
3. **Click "Save Products"**
4. **Badge updates:** "Products (3)"

### **Using Menu Filter:**

1. **Navigate to Operations > Products** (`/products`)
2. **In Filters section:**
   - Select Menu: "Summer Menu 2025"
3. **View results:**
   - Only products from Summer Menu are shown
   - Categories without menu products are hidden

---

## 🎨 UI Screenshots (Textual Description)

### **Manage Menus Page:**
```
┌─────────────────────────────────────────────────┐
│ Manage Menus                                    │
│ Create and manage menu cards with products...  │
├─────────────────────────────────────────────────┤
│                          [+ Create New Menu]    │
├─────────────────────────────────────────────────┤
│ ┌───────────────────────────────────────────┐  │
│ │ Summer Menu 2025          [Current]       │  │
│ │ 📅 01 Jun 2025 - 31 Aug 2025 (92 days)    │  │
│ │                                            │  │
│ │ [Products (15)] [✏️ Edit] [🗑️ Delete]       │  │
│ └───────────────────────────────────────────┘  │
│                                                 │
│ ┌───────────────────────────────────────────┐  │
│ │ Spring Menu 2025          [Inactive]      │  │
│ │ 📅 01 Mar 2025 - 31 May 2025 (92 days)    │  │
│ │                                            │  │
│ │ [Products (12)] [✏️ Edit] [🗑️ Delete]       │  │
│ └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

### **Products Page with Menu Filter:**
```
┌─────────────────────────────────────────────────────────┐
│ Filters                                                 │
├─────────────────────────────────────────────────────────┤
│ [Year: 2025 ▾] [Location: All ▾] [Main: Bar ▾]         │
│ [Sub: All ▾] [Menu: Summer Menu 2025 ▾] [🔍 Search...] │
└─────────────────────────────────────────────────────────┘
```

---

## 🧪 Testing Checklist

- [ ] **Create Menu:**
  - [ ] Create with manual end date
  - [ ] Create without end date (auto-calculation)
  - [ ] Verify end date = next menu start - 1 day
  - [ ] Test overlap validation (should error)
  
- [ ] **Edit Menu:**
  - [ ] Update title
  - [ ] Change dates
  - [ ] Verify previous menu's end date adjusts
  - [ ] Toggle active/inactive
  - [ ] Update notes
  
- [ ] **Delete Menu:**
  - [ ] Confirm deletion dialog appears
  - [ ] Verify menu is removed
  
- [ ] **Assign Products:**
  - [ ] Add products one by one
  - [ ] Verify product count badge updates
  - [ ] Try adding non-existent product (should error)
  - [ ] Remove products
  
- [ ] **Menu Filter (Products Page):**
  - [ ] Select menu from dropdown
  - [ ] Verify only menu products show
  - [ ] Verify empty categories are hidden
  - [ ] Combine with other filters
  - [ ] Test with "All Products" option
  
- [ ] **Navigation:**
  - [ ] Verify "Manage Menus" appears in Settings
  - [ ] Page loads correctly
  - [ ] Breadcrumb displays

---

## 🚀 Future Enhancements

### **Phase 2 Features:**
1. **Menu Templates:**
   - Save menus as templates
   - Duplicate existing menus

2. **Advanced Filtering:**
   - Add menu filter to other pages (Daily Ops, Data views)
   - Filter by active menus only
   - Search menus by date range

3. **Product Management:**
   - Bulk add products by category
   - Import products from CSV
   - Show product availability per menu

4. **Analytics:**
   - Popular menu items
   - Menu performance metrics
   - Revenue by menu

5. **Multi-Location:**
   - Location-specific menus
   - Menu availability per location

6. **Calendar View:**
   - Visual timeline of menus
   - Drag-and-drop date adjustments

---

## 📚 Documentation Updates Needed

- [ ] Update user guide with Menu Kaarten section
- [ ] Add menu filter instructions to Products page docs
- [ ] Document menu creation best practices
- [ ] Add API endpoint documentation to technical docs

---

## ⚠️ Important Notes

### **Date Overlap Prevention:**
- System prevents creating menus with overlapping dates
- Error message shows which menu conflicts
- Edit mode also validates overlaps

### **Auto End-Date Logic:**
- When creating a new menu without end date:
  1. System finds next menu by start date
  2. Sets end = next menu start - 1 day
  3. Updates previous menu's end date if needed
  4. If no next menu, defaults to 3 months

### **Product Assignment:**
- Products must exist in `products` collection
- Product names are case-sensitive
- Removing a product from menu doesn't delete the product

---

## 🔐 Security & Permissions

- All API endpoints require authentication (inherited from existing setup)
- No special permissions needed
- Uses existing MongoDB connection

---

## 💡 Tips & Best Practices

1. **Create Menus in Order:**
   - Start with oldest menu first
   - Let system auto-calculate end dates
   - Reduces date conflicts

2. **Use Descriptive Titles:**
   - Include year: "Summer Menu 2025"
   - Include event: "Easter Special Menu"

3. **Assign Products Early:**
   - Add products as soon as menu is created
   - Makes filtering more useful

4. **Keep Menus Active:**
   - Only set inactive when menu is completely discontinued
   - Use date ranges for scheduling

5. **Test Date Ranges:**
   - Verify no gaps between menus
   - Check for unexpected overlaps

---

**Created by:** AI Assistant  
**Date:** November 19, 2025  
**Status:** ✅ Complete - Ready for Testing

