import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  ScanFace,
  AlertTriangle,
  ShieldAlert,
  WifiOff,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  User,
  Clock,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { getAllLogs, type AuditLog } from '@/services/logService';

const ACTION_LABELS: Record<string, string> = {
  face_scan_failed: 'Xác thực thất bại',
  face_spoof_detected: 'Phát hiện giả mạo',
};

const ACTION_BADGE: Record<string, 'error' | 'warning' | 'outline'> = {
  face_scan_failed: 'warning',
  face_spoof_detected: 'error',
};

const ERROR_CODE_LABELS: Record<string, string> = {
  FACE_VERIFICATION_FAILED: 'Không khớp khuôn mặt',
  SPOOF_DETECTED: 'Phát hiện giả mạo',
  AI_SERVICE_UNAVAILABLE: 'Dịch vụ AI không khả dụng',
  AI_SERVICE_TIMEOUT: 'Dịch vụ AI timeout',
};

interface FaceLog extends AuditLog {
  metadata: {
    errorCode?: string;
    failCount?: number;
    requireOtpFallback?: boolean;
    confidence?: number;
    threshold?: number;
  };
}

export default function FaceRecognitionLogPage() {
  const [logs, setLogs] = useState<FaceLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterAction, setFilterAction] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 0 });

  const [stats, setStats] = useState({ total: 0, spoofed: 0, verifyFailed: 0, serviceErrors: 0 });

  const fetchLogs = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = {
        category: 'face_recognition',
        page,
        limit: 20,
        status: 'failed',
      };
      if (filterAction !== 'all') params.action = filterAction;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const res = await getAllLogs(params as any);
      setLogs(res.logs as FaceLog[]);
      setPagination({ total: res.pagination.total, totalPages: res.pagination.totalPages });

      // Compute stats from all logs (separate call without action filter)
      const allRes = await getAllLogs({ category: 'face_recognition', status: 'failed', limit: 1000 } as any);
      const allLogs = allRes.logs as FaceLog[];
      setStats({
        total: allLogs.length,
        spoofed: allLogs.filter(l => l.action === 'face_spoof_detected').length,
        verifyFailed: allLogs.filter(l => l.metadata?.errorCode === 'FACE_VERIFICATION_FAILED').length,
        serviceErrors: allLogs.filter(l =>
          l.metadata?.errorCode === 'AI_SERVICE_UNAVAILABLE' || l.metadata?.errorCode === 'AI_SERVICE_TIMEOUT'
        ).length,
      });
    } finally {
      setLoading(false);
    }
  }, [filterAction, startDate, endDate]);

  useEffect(() => {
    setCurrentPage(1);
    fetchLogs(1);
  }, [fetchLogs]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    fetchLogs(page);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 p-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-(--text-primary) flex items-center gap-2">
            <ScanFace className="h-6 w-6 text-(--primary)" />
            Nhật ký xác thực khuôn mặt
          </h1>
          <p className="text-sm text-(--text-sub) mt-1">
            Theo dõi các lần xác thực thất bại và cảnh báo bảo mật
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => fetchLogs(currentPage)} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Làm mới
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-(--text-sub)">Tổng lỗi</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-(--text-primary)">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-(--text-sub) flex items-center gap-1">
              <ShieldAlert className="h-4 w-4 text-red-500" />
              Giả mạo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{stats.spoofed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-(--text-sub) flex items-center gap-1">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              Không khớp
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{stats.verifyFailed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-(--text-sub) flex items-center gap-1">
              <WifiOff className="h-4 w-4 text-(--text-sub)" />
              Lỗi dịch vụ
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-(--text-primary)">{stats.serviceErrors}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="w-48">
          <Select value={filterAction} onValueChange={setFilterAction}>
            <SelectTrigger>
              <SelectValue placeholder="Loại sự kiện" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              <SelectItem value="face_scan_failed">Xác thực thất bại</SelectItem>
              <SelectItem value="face_spoof_detected">Phát hiện giả mạo</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2 items-center">
          <Input
            type="date"
            className="w-36 text-sm"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
          />
          <span className="text-(--text-sub) text-sm">—</span>
          <Input
            type="date"
            className="w-36 text-sm"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Thời gian</TableHead>
                <TableHead>Nhân viên</TableHead>
                <TableHead>Loại lỗi</TableHead>
                <TableHead>Mã lỗi</TableHead>
                <TableHead>Lần thất bại</TableHead>
                <TableHead>OTP Fallback</TableHead>
                <TableHead>IP</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-(--text-sub)">
                    Đang tải...
                  </TableCell>
                </TableRow>
              )}
              {!loading && logs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-(--text-sub)">
                    Không có dữ liệu
                  </TableCell>
                </TableRow>
              )}
              {!loading && logs.map(log => (
                <TableRow
                  key={log.id}
                  className={log.action === 'face_spoof_detected' ? 'bg-red-50 dark:bg-red-950/20' : ''}
                >
                  <TableCell className="text-sm whitespace-nowrap">
                    <div className="flex items-center gap-1 text-(--text-sub)">
                      <Clock className="h-3 w-3" />
                      {log.timestamp}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-(--text-sub)" />
                      <div>
                        <div className="text-sm font-medium text-(--text-primary)">{log.userName}</div>
                        <div className="text-xs text-(--text-sub)">{log.userRole}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={ACTION_BADGE[log.action] || 'outline'}>
                      {ACTION_LABELS[log.action] || log.action}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-(--text-sub)">
                    {ERROR_CODE_LABELS[log.metadata?.errorCode || ''] || log.metadata?.errorCode || '—'}
                  </TableCell>
                  <TableCell className="text-sm text-center">
                    {log.metadata?.failCount != null ? (
                      <span className={log.metadata.failCount >= 3 ? 'text-red-500 font-semibold' : ''}>
                        {log.metadata.failCount}
                      </span>
                    ) : '—'}
                  </TableCell>
                  <TableCell>
                    {log.metadata?.requireOtpFallback ? (
                      <Badge variant="outline" className="text-orange-600 border-orange-400">Đã gửi OTP</Badge>
                    ) : '—'}
                  </TableCell>
                  <TableCell className="text-sm text-(--text-sub)">{log.ipAddress}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-(--text-sub)">
            Tổng {pagination.total} bản ghi
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline" size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="flex items-center text-sm px-2">
              Trang {currentPage} / {pagination.totalPages}
            </span>
            <Button
              variant="outline" size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= pagination.totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
