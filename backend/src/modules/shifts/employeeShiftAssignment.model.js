import mongoose from "mongoose";

/**
 * EmployeeShiftAssignment Model
 * Quản lý assignment ca làm việc linh hoạt cho nhân viên theo pattern
 */
const employeeShiftAssignmentSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        shiftId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Shift",
            required: true,
            index: true,
        },

        pattern: {
            type: String,
            enum: ["all", "weekdays", "weekends", "custom", "specific"],
            default: "all",
            required: true,
        },

        daysOfWeek: {
            type: [Number],
            validate: {
                validator: function (v) {
                    if (this.pattern !== "custom") return true;
                    return Array.isArray(v) && v.length > 0 && v.every(d => d >= 0 && d <= 6);
                },
                message: "daysOfWeek phải là array các số từ 0-6 cho pattern custom",
            },
        },

        specificDates: {
            type: [Date],
            validate: {
                validator: function (v) {
                    if (this.pattern !== "specific") return true;
                    return Array.isArray(v) && v.length > 0;
                },
                message: "specificDates phải là array các Date cho pattern specific",
            },
        },

        effectiveFrom: {
            type: Date,
            required: true,
            default: Date.now,
            index: true,
        },

        effectiveTo: {
            type: Date,
            default: null,
            index: true,
            validate: {
                validator: function (v) {
                    if (!v) return true;
                    return v >= this.effectiveFrom;
                },
                message: "effectiveTo phải sau effectiveFrom",
            },
        },

        priority: {
            type: Number,
            default: 1,
            index: true,
        },

        isActive: {
            type: Boolean,
            default: true,
            index: true,
        },

        notes: {
            type: String,
            trim: true,
        },
    },
    { timestamps: true }
);

employeeShiftAssignmentSchema.index({ userId: 1, effectiveFrom: 1, effectiveTo: 1 });
employeeShiftAssignmentSchema.index({ userId: 1, isActive: 1 });
employeeShiftAssignmentSchema.index({ shiftId: 1, isActive: 1 });

/**
 * Method: Kiểm tra assignment có hiệu lực trong ngày cụ thể không
 */
employeeShiftAssignmentSchema.methods.isEffectiveOn = function (date) {
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);

    const fromDate = new Date(this.effectiveFrom);
    fromDate.setHours(0, 0, 0, 0);

    if (checkDate < fromDate) return false;

    if (this.effectiveTo) {
        const toDate = new Date(this.effectiveTo);
        toDate.setHours(23, 59, 59, 999);
        if (checkDate > toDate) return false;
    }

    const dayOfWeek = checkDate.getDay();

    switch (this.pattern) {
        case "all":
            return true;

        case "weekdays":
            return dayOfWeek >= 1 && dayOfWeek <= 5;

        case "weekends":
            return dayOfWeek === 0 || dayOfWeek === 6;

        case "custom":
            return this.daysOfWeek && this.daysOfWeek.includes(dayOfWeek);

        case "specific":
            if (!this.specificDates) return false;
            return this.specificDates.some(d => {
                const dDate = new Date(d);
                dDate.setHours(0, 0, 0, 0);
                return dDate.getTime() === checkDate.getTime();
            });

        default:
            return false;
    }
};

/**
 * Static method: Lấy assignment hiệu lực cho nhân viên trong ngày cụ thể
 */
employeeShiftAssignmentSchema.statics.getEffectiveAssignment = async function (userId, date) {
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);

    const fromDate = new Date(checkDate);
    fromDate.setHours(0, 0, 0, 0);

    const toDate = new Date(checkDate);
    toDate.setHours(23, 59, 59, 999);

    const assignments = await this.find({
        userId,
        isActive: true,
        effectiveFrom: { $lte: toDate },
        $or: [
            { effectiveTo: null },
            { effectiveTo: { $gte: fromDate } },
        ],
    })
        .populate("shiftId")
        .sort({ priority: 1, effectiveFrom: -1 })
        .lean();

    for (const assignment of assignments) {
        const model = new this(assignment);
        if (model.isEffectiveOn(checkDate)) {
            return assignment;
        }
    }

    return null;
};

export const EmployeeShiftAssignmentModel = mongoose.model(
    "EmployeeShiftAssignment",
    employeeShiftAssignmentSchema
);

