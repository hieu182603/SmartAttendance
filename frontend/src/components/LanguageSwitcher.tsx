import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';

const languages = [
  { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'en', name: 'English', flag: '🇺🇸' },
];

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const toggleLanguage = () => {
    // Toggle between 'vi' and 'en'
    const currentLang = i18n.language;
    const newLang = currentLang === 'vi' ? 'en' : 'vi';
    i18n.changeLanguage(newLang);
  };

  // Get current language info
  const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0];

  return (
    <Button
      onClick={toggleLanguage}
      variant="outline"
      size="icon"
      className="group relative w-7 h-7 rounded-full bg-gradient-to-br from-[var(--primary)]/10 via-[var(--accent-cyan)]/10 to-[var(--primary)]/10 border border-[var(--border)] hover:border-[var(--accent-cyan)] hover:shadow-lg hover:shadow-[var(--accent-cyan)]/20 transition-all duration-300 overflow-hidden"
      title={`Switch to ${currentLanguage.code === 'vi' ? 'English' : 'Tiếng Việt'}`}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-[var(--primary)] to-[var(--accent-cyan)] opacity-0 group-hover:opacity-10 transition-opacity duration-300" />
      <div className="relative flex items-center justify-center">
        <span className="text-sm group-hover:scale-110 transition-transform duration-300">
          {currentLanguage.flag}
        </span>
      </div>
      <span className="sr-only">Toggle language</span>
    </Button>
  );
}
