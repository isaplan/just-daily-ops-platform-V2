"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import Link from "next/link";

export default function EitjeDataLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  
  // Page metadata for breadcrumbs
  const pageMetadata: Record<string, { label: string; subtitle: string }> = {
    "/finance/data/eitje-data": { 
      label: "Overview", 
      subtitle: "Select a section to view detailed data" 
    },
    "/finance/data/eitje-data/hours": { 
      label: "Hours", 
      subtitle: "View time registration shifts and labor hours data from Eitje" 
    },
    "/finance/data/eitje-data/labor-costs": { 
      label: "Labor Costs", 
      subtitle: "View aggregated labor costs, wage expenses, and cost metrics from Eitje" 
    },
    "/finance/data/eitje-data/finance": { 
      label: "Sales by Bork", 
      subtitle: "View sales and revenue data from Bork (via Eitje integration)" 
    },
    "/finance/data/eitje-data/data-imported": { 
      label: "Data Imported", 
      subtitle: "View all raw imported data from Eitje time registration shifts" 
    },
    "/finance/data/eitje-data/workers": { 
      label: "Workers", 
      subtitle: "View employee information from Eitje" 
    },
    "/finance/data/eitje-data/locations-teams": { 
      label: "Locations & Teams", 
      subtitle: "View environments (locations) and teams data from Eitje" 
    },
  };

  const currentPage = pageMetadata[pathname] || pageMetadata["/finance/data/eitje-data"];

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Breadcrumb Navigation */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/finance/data/eitje-data" className="text-2xl font-semibold">Eitje Data</Link>
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


