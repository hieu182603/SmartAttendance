/**
 * Shift Assignment Service
 * Abstraction layer để quản lý assignment của nhân viên với ca làm việc
 */

import { UserModel } from '../users/user.model.js';
import { ShiftModel } from './shift.model.js';
import { EmployeeShiftAssignmentModel } from './employeeShiftAssignment.model.js';
import { scheduleGenerationService } from '../schedule/scheduleGeneration.service.js';

class ShiftAssignmentService {
    /**
     * Lấy shift của nhân viên
     * @param {string} userId - User ID
     * @param {Date} date - Ngày cụ thể (optional)
     * @returns {Promise<Object|null>} Shift object hoặc null
     */
    async getUserShift(userId, date = new Date()) {
        try {
            const assignment = await EmployeeShiftAssignmentModel.getEffectiveAssignment(userId, date);

            if (assignment && assignment.shiftId) {
                return {
                    _id: assignment.shiftId._id,
                    name: assignment.shiftId.name,
                    startTime: assignment.shiftId.startTime,
                    endTime: assignment.shiftId.endTime,
                    breakDuration: assignment.shiftId.breakDuration || 0,
                    isFlexible: assignment.shiftId.isFlexible || false,
                    description: assignment.shiftId.description,
                    isActive: assignment.shiftId.isActive,
                    assignmentId: assignment._id,
                    pattern: assignment.pattern,
                };
            }

            const user = await UserModel.findById(userId)
                .populate('defaultShiftId')
                .select('defaultShiftId')
                .lean();

            if (!user || !user.defaultShiftId) {
                return null;
            }

            return {
                _id: user.defaultShiftId._id,
                name: user.defaultShiftId.name,
                startTime: user.defaultShiftId.startTime,
                endTime: user.defaultShiftId.endTime,
                breakDuration: user.defaultShiftId.breakDuration || 0,
                isFlexible: user.defaultShiftId.isFlexible || false,
                description: user.defaultShiftId.description,
                isActive: user.defaultShiftId.isActive,
            };
        } catch (error) {
            console.error('[ShiftAssignmentService] getUserShift error:', error);
            return null;
        }
    }

    /**
     * Assign shift cho nhân viên
     * @param {string} userId - User ID
     * @param {string} shiftId - Shift ID
     * @param {Object} options - Assignment options
     * @param {boolean} options.isFullTime - Nếu true, chỉ cập nhật defaultShiftId (full time). Nếu false hoặc không có, tạo assignment mới
     * @returns {Promise<Object>} Created assignment hoặc updated user
     */
    async assignShiftToUser(userId, shiftId, options = {}) {
        try {
            const shift = await ShiftModel.findById(shiftId);
            if (!shift) {
                throw new Error('Ca làm việc không tồn tại');
            }

            if (!shift.isActive) {
                throw new Error('Ca làm việc đã bị vô hiệu hóa');
            }

            const user = await UserModel.findById(userId);
            if (!user) {
                throw new Error('Nhân viên không tồn tại');
            }

            // Logic: 
            // - Nếu có pattern, effectiveFrom, daysOfWeek, specificDates → luôn tạo assignment mới
            // - Nếu isFullTime = true → chỉ cập nhật defaultShiftId (full time)
            // - Nếu không có options nào → mặc định tạo assignment mới (không phải full time)
            const shouldCreateAssignment =
                options.pattern ||
                options.effectiveFrom ||
                options.daysOfWeek ||
                options.specificDates ||
                options.isFullTime !== true; // Mặc định là tạo assignment mới nếu không phải full time

            if (shouldCreateAssignment) {
                // Vô hiệu hóa các assignment cũ đang active để tránh conflict
                await EmployeeShiftAssignmentModel.updateMany(
                    {
                        userId,
                        isActive: true,
                    },
                    {
                        $set: { isActive: false },
                    }
                );

                // Xóa defaultShiftId khi chuyển từ full time sang assignment mới để tránh conflict
                // Assignment sẽ có priority cao hơn defaultShiftId
                await UserModel.findByIdAndUpdate(
                    userId,
                    { $unset: { defaultShiftId: 1 } },
                    { new: true }
                );

                // Tạo assignment mới
                // Đảm bảo effectiveFrom luôn là 00:00:00 để match với logic check trong generateScheduleForDate
                let effectiveFromDate = options.effectiveFrom ? new Date(options.effectiveFrom) : new Date();
                effectiveFromDate.setHours(0, 0, 0, 0);

                let effectiveToDate = null;
                if (options.effectiveTo) {
                    effectiveToDate = new Date(options.effectiveTo);
                    effectiveToDate.setHours(23, 59, 59, 999);
                }

                const assignment = await EmployeeShiftAssignmentModel.create({
                    userId,
                    shiftId,
                    pattern: options.pattern || 'all', // Mặc định là 'all' (tất cả các ngày) để giống defaultShiftId
                    daysOfWeek: options.daysOfWeek,
                    specificDates: options.specificDates,
                    effectiveFrom: effectiveFromDate,
                    effectiveTo: effectiveToDate,
                    priority: options.priority || 1,
                    notes: options.notes,
                    isActive: true,
                });

                // Regenerate schedule sau khi tạo assignment mới
                try {
                    await scheduleGenerationService.regenerateScheduleOnAssignmentChange(userId);
                } catch (scheduleError) {
                    console.error(`[ShiftAssignmentService] Error regenerating schedule for user ${userId}:`, scheduleError);
                    // Không throw error để không làm gián đoạn việc tạo assignment
                }

                return {
                    userId: user._id,
                    assignmentId: assignment._id,
                    shift: {
                        _id: shift._id,
                        name: shift.name,
                        startTime: shift.startTime,
                        endTime: shift.endTime,
                    },
                    pattern: assignment.pattern,
                };
            }

            // Nếu isFullTime = true hoặc không có options → chỉ cập nhật defaultShiftId
            // Vô hiệu hóa tất cả assignments cũ khi chuyển sang full time
            await EmployeeShiftAssignmentModel.updateMany(
                {
                    userId,
                    isActive: true,
                },
                {
                    $set: { isActive: false },
                }
            );

            const updatedUser = await UserModel.findByIdAndUpdate(
                userId,
                { defaultShiftId: shiftId },
                { new: true }
            ).populate('defaultShiftId');

            try {
                await scheduleGenerationService.regenerateScheduleOnAssignmentChange(userId);
            } catch (scheduleError) {
                console.warn(`[ShiftAssignmentService] Warning: Could not regenerate schedule for user ${userId}:`, scheduleError.message);
            }

            return {
                userId: updatedUser._id,
                shift: updatedUser.defaultShiftId ? {
                    _id: updatedUser.defaultShiftId._id,
                    name: updatedUser.defaultShiftId.name,
                    startTime: updatedUser.defaultShiftId.startTime,
                    endTime: updatedUser.defaultShiftId.endTime,
                } : null,
            };
        } catch (error) {
            console.error('[ShiftAssignmentService] assignShiftToUser error:', error);
            throw error;
        }
    }

    /**
     * Bulk assign shift cho nhiều nhân viên
     * @param {string[]} userIds - Array of User IDs
     * @param {string} shiftId - Shift ID
     * @returns {Promise<Object>} Result with count
     */
    async bulkAssignShift(userIds, shiftId) {
        try {
            const shift = await ShiftModel.findById(shiftId);
            if (!shift) {
                throw new Error('Ca làm việc không tồn tại');
            }

            if (!shift.isActive) {
                throw new Error('Ca làm việc đã bị vô hiệu hóa');
            }

            const users = await UserModel.find({ _id: { $in: userIds } });
            if (users.length !== userIds.length) {
                throw new Error('Một số nhân viên không tồn tại');
            }

            const result = await UserModel.updateMany(
                { _id: { $in: userIds } },
                { defaultShiftId: shiftId }
            );

            return {
                success: true,
                count: result.modifiedCount,
                message: `Đã gán ca cho ${result.modifiedCount} nhân viên`,
            };
        } catch (error) {
            console.error('[ShiftAssignmentService] bulkAssignShift error:', error);
            throw error;
        }
    }

    /**
     * Remove shift assignment từ nhân viên
     * @param {string} userId - User ID
     * @returns {Promise<Object>} Result
     */
    async removeShiftFromUser(userId) {
        try {
            const user = await UserModel.findByIdAndUpdate(
                userId,
                { $unset: { defaultShiftId: 1 } },
                { new: true }
            );

            if (!user) {
                throw new Error('Nhân viên không tồn tại');
            }

            return {
                success: true,
                message: 'Đã xóa ca làm việc của nhân viên',
            };
        } catch (error) {
            console.error('[ShiftAssignmentService] removeShiftFromUser error:', error);
            throw error;
        }
    }

    /**
     * Lấy danh sách nhân viên trong một ca
     * @param {string} shiftId - Shift ID
     * @param {Object} options - Query options
     * @returns {Promise<Object>} List of users with pagination
     */
    async getEmployeesByShift(shiftId, options = {}) {
        try {
            const { page = 1, limit = 10, search = '', date = new Date() } = options;
            const skip = (page - 1) * limit;

            const checkDate = new Date(date);
            checkDate.setHours(0, 0, 0, 0);

            const assignments = await EmployeeShiftAssignmentModel.find({
                shiftId,
                isActive: true,
                effectiveFrom: { $lte: checkDate },
                $or: [
                    { effectiveTo: null },
                    { effectiveTo: { $gte: checkDate } },
                ],
            }).select('userId').lean();

            const assignmentUserIds = assignments
                .map(a => a.userId.toString())
                .filter((id, index, arr) => arr.indexOf(id) === index);

            const defaultShiftUsers = await UserModel.find({
                defaultShiftId: shiftId,
                isActive: true,
            }).select('_id').lean();

            const defaultShiftUserIds = defaultShiftUsers.map(u => u._id.toString());

            const allUserIds = [...new Set([...assignmentUserIds, ...defaultShiftUserIds])];

            const query = {
                _id: { $in: allUserIds },
                isActive: true,
            };

            if (search) {
                query.$or = [
                    { name: { $regex: search, $options: 'i' } },
                    { email: { $regex: search, $options: 'i' } },
                ];
            }

            const [users, total] = await Promise.all([
                UserModel.find(query)
                    .populate('department', 'name code')
                    .populate('branch', 'name')
                    .select('name email department branch role phone isActive')
                    .skip(skip)
                    .limit(limit)
                    .lean(),
                UserModel.countDocuments(query),
            ]);

            return {
                users,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                },
            };
        } catch (error) {
            console.error('[ShiftAssignmentService] getEmployeesByShift error:', error);
            throw error;
        }
    }

    /**
     * Đếm số nhân viên trong mỗi ca
     * @param {Date} date - Ngày cụ thể (optional)
     * @returns {Promise<Array>} Array of shifts with employee count
     */
    async getShiftEmployeeCounts(date = new Date()) {
        try {
            const checkDate = new Date(date);
            checkDate.setHours(0, 0, 0, 0);

            const shifts = await ShiftModel.find({ isActive: true }).lean();

            const counts = await Promise.all(
                shifts.map(async (shift) => {
                    const assignments = await EmployeeShiftAssignmentModel.find({
                        shiftId: shift._id,
                        isActive: true,
                        effectiveFrom: { $lte: checkDate },
                        $or: [
                            { effectiveTo: null },
                            { effectiveTo: { $gte: checkDate } },
                        ],
                    }).select('userId').lean();

                    const assignmentUserIds = assignments
                        .map(a => a.userId.toString())
                        .filter((id, index, arr) => arr.indexOf(id) === index);

                    const defaultShiftUsers = await UserModel.find({
                        defaultShiftId: shift._id,
                        isActive: true,
                    }).select('_id').lean();

                    const defaultShiftUserIds = defaultShiftUsers.map(u => u._id.toString());

                    const allUserIds = [...new Set([...assignmentUserIds, ...defaultShiftUserIds])];

                    return {
                        shiftId: shift._id,
                        count: allUserIds.length,
                    };
                })
            );

            return counts;
        } catch (error) {
            console.error('[ShiftAssignmentService] getShiftEmployeeCounts error:', error);
            throw error;
        }
    }

    /**
     * Lấy assignments của nhân viên
     * @param {string} userId - User ID
     * @param {Object} options - Query options
     * @returns {Promise<Array>} List of assignments
     */
    async getUserAssignments(userId, options = {}) {
        try {
            const { isActive = true, date } = options;

            const query = { userId };

            if (isActive !== undefined) {
                query.isActive = isActive;
            }

            if (date) {
                const checkDate = new Date(date);
                checkDate.setHours(0, 0, 0, 0);

                query.effectiveFrom = { $lte: checkDate };
                query.$or = [
                    { effectiveTo: null },
                    { effectiveTo: { $gte: checkDate } },
                ];
            }

            const assignments = await EmployeeShiftAssignmentModel.find(query)
                .populate('shiftId')
                .sort({ priority: 1, effectiveFrom: -1 })
                .lean();

            return assignments;
        } catch (error) {
            console.error('[ShiftAssignmentService] getUserAssignments error:', error);
            throw error;
        }
    }

    /**
     * Update assignment
     * @param {string} assignmentId - Assignment ID
     * @param {Object} updateData - Update data
     * @returns {Promise<Object>} Updated assignment
     */
    async updateAssignment(assignmentId, updateData) {
        try {
            const assignment = await EmployeeShiftAssignmentModel.findByIdAndUpdate(
                assignmentId,
                updateData,
                { new: true }
            ).populate('shiftId');

            if (!assignment) {
                throw new Error('Assignment không tồn tại');
            }

            await scheduleGenerationService.regenerateScheduleOnAssignmentChange(assignment.userId);

            return assignment;
        } catch (error) {
            console.error('[ShiftAssignmentService] updateAssignment error:', error);
            throw error;
        }
    }

    /**
     * Deactivate assignment
     * @param {string} assignmentId - Assignment ID
     * @returns {Promise<Object>} Result
     */
    async deactivateAssignment(assignmentId) {
        try {
            const assignment = await EmployeeShiftAssignmentModel.findByIdAndUpdate(
                assignmentId,
                { isActive: false },
                { new: true }
            );

            if (!assignment) {
                throw new Error('Assignment không tồn tại');
            }

            await scheduleGenerationService.regenerateScheduleOnAssignmentChange(assignment.userId);

            return {
                success: true,
                message: 'Đã vô hiệu hóa assignment',
            };
        } catch (error) {
            console.error('[ShiftAssignmentService] deactivateAssignment error:', error);
            throw error;
        }
    }
}

export const shiftAssignmentService = new ShiftAssignmentService();

