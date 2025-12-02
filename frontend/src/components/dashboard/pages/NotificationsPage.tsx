import React from 'react'
import { useTranslation } from 'react-i18next'
import { Bell } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const NotificationsPage: React.FC = () => {
  const { t } = useTranslation('dashboard')
  
  return (
    <Card className="border-[var(--border)] bg-[var(--surface)]">
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="text-[var(--text-main)]">{t('notifications.title')}</CardTitle>
        <button className="rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-medium text-[var(--text-sub)] transition hover:border-[var(--accent-cyan)] hover:text-[var(--accent-cyan)]">
          {t('notifications.markAsRead')}
        </button>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-5 py-10 text-center">
        <div className="rounded-full bg-[var(--warning)]/15 p-4 text-[var(--warning)]">
          <Bell className="h-10 w-10" />
        </div>
        <div className="space-y-2">
          <p className="text-lg font-semibold text-[var(--text-main)]">{t('notifications.noNotifications')}</p>
          <p className="text-sm leading-relaxed text-[var(--text-sub)]">
            {t('notifications.description')}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

export default NotificationsPage




