"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { getBreadcrumb, getBreadcrumbSegments } from "@/lib/navigation/breadcrumb-registry";
import { ChevronRight } from "lucide-react";

export function TopnavBreadcrumb() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  // Ensure consistent rendering between server and client
  useEffect(() => {
    setMounted(true);
  }, []);

  // Don't render until mounted to avoid hydration mismatch
  if (!mounted) {
    return null;
  }

  const segments = getBreadcrumbSegments(pathname);
  const currentBreadcrumb = getBreadcrumb(pathname);

  if (!currentBreadcrumb && segments.length === 0) {
    return null;
  }

  // If we have segments, use them; otherwise use current breadcrumb
  const breadcrumbItems = segments.length > 0 
    ? segments 
    : currentBreadcrumb 
      ? [{ path: pathname, label: currentBreadcrumb.label }]
      : [];

  if (breadcrumbItems.length === 0) {
    return null;
  }

  return (
    <nav className="bg-white border-2 border-black rounded-lg px-4 h-10 flex items-center gap-2 whitespace-nowrap w-fit max-w-xl">
        {breadcrumbItems.map((item, index) => (
          <React.Fragment key={item.path}>
            {index > 0 && (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
            {index === breadcrumbItems.length - 1 ? (
              <span className="text-sm font-semibold">{item.label}</span>
            ) : (
              <Link
                href={item.path}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {item.label}
              </Link>
            )}
          </React.Fragment>
        ))}
    </nav>
  );
}


