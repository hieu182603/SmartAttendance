import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  Database,
  Server,
  Cpu,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Bot,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import api from '@/services/api';

interface HealthData {
  status: 'ok' | 'degraded';
  timestamp: string;
  uptime: number;
  services: {
    mongodb: 'connected' | 'connecting' | 'disconnected';
    redis: 'connected' | 'degraded' | 'disabled';
    ai: 'connected' | 'unavailable' | 'unknown';
  };
  memory: {
    heapUsedMB: number;
    heapTotalMB: number;
    rssMB: number;
  };
  node: string;
  env: string;
}

type ServiceStatus = 'connected' | 'connecting' | 'disconnected' | 'degraded' | 'disabled' | 'unavailable' | 'unknown';

function StatusIcon({ status }: { status: ServiceStatus }) {
  if (status === 'connected') return <CheckCircle2 className="h-5 w-5 text-green-500" />;
  if (status === 'degraded' || status === 'connecting' || status === 'unknown') return <AlertTriangle className="h-5 w-5 text-orange-500" />;
  if (status === 'disabled') return <AlertTriangle className="h-5 w-5 text-gray-400" />;
  return <XCircle className="h-5 w-5 text-red-500" />;
}

function statusBadgeVariant(status: ServiceStatus): 'success' | 'warning' | 'error' | 'outline' {
  if (status === 'connected') return 'success';
  if (status === 'degraded' || status === 'connecting' || status === 'unknown' || status === 'disabled') return 'warning';
  return 'error';
}

function statusLabel(status: ServiceStatus): string {
  const map: Record<ServiceStatus, string> = {
    connected: 'Hoạt động',
    connecting: 'Đang kết nối',
    disconnected: 'Mất kết nối',
    degraded: 'Suy giảm',
    disabled: 'Tắt',
    unavailable: 'Không khả dụng',
    unknown: 'Không xác định',
  };
  return map[status] || status;
}

export default function SystemHealthPage() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get('/health');
      setHealth(data as HealthData);
      setLastChecked(new Date());
    } catch {
      setError('Không thể kết nối đến backend');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, [fetchHealth]);

  const memPercent = health
    ? Math.round((health.memory.heapUsedMB / health.memory.heapTotalMB) * 100)
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 p-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-(--text-primary) flex items-center gap-2">
            <Activity className="h-6 w-6 text-(--primary)" />
            Trạng thái hệ thống
          </h1>
          <p className="text-sm text-(--text-sub) mt-1">
            {lastChecked ? `Cập nhật lúc ${lastChecked.toLocaleTimeString('vi-VN')} · Tự động làm mới mỗi 30s` : 'Đang tải...'}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchHealth} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Làm mới
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 dark:bg-red-950/20 p-4 text-sm text-red-600">
          <XCircle className="inline h-4 w-4 mr-2" />
          {error}
        </div>
      )}

      {/* Services */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-(--text-sub) flex items-center gap-2">
              <Database className="h-4 w-4" />
              MongoDB
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            {health ? (
              <>
                <StatusIcon status={health.services.mongodb} />
                <Badge variant={statusBadgeVariant(health.services.mongodb)}>
                  {statusLabel(health.services.mongodb)}
                </Badge>
              </>
            ) : <span className="text-(--text-sub) text-sm">—</span>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-(--text-sub) flex items-center gap-2">
              <Server className="h-4 w-4" />
              Redis Cache
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            {health ? (
              <>
                <StatusIcon status={health.services.redis} />
                <Badge variant={statusBadgeVariant(health.services.redis)}>
                  {statusLabel(health.services.redis)}
                </Badge>
              </>
            ) : <span className="text-(--text-sub) text-sm">—</span>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-(--text-sub) flex items-center gap-2">
              <Bot className="h-4 w-4" />
              AI Service
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            {health ? (
              <>
                <StatusIcon status={health.services.ai} />
                <Badge variant={statusBadgeVariant(health.services.ai)}>
                  {statusLabel(health.services.ai)}
                </Badge>
              </>
            ) : <span className="text-(--text-sub) text-sm">—</span>}
          </CardContent>
        </Card>
      </div>

      {/* Memory */}
      {health && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-(--text-sub) flex items-center gap-2">
              <Cpu className="h-4 w-4" />
              Bộ nhớ
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-(--text-sub)">Heap sử dụng</span>
                <span className="font-medium text-(--text-primary)">{health.memory.heapUsedMB} MB / {health.memory.heapTotalMB} MB ({memPercent}%)</span>
              </div>
              <div className="h-2 rounded-full bg-(--muted) overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${memPercent > 85 ? 'bg-red-500' : memPercent > 65 ? 'bg-orange-400' : 'bg-green-500'}`}
                  style={{ width: `${memPercent}%` }}
                />
              </div>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-(--text-sub)">RSS (tổng tiến trình)</span>
              <span className="font-medium text-(--text-primary)">{health.memory.rssMB} MB</span>
            </div>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}
