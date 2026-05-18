import { useMemo } from 'react';
import { usePreferences } from '../context/PreferencesContext';
import { lightColors, darkColors, ThemeColors } from './colors';

export { ThemeColors };

export function useTheme() {
  const { isDarkMode } = usePreferences();
  const colors = useMemo(() => (isDarkMode ? darkColors : lightColors), [isDarkMode]);
  return { colors, isDark: isDarkMode };
}
