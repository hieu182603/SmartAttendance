import { useState, useEffect, useCallback } from 'react';
import { ApprovalRequest } from '../types';

interface UseApprovalsReturn {
  approvals: ApprovalRequest[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  approve: (id: string, note?: string) => Promise<void>;
  reject: (id: string, note: string) => Promise<void>;
  pendingCount: number;
}


export function useApprovals(): UseApprovalsReturn {
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchApprovals = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const { ManagerService } = await import('../services/manager.service');
      const data = await ManagerService.getApprovals({ status: 'pending' });

      if (Array.isArray(data)) {
        setApprovals(data.map((item: any) => ({
          id: item._id,
          userId: item.userId,
          employeeName: item.user?.name || 'Unknown',
          type: item.type,
          startDate: new Date(item.startDate).toLocaleDateString('vi-VN'),
          endDate: new Date(item.endDate).toLocaleDateString('vi-VN'),
          days: Math.ceil((new Date(item.endDate).getTime() - new Date(item.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1,
          reason: item.reason,
          status: item.status,
          submittedAt: new Date(item.createdAt).getTime(),
        })));
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load approvals';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const approve = useCallback(async (id: string, note?: string) => {
    try {
      const { ManagerService } = await import('../services/manager.service');
      await ManagerService.approveRequest(id, { comments: note });
      setApprovals(prev => prev.filter(a => a.id !== id));
    } catch (err) {
      console.error('Error approving request:', err);
      throw err;
    }
  }, []);

  const reject = useCallback(async (id: string, note: string) => {
    try {
      const { ManagerService } = await import('../services/manager.service');
      await ManagerService.rejectRequest(id, { comments: note });
      setApprovals(prev => prev.filter(a => a.id !== id));
    } catch (err) {
      console.error('Error rejecting request:', err);
      throw err;
    }
  }, []);

  useEffect(() => {
    fetchApprovals();
  }, [fetchApprovals]);

  return {
    approvals,
    isLoading,
    error,
    refresh: fetchApprovals,
    approve,
    reject,
    pendingCount: approvals.length,
  };
}

