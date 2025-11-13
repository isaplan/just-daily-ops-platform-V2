import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Check, X } from "lucide-react";

interface ColumnMappingOption {
  excelColumn: string;
  suggestedDbColumn: string;
  confidence: number;
}

interface ColumnMapperProps {
  extraColumns: string[];
  suggestions: ColumnMappingOption[];
  availableDbColumns: string[];
  onConfirm: (mappings: Record<string, string | null>) => void;
  onCancel: () => void;
}

export function ColumnMapper({ 
  extraColumns, 
  suggestions, 
  availableDbColumns,
  onConfirm, 
  onCancel 
}: ColumnMapperProps) {
  const [mappings, setMappings] = useState<Record<string, string | null>>(() => {
    const initial: Record<string, string | null> = {};
    suggestions.forEach(s => {
      initial[s.excelColumn] = s.confidence > 0.7 ? s.suggestedDbColumn : null;
    });
    extraColumns.forEach(col => {
      if (!(col in initial)) {
        initial[col] = null;
      }
    });
    return initial;
  });

  const handleMappingChange = (excelColumn: string, dbColumn: string | null) => {
    setMappings(prev => ({ ...prev, [excelColumn]: dbColumn }));
  };

  const handleConfirm = () => {
    onConfirm(mappings);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Map Excel Columns</CardTitle>
        <CardDescription>
          Choose how to handle columns not in the database schema
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {extraColumns.map(excelCol => {
          const suggestion = suggestions.find(s => s.excelColumn === excelCol);
          const currentMapping = mappings[excelCol];
          
          return (
            <div key={excelCol} className="flex items-center gap-4 p-4 border rounded-lg">
              <div className="flex-1">
                <div className="font-medium">{excelCol}</div>
                {suggestion && (
                  <Badge variant="outline" className="mt-1">
                    {Math.round(suggestion.confidence * 100)}% match
                  </Badge>
                )}
              </div>
              
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              
              <div className="flex-1">
                <Select
                  value={currentMapping || "ignore"}
                  onValueChange={(value) => 
                    handleMappingChange(excelCol, value === "ignore" ? null : value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select mapping" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ignore">
                      <div className="flex items-center gap-2">
                        <X className="h-4 w-4" />
                        <span>Ignore column</span>
                      </div>
                    </SelectItem>
                    {availableDbColumns.map(dbCol => (
                      <SelectItem key={dbCol} value={dbCol}>
                        {dbCol}
                        {suggestion?.suggestedDbColumn === dbCol && (
                          <Check className="ml-2 h-4 w-4 inline" />
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          );
        })}
        
        <div className="flex gap-2 justify-end pt-4">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>
            Confirm Mappings
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
