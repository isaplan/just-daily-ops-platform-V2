import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, FileWarning, Settings } from "lucide-react";
import { ColumnMapper } from "./ColumnMapper";
import type { ValidationResult } from "@/lib/schemaValidator";

interface SchemaResolverDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  validation: ValidationResult;
  availableDbColumns: string[];
  onResolve: (action: "map" | "ignore", mappings?: Record<string, string | null>) => void;
}

export function SchemaResolverDialog({
  open,
  onOpenChange,
  validation,
  availableDbColumns,
  onResolve,
}: SchemaResolverDialogProps) {
  const [activeTab, setActiveTab] = useState("overview");

  const handleMapColumns = (mappings: Record<string, string | null>) => {
    onResolve("map", mappings);
    onOpenChange(false);
  };

  const handleIgnore = () => {
    onResolve("ignore");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileWarning className="h-5 w-5" />
            Schema Validation Issues
          </DialogTitle>
          <DialogDescription>
            The uploaded file has columns that don&apos;t match the expected database schema
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="mapper">Column Mapping</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {validation.missingRequired.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Missing Required Columns:</strong>
                  <ul className="list-disc list-inside mt-2">
                    {validation.missingRequired.map(col => (
                      <li key={col}>{col}</li>
                    ))}
                  </ul>
                  <p className="mt-2 text-sm">
                    These columns must be present in the file. Please check your export and try again.
                  </p>
                </AlertDescription>
              </Alert>
            )}

            {validation.extraColumns.length > 0 && (
              <Alert>
                <Settings className="h-4 w-4" />
                <AlertDescription>
                  <strong>Extra Columns Found:</strong>
                  <ul className="list-disc list-inside mt-2">
                    {validation.extraColumns.map(col => (
                      <li key={col}>{col}</li>
                    ))}
                  </ul>
                  <p className="mt-2 text-sm">
                    These columns aren&apos;t in the database schema. You can map them to existing columns or ignore them.
                  </p>
                </AlertDescription>
              </Alert>
            )}

            {validation.suggestions.length > 0 && (
              <Alert>
                <AlertDescription>
                  <strong>Suggested Mappings:</strong>
                  <ul className="list-disc list-inside mt-2">
                    {validation.suggestions.map(s => (
                      <li key={s.excelColumn}>
                        <strong>{s.excelColumn}</strong> → {s.suggestedDbColumn} 
                        ({Math.round(s.confidence * 100)}% confidence)
                      </li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2 justify-end pt-4">
              <Button variant="outline" onClick={handleIgnore}>
                Ignore Extra Columns
              </Button>
              <Button 
                onClick={() => setActiveTab("mapper")}
                disabled={validation.extraColumns.length === 0}
              >
                Map Columns
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="mapper">
            <ColumnMapper
              extraColumns={validation.extraColumns}
              suggestions={validation.suggestions}
              availableDbColumns={availableDbColumns}
              onConfirm={handleMapColumns}
              onCancel={() => onOpenChange(false)}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
