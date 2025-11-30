"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
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
  Calendar,
  ChevronRight,
  Building2,
  Plug,
  Zap,
  Grid,
  Receipt,
  ChefHat,
  Megaphone,
} from "lucide-react";
import Image from "next/image";
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
import { LucideIcon } from "lucide-react";

// Type definitions for menu items
type MenuItem = {
  title: string;
  url?: string; // Optional - routes will be added per feature
  icon: LucideIcon;
  isCollapsible?: boolean;
  children?: MenuItem[];
  comingSoon?: boolean;
};

// Navigation structure (routes will be added per feature)
const dailyOpsLaborItems: MenuItem[] = [
  { title: "Dashboard", icon: LayoutDashboard, url: "/daily-ops/labor" },
  { title: "Products", icon: Package, url: "/daily-ops/labor/products" },
  { title: "Time Analysis", icon: Clock, url: "/daily-ops/labor/time-analysis" },
  { title: "Table Analysis", icon: Grid, url: "/daily-ops/labor/tables" },
  { title: "Transactions", icon: Receipt, url: "/daily-ops/labor/transactions" },
];

const dailyOpsItems: MenuItem[] = [
  { title: "Dashboard", icon: LayoutDashboard, comingSoon: true },
  { title: "Finance", icon: DollarSign, comingSoon: true },
  {
    title: "Labor",
    icon: Users,
    isCollapsible: true,
    children: dailyOpsLaborItems,
  },
  { title: "Keuken Analyses", icon: ChefHat, url: "/daily-ops/keuken-analyses" },
  { title: "Inventory", icon: Package, comingSoon: true },
  { title: "AI & Analytics", icon: Sparkles, comingSoon: true },
  { title: "Reports", icon: FileText, comingSoon: true },
];

const operationsProductsItems: MenuItem[] = [
  { title: "Catalog", icon: Package, url: "/operations/products/catalog" },
];

const operationsEventsPromotionsItems: MenuItem[] = [
  { title: "Events", icon: Calendar, url: "/operations/events-promotions/events" },
  { title: "Socials", icon: Sparkles, url: "/operations/events-promotions/socials" },
];

const operationsItems: MenuItem[] = [
  {
    title: "Products",
    icon: Box,
    isCollapsible: true,
    children: operationsProductsItems,
  },
  { title: "Manage Menus", icon: Calendar, url: "/operations/menus" },
  {
    title: "Events & Promotions",
    icon: Megaphone,
    isCollapsible: true,
    children: operationsEventsPromotionsItems,
  },
  { title: "Suppliers", icon: Truck, comingSoon: true },
  { title: "Locations", icon: MapPin, comingSoon: true },
  { title: "Teams", icon: UserCheck, comingSoon: true },
];

const dataFinanceItems: MenuItem[] = [
  { title: "Profit & Loss", icon: BarChart3, comingSoon: true },
  { title: "PNL Balance", icon: BarChart3, comingSoon: true },
  { title: "Revenue", icon: TrendingUp, comingSoon: true },
];

const dataLaborProductivityItems: MenuItem[] = [
  { title: "By Location", icon: MapPin, url: "/data/labor/productivity/by-location" },
  { title: "By Division", icon: Grid, url: "/data/labor/productivity/by-division" },
  { title: "By Team", icon: Users, url: "/data/labor/productivity/by-team" },
  { title: "By Worker", icon: UserCheck, url: "/data/labor/productivity/by-worker" },
];

const dataLaborItems: MenuItem[] = [
  { title: "Hours", icon: Clock, url: "/data/labor/hours" },
  { title: "Labor Costs", icon: DollarSign, url: "/data/labor/costs" },
  {
    title: "Labor Productivity",
    icon: TrendingUp,
    isCollapsible: true,
    children: dataLaborProductivityItems,
  },
  { title: "Workers", icon: Users, url: "/data/labor/workers" },
  // { title: "Locations & Teams", icon: Building2, url: "/data/labor/locations-teams" }, // Merged into Workers page
];

const dataSalesItems: MenuItem[] = [
  { title: "Daily Sales", icon: TrendingUp, url: "/data/sales/daily" },
  { title: "Waiters", icon: Users, url: "/data/sales/daily/waiters" },
  { title: "Revenue", icon: DollarSign, url: "/data/sales/daily/revenue" },
  { title: "Payment Methods", icon: FileText, url: "/data/sales/daily/payment-methods" },
  { title: "Categories & Products", icon: Package, url: "/data/sales/daily/categories-products" },
];

const dataItems: MenuItem[] = [
  {
    title: "Finance",
    icon: DollarSign,
    isCollapsible: true,
    children: dataFinanceItems,
  },
  {
    title: "Labor",
    icon: Users,
    isCollapsible: true,
    children: dataLaborItems,
  },
  {
    title: "Sales",
    icon: TrendingUp,
    isCollapsible: true,
    children: dataSalesItems,
  },
  { title: "Reservations", icon: Calendar, comingSoon: true },
  { title: "Inventory", icon: Package, comingSoon: true },
];

const settingsItems: MenuItem[] = [
  { title: "Documentation", icon: FileText, url: "/docs" },
  { title: "Data & Status", icon: BarChart3, url: "/settings/data-status" },
  { title: "Eitje API Connect", icon: Plug, url: "/settings/eitje-api" },
  { title: "Bork API Connect", icon: Plug, url: "/settings/bork-api" },
  { title: "Company Settings", icon: Building2, url: "/settings/company" },
  { title: "SSR Demo", icon: Zap, url: "/demo-ssr" },
];

interface AppSidebarProps {
  layoutVersion: "v1" | "v2";
  onVersionChange: (version: "v1" | "v2") => void;
}

export function AppSidebar({ layoutVersion, onVersionChange }: AppSidebarProps) {
  const { state } = useSidebar();
  const pathname = usePathname();
  const collapsed = state === "collapsed";
  
  // Calculate initial open states based on pathname (synchronously to avoid hydration mismatch)
  const getInitialOpenStates = (currentPathname: string): Record<string, boolean> => {
    const initialStates: Record<string, boolean> = {};
    const checkCollapsible = (items: MenuItem[]) => {
      items.forEach((item) => {
        if (item.isCollapsible && item.children) {
          const childActive = item.children.some(
            (child) => child.url && (currentPathname === child.url || currentPathname.startsWith(`${child.url}/`))
          );
          initialStates[item.title] = childActive;
        }
      });
    };
    checkCollapsible(dataLaborItems);
    checkCollapsible(dataItems);
    checkCollapsible(dailyOpsItems);
    checkCollapsible(operationsItems);
    return initialStates;
  };
  
  // Track open state for collapsibles - initialize synchronously to match server/client
  const [openStates, setOpenStates] = useState<Record<string, boolean>>(() => getInitialOpenStates(pathname || ''));

  // Update open states when pathname changes
  useEffect(() => {
    if (pathname) {
      const newStates = getInitialOpenStates(pathname);
      setOpenStates(newStates);
    }
  }, [pathname]);

  const isActive = (path?: string) => {
    if (!path) return false;
    return pathname === path || pathname === `${path}/` || pathname.startsWith(`${path}/`);
  };

  const isChildActive = (children: MenuItem[] | undefined) => {
    return children?.some((child) => child.url && (pathname === child.url || pathname.startsWith(`${child.url}/`))) || false;
  };

  const renderMenuItem = (item: MenuItem) => {
    if (item.isCollapsible && item.children) {
      const childActive = isChildActive(item.children);
      // Use controlled state - default to childActive if not in state yet (after first render)
      const isOpen = openStates[item.title] !== undefined ? openStates[item.title] : childActive;
      return (
        <Collapsible 
          key={item.title} 
          open={isOpen}
          onOpenChange={(open) => setOpenStates(prev => ({ ...prev, [item.title]: open }))}
          className="group/collapsible"
        >
          <SidebarMenuItem>
            <CollapsibleTrigger asChild>
              <SidebarMenuButton tooltip={item.title} isActive={childActive}>
                <item.icon />
                <span>{item.title}</span>
                <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
              </SidebarMenuButton>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarMenuSub>
                {item.children.map((child) => {
                  // If child is also collapsible, render it as a nested collapsible
                  if (child.isCollapsible && child.children) {
                    const childChildActive = isChildActive(child.children);
                    const childIsOpen = openStates[child.title] !== undefined ? openStates[child.title] : childChildActive;
                    return (
                      <SidebarMenuSubItem key={child.title}>
                        <Collapsible
                          open={childIsOpen}
                          onOpenChange={(open) => setOpenStates(prev => ({ ...prev, [child.title]: open }))}
                          className="group/collapsible"
                        >
                          <CollapsibleTrigger asChild>
                            <SidebarMenuSubButton isActive={childChildActive}>
                              <child.icon />
                              <span>{child.title}</span>
                              <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                            </SidebarMenuSubButton>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <ul className="mx-3.5 flex min-w-0 translate-x-px flex-col gap-1 border-l border-sidebar-border px-2.5 py-0.5">
                              {child.children.map((grandchild) => (
                                <li key={grandchild.title}>
                                  {grandchild.url ? (
                                    <SidebarMenuSubButton asChild isActive={isActive(grandchild.url)}>
                                      <Link href={grandchild.url}>
                                        <grandchild.icon />
                                        <span>{grandchild.title}</span>
                                        {grandchild.comingSoon && (
                                          <span className="ml-auto text-xs text-muted-foreground">Soon</span>
                                        )}
                                      </Link>
                                    </SidebarMenuSubButton>
                                  ) : (
                                    <SidebarMenuSubButton asChild>
                                      <span className={grandchild.comingSoon ? "opacity-50 cursor-not-allowed" : ""}>
                                        <grandchild.icon />
                                        <span>{grandchild.title}</span>
                                        {grandchild.comingSoon && (
                                          <span className="ml-auto text-xs text-muted-foreground">Soon</span>
                                        )}
                                      </span>
                                    </SidebarMenuSubButton>
                                  )}
                                </li>
                              ))}
                            </ul>
                          </CollapsibleContent>
                        </Collapsible>
                      </SidebarMenuSubItem>
                    );
                  }
                  // Regular child item (link or disabled)
                  return (
                  <SidebarMenuSubItem key={child.title}>
                    {child.url ? (
                      <SidebarMenuSubButton asChild isActive={isActive(child.url)}>
                        <Link href={child.url}>
                          <child.icon />
                          <span>{child.title}</span>
                          {child.comingSoon && (
                            <span className="ml-auto text-xs text-muted-foreground">Soon</span>
                          )}
                        </Link>
                      </SidebarMenuSubButton>
                    ) : (
                        <SidebarMenuSubButton asChild>
                          <span className={child.comingSoon ? "opacity-50 cursor-not-allowed" : ""}>
                        <child.icon />
                        <span>{child.title}</span>
                        {child.comingSoon && (
                          <span className="ml-auto text-xs text-muted-foreground">Soon</span>
                        )}
                          </span>
                      </SidebarMenuSubButton>
                    )}
                  </SidebarMenuSubItem>
                  );
                })}
              </SidebarMenuSub>
            </CollapsibleContent>
          </SidebarMenuItem>
        </Collapsible>
      );
    }

    return (
      <SidebarMenuItem key={item.title}>
        {item.url ? (
          <SidebarMenuButton asChild tooltip={item.title} isActive={isActive(item.url)}>
            <Link href={item.url}>
              <item.icon />
              <span>{item.title}</span>
              {item.comingSoon && (
                <span className="ml-auto text-xs text-muted-foreground">Soon</span>
              )}
            </Link>
          </SidebarMenuButton>
        ) : (
          <SidebarMenuButton disabled={item.comingSoon} tooltip={item.title}>
            <item.icon />
            <span>{item.title}</span>
            {item.comingSoon && (
              <span className="ml-auto text-xs text-muted-foreground">Soon</span>
            )}
          </SidebarMenuButton>
        )}
      </SidebarMenuItem>
    );
  };

  return (
    <Sidebar>
      <SidebarContent>
        {/* Header with Logo and Title */}
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center gap-2 px-2 py-4">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Image 
                src="/logo.svg" 
                alt="Just Daily Ops Logo" 
                width={30} 
                height={30}
                className="flex-shrink-0"
              />
              {!collapsed && (
                <span className="font-semibold text-sm whitespace-nowrap truncate">
                  Just Daily Ops
                </span>
              )}
            </div>
          </SidebarGroupLabel>

          {/* V1/V2 Switch */}
          {!collapsed && (
            <div className="px-2 pb-4 mt-4">
              <div className="bg-white border-2 border-black rounded-lg px-2 py-1 flex items-center gap-1 w-fit">
                <Label htmlFor="version-switch" className="text-[10px] text-muted-foreground cursor-pointer whitespace-nowrap">
                  V1
                </Label>
                <Switch
                  id="version-switch"
                  className="h-4 w-7 [&>span]:h-3 [&>span]:w-3 [&>span]:data-[state=checked]:translate-x-3"
                  checked={layoutVersion === "v2"}
                  onCheckedChange={(checked) => {
                    const newVersion = checked ? "v2" : "v1";
                    onVersionChange(newVersion);
                  }}
                />
                <Label htmlFor="version-switch" className="text-[10px] text-muted-foreground cursor-pointer whitespace-nowrap">
                  V2
                </Label>
              </div>
            </div>
          )}
        </SidebarGroup>

        {/* Daily Ops Section */}
        <SidebarGroup>
          <SidebarGroupLabel>Daily Ops</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {dailyOpsItems.map(renderMenuItem)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Operations Section */}
        <SidebarGroup>
          <SidebarGroupLabel>Operations</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {operationsItems.map(renderMenuItem)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Data Section */}
        <SidebarGroup>
          <SidebarGroupLabel>Data</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {dataItems.map(renderMenuItem)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Settings Section */}
        <SidebarGroup>
          <SidebarGroupLabel>Settings</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {settingsItems.map(renderMenuItem)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

