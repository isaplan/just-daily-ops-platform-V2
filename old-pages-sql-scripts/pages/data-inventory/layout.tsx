/**
 * ⚠️  MIGRATED TO ARCHIVE - DO NOT USE DIRECTLY
 * Migrated: 2025-11-13 01:18:49
 * Original: /Users/alviniomolina/Documents/GitHub/just-daily-ops-platform/src/app/(dashboard)/data/inventory
 */

"use client";

import { useMemo, memo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, ShoppingCart, Database } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const dataInventoryItems = [
  { title: "Stock", url: "/data/inventory/stock", icon: Package },
  { title: "Orders", url: "/data/inventory/orders", icon: ShoppingCart },
  { title: "Data View", url: "/data/inventory/data-view", icon: Database },
];

// Memoized navigation button to prevent re-renders
const NavButton = memo(({ item, isActive }: { item: typeof dataInventoryItems[0]; isActive: boolean }) => (
  <Link href={item.url}>
    <Button
      variant={isActive ? "default" : "outline"}
      className="flex items-center gap-2"
    >
      <item.icon className="h-4 w-4" />
      {item.title}
    </Button>
  </Link>
));
NavButton.displayName = "NavButton";

export default function DataInventoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Memoize active pathname check
  const activePathname = useMemo(() => pathname, [pathname]);

  return (
    <div className="w-full p-6 space-y-6">
      {/* Parent Navigation */}
      <Card>
        <CardHeader>
          <CardTitle>Inventory Data</CardTitle>
          <CardDescription>View and manage inventory stock, orders, and data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {dataInventoryItems.map((item) => (
              <NavButton
                key={item.url}
                item={item}
                isActive={activePathname === item.url}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Child Content */}
      {children}
    </div>
  );
}

