import { queryKeys } from '../hooks/queryKeys';

describe('queryKeys', () => {
  describe('leave', () => {
    it('returns base key', () => {
      expect(queryKeys.leave.all).toEqual(['leave']);
    });

    it('returns balance key', () => {
      expect(queryKeys.leave.balance()).toEqual(['leave', 'balance']);
    });

    it('returns history key with params', () => {
      const params = { status: 'approved', page: 1, limit: 10 };
      expect(queryKeys.leave.history(params)).toEqual(['leave', 'history', params]);
    });

    it('returns history key without params', () => {
      expect(queryKeys.leave.history()).toEqual(['leave', 'history', undefined]);
    });
  });

  describe('attendance', () => {
    it('returns base key', () => {
      expect(queryKeys.attendance.all).toEqual(['attendance']);
    });

    it('returns recent key with limit', () => {
      expect(queryKeys.attendance.recent(5)).toEqual(['attendance', 'recent', 5]);
    });

    it('returns recent key without limit', () => {
      expect(queryKeys.attendance.recent()).toEqual(['attendance', 'recent', undefined]);
    });

    it('returns history key with date range', () => {
      const params = { from: '2026-01-01', to: '2026-01-31' };
      expect(queryKeys.attendance.history(params)).toEqual(['attendance', 'history', params]);
    });

    it('returns schedule key with month', () => {
      expect(queryKeys.attendance.schedule('2026-05')).toEqual(['attendance', 'schedule', '2026-05']);
    });
  });

  describe('notifications', () => {
    it('returns list key with params', () => {
      const params = { page: 1, unreadOnly: true };
      expect(queryKeys.notifications.list(params)).toEqual(['notifications', 'list', params]);
    });

    it('returns unreadCount key', () => {
      expect(queryKeys.notifications.unreadCount()).toEqual(['notifications', 'unreadCount']);
    });
  });

  describe('user', () => {
    it('returns profile key', () => {
      expect(queryKeys.user.profile()).toEqual(['user', 'profile']);
    });
  });

  describe('manager', () => {
    it('returns stats key', () => {
      expect(queryKeys.manager.stats()).toEqual(['manager', 'stats']);
    });

    it('returns approvals key with filter', () => {
      const params = { status: 'pending', page: 2 };
      expect(queryKeys.manager.approvals(params)).toEqual(['manager', 'approvals', params]);
    });

    it('returns reports key with period', () => {
      expect(queryKeys.manager.reports('monthly')).toEqual(['manager', 'reports', 'monthly']);
    });
  });

  describe('admin', () => {
    it('returns users key with filters', () => {
      const params = { role: 'employee', search: 'nguyen' };
      expect(queryKeys.admin.users(params)).toEqual(['admin', 'users', params]);
    });

    it('returns settings key', () => {
      expect(queryKeys.admin.settings()).toEqual(['admin', 'settings']);
    });
  });

  describe('shift', () => {
    it('returns mySchedule key with date range', () => {
      expect(queryKeys.shift.mySchedule('2026-05-01', '2026-05-31')).toEqual([
        'shift', 'mySchedule', '2026-05-01', '2026-05-31',
      ]);
    });
  });

  it('all base keys are unique', () => {
    const bases = [
      queryKeys.leave.all[0],
      queryKeys.attendance.all[0],
      queryKeys.notifications.all[0],
      queryKeys.user.all[0],
      queryKeys.manager.all[0],
      queryKeys.admin.all[0],
      queryKeys.shift.all[0],
    ];
    expect(new Set(bases).size).toBe(bases.length);
  });
});
