import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import UnauthorizedPage from "@/components/UnauthorizedPage";
import {
  Shield, RefreshCw,
  Plus, X, Save, Check, Trash2,
} from "lucide-react";
import {
  getRolePermissions,
  updateRolePermissions,
  getCustomRoles,
  createCustomRole,
  deleteCustomRole,
} from "@/services/userService";
import { getMe } from "@/services/authService";
import { useAuth } from "@/context/AuthContext";
import { normalizeAuthUser } from "@/utils/userId";
import {
  UserRole,
  Permission,
  type UserRoleType,
  type PermissionType,
  ROLE_NAMES,
  ROLE_COLORS,
  ROLE_PERMISSIONS,
} from "@/utils/roles";
import {
  usePermissionsOverride,
  type CustomRole,
  LS_PERMS_KEY,
  LS_CUSTOM_ROLES_KEY,
} from "@/context/PermissionsContext";

// ─── Types ───────────────────────────────────────────────

interface PermissionGroupItem {
  key: PermissionType;
  label: string;
}

// ─── Constants ───────────────────────────────────────────

const BUILTIN_ROLES = Object.values(UserRole).filter(
  (r) => r !== UserRole.TRIAL && r !== UserRole.SUPER_ADMIN
) as UserRoleType[];

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
  onResetFromServer,
}: {
  customRoles: CustomRole[];
  onCustomRolesChange: (roles: CustomRole[]) => void;
  rolePerms: Record<string, PermissionType[]>;
  onRolePermsChange: (perms: Record<string, PermissionType[]>) => void;
  onCreateRole: () => void;
  onPersistRolePerms: (perms: Record<string, PermissionType[]>) => Promise<void>;
  onResetFromServer: () => Promise<void>;
}) {
  const { setUser } = useAuth();
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
    try {
      // 1. Persist to server first
      await onPersistRolePerms(rolePerms);

      // Refresh auth user so session updates with new permissions immediately
      try {
        const me = await getMe();
        setUser(normalizeAuthUser(me));
      } catch (authErr) {
        console.error("Failed to refresh user permissions after update:", authErr);
      }

      // 2. Only write to localStorage after server confirms success
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

      setHasChanges(false);
      toast.success("Đã lưu cấu hình quyền");
    } catch {
      toast.error("Không thể lưu cấu hình quyền lên máy chủ");
      // Revert local modifications to match server state
      try {
        await onResetFromServer();
        setHasChanges(false);
      } catch {
        toast.error("Không thể tải lại cấu hình quyền từ máy chủ");
      }
    }
  };

  const handleReset = () => {
    const def = ROLE_PERMISSIONS[selectedKey as UserRoleType];
    if (!def) return;
    onRolePermsChange({ ...rolePerms, [selectedKey]: [...def] });
    setHasChanges(true);
    toast.info("Đã đặt lại về mặc định (chưa lưu)");
  };

  const handleDeleteCustomRole = async (roleKey: string) => {
    try {
      await deleteCustomRole(roleKey);
      onCustomRolesChange(customRoles.filter(r => r.key !== roleKey));
      const nextPerms = { ...rolePerms };
      delete nextPerms[roleKey];
      onRolePermsChange(nextPerms);
      if (selectedKey === roleKey) setSelectedKey(UserRole.EMPLOYEE);
      toast.success("Đã xóa role tùy chỉnh");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Không thể xóa role");
    }
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

        <div className="p-4 space-y-4">
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

export default function RoleManagementPage() {
  const { rolePerms, setRolePerms, customRoles, setCustomRoles } = usePermissionsOverride();
  const [showCreateRole, setShowCreateRole] = useState(false);
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);

  const loadRolePermissions = useCallback(async () => {
    try {
      setLoading(true);
      setUnauthorized(false);
      const [res, serverCustomRoles] = await Promise.all([
        getRolePermissions(),
        getCustomRoles().catch(() => [] as CustomRole[]),
      ]);
      if (res?.rolePerms && typeof res.rolePerms === "object") {
        setRolePerms((prev) => ({ ...prev, ...res.rolePerms }));
      }
      setCustomRoles(serverCustomRoles);
    } catch (err: any) {
      if (err?.response?.status === 403 || err?.status === 403) {
        setUnauthorized(true);
      } else {
        toast.error("Không thể tải cấu hình quyền từ máy chủ");
      }
    } finally {
      setLoading(false);
    }
  }, [setRolePerms]);

  useEffect(() => { loadRolePermissions(); }, [loadRolePermissions]);

  const persistRolePerms = useCallback(async (perms: Record<string, PermissionType[]>) => {
    await updateRolePermissions(perms);
  }, []);

  const handleCreateRole = async (role: CustomRole) => {
    try {
      const created = await createCustomRole(role);
      setCustomRoles(prev => [...prev, created]);
      setRolePerms(prev => ({ ...prev, [created.key]: created.permissions }));
      toast.success(`Đã tạo role "${created.name}"`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Không thể tạo role");
    }
  };

  if (unauthorized) {
    return <UnauthorizedPage />;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {showCreateRole && (
        <CreateRoleDialog
          onClose={() => setShowCreateRole(false)}
          onCreate={handleCreateRole}
        />
      )}

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-purple-500/20">
            <Shield className="h-5 w-5 text-purple-500" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-[var(--text-main)]">Cấu hình quyền theo role</h1>
            <p className="text-sm text-[var(--text-sub)]">
              Thiết lập bộ quyền mặc định cho từng vai trò. Gán vai trò cho từng nhân viên thực hiện tại{" "}
              <span className="text-[var(--text-main)] font-medium">Quản lý nhân viên → Chỉnh sửa → Phân quyền</span>.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => { void loadRolePermissions(); }}
          className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-[var(--border)] text-[var(--text-sub)] hover:bg-[var(--surface)] transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Làm mới từ máy chủ
        </button>
      </div>

      <PermissionsTab
        customRoles={customRoles}
        onCustomRolesChange={setCustomRoles}
        rolePerms={rolePerms}
        onRolePermsChange={setRolePerms}
        onCreateRole={() => setShowCreateRole(true)}
        onPersistRolePerms={persistRolePerms}
        onResetFromServer={loadRolePermissions}
      />
    </div>
  );
}
