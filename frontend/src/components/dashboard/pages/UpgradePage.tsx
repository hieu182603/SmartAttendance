import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import {
  Crown,
  Check,
  CreditCard,
  Star,
  Users,
  Building,
  Zap,
  ArrowRight,
  Shield,
  Clock,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface PricingPlan {
  id: string;
  name: string;
  role: string;
  price: number;
  currency: string;
  period: string;
  features: string[];
  icon: React.ComponentType<any>;
  popular?: boolean;
  color: string;
}

const UpgradePage: React.FC = () => {
  const { t } = useTranslation(["common", "dashboard"]);
  const { user } = useAuth();
  const navigate = useNavigate();

  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [upgradeOptions, setUpgradeOptions] = useState<any>(null);

  const pricingPlans: PricingPlan[] = [
    {
      id: "individual",
      name: "Cá nhân",
      role: "EMPLOYEE",
      price: 29,
      currency: "USD",
      period: "monthly",
      icon: Users,
      color: "text-blue-500",
      features: [
        "✓ Quản lý chấm công cá nhân",
        "✓ Tạo và theo dõi yêu cầu nghỉ phép",
        "✓ Xem lịch làm việc và công ty",
        "✓ Báo cáo chấm công cá nhân",
        "✓ Thông báo thời gian thực",
        "✓ Hỗ trợ cơ bản"
      ]
    },
    {
      id: "team",
      name: "Nhóm",
      role: "MANAGER",
      price: 99,
      currency: "USD",
      period: "monthly",
      icon: Shield,
      color: "text-green-500",
      popular: true,
      features: [
        "✓ Tất cả tính năng Cá nhân",
        "✓ Quản lý đội nhóm (lên đến 20 nhân viên)",
        "✓ Phê duyệt yêu cầu nghỉ phép",
        "✓ Phân tích hiệu suất đội nhóm",
        "✓ Báo cáo chi tiết",
        "✓ Hỗ trợ ưu tiên"
      ]
    },
    {
      id: "enterprise",
      name: "Doanh nghiệp",
      role: "HR_MANAGER",
      price: 299,
      currency: "USD",
      period: "monthly",
      icon: Building,
      color: "text-purple-500",
      features: [
        "✓ Tất cả tính năng Nhóm",
        "✓ Quản lý nhân sự không giới hạn",
        "✓ Quản lý phòng ban và chi nhánh",
        "✓ Phân tích nâng cao và báo cáo",
        "✓ Tích hợp với hệ thống khác",
        "✓ Hỗ trợ 24/7",
        "✓ Tùy chỉnh theo yêu cầu"
      ]
    }
  ];

  useEffect(() => {
    // Mock API call to get upgrade options
    setUpgradeOptions({
      plans: pricingPlans
    });
  }, []);

  const handleSelectPlan = (planId: string) => {
    setSelectedPlan(planId);
  };

  const handleUpgrade = async (planId: string) => {
    setIsProcessing(true);

    try {
      // Mock upgrade process
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Mock successful upgrade
      toast.success("🎉 Nâng cấp tài khoản thành công! Chúc mừng bạn đã trở thành thành viên chính thức.");

      // Redirect to dashboard after a short delay
      setTimeout(() => {
        navigate("/employee");
        window.location.reload(); // Force reload to update user role
      }, 1500);

    } catch (error) {
      toast.error("Có lỗi xảy ra khi nâng cấp. Vui lòng thử lại.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (!upgradeOptions) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--primary)] mx-auto mb-4"></div>
          <p className="text-[var(--text-sub)]">Đang tải thông tin nâng cấp...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-4"
      >
        <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-orange-100 to-amber-100 dark:from-orange-900/20 dark:to-amber-900/20 px-4 py-2 rounded-full">
          <Crown className="h-5 w-5 text-orange-600" />
          <span className="text-orange-700 dark:text-orange-300 font-medium">
            Nâng cấp tài khoản của bạn
          </span>
        </div>

        <h1 className="text-3xl font-bold text-[var(--text-main)]">
          Chọn gói phù hợp với bạn
        </h1>

        <p className="text-[var(--text-sub)] max-w-2xl mx-auto">
          Trải nghiệm đầy đủ các tính năng của Smart Attendance với giá cả phải chăng.
          Không có phí ẩn, hủy bất cứ lúc nào.
        </p>
      </motion.div>

      {/* Trial Countdown Banner */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
        className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4"
      >
        <div className="flex items-center justify-center space-x-4">
          <Clock className="h-6 w-6 text-red-600" />
          <div className="text-center">
            <p className="font-semibold text-red-900 dark:text-red-100">
              🔥 Chỉ còn 7 ngày dùng thử miễn phí!
            </p>
            <p className="text-sm text-red-700 dark:text-red-300">
              Đừng bỏ lỡ cơ hội trải nghiệm đầy đủ tính năng
            </p>
          </div>
          <TrendingUp className="h-6 w-6 text-red-600" />
        </div>
      </motion.div>

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {pricingPlans.map((plan, index) => {
          const Icon = plan.icon;
          const isSelected = selectedPlan === plan.id;

          return (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + index * 0.1 }}
              whileHover={{ y: -5 }}
              className="relative"
            >
              <Card
                className={`relative overflow-hidden transition-all duration-300 cursor-pointer ${
                  isSelected
                    ? "ring-2 ring-[var(--primary)] shadow-lg scale-105"
                    : "hover:shadow-md"
                } ${
                  plan.popular
                    ? "border-[var(--primary)] bg-gradient-to-br from-[var(--primary)]/5 to-[var(--accent-cyan)]/5"
                    : "border-[var(--border)]"
                }`}
                onClick={() => handleSelectPlan(plan.id)}
              >
                {plan.popular && (
                  <div className="absolute top-0 right-0 bg-gradient-to-l from-[var(--primary)] to-[var(--accent-cyan)] text-white px-3 py-1 text-xs font-semibold rounded-bl-lg">
                    PHỔ BIẾN NHẤT
                  </div>
                )}

                <CardHeader className="text-center pb-4">
                  <div className="flex justify-center mb-2">
                    <div className={`p-3 rounded-full bg-gray-100 dark:bg-gray-800 ${plan.color}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                  </div>

                  <CardTitle className="text-xl">{plan.name}</CardTitle>

                  <div className="mt-4">
                    <div className="flex items-baseline justify-center">
                      <span className="text-4xl font-bold text-[var(--text-main)]">
                        ${plan.price}
                      </span>
                      <span className="text-[var(--text-sub)] ml-1">
                        /{plan.period}
                      </span>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <ul className="space-y-2">
                    {plan.features.map((feature, featureIndex) => (
                      <motion.li
                        key={featureIndex}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.5 + index * 0.1 + featureIndex * 0.05 }}
                        className="flex items-center space-x-2 text-sm"
                      >
                        <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                        <span className="text-[var(--text-main)]">
                          {feature.replace("✓ ", "")}
                        </span>
                      </motion.li>
                    ))}
                  </ul>

                  <Button
                    className={`w-full mt-6 ${
                      isSelected
                        ? "bg-gradient-to-r from-[var(--primary)] to-[var(--accent-cyan)] text-white"
                        : "bg-gray-100 dark:bg-gray-800 text-[var(--text-main)] hover:bg-gray-200 dark:hover:bg-gray-700"
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectPlan(plan.id);
                    }}
                  >
                    {isSelected ? (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Đã chọn
                      </>
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

      {/* CTA Section */}
      {selectedPlan && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-[var(--primary)] to-[var(--accent-cyan)] rounded-2xl p-8 text-white text-center"
        >
          <h2 className="text-2xl font-bold mb-4">
            Sẵn sàng nâng cấp?
          </h2>

          <p className="text-white/90 mb-6 max-w-2xl mx-auto">
            Bắt đầu trải nghiệm đầy đủ các tính năng của Smart Attendance ngay hôm nay.
            Thanh toán an toàn và bảo mật.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button
              size="lg"
              onClick={() => handleUpgrade(selectedPlan)}
              disabled={isProcessing}
              className="bg-white text-[var(--primary)] hover:bg-gray-100 px-8 py-3 text-lg font-semibold shadow-lg"
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[var(--primary)] mr-2"></div>
                  Đang xử lý...
                </>
              ) : (
                <>
                  <CreditCard className="h-5 w-5 mr-2" />
                  Nâng cấp ngay
                  <ArrowRight className="h-5 w-5 ml-2" />
                </>
              )}
            </Button>

            <div className="flex items-center space-x-4 text-sm text-white/80">
              <div className="flex items-center space-x-1">
                <Shield className="h-4 w-4" />
                <span>Bảo mật 100%</span>
              </div>
              <div className="flex items-center space-x-1">
                <Zap className="h-4 w-4" />
                <span>Hủy bất cứ lúc nào</span>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* FAQ Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="max-w-4xl mx-auto"
      >
        <Card className="border-[var(--border)]">
          <CardHeader>
            <CardTitle className="text-center">Câu hỏi thường gặp</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <h3 className="font-semibold text-[var(--text-main)]">
                Tôi có thể hủy đăng ký bất cứ lúc nào không?
              </h3>
              <p className="text-[var(--text-sub)] text-sm">
                Có, bạn có thể hủy đăng ký bất cứ lúc nào. Bạn sẽ tiếp tục sử dụng dịch vụ cho đến cuối chu kỳ thanh toán hiện tại.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold text-[var(--text-main)]">
                Tôi có được hoàn tiền nếu không hài lòng không?
              </h3>
              <p className="text-[var(--text-sub)] text-sm">
                Có, chúng tôi có chính sách hoàn tiền trong 30 ngày đầu tiên nếu bạn không hài lòng với dịch vụ.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold text-[var(--text-main)]">
                Dữ liệu của tôi có được bảo mật không?
              </h3>
              <p className="text-[var(--text-sub)] text-sm">
                Hoàn toàn. Chúng tôi sử dụng các biện pháp bảo mật cao nhất để bảo vệ dữ liệu của bạn và tuân thủ các tiêu chuẩn GDPR.
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default UpgradePage;
