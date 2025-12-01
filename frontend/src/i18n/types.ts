/**
 * Type definitions for i18next translations
 * This file provides type safety for translation keys
 */

import 'i18next';
import viCommon from './locales/vi/common.json';
import viAuth from './locales/vi/auth.json';
import viMenu from './locales/vi/menu.json';
import viDashboard from './locales/vi/dashboard.json';
import viErrors from './locales/vi/errors.json';
import viValidation from './locales/vi/validation.json';

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common';
    resources: {
      common: typeof viCommon;
      auth: typeof viAuth;
      menu: typeof viMenu;
      dashboard: typeof viDashboard;
      errors: typeof viErrors;
      validation: typeof viValidation;
    };
  }
}

/**
 * Helper type for translation keys
 * Usage: TranslationKey<'common:buttons.submit'>
 */
export type TranslationKey<T extends string = string> = T;

/**
 * Namespace types for better autocomplete
 */
export type CommonNamespace = 'common';
export type AuthNamespace = 'auth';
export type MenuNamespace = 'menu';
export type DashboardNamespace = 'dashboard';
export type ErrorsNamespace = 'errors';
export type ValidationNamespace = 'validation';

export type AllNamespaces = 
  | CommonNamespace 
  | AuthNamespace 
  | MenuNamespace 
  | DashboardNamespace 
  | ErrorsNamespace 
  | ValidationNamespace;

