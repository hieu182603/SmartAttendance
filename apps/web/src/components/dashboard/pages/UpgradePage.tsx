import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { billingService } from "@/services/billingService";
import { useAuth } from "@/context/AuthContext";

// ─── Plan config (mirrors packages/shared PLAN_CONFIG) ───────────────────────
const PLAN_IDS = ["starter", "standard", "premium"] as const;
type PlanId = (typeof PLAN_IDS)[number];

const PLAN_PRICES: Record<PlanId, { mo: number; yr: number }> = {
  starter:  { mo: 1_000_000, yr: 12_000_000 },
  standard: { mo: 2_900_000, yr: 35_000_000 },
  premium:  { mo: 6_600_000, yr: 80_000_000 },
};

const PLAN_ICONS: Record<PlanId, string> = {
  starter:  "🚀",
  standard: "👥",
  premium:  "🏢",
};

// Tailwind gradient / accent classes per plan
const PLAN_ACCENT = {
  starter:  { grad: "from-blue-500 to-cyan-400",   glow: "shadow-blue-500/25",   badge: "bg-blue-500/10 text-blue-400",   check: "bg-blue-500/15 text-blue-400",   btn: "from-blue-500 to-cyan-400",   bar: "from-blue-500 to-cyan-400"   },
  standard: { grad: "from-violet-500 to-purple-500", glow: "shadow-violet-500/25", badge: "bg-violet-500/10 text-violet-400", check: "bg-violet-500/15 text-violet-400", btn: "from-violet-500 to-purple-500", bar: "from-violet-500 to-purple-500" },
  premium:  { grad: "from-amber-500 to-orange-500", glow: "shadow-amber-500/20",   badge: "bg-amber-500/10 text-amber-400",   check: "bg-amber-500/13 text-amber-400",   btn: "from-amber-500 to-orange-500", bar: "from-amber-500 to-orange-500"  },
};

// ─── State types ──────────────────────────────────────────────────────────────
type Screen     = "pricing" | "checkout";
type CheckoutStep = "info" | "qr" | "processing" | "success" | "cancelled" | "pending";
type Billing    = "mo" | "yr";

interface FormData {
  companyName:    string;
  employeeCount:  string;
  customerName:   string;
  customerEmail:  string;
  customerPhone:  string;
  billingMonths:  string;
  notes:          string;
  confirmEmail:   string;
}

const vnd = (n: number) => new Intl.NumberFormat("vi-VN").format(n);

const QR_TOTAL_SECS = 900; // 15 min

export type UpgradePageMode = "upgrade" | "catalog";

interface UpgradePageProps {
  mode?: UpgradePageMode;
}

// ─── Grid-background helper ───────────────────────────────────────────────────
const gridBgStyle: React.CSSProperties = {
  backgroundImage: [
    "linear-gradient(rgba(26,45,74,.35) 1px, transparent 1px)",
    "linear-gradient(90deg, rgba(26,45,74,.35) 1px, transparent 1px)",
  ].join(", "),
  backgroundSize: "44px 44px",
};

// ─── Component ────────────────────────────────────────────────────────────────
const UpgradePage: React.FC<UpgradePageProps> = ({ mode = "upgrade" }) => {
  const { t } = useTranslation(["dashboard"]);
  const navigate    = useNavigate();
  const { user }    = useAuth();
  const isCatalog   = mode === "catalog";

  // Screen state
  const [screen,      setScreen]      = useState<Screen>("pricing");
  const [billing,     setBilling]     = useState<Billing>("mo");
  const [chosenPlan,  setChosenPlan]  = useState<PlanId>("standard");
  const [step,        setStep]        = useState<CheckoutStep>("info");
  const [isCreating,  setIsCreating]  = useState(false);

  // Payment result
  const [qrCode,      setQrCode]      = useState<string>("");
  const [orderCode,   setOrderCode]   = useState<number | null>(null);
  const [orderCodeDisplay, setOrderCodeDisplay] = useState<string>("");

  // QR timer
  const [qrSecs, setQrSecs] = useState(QR_TOTAL_SECS);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Form state
  const [form, setForm] = useState<FormData>({
    companyName:   "",
    employeeCount: "",
    customerName:  "",
    customerEmail: "",
    customerPhone: "",
    billingMonths: "1",
    notes:         "",
    confirmEmail:  "",
  });

  // Pre-fill from auth user
  useEffect(() => {
    if (!user || isCatalog) return;
    setForm((f) => ({
      ...f,
      companyName:   f.companyName   || user.companyName || "",
      customerName:  f.customerName  || user.name        || "",
      customerEmail: f.customerEmail || user.email       || "",
      customerPhone: f.customerPhone || user.phone       || "",
      confirmEmail:  f.confirmEmail  || user.email       || "",
    }));
  }, [user, isCatalog]);

  // Sync billingMonths when cycle changes
  useEffect(() => {
    setForm((f) => ({
      ...f,
      billingMonths: billing === "yr" ? "12" : f.billingMonths === "12" ? "1" : f.billingMonths,
    }));
  }, [billing]);

  // ─── Timer helpers ──────────────────────────────────────────────────────────
  const stopTimer = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  };

  const startTimer = () => {
    stopTimer();
    setQrSecs(QR_TOTAL_SECS);
    timerRef.current = setInterval(() => {
      setQrSecs((s) => {
        if (s <= 1) { stopTimer(); return 0; }
        return s - 1;
      });
    }, 1000);
  };

  useEffect(() => () => stopTimer(), []);

  const timerDisplay = () => {
    const m = Math.floor(qrSecs / 60).toString().padStart(2, "0");
    const s = (qrSecs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  // ─── Navigation ─────────────────────────────────────────────────────────────
  const goCheckout = (planId: PlanId) => {
    setChosenPlan(planId);
    setStep("info");
    setQrCode("");
    setOrderCode(null);
    setScreen("checkout");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goPricing = () => {
    stopTimer();
    setScreen("pricing");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ─── Keyboard ESC to go back ────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && screen === "checkout") goPricing();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [screen]);

  // ─── Step 1: Create payment link → get QR ──────────────────────────────────
  const handleCreatePayment = async () => {
    const { companyName, employeeCount, customerName, customerEmail, customerPhone, billingMonths } = form;
    if (!companyName.trim() || !customerName.trim() || !customerEmail.trim() || !customerPhone.trim()) {
      toast.error(t("dashboard:upgrade.checkout.errorFillRequired"));
      return;
    }
    const count = Number.parseInt(employeeCount, 10);
    if (!Number.isFinite(count) || count < 1) {
      toast.error(t("dashboard:upgrade.checkout.errorEmployeeCount"));
      return;
    }
    const months = billing === "yr" ? 12 : Number.parseInt(billingMonths, 10);

    setIsCreating(true);
    try {
      const result = await billingService.createUpgradePayment({
        plan:          chosenPlan,
        billingCycle:  billing === "mo" ? "monthly" : "yearly",
        companyName:   companyName.trim(),
        employeeCount: count,
        customerName:  customerName.trim(),
        customerEmail: customerEmail.trim(),
        customerPhone: customerPhone.trim(),
        billingMonths: months,
        notes:         form.notes.trim() || undefined,
      });

      if (!result.qrCode && !result.checkoutUrl) {
        toast.error(t("dashboard:upgrade.checkout.errorCreatePayment"));
        return;
      }

      setQrCode(result.qrCode || "");
      setOrderCode(result.orderCode);
      setOrderCodeDisplay(`#SA-${result.orderCode}`);
      setForm((f) => ({ ...f, confirmEmail: f.confirmEmail || customerEmail.trim() }));
      setStep("qr");
      startTimer();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("dashboard:upgrade.checkout.errorCreatePayment");
      toast.error(msg);
    } finally {
      setIsCreating(false);
    }
  };

  // ─── Step 2: Poll status after "I have paid" ────────────────────────────────
  const handleIPaid = async () => {
    if (!orderCode) return;
    stopTimer();
    setStep("processing");
    const result = await billingService.pollPaymentStatusUntilPaid(orderCode);
    if (result === "paid")    setStep("success");
    else if (result === "failed") setStep("cancelled");
    else                          setStep("pending");
  };

  // ─── Derived values ──────────────────────────────────────────────────────────
  const p      = PLAN_PRICES[chosenPlan];
  const price  = billing === "mo" ? p.mo : p.yr;
  const accent = PLAN_ACCENT[chosenPlan];
  const months = billing === "yr" ? 12 : Number.parseInt(form.billingMonths || "1", 10) || 1;
  const totalAmount = billing === "mo" ? p.mo * months : p.yr;

  const planName = t(`dashboard:upgrade.plans.${chosenPlan}.name`);
  const planSub  = t(`dashboard:upgrade.plans.${chosenPlan}.sub`);
  const planTarget = t(`dashboard:upgrade.plans.${chosenPlan}.target`);
  const planFeats: string[] = t(`dashboard:upgrade.plans.${chosenPlan}.feats`, { returnObjects: true }) as string[];

  const periodLabel = billing === "mo"
    ? t("dashboard:upgrade.billingMonthly")
    : t("dashboard:upgrade.billingYearly");

  // ────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ────────────────────────────────────────────────────────────────────────────
  return (
    <div className="relative min-h-screen -mx-4 -mt-4 sm:-mx-6 sm:-mt-6" style={gridBgStyle}>

      {/* ══ SCREEN 1: PRICING ═══════════════════════════════════════════════ */}
      {screen === "pricing" && (
        <div className="min-h-screen flex flex-col">

          {/* Hero */}
          <section className="text-center pt-14 pb-10 px-6 max-w-xl mx-auto">
            <div className="inline-flex items-center gap-1.5 text-[var(--accent-cyan)] text-[10px] font-mono font-medium
              tracking-widest uppercase border border-[var(--accent-cyan)]/20 bg-[var(--accent-cyan)]/5
              px-3.5 py-1.5 rounded-full mb-5">
              ✦ {t("dashboard:upgrade.eyebrow")}
            </div>
            <h1 className="font-extrabold text-[clamp(26px,5vw,46px)] leading-tight tracking-tight text-[var(--text-main)] mb-3">
              {t("dashboard:upgrade.title")}{" "}
              <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                {t("dashboard:upgrade.titleHighlight")}
              </span>
              {t("dashboard:upgrade.titleSuffix")}
            </h1>

            {/* Billing toggle */}
            <div className="inline-flex bg-[var(--surface)] border border-[var(--border)] rounded-full p-1 gap-1 mt-6 mb-12">
              <button
                type="button"
                onClick={() => setBilling("mo")}
                className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                  billing === "mo"
                    ? "bg-[var(--primary)] text-white shadow-md shadow-blue-500/25"
                    : "text-[var(--text-sub)] hover:text-[var(--text-main)]"
                }`}
              >
                {t("dashboard:upgrade.billingMonthly")}
              </button>
              <button
                type="button"
                onClick={() => setBilling("yr")}
                className={`px-5 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
                  billing === "yr"
                    ? "bg-[var(--primary)] text-white shadow-md shadow-blue-500/25"
                    : "text-[var(--text-sub)] hover:text-[var(--text-main)]"
                }`}
              >
                {t("dashboard:upgrade.billingYearly")}
                <span className="font-mono text-[9px] font-semibold bg-green-500/15 text-green-400
                  border border-green-500/25 px-1.5 py-0.5 rounded-full">
                  {t("dashboard:upgrade.saveTag")}
                </span>
              </button>
            </div>
          </section>

          {/* Plan cards */}
          <div className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 pb-16">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {PLAN_IDS.map((id) => {
                const ac    = PLAN_ACCENT[id];
                const pp    = PLAN_PRICES[id];
                const price = billing === "mo" ? pp.mo : pp.yr;
                const note  = billing === "yr"
                  ? t("dashboard:upgrade.saveAmount", { amount: vnd(pp.mo * 12 - pp.yr) })
                  : t("dashboard:upgrade.payMonthly");
                const feats: string[] = t(`dashboard:upgrade.plans.${id}.feats`, { returnObjects: true }) as string[];
                const isPopular = id === "standard";

                return (
                  <div key={id} className="relative flex flex-col">
                    {isPopular && (
                      <div className="absolute -top-3 right-4 z-10">
                        <span className={`bg-gradient-to-r ${ac.grad} text-white text-[9px] font-bold
                          tracking-widest uppercase px-3 py-1 rounded-full shadow-lg ${ac.glow}`}>
                          {t("dashboard:upgrade.popularBadge")}
                        </span>
                      </div>
                    )}

                    <div className={`relative flex flex-col flex-1 rounded-2xl overflow-hidden
                      bg-[var(--surface)] border border-[var(--border)]
                      transition-all duration-200 hover:-translate-y-1 hover:shadow-xl hover:${ac.glow}
                      ${isPopular ? "border-violet-500/40" : ""}`}>

                      {/* Top color bar */}
                      <div className={`h-0.5 w-full bg-gradient-to-r ${ac.bar}`} />

                      {/* Ambient corner glow */}
                      <div className={`absolute top-0 right-0 w-36 h-36 rounded-full pointer-events-none
                        bg-gradient-radial opacity-0 dark:opacity-100`}
                        style={{ background: `radial-gradient(circle at top right, ${
                          id === "starter" ? "rgba(59,130,246,.08)" :
                          id === "standard" ? "rgba(139,92,246,.08)" : "rgba(245,158,11,.07)"
                        }, transparent 70%)` }} />

                      <div className="p-6 flex flex-col flex-1">
                        {/* Icon + name */}
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl mb-4 ${ac.badge}`}>
                          {PLAN_ICONS[id]}
                        </div>
                        <p className={`font-bold text-[17px] tracking-tight mb-0.5 bg-gradient-to-r ${ac.grad} bg-clip-text text-transparent`}>
                          {t(`dashboard:upgrade.plans.${id}.name`)}
                        </p>
                        <p className="text-xs text-[var(--text-sub)] mb-1">
                          {t(`dashboard:upgrade.plans.${id}.sub`)}
                        </p>
                        <span className="inline-block font-mono text-[10px] text-[var(--text-sub)]/60
                          bg-[var(--shell)] border border-[var(--border)] px-2.5 py-0.5 rounded-md mb-5">
                          {t(`dashboard:upgrade.plans.${id}.target`)}
                        </span>

                        {/* Price */}
                        <div className="flex items-baseline gap-1 mb-1">
                          <span className="text-xs text-[var(--text-sub)] self-start pt-1.5">₫</span>
                          <span className="font-mono text-3xl font-semibold leading-none tracking-tight text-[var(--text-main)]">
                            {vnd(price)}
                          </span>
                          <span className="text-xs text-[var(--text-sub)]">
                            {billing === "mo" ? t("dashboard:upgrade.perMonth") : t("dashboard:upgrade.perYear")}
                          </span>
                        </div>
                        <p className={`font-mono text-[10px] mb-5 min-h-[14px] ${billing === "yr" ? "text-green-400" : "text-[var(--text-sub)]/50"}`}>
                          {note}
                        </p>

                        <div className="h-px bg-[var(--border)] mb-4" />

                        {/* Features */}
                        <ul className="flex flex-col gap-2.5 mb-6 flex-1">
                          {feats.map((f, i) => (
                            <li key={i} className="flex items-start gap-2 text-[13px] text-[var(--text-sub)]">
                              <span className={`flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center
                                text-[9px] font-bold mt-0.5 ${ac.check}`}>✓</span>
                              {f}
                            </li>
                          ))}
                        </ul>

                        {/* CTA */}
                        <button
                          type="button"
                          onClick={() => isCatalog ? navigate("/register") : goCheckout(id)}
                          className={`w-full py-3 rounded-xl text-sm font-semibold text-white
                            bg-gradient-to-r ${ac.btn} shadow-lg ${ac.glow}
                            hover:brightness-110 hover:-translate-y-px active:brightness-95
                            transition-all duration-150 relative overflow-hidden`}
                        >
                          <span className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent" />
                          <span className="relative">
                            {isCatalog
                              ? "Đăng ký dùng thử"
                              : t("dashboard:upgrade.selectPlan", { name: t(`dashboard:upgrade.plans.${id}.name`) })}
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Trust strip */}
          <div className="border-t border-[var(--border)] flex flex-wrap items-center justify-center
            gap-x-6 gap-y-2 px-6 py-5 text-xs text-[var(--text-sub)]">
            <span>🔒 {t("dashboard:upgrade.trust.ssl")}</span>
            <span>⚡ {t("dashboard:upgrade.trust.activate")}</span>
            <span>🏦 {t("dashboard:upgrade.trust.payos")}</span>
            <span>↩️ {t("dashboard:upgrade.trust.refund")}</span>
            <span>🇻🇳 {t("dashboard:upgrade.trust.local")}</span>
          </div>
        </div>
      )}

      {/* ══ SCREEN 2: CHECKOUT ══════════════════════════════════════════════ */}
      {screen === "checkout" && (
        <div className="min-h-screen flex flex-col">

          {/* Top bar */}
          <div className="sticky top-0 z-50 flex items-center justify-between px-5 sm:px-10 h-[54px]
            bg-[var(--background)]/92 backdrop-blur-md border-b border-[var(--border)]">
            <button
              type="button"
              onClick={goPricing}
              className="flex items-center gap-2.5 font-bold text-[var(--text-main)] text-sm bg-transparent border-none cursor-pointer"
            >
              <span className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-extrabold text-white
                bg-gradient-to-br from-blue-700 to-sky-600">S</span>
              Smart<em className="not-italic text-[var(--accent-cyan)]">Attendance</em>
            </button>
            <button
              type="button"
              onClick={goPricing}
              className="flex items-center gap-1.5 text-[13px] font-medium text-[var(--text-sub)]
                border border-[var(--border)] rounded-lg px-3.5 py-1.5 hover:border-[var(--border)]/80
                hover:text-[var(--text-main)] transition-colors bg-transparent cursor-pointer"
            >
              ← {t("dashboard:upgrade.checkout.backBtn")}
            </button>
          </div>

          {/* Two-column body */}
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 max-w-4xl w-full mx-auto px-4 sm:px-8 py-10 gap-10 items-start">

            {/* ── LEFT: Order summary ── */}
            <div className="space-y-5">

              {/* Plan hero card */}
              <div className={`relative overflow-hidden rounded-2xl bg-[var(--surface)]
                border border-[var(--border)] p-6`}>
                {/* top bar */}
                <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${accent.bar}`} />

                <div className="flex items-start gap-3.5 mb-5">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 ${accent.badge}`}>
                    {PLAN_ICONS[chosenPlan]}
                  </div>
                  <div>
                    <p className="text-[10px] font-mono text-[var(--text-sub)]/60 uppercase tracking-wider mb-1">
                      {t("dashboard:upgrade.checkout.subscriptionLabel")}
                    </p>
                    <p className={`font-extrabold text-xl tracking-tight bg-gradient-to-r ${accent.grad} bg-clip-text text-transparent`}>
                      {planName}
                    </p>
                    <p className="text-sm text-[var(--text-sub)]">{planSub}</p>
                  </div>
                </div>

                {/* Price breakdown */}
                <div className="rounded-xl border border-[var(--border)] overflow-hidden bg-[var(--shell)]">
                  {[
                    [t("dashboard:upgrade.checkout.planLabel"), planName],
                    [t("dashboard:upgrade.checkout.billingPeriod"), periodLabel],
                    [t("dashboard:upgrade.checkout.employeeCountLabel"), planTarget],
                  ].map(([label, val]) => (
                    <div key={label} className="flex justify-between items-center px-4 py-2.5
                      border-b border-[var(--border)] text-[13px]">
                      <span className="text-[var(--text-sub)]">{label}</span>
                      <span className="font-mono text-[12.5px] font-medium text-[var(--text-main)]">{val}</span>
                    </div>
                  ))}
                  <div className="flex justify-between items-center px-4 py-2.5 bg-green-500/5 text-[13px]">
                    <span className="text-green-400 font-medium">{t("dashboard:upgrade.checkout.total")}</span>
                    <span className="font-mono text-sm font-semibold text-green-400">
                      {vnd(totalAmount)} ₫
                    </span>
                  </div>
                </div>
              </div>

              {/* Features */}
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
                <p className="font-mono text-[10px] text-[var(--text-sub)]/50 uppercase tracking-widest mb-4">
                  {t("dashboard:upgrade.checkout.includes")}
                </p>
                <ul className="flex flex-col gap-2.5">
                  {planFeats.map((f, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-[13px] text-[var(--text-sub)]">
                      <span className={`flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center
                        text-[9px] font-bold mt-0.5 ${accent.check}`}>✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* ── RIGHT: Payment form card ── */}
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">

              {/* ── STEP: info ── */}
              {step === "info" && (
                <>
                  <div className="px-6 pt-5 pb-4 border-b border-[var(--border)]">
                    <p className="font-mono text-[9.5px] text-[var(--text-sub)]/50 uppercase tracking-widest mb-1">
                      {t("dashboard:upgrade.checkout.formStep")}
                    </p>
                    <p className="font-bold text-[17px] tracking-tight text-[var(--text-main)]">
                      {t("dashboard:upgrade.checkout.formTitle")}
                    </p>
                  </div>

                  <div className="px-6 py-5 space-y-3.5">
                    {/* Mini plan summary */}
                    <div className="flex items-center justify-between bg-[var(--shell)] border border-[var(--border)]
                      rounded-lg px-3.5 py-2.5 text-[13px] mb-1">
                      <span className="font-semibold text-[var(--text-main)]">{planName}</span>
                      <span className={`font-mono font-semibold text-sm bg-gradient-to-r ${accent.grad} bg-clip-text text-transparent`}>
                        {vnd(price)} ₫
                      </span>
                    </div>

                    {/* Company */}
                    <Field label={`${t("dashboard:upgrade.checkout.companyName")} *`}>
                      <input
                        type="text"
                        value={form.companyName}
                        onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))}
                        placeholder={t("dashboard:upgrade.checkout.companyNamePlaceholder")}
                        className={inputCls}
                      />
                    </Field>

                    {/* Contact name */}
                    <Field label={`${t("dashboard:upgrade.checkout.contactName")} *`}>
                      <input
                        type="text"
                        value={form.customerName}
                        onChange={(e) => setForm((f) => ({ ...f, customerName: e.target.value }))}
                        placeholder={t("dashboard:upgrade.checkout.contactNamePlaceholder")}
                        className={inputCls}
                      />
                    </Field>

                    <div className="grid grid-cols-2 gap-3">
                      {/* Email */}
                      <Field label={`${t("dashboard:upgrade.checkout.email")} *`}>
                        <input
                          type="email"
                          value={form.customerEmail}
                          onChange={(e) => setForm((f) => ({ ...f, customerEmail: e.target.value }))}
                          placeholder={t("dashboard:upgrade.checkout.emailPlaceholder")}
                          className={inputCls}
                        />
                      </Field>

                      {/* Phone */}
                      <Field label={`${t("dashboard:upgrade.checkout.phone")} *`}>
                        <input
                          type="tel"
                          value={form.customerPhone}
                          onChange={(e) => setForm((f) => ({ ...f, customerPhone: e.target.value }))}
                          placeholder={t("dashboard:upgrade.checkout.phonePlaceholder")}
                          className={inputCls}
                        />
                      </Field>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {/* Employee count */}
                      <Field label={`${t("dashboard:upgrade.checkout.employeeCountField")} *`}>
                        <input
                          type="number"
                          min={1}
                          value={form.employeeCount}
                          onChange={(e) => setForm((f) => ({ ...f, employeeCount: e.target.value }))}
                          placeholder={t("dashboard:upgrade.checkout.employeeCountPlaceholder")}
                          className={inputCls}
                        />
                      </Field>

                      {/* Billing months */}
                      <Field label={`${t("dashboard:upgrade.checkout.billingMonths")} *`}>
                        {billing === "yr" ? (
                          <input type="number" value={12} disabled className={`${inputCls} opacity-50 cursor-not-allowed`} />
                        ) : (
                          <select
                            value={form.billingMonths}
                            onChange={(e) => setForm((f) => ({ ...f, billingMonths: e.target.value }))}
                            className={inputCls}
                          >
                            {(["1", "3", "6", "12"] as const).map((m) => (
                              <option key={m} value={m}>
                                {t(`dashboard:upgrade.checkout.months${m}` as `dashboard:upgrade.checkout.months1`)}
                              </option>
                            ))}
                          </select>
                        )}
                      </Field>
                    </div>

                    {/* Notes */}
                    <Field label={t("dashboard:upgrade.checkout.notes")}>
                      <input
                        type="text"
                        value={form.notes}
                        onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                        placeholder={t("dashboard:upgrade.checkout.notesPlaceholder")}
                        className={inputCls}
                      />
                    </Field>

                    {/* Create QR button */}
                    <button
                      type="button"
                      onClick={handleCreatePayment}
                      disabled={isCreating}
                      className={`w-full flex items-center justify-center gap-2 py-3.5 mt-1 rounded-xl
                        text-[14px] font-semibold text-white relative overflow-hidden
                        bg-gradient-to-r ${accent.btn} shadow-lg ${accent.glow}
                        hover:brightness-110 hover:-translate-y-px active:brightness-95
                        disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-150`}
                    >
                      <span className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent" />
                      <span className="relative">
                        {isCreating
                          ? t("dashboard:upgrade.checkout.validating")
                          : t("dashboard:upgrade.checkout.createQR")}
                      </span>
                      {!isCreating && <span className="relative">→</span>}
                    </button>

                    <p className="flex items-center justify-center gap-1.5 text-[11px] text-[var(--text-sub)]/40 text-center">
                      🔐 {t("dashboard:upgrade.checkout.sslNote")}
                    </p>
                  </div>
                </>
              )}

              {/* ── STEP: qr ── */}
              {step === "qr" && (
                <>
                  <div className="px-6 pt-5 pb-4 border-b border-[var(--border)]">
                    <p className="font-mono text-[9.5px] text-[var(--text-sub)]/50 uppercase tracking-widest mb-1">
                      {t("dashboard:upgrade.checkout.qrStepLabel")}
                    </p>
                    <p className="font-bold text-[17px] tracking-tight text-[var(--text-main)]">
                      {t("dashboard:upgrade.checkout.qrTitle")}
                    </p>
                  </div>

                  <div className="px-6 py-5 space-y-4">
                    {/* Mini plan summary */}
                    <div className="flex items-center justify-between bg-[var(--shell)] border border-[var(--border)]
                      rounded-lg px-3.5 py-2.5 text-[13px]">
                      <span className="font-semibold text-[var(--text-main)]">{planName}</span>
                      <span className={`font-mono font-semibold text-sm bg-gradient-to-r ${accent.grad} bg-clip-text text-transparent`}>
                        {vnd(totalAmount)} ₫
                      </span>
                    </div>

                    {/* QR box */}
                    <div className="bg-[var(--shell)] border border-[var(--border)] rounded-xl p-5 text-center">
                      <div className="w-36 h-36 rounded-xl border border-[var(--border)] mx-auto mb-3
                        flex items-center justify-center overflow-hidden bg-white">
                        {qrCode ? (
                          <img
                            src={qrCode.startsWith("http") ? qrCode : `data:image/png;base64,${qrCode}`}
                            alt="QR Code"
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          /* Fallback placeholder if no QR string */
                          <div className="w-full h-full flex items-center justify-center
                            bg-gradient-to-br from-blue-700 to-sky-600 text-white text-xl font-extrabold">
                            SA
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-[var(--text-sub)] mb-1.5">
                        {t("dashboard:upgrade.checkout.scanHint")}
                      </p>
                      <p className={`font-mono text-2xl font-semibold ${qrSecs < 60 ? "text-red-400 animate-pulse" : "text-amber-400"}`}>
                        {timerDisplay()}
                      </p>
                    </div>

                    {/* Confirm email */}
                    <Field label={t("dashboard:upgrade.checkout.confirmEmail")}>
                      <input
                        type="email"
                        value={form.confirmEmail}
                        onChange={(e) => setForm((f) => ({ ...f, confirmEmail: e.target.value }))}
                        placeholder={t("dashboard:upgrade.checkout.confirmEmailPlaceholder")}
                        className={inputCls}
                      />
                    </Field>

                    {/* I paid button */}
                    <button
                      type="button"
                      onClick={handleIPaid}
                      className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl
                        text-[14px] font-semibold text-white relative overflow-hidden
                        bg-gradient-to-r ${accent.btn} shadow-lg ${accent.glow}
                        hover:brightness-110 hover:-translate-y-px active:brightness-95
                        transition-all duration-150`}
                    >
                      <span className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent" />
                      <span className="relative">{t("dashboard:upgrade.checkout.iPaid")}</span>
                      <span className="relative">→</span>
                    </button>

                    <p className="flex items-center justify-center gap-1.5 text-[11px] text-[var(--text-sub)]/40 text-center">
                      🔐 {t("dashboard:upgrade.checkout.sslNote")}
                    </p>
                  </div>
                </>
              )}

              {/* ── STEP: processing ── */}
              {step === "processing" && (
                <div className="flex flex-col items-center text-center px-6 py-14">
                  <div className="w-14 h-14 rounded-full border-[3px] border-[var(--border)]
                    border-t-[var(--primary)] animate-spin mb-6" />
                  <p className="font-bold text-[20px] tracking-tight text-[var(--text-main)] mb-2">
                    {t("dashboard:upgrade.checkout.processing")}
                  </p>
                  <p className="text-sm text-[var(--text-sub)]">
                    {t("dashboard:upgrade.checkout.processingDesc")}
                  </p>
                </div>
              )}

              {/* ── STEP: success ── */}
              {step === "success" && (
                <div className="relative flex flex-col items-center text-center px-6 py-12 overflow-hidden">
                  {/* shimmer bar */}
                  <div className="absolute top-0 left-0 right-0 h-0.5"
                    style={{ background: "linear-gradient(90deg,#3b82f6,#22d3ee,#10b981,#22d3ee,#3b82f6)",
                      backgroundSize: "200%", animation: "shimmer 2s linear infinite" }} />

                  <div className="w-[72px] h-[72px] rounded-full flex items-center justify-center text-3xl mb-5
                    bg-green-500/12 border-2 border-green-500/28"
                    style={{ animation: "popIn .35s cubic-bezier(.34,1.56,.64,1) both" }}>✓</div>

                  <p className="font-bold text-xl text-green-400 mb-2">
                    {t("dashboard:upgrade.checkout.success")}
                  </p>
                  <p className="text-sm text-[var(--text-sub)] max-w-xs mb-6">
                    {t("dashboard:upgrade.checkout.successDesc")}
                  </p>

                  {/* Order table */}
                  <div className="w-full max-w-xs border border-[var(--border)] rounded-xl overflow-hidden
                    text-[12.5px] text-left mb-6">
                    {[
                      [t("dashboard:upgrade.checkout.orderPlan"), planName],
                      [t("dashboard:upgrade.checkout.orderCode"),  orderCodeDisplay],
                      [t("dashboard:upgrade.checkout.orderMethod"), t("dashboard:upgrade.checkout.methodQR")],
                      [t("dashboard:upgrade.checkout.orderTotal"),  `${vnd(totalAmount)} ₫`],
                    ].map(([label, val], i, arr) => (
                      <div key={label}
                        className={`flex justify-between items-center px-3.5 py-2.5
                          ${i < arr.length - 1 ? "border-b border-[var(--border)]" : "bg-green-500/5"}`}>
                        <span className={i === arr.length - 1 ? "text-green-400 font-medium" : "text-[var(--text-sub)]"}>
                          {label}
                        </span>
                        <span className={`font-mono font-semibold ${i === arr.length - 1 ? "text-green-400" : "text-[var(--text-main)]"}`}>
                          {val}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2.5 flex-wrap justify-center">
                    <PillBtn primary onClick={() => navigate("/dashboard")}>
                      {t("dashboard:upgrade.checkout.toDashboard")} →
                    </PillBtn>
                    <PillBtn onClick={goPricing}>
                      {t("dashboard:upgrade.checkout.close")}
                    </PillBtn>
                  </div>
                </div>
              )}

              {/* ── STEP: cancelled ── */}
              {step === "cancelled" && (
                <StatePanel
                  icon="✕" iconCls="bg-red-500/10 border-2 border-red-500/25"
                  title={t("dashboard:upgrade.checkout.cancelled")} titleCls="text-red-400"
                  desc={t("dashboard:upgrade.checkout.cancelledDesc")}
                >
                  <PillBtn primary onClick={() => { setStep("info"); startTimer(); }}>
                    {t("dashboard:upgrade.checkout.retry")}
                  </PillBtn>
                  <PillBtn onClick={goPricing}>
                    {t("dashboard:upgrade.checkout.chooseOther")}
                  </PillBtn>
                </StatePanel>
              )}

              {/* ── STEP: pending ── */}
              {step === "pending" && (
                <StatePanel
                  icon="⏳" iconCls="bg-amber-500/10 border-2 border-amber-500/25"
                  title={t("dashboard:upgrade.checkout.pending")} titleCls="text-amber-400"
                  desc={t("dashboard:upgrade.checkout.pendingDesc")}
                >
                  <PillBtn primary onClick={() => navigate("/dashboard")}>
                    {t("dashboard:upgrade.checkout.toDashboard")}
                  </PillBtn>
                  <PillBtn onClick={goPricing}>
                    {t("dashboard:upgrade.checkout.toSupport")}
                  </PillBtn>
                </StatePanel>
              )}

            </div>{/* .co-right */}
          </div>{/* .co-body */}
        </div>
      )}

      {/* Global keyframe styles */}
      <style>{`
        @keyframes shimmer { to { background-position: 200%; } }
        @keyframes popIn   { from { transform: scale(0) rotate(-15deg); opacity: 0; } to { transform: scale(1) rotate(0); opacity: 1; } }
      `}</style>
    </div>
  );
};

// ─── Small shared sub-components ─────────────────────────────────────────────
const inputCls =
  "w-full px-3 py-2.5 rounded-lg text-[13.5px] font-sans outline-none transition-all " +
  "bg-[var(--shell)] border border-[var(--border)] text-[var(--text-main)] " +
  "placeholder:text-[var(--text-sub)]/40 focus:border-[var(--primary)] " +
  "focus:ring-2 focus:ring-[var(--primary)]/15 " +
  "[&_option]:bg-[var(--shell)] [&_option]:text-[var(--text-main)]";

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <label className="block text-[11.5px] font-medium text-[var(--text-sub)] mb-1.5 tracking-wide">
      {label}
    </label>
    {children}
  </div>
);

const PillBtn: React.FC<{ primary?: boolean; onClick?: () => void; children: React.ReactNode }> = ({
  primary, onClick, children,
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`px-6 py-2.5 rounded-xl text-[13.5px] font-semibold transition-all cursor-pointer border
      ${primary
        ? "bg-[var(--primary)] text-white border-transparent hover:bg-blue-600"
        : "bg-[var(--surface)] text-[var(--text-sub)] border-[var(--border)] hover:border-[var(--border)]/60 hover:text-[var(--text-main)]"
      }`}
  >
    {children}
  </button>
);

const StatePanel: React.FC<{
  icon: string; iconCls: string;
  title: string; titleCls: string;
  desc: string;
  children: React.ReactNode;
}> = ({ icon, iconCls, title, titleCls, desc, children }) => (
  <div className="flex flex-col items-center text-center px-6 py-12">
    <div className={`w-[72px] h-[72px] rounded-full flex items-center justify-center text-3xl mb-5 ${iconCls}`}
      style={{ animation: "popIn .35s cubic-bezier(.34,1.56,.64,1) both" }}>
      {icon}
    </div>
    <p className={`font-bold text-xl mb-2 ${titleCls}`}>{title}</p>
    <p className="text-sm text-[var(--text-sub)] max-w-xs mb-6">{desc}</p>
    <div className="flex gap-2.5 flex-wrap justify-center">{children}</div>
  </div>
);

export default UpgradePage;
