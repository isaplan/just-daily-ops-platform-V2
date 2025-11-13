"use client";

import { useMemo, memo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Wifi, Building2, Palette, Upload, Settings as SettingsIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const settingsItems = [
  { title: "Eitje API", url: "/settings/eitje-api", icon: Wifi },
  { title: "Bork API", url: "/settings/bork-api", icon: Wifi },
  { title: "Company", url: "/settings/company", icon: Building2 },
  { title: "Themes", url: "/settings/themes", icon: Palette },
  { title: "Data Import", url: "/settings/data-import", icon: Upload },
];

// Memoized navigation button to prevent re-renders
const NavButton = memo(({ item, isActive }: { item: typeof settingsItems[0]; isActive: boolean }) => (
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

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Memoize active pathname check (including sub-routes)
  const activePathname = useMemo(() => pathname, [pathname]);
  const isActive = useMemo(() => (url: string) => {
    return activePathname === url || activePathname.startsWith(`${url}/`);
  }, [activePathname]);

  return (
    <div className="w-full p-6 space-y-6">
      {/* Parent Navigation */}
      <Card>
        <CardHeader>
          <CardTitle>Settings</CardTitle>
          <CardDescription>Configure API connections, company settings, themes, and data imports</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {settingsItems.map((item) => (
              <NavButton
                key={item.url}
                item={item}
                isActive={isActive(item.url)}
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

