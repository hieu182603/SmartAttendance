import type { ShiftStatus } from "@/utils/attendanceStatus";

export type TaskStatus =
  | "assigned"
  | "in_progress"
  | "pending_review"
  | "completed"
  | "rejected";

export type TaskPriority = "low" | "medium" | "high";

export interface ManagerTask {
  _id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignedBy: {
    _id: string;
    name: string;
    avatarUrl?: string;
  };
  assignedTo: {
    _id: string;
    name: string;
    avatarUrl?: string;
  };
  employeeFeedback?: {
    note: string;
    submittedAt: string;
  };
  managerReview?: {
    decision: "approved" | "rejected" | null;
    note: string;
    reviewedAt: string;
    reviewedBy?: string;
  };
  projectId?: string;
  attachments?: Array<{
    name: string;
    url: string;
    type?: string;
    size?: number;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectDTO {
  _id: string;
  name: string;
  code: string;
  description: string;
  status: "active" | "paused";
  members: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface AttendanceRecord {
  id?: string;
  date: string;
  day: string;
  checkIn: string;
  checkOut: string;
  hours: string;
  location: string;
  status: "ontime" | "late" | "absent" | "overtime" | "weekend" | "on_leave";
  notes: string;
  earlyCheckoutReason?: string | null;
}

export interface EmployeeSchedule {
  _id: string;
  date: string;
  shift: {
    _id: string;
    name: string;
    startTime: string;
    endTime: string;
    breakDuration: number;
  };
  status: ShiftStatus;
  location: string;
  team?: string;
  notes?: string;
  attendanceRecord?: AttendanceRecord;
}
