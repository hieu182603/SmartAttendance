import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Crown, Check, CreditCard, Users, Building, Zap, ArrowRight,
  Shield, Clock, TrendingUp, Rocket, BarChart3, MapPin, Brain,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface PricingPlan {
  id: string;
  name: string;
  subtitle: string;
  target: string;
  priceMonthly: number;
  priceYearly: number;
  features: string[];
  icon: React.ComponentType<any>;
  popular?: boolean;
  gradient: string;
  iconBg: string;
}

const pricingPlans: PricingPlan[] = [
  {
    id: "starter",
    name: "Starter",
    subtitle: "Gói Cơ Bản",
    target: "Doanh nghiệp 50 – 100 nhân sự",
    priceMonthly: 1000000,
    priceYearly: 12000000,
    icon: Rocket,
    gradient: "from-blue-500 to-cyan-500",
    iconBg: "bg-blue-500/10 text-blue-500",
    features: [
      "Phân quyền Admin & Nhân viên",
      "Chấm công GPS chính xác",
      "Lịch sử & báo cáo chấm công cơ bản",
      "Quản lý ca làm việc",
      "Thông báo real-time",
      "Hỗ trợ kỹ thuật cơ bản",
    ],
  },
  {
    id: "standard",
    name: "Standard",
    subtitle: "Gói Tiêu Chuẩn",
    target: "Doanh nghiệp 101 – 200 nhân sự",
    priceMonthly: 2900000,
    priceYearly: 35000000,
    icon: Users,
    gradient: "from-violet-500 to-purple-600",
    iconBg: "bg-violet-500/10 text-violet-500",
    popular: true,
    features: [
      "Tất cả tính năng Starter",
      "Phân quyền Manager & HR Manager",
      "Phê duyệt đơn từ trực tuyến (paperless)",
      "Nghỉ phép, tăng ca, công tác...",
      "Báo cáo phân tích chuyên sâu",
      "Đánh giá hiệu suất nhân viên",
      "Hỗ trợ ưu tiên",
    ],
  },
  {
    id: "premium",
    name: "Premium",
    subtitle: "Gói Nâng Cao",
    target: "Doanh nghiệp trên 200 nhân sự",
    priceMonthly: 6600000,
    priceYearly: 80000000,
    icon: Building,
    gradient: "from-amber-500 to-orange-500",
    iconBg: "bg-amber-500/10 text-amber-500",
    features: [
      "Tất cả tính năng Standard",
      "Quyền Super Admin toàn hệ thống",
      "Tự động hóa tính lương hoàn toàn",
      "Nhận diện khuôn mặt AI (anti-spoofing)",
      "AI Chatbot RAG hỏi đáp dữ liệu",
      "Analytics đa chiều & xuất báo cáo",
      "Quản lý đa chi nhánh, đa phòng ban",
      "Hỗ trợ 24/7 + tùy chỉnh theo yêu cầu",
    ],
  },
];

const formatVND = (amount: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);

const UpgradePage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [isProcessing, setIsProcessing] = useState(false);

  const handleUpgrade = async () => {
    if (!selectedPlan) return;
    setIsProcessing(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      toast.success("🎉 Nâng cấp thành công! Chào mừng bạn đến với SmartAttendance.");
      setTimeout(() => {
        navigate("/employee");
        window.location.reload();
      }, 1500);
    } catch {
      toast.error("Có lỗi xảy ra. Vui lòng thử lại.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-10 pb-10">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-3"
      >
        <div className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-100 to-amber-100 dark:from-orange-900/20 dark:to-amber-900/20 px-4 py-2 rounded-full">
          <Crown className="h-5 w-5 text-orange-600" />
          <span className="text-orange-700 dark:text-orange-300 font-medium text-sm">
            Nâng cấp tài khoản
          </span>
        </div>
        <h1 className="text-3xl font-bold text-[var(--text-main)]">
          Chọn gói phù hợp với doanh nghiệp
        </h1>
        <p className="text-[var(--text-sub)] max-w-xl mx-auto text-sm">
          Không có phí ẩn. Hủy bất cứ lúc nào. Hoàn tiền trong 30 ngày nếu không hài lòng.
        </p>
      </motion.div>

      {/* Trial Banner */}
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-center justify-center gap-4"
      >
        <Clock className="h-5 w-5 text-red-600 shrink-0" />
        <div className="text-center">
          <p className="font-semibold text-red-900 dark:text-red-100 text-sm">
            🔥 Bạn đang trong thời gian dùng thử 7 ngày miễn phí
          </p>
          <p className="text-xs text-red-700 dark:text-red-300">
            Nâng cấp ngay để không bị gián đoạn dịch vụ
          </p>
        </div>
        <TrendingUp className="h-5 w-5 text-red-600 shrink-0" />
      </motion.div>

      {/* Billing Toggle */}
      <div className="flex justify-center">
        <div className="inline-flex items-center gap-1 bg-[var(--surface)] border border-[var(--border)] rounded-xl p-1">
          <button
            onClick={() => setBillingCycle("monthly")}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
              billingCycle === "monthly"
                ? "bg-[var(--primary)] text-white shadow"
                : "text-[var(--text-sub)] hover:text-[var(--text-main)]"
            }`}
          >
            Hàng tháng
          </button>
          <button
            onClick={() => setBillingCycle("yearly")}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
              billingCycle === "yearly"
                ? "bg-[var(--primary)] text-white shadow"
                : "text-[var(--text-sub)] hover:text-[var(--text-main)]"
            }`}
          >
            Hàng năm
            <span className="bg-green-500 text-white text-xs px-1.5 py-0.5 rounded-full">
              -17%
            </span>
          </button>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {pricingPlans.map((plan, index) => {
          const Icon = plan.icon;
          const isSelected = selectedPlan === plan.id;
          const price = billingCycle === "monthly" ? plan.priceMonthly : plan.priceYearly;

          return (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + index * 0.1 }}
              whileHover={{ y: -6 }}
              className="relative"
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                  <span className={`bg-gradient-to-r ${plan.gradient} text-white text-xs font-bold px-4 py-1 rounded-full shadow`}>
                    PHỔ BIẾN NHẤT
                  </span>
                </div>
              )}

              <Card
                onClick={() => setSelectedPlan(plan.id)}
                className={`relative overflow-hidden cursor-pointer transition-all duration-300 h-full flex flex-col ${
                  isSelected
                    ? `ring-2 ring-[var(--primary)] shadow-xl`
                    : "hover:shadow-lg"
                } ${
                  plan.popular
                    ? "border-[var(--primary)]"
                    : "border-[var(--border)]"
                }`}
              >
                {/* Gradient top bar */}
                <div className={`h-1 w-full bg-gradient-to-r ${plan.gradient}`} />

                <CardHeader className="text-center pb-2 pt-6">
                  <div className="flex justify-center mb-3">
                    <div className={`p-3 rounded-2xl ${plan.iconBg}`}>
                      <Icon className="h-7 w-7" />
                    </div>
                  </div>
                  <p className="text-xs text-[var(--text-sub)] uppercase tracking-widest">{plan.subtitle}</p>
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <p className="text-xs text-[var(--text-sub)] mt-1">{plan.target}</p>

                  <div className="mt-4">
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-3xl font-bold text-[var(--text-main)]">
                        {formatVND(price)}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--text-sub)] mt-1">
                      {billingCycle === "monthly" ? "/ tháng" : "/ năm"}
                      {billingCycle === "yearly" && (
                        <span className="ml-2 text-green-500 font-medium">
                          (tiết kiệm {formatVND(plan.priceMonthly * 12 - plan.priceYearly)})
                        </span>
                      )}
                    </p>
                  </div>
                </CardHeader>

                <CardContent className="pt-4 flex flex-col flex-1">
                  <ul className="space-y-2.5 flex-1">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                        <span className="text-[var(--text-main)]">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    className={`w-full mt-6 ${
                      isSelected
                        ? `bg-gradient-to-r ${plan.gradient} text-white border-0`
                        : "bg-[var(--surface)] text-[var(--text-main)] border border-[var(--border)] hover:border-[var(--primary)]"
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedPlan(plan.id);
                    }}
                  >
                    {isSelected ? (
                      <><Check className="h-4 w-4 mr-2" />Đã chọn</>
                    ) : (
                      "Chọn gói này"
                    )}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* CTA */}
      {selectedPlan && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-[var(--primary)] to-[var(--accent-cyan)] rounded-2xl p-8 text-white text-center"
        >
          <h2 className="text-2xl font-bold mb-2">Sẵn sàng nâng cấp?</h2>
          <p className="text-white/80 mb-6 text-sm max-w-lg mx-auto">
            Bắt đầu trải nghiệm đầy đủ SmartAttendance ngay hôm nay. Thanh toán an toàn, bảo mật.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button
              size="lg"
              onClick={handleUpgrade}
              disabled={isProcessing}
              className="bg-white text-[var(--primary)] hover:bg-gray-100 px-8 font-semibold shadow-lg"
            >
              {isProcessing ? (
                <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[var(--primary)] mr-2" />Đang xử lý...</>
              ) : (
                <><CreditCard className="h-4 w-4 mr-2" />Nâng cấp ngay<ArrowRight className="h-4 w-4 ml-2" /></>
              )}
            </Button>
            <div className="flex items-center gap-4 text-sm text-white/70">
              <span className="flex items-center gap-1"><Shield className="h-4 w-4" />Bảo mật 100%</span>
              <span className="flex items-center gap-1"><Zap className="h-4 w-4" />Hủy bất cứ lúc nào</span>
            </div>
          </div>
        </motion.div>
      )}

      {/* Feature comparison highlights */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        {[
          { icon: MapPin, label: "GPS chống gian lận", color: "text-blue-500" },
          { icon: Brain, label: "AI Chatbot RAG", color: "text-purple-500" },
          { icon: BarChart3, label: "Analytics đa chiều", color: "text-green-500" },
          { icon: TrendingUp, label: "Tính lương tự động", color: "text-amber-500" },
        ].map((item, i) => (
          <div key={i} className="flex items-center gap-3 p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
            <item.icon className={`h-5 w-5 shrink-0 ${item.color}`} />
            <span className="text-sm text-[var(--text-main)]">{item.label}</span>
          </div>
        ))}
      </motion.div>

      {/* FAQ */}
      <div className="max-w-2xl mx-auto space-y-4">
        <h2 className="text-center text-lg font-semibold text-[var(--text-main)]">Câu hỏi thường gặp</h2>
        {[
          {
            q: "Tôi có thể hủy đăng ký bất cứ lúc nào không?",
            a: "Có. Bạn sẽ tiếp tục sử dụng đến hết chu kỳ thanh toán hiện tại.",
          },
          {
            q: "Có được hoàn tiền nếu không hài lòng không?",
            a: "Có. Chúng tôi hoàn tiền 100% trong 30 ngày đầu nếu bạn không hài lòng.",
          },
          {
            q: "Dữ liệu của tôi có được bảo mật không?",
            a: "Hoàn toàn. Dữ liệu được mã hóa end-to-end và tuân thủ tiêu chuẩn bảo mật quốc tế.",
          },
        ].map((faq, i) => (
          <div key={i} className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)] space-y-1">
            <p className="font-medium text-sm text-[var(--text-main)]">{faq.q}</p>
            <p className="text-sm text-[var(--text-sub)]">{faq.a}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default UpgradePage;
