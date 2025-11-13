import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface RawResponseViewerProps {
  response: any;
  endpoint: string;
  dateRange?: { start: string; end: string };
}

export function RawResponseViewer({ response, endpoint, dateRange }: RawResponseViewerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  if (!response) return null;

  const downloadJson = () => {
    const dataStr = JSON.stringify(response, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `eitje-${endpoint}-${dateRange?.start || 'test'}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Extract field names from first record
  const sampleRecord = response.raw_response?.[0] || response.sample_records?.[0];
  const fieldNames = sampleRecord ? Object.keys(sampleRecord) : [];

  // Extract API config info
  const apiConfig = response.api_config || {};

  return (
    <Card className="mt-4 border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              Raw API Response
              <Badge variant="outline">{endpoint}</Badge>
            </CardTitle>
            <CardDescription>
              Complete API response structure for field mapping and validation
            </CardDescription>
          </div>
          <Button onClick={downloadJson} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Download JSON
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Response Metadata */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-sm text-muted-foreground">Total Records</div>
            <div className="text-2xl font-bold">{response.total_count || 0}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Fields Found</div>
            <div className="text-2xl font-bold">{fieldNames.length}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Max Days</div>
            <div className="text-2xl font-bold">{apiConfig.max_days_allowed || 'N/A'}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Method</div>
            <div className="text-2xl font-bold">{apiConfig.method || 'GET'}</div>
          </div>
        </div>

        {/* Field Discovery */}
        {fieldNames.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium">Discovered Fields</div>
            <div className="flex flex-wrap gap-2">
              {fieldNames.map(field => (
                <Badge key={field} variant="secondary" className="font-mono text-xs">
                  {field}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Sample Records (collapsible) */}
        {response.sample_records && response.sample_records.length > 0 && (
          <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between">
                <span>Sample Records ({response.sample_records.length})</span>
                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2">
              <div className="rounded-md bg-muted p-4 overflow-auto max-h-96">
                <pre className="text-xs font-mono">
                  {JSON.stringify(response.sample_records, null, 2)}
                </pre>
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Date Range Info */}
        {dateRange && (
          <div className="text-xs text-muted-foreground border-t pt-2">
            <strong>Date Range:</strong> {dateRange.start} → {dateRange.end}
          </div>
        )}

        {/* API Documentation Link */}
        <div className="border-t pt-2">
          <div className="text-xs text-muted-foreground">
            📖 <strong>Documentation:</strong> See{' '}
            <code className="bg-muted px-1 py-0.5 rounded">
              src/lib/finance/api-documentation/EITJE_API_DOCUMENTATION.md
            </code>{' '}
            for complete field mapping specifications
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
