import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { PreviewTable } from "./PreviewTable";
import { AnalysisResult, FieldMapping } from "@/lib/finance/universal/types";
import { parseDateValue } from "@/lib/finance/universal/parsers/dateParser";
import { parseNumber } from "@/lib/finance/universal/parsers/numberParser";
import { parseMonth } from "@/lib/finance/universal/parsers/monthParser";
import { AlertCircle, ArrowRight } from "lucide-react";

interface UniversalMappingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  analysis: AnalysisResult;
  locationName: string;
  onConfirm: (mapping: FieldMapping, saveMapping: boolean) => void;
}

export function UniversalMappingDialog({
  open,
  onOpenChange,
  analysis,
  locationName,
  onConfirm
}: UniversalMappingDialogProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [mapping, setMapping] = useState<FieldMapping>(analysis.proposedMapping);
  const [saveMapping, setSaveMapping] = useState(true);

  const steps = ["Required Fields", "Optional Fields", "Preview"];

  const allMapped = useMemo(() => {
    return analysis.requiredFields.every(field => mapping[field]);
  }, [mapping, analysis.requiredFields]);

  const previewRows = useMemo(() => {
    if (currentStep !== 2) return [];

    return analysis.sampleRows.map((row, idx) => {
      const data: Record<string, any> = {};
      const warnings: string[] = [];
      let isValid = true;

      // Map each field
      for (const [field, header] of Object.entries(mapping)) {
        const colIndex = analysis.headers.indexOf(header);
        if (colIndex === -1) continue;

        const value = row[colIndex];
        
        if (field === 'date') {
          const parsed = parseDateValue(value);
          data[field] = parsed || value;
          if (!parsed && analysis.requiredFields.includes(field)) {
            isValid = false;
            warnings.push(`Invalid date: ${value}`);
          }
        } else if (['quantity', 'price', 'revenue', 'hours', 'hourly_rate', 'labor_cost', 
                    'hours_worked', 'labor_cost_percentage', 'productivity_per_hour', 'amount'].includes(field)) {
          const parsed = parseNumber(value);
          data[field] = parsed !== null ? parsed : value;
          if (parsed === null && analysis.requiredFields.includes(field)) {
            isValid = false;
            warnings.push(`Invalid number: ${value}`);
          }
        } else if (field === 'month') {
          const parsed = parseMonth(value);
          data[field] = parsed !== null ? parsed : value;
          if (parsed === null && analysis.requiredFields.includes(field)) {
            isValid = false;
            warnings.push(`Invalid month: ${value}`);
          }
        } else if (field === 'year') {
          const parsed = parseNumber(value);
          data[field] = parsed !== null ? Math.floor(parsed) : value;
          if (parsed === null && analysis.requiredFields.includes(field)) {
            isValid = false;
            warnings.push(`Invalid year: ${value}`);
          }
        } else {
          data[field] = value;
          if (!value && analysis.requiredFields.includes(field)) {
            isValid = false;
            warnings.push(`Missing: ${field}`);
          }
        }
      }

      return { data, isValid, warnings };
    });
  }, [currentStep, mapping, analysis]);

  const validPreviewCount = previewRows.filter(r => r.isValid).length;
  const warningPreviewCount = previewRows.filter(r => !r.isValid && r.warnings.length > 0).length;

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleConfirm = () => {
    onConfirm(mapping, saveMapping);
    onOpenChange(false);
  };

  const getConfidenceBadge = (field: string) => {
    const conf = analysis.confidence[field] || 0;
    if (conf >= 0.9) return <Badge variant="default" className="ml-2">High</Badge>;
    if (conf >= 0.7) return <Badge variant="secondary" className="ml-2">Medium</Badge>;
    if (conf > 0) return <Badge variant="outline" className="ml-2">Low</Badge>;
    return null;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Map Columns - {locationName}
            <div className="text-sm font-normal text-muted-foreground mt-1">
              Step {currentStep + 1} of {steps.length}: {steps[currentStep]}
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Step 0: Required Fields */}
          {currentStep === 0 && (
            <div className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Map the required columns from your Excel file to the database fields. 
                  We've suggested mappings based on column names.
                </AlertDescription>
              </Alert>

              {analysis.requiredFields.map(field => (
                <div key={field} className="space-y-2">
                  <Label className="flex items-center">
                    {field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    <span className="text-destructive ml-1">*</span>
                    {getConfidenceBadge(field)}
                  </Label>
                  <Select 
                    value={mapping[field] || ''} 
                    onValueChange={(value) => setMapping({ ...mapping, [field]: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select column..." />
                    </SelectTrigger>
                    <SelectContent>
                      {analysis.headers.map((header, idx) => (
                        <SelectItem key={idx} value={header}>
                          {header}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}

              {!allMapped && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    All required fields must be mapped before continuing.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Step 1: Optional Fields */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Optionally map additional columns. These can be skipped if not present in your file.
                </AlertDescription>
              </Alert>

              {analysis.optionalFields.map(field => (
                <div key={field} className="space-y-2">
                  <Label className="flex items-center">
                    {field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    {getConfidenceBadge(field)}
                  </Label>
                  <Select 
                    value={mapping[field] || '__skip__'} 
                    onValueChange={(value) => {
                      if (value === '__skip__') {
                        const newMapping = { ...mapping };
                        delete newMapping[field];
                        setMapping(newMapping);
                      } else {
                        setMapping({ ...mapping, [field]: value });
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Skip this field" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__skip__">None (Skip)</SelectItem>
                      {analysis.headers.map((header, idx) => (
                        <SelectItem key={idx} value={header}>
                          {header}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          )}

          {/* Step 2: Preview */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Preview of first {analysis.sampleRows.length} rows with your mapping applied. 
                  Check that values are parsed correctly.
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="rounded-lg border p-3 bg-success/5">
                  <div className="font-semibold text-success">Valid Rows</div>
                  <div className="text-2xl font-bold">{validPreviewCount}</div>
                </div>
                <div className="rounded-lg border p-3 bg-warning/5">
                  <div className="font-semibold text-warning">Warnings</div>
                  <div className="text-2xl font-bold">{warningPreviewCount}</div>
                </div>
                <div className="rounded-lg border p-3 bg-muted">
                  <div className="font-semibold text-muted-foreground">Total Preview</div>
                  <div className="text-2xl font-bold">{previewRows.length}</div>
                </div>
              </div>

              <PreviewTable 
                headers={Object.keys(mapping).filter(k => mapping[k])} 
                rows={previewRows} 
              />

              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="save-mapping" 
                  checked={saveMapping} 
                  onCheckedChange={(checked) => setSaveMapping(checked as boolean)}
                />
                <Label htmlFor="save-mapping" className="text-sm cursor-pointer">
                  Remember this mapping for {locationName}
                </Label>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={handleBack}
            disabled={currentStep === 0}
          >
            Back
          </Button>
          {currentStep < steps.length - 1 ? (
            <Button 
              onClick={handleNext}
              disabled={currentStep === 0 && !allMapped}
            >
              Next <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleConfirm}>
              Process Import
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
