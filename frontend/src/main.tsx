import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import '@/index.css'
import '@/i18n/config' // Initialize i18n
import App from '@/App'
import { AuthProvider } from '@/context/AuthContext'
import { NotificationsProvider } from '@/context/NotificationsContext'

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <NotificationsProvider>
          <App />
        </NotificationsProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
)

