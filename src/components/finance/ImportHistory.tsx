// import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Trash2 } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

const supabase = createClient();

export function ImportHistory() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  // const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  
  const { data: imports } = useQuery({
    queryKey: ["data-imports"],
    queryFn: async () => {
      if (!supabase) throw new Error("Supabase client not available");
      
      const { data, error } = await supabase
        .from("data_imports")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      return data || [];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (importId: string) => {
      if (!supabase) throw new Error("Supabase client not available");
      
      const { error } = await supabase
        .from('data_imports')
        .delete()
        .eq('id', importId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["data-imports"] });
      toast({
        title: "Deleted",
        description: "Import record deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      completed: "default",
      processing: "secondary",
      failed: "destructive",
    };
    return <Badge variant={variants[status] || "secondary"}>{status}</Badge>;
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      bork_sales: "Bork Sales",
      eitje_productivity: "Eitje Productivity",
      eitje_labor: "Eitje Labor",
      powerbi_pnl: "PowerBI P&L",
    };
    return labels[type] || type;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Recent Imports</CardTitle>
      </CardHeader>
      <CardContent>
        <TooltipProvider>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>File</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Records</TableHead>
                <TableHead>Created</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {imports?.map((imp: any) => ( // eslint-disable-line @typescript-eslint/no-explicit-any
                <TableRow key={imp.id}>
                  <TableCell className="font-medium">
                    <div className="line-clamp-2 max-w-[300px]">{imp.file_name}</div>
                  </TableCell>
                  <TableCell>{getTypeLabel(imp.import_type)}</TableCell>
                  <TableCell>{imp.location_id || '-'}</TableCell>
                  <TableCell>{getStatusBadge(imp.status)}</TableCell>
                  <TableCell>
                    {imp.processed_records || 0} / {imp.total_records || 0}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {format(new Date(imp.created_at), "d MMM yyyy").toUpperCase()}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteMutation.mutate(imp.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {!imports?.length && (
            <div className="text-center py-8 text-muted-foreground">
              No imports yet. Upload your first file to get started.
            </div>
          )}
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}