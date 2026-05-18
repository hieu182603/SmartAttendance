import api from '../libs/axios';

export const AdminService = {
    // Departments
    getDepartments: async () => {
        const response = await api.get('/departments');
        return response.data.departments; // API returns { departments: [], total, ... }
    },

    createDepartment: async (data: any) => {
        const response = await api.post('/departments', data);
        return response.data.department;
    },

    updateDepartment: async (id: string, data: any) => {
        const response = await api.put(`/departments/${id}`, data);
        return response.data.department;
    },

    deleteDepartment: async (id: string) => {
        const response = await api.delete(`/departments/${id}`);
        return response.data;
    },

    // Positions
    getPositions: async () => {
        const response = await api.get('/positions');
        return response.data.positions || response.data;
    },

    createPosition: async (data: { title: string; level: number }) => {
        const response = await api.post('/positions', data);
        return response.data;
    },

    updatePosition: async (id: string, data: { title: string; level: number }) => {
        const response = await api.put(`/positions/${id}`, data);
        return response.data;
    },

    deletePosition: async (id: string) => {
        const response = await api.delete(`/positions/${id}`);
        return response.data;
    },

    // Utils for dropdowns
    getManagers: async () => {
        const response = await api.get('/users/managers');
        return response.data; // Assuming array of users
    },

    getBranches: async () => {
        const response = await api.get('/branches/list');
        return response.data; // Assuming array of branches
    },

    // Users
    getUsers: async (params?: { role?: string; status?: string; search?: string }) => {
        const response = await api.get('/users', { params });
        return response.data.users || response.data;
    },

    // Audit Logs
    getLogs: async (params?: { page?: number; limit?: number; search?: string; action?: string; status?: string; category?: string; userId?: string; startDate?: string; endDate?: string }) => {
        const response = await api.get('/logs', { params });
        return response.data as { logs: any[]; pagination: { total: number; page: number; totalPages: number; limit: number } };
    },

    // Dashboard Stats
    getDashboardStats: async () => {
        const response = await api.get('/dashboard/stats');
        return response.data;
    },

    // Settings
    getSystemSettings: async () => {
        const response = await api.get('/settings');
        return response.data;
    }
};
