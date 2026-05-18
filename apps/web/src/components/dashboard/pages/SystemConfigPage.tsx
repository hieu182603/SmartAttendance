import { useEffect, useState } from "react";
import { Settings, Pencil, Trash2, Plus, Check, X } from "lucide-react";
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
import { toast } from "sonner";
import {
  listSystemConfigs,
  createSystemConfig,
  updateSystemConfig,
  deleteSystemConfig,
  type SystemConfig,
  type SystemConfigCategory,
} from "@/services/systemConfigService";
import { useTranslation } from "react-i18next";

const CATEGORIES: SystemConfigCategory[] = [
  "attendance",
  "payroll",
  "general",
  "security",
  "notification",
];

const CATEGORY_LABELS: Record<SystemConfigCategory, string> = {
  attendance: "Chấm công",
  payroll: "Lương",
  general: "Chung",
  security: "Bảo mật",
  notification: "Thông báo",
};

const CATEGORY_BADGE_CLASS: Record<SystemConfigCategory, string> = {
  attendance: "border-cyan-500/40 bg-cyan-500/10 text-cyan-300",
  payroll: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  general: "border-slate-500/40 bg-slate-500/10 text-slate-300",
  security: "border-rose-500/40 bg-rose-500/10 text-rose-300",
  notification: "border-amber-500/40 bg-amber-500/10 text-amber-300",
};

const DEFAULT_CONFIGS = [
  { key: "payroll.standard_work_days", category: "payroll" as SystemConfigCategory, description: "Số ngày làm việc chuẩn/tháng", defaultValue: "22" },
  { key: "payroll.ot_multiplier", category: "payroll" as SystemConfigCategory, description: "Hệ số OT ngày thường (1.5 = 150%)", defaultValue: "1.5" },
  { key: "payroll.ot_weekend_multiplier", category: "payroll" as SystemConfigCategory, description: "Hệ số OT cuối tuần (2 = 200%)", defaultValue: "2" },
  { key: "payroll.ot_holiday_multiplier", category: "payroll" as SystemConfigCategory, description: "Hệ số OT ngày lễ (3 = 300%)", defaultValue: "3" },
  { key: "payroll.ot_max_per_month", category: "payroll" as SystemConfigCategory, description: "Giới hạn giờ OT/tháng", defaultValue: "40" },
  { key: "payroll.late_penalty", category: "payroll" as SystemConfigCategory, description: "Phạt đi muộn (VNĐ/lần)", defaultValue: "200000" },
  { key: "payroll.attendance_bonus_amount", category: "payroll" as SystemConfigCategory, description: "Thưởng chuyên cần (VNĐ)", defaultValue: "1000000" },
  { key: "attendance.geofence_radius", category: "attendance" as SystemConfigCategory, description: "Bán kính chấm công (mét)", defaultValue: "100" },
];

interface FormState {
  key: string;
  category: SystemConfigCategory;
  value: string;
  description: string;
}

const emptyForm = (): FormState => ({
  key: "",
  category: "payroll",
  value: "",
  description: "",
});

const formatConfigName = (key: string) =>
  key
    .replace(/[._-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());

export default function SystemConfigPage() {
  const { t } = useTranslation();
  const [configs, setConfigs] = useState<SystemConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<SystemConfigCategory | "all">("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [deleteKey, setDeleteKey] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await listSystemConfigs(categoryFilter === "all" ? undefined : categoryFilter);
      setConfigs(data);
    } catch {
      toast.error(t("dashboard:systemConfig.toasts.loadError"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [categoryFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const openCreate = () => {
    setEditingKey(null);
    setForm(emptyForm());
    setDialogOpen(true);
  };

  const openEdit = (cfg: SystemConfig) => {
    setEditingKey(cfg.key);
    setForm({
      key: cfg.key,
      category: cfg.category,
      value: String(cfg.value),
      description: cfg.description ?? "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.key.trim() || form.value.trim() === "") {
      toast.error(t("dashboard:systemConfig.toasts.keyValueRequired"));
      return;
    }
    setSaving(true);
    try {
      const parsedValue = isNaN(Number(form.value)) ? form.value : Number(form.value);
      if (editingKey) {
        await updateSystemConfig(editingKey, {
          value: parsedValue,
          category: form.category,
          description: form.description,
        });
        toast.success(t("dashboard:systemConfig.toasts.updateSuccess"));
      } else {
        await createSystemConfig({
          key: form.key.trim(),
          category: form.category,
          value: parsedValue,
          description: form.description,
        });
        toast.success(t("dashboard:systemConfig.toasts.createSuccess"));
      }
      setDialogOpen(false);
      load();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : t("dashboard:systemConfig.toasts.saveError");
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (key: string) => {
    try {
      await deleteSystemConfig(key);
      toast.success(t("dashboard:systemConfig.toasts.deleteSuccess"));
      setDeleteKey(null);
      load();
    } catch {
      toast.error(t("dashboard:systemConfig.toasts.deleteError"));
    }
  };

  const seedDefaults = async () => {
    const existing = new Set(configs.map((c) => c.key));
    const missing = DEFAULT_CONFIGS.filter((d) => !existing.has(d.key));
    if (missing.length === 0) {
      toast.info(t("dashboard:systemConfig.toasts.defaultsExist"));
      return;
    }
    try {
      await Promise.all(
        missing.map((d) =>
          createSystemConfig({
            key: d.key,
            category: d.category,
            value: Number(d.defaultValue),
            description: d.description,
          })
        )
      );
      toast.success(t("dashboard:systemConfig.toasts.defaultsCreated", { count: missing.length }));
      load();
    } catch {
      toast.error(t("dashboard:systemConfig.toasts.seedError"));
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Settings className="w-6 h-6 text-[var(--primary)]" />
          <h1 className="text-2xl font-bold text-[var(--text-main)]">{t("dashboard:systemConfig.title")}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={seedDefaults}>
            {t("dashboard:systemConfig.seedDefaults")}
          </Button>
          <Button size="sm" onClick={openCreate}>
            <Plus className="w-4 h-4 mr-1" /> {t("dashboard:systemConfig.addConfig")}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <CardTitle className="text-base">{t("dashboard:systemConfig.listTitle")}</CardTitle>
            <Select
              value={categoryFilter}
              onValueChange={(v) => setCategoryFilter(v as SystemConfigCategory | "all")}
            >
              <SelectTrigger className="h-9 w-full sm:w-44">
                <SelectValue placeholder={t("dashboard:systemConfig.filters.all")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("dashboard:systemConfig.filters.all")}</SelectItem>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 text-center text-[var(--text-sub)]">{t("dashboard:systemConfig.loading")}</div>
          ) : configs.length === 0 ? (
            <div className="py-12 text-center text-[var(--text-sub)]">
              {t("dashboard:systemConfig.empty")}{" "}
              <button className="underline text-[var(--primary)]" onClick={seedDefaults}>
                {t("dashboard:systemConfig.seedDefaults")}
              </button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-56 text-xs sm:text-sm">{t("dashboard:systemConfig.table.name")}</TableHead>
                  <TableHead className="min-w-36 text-xs sm:text-sm">{t("dashboard:systemConfig.table.category")}</TableHead>
                  <TableHead className="min-w-20 text-xs sm:text-sm">{t("dashboard:systemConfig.table.value")}</TableHead>
                  <TableHead className="min-w-52 text-xs sm:text-sm">{t("dashboard:systemConfig.table.description")}</TableHead>
                  <TableHead className="min-w-20 text-right text-xs sm:text-sm">{t("dashboard:systemConfig.table.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {configs.map((cfg) => (
                  <TableRow key={cfg._id}>
                    <TableCell className="py-4 align-top">
                      <p className="text-sm font-medium leading-snug sm:text-[15px]">
                        {cfg.description?.trim() || formatConfigName(cfg.key)}
                      </p>
                    </TableCell>
                    <TableCell className="py-4 align-top">
                      <Badge
                        variant="outline"
                        className={`whitespace-nowrap ${CATEGORY_BADGE_CLASS[cfg.category] ?? "border-[var(--border)]"}`}
                      >
                        {CATEGORY_LABELS[cfg.category] ?? cfg.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-4 align-top text-sm font-semibold">{String(cfg.value)}</TableCell>
                    <TableCell className="py-4 align-top text-sm text-[var(--text-sub)]">{cfg.description ?? t("dashboard:systemConfig.table.emptyDescription")}</TableCell>
                    <TableCell className="py-4 align-top text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(cfg)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={() => setDeleteKey(cfg.key)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingKey
                ? t("dashboard:systemConfig.dialog.editTitle")
                : t("dashboard:systemConfig.dialog.createTitle")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>{t("dashboard:systemConfig.dialog.key")}</Label>
              <Input
                value={form.key}
                onChange={(e) => setForm((f) => ({ ...f, key: e.target.value }))}
                disabled={!!editingKey}
                placeholder={t("dashboard:systemConfig.dialog.keyPlaceholder")}
                className="font-mono"
              />
            </div>
            <div className="space-y-1">
              <Label>{t("dashboard:systemConfig.dialog.category")}</Label>
              <Select
                value={form.category}
                onValueChange={(v) => setForm((f) => ({ ...f, category: v as SystemConfigCategory }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>{t("dashboard:systemConfig.dialog.value")}</Label>
              <Input
                value={form.value}
                onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
                placeholder={t("dashboard:systemConfig.dialog.valuePlaceholder")}
              />
            </div>
            <div className="space-y-1">
              <Label>{t("dashboard:systemConfig.dialog.description")}</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder={t("dashboard:systemConfig.dialog.descriptionPlaceholder")}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t("dashboard:systemConfig.dialog.cancel")}
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? t("dashboard:systemConfig.dialog.saving") : t("dashboard:systemConfig.dialog.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm dialog */}
      <Dialog open={!!deleteKey} onOpenChange={(o) => !o && setDeleteKey(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("dashboard:systemConfig.deleteDialog.title")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[var(--text-sub)]">
            {t("dashboard:systemConfig.deleteDialog.description")}{" "}
            <span className="font-mono font-semibold">{deleteKey}</span>?{" "}
            {t("dashboard:systemConfig.deleteDialog.warning")}
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteKey(null)}>
              <X className="w-4 h-4 mr-1" /> {t("dashboard:systemConfig.deleteDialog.cancel")}
            </Button>
            <Button
              variant="outline"
              className="border-red-500 text-red-600 hover:bg-red-50"
              onClick={() => deleteKey && handleDelete(deleteKey)}
            >
              <Check className="w-4 h-4 mr-1" /> {t("dashboard:systemConfig.deleteDialog.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
