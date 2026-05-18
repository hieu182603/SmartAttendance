/**
 * Type definitions for i18next translations
 * This file provides type safety for translation keys
 */

import 'i18next';

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common';
    // Strict resource typing disabled — vi/dashboard.json union is too large
    // for TypeScript to resolve within depth limits, causing false-positive TS2345
    // errors on keys that actually exist. Namespaces are still enforced at runtime.
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

























