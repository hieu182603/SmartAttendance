import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  useFonts,
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
} from '@expo-google-fonts/outfit';
import AppNavigator from './src/navigation/AppNavigator';
import { globalStyles } from './src/utils/styles';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { SocketProvider } from './src/context/SocketContext';
import { PreferencesProvider } from './src/context/PreferencesContext';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,       // 5 minutes
      gcTime: 24 * 60 * 60 * 1000,     // 24 hours
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'SMARTATTENDANCE_QUERY_CACHE',
});

function AppContent() {
  const { userRole, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={[globalStyles.container, globalStyles.center]}>
        <ActivityIndicator size="large" color="#4F6EF7" />
      </View>
    );
  }

  return <AppNavigator userRole={userRole || undefined} isLoading={isLoading} />;
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
  });

  if (!fontsLoaded) {
    return (
      <View style={[globalStyles.container, globalStyles.center]}>
        <ActivityIndicator size="large" color="#4F6EF7" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{ persister: asyncStoragePersister }}
      >
        <PreferencesProvider>
          <AuthProvider>
            <SocketProvider>
              <View style={globalStyles.container}>
                <StatusBar style="auto" />
                <AppContent />
              </View>
            </SocketProvider>
          </AuthProvider>
        </PreferencesProvider>
      </PersistQueryClientProvider>
    </SafeAreaProvider>
  );
}
