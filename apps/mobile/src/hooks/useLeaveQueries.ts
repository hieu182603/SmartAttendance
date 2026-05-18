import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LeaveService } from '../services/leave.service';
import { queryKeys } from './queryKeys';

/**
 * Hook to fetch leave balance
 */
export function useLeaveBalance() {
    return useQuery({
        queryKey: queryKeys.leave.balance(),
        queryFn: () => LeaveService.getBalance(),
    });
}

/**
 * Hook to fetch leave history with optional filters
 */
export function useLeaveHistory(params?: { status?: string; page?: number; limit?: number }) {
    return useQuery({
        queryKey: queryKeys.leave.history(params),
        queryFn: () => LeaveService.getHistory(params || {}),
    });
}

/**
 * Mutation hook to create a leave request.
 * Automatically invalidates leave balance and history on success.
 */
export function useCreateLeaveRequest() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: { type: string; startDate: string; endDate: string; reason: string; halfDay?: boolean }) =>
            LeaveService.createRequest(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.leave.all });
        },
    });
}
