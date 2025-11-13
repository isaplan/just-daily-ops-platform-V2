import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { ChevronLeft, ChevronRight, Search, Filter } from "lucide-react";

interface PaginatedDataProps {
  locationId?: string;
  pageSize?: number;
}

export function PaginatedDataDisplay({ locationId, pageSize = 20 }: PaginatedDataProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Fetch paginated data
  const { data: paginatedData, isLoading, error } = useQuery({
    queryKey: ['paginated-bork-data', currentPage, pageSize, searchTerm, categoryFilter, sortBy, sortOrder, locationId],
    queryFn: async () => {
      let query = supabase
        .from('bork_sales_data')
        .select(`
          *,
          locations(name)
        `)
        .order(sortBy, { ascending: sortOrder === 'asc' })
        .range((currentPage - 1) * pageSize, currentPage * pageSize - 1);

      if (locationId) {
        query = query.eq('location_id', locationId);
      }

      if (categoryFilter !== 'all') {
        query = query.eq('category', categoryFilter);
      }

      if (searchTerm) {
        query = query.ilike('product_name', `%${searchTerm}%`);
      }

      const { data, error, count } = await query;
      if (error) throw error;

      return {
        data: data || [],
        totalCount: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize)
      };
    },
  });

  // Fetch unique categories for filter
  const { data: categories } = useQuery({
    queryKey: ['bork-categories'],
    queryFn: async () => {
      const { data } = await supabase
        .from('bork_sales_data')
        .select('category')
        .not('category', 'is', null);
      
      const uniqueCategories = [...new Set(data?.map(d => d.category))];
      return uniqueCategories.sort();
    },
  });

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1); // Reset to first page on search
  };

  const handleCategoryFilter = (category: string) => {
    setCategoryFilter(category);
    setCurrentPage(1); // Reset to first page on filter
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading data...</div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-500">Error loading data: {error.message}</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Data Browser</CardTitle>
          <CardDescription>
            Paginated view of bork_sales_data with smart filtering
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={categoryFilter} onValueChange={handleCategoryFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories?.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created_at">Date</SelectItem>
                <SelectItem value="product_name">Product</SelectItem>
                <SelectItem value="revenue">Revenue</SelectItem>
                <SelectItem value="quantity">Quantity</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Sales Data</CardTitle>
              <CardDescription>
                Showing {paginatedData?.data.length || 0} of {paginatedData?.totalCount || 0} records
              </CardDescription>
            </div>
            <Badge variant="outline">
              Page {currentPage} of {paginatedData?.totalPages || 1}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Revenue</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Location</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData?.data.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">{record.product_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{record.category}</Badge>
                    </TableCell>
                    <TableCell>{record.quantity}</TableCell>
                    <TableCell>${record.price?.toFixed(2)}</TableCell>
                    <TableCell className="font-medium">${record.revenue?.toFixed(2)}</TableCell>
                    <TableCell>{new Date(record.date).toLocaleDateString()}</TableCell>
                    <TableCell>{record.locations?.name || 'Unknown'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-gray-500">
              Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, paginatedData?.totalCount || 0)} of {paginatedData?.totalCount || 0} results
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, paginatedData?.totalPages || 1) }, (_, i) => {
                  const pageNum = i + 1;
                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => handlePageChange(pageNum)}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === (paginatedData?.totalPages || 1)}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
