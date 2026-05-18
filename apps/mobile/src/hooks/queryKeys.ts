export const queryKeys = {
    leave: {
        all: ['leave'] as const,
        balance: () => [...queryKeys.leave.all, 'balance'] as const,
        history: (params?: { status?: string; page?: number; limit?: number }) =>
            [...queryKeys.leave.all, 'history', params] as const,
    },
    attendance: {
        all: ['attendance'] as const,
        recent: (limit?: number) => [...queryKeys.attendance.all, 'recent', limit] as const,
        history: (params?: { from?: string; to?: string; status?: string; page?: number; limit?: number }) =>
            [...queryKeys.attendance.all, 'history', params] as const,
        schedule: (month: string) => [...queryKeys.attendance.all, 'schedule', month] as const,
    },
    notifications: {
        all: ['notifications'] as const,
        list: (params?: { page?: number; limit?: number; unreadOnly?: boolean }) =>
            [...queryKeys.notifications.all, 'list', params] as const,
        unreadCount: () => [...queryKeys.notifications.all, 'unreadCount'] as const,
    },
    user: {
        all: ['user'] as const,
        profile: () => [...queryKeys.user.all, 'profile'] as const,
    },
    manager: {
        all: ['manager'] as const,
        stats: () => [...queryKeys.manager.all, 'stats'] as const,
        team: () => [...queryKeys.manager.all, 'team'] as const,
        approvals: (params?: { status?: string; page?: number; limit?: number }) =>
            [...queryKeys.manager.all, 'approvals', params] as const,
        reports: (period?: string) => [...queryKeys.manager.all, 'reports', period] as const,
    },
    admin: {
        all: ['admin'] as const,
        stats: () => [...queryKeys.admin.all, 'stats'] as const,
        departments: () => [...queryKeys.admin.all, 'departments'] as const,
        positions: () => [...queryKeys.admin.all, 'positions'] as const,
        users: (params?: { role?: string; status?: string; search?: string }) =>
            [...queryKeys.admin.all, 'users', params] as const,
        managers: () => [...queryKeys.admin.all, 'managers'] as const,
        branches: () => [...queryKeys.admin.all, 'branches'] as const,
        settings: () => [...queryKeys.admin.all, 'settings'] as const,
    },
    shift: {
        all: ['shift'] as const,
        mySchedule: (startDate: string, endDate: string) =>
            [...queryKeys.shift.all, 'mySchedule', startDate, endDate] as const,
    },
};
