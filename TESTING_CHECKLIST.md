# Testing Checklist - Aggregated Database Migration

## ✅ Test Plan

### **Priority 1: Product Pages (Most Affected)**

#### 1. Products List Page
**URL:** `/operations/products`
**What to test:**
- [ ] Page loads without errors
- [ ] Products display correctly
- [ ] Filters work (Year, Location, Main Category, Sub Category, Menu, Search)
- [ ] Workload/MEP filters work
- [ ] Pagination works
- [ ] No console errors (especially "ID is required")
- [ ] No duplicate React key warnings

#### 2. Product Catalog Page
**URL:** `/operations/products/catalog`
**What to test:**
- [ ] Page loads without errors
- [ ] Products grouped by category display correctly
- [ ] Filters work (Search, Category, Workload, MEP, Active)
- [ ] No duplicate React key warnings
- [ ] No console errors

#### 3. Product CRUD Operations
**URL:** `/operations/products` or `/settings/products`
**What to test:**
- [ ] **Create Product:** Create a new product, verify it appears in list
- [ ] **Update Product:** Update workload/MEP/course type, verify changes persist
- [ ] **Delete Product:** Delete a product, verify it's removed
- [ ] No GraphQL errors during mutations

---

### **Priority 2: Pages Using Locations Query**

#### 4. Any Page with Location Selector
**What to test:**
- [ ] Location dropdowns populate correctly
- [ ] No "ID is required" errors in console
- [ ] Locations display with correct names

**Pages to check:**
- [ ] `/operations/products` (has location filter)
- [ ] `/operations/menus` (has location selector)
- [ ] `/data/sales/bork` (has location filter)
- [ ] Any other page with location dropdowns

---

### **Priority 3: Sales Data Pages**

#### 5. Bork Sales Page
**URL:** `/data/sales/bork`
**What to test:**
- [ ] Page loads without errors
- [ ] Sales data displays correctly
- [ ] Filters work (Date, Location, Category)
- [ ] Pagination works
- [ ] No console errors

**Note:** This page uses `dailySales` resolver which uses `bork_raw_data` (documented exception)

---

### **Priority 4: Other Affected Pages**

#### 6. Categories Products Page
**URL:** `/data/sales/categories-products`
**What to test:**
- [ ] Page loads without errors
- [ ] Products grouped by category display correctly
- [ ] No duplicate React key warnings
- [ ] Filters work correctly

---

## 🐛 Common Issues to Watch For

1. **"ID is required" errors** → Should be fixed by toId helper
2. **404/500 errors** → Check GraphQL resolver errors
3. **Duplicate React keys** → Should be fixed by deduplication
4. **Empty product lists** → Check if products_aggregated has data
5. **Slow page loads** → Should be faster with aggregated data

---

## 📝 Testing Notes

- Test each page systematically
- Check browser console for errors
- Verify data displays correctly
- Test filters and pagination
- Test CRUD operations where applicable

---

## ✅ Success Criteria

- All pages load without errors
- No "ID is required" errors
- No duplicate React key warnings
- Product queries use `products_aggregated`
- Fast page load times (<2s)
- All CRUD operations work correctly

