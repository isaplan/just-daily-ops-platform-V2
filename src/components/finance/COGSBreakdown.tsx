import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

interface COGSBreakdownProps {
  locationId: string | null;
  year: number;
  month: number;
}

export function COGSBreakdown({ locationId, year, month }: COGSBreakdownProps) {
  const { data: lineItems, isLoading } = useQuery({
    queryKey: ["cogs-breakdown", locationId, year, month],
    queryFn: async () => {
      let query = supabase
        .from("pnl_line_items")
        .select("*")
        .eq("category_level_1", "COGS")
        .eq("year", year)
        .eq("month", month)
        .order("category_level_2", { ascending: true })
        .order("amount", { ascending: false });
      
      if (locationId && locationId !== "all") {
        query = query.eq("location_id", locationId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!locationId && !!year && !!month
  });
  
  const groupedByL2 = lineItems?.reduce((acc, item) => {
    const key = item.category_level_2 || "Other";
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {} as Record<string, any[]>);
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>COGS Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[200px] w-full" />
        </CardContent>
      </Card>
    );
  }
  
  if (!lineItems || lineItems.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>COGS Breakdown - {year}/{month}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No COGS data available for this period.</p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>COGS Breakdown - {year}/{String(month).padStart(2, '0')}</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Category</TableHead>
              <TableHead>GL Account</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Object.entries(groupedByL2 || {}).map(([category, items]) => {
              const categoryTotal = items.reduce((sum, item) => sum + Number(item.amount), 0);
              return (
                <>
                  <TableRow key={category} className="font-semibold bg-muted/50">
                    <TableCell colSpan={2}>{category}</TableCell>
                    <TableCell className="text-right">{formatCurrency(categoryTotal)}</TableCell>
                  </TableRow>
                  {items.map((item, idx) => (
                    <TableRow key={`${category}-${idx}`}>
                      <TableCell className="pl-8 text-sm">{item.gl_description}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{item.gl_account}</TableCell>
                      <TableCell className="text-right text-sm">{formatCurrency(Number(item.amount))}</TableCell>
                    </TableRow>
                  ))}
                </>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
