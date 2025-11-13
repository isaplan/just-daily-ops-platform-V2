"use client";

import { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DepartmentProvider } from "@/contexts/DepartmentContext";
import { SidebarProvider } from "@/components/ui/sidebar";

interface ProvidersProps {
  children: ReactNode;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

export function Providers({ children }: ProvidersProps) {
  return (
    <DepartmentProvider>
      <SidebarProvider>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </SidebarProvider>
    </DepartmentProvider>
  );
}
