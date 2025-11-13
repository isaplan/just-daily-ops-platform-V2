import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface PreviewRow {
  data: Record<string, any>;
  isValid: boolean;
  warnings: string[];
}

interface PreviewTableProps {
  headers: string[];
  rows: PreviewRow[];
}

export function PreviewTable({ headers, rows }: PreviewTableProps) {
  if (rows.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        No data to preview
      </div>
    );
  }

  return (
    <ScrollArea className="h-96 rounded-md border">
      <Table>
        <TableHeader className="sticky top-0 bg-background z-10">
          <TableRow>
            <TableHead className="w-12">Status</TableHead>
            <TableHead className="w-16">Row</TableHead>
            {headers.map((header, idx) => (
              <TableHead key={idx}>{header}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, rowIdx) => (
            <TableRow 
              key={rowIdx}
              className={
                !row.isValid 
                  ? "bg-destructive/10" 
                  : row.warnings.length > 0 
                  ? "bg-warning/10" 
                  : "bg-success/5"
              }
            >
              <TableCell>
                {!row.isValid ? (
                  <XCircle className="h-4 w-4 text-destructive" />
                ) : row.warnings.length > 0 ? (
                  <AlertTriangle className="h-4 w-4 text-warning" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 text-success" />
                )}
              </TableCell>
              <TableCell className="font-mono text-xs">{rowIdx + 1}</TableCell>
              {headers.map((header, colIdx) => (
                <TableCell key={colIdx} className="max-w-[200px] truncate">
                  {row.data[header] !== null && row.data[header] !== undefined
                    ? String(row.data[header])
                    : <span className="text-muted-foreground italic">empty</span>
                  }
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  );
}
