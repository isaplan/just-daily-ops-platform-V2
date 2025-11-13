"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import Link from "next/link";

export default function DataFinanceLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  
  // Page metadata for breadcrumbs
  const pageMetadata: Record<string, { label: string; subtitle: string }> = {
    "/data/finance": { 
      label: "Overview", 
      subtitle: "View and analyze financial data" 
    },
    "/data/finance/profit-and-loss": { 
      label: "Profit & Loss", 
      subtitle: "View PNL balance and financial data" 
    },
    "/data/finance/pnl-balance": { 
      label: "PNL Balance", 
      subtitle: "View PNL balance data" 
    },
    "/data/finance/data-view": { 
      label: "Data View", 
      subtitle: "View raw financial data" 
    },
  };

  const currentPage = pageMetadata[pathname] || pageMetadata["/data/finance"];

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Breadcrumb Navigation */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/data/finance" className="text-2xl font-semibold">Finance Data</Link>
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

