/**
 * Manage Menus - Client Component
 * Full CRUD interface for menu management
 */

"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Calendar, Package, Sparkles, TrendingUp, RefreshCw } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getBreadcrumb } from "@/lib/navigation/breadcrumb-registry";
import { Menu } from "@/models/menu/menu.model";
import { getLocations } from "@/lib/services/graphql/queries";

// Format date for input (YYYY-MM-DD)
function formatDateForInput(date: Date | string): string {
  const d = new Date(date);
  return d.toISOString().split('T')[0];
}

// Format date for display
function formatDateForDisplay(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString('nl-NL', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function MenusClient() {
  const pathname = usePathname();
  const pageMetadata = getBreadcrumb(pathname);
  
  // State
  const [menus, setMenus] = useState<Menu[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isProductsDialogOpen, setIsProductsDialogOpen] = useState(false);
  const [isPriceHistoryDialogOpen, setIsPriceHistoryDialogOpen] = useState(false);
  const [selectedMenu, setSelectedMenu] = useState<Menu | null>(null);
  const [selectedProductForHistory, setSelectedProductForHistory] = useState<string | null>(null);
  const [priceHistory, setPriceHistory] = useState<any>(null);
  const [isLoadingPriceHistory, setIsLoadingPriceHistory] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    locationId: '',
    startDate: '',
    endDate: '',
    notes: '',
    isActive: true,
  });
  const [indefiniteMenu, setIndefiniteMenu] = useState(false);
  
  // Product assignment state
  const [productSearch, setProductSearch] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [productPrices, setProductPrices] = useState<Record<string, number>>({});
  
  // Load menus
  const loadMenus = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/menus');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      if (data.success) {
        setMenus(data.menus);
      } else {
        console.error('Failed to load menus:', data.error);
      }
    } catch (error) {
      console.error('Error loading menus:', error);
      // Show user-friendly error
      alert('Failed to load menus. Please refresh the page.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Load locations
  const loadLocations = async () => {
    try {
      const locs = await getLocations();
      setLocations(locs);
    } catch (error) {
      console.error('Error loading locations:', error);
    }
  };
  
  useEffect(() => {
    loadMenus();
    loadLocations();
  }, []);
  
  // Handle create menu
  const handleCreate = async () => {
    try {
      const response = await fetch('/api/menus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          locationId: formData.locationId || undefined,
          startDate: formData.startDate,
          endDate: indefiniteMenu ? null : (formData.endDate || undefined),
          notes: formData.notes,
          isActive: formData.isActive,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Failed to create menu');
        return;
      }
      
      setIsCreateDialogOpen(false);
      setFormData({ title: '', locationId: '', startDate: '', endDate: '', notes: '', isActive: true });
      setIndefiniteMenu(false);
      loadMenus();
    } catch (error) {
      console.error('Error creating menu:', error);
      alert('Failed to create menu');
    }
  };
  
  // Handle edit menu
  const handleEdit = (menu: Menu) => {
    setSelectedMenu(menu);
    setFormData({
      title: menu.title,
      locationId: menu.locationId || '',
      startDate: formatDateForInput(menu.startDate),
      endDate: menu.endDate ? formatDateForInput(menu.endDate) : '',
      notes: menu.notes || '',
      isActive: menu.isActive,
    });
    setIndefiniteMenu(!menu.endDate);
    setIsEditDialogOpen(true);
  };
  
  // Handle update menu
  const handleUpdate = async () => {
    if (!selectedMenu) return;
    
    try {
      const response = await fetch(`/api/menus/${selectedMenu._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          locationId: formData.locationId || undefined,
          startDate: formData.startDate,
          endDate: indefiniteMenu ? null : formData.endDate,
          notes: formData.notes,
          isActive: formData.isActive,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Failed to update menu');
        return;
      }
      
      setIsEditDialogOpen(false);
      setSelectedMenu(null);
      setFormData({ title: '', locationId: '', startDate: '', endDate: '', notes: '', isActive: true });
      setIndefiniteMenu(false);
      loadMenus();
    } catch (error) {
      console.error('Error updating menu:', error);
      alert('Failed to update menu');
    }
  };
  
  // Handle delete menu
  const handleDelete = async (menu: Menu) => {
    if (!confirm(`Are you sure you want to delete menu "${menu.title}"?`)) return;
    
    try {
      const response = await fetch(`/api/menus/${menu._id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        alert('Failed to delete menu');
        return;
      }
      
      loadMenus();
    } catch (error) {
      console.error('Error deleting menu:', error);
      alert('Failed to delete menu');
    }
  };
  
  // Handle manage products
  const handleManageProducts = (menu: Menu) => {
    setSelectedMenu(menu);
    setSelectedProducts(menu.productIds || []);
    
    // Extract prices from productPrices array
    const prices: Record<string, number> = {};
    if (menu.productPrices && Array.isArray(menu.productPrices)) {
      for (const pp of menu.productPrices) {
        if (!pp.dateRemoved && pp.productName) {
          prices[pp.productName] = pp.price || 0;
        }
      }
    }
    setProductPrices(prices);
    
    setIsProductsDialogOpen(true);
  };
  
  // Handle add product
  const handleAddProduct = () => {
    if (!productSearch.trim()) return;
    const productName = productSearch.trim();
    if (selectedProducts.includes(productName)) return;
    
    setSelectedProducts([...selectedProducts, productName]);
    // Initialize price to 0 if not set
    if (!productPrices[productName]) {
      setProductPrices({ ...productPrices, [productName]: 0 });
    }
    setProductSearch('');
  };
  
  // Handle remove product
  const handleRemoveProduct = (productName: string) => {
    setSelectedProducts(selectedProducts.filter((p) => p !== productName));
    const newPrices = { ...productPrices };
    delete newPrices[productName];
    setProductPrices(newPrices);
  };
  
  // Handle update product price
  const handleUpdatePrice = (productName: string, price: number) => {
    setProductPrices({ ...productPrices, [productName]: price });
  };
  
  // Handle save products
  const handleSaveProducts = async () => {
    if (!selectedMenu) return;
    
    try {
      // Build productPrices array from state
      const productPricesArray = selectedProducts.map(productName => ({
        productName,
        price: productPrices[productName] || 0,
      }));
      
      const response = await fetch(`/api/menus/${selectedMenu._id}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          productIds: selectedProducts,
          productPrices: productPricesArray,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Failed to assign products');
        return;
      }
      
      setIsProductsDialogOpen(false);
      setSelectedMenu(null);
      setSelectedProducts([]);
      setProductPrices({});
      loadMenus();
    } catch (error) {
      console.error('Error assigning products:', error);
      alert('Failed to assign products');
    }
  };
  
  // Handle view price history
  const handleViewPriceHistory = async (productName: string) => {
    setSelectedProductForHistory(productName);
    setIsLoadingPriceHistory(true);
    setIsPriceHistoryDialogOpen(true);
    
    try {
      const response = await fetch(`/api/products/${encodeURIComponent(productName)}/price-history`);
      const data = await response.json();
      
      if (response.ok && data.success) {
        setPriceHistory(data);
      } else {
        alert(data.error || 'Failed to load price history');
        setPriceHistory(null);
      }
    } catch (error) {
      console.error('Error loading price history:', error);
      alert('Failed to load price history');
      setPriceHistory(null);
    } finally {
      setIsLoadingPriceHistory(false);
    }
  };
  
  // Handle refresh prices from products_aggregated
  const handleRefreshPrices = async () => {
    if (!confirm('Refresh all menu product prices from aggregated sales data?\n\nThis will update products with price €0.00 to use prices from recent sales.')) {
      return;
    }
    
    try {
      const response = await fetch('/api/menus/refresh-prices', {
        method: 'POST',
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
        alert(errorData.error || 'Failed to refresh prices');
        return;
      }
      
      const data = await response.json();
      
      alert(`✅ Successfully updated ${data.productsUpdated} product prices across ${data.menusUpdated} menus!`);
      
      // Reload menus after a short delay
      setTimeout(() => {
        loadMenus();
      }, 500);
    } catch (error: any) {
      console.error('Error refreshing prices:', error);
      alert(`Failed to refresh prices: ${error.message || 'Network error'}`);
    }
  };

  // Handle auto-populate products from sales data
  const handleAutoPopulate = async (menu: Menu) => {
    if (!menu.locationId) {
      alert('Please assign a location to this menu first before auto-populating products.');
      return;
    }
    
    if (!confirm(`Auto-populate products from sales data for "${menu.title}"?\n\nThis will add all products sold after ${formatDateForDisplay(menu.startDate)} for this location.`)) {
      return;
    }
    
    try {
      const response = await fetch(`/api/menus/${menu._id}/products/auto-populate`, {
        method: 'PUT',
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
        alert(errorData.error || 'Failed to auto-populate products');
        return;
      }
      
      const data = await response.json();
      
      alert(`✅ Successfully added ${data.addedProducts} products from sales data!\n\nNew products: ${data.newProducts?.length || 0}\nTotal products: ${data.totalProducts || 0}`);
      
      // Reload menus after a short delay to ensure database is updated
      setTimeout(() => {
        loadMenus();
      }, 500);
    } catch (error: any) {
      console.error('Error auto-populating products:', error);
      alert(`Failed to auto-populate products: ${error.message || 'Network error'}`);
    }
  };
  
  // Check if menu is active (only one per location can be active)
  const isActiveMenu = (menu: Menu) => {
    return menu.isActive === true;
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
      
      {/* Action Buttons */}
      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          onClick={handleRefreshPrices}
          title="Refresh all menu product prices from aggregated sales data"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh Prices
        </Button>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create New Menu
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Menu</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Menu Title *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Summer Menu 2025"
                />
              </div>
              
            <div>
              <Label>Location</Label>
              <Select value={formData.locationId || "none"} onValueChange={(val) => setFormData({ ...formData, locationId: val === "none" ? "" : val })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select location (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {locations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Start Date *</Label>
                  <Input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Switch
                      checked={indefiniteMenu}
                      onCheckedChange={setIndefiniteMenu}
                    />
                    <Label>Indefinite menu (no end date)</Label>
                  </div>
                  {!indefiniteMenu && (
                    <>
                      <Label>End Date</Label>
                      <Input
                        type="date"
                        value={formData.endDate}
                        onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      />
                    </>
                  )}
                </div>
              </div>
              
              <div>
                <Label>Notes</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Optional notes about this menu..."
                  rows={3}
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
                <Label>Active</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate}>Create Menu</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      
      {/* Menus List */}
      {isLoading ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Loading menus...
          </CardContent>
        </Card>
      ) : menus.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No menus created yet. Click "Create New Menu" to get started.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {menus.map((menu) => (
            <Card key={menu._id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <CardTitle>
                        {menu.title}
                        {menu.locationId && (
                          <span className="text-muted-foreground"> / {locations.find(l => l.id === menu.locationId)?.name || menu.locationId}</span>
                        )}
                      </CardTitle>
                      {isActiveMenu(menu) && (
                        <Badge variant="default" className="bg-green-600">Active</Badge>
                      )}
                      {!menu.isActive && (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </div>
                    <CardDescription className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {formatDateForDisplay(menu.startDate)}
                      {menu.endDate && (
                        <>
                          {' '}- {formatDateForDisplay(menu.endDate)}
                          <span className="text-muted-foreground">
                            ({Math.ceil((new Date(menu.endDate).getTime() - new Date(menu.startDate).getTime()) / (1000 * 60 * 60 * 24))} days)
                          </span>
                        </>
                      )}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleManageProducts(menu)}
                    >
                      <Package className="h-4 w-4 mr-2" />
                      Products ({menu.productIds?.length || 0})
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAutoPopulate(menu)}
                      title="Auto-populate products from sales data (all products sold after menu start date)"
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      Auto-Populate
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(menu)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(menu)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              {menu.notes && (
                <CardContent>
                  <p className="text-sm text-muted-foreground">{menu.notes}</p>
                </CardContent>
              )}
              {(() => {
                // Get active products from productPrices if available
                const activeProductPrices = menu.productPrices && Array.isArray(menu.productPrices)
                  ? menu.productPrices.filter((p: any) => !p.dateRemoved)
                  : [];
                
                // Fallback to productIds if productPrices is empty
                const productsToShow = activeProductPrices.length > 0
                  ? activeProductPrices
                  : (menu.productIds && Array.isArray(menu.productIds) && menu.productIds.length > 0
                      ? menu.productIds.map((productName: string) => ({ productName, price: 0 }))
                      : []);
                
                return productsToShow.length > 0 ? (
                  <CardContent>
                    <div className="text-xs text-muted-foreground">
                      <div className="font-medium mb-1">
                        {activeProductPrices.length > 0 ? 'Products with prices:' : 'Products (no prices yet):'}
                      </div>
                      <div className="grid grid-cols-2 gap-1 max-h-32 overflow-y-auto">
                        {productsToShow.slice(0, 10).map((pp: any, idx: number) => (
                          <div key={pp.productName || `product-${idx}`} className="flex justify-between">
                            <span className="truncate">{pp.productName}</span>
                            <span className="ml-2 font-medium">
                              {pp.price > 0 ? `€${pp.price.toFixed(2)}` : '€0.00'}
                            </span>
                          </div>
                        ))}
                        {productsToShow.length > 10 && (
                          <div className="text-muted-foreground">
                            +{productsToShow.length - 10} more
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                ) : null;
              })()}
            </Card>
          ))}
        </div>
      )}
      
      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Menu</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Menu Title *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>
            
            <div>
              <Label>Location</Label>
              <Select value={formData.locationId || "none"} onValueChange={(val) => setFormData({ ...formData, locationId: val === "none" ? "" : val })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select location (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {locations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Date *</Label>
                <Input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Switch
                    checked={indefiniteMenu}
                    onCheckedChange={setIndefiniteMenu}
                  />
                  <Label>Indefinite menu (no end date)</Label>
                </div>
                {!indefiniteMenu && (
                  <>
                    <Label>End Date</Label>
                    <Input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    />
                  </>
                )}
              </div>
            </div>
            
            <div>
              <Label>Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate}>Update Menu</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Products Dialog */}
      <Dialog open={isProductsDialogOpen} onOpenChange={setIsProductsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Manage Products - {selectedMenu?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Enter product name..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddProduct();
                  }
                }}
              />
              <Button onClick={handleAddProduct}>Add</Button>
            </div>
            
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {selectedProducts.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No products assigned yet
                </p>
              ) : (
                selectedProducts.map((productName) => (
                  <div
                    key={productName}
                    className="flex items-center justify-between gap-4 p-3 border rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{productName}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2"
                          onClick={() => handleViewPriceHistory(productName)}
                          title="View price history across all menus"
                        >
                          <TrendingUp className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Label className="text-xs text-muted-foreground">Price:</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={productPrices[productName] || 0}
                          onChange={(e) => handleUpdatePrice(productName, parseFloat(e.target.value) || 0)}
                          className="h-7 w-24 text-sm"
                          placeholder="0.00"
                        />
                        <span className="text-xs text-muted-foreground">€</span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveProduct(productName)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsProductsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveProducts}>Save Products</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Price History Dialog */}
      <Dialog open={isPriceHistoryDialogOpen} onOpenChange={setIsPriceHistoryDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Price History - {selectedProductForHistory}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {isLoadingPriceHistory ? (
              <div className="py-8 text-center text-muted-foreground">
                Loading price history...
              </div>
            ) : priceHistory ? (
              <>
                {priceHistory.statistics && (
                  <div className="grid grid-cols-4 gap-4 p-4 bg-muted rounded-lg">
                    <div>
                      <div className="text-xs text-muted-foreground">Total Menus</div>
                      <div className="text-lg font-semibold">{priceHistory.statistics.totalMenus}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Average Price</div>
                      <div className="text-lg font-semibold">€{priceHistory.statistics.averagePrice.toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Min Price</div>
                      <div className="text-lg font-semibold">€{priceHistory.statistics.minPrice.toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Max Price</div>
                      <div className="text-lg font-semibold">€{priceHistory.statistics.maxPrice.toFixed(2)}</div>
                    </div>
                  </div>
                )}
                
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {priceHistory.priceHistory && priceHistory.priceHistory.length > 0 ? (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Menu</th>
                          <th className="text-left p-2">Location</th>
                          <th className="text-left p-2">Period</th>
                          <th className="text-right p-2">Price</th>
                          <th className="text-right p-2">Change</th>
                        </tr>
                      </thead>
                      <tbody>
                        {priceHistory.priceHistory.map((entry: any, index: number) => (
                          <tr key={index} className="border-b">
                            <td className="p-2 font-medium">{entry.menuTitle}</td>
                            <td className="p-2 text-muted-foreground">{entry.locationName || 'N/A'}</td>
                            <td className="p-2 text-muted-foreground text-xs">
                              {formatDateForDisplay(entry.startDate)}
                              {entry.endDate && ` - ${formatDateForDisplay(entry.endDate)}`}
                            </td>
                            <td className="p-2 text-right font-medium">€{entry.price.toFixed(2)}</td>
                            <td className="p-2 text-right">
                              {entry.priceChange ? (
                                <span className={entry.priceChange.change > 0 ? 'text-green-600' : entry.priceChange.change < 0 ? 'text-red-600' : ''}>
                                  {entry.priceChange.change > 0 ? '+' : ''}
                                  €{entry.priceChange.change.toFixed(2)} ({entry.priceChange.changePercent > 0 ? '+' : ''}
                                  {entry.priceChange.changePercent.toFixed(1)}%)
                                </span>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="py-8 text-center text-muted-foreground">
                      No price history found for this product
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                No price history available
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPriceHistoryDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

