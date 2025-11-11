import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card'
import { useAuth } from '../../../context/AuthContext'

export default function ProfilePage() {
  const { user } = useAuth()

  return (
    <div className="space-y-6">
      <Card className="bg-[var(--surface)] border-[var(--border)]">
        <CardHeader>
          <CardTitle className="text-[var(--text-main)]">Hồ sơ cá nhân</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-[var(--text-sub)] mb-1">Tên</p>
            <p className="text-[var(--text-main)]">{user?.name || 'Chưa có thông tin'}</p>
          </div>
          <div>
            <p className="text-sm text-[var(--text-sub)] mb-1">Email</p>
            <p className="text-[var(--text-main)]">{user?.email || 'Chưa có thông tin'}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

