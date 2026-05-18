import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { NotificationService } from '../services/notification.service';
import { queryKeys } from './queryKeys';

/**
 * Hook to fetch notifications list
 */
export function useNotificationsList(params?: { page?: number; limit?: number; unreadOnly?: boolean }) {
    return useQuery({
        queryKey: queryKeys.notifications.list(params),
        queryFn: () => NotificationService.getAll(params || {}),
    });
}

/**
 * Hook to fetch unread notification count
 */
export function useUnreadCount() {
    return useQuery({
        queryKey: queryKeys.notifications.unreadCount(),
        queryFn: () => NotificationService.getUnreadCount(),
        // Refetch frequently for badge accuracy
        staleTime: 30 * 1000, // 30 seconds
    });
}

/**
 * Mutation hook to mark a notification as read
 */
export function useMarkAsRead() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => NotificationService.markAsRead(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
        },
    });
}

/**
 * Mutation hook to mark all notifications as read
 */
export function useMarkAllAsRead() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: () => NotificationService.markAllAsRead(),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
        },
    });
}

/**
 * Mutation hook to delete a notification
 */
export function useDeleteNotification() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => NotificationService.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
        },
    });
}
