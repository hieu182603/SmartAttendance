import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  Search, Shield, RefreshCw, ChevronDown, AlertTriangle,
  Plus, Settings, Users, X, Trash2, Save, Check,
} from "lucide-react";
import {
  getAllUsers,
  getRolePermissions,
  updateRolePermissions,
  updateUserByAdmin,
} from "@/services/userService";
import {
  UserRole,
  Permission,
  type UserRoleType,
  type PermissionType,
  ROLE_NAMES,
  ROLE_COLORS,
  ROLE_HIERARCHY,
  ROLE_PERMISSIONS,
  canManageRole,
} from "@/utils/roles";
import { useAuth } from "@/context/AuthContext";
import {
  usePermissionsOverride,
  type CustomRole,
  LS_PERMS_KEY,
  LS_CUSTOM_ROLES_KEY,
} from "@/context/PermissionsContext";

// ─── Types ───────────────────────────────────────────────

interface UserRow {
  _id: string;
  name: string;
  email: string;
  role: UserRoleType;
  isActive: boolean;
  department?: { name: string } | null;
}

interface ApiUsersResponse {
  data?: unknown[];
  users?: unknown[];
}

interface PermissionGroupItem {
  key: PermissionType;
  label: string;
}

// ─── Constants ───────────────────────────────────────────

const BUILTIN_ROLES = Object.values(UserRole).filter(
  (r) => r !== UserRole.TRIAL
) as UserRoleType[];

const ASSIGNABLE_ROLES = [...BUILTIN_ROLES].sort(
  (a, b) => ROLE_HIERARCHY[b] - ROLE_HIERARCHY[a]
);

const HIGH_PRIVILEGE_ROLES: UserRoleType[] = [UserRole.SUPER_ADMIN, UserRole.ADMIN];

const PRESET_COLORS = [
  { bg: "bg-indigo-500/20", text: "text-indigo-500" },
  { bg: "bg-teal-500/20", text: "text-teal-500" },
  { bg: "bg-amber-500/20", text: "text-amber-500" },
  { bg: "bg-rose-500/20", text: "text-rose-500" },
  { bg: "bg-sky-500/20", text: "text-sky-500" },
  { bg: "bg-lime-500/20", text: "text-lime-500" },
];

const PERMISSION_GROUPS: Array<{ id: string; label: string; items: PermissionGroupItem[] }> = [
  {
    id: "attendance",
    label: "Chấm công",
    items: [
      { key: Permission.ATTENDANCE_VIEW_OWN, label: "Xem chấm công cá nhân" },
      { key: Permission.ATTENDANCE_VIEW_DEPARTMENT, label: "Xem chấm công phòng ban" },
      { key: Permission.ATTENDANCE_VIEW_ALL, label: "Xem tất cả chấm công" },
      { key: Permission.ATTENDANCE_MANUAL_CHECKIN, label: "Chấm công thủ công" },
      { key: Permission.ATTENDANCE_APPROVE, label: "Duyệt chấm công" },
    ],
  },
  {
    id: "requests",
    label: "Yêu cầu",
    items: [
      { key: Permission.REQUESTS_CREATE, label: "Tạo yêu cầu" },
      { key: Permission.REQUESTS_VIEW_OWN, label: "Xem yêu cầu cá nhân" },
      { key: Permission.REQUESTS_APPROVE_DEPARTMENT, label: "Duyệt yêu cầu phòng ban" },
      { key: Permission.REQUESTS_APPROVE_ALL, label: "Duyệt tất cả yêu cầu" },
    ],
  },
  {
    id: "analytics",
    label: "Phân tích & Báo cáo",
    items: [
      { key: Permission.ANALYTICS_VIEW_DEPARTMENT, label: "Xem phân tích phòng ban" },
      { key: Permission.ANALYTICS_VIEW_ALL, label: "Xem tất cả phân tích" },
      { key: Permission.VIEW_REPORTS, label: "Xem báo cáo" },
    ],
  },
  {
    id: "users",
    label: "Quản lý nhân viên",
    items: [
      { key: Permission.USERS_VIEW_DEPARTMENT, label: "Xem nhân viên phòng ban" },
      { key: Permission.USERS_VIEW, label: "Xem tất cả nhân viên" },
      { key: Permission.USERS_CREATE, label: "Tạo nhân viên" },
      { key: Permission.USERS_UPDATE_DEPARTMENT, label: "Cập nhật nhân viên phòng ban" },
      { key: Permission.USERS_UPDATE, label: "Cập nhật tất cả nhân viên" },
      { key: Permission.USERS_DELETE, label: "Xóa nhân viên" },
      { key: Permission.USERS_MANAGE_ROLE, label: "Quản lý phân quyền" },
    ],
  },
  {
    id: "schedule",
    label: "Lịch làm việc",
    items: [
      { key: Permission.SCHEDULE_VIEW_DEPARTMENT, label: "Xem lịch phòng ban" },
      { key: Permission.SCHEDULE_MANAGE_DEPARTMENT, label: "Quản lý lịch phòng ban" },
    ],
  },
  {
    id: "performance",
    label: "Hiệu suất",
    items: [
      { key: Permission.PERFORMANCE_VIEW_DEPARTMENT, label: "Xem hiệu suất phòng ban" },
      { key: Permission.PERFORMANCE_MANAGE_DEPARTMENT, label: "Quản lý hiệu suất phòng ban" },
    ],
  },
  {
    id: "payroll",
    label: "Bảng lương",
    items: [
      { key: Permission.PAYROLL_VIEW, label: "Xem bảng lương" },
      { key: Permission.PAYROLL_MANAGE, label: "Quản lý bảng lương" },
      { key: Permission.PAYROLL_EXPORT, label: "Xuất bảng lương" },
    ],
  },
  {
    id: "departments",
    label: "Phòng ban & Chi nhánh",
    items: [
      { key: Permission.DEPARTMENTS_VIEW, label: "Xem phòng ban" },
      { key: Permission.DEPARTMENTS_MANAGE, label: "Quản lý phòng ban" },
      { key: Permission.BRANCHES_VIEW, label: "Xem chi nhánh" },
      { key: Permission.BRANCHES_MANAGE, label: "Quản lý chi nhánh" },
    ],
  },
  {
    id: "system",
    label: "Hệ thống",
    items: [
      { key: Permission.SYSTEM_SETTINGS_VIEW, label: "Xem cấu hình hệ thống" },
      { key: Permission.SYSTEM_SETTINGS_UPDATE, label: "Cập nhật cấu hình hệ thống" },
      { key: Permission.AUDIT_LOGS_VIEW, label: "Xem nhật ký hệ thống" },
    ],
  },
];

// ─── Helpers ─────────────────────────────────────────────

function isUserRow(v: unknown): v is UserRow {
  if (!v || typeof v !== "object") return false;
  const u = v as Record<string, unknown>;
  return typeof u._id === "string" && typeof u.name === "string" && typeof u.email === "string";
}

function extractUsers(res: unknown): UserRow[] {
  const candidates =
    (res as ApiUsersResponse)?.data ??
    (res as ApiUsersResponse)?.users ??
    (Array.isArray(res) ? res : []);
  return (candidates as unknown[]).filter(isUserRow);
}

// ─── ConfirmDialog ────────────────────────────────────────

function ConfirmDialog({
  userName, newRole, onConfirm, onCancel,
}: {
  userName: string; newRole: UserRoleType; onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-[var(--background)] border border-[var(--border)] rounded-xl p-6 max-w-sm w-full mx-4 shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-yellow-500/20">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
          </div>
          <h2 className="font-semibold text-[var(--text-main)]">Xác nhận thay đổi</h2>
        </div>
        <p className="text-sm text-[var(--text-sub)] mb-6">
          Bạn có chắc muốn gán role{" "}
          <span className={`font-semibold ${ROLE_COLORS[newRole].text}`}>{ROLE_NAMES[newRole]}</span>{" "}
          cho <span className="font-semibold text-[var(--text-main)]">{userName}</span>?
          Đây là role có quyền cao và không thể hoàn tác dễ dàng.
        </p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 px-4 py-2 text-sm rounded-lg border border-[var(--border)] text-[var(--text-sub)] hover:bg-[var(--surface)] transition-colors">
            Huỷ
          </button>
          <button onClick={onConfirm} className="flex-1 px-4 py-2 text-sm rounded-lg bg-yellow-500 text-white font-medium hover:bg-yellow-600 transition-colors">
            Xác nhận
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── CreateRoleDialog ─────────────────────────────────────

function CreateRoleDialog({ onClose, onCreate }: {
  onClose: () => void;
  onCreate: (role: CustomRole) => void;
}) {
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [level, setLevel] = useState(1);
  const [colorIdx, setColorIdx] = useState(0);
  const [selectedPerms, setSelectedPerms] = useState<Set<PermissionType>>(
    new Set([Permission.ATTENDANCE_VIEW_OWN, Permission.REQUESTS_CREATE, Permission.REQUESTS_VIEW_OWN])
  );

  const togglePerm = (perm: PermissionType) => {
    setSelectedPerms(prev => {
      const next = new Set(prev);
      if (next.has(perm)) next.delete(perm); else next.add(perm);
      return next;
    });
  };

  const toggleGroup = (items: PermissionGroupItem[]) => {
    const keys = items.map(i => i.key);
    const allOn = keys.every(k => selectedPerms.has(k));
    setSelectedPerms(prev => {
      const next = new Set(prev);
      if (allOn) keys.forEach(k => next.delete(k));
      else keys.forEach(k => next.add(k));
      return next;
    });
  };

  const handleCreate = () => {
    if (!name.trim()) { toast.error("Vui lòng nhập tên role"); return; }
    const roleKey = key.trim().toUpperCase().replace(/\s+/g, "_") || `CUSTOM_${Date.now()}`;
    const color = PRESET_COLORS[colorIdx];
    onCreate({
      id: Date.now().toString(),
      name: name.trim(),
      key: roleKey,
      colorBg: color.bg,
      colorText: color.text,
      level,
      permissions: Array.from(selectedPerms),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-[var(--background)] border border-[var(--border)] rounded-xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-[var(--border)]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/20">
              <Plus className="h-4 w-4 text-purple-500" />
            </div>
            <h2 className="font-semibold text-[var(--text-main)]">Tạo role mới</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--surface)] text-[var(--text-sub)] transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-[var(--text-sub)] mb-1.5">
              Tên role <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Vd: Team Lead, Senior Manager..."
              className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-main)] placeholder:text-[var(--text-sub)] focus:outline-none focus:border-purple-500/60"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-sub)] mb-1.5">Mã role (tùy chọn)</label>
            <input
              type="text"
              value={key}
              onChange={e => setKey(e.target.value)}
              placeholder="Tự động tạo nếu để trống"
              className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-main)] placeholder:text-[var(--text-sub)] focus:outline-none focus:border-purple-500/60"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[var(--text-sub)] mb-1.5">Cấp độ (0-5)</label>
              <input
                type="number"
                min={0}
                max={5}
                step={0.5}
                value={level}
                onChange={e => setLevel(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-main)] focus:outline-none focus:border-purple-500/60"
              />
              <p className="text-xs text-[var(--text-sub)] mt-1">Employee=1, Admin=4</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-sub)] mb-1.5">Màu sắc</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {PRESET_COLORS.map((c, i) => (
                  <button
                    key={i}
                    onClick={() => setColorIdx(i)}
                    className={`w-7 h-7 rounded-full ${c.bg} border-2 flex items-center justify-center transition-all ${
                      colorIdx === i ? "border-current scale-110 " + c.text : "border-transparent"
                    }`}
                  >
                    {colorIdx === i && <Check className={"w-3 h-3 " + c.text} />}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-[var(--text-sub)] mb-2">
              Quyền hạn <span className="text-[var(--text-sub)] font-normal">({selectedPerms.size} quyền được chọn)</span>
            </p>
            <div className="space-y-2">
              {PERMISSION_GROUPS.map(group => {
                const groupKeys = group.items.map(i => i.key);
                const allOn = groupKeys.every(k => selectedPerms.has(k));
                const someOn = groupKeys.some(k => selectedPerms.has(k));
                return (
                  <div key={group.id} className="border border-[var(--border)] rounded-lg overflow-hidden">
                    <button
                      onClick={() => toggleGroup(group.items)}
                      className="w-full flex items-center gap-2 px-3 py-2 bg-[var(--surface)] text-left hover:bg-[var(--surface-hover,var(--surface))]"
                    >
                      <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                        allOn ? "bg-purple-500 border-purple-500" :
                        someOn ? "bg-purple-500/30 border-purple-500/50" : "border-[var(--border)]"
                      }`}>
                        {allOn && <Check className="w-2.5 h-2.5 text-white" />}
                        {someOn && !allOn && <span className="block w-2 h-0.5 bg-purple-500 rounded" />}
                      </div>
                      <span className="text-xs font-semibold text-[var(--text-main)]">{group.label}</span>
                    </button>
                    <div className="px-3 py-2 grid grid-cols-1 gap-1">
                      {group.items.map(item => (
                        <label key={item.key} className="flex items-center gap-2 cursor-pointer group py-0.5">
                          <div
                            onClick={() => togglePerm(item.key)}
                            className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors cursor-pointer ${
                              selectedPerms.has(item.key) ? "bg-purple-500 border-purple-500" : "border-[var(--border)] group-hover:border-purple-500/50"
                            }`}
                          >
                            {selectedPerms.has(item.key) && <Check className="w-2.5 h-2.5 text-white" />}
                          </div>
                          <span onClick={() => togglePerm(item.key)} className="text-xs text-[var(--text-main)]">{item.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="p-5 border-t border-[var(--border)] flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2 text-sm rounded-lg border border-[var(--border)] text-[var(--text-sub)] hover:bg-[var(--surface)] transition-colors">
            Huỷ
          </button>
          <button onClick={handleCreate} className="flex-1 px-4 py-2 text-sm rounded-lg bg-purple-600 text-white font-medium hover:bg-purple-700 transition-colors">
            Tạo role
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── PermissionsTab ───────────────────────────────────────

function PermissionsTab({
  customRoles,
  onCustomRolesChange,
  rolePerms,
  onRolePermsChange,
  onCreateRole,
  onPersistRolePerms,
}: {
  customRoles: CustomRole[];
  onCustomRolesChange: (roles: CustomRole[]) => void;
  rolePerms: Record<string, PermissionType[]>;
  onRolePermsChange: (perms: Record<string, PermissionType[]>) => void;
  onCreateRole: () => void;
  onPersistRolePerms: (perms: Record<string, PermissionType[]>) => Promise<void>;
}) {
  const [selectedKey, setSelectedKey] = useState<string>(UserRole.EMPLOYEE);
  const [hasChanges, setHasChanges] = useState(false);

  const currentPerms = new Set<PermissionType>(rolePerms[selectedKey] ?? []);
  const isCustom = customRoles.some(r => r.key === selectedKey);

  const getRoleColor = (key: string) => {
    if (ROLE_COLORS[key as UserRoleType]) return ROLE_COLORS[key as UserRoleType];
    const cr = customRoles.find(r => r.key === key);
    return cr ? { bg: cr.colorBg, text: cr.colorText } : { bg: "bg-gray-500/20", text: "text-gray-500" };
  };

  const getRoleName = (key: string) => {
    if (ROLE_NAMES[key as UserRoleType]) return ROLE_NAMES[key as UserRoleType];
    return customRoles.find(r => r.key === key)?.name ?? key;
  };

  const togglePerm = (perm: PermissionType) => {
    const current = rolePerms[selectedKey] ?? [];
    const next = current.includes(perm) ? current.filter(p => p !== perm) : [...current, perm];
    onRolePermsChange({ ...rolePerms, [selectedKey]: next });
    setHasChanges(true);
  };

  const toggleGroup = (items: PermissionGroupItem[]) => {
    const keys = items.map(i => i.key);
    const current = rolePerms[selectedKey] ?? [];
    const allOn = keys.every(k => current.includes(k));
    const next = allOn ? current.filter(p => !keys.includes(p)) : [...new Set([...current, ...keys])];
    onRolePermsChange({ ...rolePerms, [selectedKey]: next });
    setHasChanges(true);
  };

  const handleSave = async () => {
    const overrides: Record<string, PermissionType[]> = {};
    for (const role of Object.values(UserRole)) {
      const perms = rolePerms[role];
      if (!perms) continue;
      const def = ROLE_PERMISSIONS[role as UserRoleType] ?? [];
      if (JSON.stringify([...perms].sort()) !== JSON.stringify([...def].sort())) {
        overrides[role] = perms;
      }
    }
    try { localStorage.setItem(LS_PERMS_KEY, JSON.stringify(overrides)); } catch { /* ignore */ }

    if (isCustom) {
      const updated = customRoles.map(cr =>
        cr.key === selectedKey ? { ...cr, permissions: rolePerms[selectedKey] ?? cr.permissions } : cr
      );
      onCustomRolesChange(updated);
      try { localStorage.setItem(LS_CUSTOM_ROLES_KEY, JSON.stringify(updated)); } catch { /* ignore */ }
    }

    try {
      await onPersistRolePerms(rolePerms);
      setHasChanges(false);
      toast.success("Đã lưu cấu hình quyền");
    } catch {
      toast.error("Không thể lưu cấu hình quyền lên máy chủ");
    }
  };

  const handleReset = () => {
    const def = ROLE_PERMISSIONS[selectedKey as UserRoleType];
    if (!def) return;
    onRolePermsChange({ ...rolePerms, [selectedKey]: [...def] });
    setHasChanges(true);
    toast.info("Đã đặt lại về mặc định (chưa lưu)");
  };

  const handleDeleteCustomRole = (roleKey: string) => {
    const updated = customRoles.filter(r => r.key !== roleKey);
    onCustomRolesChange(updated);
    try { localStorage.setItem(LS_CUSTOM_ROLES_KEY, JSON.stringify(updated)); } catch { /* ignore */ }
    if (selectedKey === roleKey) setSelectedKey(UserRole.EMPLOYEE);
    toast.success("Đã xóa role");
  };

  const color = getRoleColor(selectedKey);

  return (
    <div className="space-y-5">
      {/* Role selector */}
      <div className="space-y-3">
        <p className="text-xs font-semibold text-[var(--text-sub)] uppercase tracking-wide">Roles hệ thống</p>
        <div className="flex flex-wrap gap-2">
          {BUILTIN_ROLES.map(role => {
            const c = ROLE_COLORS[role];
            const isSelected = selectedKey === role;
            return (
              <button
                key={role}
                onClick={() => { setSelectedKey(role); setHasChanges(false); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  isSelected ? `${c.bg} ${c.text} border-current` : "border-[var(--border)] text-[var(--text-sub)] hover:border-purple-500/40"
                }`}
              >
                {ROLE_NAMES[role]}
              </button>
            );
          })}
        </div>

        {customRoles.length > 0 && (
          <>
            <p className="text-xs font-semibold text-[var(--text-sub)] uppercase tracking-wide">Roles tùy chỉnh</p>
            <div className="flex flex-wrap gap-2">
              {customRoles.map(cr => {
                const isSelected = selectedKey === cr.key;
                return (
                  <div key={cr.key} className="flex items-center gap-1">
                    <button
                      onClick={() => { setSelectedKey(cr.key); setHasChanges(false); }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        isSelected ? `${cr.colorBg} ${cr.colorText} border-current` : "border-[var(--border)] text-[var(--text-sub)] hover:border-purple-500/40"
                      }`}
                    >
                      {cr.name}
                    </button>
                    <button
                      onClick={() => handleDeleteCustomRole(cr.key)}
                      className="p-1 rounded text-[var(--text-sub)] hover:text-red-500 transition-colors"
                      title="Xóa role"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}

        <button
          onClick={onCreateRole}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-dashed border-purple-500/50 text-purple-500 hover:bg-purple-500/10 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Tạo role mới
        </button>
      </div>

      {/* Permission editor */}
      <div className="rounded-xl border border-[var(--border)] overflow-hidden">
        <div className={`px-4 py-3 flex items-center justify-between border-b border-[var(--border)] ${color.bg}`}>
          <div>
            <p className={`text-sm font-semibold ${color.text}`}>{getRoleName(selectedKey)}</p>
            <p className="text-xs text-[var(--text-sub)] mt-0.5">{currentPerms.size} quyền được kích hoạt</p>
          </div>
          <div className="flex gap-2">
            {!isCustom && (
              <button
                onClick={handleReset}
                className="px-3 py-1.5 text-xs rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--text-sub)] hover:bg-[var(--surface)] transition-colors"
              >
                Đặt lại mặc định
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={!hasChanges}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg font-medium transition-all ${
                hasChanges ? "bg-purple-600 text-white hover:bg-purple-700" : "bg-[var(--surface)] text-[var(--text-sub)] opacity-50 cursor-not-allowed"
              }`}
            >
              <Save className="h-3 w-3" />
              Lưu thay đổi
            </button>
          </div>
        </div>

        <div className="p-4 space-y-4 max-h-[55vh] overflow-y-auto">
          {PERMISSION_GROUPS.map(group => {
            const groupKeys = group.items.map(i => i.key);
            const allOn = groupKeys.every(k => currentPerms.has(k));
            const someOn = groupKeys.some(k => currentPerms.has(k));
            return (
              <div key={group.id}>
                <button
                  onClick={() => toggleGroup(group.items)}
                  className="flex items-center gap-2 mb-2 text-left w-full"
                >
                  <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                    allOn ? "bg-purple-500 border-purple-500" :
                    someOn ? "bg-purple-500/30 border-purple-500/50" : "border-[var(--border)]"
                  }`}>
                    {allOn && <Check className="w-2.5 h-2.5 text-white" />}
                    {someOn && !allOn && <span className="block w-2 h-0.5 bg-purple-500 rounded" />}
                  </div>
                  <span className="text-xs font-semibold text-[var(--text-main)]">{group.label}</span>
                </button>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 ml-6">
                  {group.items.map(item => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => togglePerm(item.key)}
                      className={`w-full flex items-center justify-between gap-3 p-1.5 rounded-lg transition-colors ${
                        currentPerms.has(item.key)
                          ? "bg-purple-500/10 hover:bg-purple-500/20"
                          : "hover:bg-[var(--surface)]"
                      }`}
                    >
                      <span className="text-xs text-[var(--text-main)] leading-tight text-left select-none">
                        {item.label}
                      </span>
                      <span className="flex items-center gap-2 shrink-0">
                        <span className={`text-[10px] font-semibold ${currentPerms.has(item.key) ? "text-purple-500" : "text-[var(--text-sub)]"}`}>
                          {currentPerms.has(item.key) ? "ON" : "OFF"}
                        </span>
                        <span
                          className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors ${
                            currentPerms.has(item.key) ? "bg-purple-500" : "bg-[var(--border)]"
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              currentPerms.has(item.key) ? "translate-x-5" : "translate-x-1"
                            }`}
                          />
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────

export default function RoleManagementPage() {
  const { user: currentUser } = useAuth();
  const { rolePerms, setRolePerms, customRoles, setCustomRoles } = usePermissionsOverride();
  const [activeTab, setActiveTab] = useState<"users" | "permissions">("users");

  // Users tab
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState<UserRoleType | "ALL">("ALL");
  const [updating, setUpdating] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ userId: string; userName: string; newRole: UserRoleType } | null>(null);
  const [showCreateRole, setShowCreateRole] = useState(false);

  const loadRolePermissions = useCallback(async () => {
    try {
      const res = await getRolePermissions();
      if (res?.rolePerms && typeof res.rolePerms === "object") {
        setRolePerms((prev) => ({ ...prev, ...res.rolePerms }));
      }
    } catch {
      toast.error("Không thể tải cấu hình quyền từ máy chủ");
    }
  }, [setRolePerms]);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAllUsers({ limit: 500 });
      const list = extractUsers(res);
      if (list.length === 0 && res) toast.error("Dữ liệu người dùng không đúng định dạng");
      setUsers(list);
    } catch {
      toast.error("Không thể tải danh sách người dùng");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);
  useEffect(() => { loadRolePermissions(); }, [loadRolePermissions]);

  const persistRolePerms = useCallback(async (perms: Record<string, PermissionType[]>) => {
    await updateRolePermissions(perms);
  }, []);

  const applyRoleChange = async (userId: string, newRole: UserRoleType) => {
    setUpdating(userId);
    try {
      await updateUserByAdmin(userId, { role: newRole });
      setUsers(prev => prev.map(u => u._id === userId ? { ...u, role: newRole } : u));
      toast.success(`Đã cập nhật role thành ${ROLE_NAMES[newRole]}`);
    } catch (err: unknown) {
      toast.error((err as { message?: string })?.message ?? "Cập nhật role thất bại");
    } finally {
      setUpdating(null);
    }
  };

  const handleRoleChange = (userId: string, userName: string, newRole: UserRoleType) => {
    if (!currentUser) return;
    if (!canManageRole(currentUser.role as UserRoleType, newRole)) {
      toast.error("Bạn không có quyền gán role này"); return;
    }
    if (userId === currentUser._id) {
      toast.error("Không thể tự thay đổi role của mình"); return;
    }
    if (HIGH_PRIVILEGE_ROLES.includes(newRole)) {
      setConfirm({ userId, userName, newRole }); return;
    }
    applyRoleChange(userId, newRole);
  };

  const handleCreateRole = (role: CustomRole) => {
    const updated = [...customRoles, role];
    setCustomRoles(updated);
    try { localStorage.setItem(LS_CUSTOM_ROLES_KEY, JSON.stringify(updated)); } catch { /* ignore */ }
    setRolePerms(prev => ({ ...prev, [role.key]: role.permissions }));
    toast.success(`Đã tạo role "${role.name}"`);
  };

  const filtered = users.filter(u => {
    const matchSearch = u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = filterRole === "ALL" || u.role === filterRole;
    return matchSearch && matchRole;
  });

  return (
    <div className="p-6 space-y-6">
      {confirm && (
        <ConfirmDialog
          userName={confirm.userName}
          newRole={confirm.newRole}
          onConfirm={() => { applyRoleChange(confirm.userId, confirm.newRole); setConfirm(null); }}
          onCancel={() => setConfirm(null)}
        />
      )}
      {showCreateRole && (
        <CreateRoleDialog
          onClose={() => setShowCreateRole(false)}
          onCreate={handleCreateRole}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-purple-500/20">
            <Shield className="h-5 w-5 text-purple-500" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-[var(--text-main)]">Phân quyền hệ thống</h1>
            <p className="text-sm text-[var(--text-sub)]">Quản lý role và quyền hạn của tất cả người dùng</p>
          </div>
        </div>
        {activeTab === "users" && (
          <button
            onClick={loadUsers}
            className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-[var(--border)] text-[var(--text-sub)] hover:bg-[var(--surface)] transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Làm mới
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-[var(--surface)] rounded-xl w-fit">
        {(["users", "permissions"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex items-center gap-2 px-4 py-2 text-sm rounded-lg transition-all ${
              activeTab === tab ? "bg-[var(--background)] text-[var(--text-main)] shadow-sm font-medium" : "text-[var(--text-sub)] hover:text-[var(--text-main)]"
            }`}
          >
            {tab === "users" ? <Users className="h-4 w-4" /> : <Settings className="h-4 w-4" />}
            {tab === "users" ? "Phân quyền người dùng" : "Cấu hình quyền"}
          </button>
        ))}
      </div>

      {activeTab === "users" ? (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {BUILTIN_ROLES.map(role => {
              const count = users.filter(u => u.role === role).length;
              const color = ROLE_COLORS[role];
              return (
                <div
                  key={role}
                  className="p-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] cursor-pointer hover:border-purple-500/40 transition-colors"
                  onClick={() => setFilterRole(prev => prev === role ? "ALL" : role)}
                >
                  <p className={`text-xs font-medium ${color.text}`}>{ROLE_NAMES[role]}</p>
                  <p className="text-2xl font-bold text-[var(--text-main)] mt-1">{count}</p>
                </div>
              );
            })}
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-sub)]" />
              <input
                type="text"
                placeholder="Tìm theo tên hoặc email..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-main)] placeholder:text-[var(--text-sub)] focus:outline-none focus:border-purple-500/60"
              />
            </div>
            <div className="relative">
              <select
                value={filterRole}
                onChange={e => setFilterRole(e.target.value as UserRoleType | "ALL")}
                className="appearance-none pl-3 pr-8 py-2 text-sm rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-main)] focus:outline-none focus:border-purple-500/60 cursor-pointer"
              >
                <option value="ALL">Tất cả role</option>
                {BUILTIN_ROLES.map(r => <option key={r} value={r}>{ROLE_NAMES[r]}</option>)}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-sub)] pointer-events-none" />
            </div>
          </div>

          {/* Table */}
          <div className="rounded-xl border border-[var(--border)] overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--surface)]">
                  <th className="text-left px-4 py-3 font-medium text-[var(--text-sub)]">Người dùng</th>
                  <th className="text-left px-4 py-3 font-medium text-[var(--text-sub)] hidden sm:table-cell">Phòng ban</th>
                  <th className="text-left px-4 py-3 font-medium text-[var(--text-sub)]">Role hiện tại</th>
                  <th className="text-left px-4 py-3 font-medium text-[var(--text-sub)]">Thay đổi role</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-12 text-center text-[var(--text-sub)]">
                      <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
                      Đang tải...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-12 text-center text-[var(--text-sub)]">
                      Không tìm thấy người dùng nào
                    </td>
                  </tr>
                ) : (
                  filtered.map(u => {
                    const roleColor = ROLE_COLORS[u.role];
                    const isSelf = u._id === currentUser?._id;
                    const isUpdating = updating === u._id;
                    return (
                      <tr key={u._id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface)] transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-500 font-semibold text-xs shrink-0">
                              {u.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium text-[var(--text-main)]">
                                {u.name}
                                {isSelf && <span className="ml-1 text-xs text-purple-500">(bạn)</span>}
                              </p>
                              <p className="text-xs text-[var(--text-sub)]">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-[var(--text-sub)] hidden sm:table-cell">
                          {u.department?.name ?? "—"}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${roleColor.bg} ${roleColor.text}`}>
                            {ROLE_NAMES[u.role]}
                          </span>
                          {!u.isActive && (
                            <span className="ml-1 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-500/20 text-gray-400">
                              Vô hiệu
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {isSelf ? (
                            <span className="text-xs text-[var(--text-sub)] italic">Không thể tự đổi</span>
                          ) : (
                            <div className="relative inline-block">
                              <select
                                value={u.role}
                                disabled={isUpdating}
                                onChange={e => handleRoleChange(u._id, u.name, e.target.value as UserRoleType)}
                                className={`appearance-none pl-2 pr-6 py-1 text-xs rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--text-main)] focus:outline-none focus:border-purple-500/60 cursor-pointer transition-opacity ${isUpdating ? "opacity-50" : ""}`}
                              >
                                {ASSIGNABLE_ROLES.map(r => <option key={r} value={r}>{ROLE_NAMES[r]}</option>)}
                              </select>
                              <ChevronDown className="absolute right-1 top-1/2 -translate-y-1/2 h-3 w-3 text-[var(--text-sub)] pointer-events-none" />
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {!loading && (
            <p className="text-xs text-[var(--text-sub)] text-right">
              Hiển thị {filtered.length} / {users.length} người dùng
            </p>
          )}
        </>
      ) : (
        <PermissionsTab
          customRoles={customRoles}
          onCustomRolesChange={setCustomRoles}
          rolePerms={rolePerms}
          onRolePermsChange={setRolePerms}
          onCreateRole={() => setShowCreateRole(true)}
          onPersistRolePerms={persistRolePerms}
        />
      )}
    </div>
  );
}
