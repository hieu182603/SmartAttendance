import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserService } from '../services/user.service';
import { queryKeys } from './queryKeys';

/**
 * Hook to fetch user profile
 */
export function useUserProfile() {
    return useQuery({
        queryKey: queryKeys.user.profile(),
        queryFn: () => UserService.getProfile(),
    });
}

/**
 * Mutation hook to update user profile.
 * Invalidates profile query on success.
 */
export function useUpdateProfile() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: { name?: string; phone?: string; email?: string; address?: string }) =>
            UserService.updateProfile(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.user.profile() });
        },
    });
}

/**
 * Mutation hook to update bank info.
 * Invalidates profile query on success.
 */
export function useUpdateBankInfo() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: { bankName: string; accountNumber: string }) =>
            UserService.updateBankInfo(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.user.profile() });
        },
    });
}
