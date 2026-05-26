import { LeaveTypeModel } from "./leave-type.model.js";

/** Khớp với leaveBalance trên User và RequestType seed */
export const DEFAULT_LEAVE_TYPES = [
  {
    code: "annual",
    name: "Nghỉ phép năm",
    description: "Nghỉ phép năm",
    defaultQuotaDays: 12,
    isPaid: true,
    requiresApproval: true,
    isActive: true,
  },
  {
    code: "sick",
    name: "Nghỉ ốm",
    description: "Nghỉ ốm",
    defaultQuotaDays: 30,
    isPaid: true,
    requiresApproval: true,
    isActive: true,
  },
  {
    code: "unpaid",
    name: "Nghỉ không lương",
    description: "Nghỉ không lương",
    defaultQuotaDays: 0,
    isPaid: false,
    requiresApproval: true,
    isActive: true,
  },
  {
    code: "compensatory",
    name: "Nghỉ bù",
    description: "Nghỉ bù",
    defaultQuotaDays: 0,
    isPaid: true,
    requiresApproval: true,
    isActive: true,
  },
  {
    code: "maternity",
    name: "Nghỉ thai sản",
    description: "Nghỉ thai sản",
    defaultQuotaDays: 180,
    isPaid: true,
    requiresApproval: true,
    isActive: true,
  },
];

export async function ensureDefaultLeaveTypes(companyId = null) {
  const count = await LeaveTypeModel.countDocuments();
  if (count > 0) return;
  await LeaveTypeModel.insertMany(
    DEFAULT_LEAVE_TYPES.map((t) => ({ ...t, companyId: companyId ?? null }))
  );
}
