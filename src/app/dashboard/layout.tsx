"use client";

import { useState } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [layoutVersion, setLayoutVersion] = useState<"v1" | "v2">("v2");

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <AppSidebar
          layoutVersion={layoutVersion}
          onVersionChange={setLayoutVersion}
        />
        <SidebarInset className="flex-1 min-w-0">
          <header className="sticky top-0 z-50 flex h-16 shrink-0 items-center gap-2 border-b bg-background px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="h-6" />
            <div className="flex items-center gap-2 flex-1">
              <h1 className="text-lg font-semibold">Just Daily Ops V2</h1>
            </div>
          </header>
          <main className="flex-1 overflow-auto p-6">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

