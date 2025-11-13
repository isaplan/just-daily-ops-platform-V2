"use client";

import { useEffect, useState } from 'react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../lib/i18n';

interface I18nProviderProps {
  children: React.ReactNode;
}

export function I18nProvider({ children }: I18nProviderProps) {
  const [isClient, setIsClient] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setIsClient(true);
    // Wait for i18n to be ready before rendering
    const handleInitialized = () => {
      setIsReady(true);
    };
    
    i18n.on('initialized', handleInitialized);
    
    // If already initialized, set ready immediately
    if (i18n.isInitialized) {
      setIsReady(true);
    }
    
    // Cleanup listener
    return () => {
      i18n.off('initialized', handleInitialized);
    };
  }, []);

  // Always render children wrapped in I18nextProvider to avoid Suspense hydration issues
  // The provider handles the initialization internally
  if (!isClient) {
    // During SSR, render without i18n provider
    return <>{children}</>;
  }

  // On client, always render with I18nextProvider (even if not ready yet)
  // This ensures consistent React tree structure and avoids Suspense boundary issues
  return (
    <I18nextProvider i18n={i18n}>
      {children}
    </I18nextProvider>
  );
}
