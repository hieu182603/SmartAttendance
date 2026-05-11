import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  Monitor,
  RefreshCw,
  LogOut,
  User,
  Clock,
  Globe,
  Shield,
  AlertTriangle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { getAdminSessions, forceLogoutUser, type ActiveSession } from '@/services/authService';

const ROLE_BADGE: Record<string, 'default' | 'warning' | 'error' | 'success' | 'outline'> = {
  SUPER_ADMIN: 'error',
  ADMIN: 'warning',
  HR_MANAGER: 'warning',
  MANAGER: 'default',
  SUPERVISOR: 'default',
  EMPLOYEE: 'outline',
};

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Quản trị viên',
  HR_MANAGER: 'Quản lý HR',
  MANAGER: 'Quản lý',
  SUPERVISOR: 'Giám sát',
  EMPLOYEE: 'Nhân viên',
};

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function ActiveSessionsPage() {
  const { t } = useTranslation(['dashboard']);
  const { user: currentUser } = useAuth();
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [logoutingId, setLogoutingId] = useState<string | null>(null);
  const [sessionsNote, setSessionsNote] = useState<string | null>(null);

  function parseUserAgent(ua: string | null): string {
    if (!ua) return t('dashboard:activeSessionsPage.device.unknown');
    if (/mobile/i.test(ua)) return t('dashboard:activeSessionsPage.device.mobile');
    if (/tablet/i.test(ua)) return t('dashboard:activeSessionsPage.device.tablet');
    return t('dashboard:activeSessionsPage.device.desktop');
  }

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    setSessionsNote(null);
    try {
      const { sessions, sessionsUnavailableReason, message } = await getAdminSessions();
      setSessions(sessions);
      if (sessionsUnavailableReason === 'REDIS_DISABLED') {
        setSessionsNote(message ?? 'Theo dõi phiên đăng nhập cần Redis. Cấu hình REDIS_URL hoặc REDIS_HOST trên backend.');
      }
    } catch {
      toast.error(t('dashboard:activeSessionsPage.toasts.loadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  const handleForceLogout = async (session: ActiveSession) => {
    if (!confirm(t('dashboard:activeSessionsPage.confirmLogout', { name: session.userName }))) return;
    setLogoutingId(session.userId);
    try {
      await forceLogoutUser(session.userId);
      toast.success(t('dashboard:activeSessionsPage.toasts.logoutSuccess', { name: session.userName }));
      setSessions(prev => prev.filter(s => s.userId !== session.userId));
    } catch {
      toast.error(t('dashboard:activeSessionsPage.toasts.logoutError'));
    } finally {
      setLogoutingId(null);
    }
  };

  const isSelf = (session: ActiveSession) =>
    session.userId === (currentUser as any)?.id || session.userId === (currentUser as any)?._id;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 p-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-(--text-primary) flex items-center gap-2">
            <Monitor className="h-6 w-6 text-(--primary)" />
            {t('dashboard:activeSessionsPage.title')}
          </h1>
          <p className="text-sm text-(--text-sub) mt-1">
            {t('dashboard:activeSessionsPage.subtitle')}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => { void fetchSessions(); }} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          {t('dashboard:activeSessionsPage.refresh')}
        </Button>
      </div>

      {sessionsNote && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          {sessionsNote}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-(--text-sub)">
              {t('dashboard:activeSessionsPage.stats.online')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-(--text-primary)">{sessions.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-(--text-sub) flex items-center gap-1">
              <Shield className="h-4 w-4 text-orange-500" />
              {t('dashboard:activeSessionsPage.stats.adminOnline')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">
              {sessions.filter(s => ['ADMIN', 'SUPER_ADMIN', 'HR_MANAGER'].includes(s.userRole)).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-(--text-sub) flex items-center gap-1">
              <AlertTriangle className="h-4 w-4 text-(--text-sub)" />
              {t('dashboard:activeSessionsPage.stats.employeeOnline')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-(--text-primary)">
              {sessions.filter(s => s.userRole === 'EMPLOYEE').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('dashboard:activeSessionsPage.table.user')}</TableHead>
                <TableHead>{t('dashboard:activeSessionsPage.table.role')}</TableHead>
                <TableHead>{t('dashboard:activeSessionsPage.table.loginAt')}</TableHead>
                <TableHead>{t('dashboard:activeSessionsPage.table.device')}</TableHead>
                <TableHead>{t('dashboard:activeSessionsPage.table.ip')}</TableHead>
                <TableHead className="text-right">{t('dashboard:activeSessionsPage.table.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-(--text-sub)">
                    {t('dashboard:activeSessionsPage.table.loading')}
                  </TableCell>
                </TableRow>
              )}
              {!loading && sessions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-(--text-sub)">
                    {t('dashboard:activeSessionsPage.table.empty')}
                  </TableCell>
                </TableRow>
              )}
              {!loading && sessions.map(session => (
                <TableRow key={session.userId} className={isSelf(session) ? 'bg-blue-50 dark:bg-blue-950/20' : ''}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-(--muted) flex items-center justify-center">
                        <User className="h-4 w-4 text-(--text-sub)" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-(--text-primary)">
                          {session.userName}
                          {isSelf(session) && (
                            <span className="ml-2 text-xs text-blue-500">
                              {t('dashboard:activeSessionsPage.self')}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-(--text-sub)">{session.userEmail}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={ROLE_BADGE[session.userRole] || 'outline'}>
                      {ROLE_LABELS[session.userRole] || session.userRole}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm text-(--text-sub)">
                      <Clock className="h-3 w-3" />
                      {formatTime(session.loginAt)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm text-(--text-sub)">
                      <Monitor className="h-3 w-3" />
                      {parseUserAgent(session.userAgent)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm text-(--text-sub)">
                      <Globe className="h-3 w-3" />
                      {session.ipAddress || '—'}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    {!isSelf(session) && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 border-red-300 hover:bg-red-50"
                        onClick={() => handleForceLogout(session)}
                        disabled={logoutingId === session.userId}
                      >
                        <LogOut className="h-3 w-3 mr-1" />
                        {logoutingId === session.userId
                          ? t('dashboard:common.loading', 'Đang xử lý...')
                          : t('dashboard:activeSessionsPage.forceLogout')}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </motion.div>
  );
}
