import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import './types'; // Import type definitions for TypeScript support

// Import Vietnamese translations
import viCommon from './locales/vi/common.json';
import viAuth from './locales/vi/auth.json';
import viMenu from './locales/vi/menu.json';
import viDashboard from './locales/vi/dashboard.json';
import viErrors from './locales/vi/errors.json';
import viValidation from './locales/vi/validation.json';

// Import English translations
import enCommon from './locales/en/common.json';
import enAuth from './locales/en/auth.json';
import enMenu from './locales/en/menu.json';
import enDashboard from './locales/en/dashboard.json';
import enErrors from './locales/en/errors.json';
import enValidation from './locales/en/validation.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      vi: {
        common: viCommon,
        auth: viAuth,
        menu: viMenu,
        dashboard: viDashboard,
        errors: viErrors,
        validation: viValidation,
      },
      en: {
        common: enCommon,
        auth: enAuth,
        menu: enMenu,
        dashboard: enDashboard,
        errors: enErrors,
        validation: enValidation,
      },
    },
    fallbackLng: 'vi',
    defaultNS: 'common',
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },
  });

export default i18n;

