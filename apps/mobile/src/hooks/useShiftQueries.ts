import { useQuery } from '@tanstack/react-query';
import { ShiftService } from '../services/shift.service';
import { queryKeys } from './queryKeys';

/**
 * Hook to fetch employee shift schedule for a date range
 */
export function useShiftSchedule(startDate: string, endDate: string, enabled: boolean = true) {
    return useQuery({
        queryKey: queryKeys.shift.mySchedule(startDate, endDate),
        queryFn: () => ShiftService.getMySchedule(startDate, endDate),
        enabled: enabled && !!startDate && !!endDate,
    });
}
