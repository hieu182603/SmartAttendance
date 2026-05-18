import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface PreferencesContextType {
    isDarkMode: boolean;
    toggleDarkMode: () => void;
    notificationsEnabled: boolean;
    toggleNotifications: () => void;
    biometricEnabled: boolean;
    toggleBiometric: () => void;
    language: 'vi' | 'en';
    setLanguage: (lang: 'vi' | 'en') => void;
}

const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined);

export const PreferencesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);
    const [biometricEnabled, setBiometricEnabled] = useState(false);
    const [language, setLanguage] = useState<'vi' | 'en'>('vi');

    // Load preferences on mount
    useEffect(() => {
        const loadPreferences = async () => {
            try {
                const storedDarkMode = await AsyncStorage.getItem('settings_darkMode');
                const storedNotifications = await AsyncStorage.getItem('settings_notifications');
                const storedBiometric = await AsyncStorage.getItem('settings_biometric');
                const storedLanguage = await AsyncStorage.getItem('settings_language');

                if (storedDarkMode !== null) setIsDarkMode(JSON.parse(storedDarkMode));
                if (storedNotifications !== null) setNotificationsEnabled(JSON.parse(storedNotifications));
                if (storedBiometric !== null) setBiometricEnabled(JSON.parse(storedBiometric));
                if (storedLanguage !== null) setLanguage(storedLanguage as 'vi' | 'en');
            } catch (error) {
                console.error('Error loading preferences:', error);
            }
        };
        loadPreferences();
    }, []);

    const toggleDarkMode = async () => {
        try {
            const newValue = !isDarkMode;
            setIsDarkMode(newValue);
            await AsyncStorage.setItem('settings_darkMode', JSON.stringify(newValue));
        } catch (error) {
            console.error('Error saving dark mode preference:', error);
        }
    };

    const toggleNotifications = async () => {
        try {
            const newValue = !notificationsEnabled;
            setNotificationsEnabled(newValue);
            await AsyncStorage.setItem('settings_notifications', JSON.stringify(newValue));
        } catch (error) {
            console.error('Error saving notifications preference:', error);
        }
    };

    const toggleBiometric = async () => {
        try {
            const newValue = !biometricEnabled;
            setBiometricEnabled(newValue);
            await AsyncStorage.setItem('settings_biometric', JSON.stringify(newValue));
        } catch (error) {
            console.error('Error saving biometric preference:', error);
        }
    };

    const updateLanguage = async (lang: 'vi' | 'en') => {
        try {
            setLanguage(lang);
            await AsyncStorage.setItem('settings_language', lang);
        } catch (error) {
            console.error('Error saving language preference:', error);
        }
    };

    return (
        <PreferencesContext.Provider
            value={{
                isDarkMode,
                toggleDarkMode,
                notificationsEnabled,
                toggleNotifications,
                biometricEnabled,
                toggleBiometric,
                language,
                setLanguage: updateLanguage,
            }}
        >
            {children}
        </PreferencesContext.Provider>
    );
};

export const usePreferences = () => {
    const context = useContext(PreferencesContext);
    if (context === undefined) {
        throw new Error('usePreferences must be used within a PreferencesProvider');
    }
    return context;
};
