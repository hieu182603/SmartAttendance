import api from '../libs/axios';

export const NotificationService = {
    getAll: async (params: { page?: number; limit?: number; unreadOnly?: boolean } = {}) => {
        const response = await api.get('/notifications', { params });
        console.log('[NotificationService] getAll response:', JSON.stringify(response.data).substring(0, 200));
        return response.data;
    },

    markAsRead: async (id: string) => {
        const response = await api.put(`/notifications/${id}/read`);
        return response.data;
    },

    markAllAsRead: async () => {
        const response = await api.put('/notifications/read-all');
        return response.data;
    },

    getUnreadCount: async () => {
        const response = await api.get('/notifications/unread-count');
        return response.data;
    },

    delete: async (id: string) => {
        const response = await api.delete(`/notifications/${id}`);
        return response.data;
    },
};
