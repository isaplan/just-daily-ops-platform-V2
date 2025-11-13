"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import Link from "next/link";

export default function WorkforceLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  
  // Page metadata for breadcrumbs
  const pageMetadata: Record<string, { label: string; subtitle: string }> = {
    "/data/workforce": { 
      label: "Overview", 
      subtitle: "View and manage workforce data (Hours and Workers)" 
    },
    "/data/workforce/hours": { 
      label: "Hours", 
      subtitle: "View processed and aggregated hours data from Eitje" 
    },
    "/data/workforce/workers": { 
      label: "Workers", 
      subtitle: "Manage editable hourly wages, contract types, and contract hours" 
    },
  };

  const currentPage = pageMetadata[pathname] || pageMetadata["/data/workforce"];

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Breadcrumb Navigation */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/data/workforce" className="text-2xl font-semibold">Workforce V2</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          {currentPage.label !== "Overview" && (
            <>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage className="text-2xl font-semibold">{currentPage.label}</BreadcrumbPage>
              </BreadcrumbItem>
            </>
          )}
        </BreadcrumbList>
      </Breadcrumb>

      {children}
    </div>
  );
}

