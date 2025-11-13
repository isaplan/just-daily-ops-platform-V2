"use client";

import dynamic from "next/dynamic";
import { I18nProvider } from "./i18n-provider";

// Client-side wrapper that dynamically loads I18nProvider without SSR
// This ensures i18n never runs on the server, preventing interference with API routes
export const I18nClientWrapper = dynamic(
  () => Promise.resolve({ default: I18nProvider }),
  { 
    ssr: false, // Completely disable SSR for i18n
  }
);

