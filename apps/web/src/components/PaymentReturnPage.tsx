import { useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { billingService } from "@/services/billingService";

/**
 * Trang công khai — PayOS redirect về đây (không qua ProtectedRoute).
 * Khôi phục phiên bằng refresh cookie rồi xác nhận đơn và chuyển vào dashboard.
 */
export default function PaymentReturnPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { restoreSession } = useAuth();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const run = async () => {
      const payment = searchParams.get("payment");
      const orderCode = searchParams.get("orderCode");

      const ok = await restoreSession();
      if (!ok) {
        const returnTo = `/payment/return?${searchParams.toString()}`;
        toast.error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
        navigate(`/login?redirect=${encodeURIComponent(returnTo)}`, { replace: true });
        return;
      }

      if (payment === "success" && orderCode) {
        const verifying = toast.loading("Đang xác nhận thanh toán...");
        try {
          const result = await billingService.pollPaymentStatusUntilPaid(Number(orderCode));
          toast.dismiss(verifying);
          if (result === "paid") {
            toast.success("Thanh toán thành công! Gói của bạn đã được nâng cấp.");
          } else if (result === "failed") {
            toast.error("Thanh toán không thành công. Vui lòng liên hệ hỗ trợ.");
          } else {
            toast.warning(
              "Thanh toán chưa được xác nhận. Nếu đã trừ tiền, vui lòng chờ vài phút hoặc liên hệ hỗ trợ."
            );
          }
        } catch {
          toast.dismiss(verifying);
          toast.warning("Không thể xác nhận trạng thái thanh toán. Vui lòng liên hệ hỗ trợ.");
        }
      } else if (payment === "cancelled") {
        toast.warning("Thanh toán đã bị hủy. Bạn có thể chọn lại gói và thử lại.");
      }

      navigate("/employee/upgrade", { replace: true });
    };

    void run();
  }, [searchParams, navigate, restoreSession]);

  return (
    <div className="min-h-screen bg-[var(--background)] flex items-center justify-center p-6">
      <div className="flex flex-col items-center gap-4 text-center">
        <Loader2 className="h-12 w-12 animate-spin text-[var(--primary)]" />
        <p className="text-[var(--text-main)] font-medium">Đang xác nhận thanh toán...</p>
        <p className="text-sm text-[var(--text-sub)]">Vui lòng không đóng trang</p>
      </div>
    </div>
  );
}
