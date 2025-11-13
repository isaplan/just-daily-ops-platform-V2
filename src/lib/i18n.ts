// CLIENT-SIDE ONLY i18n initialization
// This file should ONLY be imported in client components
// Server-side code should never import this to avoid interference with API calls

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files - these are safe to import, JSON is static
import enCommon from '../locales/en/common.json';
import nlCommon from '../locales/nl/common.json';

const resources = {
  en: {
    common: enCommon,
  },
  nl: {
    common: nlCommon,
  },
};

// Only initialize if not already initialized (prevents re-initialization)
if (!i18n.isInitialized) {
  // Check if we're in browser (client-side)
  // On server-side, this will just export the instance without initialization
  // Actual initialization happens client-side only
  if (typeof window !== 'undefined') {
    i18n
      .use(LanguageDetector)
      .use(initReactI18next)
      .init({
        resources,
        fallbackLng: 'en',
        defaultNS: 'common',
        ns: ['common'],
        
        // Language detection options (browser-only)
        detection: {
          order: ['localStorage', 'navigator', 'htmlTag'],
          caches: ['localStorage'],
        },
        
        // Interpolation options
        interpolation: {
          escapeValue: false, // React already does escaping
        },
        
        // Debug mode (disable in production)
        debug: process.env.NODE_ENV === 'development',
      });
  }
}

export default i18n;
