"use client";

import { createContext, useContext, useState, ReactNode } from "react";

type Department = "orders" | "stock" | "operations" | "finance" | "back-office";

interface DepartmentContextType {
  department: Department;
  setDepartment: (department: Department) => void;
}

const DepartmentContext = createContext<DepartmentContextType | undefined>(undefined);

export function DepartmentProvider({ children }: { children: ReactNode }) {
  const [department, setDepartment] = useState<Department>("finance");

  return (
    <DepartmentContext.Provider value={{ department, setDepartment }}>
      {children}
    </DepartmentContext.Provider>
  );
}

export function useDepartment() {
  const context = useContext(DepartmentContext);
  if (context === undefined) {
    throw new Error("useDepartment must be used within a DepartmentProvider");
  }
  return context;
}
