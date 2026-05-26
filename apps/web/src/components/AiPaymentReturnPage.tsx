import { useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { aiBillingService } from "@/services/aiBillingService";

/**
 * PayOS redirect page for AI invoice payments.
 * Route: /payment/ai-return
 */
export default function AiPaymentReturnPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { restoreSession } = useAuth();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const run = async () => {
      const payment = searchParams.get("payment");
      const invoiceCode = searchParams.get("invoiceCode");

      const ok = await restoreSession();
      if (!ok) {
        const returnTo = `/payment/ai-return?${searchParams.toString()}`;
        toast.error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
        navigate(`/login?redirect=${encodeURIComponent(returnTo)}`, { replace: true });
        return;
      }

      if (payment === "success" && invoiceCode) {
        const verifying = toast.loading("Đang xác nhận thanh toán...");
        try {
          const result = await aiBillingService.pollInvoiceUntilPaid(Number(invoiceCode));
          toast.dismiss(verifying);
          if (result === "paid") {
            toast.success("Thanh toán chi phí AI thành công!");
          } else if (result === "failed") {
            toast.error("Thanh toán không thành công. Vui lòng liên hệ hỗ trợ.");
          } else {
            toast.warning("Thanh toán chưa được xác nhận. Nếu đã trừ tiền, vui lòng chờ vài phút.");
          }
        } catch {
          toast.dismiss(verifying);
          toast.warning("Không thể xác nhận trạng thái thanh toán.");
        }
      } else if (payment === "cancel") {
        toast.info("Thanh toán đã bị hủy.");
      }

      navigate("/admin/ai-billing", { replace: true });
    };

    run();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="text-center">
        <Loader2 className="animate-spin text-blue-400 mx-auto mb-4" size={40} />
        <p className="text-slate-300 text-lg">Đang xử lý kết quả thanh toán...</p>
      </div>
    </div>
  );
}
