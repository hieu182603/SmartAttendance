import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Languages, Check } from 'lucide-react';
import { Button } from './ui/button';

const languages = [
  { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'en', name: 'English', flag: '🇺🇸' },
];

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const changeLanguage = (langCode: string) => {
    i18n.changeLanguage(langCode);
    setIsOpen(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        onClick={() => setIsOpen(!isOpen)}
        variant="outline"
        size="icon"
        className="w-10 h-10 rounded-full bg-[var(--surface)] border-[var(--border)] hover:bg-[var(--surface)] hover:border-[var(--accent-cyan)] transition-all"
      >
        <Languages className="h-4 w-4 text-[var(--text-main)]" />
        <span className="sr-only">Change language</span>
      </Button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 rounded-lg bg-[var(--surface)] border border-[var(--border)] shadow-lg z-50 overflow-hidden">
          {languages.map((language) => (
            <button
              key={language.code}
              onClick={() => changeLanguage(language.code)}
              className={`w-full flex items-center justify-between px-4 py-2 text-sm hover:bg-[var(--primary)]/10 transition-colors ${
                i18n.language === language.code ? 'bg-[var(--primary)]/10' : ''
              }`}
            >
              <div className="flex items-center space-x-2">
                <span className="text-lg">{language.flag}</span>
                <span className="font-medium text-[var(--text-main)]">{language.name}</span>
              </div>
              {i18n.language === language.code && (
                <Check className="h-4 w-4 text-[var(--primary)]" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

