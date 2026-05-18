import { useEffect, useState } from "react";
import { CalendarDays, Plus, Pencil, Trash2, X, Check, UserCog } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  listLeaveTypes,
  createLeaveType,
  updateLeaveType,
  deleteLeaveType,
  adjustLeaveBalance,
  type LeaveType,
  type CreateLeaveTypePayload,
} from "@/services/leaveTypeService";
import { getAllUsers } from "@/services/userService";
import { useTranslation } from "react-i18next";

interface UserOption {
  _id: string;
  name: string;
  email: string;
}

type LeaveTypeForm = {
  code: string;
  name: string;
  description: string;
  defaultQuotaDays: number;
  isPaid: boolean;
  requiresApproval: boolean;
  isActive: boolean;
};

const emptyForm = (): LeaveTypeForm => ({
  code: "",
  name: "",
  description: "",
  defaultQuotaDays: 12,
  isPaid: true,
  requiresApproval: true,
  isActive: true,
});

const BALANCE_LEAVE_TYPES = [
  { value: "annual", label: "Nghỉ phép năm" },
  { value: "sick", label: "Nghỉ ốm" },
  { value: "unpaid", label: "Nghỉ không lương" },
  { value: "compensatory", label: "Nghỉ bù" },
  { value: "maternity", label: "Nghỉ thai sản" },
] as const;

export default function LeaveTypeManagementPage() {
  const { t } = useTranslation();
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [loading, setLoading] = useState(true);

  // Leave type form dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<LeaveTypeForm>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Leave balance adjustment
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [balanceForm, setBalanceForm] = useState({
    userId: "",
    leaveType: "annual" as (typeof BALANCE_LEAVE_TYPES)[number]["value"],
    total: 12,
  });
  const [adjusting, setAdjusting] = useState(false);

  const loadTypes = async () => {
    setLoading(true);
    try {
      const data = await listLeaveTypes();
      setLeaveTypes(data);
    } catch {
      toast.error(t("dashboard:leaveTypeMgmt.toasts.loadTypesError"));
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    if (users.length > 0) return;
    setLoadingUsers(true);
    try {
      const raw = await getAllUsers({ limit: 500 }) as { users?: UserOption[] } | UserOption[];
      setUsers(Array.isArray(raw) ? raw : (raw.users ?? []));
    } catch {
      toast.error(t("dashboard:leaveTypeMgmt.toasts.loadUsersError"));
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => { loadTypes(); }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm());
    setDialogOpen(true);
  };

  const openEdit = (lt: LeaveType) => {
    setEditingId(lt._id);
    setForm({
      code: lt.code,
      name: lt.name,
      description: lt.description ?? "",
      defaultQuotaDays: lt.defaultQuotaDays,
      isPaid: lt.isPaid,
      requiresApproval: lt.requiresApproval,
      isActive: lt.isActive,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error(t("dashboard:leaveTypeMgmt.toasts.nameRequired")); return; }
    if (!editingId && !form.code.trim()) { toast.error(t("dashboard:leaveTypeMgmt.toasts.codeRequired")); return; }
    setSaving(true);
    try {
      const payload: CreateLeaveTypePayload = {
        code: form.code,
        name: form.name,
        description: form.description || undefined,
        defaultQuotaDays: form.defaultQuotaDays,
        isPaid: form.isPaid,
        requiresApproval: form.requiresApproval,
        isActive: form.isActive,
      };
      if (editingId) {
        await updateLeaveType(editingId, payload);
        toast.success(t("dashboard:leaveTypeMgmt.toasts.updateSuccess"));
      } else {
        await createLeaveType(payload);
        toast.success(t("dashboard:leaveTypeMgmt.toasts.createSuccess"));
      }
      setDialogOpen(false);
      loadTypes();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t("dashboard:leaveTypeMgmt.toasts.saveError"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteLeaveType(id);
      toast.success(t("dashboard:leaveTypeMgmt.toasts.deleteSuccess"));
      setDeleteId(null);
      loadTypes();
    } catch {
      toast.error(t("dashboard:leaveTypeMgmt.toasts.deleteError"));
    }
  };

  const handleAdjustBalance = async () => {
    if (!balanceForm.userId) { toast.error(t("dashboard:leaveTypeMgmt.toasts.selectUser")); return; }
    if (balanceForm.total < 0 || balanceForm.total > 365) { toast.error(t("dashboard:leaveTypeMgmt.toasts.invalidQuota")); return; }
    setAdjusting(true);
    try {
      const result = await adjustLeaveBalance(balanceForm.userId, {
        leaveType: balanceForm.leaveType,
        total: balanceForm.total,
      });
      toast.success(
        t("dashboard:leaveTypeMgmt.toasts.adjustSuccess", {
          type: BALANCE_LEAVE_TYPES.find((item) => item.value === balanceForm.leaveType)?.label,
          remaining: result.remaining,
        })
      );
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t("dashboard:leaveTypeMgmt.toasts.adjustError"));
    } finally {
      setAdjusting(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <CalendarDays className="w-6 h-6 text-[var(--primary)]" />
        <h1 className="text-2xl font-bold text-[var(--text-main)]">
          {t("dashboard:leaveTypeMgmt.title")}
        </h1>
      </div>

      <Tabs defaultValue="types">
        <TabsList>
          <TabsTrigger value="types">{t("dashboard:leaveTypeMgmt.tabs.types")}</TabsTrigger>
          <TabsTrigger value="balance" onClick={loadUsers}>
            <UserCog className="w-4 h-4 mr-1" />
            {t("dashboard:leaveTypeMgmt.tabs.balance")}
          </TabsTrigger>
        </TabsList>

        {/* ---- TAB 1: Leave types CRUD ---- */}
        <TabsContent value="types" className="mt-4">
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base">{t("dashboard:leaveTypeMgmt.listTitle")}</CardTitle>
              <Button size="sm" onClick={openCreate}>
                <Plus className="w-4 h-4 mr-1" /> {t("dashboard:leaveTypeMgmt.add")}
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="py-12 text-center text-[var(--text-sub)]">
                  {t("dashboard:leaveTypeMgmt.loading")}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Tên</TableHead>
                      <TableHead className="w-24 text-center">Quota mặc định</TableHead>
                      <TableHead className="w-24 text-center">Có lương</TableHead>
                      <TableHead className="w-28 text-center">Cần duyệt</TableHead>
                      <TableHead className="w-24 text-center">Trạng thái</TableHead>
                      <TableHead className="w-24 text-right">Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leaveTypes.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-[var(--text-sub)]">
                          {t("dashboard:leaveTypeMgmt.empty")}
                        </TableCell>
                      </TableRow>
                    ) : (
                      leaveTypes.map((lt) => (
                        <TableRow key={lt._id}>
                          <TableCell className="font-mono text-sm">{lt.code}</TableCell>
                          <TableCell className="font-medium">{lt.name}</TableCell>
                          <TableCell className="text-center">
                            {t("dashboard:leaveTypeMgmt.days", { count: lt.defaultQuotaDays })}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant={lt.isPaid ? "default" : "outline"}>
                              {lt.isPaid ? "Có" : "Không"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant={lt.requiresApproval ? "default" : "outline"}>
                              {lt.requiresApproval ? "Có" : "Không"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant={lt.isActive ? "success" : "error"}>
                              {lt.isActive ? "Hoạt động" : "Tắt"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(lt)}>
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive"
                                onClick={() => setDeleteId(lt._id)}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---- TAB 2: Leave balance adjustment ---- */}
        <TabsContent value="balance" className="mt-4">
          <Card className="max-w-lg">
            <CardHeader>
            <CardTitle className="text-base">
              {t("dashboard:leaveTypeMgmt.balanceTitle")}
            </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <Label>{t("dashboard:leaveTypeMgmt.fields.employee")}</Label>
                <Select
                  value={balanceForm.userId}
                  onValueChange={(v) => setBalanceForm((f) => ({ ...f, userId: v }))}
                  disabled={loadingUsers}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={loadingUsers
                        ? t("dashboard:leaveTypeMgmt.loading")
                        : t("dashboard:leaveTypeMgmt.fields.employeePlaceholder")}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((u) => (
                      <SelectItem key={u._id} value={u._id}>
                        {u.name} — {u.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>{t("dashboard:leaveTypeMgmt.fields.leaveType")}</Label>
                <Select
                  value={balanceForm.leaveType}
                  onValueChange={(v) =>
                    setBalanceForm((f) => ({
                      ...f,
                      leaveType: v as (typeof BALANCE_LEAVE_TYPES)[number]["value"],
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BALANCE_LEAVE_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>{t("dashboard:leaveTypeMgmt.fields.quota")}</Label>
                <Input
                  type="number"
                  min={0}
                  max={365}
                  value={balanceForm.total}
                  onChange={(e) =>
                    setBalanceForm((f) => ({ ...f, total: Number(e.target.value) }))
                  }
                />
              </div>
              <Button onClick={handleAdjustBalance} disabled={adjusting} className="w-full">
                {adjusting
                  ? t("dashboard:leaveTypeMgmt.actions.updating")
                  : t("dashboard:leaveTypeMgmt.actions.updateQuota")}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingId
                ? t("dashboard:leaveTypeMgmt.dialog.editTitle")
                : t("dashboard:leaveTypeMgmt.dialog.createTitle")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Code <span className="text-destructive">*</span></Label>
                <Input
                  value={form.code}
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toLowerCase() }))}
                  disabled={!!editingId}
                  placeholder="vd: annual"
                  className="font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label>Quota mặc định (ngày)</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.defaultQuotaDays}
                  onChange={(e) => setForm((f) => ({ ...f, defaultQuotaDays: Number(e.target.value) }))}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Tên loại phép <span className="text-destructive">*</span></Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="vd: Nghỉ phép năm"
              />
            </div>
            <div className="space-y-1">
              <Label>Mô tả</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Mô tả ngắn..."
              />
            </div>
            <div className="flex gap-6">
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.isPaid}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, isPaid: v }))}
                />
                <Label>Có lương</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.requiresApproval}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, requiresApproval: v }))}
                />
                <Label>Cần duyệt</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.isActive}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: v }))}
                />
                <Label>Hoạt động</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t("dashboard:leaveTypeMgmt.actions.cancel")}
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving
                ? t("dashboard:leaveTypeMgmt.actions.saving")
                : t("dashboard:leaveTypeMgmt.actions.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("dashboard:leaveTypeMgmt.deleteDialog.title")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[var(--text-sub)]">
            {t("dashboard:leaveTypeMgmt.deleteDialog.description")}
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              <X className="w-4 h-4 mr-1" /> {t("dashboard:leaveTypeMgmt.actions.cancel")}
            </Button>
            <Button
              variant="outline"
              className="border-red-500 text-red-600 hover:bg-red-50"
              onClick={() => deleteId && handleDelete(deleteId)}
            >
              <Check className="w-4 h-4 mr-1" /> {t("dashboard:leaveTypeMgmt.actions.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
