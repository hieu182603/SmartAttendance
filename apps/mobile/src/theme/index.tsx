import React, { createContext, useContext, useMemo, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import tokens from './tokens.json';

// ─── Types ────────────────────────────────────────────────────────────────────

type ColorMode = 'light' | 'dark';

export interface Theme {
  mode: ColorMode;
  colors: typeof tokens.light;
  radius: typeof tokens.radius;
  spacing: typeof tokens.spacing;
  typography: typeof tokens.typography;
  shadow: typeof tokens.shadow;
  primitive: typeof tokens.primitive;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const ThemeContext = createContext<Theme | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ThemeProvider({ children, forcedMode }: {
  children: ReactNode;
  forcedMode?: ColorMode;
}) {
  const systemScheme = useColorScheme();
  const mode: ColorMode = forcedMode ?? (systemScheme === 'dark' ? 'dark' : 'light');

  const theme = useMemo<Theme>(
    () => ({
      mode,
      colors: mode === 'dark' ? tokens.dark : tokens.light,
      radius: tokens.radius,
      spacing: tokens.spacing,
      typography: tokens.typography,
      shadow: tokens.shadow,
      primitive: tokens.primitive,
    }),
    [mode],
  );

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useTheme(): Theme {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
  return ctx;
}
