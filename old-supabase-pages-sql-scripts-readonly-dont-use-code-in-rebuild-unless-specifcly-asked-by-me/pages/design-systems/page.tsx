/**
 * ⚠️  MIGRATED TO ARCHIVE - DO NOT USE DIRECTLY
 * Migrated: 2025-11-13 01:18:49
 * Original: /Users/alviniomolina/Documents/GitHub/just-daily-ops-platform/src/app/(dashboard)/design-systems
 */

"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Database, ChevronRight, LayoutDashboard } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Code } from "lucide-react";

export default function DesignSystemsPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Design Systems</h1>
        <p className="text-muted-foreground mt-2">
          Component library, design tokens, and UI guidelines
        </p>
      </div>

      <Tabs defaultValue="patterns" className="w-full">
        <TabsList>
          <TabsTrigger value="patterns">Layout Patterns</TabsTrigger>
          <TabsTrigger value="components">Components</TabsTrigger>
          <TabsTrigger value="tokens">Design Tokens</TabsTrigger>
          <TabsTrigger value="themes">Themes</TabsTrigger>
        </TabsList>

        <TabsContent value="patterns" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Page Layout Patterns</CardTitle>
              <CardDescription>
                Different layout structures used across the application
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* View Data Layout Pattern */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">View Data Layout Pattern</h3>
                  <Badge variant="outline">Layout Wrapper</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Used in view data pages (e.g., <code className="text-xs bg-muted px-1 py-0.5 rounded">/finance/data/eitje-data/*</code>).
                  Features breadcrumb-style navigation with icon and subtitle.
                </p>
                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <div className="text-xs font-mono space-y-1">
                    <div className="text-green-600">// Layout wrapper</div>
                    <div>{`<div className="container mx-auto py-6 space-y-6">`}</div>
                    <div className="pl-4">
                      <div className="text-green-600">// Breadcrumb header</div>
                      <div>{`<div className="flex items-center gap-2">`}</div>
                      <div className="pl-4">
                        <div>{`<Database className="h-5 w-5 text-primary" />`}</div>
                        <div>{`<div className="flex items-center gap-2">`}</div>
                        <div className="pl-4">
                          <div>{`<span className="text-xl font-semibold">Eitje Data</span>`}</div>
                          <div>{`<ChevronRight className="h-4 w-4" />`}</div>
                          <div>{`<span className="text-xl font-semibold">Hours</span>`}</div>
                        </div>
                        <div>{`</div>`}</div>
                      </div>
                      <div>{`</div>`}</div>
                      <div>{`<p className="text-muted-foreground text-sm">Subtitle text</p>`}</div>
                      <div className="text-green-600">// Children render directly</div>
                      <div>{`{children}`}</div>
                    </div>
                    <div>{`</div>`}</div>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p><strong>Key characteristics:</strong></p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Uses <code className="bg-muted px-1 rounded">py-6</code> (vertical padding only)</li>
                    <li>Breadcrumb navigation with icon + text + chevron</li>
                    <li>Subtitle text below header</li>
                    <li>Children render directly without additional wrapper</li>
                  </ul>
                </div>
              </div>

              {/* Standard Page Layout Pattern */}
              <div className="space-y-3 border-t pt-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Standard Page Layout</h3>
                  <Badge variant="outline">Standard</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Used in most pages (roadmap, docs, design-systems). Features standard header with title and subtitle.
                </p>
                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <div className="text-xs font-mono space-y-1">
                    <div>{`<div className="container mx-auto p-6 space-y-6">`}</div>
                    <div className="pl-4">
                      <div>{`<div>`}</div>
                      <div className="pl-4">
                        <div>{`<h1 className="text-3xl font-bold tracking-tight">Page Title</h1>`}</div>
                        <div>{`<p className="text-muted-foreground mt-2">Subtitle description</p>`}</div>
                      </div>
                      <div>{`</div>`}</div>
                      <div className="text-green-600">// Page content</div>
                    </div>
                    <div>{`</div>`}</div>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p><strong>Key characteristics:</strong></p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Uses <code className="bg-muted px-1 rounded">p-6</code> (full padding)</li>
                    <li>Standard h1 with tracking-tight</li>
                    <li>Subtitle with muted-foreground and mt-2</li>
                    <li>Content wrapped in container</li>
                  </ul>
                </div>
              </div>

              {/* Sticky Header Pattern */}
              <div className="space-y-3 border-t pt-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Sticky Header Pattern</h3>
                  <Badge variant="outline">Enhanced</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Used in Sales and P&L pages. Header stays visible on scroll with action buttons.
                </p>
                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <div className="text-xs font-mono space-y-1">
                    <div>{`<div className="container mx-auto p-6 space-y-6">`}</div>
                    <div className="pl-4">
                      <div className="text-green-600">// Sticky header</div>
                      <div>{`<div className="sticky top-0 z-40 bg-background pb-4 border-b -mx-6 px-6 -mt-6 pt-6">`}</div>
                      <div className="pl-4">
                        <div>{`<div className="flex justify-between items-center">`}</div>
                        <div className="pl-4">
                          <div>{`<h1 className="text-3xl font-bold">Title</h1>`}</div>
                          <div>{`<p className="text-muted-foreground">Subtitle</p>`}</div>
                          <div className="text-green-600">// Action buttons on right</div>
                        </div>
                        <div>{`</div>`}</div>
                      </div>
                      <div>{`</div>`}</div>
                    </div>
                    <div>{`</div>`}</div>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p><strong>Key characteristics:</strong></p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Negative margins (<code className="bg-muted px-1 rounded">-mx-6 -mt-6</code>) to extend to edges</li>
                    <li>Border bottom for visual separation</li>
                    <li>Background color to prevent content showing through</li>
                    <li>Top offset: <code className="bg-muted px-1 rounded">top-0</code> or <code className="bg-muted px-1 rounded">top-16</code></li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Layout Comparison</CardTitle>
              <CardDescription>
                Differences between view data and standard page layouts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Feature</th>
                      <th className="text-left p-2">View Data Layout</th>
                      <th className="text-left p-2">Standard Layout</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="p-2 font-medium">Container</td>
                      <td className="p-2"><code className="text-xs">py-6</code> (vertical only)</td>
                      <td className="p-2"><code className="text-xs">p-6</code> (all sides)</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-2 font-medium">Header Style</td>
                      <td className="p-2">Breadcrumb with icon + chevron</td>
                      <td className="p-2">Standard h1 + subtitle</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-2 font-medium">Title Size</td>
                      <td className="p-2"><code className="text-xs">text-xl font-semibold</code></td>
                      <td className="p-2"><code className="text-xs">text-3xl font-bold tracking-tight</code></td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-2 font-medium">Subtitle</td>
                      <td className="p-2">Below breadcrumb, <code className="text-xs">text-sm</code></td>
                      <td className="p-2">Below title, <code className="text-xs">mt-2</code></td>
                    </tr>
                    <tr>
                      <td className="p-2 font-medium">Usage</td>
                      <td className="p-2">Layout wrapper for nested routes</td>
                      <td className="p-2">Direct page implementation</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="components" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>UI Components</CardTitle>
              <CardDescription>
                Reusable components built with shadcn/ui and Tailwind CSS
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Available Components</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 text-sm">
                    {[
                      "Button", "Card", "Badge", "Input", "Textarea", "Select", 
                      "Tabs", "Dialog", "Sheet", "Popover", "Dropdown", "Table",
                      "Form", "Checkbox", "Radio", "Switch", "Slider", "Progress",
                      "Toast", "Tooltip", "Avatar", "Skeleton", "ScrollArea", "Separator"
                    ].map((component) => (
                      <div key={component} className="bg-muted px-2 py-1 rounded text-xs">
                        {component}
                      </div>
                    ))}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  All components are located in <code className="bg-muted px-1 rounded">src/components/ui/</code>
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tokens" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Design Tokens</CardTitle>
              <CardDescription>
                Colors, typography, spacing, and other design tokens
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Spacing</h3>
                  <div className="space-y-2 text-sm">
                    <div>Container: <code className="bg-muted px-1 rounded">container mx-auto</code></div>
                    <div>Padding (standard): <code className="bg-muted px-1 rounded">p-6</code></div>
                    <div>Padding (view data): <code className="bg-muted px-1 rounded">py-6</code></div>
                    <div>Spacing between sections: <code className="bg-muted px-1 rounded">space-y-6</code></div>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Typography</h3>
                  <div className="space-y-2 text-sm">
                    <div>Page title: <code className="bg-muted px-1 rounded">text-3xl font-bold tracking-tight</code></div>
                    <div>Section title: <code className="bg-muted px-1 rounded">text-xl font-semibold</code></div>
                    <div>Subtitle: <code className="bg-muted px-1 rounded">text-muted-foreground</code></div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="themes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tailwind Themes</CardTitle>
              <CardDescription>
                Available color themes defined in <code className="text-xs bg-muted px-1 rounded">globals.css</code>. Themes use CSS custom properties (HSL format) for dynamic theming.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* ============================================
                  1. MY THEMES
                  ============================================ */}
              
              {/* My Theme 1 */}
              <div className="space-y-3 border-b pb-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">My Theme 1</h3>
                  <Badge variant="outline">.theme-my-theme-1</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Professional, data-focused theme inspired by view data pages. Clean blues and grays for analytics and data visualization.
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <div className="h-16 rounded flex items-center justify-center text-xs font-mono border-2" style={{ backgroundColor: 'hsl(220 20% 98%)', color: 'hsl(220 25% 15%)', borderColor: 'hsl(220 15% 85%)' }}>Background</div>
                    <div className="text-xs text-muted-foreground">HSL(220 20% 98%)</div>
                  </div>
                  <div className="space-y-1">
                    <div className="h-16 rounded flex items-center justify-center text-xs font-mono text-white border-2" style={{ backgroundColor: 'hsl(215 80% 55%)', borderColor: 'hsl(220 15% 85%)' }}>Primary</div>
                    <div className="text-xs text-muted-foreground">HSL(215 80% 55%)</div>
                  </div>
                  <div className="space-y-1">
                    <div className="h-16 rounded flex items-center justify-center text-xs font-mono text-white border-2" style={{ backgroundColor: 'hsl(200 70% 50%)', borderColor: 'hsl(220 15% 85%)' }}>Accent</div>
                    <div className="text-xs text-muted-foreground">HSL(200 70% 50%)</div>
                  </div>
                  <div className="space-y-1">
                    <div className="h-16 rounded flex items-center justify-center text-xs font-mono text-white border-2" style={{ backgroundColor: 'hsl(142 60% 45%)', borderColor: 'hsl(220 15% 85%)' }}>Success</div>
                    <div className="text-xs text-muted-foreground">HSL(142 60% 45%)</div>
                  </div>
                </div>
                <div className="bg-muted p-3 rounded text-xs font-mono">
                  <div className="text-green-600">// Apply theme:</div>
                  <div>{`<body className="theme-my-theme-1">`}</div>
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p><strong>Key characteristics:</strong></p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Cool, professional blue-gray background (220° hue)</li>
                    <li>Data-focused primary blue (215° hue, 80% saturation)</li>
                    <li>Teal-blue accent for highlights (200° hue)</li>
                    <li>Soft borders for clean separation</li>
                    <li>Moderate border radius (0.375rem) for modern feel</li>
                    <li>Optimized chart color palette for data visualization</li>
                    <li>Inspired by view data pages aesthetic</li>
                  </ul>
                </div>
              </div>

              {/* My Theme 2 */}
              <div className="space-y-3 border-b pb-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">My Theme 2</h3>
                  <Badge variant="outline">.theme-my-theme-2</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Vibrant color palette combined with clean structure. Features vibrant red, yellow, and blue with soft borders and moderate radius for a modern, energetic data-focused aesthetic.
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <div className="h-16 rounded flex items-center justify-center text-xs font-mono border-2" style={{ backgroundColor: 'hsl(0 0% 98%)', color: 'hsl(0 0% 10%)', borderColor: 'hsl(0 0% 85%)' }}>Background</div>
                    <div className="text-xs text-muted-foreground">HSL(0 0% 98%)</div>
                  </div>
                  <div className="space-y-1">
                    <div className="h-16 rounded flex items-center justify-center text-xs font-mono text-white border-2" style={{ backgroundColor: 'hsl(0 100% 60%)', borderColor: 'hsl(0 0% 85%)' }}>Primary</div>
                    <div className="text-xs text-muted-foreground">HSL(0 100% 60%)</div>
                  </div>
                  <div className="space-y-1">
                    <div className="h-16 rounded flex items-center justify-center text-xs font-mono border-2" style={{ backgroundColor: 'hsl(60 100% 50%)', color: 'hsl(0 0% 10%)', borderColor: 'hsl(0 0% 85%)' }}>Secondary</div>
                    <div className="text-xs text-muted-foreground">HSL(60 100% 50%)</div>
                  </div>
                  <div className="space-y-1">
                    <div className="h-16 rounded flex items-center justify-center text-xs font-mono text-white border-2" style={{ backgroundColor: 'hsl(216 100% 50%)', borderColor: 'hsl(0 0% 85%)' }}>Accent</div>
                    <div className="text-xs text-muted-foreground">HSL(216 100% 50%)</div>
                  </div>
                </div>
                <div className="bg-muted p-3 rounded text-xs font-mono">
                  <div className="text-green-600">// Apply theme:</div>
                  <div>{`<body className="theme-my-theme-2">`}</div>
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p><strong>Key characteristics:</strong></p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Vibrant red primary (0° hue, 100% saturation) for energy</li>
                    <li>Bright yellow secondary (60° hue, 100% saturation)</li>
                    <li>Bold blue accent (216° hue, 100% saturation) for contrast</li>
                    <li>Soft borders (85% lightness) for clean separation</li>
                    <li>Moderate border radius (0.375rem) for modern feel</li>
                    <li>Optimized vibrant chart color palette for data visualization</li>
                    <li>Combines vibrant energy with professional structure</li>
                    <li>Inspired by view data pages aesthetic with added vibrancy</li>
                  </ul>
                </div>
              </div>

              {/* My Theme 3 */}
              <div className="space-y-3 border-b pb-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">My Theme 3</h3>
                  <Badge variant="outline">.theme-my-theme-3</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Merges My Theme 2's vibrant colors with Lovable Terminal's clean backgrounds. Perfect blend of energetic vibrancy and clean aesthetics.
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <div className="h-16 rounded flex items-center justify-center text-xs font-mono border-2" style={{ backgroundColor: 'hsl(0 0% 98%)', color: 'hsl(0 0% 5%)', borderColor: 'hsl(0 0% 85%)' }}>Background</div>
                    <div className="text-xs text-muted-foreground">HSL(0 0% 98%) - Lovable</div>
                  </div>
                  <div className="space-y-1">
                    <div className="h-16 rounded flex items-center justify-center text-xs font-mono text-white border-2" style={{ backgroundColor: 'hsl(0 100% 60%)', borderColor: 'hsl(0 0% 85%)' }}>Primary</div>
                    <div className="text-xs text-muted-foreground">HSL(0 100% 60%) - My Theme 2</div>
                  </div>
                  <div className="space-y-1">
                    <div className="h-16 rounded flex items-center justify-center text-xs font-mono border-2" style={{ backgroundColor: 'hsl(60 100% 50%)', color: 'hsl(0 0% 5%)', borderColor: 'hsl(0 0% 85%)' }}>Secondary</div>
                    <div className="text-xs text-muted-foreground">HSL(60 100% 50%) - My Theme 2</div>
                  </div>
                  <div className="space-y-1">
                    <div className="h-16 rounded flex items-center justify-center text-xs font-mono text-white border-2" style={{ backgroundColor: 'hsl(216 100% 50%)', borderColor: 'hsl(0 0% 85%)' }}>Accent</div>
                    <div className="text-xs text-muted-foreground">HSL(216 100% 50%) - My Theme 2</div>
                  </div>
                </div>
                <div className="bg-muted p-3 rounded text-xs font-mono">
                  <div className="text-green-600">// Apply theme:</div>
                  <div>{`<body className="theme-my-theme-3">`}</div>
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p><strong>Key characteristics:</strong></p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Clean Lovable Terminal backgrounds (98% lightness, neutral grays)</li>
                    <li>Vibrant red primary (0° hue, 100% saturation) for energy</li>
                    <li>Bright yellow secondary (60° hue, 100% saturation)</li>
                    <li>Bold blue accent (216° hue, 100% saturation) for contrast</li>
                    <li>Soft borders (85% lightness) for clean separation</li>
                    <li>Moderate border radius (0.375rem) for modern feel</li>
                    <li>Optimized vibrant chart color palette for data visualization</li>
                    <li>Combines vibrant energy with clean Lovable structure</li>
                    <li>Inspired by view data pages aesthetic with added vibrancy</li>
                  </ul>
                </div>
              </div>

              {/* ============================================
                  2. LOVABLE THEMES
                  ============================================ */}

              {/* Terminal Theme (Lovable) */}
              <div className="space-y-3 border-t pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold">Terminal Theme</h3>
                    <Badge variant="outline" className="text-xs">Lovable</Badge>
                  </div>
                  <Badge variant="outline">.theme-terminal</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Console-inspired theme with terminal green accents and sharp corners. From Lovable projects.
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <div className="h-16 bg-background border-2 border-black rounded-none flex items-center justify-center text-xs font-mono">Background</div>
                    <div className="text-xs text-muted-foreground">HSL(0 0% 98%)</div>
                  </div>
                  <div className="space-y-1">
                    <div className="h-16 rounded-none flex items-center justify-center text-xs font-mono text-white border-2 border-black" style={{ backgroundColor: 'hsl(120 100% 30%)' }}>Accent</div>
                    <div className="text-xs text-muted-foreground">HSL(120 100% 30%)</div>
                  </div>
                  <div className="space-y-1">
                    <div className="h-16 rounded-none flex items-center justify-center text-xs font-mono text-white border-2 border-black" style={{ backgroundColor: 'hsl(120 100% 30%)' }}>Success</div>
                    <div className="text-xs text-muted-foreground">HSL(120 100% 30%)</div>
                  </div>
                  <div className="space-y-1">
                    <div className="h-16 rounded-none flex items-center justify-center text-xs font-mono text-white border-2 border-black" style={{ backgroundColor: 'hsl(0 100% 40%)' }}>Destructive</div>
                    <div className="text-xs text-muted-foreground">HSL(0 100% 40%)</div>
                  </div>
                </div>
                <div className="bg-muted p-3 rounded text-xs font-mono">
                  <div className="text-green-600">// Apply theme:</div>
                  <div>{`<body className="theme-terminal">`}</div>
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p><strong>Key characteristics:</strong></p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>High contrast black borders (0% lightness)</li>
                    <li>Terminal green accent (120° hue, saturated)</li>
                    <li>No border radius (0rem) for sharp corners</li>
                    <li>Minimalist, monospace-friendly aesthetic</li>
                    <li>Green used for both accent and success states</li>
                  </ul>
                </div>
              </div>

              {/* ============================================
                  3. OTHER THEMES
                  ============================================ */}

              {/* Default Theme */}
              <div className="space-y-3 border-t pt-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Default Theme</h3>
                  <Badge variant="outline">.theme-default</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Light, clean theme with blue accents. Default theme for the application.
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <div className="h-16 bg-background border-2 border-foreground rounded flex items-center justify-center text-xs font-mono">Background</div>
                    <div className="text-xs text-muted-foreground">HSL(30 11% 98%)</div>
                  </div>
                  <div className="space-y-1">
                    <div className="h-16 bg-primary border-2 border-foreground rounded flex items-center justify-center text-xs font-mono text-primary-foreground">Primary</div>
                    <div className="text-xs text-muted-foreground">HSL(0 0% 0%)</div>
                  </div>
                  <div className="space-y-1">
                    <div className="h-16 bg-accent border-2 border-foreground rounded flex items-center justify-center text-xs font-mono text-accent-foreground">Accent</div>
                    <div className="text-xs text-muted-foreground">HSL(215 50% 50%)</div>
                  </div>
                  <div className="space-y-1">
                    <div className="h-16 bg-success border-2 border-foreground rounded flex items-center justify-center text-xs font-mono text-success-foreground">Success</div>
                    <div className="text-xs text-muted-foreground">HSL(142 76% 36%)</div>
                  </div>
                </div>
                <div className="bg-muted p-3 rounded text-xs font-mono">
                  <div className="text-green-600">// Apply theme:</div>
                  <div>{`<body className="theme-default">`}</div>
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p><strong>Key characteristics:</strong></p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Light background (98% lightness)</li>
                    <li>Black primary text (0% lightness)</li>
                    <li>Blue accent for active states (HSL 215°)</li>
                    <li>Green success color (HSL 142°)</li>
                    <li>Border radius: 0.25rem</li>
                  </ul>
                </div>
              </div>

              {/* Black Theme */}
              <div className="space-y-3 border-b pb-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Black Theme</h3>
                  <Badge variant="outline">.theme-black</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Dark theme with blue primary accents. Ideal for dark mode preferences.
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <div className="h-16 rounded flex items-center justify-center text-xs font-mono" style={{ backgroundColor: 'hsl(222 47% 11%)', color: 'hsl(210 40% 98%)', border: '2px solid hsl(217 33% 17%)' }}>Background</div>
                    <div className="text-xs text-muted-foreground">HSL(222 47% 11%)</div>
                  </div>
                  <div className="space-y-1">
                    <div className="h-16 rounded flex items-center justify-center text-xs font-mono text-white" style={{ backgroundColor: 'hsl(217 91% 60%)', border: '2px solid hsl(217 33% 17%)' }}>Primary</div>
                    <div className="text-xs text-muted-foreground">HSL(217 91% 60%)</div>
                  </div>
                  <div className="space-y-1">
                    <div className="h-16 rounded flex items-center justify-center text-xs font-mono text-white" style={{ backgroundColor: 'hsl(142 76% 36%)', border: '2px solid hsl(217 33% 17%)' }}>Accent</div>
                    <div className="text-xs text-muted-foreground">HSL(142 76% 36%)</div>
                  </div>
                  <div className="space-y-1">
                    <div className="h-16 rounded flex items-center justify-center text-xs font-mono text-white" style={{ backgroundColor: 'hsl(0 63% 31%)', border: '2px solid hsl(217 33% 17%)' }}>Destructive</div>
                    <div className="text-xs text-muted-foreground">HSL(0 63% 31%)</div>
                  </div>
                </div>
                <div className="bg-muted p-3 rounded text-xs font-mono">
                  <div className="text-green-600">// Apply theme:</div>
                  <div>{`<body className="theme-black">`}</div>
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p><strong>Key characteristics:</strong></p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Very dark background (11% lightness, blue-tinted)</li>
                    <li>Bright blue primary (217° hue, 60% lightness)</li>
                    <li>Dark cards (17% lightness)</li>
                    <li>High contrast for readability</li>
                    <li>Border radius: 0.25rem</li>
                  </ul>
                </div>
              </div>

              {/* Terminal Theme */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Terminal Theme</h3>
                  <Badge variant="outline">.theme-terminal</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Console-inspired theme with terminal green accents and sharp corners.
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <div className="h-16 bg-background border-2 border-black rounded-none flex items-center justify-center text-xs font-mono">Background</div>
                    <div className="text-xs text-muted-foreground">HSL(0 0% 98%)</div>
                  </div>
                  <div className="space-y-1">
                    <div className="h-16 rounded-none flex items-center justify-center text-xs font-mono text-white border-2 border-black" style={{ backgroundColor: 'hsl(120 100% 30%)' }}>Accent</div>
                    <div className="text-xs text-muted-foreground">HSL(120 100% 30%)</div>
                  </div>
                  <div className="space-y-1">
                    <div className="h-16 rounded-none flex items-center justify-center text-xs font-mono text-white border-2 border-black" style={{ backgroundColor: 'hsl(120 100% 30%)' }}>Success</div>
                    <div className="text-xs text-muted-foreground">HSL(120 100% 30%)</div>
                  </div>
                  <div className="space-y-1">
                    <div className="h-16 rounded-none flex items-center justify-center text-xs font-mono text-white border-2 border-black" style={{ backgroundColor: 'hsl(0 100% 40%)' }}>Destructive</div>
                    <div className="text-xs text-muted-foreground">HSL(0 100% 40%)</div>
                  </div>
                </div>
                <div className="bg-muted p-3 rounded text-xs font-mono">
                  <div className="text-green-600">// Apply theme:</div>
                  <div>{`<body className="theme-terminal">`}</div>
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p><strong>Key characteristics:</strong></p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>High contrast black borders (0% lightness)</li>
                    <li>Terminal green accent (120° hue, saturated)</li>
                    <li>No border radius (0rem) for sharp corners</li>
                    <li>Minimalist, monospace-friendly aesthetic</li>
                    <li>Green used for both accent and success states</li>
                  </ul>
                </div>
              </div>

              {/* Vibrant Theme */}
              <div className="space-y-3 border-t pt-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Vibrant Theme</h3>
                  <Badge variant="outline">.theme-vibrant</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  High-contrast theme with vibrant red, yellow, and blue colors. Sharp corners, bold borders.
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <div className="h-16 bg-background border-2 border-black rounded-none flex items-center justify-center text-xs font-mono">Background</div>
                    <div className="text-xs text-muted-foreground">HSL(0 0% 100%)</div>
                  </div>
                  <div className="space-y-1">
                    <div className="h-16 rounded-none flex items-center justify-center text-xs font-mono text-white border-2 border-black" style={{ backgroundColor: 'hsl(0 100% 60%)' }}>Primary</div>
                    <div className="text-xs text-muted-foreground">HSL(0 100% 60%)</div>
                  </div>
                  <div className="space-y-1">
                    <div className="h-16 rounded-none flex items-center justify-center text-xs font-mono border-2 border-black" style={{ backgroundColor: 'hsl(60 100% 50%)', color: 'hsl(0 0% 0%)' }}>Secondary</div>
                    <div className="text-xs text-muted-foreground">HSL(60 100% 50%)</div>
                  </div>
                  <div className="space-y-1">
                    <div className="h-16 rounded-none flex items-center justify-center text-xs font-mono text-white border-2 border-black" style={{ backgroundColor: 'hsl(216 100% 50%)' }}>Accent</div>
                    <div className="text-xs text-muted-foreground">HSL(216 100% 50%)</div>
                  </div>
                </div>
                <div className="bg-muted p-3 rounded text-xs font-mono">
                  <div className="text-green-600">// Apply theme:</div>
                  <div>{`<body className="theme-vibrant">`}</div>
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p><strong>Key characteristics:</strong></p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Pure white background with black text</li>
                    <li>Vibrant red primary (0° hue, 100% saturation)</li>
                    <li>Bright yellow secondary (60° hue, 100% saturation)</li>
                    <li>Bold blue accent (216° hue, 100% saturation)</li>
                    <li>No border radius (0px) for sharp corners</li>
                    <li>High contrast black borders everywhere</li>
                    <li>Includes chart color variables (chart-1 through chart-5)</li>
                  </ul>
                </div>
              </div>

              {/* Vibrant Dark Theme */}
              <div className="space-y-3 border-t pt-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Vibrant Dark Theme</h3>
                  <Badge variant="outline">.theme-vibrant-dark</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Dark variant of the vibrant theme with brighter, more saturated colors on dark background.
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <div className="h-16 rounded-none flex items-center justify-center text-xs font-mono text-white border-2 border-white" style={{ backgroundColor: 'hsl(0 0% 0%)' }}>Background</div>
                    <div className="text-xs text-muted-foreground">HSL(0 0% 0%)</div>
                  </div>
                  <div className="space-y-1">
                    <div className="h-16 rounded-none flex items-center justify-center text-xs font-mono border-2 border-white" style={{ backgroundColor: 'hsl(0 100% 70%)', color: 'hsl(0 0% 0%)' }}>Primary</div>
                    <div className="text-xs text-muted-foreground">HSL(0 100% 70%)</div>
                  </div>
                  <div className="space-y-1">
                    <div className="h-16 rounded-none flex items-center justify-center text-xs font-mono border-2 border-white" style={{ backgroundColor: 'hsl(60 100% 60%)', color: 'hsl(0 0% 0%)' }}>Secondary</div>
                    <div className="text-xs text-muted-foreground">HSL(60 100% 60%)</div>
                  </div>
                  <div className="space-y-1">
                    <div className="h-16 rounded-none flex items-center justify-center text-xs font-mono border-2 border-white" style={{ backgroundColor: 'hsl(210 100% 60%)', color: 'hsl(0 0% 0%)' }}>Accent</div>
                    <div className="text-xs text-muted-foreground">HSL(210 100% 60%)</div>
                  </div>
                </div>
                <div className="bg-muted p-3 rounded text-xs font-mono">
                  <div className="text-green-600">// Apply theme:</div>
                  <div>{`<body className="theme-vibrant-dark">`}</div>
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p><strong>Key characteristics:</strong></p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Pure black background (0% lightness)</li>
                    <li>Brighter red primary (70% lightness) for visibility</li>
                    <li>Bright yellow secondary (60% lightness)</li>
                    <li>Cyan-blue accent (210° hue instead of 216°)</li>
                    <li>White borders for high contrast</li>
                    <li>Dark cards (20% lightness) for depth</li>
                    <li>Includes chart color variables with adjusted saturation</li>
                  </ul>
                </div>
              </div>

            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Theme Color Tokens</CardTitle>
              <CardDescription>
                All themes support the same set of color tokens defined via CSS custom properties
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Token</th>
                      <th className="text-left p-2">Usage</th>
                      <th className="text-left p-2">Tailwind Class</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="p-2 font-mono text-xs">--background</td>
                      <td className="p-2">Main page background</td>
                      <td className="p-2"><code className="text-xs">bg-background</code></td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-2 font-mono text-xs">--foreground</td>
                      <td className="p-2">Default text color</td>
                      <td className="p-2"><code className="text-xs">text-foreground</code></td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-2 font-mono text-xs">--primary</td>
                      <td className="p-2">Primary actions, links</td>
                      <td className="p-2"><code className="text-xs">bg-primary text-primary-foreground</code></td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-2 font-mono text-xs">--secondary</td>
                      <td className="p-2">Secondary actions, subtle backgrounds</td>
                      <td className="p-2"><code className="text-xs">bg-secondary text-secondary-foreground</code></td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-2 font-mono text-xs">--accent</td>
                      <td className="p-2">Highlighted states, hover</td>
                      <td className="p-2"><code className="text-xs">bg-accent text-accent-foreground</code></td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-2 font-mono text-xs">--muted</td>
                      <td className="p-2">Subtle backgrounds, disabled states</td>
                      <td className="p-2"><code className="text-xs">bg-muted text-muted-foreground</code></td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-2 font-mono text-xs">--card</td>
                      <td className="p-2">Card backgrounds</td>
                      <td className="p-2"><code className="text-xs">bg-card text-card-foreground</code></td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-2 font-mono text-xs">--success</td>
                      <td className="p-2">Success messages, confirmations</td>
                      <td className="p-2"><code className="text-xs">bg-success text-success-foreground</code></td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-2 font-mono text-xs">--warning</td>
                      <td className="p-2">Warning messages, cautions</td>
                      <td className="p-2"><code className="text-xs">bg-warning text-warning-foreground</code></td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-2 font-mono text-xs">--destructive</td>
                      <td className="p-2">Delete actions, errors</td>
                      <td className="p-2"><code className="text-xs">bg-destructive text-destructive-foreground</code></td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-2 font-mono text-xs">--border</td>
                      <td className="p-2">Borders, dividers</td>
                      <td className="p-2"><code className="text-xs">border-border</code></td>
                    </tr>
                    <tr>
                      <td className="p-2 font-mono text-xs">--sidebar-*</td>
                      <td className="p-2">Sidebar-specific colors</td>
                      <td className="p-2"><code className="text-xs">bg-sidebar text-sidebar-foreground</code></td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="mt-4 p-3 bg-muted rounded text-xs space-y-1">
                <div className="font-semibold">Note:</div>
                <div>All color values are defined in HSL format. Colors are applied via Tailwind's theme system using <code className="bg-background px-1 rounded">hsl(var(--token-name))</code>.</div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
