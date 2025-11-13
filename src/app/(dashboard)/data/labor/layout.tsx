"use client";

import { useMemo, memo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, DollarSign, Users, Building2, Calendar } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const dataLaborItems = [
  { title: "Hours", url: "/data/labor/hours", icon: Clock },
  { title: "Labor Costs", url: "/data/labor/costs", icon: DollarSign },
  { title: "Workers", url: "/data/labor/workers", icon: Users },
  { title: "Locations & Teams", url: "/data/labor/locations-teams", icon: Building2 },
  { title: "Planning", url: "/data/labor/planning", icon: Calendar },
];

// Memoized navigation button to prevent re-renders
const NavButton = memo(({ item, isActive }: { item: typeof dataLaborItems[0]; isActive: boolean }) => (
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

export default function DataLaborLayout({
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
          <CardTitle>Labor Data</CardTitle>
          <CardDescription>View and manage labor hours, costs, workers, and planning</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {dataLaborItems.map((item) => (
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

