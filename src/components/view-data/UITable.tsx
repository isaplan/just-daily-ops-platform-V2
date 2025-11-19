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
          #${uniqueId} .table-wrapper {
            ${stickyHeader || stickyFirstColumn ? "position: relative;" : ""}
          }
          /* Override Table component's wrapper div - remove its overflow so sticky works */
          #${uniqueId} .table-wrapper > div {
            ${stickyHeader || stickyFirstColumn ? "overflow: visible !important; position: static !important; width: 100% !important;" : ""}
          }
          #${uniqueId} .table-wrapper table {
            ${stickyHeader || stickyFirstColumn ? "position: relative; width: 100%;" : ""}
          }
          #${uniqueId} thead {
            ${stickyHeader ? `
              position: sticky !important;
              top: 0 !important;
              z-index: 20 !important;
              background-color: white !important;
            ` : ""}
          }
          #${uniqueId} thead th {
            ${stickyHeader ? "background-color: white !important;" : ""}
          }
          #${uniqueId} tbody tr td:first-child,
          #${uniqueId} thead tr th:first-child {
            ${stickyFirstColumn ? `
              position: sticky !important;
              left: 0 !important;
              z-index: 10 !important;
              background-color: white !important;
              border-right: 2px solid #e5e7eb !important;
            ` : ""}
          }
          #${uniqueId} thead tr th:first-child {
            ${stickyFirstColumn ? "z-index: 30 !important;" : ""}
          }
          #${uniqueId} tbody tr td:first-child {
            ${stickyFirstColumn ? "z-index: 5 !important;" : ""}
          }
        `}</style>
      )}
      <div className="bg-white rounded-sm border border-black px-4" id={uniqueId}>
        <div className={`table-wrapper ${tableWrapperClass}`}>
          <Table className={tableClass}>
            {children}
          </Table>
        </div>
      </div>
    </>
  );
}






