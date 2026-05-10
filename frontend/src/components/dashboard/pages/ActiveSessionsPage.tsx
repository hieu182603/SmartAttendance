import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
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

function parseUserAgent(ua: string | null): string {
  if (!ua) return 'Không xác định';
  if (/mobile/i.test(ua)) return 'Di động';
  if (/tablet/i.test(ua)) return 'Máy tính bảng';
  return 'Máy tính';
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function ActiveSessionsPage() {
  const { user: currentUser } = useAuth();
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [logoutingId, setLogoutingId] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAdminSessions();
      setSessions(data);
    } catch {
      toast.error('Không thể tải danh sách sessions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  const handleForceLogout = async (session: ActiveSession) => {
    if (!confirm(`Bạn chắc chắn muốn đăng xuất ${session.userName}?`)) return;
    setLogoutingId(session.userId);
    try {
      await forceLogoutUser(session.userId);
      toast.success(`Đã đăng xuất ${session.userName}`);
      setSessions(prev => prev.filter(s => s.userId !== session.userId));
    } catch {
      toast.error('Không thể force logout');
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
            Phiên đăng nhập đang hoạt động
          </h1>
          <p className="text-sm text-(--text-sub) mt-1">
            Quản lý các phiên đang online và buộc đăng xuất khi cần
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchSessions} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Làm mới
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-(--text-sub)">Đang online</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-(--text-primary)">{sessions.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-(--text-sub) flex items-center gap-1">
              <Shield className="h-4 w-4 text-orange-500" />
              Admin đang online
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
              Nhân viên đang online
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
                <TableHead>Người dùng</TableHead>
                <TableHead>Vai trò</TableHead>
                <TableHead>Đăng nhập lúc</TableHead>
                <TableHead>Thiết bị</TableHead>
                <TableHead>IP</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-(--text-sub)">
                    Đang tải...
                  </TableCell>
                </TableRow>
              )}
              {!loading && sessions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-(--text-sub)">
                    Không có phiên đăng nhập nào
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
                            <span className="ml-2 text-xs text-blue-500">(bạn)</span>
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
                        {logoutingId === session.userId ? 'Đang xử lý...' : 'Đăng xuất'}
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
