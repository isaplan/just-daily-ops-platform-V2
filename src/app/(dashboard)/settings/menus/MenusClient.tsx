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
import { Plus, Pencil, Trash2, Calendar, Package } from "lucide-react";
import { getBreadcrumb } from "@/lib/navigation/breadcrumb-registry";
import { Menu } from "@/models/menu/menu.model";

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
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isProductsDialogOpen, setIsProductsDialogOpen] = useState(false);
  const [selectedMenu, setSelectedMenu] = useState<Menu | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    startDate: '',
    endDate: '',
    notes: '',
    isActive: true,
  });
  
  // Product assignment state
  const [productSearch, setProductSearch] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  
  // Load menus
  const loadMenus = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/menus');
      const data = await response.json();
      if (data.success) {
        setMenus(data.menus);
      }
    } catch (error) {
      console.error('Error loading menus:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    loadMenus();
  }, []);
  
  // Handle create menu
  const handleCreate = async () => {
    try {
      const response = await fetch('/api/menus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          startDate: formData.startDate,
          endDate: formData.endDate || undefined,
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
      setFormData({ title: '', startDate: '', endDate: '', notes: '', isActive: true });
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
      startDate: formatDateForInput(menu.startDate),
      endDate: formatDateForInput(menu.endDate),
      notes: menu.notes || '',
      isActive: menu.isActive,
    });
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
          startDate: formData.startDate,
          endDate: formData.endDate,
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
      setFormData({ title: '', startDate: '', endDate: '', notes: '', isActive: true });
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
    setIsProductsDialogOpen(true);
  };
  
  // Handle add product
  const handleAddProduct = () => {
    if (!productSearch.trim()) return;
    if (selectedProducts.includes(productSearch.trim())) return;
    
    setSelectedProducts([...selectedProducts, productSearch.trim()]);
    setProductSearch('');
  };
  
  // Handle remove product
  const handleRemoveProduct = (productName: string) => {
    setSelectedProducts(selectedProducts.filter((p) => p !== productName));
  };
  
  // Handle save products
  const handleSaveProducts = async () => {
    if (!selectedMenu) return;
    
    try {
      const response = await fetch(`/api/menus/${selectedMenu._id}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productIds: selectedProducts }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Failed to assign products');
        return;
      }
      
      setIsProductsDialogOpen(false);
      setSelectedMenu(null);
      setSelectedProducts([]);
      loadMenus();
    } catch (error) {
      console.error('Error assigning products:', error);
      alert('Failed to assign products');
    }
  };
  
  // Check if menu is current
  const isCurrentMenu = (menu: Menu) => {
    const now = new Date();
    const start = new Date(menu.startDate);
    const end = new Date(menu.endDate);
    return now >= start && now <= end;
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
      
      {/* Create Button */}
      <div className="flex justify-end">
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
                  <Label>End Date (optional)</Label>
                  <Input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Leave empty to auto-calculate as day before next menu
                  </p>
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
                      <CardTitle>{menu.title}</CardTitle>
                      {isCurrentMenu(menu) && (
                        <Badge variant="default" className="bg-green-600">Current</Badge>
                      )}
                      {!menu.isActive && (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </div>
                    <CardDescription className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {formatDateForDisplay(menu.startDate)} - {formatDateForDisplay(menu.endDate)}
                      <span className="text-muted-foreground">
                        ({Math.ceil((new Date(menu.endDate).getTime() - new Date(menu.startDate).getTime()) / (1000 * 60 * 60 * 24))} days)
                      </span>
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
                <Label>End Date *</Label>
                <Input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                />
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
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <span>{productName}</span>
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
    </div>
  );
}

