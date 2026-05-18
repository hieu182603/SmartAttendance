import { useEffect, useState } from "react";
import { PlusCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { createManualAttendance } from "@/services/attendanceService";
import { getAllUsers } from "@/services/userService";
import { useTranslation } from "react-i18next";

interface UserOption {
  _id: string;
  name: string;
  email: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const STATUS_OPTIONS = [
  { value: "present", labelKey: "dashboard:manualAttendance.status.present", fallback: "Có mặt" },
  { value: "late", labelKey: "dashboard:manualAttendance.status.late", fallback: "Đi muộn" },
  { value: "absent", labelKey: "dashboard:manualAttendance.status.absent", fallback: "Vắng mặt" },
  { value: "on_leave", labelKey: "dashboard:manualAttendance.status.onLeave", fallback: "Nghỉ phép" },
  { value: "overtime", labelKey: "dashboard:manualAttendance.status.overtime", fallback: "Làm thêm" },
  { value: "weekend", labelKey: "dashboard:manualAttendance.status.weekend", fallback: "Cuối tuần" },
] as const;

type StatusValue = (typeof STATUS_OPTIONS)[number]["value"];

interface FormState {
  userId: string;
  date: string;
  checkIn: string;
  checkOut: string;
  status: StatusValue;
  notes: string;
}

const today = () => new Date().toISOString().split("T")[0];

const emptyForm = (): FormState => ({
  userId: "",
  date: today(),
  checkIn: "",
  checkOut: "",
  status: "present",
  notes: "",
});

export default function ManualAttendanceDialog({ open, onOpenChange, onSuccess }: Props) {
  const { t } = useTranslation();
  const [form, setForm] = useState<FormState>(emptyForm());
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (users.length > 0) return;
    setLoadingUsers(true);
    getAllUsers({ limit: 500 })
      .then((res: unknown) => {
        const r = res as { users?: UserOption[] } | UserOption[];
        setUsers(Array.isArray(r) ? r : (r.users ?? []));
      })
      .catch(() => toast.error(t("dashboard:manualAttendance.toasts.loadUsersError")))
      .finally(() => setLoadingUsers(false));
  }, [open, users.length]);

  const handleSubmit = async () => {
    if (!form.userId) { toast.error(t("dashboard:manualAttendance.toasts.selectUser")); return; }
    if (!form.date) { toast.error(t("dashboard:manualAttendance.toasts.selectDate")); return; }
    if (form.checkIn && form.checkOut && form.checkIn >= form.checkOut) {
      toast.error(t("dashboard:manualAttendance.toasts.invalidTimeRange"));
      return;
    }

    setSaving(true);
    try {
      await createManualAttendance({
        userId: form.userId,
        date: form.date,
        checkIn: form.checkIn || undefined,
        checkOut: form.checkOut || undefined,
        status: form.status,
        notes: form.notes || undefined,
      });
      toast.success(t("dashboard:manualAttendance.toasts.createSuccess"));
      setForm(emptyForm());
      onOpenChange(false);
      onSuccess?.();
    } catch (e: unknown) {
      const msg =
        e instanceof Error
          ? e.message
          : t("dashboard:manualAttendance.toasts.createFailed");
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) setForm(emptyForm());
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PlusCircle className="w-5 h-5 text-[var(--primary)]" />
            {t("dashboard:manualAttendance.title")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label>
              {t("dashboard:manualAttendance.fields.employee")} <span className="text-destructive">*</span>
            </Label>
            <Select
              value={form.userId}
              onValueChange={(v) => setForm((f) => ({ ...f, userId: v }))}
              disabled={loadingUsers}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={loadingUsers
                    ? t("dashboard:manualAttendance.common.loading")
                    : t("dashboard:manualAttendance.fields.employeePlaceholder")}
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

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>
                {t("dashboard:manualAttendance.fields.date")} <span className="text-destructive">*</span>
              </Label>
              <Input
                type="date"
                value={form.date}
                max={today()}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>{t("dashboard:manualAttendance.fields.status")}</Label>
              <Select
                value={form.status}
                onValueChange={(v) => setForm((f) => ({ ...f, status: v as StatusValue }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {t(s.labelKey)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>{t("dashboard:manualAttendance.fields.checkIn")}</Label>
              <Input
                type="time"
                value={form.checkIn}
                onChange={(e) => setForm((f) => ({ ...f, checkIn: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>{t("dashboard:manualAttendance.fields.checkOut")}</Label>
              <Input
                type="time"
                value={form.checkOut}
                onChange={(e) => setForm((f) => ({ ...f, checkOut: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label>{t("dashboard:manualAttendance.fields.notes")}</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder={t("dashboard:manualAttendance.fields.notesPlaceholder")}
              rows={2}
              maxLength={500}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("dashboard:manualAttendance.actions.cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving
              ? t("dashboard:manualAttendance.actions.saving")
              : t("dashboard:manualAttendance.actions.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
