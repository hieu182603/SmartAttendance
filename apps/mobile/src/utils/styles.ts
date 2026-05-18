import { StyleSheet, Dimensions } from 'react-native';
import { usePreferences } from '../context/PreferencesContext';
import { useMemo } from 'react';

const { width, height } = Dimensions.get('window');

// ──────────────────────────────────────────────────────────
// Static COLORS — kept as default dark theme for backward compatibility
// ──────────────────────────────────────────────────────────
export const COLORS = {
  // Primary colors
  primary: '#4F6EF7',
  primaryDark: '#2a4dd7',
  primaryLight: '#7B95FF',
  primarySoft: '#EEF1FF',

  // Background colors
  background: {
    light: '#f6f6f8',
    dark: '#101122',
  },

  // Surface colors
  surface: {
    dark: '#1e1f3a',
    darker: '#17182e',
    light: '#ffffff',
  },

  // Accent colors
  accent: {
    cyan: '#06b6d4',
    green: '#0bda68',
    yellow: '#f59e0b',
    red: '#ef4444',
    purple: '#a855f7',
  },

  // Text colors
  text: {
    primary: '#ffffff',
    secondary: '#9293c9',
    muted: '#666666',
  },

  // Status colors
  status: {
    success: '#0bda68',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#06b6d4',
  },
};

// ──────────────────────────────────────────────────────────
// Theme-aware colors
// ──────────────────────────────────────────────────────────
export interface ThemeColors {
  primary: string;
  primaryDark: string;
  primaryLight: string;
  primarySoft: string;
  outline: string;
  background: string;
  surface: string;
  surfaceDarker: string;
  text: {
    primary: string;
    secondary: string;
    muted: string;
  };
  accent: typeof COLORS.accent;
  status: typeof COLORS.status;
  cardBg: string;
  cardBorder: string;
  glassPanel: string;
  divider: string;
  inputBg: string;
  inputBorder: string;
}

const DARK_THEME: ThemeColors = {
  primary: '#4F6EF7',
  primaryDark: '#2a4dd7',
  primaryLight: '#7B95FF',
  primarySoft: '#1e2a5e',
  outline: 'rgba(255, 255, 255, 0.12)',
  background: '#101122',
  surface: '#1e1f3a',
  surfaceDarker: '#17182e',
  text: {
    primary: '#ffffff',
    secondary: '#9293c9',
    muted: '#666666',
  },
  accent: COLORS.accent,
  status: COLORS.status,
  cardBg: 'rgba(30, 41, 59, 0.6)',
  cardBorder: 'rgba(148, 163, 184, 0.1)',
  glassPanel: 'rgba(30, 31, 58, 0.6)',
  divider: 'rgba(148, 163, 184, 0.1)',
  inputBg: '#17182e',
  inputBorder: 'rgba(255, 255, 255, 0.1)',
};

const LIGHT_THEME: ThemeColors = {
  primary: '#4F6EF7',
  primaryDark: '#2a4dd7',
  primaryLight: '#7B95FF',
  primarySoft: '#EEF1FF',
  outline: '#e5e7eb',
  background: '#f3f4f8',
  surface: '#ffffff',
  surfaceDarker: '#f0f1f5',
  text: {
    primary: '#191c1e',
    secondary: '#444654',
    muted: '#9ca3af',
  },
  accent: COLORS.accent,
  status: COLORS.status,
  cardBg: '#ffffff',
  cardBorder: '#e5e7eb',
  glassPanel: 'rgba(255, 255, 255, 0.8)',
  divider: '#e5e7eb',
  inputBg: '#ffffff',
  inputBorder: '#e5e7eb',
};

/**
 * Hook that returns theme-aware colors based on user preference.
 * Use in any screen/component:
 *   const theme = useTheme();
 *   style={{ backgroundColor: theme.background }}
 */
export function useTheme(): ThemeColors {
  const { isDarkMode } = usePreferences();
  return useMemo(() => (isDarkMode ? DARK_THEME : LIGHT_THEME), [isDarkMode]);
}

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const FONT_SIZES = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const BORDER_RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 9999,
};

export const SHADOWS = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
    elevation: 3,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.30,
    shadowRadius: 4.65,
    elevation: 8,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.34,
    shadowRadius: 6.27,
    elevation: 10,
  },
};

export const globalStyles = StyleSheet.create({
  // Layout
  container: {
    flex: 1,
    backgroundColor: COLORS.background.light,
  },

  // Glass morphism effect
  glassPanel: {
    backgroundColor: 'rgba(30, 31, 58, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },

  // Cards
  card: {
    backgroundColor: COLORS.surface.dark,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    margin: SPACING.md,
    ...SHADOWS.md,
  },

  // Text styles
  heading1: {
    fontSize: FONT_SIZES.xxxl,
    fontWeight: 'bold',
    color: COLORS.text.primary,
  },

  heading2: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: 'bold',
    color: COLORS.text.primary,
  },

  heading3: {
    fontSize: FONT_SIZES.xl,
    fontWeight: 'bold',
    color: COLORS.text.primary,
  },

  body: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text.primary,
  },

  bodySecondary: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text.secondary,
  },

  caption: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.secondary,
  },

  // Buttons
  primaryButton: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.lg,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },

  primaryButtonText: {
    color: COLORS.text.primary,
    fontSize: FONT_SIZES.md,
    fontWeight: 'bold',
  },

  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.lg,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },

  secondaryButtonText: {
    color: COLORS.primary,
    fontSize: FONT_SIZES.md,
    fontWeight: 'bold',
  },

  // Inputs
  input: {
    backgroundColor: COLORS.surface.darker,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: BORDER_RADIUS.lg,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    color: COLORS.text.primary,
    fontSize: FONT_SIZES.md,
  },

  inputFocused: {
    borderColor: COLORS.primary,
  },

  // Status indicators
  statusBadge: {
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    alignSelf: 'flex-start',
  },

  statusText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },

  // Utilities
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  spaceBetween: {
    justifyContent: 'space-between',
  },

  fullWidth: {
    width: '100%',
  },

  // Screen dimensions
  screen: {
    width,
    height,
  },
});

