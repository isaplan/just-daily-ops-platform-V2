"use client";

import { Table } from "@/components/ui/table";
import { ReactNode, useId } from "react";

interface UITableProps {
  children: ReactNode;
  stickyHeader?: boolean;
  stickyFirstColumn?: boolean;
}

export function UITable({ children, stickyHeader = false, stickyFirstColumn = false }: UITableProps) {
  const tableWrapperClass = stickyHeader || stickyFirstColumn 
    ? "overflow-auto max-h-[calc(100vh-300px)]" 
    : "";
  
  const tableClass = stickyFirstColumn ? "border-collapse" : "";
  const uniqueId = useId();

  return (
    <>
      {(stickyHeader || stickyFirstColumn) && (
        <style>{`
          #${uniqueId} thead {
            ${stickyHeader ? `
              position: sticky;
              top: 0;
              z-index: 20;
              background-color: white;
            ` : ""}
          }
          #${uniqueId} thead th {
            ${stickyHeader ? "background-color: white;" : ""}
          }
          #${uniqueId} tbody tr td:first-child,
          #${uniqueId} thead tr th:first-child {
            ${stickyFirstColumn ? `
              position: sticky;
              left: 0;
              z-index: 10;
              background-color: white;
              border-right: 2px solid #e5e7eb;
            ` : ""}
          }
          #${uniqueId} thead tr th:first-child {
            ${stickyFirstColumn ? "z-index: 30;" : ""}
          }
        `}</style>
      )}
      <div className="bg-white rounded-sm border border-black px-4" id={uniqueId}>
        <div className={tableWrapperClass}>
          <Table className={tableClass}>
            {children}
          </Table>
        </div>
      </div>
    </>
  );
}

