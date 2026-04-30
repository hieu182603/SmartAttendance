import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  generatePayroll,
  getDepartmentsWithId,
  type GeneratePayrollResult,
} from "@/services/payrollService";
import { getAllUsers } from "@/services/userService";
import { Loader2, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

type Scope = "all" | "department" | "user";

interface GeneratePayrollDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultMonth?: string;
  onSuccess?: () => void;
}

export function GeneratePayrollDialog({
  open,
  onOpenChange,
  defaultMonth,
  onSuccess,
}: GeneratePayrollDialogProps) {
  const { t } = useTranslation();
  const [month, setMonth] = useState(defaultMonth || currentMonth());
  const [scope, setScope] = useState<Scope>("all");
  const [departmentId, setDepartmentId] = useState("");
  const [userId, setUserId] = useState("");

  const [departments, setDepartments] = useState<{ _id: string; name: string; code: string }[]>([]);
  const [employees, setEmployees] = useState<{ _id: string; name: string; employeeId?: string }[]>([]);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GeneratePayrollResult | null>(null);

  useEffect(() => {
    if (!open) return;
    setResult(null);
    setScope("all");
    setDepartmentId("");
    setUserId("");
    if (defaultMonth) setMonth(defaultMonth);
  }, [open, defaultMonth]);

  useEffect(() => {
    if (!open) return;
    getDepartmentsWithId().then(setDepartments).catch(() => {});
    getAllUsers({ limit: 200, isActive: true }).then((res: any) => {
      const users = res?.users || res?.data?.users || res || [];
      setEmployees(Array.isArray(users) ? users : []);
    }).catch(() => {});
  }, [open]);

  const handleGenerate = async () => {
    if (!month) return toast.error(t("dashboard:generatePayroll.toasts.selectMonth"));
    if (scope === "department" && !departmentId) return toast.error(t("dashboard:generatePayroll.toasts.selectDepartment"));
    if (scope === "user" && !userId) return toast.error(t("dashboard:generatePayroll.toasts.selectUser"));

    setLoading(true);
    try {
      const payload =
        scope === "user"
          ? { month, userId }
          : scope === "department"
          ? { month, departmentId }
          : { month };

      const data = await generatePayroll(payload);
      setResult(data);
      if (data.errorCount === 0) {
        toast.success(
          t("dashboard:generatePayroll.toasts.success", { count: data.successCount })
        );
        onSuccess?.();
      } else {
        toast.warning(
          t("dashboard:generatePayroll.toasts.partial", { count: data.errorCount })
        );
        onSuccess?.();
      }
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message ||
          t("dashboard:generatePayroll.toasts.error")
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setResult(null);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-[var(--surface)] border-[var(--border)] text-[var(--text-main)] max-w-md">
        <DialogHeader>
          <DialogTitle>{t("dashboard:generatePayroll.title")}</DialogTitle>
          <DialogDescription className="text-[var(--text-sub)]">
            {t("dashboard:generatePayroll.description")}
          </DialogDescription>
        </DialogHeader>

        {/* Result view */}
        {result ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center gap-2 bg-[var(--background)] rounded p-2">
                <CheckCircle2 className="h-4 w-4 text-[var(--success)]" />
                <span className="text-[var(--text-sub)]">{t("dashboard:generatePayroll.result.success")}</span>
                <span className="ml-auto font-semibold text-[var(--success)]">{result.successCount}</span>
              </div>
              <div className="flex items-center gap-2 bg-[var(--background)] rounded p-2">
                <XCircle className="h-4 w-4 text-[var(--error)]" />
                <span className="text-[var(--text-sub)]">{t("dashboard:generatePayroll.result.error")}</span>
                <span className="ml-auto font-semibold text-[var(--error)]">{result.errorCount}</span>
              </div>
            </div>

            {result.errors.length > 0 && (
              <div className="space-y-1 max-h-40 overflow-y-auto">
                <p className="text-xs font-medium text-[var(--text-sub)]">{t("dashboard:generatePayroll.result.errorDetail")}</p>
                {result.errors.map((e, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs bg-[var(--error)]/10 rounded px-2 py-1">
                    <AlertCircle className="h-3.5 w-3.5 text-[var(--error)] mt-0.5 flex-shrink-0" />
                    <span className="text-[var(--text-main)]">
                      <span className="font-medium">{e.name}:</span> {e.error}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Month */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[var(--text-main)]">
                {t("dashboard:generatePayroll.fields.month")} <span className="text-[var(--error)]">*</span>
              </label>
              <input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="w-full h-9 rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
              />
            </div>

            {/* Scope */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[var(--text-main)]">{t("dashboard:generatePayroll.fields.scope")}</label>
              <Select value={scope} onValueChange={(v) => setScope(v as Scope)}>
                <SelectTrigger className="border-[var(--border)] bg-[var(--background)] text-[var(--text-main)]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[var(--surface)] border-[var(--border)]">
                  <SelectItem value="all">{t("dashboard:generatePayroll.scope.all")}</SelectItem>
                  <SelectItem value="department">{t("dashboard:generatePayroll.scope.department")}</SelectItem>
                  <SelectItem value="user">{t("dashboard:generatePayroll.scope.user")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Department picker */}
            {scope === "department" && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[var(--text-main)]">
                  {t("dashboard:generatePayroll.fields.department")} <span className="text-[var(--error)]">*</span>
                </label>
                <Select value={departmentId} onValueChange={setDepartmentId}>
                  <SelectTrigger className="border-[var(--border)] bg-[var(--background)] text-[var(--text-main)]">
                    <SelectValue placeholder={t("dashboard:generatePayroll.fields.departmentPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent className="bg-[var(--surface)] border-[var(--border)]">
                    {departments.map((d) => (
                      <SelectItem key={d._id} value={d._id}>
                        {d.name} <span className="text-[var(--text-sub)] text-xs">({d.code})</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* User picker */}
            {scope === "user" && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[var(--text-main)]">
                  {t("dashboard:generatePayroll.fields.user")} <span className="text-[var(--error)]">*</span>
                </label>
                <Select value={userId} onValueChange={setUserId}>
                  <SelectTrigger className="border-[var(--border)] bg-[var(--background)] text-[var(--text-main)]">
                    <SelectValue placeholder={t("dashboard:generatePayroll.fields.userPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent className="bg-[var(--surface)] border-[var(--border)]">
                    {employees.map((u) => (
                      <SelectItem key={u._id} value={u._id}>
                        {u.name}
                        {u.employeeId && (
                          <span className="text-[var(--text-sub)] text-xs ml-1">({u.employeeId})</span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Warning for all scope */}
            {scope === "all" && (
              <p className="text-xs text-[var(--warning)] bg-[var(--warning)]/10 rounded px-3 py-2">
                {t("dashboard:generatePayroll.scopeWarning", { month })}
              </p>
            )}
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} className="border-[var(--border)]">
            {result
              ? t("dashboard:generatePayroll.actions.close")
              : t("dashboard:generatePayroll.actions.cancel")}
          </Button>
          {!result && (
            <Button
              onClick={handleGenerate}
              disabled={loading}
              className="bg-[var(--primary)] hover:bg-[var(--primary)]/90 text-white"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t("dashboard:generatePayroll.actions.generating")}
                </>
              ) : (
                t("dashboard:generatePayroll.actions.generate")
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
