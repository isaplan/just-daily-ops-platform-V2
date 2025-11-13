"use client";

import { useState } from "react";
import { AppSidebar } from "@/components/app-sidebar"
import { AppSidebarV2 } from "@/components/app-sidebar-v2"
import { AppTopnavV2 } from "@/components/app-topnav-v2"
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Providers } from "@/components/providers"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { LayoutDashboard, Plus } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { PageFiltersProvider } from "@/contexts/page-filters-context"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [layoutVersion, setLayoutVersion] = useState<"v1" | "v2">("v1");

  const handleVersionChange = (checked: boolean) => {
    const newVersion = checked ? "v2" : "v1";
    setLayoutVersion(newVersion);
  };

  return (
    <Providers>
      <PageFiltersProvider>
        <div className="flex h-screen w-full">
        {layoutVersion === "v1" ? (
          <AppSidebar key="v1-sidebar" />
        ) : (
          <AppSidebarV2 
            key="v2-sidebar"
            layoutVersion={layoutVersion} 
            onVersionChange={setLayoutVersion} 
          />
        )}
        <SidebarInset className="flex-1 min-w-0" key={`sidebar-inset-${layoutVersion}`}>
          {layoutVersion === "v1" ? (
            <header className="sticky top-0 z-50 flex h-16 shrink-0 items-center justify-between border-b-2 border-black bg-white px-4">
              <div className="flex items-center gap-4">
                <SidebarTrigger className="-ml-1" />
                <div className="flex items-center gap-3">
                  <Image 
                    src="/logo.svg" 
                    alt="Just Daily Ops Logo" 
                    width={30} 
                    height={30}
                  />
                  <span className="font-semibold text-lg">Just Daily Ops</span>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="text-xs bg-muted px-2 py-1 rounded border border-border">
                  <span className="text-muted-foreground">Theme: </span>
                  <span className="font-semibold">My Theme 3</span>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="layout-switch-v1" className="text-xs text-muted-foreground cursor-pointer">
                    V1
                  </Label>
                  <Switch
                    id="layout-switch-v1"
                    checked={layoutVersion === "v2"}
                    onCheckedChange={handleVersionChange}
                  />
                  <Label htmlFor="layout-switch-v1" className="text-xs text-muted-foreground cursor-pointer">
                    V2
                  </Label>
                </div>
                <Link href="/finance">
                  <Button variant="ghost" size="sm" className="gap-2 shadow-none">
                    <LayoutDashboard className="h-4 w-4" />
                    Dashboard
                  </Button>
                </Link>
                <Button size="sm" className="gap-2 shadow-none">
                  <Plus className="h-4 w-4" />
                  Create
                </Button>
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm font-semibold">
                    U
                  </AvatarFallback>
                </Avatar>
              </div>
            </header>
          ) : (
            <AppTopnavV2 
              layoutVersion={layoutVersion} 
              onVersionChange={setLayoutVersion}
            />
          )}
          <main className="flex-1 overflow-auto min-w-0">
            <div className="w-full">
              {children}
            </div>
          </main>
        </SidebarInset>
      </div>
      </PageFiltersProvider>
    </Providers>
  )
}
