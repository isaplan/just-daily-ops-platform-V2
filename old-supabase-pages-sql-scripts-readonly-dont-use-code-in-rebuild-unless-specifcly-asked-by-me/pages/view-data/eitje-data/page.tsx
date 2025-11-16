/**
 * ⚠️  MIGRATED TO ARCHIVE - DO NOT USE DIRECTLY
 * Migrated: 2025-11-13 01:18:49
 * Original: /Users/alviniomolina/Documents/GitHub/just-daily-ops-platform/src/app/(dashboard)/view-data
 */

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function EitjeDataRedirectPage() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace("/finance/data/eitje-data");
  }, [router]);

  return (
    <div className="container mx-auto py-6">
      <p>Redirecting to <a href="/finance/data/eitje-data" className="text-primary underline">/finance/data/eitje-data</a>...</p>
    </div>
  );
}
