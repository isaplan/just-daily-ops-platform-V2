"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  DollarSign,
  Package,
  Sparkles,
  FileText,
  Box,
  Truck,
  MapPin,
  UserCheck,
  BarChart3,
  TrendingUp,
  Clock,
  Upload,
  Palette,
  Building2,
  Settings,
  Calendar,
  ChevronRight,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  useSidebar,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

// Type definitions for menu items
type MenuItem = {
  title: string;
  url: string;
  icon: LucideIcon;
  isCollapsible?: boolean;
  children?: MenuItem[];
};

// Daily Ops items
const dailyOpsItems: MenuItem[] = [
  { title: "Labor", url: "/daily-ops/labor", icon: Users },
  { title: "Finance", url: "/daily-ops/finance", icon: DollarSign },
  { title: "Inventory", url: "/daily-ops/inventory", icon: Package },
  { title: "AI & Analytics", url: "/daily-ops/ai", icon: Sparkles },
  { title: "Reports", url: "/daily-ops/reports", icon: FileText },
];

// Operations items
const operationsItems: MenuItem[] = [
  { title: "Products", url: "/operations/products", icon: Box },
  { title: "Suppliers", url: "/operations/suppliers", icon: Truck },
  { title: "Locations", url: "/operations/locations", icon: MapPin },
  { title: "Teams", url: "/operations/teams", icon: UserCheck },
];

// Data section items (with collapsible sub-items)
const dataFinanceItems: MenuItem[] = [
  { title: "Profit & Loss", url: "/data/finance/profit-and-loss", icon: BarChart3 },
  { title: "PNL Balance", url: "/data/finance/pnl-balance", icon: BarChart3 },
];

const dataLaborItems: MenuItem[] = [
  { title: "Hours", url: "/data/labor/hours", icon: Clock },
  { title: "Labor Costs", url: "/data/labor/costs", icon: DollarSign },
  { title: "Workers", url: "/data/labor/workers", icon: Users },
  { title: "Locations & Teams", url: "/data/labor/locations-teams", icon: Building2 },
];

const dataSalesItems: MenuItem[] = [
  { title: "Bork Sales Data", url: "/data/sales/bork", icon: TrendingUp },
];

const dataItems: MenuItem[] = [
  {
    title: "Finance",
    url: "/data/finance",
    icon: DollarSign,
    isCollapsible: true,
    children: dataFinanceItems,
  },
  {
    title: "Labor",
    url: "/data/labor",
    icon: Users,
    isCollapsible: true,
    children: dataLaborItems,
  },
  {
    title: "Sales",
    url: "/data/sales",
    icon: TrendingUp,
    isCollapsible: true,
    children: dataSalesItems,
  },
  { title: "Reservations", url: "/data/reservations", icon: Calendar },
  { title: "Inventory", url: "/data/inventory", icon: Package },
];

// Settings items
const settingsItems: MenuItem[] = [
  { title: "Themes", url: "/settings/themes", icon: Palette },
  { title: "Company Settings", url: "/settings/company", icon: Settings },
  { title: "Data Import", url: "/settings/data-import", icon: Upload },
];

interface AppSidebarV1Props {
  layoutVersion: "v1" | "v2";
  onVersionChange: (version: "v1" | "v2") => void;
}

export function AppSidebarV1({ layoutVersion, onVersionChange }: AppSidebarV1Props) {
  const { state } = useSidebar();
  const pathname = usePathname();
  const collapsed = state === "collapsed";

  const isActive = (path: string) => pathname === path || pathname === `${path}/`;

  // Check if any child route is active (for auto-expanding collapsible items)
  const isChildActive = (children: MenuItem[] | undefined) => {
    return children?.some((child) => pathname.startsWith(child.url)) || false;
  };

  // State for collapsible menus
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({
    dataFinance: false,
    dataLabor: false,
    dataSales: false,
  });

  // Auto-expand collapsible menus if any child route is active
  useEffect(() => {
    const newOpenMenus: Record<string, boolean> = {
      dataFinance: isChildActive(dataFinanceItems),
      dataLabor: isChildActive(dataLaborItems),
      dataSales: isChildActive(dataSalesItems),
    };
    setOpenMenus((prev) => ({ ...prev, ...newOpenMenus }));
  }, [pathname]);

  const toggleMenu = (menuKey: string) => {
    setOpenMenus((prev) => ({ ...prev, [menuKey]: !prev[menuKey] }));
  };

  const renderMenuItem = (item: MenuItem, menuKey?: string) => {
    // Render collapsible item if it has children
    if (item.isCollapsible && item.children) {
      const menuStateKey = menuKey || item.title.toLowerCase().replace(/\s+/g, "");
      const isOpen = openMenus[menuStateKey] || false;
      const isParentActive = isActive(item.url) || isChildActive(item.children);

      return (
        <Collapsible
          key={item.title}
          open={isOpen}
          onOpenChange={() => toggleMenu(menuStateKey)}
        >
          <SidebarMenuItem>
            <CollapsibleTrigger asChild>
              <SidebarMenuButton isActive={isParentActive}>
                <item.icon />
                <span>{item.title}</span>
                <ChevronRight
                  className={cn(
                    "ml-auto transition-transform duration-200",
                    isOpen && "rotate-90"
                  )}
                />
              </SidebarMenuButton>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarMenuSub>
                {item.children?.map((child: MenuItem) => (
                  <SidebarMenuSubItem key={child.title}>
                    <SidebarMenuSubButton asChild isActive={isActive(child.url)}>
                      <Link href={child.url}>
                        <span>{child.title}</span>
                      </Link>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                ))}
              </SidebarMenuSub>
            </CollapsibleContent>
          </SidebarMenuItem>
        </Collapsible>
      );
    }

    // Render regular item
    return (
      <SidebarMenuItem key={item.title}>
        <SidebarMenuButton asChild isActive={isActive(item.url)}>
          <Link href={item.url}>
            <item.icon />
            <span>{item.title}</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  return (
    <Sidebar>
      <SidebarContent>
        {/* Header with Logo and Title */}
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center gap-2 px-2 py-4">
            <div className="flex items-center gap-2 flex-1">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <LayoutDashboard className="h-4 w-4" />
              </div>
              {!collapsed && (
                <div className="flex flex-col">
                  <span className="font-semibold text-sm">Just Daily Ops</span>
                  <span className="text-xs text-muted-foreground">V1</span>
                </div>
              )}
            </div>
          </SidebarGroupLabel>

          {/* V1/V2 Switch */}
          {!collapsed && (
            <div className="px-2 pb-4">
              <div className="flex items-center justify-between rounded-lg border p-3 bg-muted/50">
                <div className="flex flex-col gap-1">
                  <Label htmlFor="version-switch-v1" className="text-xs font-medium">
                    Version
                  </Label>
                  <span className="text-xs text-muted-foreground">
                    {layoutVersion === "v1" ? "V1 (Supabase)" : "V2 (MongoDB)"}
                  </span>
                </div>
                <Switch
                  id="version-switch-v1"
                  checked={layoutVersion === "v2"}
                  onCheckedChange={(checked) => {
                    onVersionChange(checked ? "v2" : "v1");
                  }}
                />
              </div>
            </div>
          )}
        </SidebarGroup>

        {/* Homepage */}
        <SidebarGroup>
          <SidebarGroupLabel>Home</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={isActive("/dashboard") || pathname === "/"}
                >
                  <Link href="/dashboard">
                    <LayoutDashboard />
                    <span>Daily Ops KPIs</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Daily Ops Section */}
        <SidebarGroup>
          <SidebarGroupLabel>Daily Ops</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{dailyOpsItems.map((item) => renderMenuItem(item))}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Operations Section */}
        <SidebarGroup>
          <SidebarGroupLabel>Operations</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {operationsItems.map((item) => renderMenuItem(item))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Data Section */}
        <SidebarGroup>
          <SidebarGroupLabel>Data</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {dataItems.map((item) =>
                renderMenuItem(
                  item,
                  item.title === "Finance"
                    ? "dataFinance"
                    : item.title === "Labor"
                    ? "dataLabor"
                    : item.title === "Sales"
                    ? "dataSales"
                    : undefined
                )
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Settings Section */}
        <SidebarGroup>
          <SidebarGroupLabel>Settings</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {settingsItems.map((item) => renderMenuItem(item))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

