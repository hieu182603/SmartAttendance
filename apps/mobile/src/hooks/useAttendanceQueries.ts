import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AttendanceService } from '../services/attendance.service';
import { queryKeys } from './queryKeys';

/**
 * Hook to fetch recent attendance records
 */
export function useRecentAttendance(limit: number = 5) {
    return useQuery({
        queryKey: queryKeys.attendance.recent(limit),
        queryFn: () => AttendanceService.getRecent(limit),
    });
}

/**
 * Hook to fetch attendance history with filters
 */
export function useAttendanceHistory(
    params?: { from?: string; to?: string; status?: string; page?: number; limit?: number },
    enabled: boolean = true
) {
    return useQuery({
        queryKey: queryKeys.attendance.history(params),
        queryFn: () => AttendanceService.getHistory(params || {}),
        enabled,
    });
}

/**
 * Hook to fetch attendance schedule for a specific month
 */
export function useAttendanceSchedule(month: string) {
    return useQuery({
        queryKey: queryKeys.attendance.schedule(month),
        queryFn: () => AttendanceService.getSchedule(month),
        enabled: !!month,
    });
}

/**
 * Mutation hook for check-in.
 * Invalidates recent attendance and history on success.
 */
export function useCheckIn() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: { latitude?: number; longitude?: number; accuracy?: number; photo?: any }) =>
            AttendanceService.checkIn(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.attendance.all });
        },
    });
}

/**
 * Mutation hook for check-out.
 * Invalidates recent attendance and history on success.
 */
export function useCheckOut() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: { latitude?: number; longitude?: number; accuracy?: number; photo?: any; earlyCheckoutReason?: string }) =>
            AttendanceService.checkOut(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.attendance.all });
        },
    });
}
