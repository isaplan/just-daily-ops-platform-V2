"use client";

import { useState } from "react";
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
  Settings,
  Calendar,
  ChevronRight,
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
const dailyOpsItems: MenuItem[] = [
  { title: "Dashboard", icon: LayoutDashboard, comingSoon: true },
  { title: "Finance", icon: DollarSign, comingSoon: true },
  { title: "Labor", icon: Users, comingSoon: true },
  { title: "Inventory", icon: Package, comingSoon: true },
  { title: "AI & Analytics", icon: Sparkles, comingSoon: true },
  { title: "Reports", icon: FileText, comingSoon: true },
];

const operationsItems: MenuItem[] = [
  { title: "Products", icon: Box, comingSoon: true },
  { title: "Suppliers", icon: Truck, comingSoon: true },
  { title: "Locations", icon: MapPin, comingSoon: true },
  { title: "Teams", icon: UserCheck, comingSoon: true },
];

const dataFinanceItems: MenuItem[] = [
  { title: "Profit & Loss", icon: BarChart3, comingSoon: true },
  { title: "PNL Balance", icon: BarChart3, comingSoon: true },
  { title: "Revenue", icon: TrendingUp, comingSoon: true },
];

const dataLaborItems: MenuItem[] = [
  { title: "Hours", icon: Clock, comingSoon: true },
  { title: "Labor Costs", icon: DollarSign, comingSoon: true },
  { title: "Workers", icon: Users, comingSoon: true },
  { title: "Locations & Teams", icon: Building2, comingSoon: true },
];

const dataSalesItems: MenuItem[] = [
  { title: "Sales Data", icon: TrendingUp, comingSoon: true },
  { title: "Categories", icon: BarChart3, comingSoon: true },
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
  { title: "API Settings", icon: Settings, comingSoon: true },
  { title: "Company Settings", icon: Building2, comingSoon: true },
];

interface AppSidebarProps {
  layoutVersion: "v1" | "v2";
  onVersionChange: (version: "v1" | "v2") => void;
}

export function AppSidebar({ layoutVersion, onVersionChange }: AppSidebarProps) {
  const { state } = useSidebar();
  const pathname = usePathname();
  const collapsed = state === "collapsed";

  const isActive = (path?: string) => {
    if (!path) return false;
    return pathname === path || pathname === `${path}/`;
  };

  const isChildActive = (children: MenuItem[] | undefined) => {
    return children?.some((child) => child.url && pathname.startsWith(child.url)) || false;
  };

  const renderMenuItem = (item: MenuItem) => {
    if (item.isCollapsible && item.children) {
      const childActive = isChildActive(item.children);
      return (
        <Collapsible key={item.title} defaultOpen={childActive} className="group/collapsible">
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
                {item.children.map((child) => (
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
                      <SidebarMenuSubButton disabled={child.comingSoon}>
                        <child.icon />
                        <span>{child.title}</span>
                        {child.comingSoon && (
                          <span className="ml-auto text-xs text-muted-foreground">Soon</span>
                        )}
                      </SidebarMenuSubButton>
                    )}
                  </SidebarMenuSubItem>
                ))}
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
            <div className="flex items-center gap-2 flex-1">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <LayoutDashboard className="h-4 w-4" />
              </div>
              {!collapsed && (
                <div className="flex flex-col">
                  <span className="font-semibold text-sm">Just Daily Ops</span>
                  <span className="text-xs text-muted-foreground">V2</span>
                </div>
              )}
            </div>
          </SidebarGroupLabel>

          {/* V1/V2 Switch */}
          {!collapsed && (
            <div className="px-2 pb-4">
              <div className="flex items-center justify-between rounded-lg border p-3 bg-muted/50">
                <div className="flex flex-col gap-1">
                  <Label htmlFor="version-switch" className="text-xs font-medium">
                    Version
                  </Label>
                  <span className="text-xs text-muted-foreground">
                    {layoutVersion === "v1" ? "V1 (Supabase)" : "V2 (MongoDB)"}
                  </span>
                </div>
                <Switch
                  id="version-switch"
                  checked={layoutVersion === "v2"}
                  onCheckedChange={(checked) => {
                    const newVersion = checked ? "v2" : "v1";
                    onVersionChange(newVersion);
                    // TODO: Implement V1/V2 switching logic when V1 is available
                    // For now, this is a visual indicator
                  }}
                />
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

