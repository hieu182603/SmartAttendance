import { useCallback, useEffect, useState } from "react";
import { CalendarDays, Plus, Pencil, Trash2, X, Check } from "lucide-react";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  listLeaveTypes,
  createLeaveType,
  updateLeaveType,
  deleteLeaveType,
  type LeaveType,
  type CreateLeaveTypePayload,
} from "@/services/leaveTypeService";
import { useAuth } from "@/context/AuthContext";
import { useTranslation } from "react-i18next";
import { SuperAdminCompanyFilterSlot } from "@/components/dashboard/SuperAdminCompanyFilterSlot";

type LeaveTypeForm = {
  name: string;
  description: string;
  defaultQuotaDays: number;
  isPaid: boolean;
  requiresApproval: boolean;
  isActive: boolean;
};

const emptyForm = (): LeaveTypeForm => ({
  name: "",
  description: "",
  defaultQuotaDays: 12,
  isPaid: true,
  requiresApproval: true,
  isActive: true,
});

/** Tạo mã nội bộ từ tên khi thêm loại phép mới (backend vẫn cần `code`). */
function slugifyLeaveTypeCode(name: string): string {
  const slug = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 32);
  return slug.length >= 1 ? slug : `leave_${Date.now().toString(36).slice(-8)}`;
}

export default function LeaveTypeManagementPage() {
  const { t } = useTranslation();
  const { token, loading: authLoading } = useAuth();
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [loading, setLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<LeaveTypeForm>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const loadTypes = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await listLeaveTypes();
      setLeaveTypes(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("dashboard:leaveTypeMgmt.toasts.loadTypesError");
      toast.error(msg);
      setLeaveTypes([]);
    } finally {
      setLoading(false);
    }
  }, [token, t]);

  useEffect(() => {
    if (authLoading || !token) return;
    loadTypes();
  }, [authLoading, token, loadTypes]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm());
    setDialogOpen(true);
  };

  const openEdit = (lt: LeaveType) => {
    setEditingId(lt._id);
    setForm({
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
    setSaving(true);
    try {
      const fields = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        defaultQuotaDays: form.defaultQuotaDays,
        isPaid: form.isPaid,
        requiresApproval: form.requiresApproval,
        isActive: form.isActive,
      };
      if (editingId) {
        await updateLeaveType(editingId, fields);
        toast.success(t("dashboard:leaveTypeMgmt.toasts.updateSuccess"));
      } else {
        const payload: CreateLeaveTypePayload = {
          code: slugifyLeaveTypeCode(form.name),
          ...fields,
        };
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

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <CalendarDays className="w-6 h-6 text-[var(--primary)]" />
        <h1 className="text-2xl font-bold text-[var(--text-main)]">
          {t("dashboard:leaveTypeMgmt.title")}
        </h1>
      </div>

      <Card>
        <CardHeader className="pb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">{t("dashboard:leaveTypeMgmt.listTitle")}</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <SuperAdminCompanyFilterSlot />
          <Button size="sm" onClick={openCreate}>
            <Plus className="w-4 h-4 mr-1" /> {t("dashboard:leaveTypeMgmt.add")}
          </Button>
          </div>
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
                  <TableHead>Tên</TableHead>
                  <TableHead className="whitespace-nowrap text-center">Quota mặc định</TableHead>
                  <TableHead className="w-24 text-center">Có lương</TableHead>
                  <TableHead className="w-28 text-center">Cần duyệt</TableHead>
                  <TableHead className="w-24 text-center">Trạng thái</TableHead>
                  <TableHead className="w-24 text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaveTypes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-[var(--text-sub)]">
                      {t("dashboard:leaveTypeMgmt.empty")}
                    </TableCell>
                  </TableRow>
                ) : (
                  leaveTypes.map((lt) => (
                    <TableRow key={lt._id}>
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg bg-[var(--surface)] border-[var(--border)]">
          <DialogHeader className="space-y-1 pb-0">
            <DialogTitle>
              {editingId
                ? t("dashboard:leaveTypeMgmt.dialog.editTitle")
                : t("dashboard:leaveTypeMgmt.dialog.createTitle")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5 pt-2">
            <div className="grid grid-cols-[1fr_6.5rem] gap-4">
              <div className="space-y-2 min-w-0">
                <Label>
                  Tên loại phép <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Ví dụ: Nghỉ phép năm"
                />
              </div>
              <div className="space-y-2">
                <Label className="whitespace-nowrap">Quota (ngày)</Label>
                <Input
                  type="number"
                  min={0}
                  max={365}
                  className="w-full"
                  value={form.defaultQuotaDays}
                  onChange={(e) => setForm((f) => ({ ...f, defaultQuotaDays: Number(e.target.value) }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Mô tả</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Mô tả ngắn (tuỳ chọn)"
              />
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--shell)]/40 p-4 space-y-3">
              <p className="text-xs font-medium text-[var(--text-sub)]">Cấu hình</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <label className="flex items-center justify-between sm:flex-col sm:items-start sm:gap-2 gap-3 cursor-pointer">
                  <span className="text-sm text-[var(--text-main)]">Có lương</span>
                  <Switch
                    checked={form.isPaid}
                    onCheckedChange={(v) => setForm((f) => ({ ...f, isPaid: v }))}
                  />
                </label>
                <label className="flex items-center justify-between sm:flex-col sm:items-start sm:gap-2 gap-3 cursor-pointer">
                  <span className="text-sm text-[var(--text-main)]">Cần duyệt</span>
                  <Switch
                    checked={form.requiresApproval}
                    onCheckedChange={(v) => setForm((f) => ({ ...f, requiresApproval: v }))}
                  />
                </label>
                <label className="flex items-center justify-between sm:flex-col sm:items-start sm:gap-2 gap-3 cursor-pointer">
                  <span className="text-sm text-[var(--text-main)]">Hoạt động</span>
                  <Switch
                    checked={form.isActive}
                    onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: v }))}
                  />
                </label>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0 pt-2">
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
