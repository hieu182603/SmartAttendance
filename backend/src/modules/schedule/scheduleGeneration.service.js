/**
 * Schedule Generation Service
 * Tạo schedule tự động từ EmployeeShiftAssignment
 */

import mongoose from 'mongoose';
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

  async applyLeaveToSchedule(leaveRequest) {
    try {
      const { userId, startDate, endDate, type, reason, _id } = leaveRequest;

      if (!userId || !startDate || !endDate) {
        throw new Error('Missing required fields: userId, startDate, endDate');
      }

      const leaveTypeMap = {
        leave: 'Nghỉ phép',
        sick: 'Nghỉ ốm',
        unpaid: 'Nghỉ không lương',
        compensatory: 'Nghỉ bù',
        maternity: 'Nghỉ thai sản',
      };

      const leaveTypeLabel = leaveTypeMap[type] || 'Nghỉ phép';
      const noteText = `${leaveTypeLabel}${reason ? `: ${reason}` : ''}`;

      const user = await UserModel.findById(userId).populate('defaultShiftId');
      const defaultShiftId = user?.defaultShiftId?._id || null;
      const defaultShiftName = user?.defaultShiftId?.name || 'Nghỉ';
      const defaultStartTime = user?.defaultShiftId?.startTime || '08:00';
      const defaultEndTime = user?.defaultShiftId?.endTime || '17:00';

      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      if (start > end) {
        throw new Error('startDate cannot be greater than endDate');
      }

      const operations = [];
      const currentDate = new Date(start);
      let updatedCount = 0;
      let createdCount = 0;

      while (currentDate <= end) {
        const dateStr = new Date(currentDate);
        dateStr.setHours(0, 0, 0, 0);

        const existingSchedule = await EmployeeScheduleModel.findOne({
          userId,
          date: dateStr,
        });

        if (existingSchedule) {
          operations.push({
            updateOne: {
              filter: {
                userId,
                date: dateStr,
              },
              update: {
                $set: {
                  status: 'off',
                  notes: noteText,
                  leaveRequestId: _id || null,
                },
              },
            },
          });
          updatedCount++;
        } else {
          const newSchedule = {
            userId,
            date: dateStr,
            shiftId: defaultShiftId || new mongoose.Types.ObjectId(),
            shiftName: defaultShiftName,
            startTime: defaultStartTime,
            endTime: defaultEndTime,
            status: 'off',
            notes: noteText,
            leaveRequestId: _id || null,
          };

          operations.push({
            insertOne: {
              document: newSchedule,
            },
          });
          createdCount++;
        }

        currentDate.setDate(currentDate.getDate() + 1);
      }

      if (operations.length > 0) {
        await EmployeeScheduleModel.bulkWrite(operations, { ordered: false });
      }

      console.log(
        `[ScheduleGenerationService] Applied leave to schedule: userId=${userId}, ` +
        `dates=${start.toISOString().split('T')[0]} to ${end.toISOString().split('T')[0]}, ` +
        `updated=${updatedCount}, created=${createdCount}`
      );

      return {
        success: true,
        userId,
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0],
        updatedCount,
        createdCount,
        totalDays: updatedCount + createdCount,
      };
    } catch (error) {
      console.error('[ScheduleGenerationService] applyLeaveToSchedule error:', error);
      throw error;
    }
  }
}

export const scheduleGenerationService = new ScheduleGenerationService();

