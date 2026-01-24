import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '@/index.css'
import '@/i18n/config' // Initialize i18n
import App from '@/App'
import { AuthProvider } from '@/context/AuthContext'
import { NotificationsProvider } from '@/context/NotificationsContext'
import { initWebVitals } from '@/utils/vitals'

// Add dynamic resource hint for backend API to optimize connection setup
const addApiResourceHint = () => {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000';
  try {
    const url = new URL(apiUrl);
    // Only add if it's a different origin
    if (url.origin !== window.location.origin) {
      const link = document.createElement('link');
      link.rel = 'preconnect';
      link.href = url.origin;
      link.crossOrigin = 'anonymous';
      document.head.appendChild(link);
    }
  } catch {
    // Invalid URL, skip resource hint
  }
};

// Initialize resource hints after DOM is ready
if (typeof window !== 'undefined') {
  addApiResourceHint();
}

// Configure React Query client with optimized defaults
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60000, // 1 minute - data is fresh for 1 minute
      gcTime: 300000, // 5 minutes - cache time (formerly cacheTime)
      refetchOnWindowFocus: false, // Don't refetch on window focus
      refetchOnReconnect: true, // Refetch on reconnect
      retry: 1, // Retry failed requests once
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: 1,
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <NotificationsProvider>
            <App />
          </NotificationsProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
)

// Initialize Web Vitals monitoring after app render
initWebVitals()

