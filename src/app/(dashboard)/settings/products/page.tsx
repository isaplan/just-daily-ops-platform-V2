/**
 * Product Catalog Management Page
 * Manage products with workload and MEP (prep) time metrics
 */

"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { useProductsViewModel } from "@/viewmodels/products/useProductsViewModel";
import { getBreadcrumb } from "@/lib/navigation/breadcrumb-registry";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UITable } from "@/components/view-data/UITable";
import { LoadingState } from "@/components/view-data/LoadingState";
import { ErrorState } from "@/components/view-data/ErrorState";
import { SimplePagination } from "@/components/view-data/SimplePagination";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Product, ProductInput, ProductUpdateInput } from "@/lib/services/graphql/queries";

export default function ProductsPage() {
  const viewModel = useProductsViewModel();
  const pathname = usePathname();
  const pageMetadata = getBreadcrumb(pathname);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
  };

  const handleSave = (formData: ProductInput | ProductUpdateInput) => {
    if (editingProduct) {
      viewModel.updateProduct({ id: editingProduct.id, input: formData });
      setEditingProduct(null);
    } else {
      viewModel.createProduct(formData as ProductInput);
      setIsCreateDialogOpen(false);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this product?")) {
      viewModel.deleteProduct(id);
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {pageMetadata && (
        <div className="pt-20 space-y-1">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold">{pageMetadata.label}</h1>
              {pageMetadata.subtitle && (
                <p className="text-sm text-muted-foreground">{pageMetadata.subtitle}</p>
              )}
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Product
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Add New Product</DialogTitle>
                </DialogHeader>
                <ProductForm
                  onSubmit={handleSave}
                  onCancel={() => setIsCreateDialogOpen(false)}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <Label>Search</Label>
            <Input
              placeholder="Search products..."
              value={viewModel.searchTerm}
              onChange={(e) => viewModel.setSearchTerm(e.target.value)}
            />
          </div>
          <div>
            <Label>Category</Label>
            <Select value={viewModel.selectedCategory} onValueChange={viewModel.setSelectedCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {viewModel.categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Workload Level</Label>
            <Select value={viewModel.selectedWorkloadLevel} onValueChange={viewModel.setSelectedWorkloadLevel}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="low">Low (2.5 min)</SelectItem>
                <SelectItem value="mid">Mid (5 min)</SelectItem>
                <SelectItem value="high">High (10 min)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>MEP Level</Label>
            <Select value={viewModel.selectedMEPLevel} onValueChange={viewModel.setSelectedMEPLevel}>
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
          <div className="flex items-end">
            <Button
              variant={viewModel.showActiveOnly ? "default" : "outline"}
              onClick={() => viewModel.setShowActiveOnly(!viewModel.showActiveOnly)}
              className="w-full"
            >
              {viewModel.showActiveOnly ? "Active Only" : "Show All"}
            </Button>
          </div>
        </div>

        {viewModel.isLoading && <LoadingState />}
        {viewModel.error && (
          <ErrorState error={viewModel.error} message="Error loading products" />
        )}

        {!viewModel.isLoading && !viewModel.error && (
          <>
            <div className="text-sm text-muted-foreground">
              Showing {viewModel.products.length} of {viewModel.total} product{viewModel.total !== 1 ? 's' : ''}
            </div>

            <UITable>
              <TableHeader>
                <TableRow>
                  <TableHead>Product Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Workload</TableHead>
                  <TableHead>MEP Time</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {viewModel.products.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No products found
                    </TableCell>
                  </TableRow>
                ) : (
                  viewModel.products.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">{product.productName}</TableCell>
                      <TableCell>{product.category || '-'}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded text-xs ${
                          product.workloadLevel === 'high' ? 'bg-red-100 text-red-800' :
                          product.workloadLevel === 'mid' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {product.workloadLevel.toUpperCase()} ({product.workloadMinutes} min)
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded text-xs ${
                          product.mepLevel === 'high' ? 'bg-red-100 text-red-800' :
                          product.mepLevel === 'mid' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {product.mepLevel.toUpperCase()} ({product.mepMinutes} min)
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded text-xs ${
                          product.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {product.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(product)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(product.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </UITable>

            {viewModel.totalPages > 1 && (
              <SimplePagination
                currentPage={viewModel.currentPage}
                totalPages={viewModel.totalPages}
                onPageChange={viewModel.setCurrentPage}
              />
            )}
          </>
        )}
      </div>

      {/* Edit Dialog */}
      {editingProduct && (
        <Dialog open={!!editingProduct} onOpenChange={(open) => !open && setEditingProduct(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Product</DialogTitle>
            </DialogHeader>
            <ProductForm
              product={editingProduct}
              onSubmit={handleSave}
              onCancel={() => setEditingProduct(null)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

interface ProductFormProps {
  product?: Product;
  onSubmit: (data: ProductInput | ProductUpdateInput) => void;
  onCancel: () => void;
}

function ProductForm({ product, onSubmit, onCancel }: ProductFormProps) {
  const [formData, setFormData] = useState<ProductInput>({
    productName: product?.productName || "",
    category: product?.category || "",
    workloadLevel: product?.workloadLevel || "low",
    mepLevel: product?.mepLevel || "low",
    notes: product?.notes || "",
    isActive: product?.isActive !== undefined ? product.isActive : true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="productName">Product Name *</Label>
        <Input
          id="productName"
          value={formData.productName}
          onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
          required
        />
      </div>

      <div>
        <Label htmlFor="category">Category</Label>
        <Input
          id="category"
          value={formData.category}
          onChange={(e) => setFormData({ ...formData, category: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="workloadLevel">Workload Level *</Label>
          <Select
            value={formData.workloadLevel}
            onValueChange={(value) => setFormData({ ...formData, workloadLevel: value as 'low' | 'mid' | 'high' })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low (2.5 min)</SelectItem>
              <SelectItem value="mid">Mid (5 min)</SelectItem>
              <SelectItem value="high">High (10 min)</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground mt-1">
            Time needed to prepare this product during service
          </p>
        </div>

        <div>
          <Label htmlFor="mepLevel">MEP (Prep) Level *</Label>
          <Select
            value={formData.mepLevel}
            onValueChange={(value) => setFormData({ ...formData, mepLevel: value as 'low' | 'mid' | 'high' })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low (1 min)</SelectItem>
              <SelectItem value="mid">Mid (2 min)</SelectItem>
              <SelectItem value="high">High (4 min)</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground mt-1">
            Prep time needed before service (e.g., guacamole for Nachos)
          </p>
        </div>
      </div>

      <div>
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          rows={3}
        />
      </div>

      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="isActive"
          checked={formData.isActive}
          onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
          className="rounded"
        />
        <Label htmlFor="isActive">Active</Label>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          {product ? "Update" : "Create"} Product
        </Button>
      </div>
    </form>
  );
}

