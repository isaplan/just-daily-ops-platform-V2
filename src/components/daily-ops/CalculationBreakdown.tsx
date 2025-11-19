/**
 * Calculation Breakdown Component
 * Shows data source, formula, input values, and calculation steps for KPIs
 */

"use client";

import { useState } from "react";
import { Calculator, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface CalculationBreakdownProps {
  kpiName: string;
  kpiValue: string | number;
  dataSource: {
    collection: string;
    query: string;
    filters?: Record<string, unknown>;
  };
  formula: string;
  inputs: Array<{
    label: string;
    value: string | number;
    source?: string;
  }>;
  steps: Array<{
    step: number;
    description: string;
    calculation: string;
    result: string | number;
  }>;
}

export function CalculationBreakdown({
  kpiName,
  kpiValue,
  dataSource,
  formula,
  inputs,
  steps,
}: CalculationBreakdownProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 hover:bg-muted"
          title={`Show calculation breakdown for ${kpiName}`}
        >
          <Calculator className="h-4 w-4" />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2">
        <Card className="border-muted bg-muted/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              <span>Calculation Breakdown: {kpiName}</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => setIsOpen(false)}
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {/* Data Source */}
            <div>
              <h4 className="font-semibold mb-2 text-xs uppercase text-muted-foreground">
                Data Source
              </h4>
              <div className="space-y-1 pl-2">
                <div>
                  <span className="font-medium">Collection:</span>{" "}
                  <code className="text-xs bg-background px-1 py-0.5 rounded">
                    {dataSource.collection}
                  </code>
                </div>
                <div>
                  <span className="font-medium">Query:</span>{" "}
                  <code className="text-xs bg-background px-1 py-0.5 rounded break-all">
                    {dataSource.query}
                  </code>
                </div>
                {dataSource.filters && Object.keys(dataSource.filters).length > 0 && (
                  <div>
                    <span className="font-medium">Filters:</span>
                    <pre className="text-xs bg-background p-2 rounded mt-1 overflow-x-auto">
                      {JSON.stringify(dataSource.filters, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>

            {/* Formula */}
            <div>
              <h4 className="font-semibold mb-2 text-xs uppercase text-muted-foreground">
                Formula
              </h4>
              <code className="text-xs bg-background px-2 py-1 rounded block">
                {formula}
              </code>
            </div>

            {/* Input Values */}
            {inputs.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2 text-xs uppercase text-muted-foreground">
                  Input Values
                </h4>
                <div className="space-y-1 pl-2">
                  {inputs.map((input, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <span className="font-medium min-w-[100px]">
                        {input.label}:
                      </span>
                      <span className="font-mono text-xs">
                        {typeof input.value === "number"
                          ? input.value.toLocaleString("en-US", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })
                          : input.value}
                      </span>
                      {input.source && (
                        <span className="text-xs text-muted-foreground">
                          ({input.source})
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Calculation Steps */}
            {steps.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2 text-xs uppercase text-muted-foreground">
                  Calculation Steps
                </h4>
                <div className="space-y-2 pl-2">
                  {steps.map((step) => (
                    <div key={step.step} className="border-l-2 border-muted-foreground/30 pl-3">
                      <div className="font-medium text-xs">
                        Step {step.step}: {step.description}
                      </div>
                      <code className="text-xs bg-background px-1 py-0.5 rounded block mt-1">
                        {step.calculation}
                      </code>
                      <div className="text-xs text-muted-foreground mt-1">
                        Result:{" "}
                        <span className="font-mono font-medium">
                          {typeof step.result === "number"
                            ? step.result.toLocaleString("en-US", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })
                            : step.result}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Final Result */}
            <div className="pt-2 border-t">
              <div className="flex items-center justify-between">
                <span className="font-semibold">Final Result:</span>
                <span className="font-mono text-lg font-bold">
                  {typeof kpiValue === "number"
                    ? kpiValue.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })
                    : kpiValue}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </CollapsibleContent>
    </Collapsible>
  );
}

