import api from '../libs/axios';

export const AttendanceService = {
    getSchedule: async (month: string) => { // month format: YYYY-MM
        const response = await api.get(`/attendance/schedule?month=${month}`);
        return response.data;
    },

    getRecent: async (limit = 5) => {
        const response = await api.get(`/attendance/recent?limit=${limit}`);
        return response.data;
    },

    getHistory: async (params: { from?: string; to?: string; status?: string; page?: number; limit?: number }) => {
        const response = await api.get('/attendance/history', { params });
        return response.data;
    },

    checkIn: async (data: { latitude?: number; longitude?: number; accuracy?: number; photo?: any }) => {
        const formData = new FormData();
        if (data.latitude) formData.append('latitude', String(data.latitude));
        if (data.longitude) formData.append('longitude', String(data.longitude));
        if (data.accuracy) formData.append('accuracy', String(data.accuracy));
        if (data.photo) {
            formData.append('photo', {
                uri: data.photo.uri,
                type: 'image/jpeg',
                name: 'checkin.jpg',
            } as any);
        }

        const response = await api.post('/attendance/checkin', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    },

    checkOut: async (data: { latitude?: number; longitude?: number; accuracy?: number; photo?: any; earlyCheckoutReason?: string }) => {
        const formData = new FormData();
        if (data.latitude) formData.append('latitude', String(data.latitude));
        if (data.longitude) formData.append('longitude', String(data.longitude));
        if (data.accuracy) formData.append('accuracy', String(data.accuracy));
        if (data.earlyCheckoutReason) formData.append('earlyCheckoutReason', data.earlyCheckoutReason);
        if (data.photo) {
            formData.append('photo', {
                uri: data.photo.uri,
                type: 'image/jpeg',
                name: 'checkout.jpg',
            } as any);
        }

        const response = await api.post('/attendance/checkout', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    },
};
