import api from '../libs/axios';

export const UserService = {
    getProfile: async () => {
        const response = await api.get('/users/me');
        return response.data;
    },

    updateProfile: async (data: { name?: string; phone?: string; email?: string; address?: string }) => {
        const response = await api.put('/users/me', data);
        return response.data;
    },


    updateBankInfo: async (data: { bankName: string; accountNumber: string }) => {
        const response = await api.put('/users/bank-info', data);
        return response.data;
    },

    // Kept for future if salary update by employee is allowed or needed for reference
    updateSalary: async (data: any) => {
        // Generally employees can't update their own salary, but maybe for admin/manager context later.
        // For now, we only use this if the backend endpoint exists. 
        // If not, we'll just stick to bank info.
        return null;
    }
};
