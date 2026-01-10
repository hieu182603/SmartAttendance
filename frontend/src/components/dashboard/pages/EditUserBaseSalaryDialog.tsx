import { useState, useEffect, useCallback } from "react";
import { DollarSign, Info } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  getUserSalaryInfo,
  updateUserBaseSalary,
  type UserSalaryInfo,
} from "../../../services/payrollService";

interface EditUserBaseSalaryDialogProps {
  userId: string;
  userName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount || 0);
};

export default function EditUserBaseSalaryDialog({
  userId,
  userName,
  open,
  onOpenChange,
  onSuccess,
}: EditUserBaseSalaryDialogProps) {
  const { t } = useTranslation("dashboard");
  const [loading, setLoading] = useState(false);
  const [loadingInfo, setLoadingInfo] = useState(false);
  const [salaryInfo, setSalaryInfo] = useState<UserSalaryInfo | null>(null);
  const [baseSalary, setBaseSalary] = useState<string>("");
  const [useMatrix, setUseMatrix] = useState(false);

  const fetchSalaryInfo = useCallback(async () => {
    if (!userId) return;
    
    try {
      setLoadingInfo(true);
      const info = await getUserSalaryInfo(userId);
      setSalaryInfo(info);
      setBaseSalary(
        info.baseSalary ? info.baseSalary.toString() : ""
      );
      setUseMatrix(!info.baseSalary);
    } catch (error: any) {
      console.error("Error fetching salary info:", error);
      toast.error(
        error.response?.data?.message || "Không lấy được thông tin lương"
      );
    } finally {
      setLoadingInfo(false);
    }
  }, [userId]);

  useEffect(() => {
    if (open && userId) {
      fetchSalaryInfo();
    }
  }, [open, userId, fetchSalaryInfo]);

  const handleSave = async () => {
    if (!useMatrix && (!baseSalary || parseFloat(baseSalary) <= 0)) {
      toast.error("Vui lòng nhập lương cơ bản hợp lệ");
      return;
    }

    try {
      setLoading(true);
      const payload = {
        baseSalary: useMatrix ? null : parseFloat(baseSalary),
      };

      await updateUserBaseSalary(userId, payload);
      toast.success("Đã cập nhật lương cơ bản thành công");
      onOpenChange(false);
      if (onSuccess) {
        onSuccess();
      }
      fetchSalaryInfo();
    } catch (error: any) {
      console.error("Error updating base salary:", error);
      toast.error(
        error.response?.data?.message || "Không cập nhật được lương cơ bản"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleUseMatrix = () => {
    setUseMatrix(true);
    setBaseSalary("");
  };

  const handleUseCustom = () => {
    setUseMatrix(false);
    if (salaryInfo?.baseSalary) {
      setBaseSalary(salaryInfo.baseSalary.toString());
    }
  };

  const getSourceLabel = (source: string) => {
    switch (source) {
      case "USER_BASE_SALARY":
        return "Lương riêng (Override)";
      case "SALARY_MATRIX":
        return "Thang lương";
      case "DEFAULT_CONFIG":
        return "Lương mặc định";
      default:
        return "N/A";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-[var(--border)] bg-[var(--background)] max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-[var(--text-main)] flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Chỉnh Sửa Lương Cơ Bản
          </DialogTitle>
          <DialogDescription className="text-[var(--text-sub)]">
            {userName}
          </DialogDescription>
        </DialogHeader>

        {loadingInfo ? (
          <div className="py-8 text-center text-[var(--text-sub)]">
            Đang tải thông tin...
          </div>
        ) : salaryInfo ? (
          <div className="space-y-6">
            <Alert className="border-[var(--border)] bg-[var(--shell)]">
              <AlertTitle className="text-[var(--text-main)] flex items-center gap-2 mb-3">
                <Info className="h-4 w-4" />
                Thông Tin Lương Hiện Tại
              </AlertTitle>
              <AlertDescription className="text-[var(--text-sub)] space-y-2">
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  <div>
                    <span className="font-medium text-[var(--text-main)]">Phòng ban:</span>{" "}
                    <span>{salaryInfo.department || "N/A"}</span>
                  </div>
                  <div>
                    <span className="font-medium text-[var(--text-main)]">Chức vụ:</span>{" "}
                    <span>{salaryInfo.position || "N/A"}</span>
                  </div>
                  <div>
                    <span className="font-medium text-[var(--text-main)]">Nguồn lương:</span>{" "}
                    <span>{getSourceLabel(salaryInfo.source)}</span>
                  </div>
                  <div>
                    <span className="font-medium text-[var(--text-main)]">Lương hiện tại:</span>{" "}
                    <span className="font-semibold text-[var(--success)]">
                      {formatCurrency(salaryInfo.calculatedSalary)}
                    </span>
                  </div>
                </div>
                {salaryInfo.matrixSalary && (
                  <div className="mt-3 pt-3 border-t border-[var(--border)]">
                    <span className="font-medium text-[var(--text-main)]">Lương từ thang lương:</span>{" "}
                    <span className="font-semibold">{formatCurrency(salaryInfo.matrixSalary)}</span>
                  </div>
                )}
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <div>
                <Label className="text-[var(--text-main)]">
                  Phương Thức Tính Lương
                </Label>
                <div className="flex gap-4 mt-2">
                  <Button
                    variant={useMatrix ? "default" : "outline"}
                    onClick={handleUseMatrix}
                    className={
                      useMatrix
                        ? "bg-gradient-to-r from-cyan-500 to-blue-500"
                        : "border-[var(--border)]"
                    }
                  >
                    Dùng Lương Từ Thang Lương
                  </Button>
                  <Button
                    variant={!useMatrix ? "default" : "outline"}
                    onClick={handleUseCustom}
                    className={
                      !useMatrix
                        ? "bg-gradient-to-r from-cyan-500 to-blue-500"
                        : "border-[var(--border)]"
                    }
                  >
                    Set Lương Riêng
                  </Button>
                </div>
              </div>

              {!useMatrix && (
                <div>
                  <Label htmlFor="baseSalary" className="text-[var(--text-main)]">
                    Lương Cơ Bản (VNĐ) *
                  </Label>
                  <Input
                    id="baseSalary"
                    type="number"
                    value={baseSalary}
                    onChange={(e) => setBaseSalary(e.target.value)}
                    placeholder="Nhập lương cơ bản"
                    className="mt-1 border-[var(--border)]"
                  />
                  <p className="text-xs text-[var(--text-sub)] mt-1">
                    Lương này sẽ ưu tiên cao nhất, bỏ qua lương từ thang lương
                  </p>
                </div>
              )}

            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-[var(--text-sub)]">
            Không lấy được thông tin
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-[var(--border)]"
            disabled={loading}
          >
            Hủy
          </Button>
          <Button
            onClick={handleSave}
            disabled={loading || loadingInfo}
            className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
          >
            {loading ? "Đang lưu..." : "Lưu"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

