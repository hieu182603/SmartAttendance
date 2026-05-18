import api from '../libs/axios';

export interface EmployeeSchedule {
    _id: string;
    date: string;
    shiftId: string;
    shiftName: string;
    startTime: string;
    endTime: string;
    breakDuration?: number;
    status: 'scheduled' | 'completed' | 'missed' | 'off';
    location?: string;
    team?: string;
    notes?: string;
    leaveRequestId?: string;
}

export const ShiftService = {
    /**
     * Get the current employee's schedule for a date range.
     * Mirrors the web frontend's shiftService.getMySchedule().
     * Backend: GET /shifts/my-schedule?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
     */
    getMySchedule: async (startDate: string, endDate: string): Promise<EmployeeSchedule[]> => {
        const response = await api.get('/shifts/my-schedule', {
            params: { startDate, endDate },
        });
        return response.data.data || response.data || [];
    },
};
