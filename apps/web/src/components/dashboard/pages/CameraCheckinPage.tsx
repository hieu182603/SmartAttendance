import React from 'react'
import { useTranslation } from 'react-i18next'
import { Camera } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const CameraCheckinPage: React.FC = () => {
  const { t } = useTranslation('dashboard')
  
  return (
    <Card className="border-[var(--border)] bg-[var(--surface)]">
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="text-[var(--text-main)]">{t('camera.title')}</CardTitle>
        <p className="text-sm text-[var(--text-sub)]">{t('camera.description')}</p>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-5 py-10 text-center">
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--shell)]/60 p-6 text-[var(--accent-cyan)] shadow-inner">
          <Camera className="h-12 w-12" />
        </div>
        <div className="space-y-3">
          <p className="text-lg font-semibold text-[var(--text-main)]">
            {t('camera.notReady')}
          </p>
          <p className="text-sm leading-relaxed text-[var(--text-sub)]">
            {t('camera.instructions')}
          </p>
        </div>
        <button className="rounded-xl border border-[var(--accent-cyan)] px-5 py-3 text-sm font-medium text-[var(--accent-cyan)] transition hover:bg-[var(--accent-cyan)]/10">
          {t('camera.checkConfig')}
        </button>
      </CardContent>
    </Card>
  )
}

export default CameraCheckinPage




