import api from '../libs/axios';

export const ManagerService = {
    getStats: async () => {
        const response = await api.get('/dashboard/stats');
        return response.data;
    },

    getTeam: async () => {
        const response = await api.get('/users/my-team');
        return response.data?.users || (Array.isArray(response.data) ? response.data : []);
    },

    getApprovals: async (params: { status?: string; page?: number; limit?: number }) => {
        const response = await api.get('/requests', { params });
        return response.data?.requests || (Array.isArray(response.data) ? response.data : []);
    },

    approveRequest: async (id: string, data?: { comments?: string }) => {
        const response = await api.post(`/requests/${id}/approve`, data);
        return response.data;
    },

    rejectRequest: async (id: string, data: { comments: string }) => {
        const response = await api.post(`/requests/${id}/reject`, data);
        return response.data;
    },

    getDepartmentSchedule: async (month: number, year: number) => {
        const response = await api.get('/shifts', { params: { month, year } });
        return response.data;
    },

    getReports: async (period: 'day' | 'week' | 'month' = 'day') => {
        // 1. Calculate date range
        const now = new Date();
        let from, to;
        const formatDate = (date: Date) => date.toISOString().split('T')[0];

        if (period === 'day') {
            from = formatDate(now);
            to = formatDate(now);
        } else if (period === 'week') {
            const currentDay = now.getDay();
            const diff = currentDay === 0 ? -6 : 1 - currentDay; // Monday
            const firstDay = new Date(now);
            firstDay.setDate(now.getDate() + diff);
            const lastDay = new Date(firstDay);
            lastDay.setDate(firstDay.getDate() + 6);
            from = formatDate(firstDay);
            to = formatDate(lastDay);
        } else {
            const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
            const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            from = formatDate(firstDay);
            to = formatDate(lastDay);
        }

        // 2. Fetch Analytics for Charts & Summary
        const analytics = await api.get('/attendance/analytics', { params: { from, to } });
        const { summary } = analytics.data;

        // 3. Fetch Department Records for "Issues" list
        // Note: getDepartmentAttendance mainly supports specific date for list, 
        // but we can try to get detailed list.
        // If period is day, we use that day. 
        // If period is longer, we might need a different approach or just show issues for "today" or recent
        // For now, let's fetch department attendance for the 'to' date (current day or end of period)
        // to show latest issues.
        const issuesResponse = await api.get('/attendance/department', { params: { date: to, limit: 50 } });
        const records = issuesResponse.data.records || [];

        // Filter issues: status is NOT 'ontime' (or 'present' depending on API)
        // Adjust logic based on actual API response values
        const issues = records
            .filter((r: any) => r.status !== 'ontime' && r.status !== 'present')
            .map((r: any) => ({
                id: r._id || Math.random().toString(),
                name: r.userId?.name || r.name || 'N/A',
                type: r.status === 'late' ? 'late' : 'absent',
                time: r.checkIn ? new Date(r.checkIn).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '-',
                date: r.date
            }));

        return {
            attendance: {
                present: summary.ontime || 0,
                late: summary.late || 0,
                absent: summary.absent || 0,
                leave: 0 // API might not return leave count in summary yet
            },
            issues
        };
    },
};
