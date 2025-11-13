"use client";

import { useState, useEffect } from "react";

interface UserRole {
  isOwner: () => boolean;
  isAdmin: () => boolean;
  isUser: () => boolean;
}

export function useUserRole(): UserRole {
  const [userRole, setUserRole] = useState<string>("user");

  useEffect(() => {
    // For now, we'll default to owner for development
    // In production, this would check the actual user role from Supabase
    setUserRole("owner");
  }, []);

  return {
    isOwner: () => userRole === "owner",
    isAdmin: () => userRole === "admin" || userRole === "owner",
    isUser: () => userRole === "user",
  };
}