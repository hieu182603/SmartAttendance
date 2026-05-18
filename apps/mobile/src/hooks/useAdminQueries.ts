import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { AdminService } from '../services/admin.service';
import { queryKeys } from './queryKeys';

/**
 * Hook to fetch admin dashboard stats
 */
export function useAdminStats() {
    return useQuery({
        queryKey: queryKeys.admin.stats(),
        queryFn: () => AdminService.getDashboardStats(),
    });
}

/**
 * Hook to fetch departments list
 */
export function useDepartments() {
    return useQuery({
        queryKey: queryKeys.admin.departments(),
        queryFn: () => AdminService.getDepartments(),
    });
}

/**
 * Hook to fetch positions list
 */
export function usePositions() {
    return useQuery({
        queryKey: queryKeys.admin.positions(),
        queryFn: () => AdminService.getPositions(),
    });
}

/**
 * Hook to fetch users list with optional filters
 */
export function useUsers(params?: { role?: string; status?: string; search?: string }) {
    return useQuery({
        queryKey: queryKeys.admin.users(params),
        queryFn: () => AdminService.getUsers(params),
    });
}

/**
 * Hook to fetch audit logs with optional filters
 */
export function useAuditLogs(params?: { page?: number; limit?: number; search?: string; action?: string; status?: string; category?: string; userId?: string; startDate?: string; endDate?: string }) {
    return useQuery({
        queryKey: ['admin', 'logs', params],
        queryFn: () => AdminService.getLogs(params),
        placeholderData: keepPreviousData,
    });
}

/**
 * Hook to fetch managers for dropdowns
 */
export function useManagers() {
    return useQuery({
        queryKey: queryKeys.admin.managers(),
        queryFn: () => AdminService.getManagers(),
        staleTime: 10 * 60 * 1000, // 10 min - rarely changes
    });
}

/**
 * Hook to fetch branches for dropdowns
 */
export function useBranches() {
    return useQuery({
        queryKey: queryKeys.admin.branches(),
        queryFn: () => AdminService.getBranches(),
        staleTime: 10 * 60 * 1000,
    });
}

/**
 * Hook to fetch system settings
 */
export function useSystemSettings() {
    return useQuery({
        queryKey: queryKeys.admin.settings(),
        queryFn: () => AdminService.getSystemSettings(),
        staleTime: 10 * 60 * 1000,
    });
}

/**
 * Mutation: Create department
 */
export function useCreateDepartment() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: any) => AdminService.createDepartment(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.admin.departments() });
        },
    });
}

/**
 * Mutation: Update department
 */
export function useUpdateDepartment() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) => AdminService.updateDepartment(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.admin.departments() });
        },
    });
}

/**
 * Mutation: Delete department
 */
export function useDeleteDepartment() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => AdminService.deleteDepartment(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.admin.departments() });
        },
    });
}

/**
 * Mutation: Create position
 */
export function useCreatePosition() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: { title: string; level: number }) => AdminService.createPosition(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.admin.positions() });
        },
    });
}

/**
 * Mutation: Update position
 */
export function useUpdatePosition() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: { title: string; level: number } }) =>
            AdminService.updatePosition(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.admin.positions() });
        },
    });
}

/**
 * Mutation: Delete position
 */
export function useDeletePosition() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => AdminService.deletePosition(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.admin.positions() });
        },
    });
}
