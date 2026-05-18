import api from '../libs/axios';

export const LeaveService = {
    getBalance: async () => {
        const response = await api.get('/leave/balance');
        return response.data;
    },

    getHistory: async (params: { status?: string; page?: number; limit?: number }) => {
        const response = await api.get('/leave/history', { params });
        return response.data;
    },

    createRequest: async (data: { type: string; startDate: string; endDate: string; reason: string; halfDay?: boolean }) => {
        const response = await api.post('/leave/request', data);
        return response.data;
    },
};
