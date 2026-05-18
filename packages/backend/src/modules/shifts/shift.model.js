import mongoose from "mongoose";

/**
 * Shift Model - Quản lý ca làm việc
 */
const shiftSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    breakDuration: { type: Number, default: 0 },
    isFlexible: { type: Boolean, default: false },
    description: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

shiftSchema.methods.getTotalHours = function () {
  const [startH, startM] = this.startTime.split(":").map(Number);
  const [endH, endM] = this.endTime.split(":").map(Number);

  let totalMinutes =
    endH * 60 + endM - (startH * 60 + startM) - this.breakDuration;
  if (totalMinutes < 0) totalMinutes += 24 * 60;

  return totalMinutes / 60;
};

shiftSchema.pre("save", function (next) {
  this.name = this.name.trim();
  next();
});

shiftSchema.post("save", async function (doc) {
  try {
    if (this.isModified('startTime') || this.isModified('endTime') || this.isModified('breakDuration')) {
      const { scheduleGenerationService } = await import('../schedule/scheduleGeneration.service.js');
      const { EmployeeScheduleModel } = await import('../schedule/schedule.model.js');
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const schedules = await EmployeeScheduleModel.find({
        shiftId: doc._id,
        date: { $gte: today },
        status: { $in: ['scheduled', 'completed'] },
      }).select('userId date').lean();
      
      const userIds = [...new Set(schedules.map(s => s.userId.toString()))];
      
      await EmployeeScheduleModel.updateMany(
        {
          shiftId: doc._id,
          date: { $gte: today },
        },
        {
          $set: {
            shiftName: doc.name,
            startTime: doc.startTime,
            endTime: doc.endTime,
          },
        }
      );
      
      for (const userId of userIds) {
        try {
          await scheduleGenerationService.regenerateScheduleOnAssignmentChange(userId, 3);
        } catch (error) {
          console.warn(`[ShiftModel] Warning: Could not regenerate schedule for user ${userId}:`, error.message);
        }
      }
      
      console.log(`[ShiftModel] Updated schedules for shift ${doc.name} (${doc._id}), affected ${userIds.length} users`);
    }
  } catch (error) {
    console.error('[ShiftModel] Error updating schedules after shift save:', error);
  }
});

shiftSchema.post('findOneAndUpdate', async function (doc) {
  if (!doc) return;
  
  try {
    const update = this.getUpdate();
    const $set = update.$set || update;
    
    if ($set && ($set.startTime || $set.endTime || $set.breakDuration)) {
      const { scheduleGenerationService } = await import('../schedule/scheduleGeneration.service.js');
      const { EmployeeScheduleModel } = await import('../schedule/schedule.model.js');
      
      await doc.populate();
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      await EmployeeScheduleModel.updateMany(
        {
          shiftId: doc._id,
          date: { $gte: today },
        },
        {
          $set: {
            shiftName: doc.name,
            startTime: doc.startTime,
            endTime: doc.endTime,
          },
        }
      );
      
      const schedules = await EmployeeScheduleModel.find({
        shiftId: doc._id,
        date: { $gte: today },
      }).select('userId').lean();
      
      const userIds = [...new Set(schedules.map(s => s.userId.toString()))];
      
      for (const userId of userIds) {
        try {
          await scheduleGenerationService.regenerateScheduleOnAssignmentChange(userId, 3);
        } catch (error) {
          console.warn(`[ShiftModel] Warning: Could not regenerate schedule for user ${userId}:`, error.message);
        }
      }
      
      console.log(`[ShiftModel] Updated schedules for shift ${doc.name} (${doc._id}), affected ${userIds.length} users`);
    }
  } catch (error) {
    console.error('[ShiftModel] Error updating schedules after shift update:', error);
  }
});

export const ShiftModel = mongoose.model("Shift", shiftSchema);
