/**
 * ⚠️  MIGRATED TO ARCHIVE - DO NOT USE DIRECTLY
 * Migrated: 2025-11-13 01:18:49
 * Original: /Users/alviniomolina/Documents/GitHub/just-daily-ops-platform/src/app/(dashboard)/finance/daily-ops
 */

"use client";

import { useMemo, memo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LayoutDashboard, Target, TrendingUp, Activity, Sparkles } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const dashboardItems = [
  { title: "Dashboard", url: "/finance/daily-ops", icon: LayoutDashboard },
  { title: "Daily KPIs", url: "/finance/daily-ops/kpis", icon: Target },
  { title: "Trends", url: "/finance/daily-ops/trends", icon: TrendingUp },
  { title: "Productivity", url: "/finance/daily-ops/productivity", icon: Activity },
  { title: "We Never Knew This", url: "/finance/daily-ops/insights", icon: Sparkles },
];

// Memoized navigation button to prevent re-renders
const NavButton = memo(({ item, isActive }: { item: typeof dashboardItems[0]; isActive: boolean }) => (
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

export default function DailyOpsLayout({
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
          <CardTitle>Daily Operations</CardTitle>
          <CardDescription>Comprehensive daily operations management</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {dashboardItems.map((item) => (
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
