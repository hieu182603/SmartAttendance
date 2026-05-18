import { useState, useEffect, useCallback } from 'react';
import { TeamMember } from '../types';

interface UseTeamReturn {
  members: TeamMember[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  onlineCount: number;
  onLeaveCount: number;
}


export function useTeam(): UseTeamReturn {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMembers = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const { ManagerService } = await import('../services/manager.service');
      const data = await ManagerService.getTeam();

      if (Array.isArray(data)) {
        setMembers(data.map((item: any) => {
          // Determine status with priority: on-leave → online → offline
          let status: 'online' | 'offline' | 'on-leave' = 'offline';

          // Check if member is currently on approved leave
          // Backend may use fields like: onLeave, isOnLeave, currentLeaveStatus, hasActiveLeave
          if (item.onLeave || item.isOnLeave || item.hasActiveLeave || item.currentLeaveStatus === 'on-leave') {
            status = 'on-leave';
          } else if (item.isActive) {
            status = 'online';
          }

          return {
            id: item._id,
            name: item.name,
            role: item.role,
            department: item.department?.name || 'Chưa phân bổ',
            status,
            // avatar: item.avatar
          };
        }));
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load team members';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const onlineCount = members.filter(m => m.status === 'online').length;
  const onLeaveCount = members.filter(m => m.status === 'on-leave').length;

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  return {
    members,
    isLoading,
    error,
    refresh: fetchMembers,
    onlineCount,
    onLeaveCount,
  };
}

