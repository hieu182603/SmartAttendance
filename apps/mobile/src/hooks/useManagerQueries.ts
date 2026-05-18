import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ManagerService } from '../services/manager.service';
import { queryKeys } from './queryKeys';

/**
 * Hook to fetch manager dashboard stats
 */
export function useManagerStats() {
    return useQuery({
        queryKey: queryKeys.manager.stats(),
        queryFn: () => ManagerService.getStats(),
    });
}

/**
 * Hook to fetch team members
 */
export function useTeamMembers() {
    return useQuery({
        queryKey: queryKeys.manager.team(),
        queryFn: () => ManagerService.getTeam(),
    });
}

/**
 * Hook to fetch approval requests with optional filters
 */
export function useManagerApprovals(params?: { status?: string; page?: number; limit?: number }) {
    return useQuery({
        queryKey: queryKeys.manager.approvals(params),
        queryFn: () => ManagerService.getApprovals(params || {}),
    });
}

/**
 * Hook to fetch manager reports
 */
export function useManagerReports(period: 'day' | 'week' | 'month' = 'day') {
    return useQuery({
        queryKey: queryKeys.manager.reports(period),
        queryFn: () => ManagerService.getReports(period),
        staleTime: 2 * 60 * 1000, // 2 min
    });
}

/**
 * Mutation hook to approve a request.
 * Invalidates approvals list on success.
 */
export function useApproveRequest() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, note }: { id: string; note?: string }) =>
            ManagerService.approveRequest(id, { comments: note }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.manager.approvals() });
        },
    });
}

/**
 * Mutation hook to reject a request.
 * Invalidates approvals list on success.
 */
export function useRejectRequest() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, note }: { id: string; note: string }) =>
            ManagerService.rejectRequest(id, { comments: note }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.manager.approvals() });
        },
    });
}

/**
 * Hook to fetch department schedule
 */
export function useDepartmentSchedule(month: number, year: number) {
    return useQuery({
        queryKey: [...queryKeys.manager.all, 'schedule', month, year],
        queryFn: () => ManagerService.getDepartmentSchedule(month, year),
        enabled: !!month && !!year,
    });
}

/**
 * Mock mutation hook to submit performance review
 */
export function useSubmitPerformanceReview() {
    return useMutation({
        mutationFn: async (data: any) => {
            // Simulate API latency
            await new Promise((resolve) => setTimeout(resolve, 1000));
            return { success: true, data };
        },
    });
}
