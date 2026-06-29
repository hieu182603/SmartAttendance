import React, { useEffect, useMemo, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import {
  Bot,
  Building2,
  Cpu,
  TrendingUp,
  FileText,
  CreditCard,
  RefreshCw,
  Sparkles,
  Receipt,
  Inbox,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { UserRole } from "@/utils/roles";
import {
  aiBillingService,
  AiUsageData,
  AiInvoice,
  CompanyUsageSummary,
} from "@/services/aiBillingService";

const VND = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" });

const STATUS_LABELS: Record<string, string> = {
  draft: "Nháp",
  issued: "Đã phát hành",
  paid: "Đã thanh toán",
  overdue: "Quá hạn",
  cancelled: "Đã hủy",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-[var(--shell)] text-[var(--text-sub)]",
  issued: "bg-blue-500/15 text-blue-400",
  paid: "bg-emerald-500/15 text-emerald-400",
  overdue: "bg-red-500/15 text-red-400",
  cancelled: "bg-[var(--shell)] text-[var(--text-sub)]",
};

function periodLabel(invoice: AiInvoice) {
  const d = new Date(invoice.periodStart);
  return `T${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

function periodBadge(month: number, year: number) {
  return `T${String(month).padStart(2, "0")}/${year}`;
}

type StatCardProps = {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
  accentClass: string;
};

function StatCard({ icon, label, value, hint, accentClass }: StatCardProps) {
  return (
    <Card className="border-[var(--border)] bg-[var(--surface)] overflow-hidden">
      <CardContent className="!p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--text-sub)]">{label}</p>
            <p className={`mt-2 text-2xl font-bold tabular-nums ${accentClass}`}>{value}</p>
            <p className="mt-1 text-xs text-[var(--text-sub)]">{hint}</p>
          </div>
          <div className="shrink-0 rounded-xl bg-[var(--shell)] p-2.5 text-[var(--text-sub)]">{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyBlock({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-14 px-4 text-center">
      <div className="mb-4 rounded-2xl bg-[var(--shell)] p-4 text-[var(--text-sub)]">{icon}</div>
      <p className="text-sm font-medium text-[var(--text-main)]">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-[var(--text-sub)]">{description}</p>
    </div>
  );
}

function LoadingBlock() {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-[var(--text-sub)]">
      <RefreshCw className="h-5 w-5 animate-spin" />
      <span className="text-sm">Đang tải dữ liệu...</span>
    </div>
  );
}

/** Quản lý chi phí AI — ADMIN + Super Admin (tab Nền tảng / Công ty) */
export default function AiUsageBillingPage() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === UserRole.SUPER_ADMIN;

  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [activeTab, setActiveTab] = useState(isSuperAdmin ? "platform" : "company");

  const [usage, setUsage] = useState<AiUsageData | null>(null);
  const [invoices, setInvoices] = useState<AiInvoice[]>([]);
  const [companies, setCompanies] = useState<CompanyUsageSummary[]>([]);
  const [loadingCompany, setLoadingCompany] = useState(true);
  const [loadingPlatform, setLoadingPlatform] = useState(false);
  const [payingCode, setPayingCode] = useState<number | null>(null);
  const [generating, setGenerating] = useState(false);

  const pendingInvoices = invoices.filter((i) => ["issued", "overdue"].includes(i.status)).length;

  const platformTotals = useMemo(() => {
    return companies.reduce(
      (acc, c) => ({
        tokens: acc.tokens + c.totalTokens,
        costVnd: acc.costVnd + c.totalCostVnd,
        events: acc.events + c.eventCount,
      }),
      { tokens: 0, costVnd: 0, events: 0 }
    );
  }, [companies]);

  async function fetchCompanyData() {
    setLoadingCompany(true);
    try {
      const [u, inv] = await Promise.all([
        aiBillingService.getUsage({ month, year }),
        aiBillingService.getInvoices({ limit: 20 }),
      ]);
      setUsage(u);
      setInvoices(inv.items);
    } catch {
      toast.error("Không thể tải dữ liệu chi phí AI");
    } finally {
      setLoadingCompany(false);
    }
  }

  async function fetchPlatformData() {
    if (!isSuperAdmin) return;
    setLoadingPlatform(true);
    try {
      const comp = await aiBillingService.getAdminCompaniesUsage({ month, year });
      setCompanies(comp);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Không thể tải dữ liệu nền tảng";
      toast.error(msg);
    } finally {
      setLoadingPlatform(false);
    }
  }

  async function fetchAll() {
    await Promise.all([fetchCompanyData(), isSuperAdmin ? fetchPlatformData() : Promise.resolve()]);
  }

  useEffect(() => {
    fetchCompanyData();
    if (isSuperAdmin) fetchPlatformData();
  }, []);

  useEffect(() => {
    if (activeTab === "platform" && isSuperAdmin) fetchPlatformData();
    if (activeTab === "company") fetchCompanyData();
  }, [month, year, activeTab]);

  async function handlePay(invoiceCode: number) {
    setPayingCode(invoiceCode);
    try {
      const result = await aiBillingService.payInvoice(invoiceCode);
      globalThis.location.href = result.checkoutUrl;
    } catch {
      toast.error("Không thể tạo link thanh toán");
    } finally {
      setPayingCode(null);
    }
  }

  async function handleGenerate() {
    setGenerating(true);
    try {
      const result = await aiBillingService.generateInvoices({ periodMonth: month, periodYear: year });
      toast.success(`Đã phát hành ${result.created} hóa đơn`);
      fetchPlatformData();
      fetchCompanyData();
    } catch {
      toast.error("Không thể phát hành hóa đơn");
    } finally {
      setGenerating(false);
    }
  }

  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const years = [now.getFullYear() - 1, now.getFullYear()];

  const periodToolbar = (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
        <SelectTrigger className="h-9 w-[130px] border-[var(--border)] bg-[var(--surface)]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {months.map((m) => (
            <SelectItem key={m} value={String(m)}>
              Tháng {m}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
        <SelectTrigger className="h-9 w-[100px] border-[var(--border)] bg-[var(--surface)]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {years.map((y) => (
            <SelectItem key={y} value={String(y)}>
              {y}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button variant="outline" size="sm" onClick={fetchAll} className="h-9 gap-1.5 border-[var(--border)]">
        <RefreshCw size={14} />
        Làm mới
      </Button>
      {isSuperAdmin && activeTab === "platform" && (
        <Button
          size="sm"
          className="h-9 gap-1.5 bg-gradient-to-r from-[var(--primary)] to-[var(--accent-cyan)] text-white border-0"
          onClick={handleGenerate}
          disabled={generating}
        >
          <FileText size={14} />
          {generating ? "Đang phát hành..." : `Phát hành ${periodBadge(month, year)}`}
        </Button>
      )}
    </div>
  );

  const platformPanel = (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          icon={<Building2 size={20} />}
          label="Công ty có phát sinh"
          value={String(companies.length)}
          hint={`Kỳ ${periodBadge(month, year)}`}
          accentClass="text-[var(--text-main)]"
        />
        <StatCard
          icon={<Cpu size={20} />}
          label="Tổng token"
          value={platformTotals.tokens.toLocaleString("vi-VN")}
          hint={`${platformTotals.events} lần gọi API`}
          accentClass="text-[var(--accent-cyan)]"
        />
        <StatCard
          icon={<TrendingUp size={20} />}
          label="Tổng chi phí ước tính"
          value={VND.format(platformTotals.costVnd)}
          hint="Trước khi phát hành hóa đơn"
          accentClass="text-emerald-400"
        />
      </div>

      <Card className="border-[var(--border)] bg-[var(--surface)]">
        <CardHeader className="border-b border-[var(--border)] pb-4">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base font-semibold text-[var(--text-main)]">
              Chi tiết theo công ty
            </CardTitle>
            <Badge variant="outline" className="border-[var(--border)] text-[var(--text-sub)]">
              {periodBadge(month, year)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loadingPlatform ? (
            <LoadingBlock />
          ) : companies.length === 0 ? (
            <EmptyBlock
              icon={<Inbox size={28} />}
              title="Chưa có dữ liệu"
              description={`Chưa ghi nhận token chatbot trong kỳ ${periodBadge(month, year)}. Thử chọn tháng khác hoặc chạy lại seed demo; dữ liệu xuất hiện khi nhân viên dùng chatbot AI.`}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[var(--shell)] text-[var(--text-sub)]">
                    <th className="text-left px-4 py-3 font-medium">Công ty</th>
                    <th className="text-right px-4 py-3 font-medium">Token</th>
                    <th className="text-right px-4 py-3 font-medium">Chi phí ước tính</th>
                    <th className="text-right px-4 py-3 font-medium">Lần gọi</th>
                  </tr>
                </thead>
                <tbody>
                  {companies.map((c) => (
                    <tr
                      key={c.companyId}
                      className="border-t border-[var(--border)] transition-colors hover:bg-[var(--shell)]/50"
                    >
                      <td className="px-4 py-3 font-medium text-[var(--text-main)]">
                        {c.companyName || c.companyId}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-[var(--text-main)]">
                        {c.totalTokens.toLocaleString("vi-VN")}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-semibold text-emerald-400">
                        {VND.format(c.totalCostVnd)}
                      </td>
                      <td className="px-4 py-3 text-right text-[var(--text-sub)]">{c.eventCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const companyPanel = loadingCompany ? (
    <LoadingBlock />
  ) : (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          icon={<Cpu size={20} />}
          label="Token tháng này"
          value={(usage?.totalTokens ?? 0).toLocaleString("vi-VN")}
          hint={`${usage?.eventCount ?? 0} lần gọi API · ${periodBadge(month, year)}`}
          accentClass="text-[var(--accent-cyan)]"
        />
        <StatCard
          icon={<TrendingUp size={20} />}
          label="Chi phí ước tính"
          value={VND.format(usage?.totalCostVnd ?? 0)}
          hint={`≈ $${(usage?.totalCostUsd ?? 0).toFixed(4)} USD`}
          accentClass="text-emerald-400"
        />
        <StatCard
          icon={<Receipt size={20} />}
          label="Hóa đơn chờ thanh toán"
          value={String(pendingInvoices)}
          hint="Cần xử lý trước hạn"
          accentClass="text-amber-400"
        />
      </div>

      <Card className="border-[var(--border)] bg-[var(--surface)]">
        <CardHeader className="border-b border-[var(--border)] pb-4">
          <CardTitle className="text-base font-semibold text-[var(--text-main)]">
            Token theo ngày
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {usage && usage.daily.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={usage.daily} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "var(--text-sub)", fontSize: 11 }}
                  tickFormatter={(v) => v.slice(5)}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "var(--text-sub)", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={48}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                  }}
                  labelStyle={{ color: "var(--text-main)" }}
                  formatter={(v: any) => [Number(v).toLocaleString("vi-VN"), "Tokens"]}
                />
                <Bar
                  dataKey="tokens"
                  fill="url(#aiTokenGradient)"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={40}
                />
                <defs>
                  <linearGradient id="aiTokenGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--primary)" />
                    <stop offset="100%" stopColor="var(--accent-cyan)" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyBlock
              icon={<Sparkles size={28} />}
              title="Chưa có lượt sử dụng"
              description="Biểu đồ hiển thị khi nhân viên bắt đầu dùng chatbot AI trong tháng đã chọn."
            />
          )}
        </CardContent>
      </Card>

      <Card className="border-[var(--border)] bg-[var(--surface)]">
        <CardHeader className="border-b border-[var(--border)] pb-4">
          <CardTitle className="text-base font-semibold text-[var(--text-main)] flex items-center gap-2">
            <CreditCard size={18} className="text-[var(--primary)]" />
            Lịch sử hóa đơn
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {invoices.length === 0 ? (
            <EmptyBlock
              icon={<FileText size={28} />}
              title="Chưa có hóa đơn"
              description="Hóa đơn chi phí AI được phát hành cuối mỗi kỳ. Bạn sẽ nhận email khi có hóa đơn mới."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[var(--shell)] text-[var(--text-sub)]">
                    <th className="text-left px-4 py-3 font-medium">Mã</th>
                    <th className="text-left px-4 py-3 font-medium">Kỳ</th>
                    <th className="text-right px-4 py-3 font-medium">Token</th>
                    <th className="text-right px-4 py-3 font-medium">Số tiền</th>
                    <th className="text-left px-4 py-3 font-medium">Trạng thái</th>
                    <th className="text-right px-4 py-3 font-medium">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr
                      key={inv._id}
                      className="border-t border-[var(--border)] transition-colors hover:bg-[var(--shell)]/50"
                    >
                      <td className="px-4 py-3 font-mono text-xs text-[var(--text-sub)]">
                        #{inv.invoiceCode}
                      </td>
                      <td className="px-4 py-3 text-[var(--text-main)]">{periodLabel(inv)}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-[var(--text-main)]">
                        {inv.totalTokens.toLocaleString("vi-VN")}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-semibold text-[var(--text-main)]">
                        {VND.format(inv.amountVnd)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={STATUS_COLORS[inv.status] ?? ""}>
                          {STATUS_LABELS[inv.status] ?? inv.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {["issued", "overdue"].includes(inv.status) && (
                          <Button
                            size="sm"
                            className="h-8 gap-1 bg-gradient-to-r from-[var(--primary)] to-[var(--accent-cyan)] text-white"
                            disabled={payingCode === inv.invoiceCode}
                            onClick={() => handlePay(inv.invoiceCode)}
                          >
                            <CreditCard size={12} />
                            {payingCode === inv.invoiceCode ? "..." : "Thanh toán"}
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl bg-gradient-to-br from-[var(--primary)]/20 to-[var(--accent-cyan)]/10 p-3 ring-1 ring-[var(--border)]">
            <Bot className="h-7 w-7 text-[var(--accent-cyan)]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[var(--text-main)]">
              Quản lý chi phí AI
            </h1>
            <p className="mt-1 text-sm text-[var(--text-sub)]">
              {isSuperAdmin
                ? "Theo dõi token Gemini và phát hành hóa đơn chatbot cho toàn nền tảng"
                : "Theo dõi token và thanh toán chi phí dịch vụ chatbot"}
            </p>
          </div>
        </div>
        {!isSuperAdmin && periodToolbar}
      </div>

      {isSuperAdmin ? (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <TabsList className="h-10 w-fit gap-1 border border-[var(--border)] bg-[var(--shell)] p-1">
              <TabsTrigger
                value="platform"
                className="flex-none whitespace-nowrap px-4 data-[state=active]:bg-[var(--surface)] data-[state=active]:text-[var(--accent-cyan)] data-[state=active]:shadow-sm"
              >
                Nền tảng
              </TabsTrigger>
              <TabsTrigger
                value="company"
                className="flex-none whitespace-nowrap px-4 data-[state=active]:bg-[var(--surface)] data-[state=active]:text-[var(--accent-cyan)] data-[state=active]:shadow-sm"
              >
                Công ty
              </TabsTrigger>
            </TabsList>
            {periodToolbar}
          </div>
          <TabsContent value="platform" className="mt-4 focus-visible:outline-none">
            {platformPanel}
          </TabsContent>
          <TabsContent value="company" className="mt-4 focus-visible:outline-none">
            <EmptyBlock
              icon={<Building2 size={28} />}
              title="Xem theo từng công ty"
              description="Super Admin không gắn một công ty cụ thể. Dùng tab Nền tảng để xem token và phát hành hóa đơn theo công ty."
            />
          </TabsContent>
        </Tabs>
      ) : (
        <div className="mt-4">{companyPanel}</div>
      )}
    </div>
  );
}
