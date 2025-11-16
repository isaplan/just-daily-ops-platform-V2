/**
 * ⚠️  MIGRATED TO ARCHIVE - DO NOT USE DIRECTLY
 * Migrated: 2025-11-13 01:18:49
 * Original: /Users/alviniomolina/Documents/GitHub/just-daily-ops-platform/src/app/(dashboard)/view-data
 */

"use client";

import { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Database } from "lucide-react";

export default function EitjeDataLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  
  const tabs = [
    { href: "/view-data/eitje-data", label: "Overview" },
    { href: "/view-data/eitje-data/hours", label: "Hours" },
    { href: "/view-data/eitje-data/finance", label: "Finance" },
    { href: "/view-data/eitje-data/workers", label: "Workers" },
    { href: "/view-data/eitje-data/locations-teams", label: "Locations & Teams" },
  ];

  const activeTab = tabs.find(tab => pathname === tab.href)?.href || tabs[0].href;

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-2">
        <Database className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Eitje Data</h1>
          <p className="text-muted-foreground text-sm">
            View and explore Eitje data: hours, finance, workers, and locations
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Navigation</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              {tabs.map((tab) => (
                <TabsTrigger key={tab.href} value={tab.href} asChild>
                  <Link href={tab.href}>{tab.label}</Link>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      {children}
    </div>
  );
}


