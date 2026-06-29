import { TaskModel } from "./task.model.js";
import { NotificationService } from "../notifications/notification.service.js";
import logger from "../../config/logger.js";
import { ROLES } from "../../config/roles.config.js";

const getUserId = (req) => req.user?.userId || req.user?.id || req.user?._id;

// Create a new task (Manager+)
export const createTask = async (req, res) => {
  try {
    const { title, description, assignedTo, startDate, endDate, startTime, endTime, priority, projectId, attachments } = req.body;
    const companyId = req.user?.companyId;
    const assignedBy = getUserId(req);

    if (!companyId) {
      return res.status(400).json({ success: false, message: "Company ID is required" });
    }
    if (!title || !assignedTo || !startDate || !startTime || !endTime) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    // The assignee must exist and belong to the same company
    const { UserModel } = await import("../users/user.model.js");
    const assignee = await UserModel.findOne({ _id: assignedTo, companyId }).select("_id name").lean();
    if (!assignee) {
      return res.status(404).json({ success: false, message: "Assignee not found in your company" });
    }

    // Nếu gán vào dự án, dự án phải tồn tại và thuộc cùng công ty
    if (projectId) {
      const { ProjectModel } = await import("../projects/project.model.js");
      const project = await ProjectModel.findOne({ _id: projectId, companyId }).select("_id").lean();
      if (!project) {
        return res.status(404).json({ success: false, message: "Project not found in your company" });
      }
    }

    const newTask = new TaskModel({
      title,
      description,
      priority,
      assignedBy,
      assignedTo,
      startDate,
      endDate: endDate || startDate,
      startTime,
      endTime,
      companyId,
      projectId,
      attachments: attachments || [],
      status: "assigned"
    });

    await newTask.save();

    // Notify the assigned employee
    try {
      await NotificationService.createNotification({
        userId: assignedTo,
        type: "task_assigned",
        title: "📋 Bạn được giao công việc mới",
        message: `Bạn được giao công việc "${title}" vào ngày ${startDate} (${startTime} - ${endTime}).`,
        relatedEntityType: "task",
        relatedEntityId: newTask._id,
        metadata: { priority: newTask.priority, startDate, startTime, endTime },
      });
    } catch (notifyError) {
      logger.error(`[task.createTask] Notification failed: ${notifyError.message}`);
    }

    const populated = await TaskModel.findById(newTask._id)
      .populate("assignedTo", "name email avatarUrl")
      .populate("assignedBy", "name email avatarUrl");

    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    logger.error(`[task.createTask] ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get the current employee's own tasks within a date range (Employee)
export const getMyTasks = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const userId = getUserId(req);
    const companyId = req.user?.companyId;

    const query = { assignedTo: userId };
    if (companyId) query.companyId = companyId;

    // Date overlap: task.startDate <= query.endDate && task.endDate >= query.startDate
    if (startDate && endDate) {
      query.startDate = { $lte: endDate };
      query.endDate = { $gte: startDate };
    }

    const tasks = await TaskModel.find(query)
      .populate("assignedBy", "name avatarUrl")
      .sort({ startDate: 1, startTime: 1 });

    res.json({ success: true, data: tasks });
  } catch (error) {
    logger.error(`[task.getMyTasks] ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get tasks for the manager's company (Manager+), with optional filters
export const getDepartmentTasks = async (req, res) => {
  try {
    const { startDate, endDate, assignedTo, status } = req.query;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(400).json({ success: false, message: "Company ID is required" });
    }

    const query = { companyId };

    if (startDate && endDate) {
      query.startDate = { $lte: endDate };
      query.endDate = { $gte: startDate };
    }

    if (assignedTo && assignedTo !== "all") {
      query.assignedTo = assignedTo;
    }

    // MANAGER chỉ thấy task của nhân viên cùng phòng ban (ADMIN/HR/SUPER_ADMIN: toàn công ty)
    if (req.user?.role === ROLES.MANAGER) {
      const managerId = String(getUserId(req));
      const { UserModel } = await import("../users/user.model.js");
      const manager = await UserModel.findById(managerId).select("department").lean();

      let deptMemberIds = [];
      if (manager?.department) {
        const members = await UserModel.find({
          companyId,
          department: manager.department,
        })
          .select("_id")
          .lean();
        deptMemberIds = members.map((u) => String(u._id));
      }
      // Luôn cho phép manager xem task chính mình được giao
      if (!deptMemberIds.includes(managerId)) deptMemberIds.push(managerId);

      if (query.assignedTo) {
        // Có filter nhân viên cụ thể: chỉ chấp nhận nếu thuộc phòng ban của manager
        if (!deptMemberIds.includes(String(query.assignedTo))) {
          return res.json({ success: true, data: [] });
        }
      } else {
        query.assignedTo = { $in: deptMemberIds };
      }
    }

    if (status && status !== "all") {
      if (status === "in_progress") {
        query.status = { $in: ["in_progress", "rejected"] };
      } else {
        query.status = status;
      }
    }

    const tasks = await TaskModel.find(query)
      .populate("assignedTo", "name email avatarUrl")
      .populate("assignedBy", "name email avatarUrl")
      .sort({ createdAt: -1 });

    res.json({ success: true, data: tasks });
  } catch (error) {
    logger.error(`[task.getDepartmentTasks] ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get a single task by id (assignee, assigner, or same-company manager)
export const getTaskById = async (req, res) => {
  try {
    const { taskId } = req.params;
    const userId = String(getUserId(req));
    const companyId = String(req.user?.companyId || "");

    const task = await TaskModel.findById(taskId)
      .populate("assignedTo", "name email avatarUrl")
      .populate("assignedBy", "name email avatarUrl");

    if (!task) return res.status(404).json({ success: false, message: "Task not found" });

    const isAssignee = String(task.assignedTo?._id || task.assignedTo) === userId;
    const isAssigner = String(task.assignedBy?._id || task.assignedBy) === userId;
    const isSameCompany = String(task.companyId) === companyId;

    if (!isAssignee && !isAssigner && !isSameCompany) {
      return res.status(403).json({ success: false, message: "You are not allowed to view this task" });
    }

    res.json({ success: true, data: task });
  } catch (error) {
    logger.error(`[task.getTaskById] ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Start a task: assigned -> in_progress (only the assignee)
export const startTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const userId = String(getUserId(req));

    const task = await TaskModel.findById(taskId);
    if (!task) return res.status(404).json({ success: false, message: "Task not found" });

    if (String(task.assignedTo) !== userId) {
      return res.status(403).json({ success: false, message: "Only the assignee can start this task" });
    }
    if (task.status !== "assigned") {
      return res.status(400).json({ success: false, message: "Task can only be started from 'assigned' status" });
    }

    task.status = "in_progress";
    await task.save();

    const populated = await TaskModel.findById(taskId)
      .populate("assignedTo", "name email avatarUrl")
      .populate("assignedBy", "name email avatarUrl");

    res.json({ success: true, data: populated });
  } catch (error) {
    logger.error(`[task.startTask] ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Submit a task for review (only the assignee, note required)
export const submitTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { note } = req.body;
    const userId = String(getUserId(req));

    if (!note || !note.trim()) {
      return res.status(400).json({ success: false, message: "Note is required when submitting a task" });
    }

    const task = await TaskModel.findById(taskId);
    if (!task) return res.status(404).json({ success: false, message: "Task not found" });

    if (String(task.assignedTo) !== userId) {
      return res.status(403).json({ success: false, message: "Only the assignee can submit this task" });
    }

    task.status = "pending_review";
    task.employeeFeedback = {
      note: note.trim(),
      submittedAt: new Date(),
    };
    await task.save();

    // Notify the manager who assigned the task
    try {
      await NotificationService.createNotification({
        userId: task.assignedBy,
        type: "task_submitted",
        title: "📨 Có công việc cần phê duyệt",
        message: `Công việc "${task.title}" đã được nộp và đang chờ bạn phê duyệt.`,
        relatedEntityType: "task",
        relatedEntityId: task._id,
        metadata: { assignedTo: task.assignedTo, note: task.employeeFeedback.note },
      });
    } catch (notifyError) {
      logger.error(`[task.submitTask] Notification failed: ${notifyError.message}`);
    }

    const populated = await TaskModel.findById(taskId)
      .populate("assignedTo", "name email avatarUrl")
      .populate("assignedBy", "name email avatarUrl");

    res.json({ success: true, data: populated });
  } catch (error) {
    logger.error(`[task.submitTask] ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Review a task (Manager+): approve -> completed, reject -> rejected
export const reviewTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { decision, note } = req.body; // decision: 'approved' | 'rejected'
    const userId = String(getUserId(req));

    if (!["approved", "rejected"].includes(decision)) {
      return res.status(400).json({ success: false, message: "Decision must be 'approved' or 'rejected'" });
    }
    if (decision === "rejected" && (!note || !note.trim())) {
      return res.status(400).json({ success: false, message: "A reason is required when rejecting a task" });
    }

    const task = await TaskModel.findById(taskId);
    if (!task) return res.status(404).json({ success: false, message: "Task not found" });

    // Only the assigner may review
    if (String(task.assignedBy) !== userId) {
      return res.status(403).json({ success: false, message: "Only the manager who assigned this task can review it" });
    }

    task.status = decision === "approved" ? "completed" : "rejected";
    task.managerReview = {
      decision,
      note: note ? note.trim() : "",
      reviewedAt: new Date(),
      reviewedBy: getUserId(req),
    };
    await task.save();

    // Notify the employee of the review result
    try {
      const approved = decision === "approved";
      await NotificationService.createNotification({
        userId: task.assignedTo,
        type: approved ? "task_approved" : "task_rejected",
        title: approved ? "✅ Công việc đã được phê duyệt" : "❌ Công việc bị từ chối",
        message: approved
          ? `Công việc "${task.title}" đã được phê duyệt.`
          : `Công việc "${task.title}" đã bị từ chối.\n\nLý do: ${task.managerReview.note}`,
        relatedEntityType: "task",
        relatedEntityId: task._id,
        metadata: { decision, note: task.managerReview.note },
      });
    } catch (notifyError) {
      logger.error(`[task.reviewTask] Notification failed: ${notifyError.message}`);
    }

    const populated = await TaskModel.findById(taskId)
      .populate("assignedTo", "name email avatarUrl")
      .populate("assignedBy", "name email avatarUrl");

    res.json({ success: true, data: populated });
  } catch (error) {
    logger.error(`[task.reviewTask] ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update a task (Manager+): only the assigner, only edits allowed in 'assigned' state
export const updateTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const userId = String(getUserId(req));
    const companyId = String(req.user?.companyId || "");
    const { title, description, startDate, endDate, startTime, endTime, priority } = req.body;

    const task = await TaskModel.findById(taskId);
    if (!task) return res.status(404).json({ success: false, message: "Task not found" });

    // Must belong to same company
    if (String(task.companyId) !== companyId) {
      return res.status(403).json({ success: false, message: "Task not found in your company" });
    }

    // Only the assigner can update
    if (String(task.assignedBy) !== userId) {
      return res.status(403).json({ success: false, message: "Only the manager who created this task can update it" });
    }

    // Can only edit while still 'assigned'
    if (task.status !== "assigned") {
      return res.status(400).json({ success: false, message: "Task can only be edited while it is still 'assigned'" });
    }

    if (title !== undefined) task.title = title;
    if (description !== undefined) task.description = description;
    if (startDate !== undefined) task.startDate = startDate;
    if (endDate !== undefined) task.endDate = endDate;
    if (startTime !== undefined) task.startTime = startTime;
    if (endTime !== undefined) task.endTime = endTime;
    if (priority !== undefined) task.priority = priority;

    await task.save();

    const populated = await TaskModel.findById(taskId)
      .populate("assignedTo", "name email avatarUrl")
      .populate("assignedBy", "name email avatarUrl");

    res.json({ success: true, data: populated });
  } catch (error) {
    logger.error(`[task.updateTask] ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete a task (Manager+): only the assigner, only while still 'assigned'
export const deleteTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const userId = String(getUserId(req));
    const companyId = String(req.user?.companyId || "");

    const task = await TaskModel.findById(taskId);
    if (!task) return res.status(404).json({ success: false, message: "Task not found" });

    // Must belong to same company
    if (String(task.companyId) !== companyId) {
      return res.status(403).json({ success: false, message: "Task not found in your company" });
    }

    // Only the assigner can delete
    if (String(task.assignedBy) !== userId) {
      return res.status(403).json({ success: false, message: "Only the manager who created this task can delete it" });
    }

    // Can only delete while still 'assigned'
    if (task.status !== "assigned") {
      return res.status(400).json({ success: false, message: "Task can only be deleted while it is still 'assigned'" });
    }

    await task.deleteOne();

    res.json({ success: true, data: { _id: taskId } });
  } catch (error) {
    logger.error(`[task.deleteTask] ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
};
