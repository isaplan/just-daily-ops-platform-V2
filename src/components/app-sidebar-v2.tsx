"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
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
  Wifi,
  Upload,
  Palette,
  Settings,
  Calendar,
  ChevronRight,
  LayoutDashboard,
  Building2,
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
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";
import Image from "next/image";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

// Type definitions for menu items
type MenuItem = {
  title: string;
  url: string;
  icon: LucideIcon;
  isCollapsible?: boolean;
  children?: MenuItem[];
};

// Daily Ops items (Labor hidden in V2)
const dailyOpsItems: MenuItem[] = [
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

// Workforce V2 (all new V2 pages)
const dataWorkforceV2Items: MenuItem[] = [
  { title: "Hours", url: "/data/workforce/hours", icon: Clock },
  { title: "Workers", url: "/data/workforce/workers", icon: UserCheck },
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
    children: dataFinanceItems 
  },
  { 
    title: "Labor", 
    url: "/data/labor", 
    icon: Users, 
    isCollapsible: true, 
    children: dataLaborItems 
  },
  { 
    title: "Workforce V2", 
    url: "/data/workforce", 
    icon: Users, 
    isCollapsible: true, 
    children: dataWorkforceV2Items 
  },
  { 
    title: "Sales", 
    url: "/data/sales", 
    icon: TrendingUp, 
    isCollapsible: true, 
    children: dataSalesItems 
  },
  { title: "Reservations", url: "/data/reservations", icon: Calendar },
  { title: "Inventory", url: "/data/inventory", icon: Package },
];

// Settings items
const settingsItems: MenuItem[] = [
  { title: "Themes", url: "/settings/themes", icon: Palette },
  { title: "Company Settings", url: "/settings/company", icon: Settings },
];

interface AppSidebarV2Props {
  layoutVersion: "v1" | "v2";
  onVersionChange: (version: "v1" | "v2") => void;
}

export function AppSidebarV2({ layoutVersion, onVersionChange }: AppSidebarV2Props) {
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
    dataWorkforceV2: false,
    dataSales: false,
  });
  
  // Auto-expand collapsible menus if any child route is active
  useEffect(() => {
    const newOpenMenus: Record<string, boolean> = {
      dataFinance: isChildActive(dataFinanceItems),
      dataLabor: isChildActive(dataLaborItems),
      dataWorkforceV2: isChildActive(dataWorkforceV2Items),
      dataSales: isChildActive(dataSalesItems),
    };
    setOpenMenus((prev) => ({ ...prev, ...newOpenMenus }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const toggleMenu = (menuKey: string) => {
    setOpenMenus((prev) => ({ ...prev, [menuKey]: !prev[menuKey] }));
  };

  const renderMenuItem = (item: MenuItem, menuKey?: string) => {
    // Render collapsible item if it has children
    if (item.isCollapsible && item.children) {
      const menuStateKey = menuKey || item.title.toLowerCase().replace(/\s+/g, '');
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
                <ChevronRight className={cn(
                  "ml-auto transition-transform duration-200",
                  isOpen && "rotate-90"
                )} />
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
    <Sidebar collapsible="icon" className="border-r-2 border-black bg-white">
      <SidebarContent className="flex flex-col">
        {/* Sticky Top Section - Title */}
        <div className="sticky top-0 z-10 bg-white border-b-2 border-black px-4 py-3 space-y-3">
          <div className="flex items-center gap-3">
            <Image 
              src="/logo.svg" 
              alt="Just Daily Ops Logo" 
              width={30} 
              height={30}
            />
            <span className={cn(
              "font-semibold text-lg transition-opacity",
              collapsed && "opacity-0 w-0 overflow-hidden"
            )}>
              Just Daily Ops
            </span>
          </div>
          
          {/* V1/V2 Switch - below title */}
          <div className={cn(
            "flex items-center gap-2 transition-opacity",
            collapsed && "opacity-0 h-0 overflow-hidden"
          )}>
            <Label htmlFor="layout-switch-sidebar" className="text-xs text-muted-foreground">
              V1
            </Label>
            <Switch
              id="layout-switch-sidebar"
              checked={layoutVersion === "v2"}
              onCheckedChange={(checked) => onVersionChange(checked ? "v2" : "v1")}
            />
            <Label htmlFor="layout-switch-sidebar" className="text-xs text-muted-foreground">
              V2
            </Label>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Homepage */}
          <SidebarGroup>
            <SidebarGroupLabel className={collapsed ? "sr-only" : ""}>
              Home
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive("/dashboard") || pathname === "/"}>
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
            <SidebarGroupLabel className={collapsed ? "sr-only" : ""}>
              Daily Ops
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {dailyOpsItems.map((item) => renderMenuItem(item))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* Operations Section */}
          <SidebarGroup>
            <SidebarGroupLabel className={collapsed ? "sr-only" : ""}>
              Operations
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {operationsItems.map((item) => renderMenuItem(item))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* Data Section */}
          <SidebarGroup>
            <SidebarGroupLabel className={collapsed ? "sr-only" : ""}>
              Data
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {dataItems.map((item) => renderMenuItem(item, 
                  item.title === "Finance" ? "dataFinance" :
                  item.title === "Labor" ? "dataLabor" :
                  item.title === "Workforce V2" ? "dataWorkforceV2" :
                  item.title === "Sales" ? "dataSales" : undefined
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* Settings Section (not fixed at bottom in V2) */}
          <SidebarGroup>
            <SidebarGroupLabel className={collapsed ? "sr-only" : ""}>
              Settings
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {settingsItems.map((item) => renderMenuItem(item))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* Connections & Tools (not fixed at bottom in V2) */}
          <SidebarGroup>
            <SidebarGroupLabel className={collapsed ? "sr-only" : ""}>
              Connections & Tools
            </SidebarGroupLabel>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/settings/connections/data-import")}>
                  <Link href="/settings/connections/data-import">
                    <Upload />
                    <span>Data Import</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/settings/bork-api")}>
                  <Link href="/settings/bork-api">
                    <Wifi />
                    <span>Bork API</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/settings/eitje-api")}>
                  <Link href="/settings/eitje-api">
                    <Wifi />
                    <span>Eitje API</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/roadmap")}>
                  <Link href="/roadmap">
                    <FileText />
                    <span>Roadmap</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/docs") || pathname.startsWith("/docs/")}>
                  <Link href="/docs">
                    <FileText />
                    <span>Documentation</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}

