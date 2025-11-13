"use client";

import { useMemo, memo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Box, Truck, MapPin, UserCheck } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const operationsItems = [
  { title: "Products", url: "/operations/products", icon: Box },
  { title: "Suppliers", url: "/operations/suppliers", icon: Truck },
  { title: "Locations", url: "/operations/locations", icon: MapPin },
  { title: "Teams", url: "/operations/teams", icon: UserCheck },
];

// Memoized navigation button to prevent re-renders
const NavButton = memo(({ item, isActive }: { item: typeof operationsItems[0]; isActive: boolean }) => (
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

export default function OperationsLayout({
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
          <CardTitle>Operations</CardTitle>
          <CardDescription>Manage products, suppliers, locations, and teams</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {operationsItems.map((item) => (
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

