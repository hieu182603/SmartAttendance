import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import '@/i18n/types'; // Import type definitions for TypeScript support

// Ngôn ngữ mặc định (vi) được bundle tĩnh để render ngay, không chờ tải.
import viCommon from '@/i18n/locales/vi/common.json';
import viAuth from '@/i18n/locales/vi/auth.json';
import viMenu from '@/i18n/locales/vi/menu.json';
import viDashboard from '@/i18n/locales/vi/dashboard.json';
import viErrors from '@/i18n/locales/vi/errors.json';
import viValidation from '@/i18n/locales/vi/validation.json';

// Tiếng Anh (đặc biệt dashboard.json ~81KB) được TÁCH khỏi bundle entry và
// chỉ tải khi người dùng thực sự chuyển sang English → giảm kích thước first paint.
let enLoading: Promise<void> | null = null;
const loadEnglish = (): Promise<void> => {
  if (i18n.hasResourceBundle('en', 'dashboard')) return Promise.resolve();
  if (enLoading) return enLoading;
  enLoading = Promise.all([
    import('@/i18n/locales/en/common.json'),
    import('@/i18n/locales/en/auth.json'),
    import('@/i18n/locales/en/menu.json'),
    import('@/i18n/locales/en/dashboard.json'),
    import('@/i18n/locales/en/errors.json'),
    import('@/i18n/locales/en/validation.json'),
  ]).then(([common, auth, menu, dashboard, errors, validation]) => {
    i18n.addResourceBundle('en', 'common', common.default, true, true);
    i18n.addResourceBundle('en', 'auth', auth.default, true, true);
    i18n.addResourceBundle('en', 'menu', menu.default, true, true);
    i18n.addResourceBundle('en', 'dashboard', dashboard.default, true, true);
    i18n.addResourceBundle('en', 'errors', errors.default, true, true);
    i18n.addResourceBundle('en', 'validation', validation.default, true, true);
    // Re-render với bản dịch en vừa nạp
    return i18n.changeLanguage('en').then(() => undefined);
  });
  return enLoading;
};

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

// Tải en khi: (a) ngôn ngữ đã lưu/được phát hiện là en lúc khởi động,
// (b) người dùng chuyển sang en sau đó.
if (i18n.language?.startsWith('en')) {
  loadEnglish();
}
i18n.on('languageChanged', (lng) => {
  if (lng?.startsWith('en') && !i18n.hasResourceBundle('en', 'dashboard')) {
    loadEnglish();
  }
});

export default i18n;
