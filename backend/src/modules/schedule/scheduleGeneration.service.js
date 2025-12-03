/**
 * Schedule Generation Service
 * Tạo schedule tự động từ EmployeeShiftAssignment
 */

import { EmployeeShiftAssignmentModel } from '../shifts/employeeShiftAssignment.model.js';
import { EmployeeScheduleModel } from './schedule.model.js';
import { ShiftModel } from '../shifts/shift.model.js';
import { UserModel } from '../users/user.model.js';

class ScheduleGenerationService {
  /**
   * Generate schedule từ assignments cho một nhân viên
   * @param {string} userId - User ID
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Array>} Array of schedule objects
   */
  async generateScheduleFromAssignments(userId, startDate, endDate) {
    try {
      const assignments = await EmployeeShiftAssignmentModel.find({
        userId,
        isActive: true,
        effectiveFrom: { $lte: endDate },
        $or: [
          { effectiveTo: null },
          { effectiveTo: { $gte: startDate } },
        ],
      })
        .populate('shiftId')
        .sort({ priority: 1, effectiveFrom: -1 });

      if (assignments.length === 0) {
        const user = await UserModel.findById(userId).populate('defaultShiftId');
        
        if (user && user.defaultShiftId) {
          return this._generateFromDefaultShift(user, startDate, endDate);
        }
        
        return [];
      }

      const schedules = [];
      const currentDate = new Date(startDate);
      
      while (currentDate <= endDate) {
        const schedule = await this._generateScheduleForDate(
          userId,
          currentDate,
          assignments
        );
        
        if (schedule) {
          schedules.push(schedule);
        }
        
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      return schedules;
    } catch (error) {
      console.error('[ScheduleGenerationService] generateScheduleFromAssignments error:', error);
      throw error;
    }
  }

  /**
   * @private
   */
  async _generateScheduleForDate(userId, date, assignments) {
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    const dayOfWeek = checkDate.getDay();

      for (const assignment of assignments) {
      if (!assignment.shiftId || !assignment.shiftId.isActive) {
        continue;
      }

      let matched = false;

      switch (assignment.pattern) {
        case 'all':
          matched = true;
          break;

        case 'weekdays':
          matched = dayOfWeek >= 1 && dayOfWeek <= 5;
          break;

        case 'weekends':
          matched = dayOfWeek === 0 || dayOfWeek === 6;
          break;

        case 'custom':
          if (assignment.daysOfWeek && assignment.daysOfWeek.includes(dayOfWeek)) {
            matched = true;
          }
          break;

        case 'specific':
          if (assignment.specificDates) {
            matched = assignment.specificDates.some(d => {
              const dDate = new Date(d);
              dDate.setHours(0, 0, 0, 0);
              return dDate.getTime() === checkDate.getTime();
            });
          }
          break;
      }

      if (matched) {
        const fromDate = new Date(assignment.effectiveFrom);
        fromDate.setHours(0, 0, 0, 0);
        
        if (checkDate < fromDate) {
          matched = false;
        }

        if (assignment.effectiveTo) {
          const toDate = new Date(assignment.effectiveTo);
          toDate.setHours(23, 59, 59, 999);
          if (checkDate > toDate) {
            matched = false;
          }
        }
      }

      if (matched) {
        return {
          userId,
          date: new Date(checkDate),
          shiftId: assignment.shiftId._id,
          shiftName: assignment.shiftId.name,
          startTime: assignment.shiftId.startTime,
          endTime: assignment.shiftId.endTime,
          status: 'scheduled',
        };
      }
    }

    return null;
  }

  /**
   * @private
   */
  _generateFromDefaultShift(user, startDate, endDate) {
    if (!user.defaultShiftId) {
      return [];
    }

    const schedules = [];
    const currentDate = new Date(startDate);
    const shift = user.defaultShiftId;

    while (currentDate <= endDate) {
      schedules.push({
        userId: user._id,
        date: new Date(currentDate),
        shiftId: shift._id,
        shiftName: shift.name,
        startTime: shift.startTime,
        endTime: shift.endTime,
        status: 'scheduled',
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return schedules;
  }

  /**
   * Tạo hoặc cập nhật schedule cho nhân viên
   * @param {string} userId - User ID
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Array>} Created/updated schedules
   */
  async createOrUpdateSchedule(userId, startDate, endDate) {
    try {
      const schedules = await this.generateScheduleFromAssignments(userId, startDate, endDate);

      if (schedules.length === 0) {
        return [];
      }

      const operations = schedules.map(schedule => ({
        updateOne: {
          filter: {
            userId: schedule.userId,
            date: schedule.date,
          },
          update: {
            $set: {
              shiftId: schedule.shiftId,
              shiftName: schedule.shiftName,
              startTime: schedule.startTime,
              endTime: schedule.endTime,
              status: schedule.status,
            },
          },
          upsert: true,
        },
      }));

      await EmployeeScheduleModel.bulkWrite(operations);

      return schedules;
    } catch (error) {
      console.error('[ScheduleGenerationService] createOrUpdateSchedule error:', error);
      throw error;
    }
  }

  /**
   * Tạo schedule cho nhiều nhân viên
   * @param {string[]} userIds - Array of User IDs
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   */
  async batchCreateOrUpdateSchedule(userIds, startDate, endDate) {
    try {
      const results = await Promise.all(
        userIds.map(userId => this.createOrUpdateSchedule(userId, startDate, endDate))
      );

      return {
        success: true,
        totalEmployees: userIds.length,
        schedulesGenerated: results.reduce((sum, arr) => sum + arr.length, 0),
      };
    } catch (error) {
      console.error('[ScheduleGenerationService] batchCreateOrUpdateSchedule error:', error);
      throw error;
    }
  }

  /**
   * Regenerate schedule khi có assignment mới/thay đổi
   * @param {string} userId - User ID
   * @param {number} monthsAhead - Số tháng tạo schedule trước
   */
  async regenerateScheduleOnAssignmentChange(userId, monthsAhead = 3) {
    try {
      const startDate = new Date();
      startDate.setHours(0, 0, 0, 0);

      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + monthsAhead);
      endDate.setHours(23, 59, 59, 999);

      return await this.createOrUpdateSchedule(userId, startDate, endDate);
    } catch (error) {
      console.error('[ScheduleGenerationService] regenerateScheduleOnAssignmentChange error:', error);
      throw error;
    }
  }
}

export const scheduleGenerationService = new ScheduleGenerationService();

