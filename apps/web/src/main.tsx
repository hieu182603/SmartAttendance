import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import '@/index.css'
import '@/i18n/config' // Initialize i18n
import App from '@/App'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { AuthProvider } from '@/context/AuthContext'
import { NotificationsProvider } from '@/context/NotificationsContext'
import { PermissionsProvider } from '@/context/PermissionsContext'
import { SuperAdminProvider } from '@/context/SuperAdminContext'

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <PermissionsProvider>
            <SuperAdminProvider>
              <NotificationsProvider>
                <App />
              </NotificationsProvider>
            </SuperAdminProvider>
          </PermissionsProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
)

