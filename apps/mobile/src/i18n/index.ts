import { useMemo } from 'react';
import { usePreferences } from '../context/PreferencesContext';
import { vi, Translations } from './vi';
import { en } from './en';

const translations: Record<string, Translations> = { vi, en };

/**
 * Hook that returns the translation object for the current language.
 *
 * Usage:
 *   const { t } = useTranslation();
 *   t.dashboard.title  // → "Trang chủ" or "Home"
 */
export function useTranslation() {
    const { language } = usePreferences();

    const t = useMemo(() => {
        return translations[language] || vi;
    }, [language]);

    return { t, language };
}

export type { Translations };
