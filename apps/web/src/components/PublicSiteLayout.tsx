import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  Building2,
  Clock,
  Facebook,
  FileText,
  HelpCircle,
  Instagram,
  Linkedin,
  Mail,
  Moon,
  Phone,
  Shield,
  Sun,
  Twitter,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/ThemeProvider";

const QUICK_LINKS = [
  { label: "Về chúng tôi", to: "/about" },
  { label: "Tính năng", to: "/features" },
  { label: "Bảng giá", to: "/pricing" },
  { label: "Khách hàng", to: "/customers" },
] as const;

const RESOURCE_LINKS = [
  { label: "Hướng dẫn sử dụng", to: "/user-guide", icon: FileText },
  { label: "Câu hỏi thường gặp", to: "/faq", icon: HelpCircle },
  { label: "Hỗ trợ kỹ thuật", to: "/tech-support", icon: Shield },
  { label: "Điều khoản dịch vụ", to: "/terms-of-service", icon: FileText },
] as const;

function PublicSiteBackground() {
  return (
    <div className="fixed inset-0 -z-10">
      <div className="animate-orb-1 absolute top-0 right-0 h-[600px] w-[600px] rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--accent-cyan)] opacity-20 blur-[120px]" />
      <div className="animate-orb-2 absolute bottom-0 left-0 h-[500px] w-[500px] rounded-full bg-gradient-to-tr from-[var(--accent-cyan)] to-[var(--success)] opacity-20 blur-[100px]" />
      <div className="animate-orb-3 absolute top-1/2 left-1/2 h-[400px] w-[400px] rounded-full bg-gradient-to-r from-[var(--warning)] to-[var(--error)] opacity-10 blur-[80px]" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#334155_1px,transparent_1px),linear-gradient(to_bottom,#334155_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-10" />
    </div>
  );
}

function PublicSiteHeader() {
  const navigate = useNavigate();
  const { toggleTheme } = useTheme();

  return (
    <motion.header
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--shell)]/80 backdrop-blur-xl"
    >
      <div className="container mx-auto flex h-20 items-center justify-between px-6">
        <Link to="/" className="flex items-center space-x-3">
          <div className="relative">
            <div className="absolute inset-0 animate-glow rounded-xl bg-gradient-to-r from-[var(--primary)] to-[var(--accent-cyan)] opacity-50 blur-lg" />
            <div className="relative rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--accent-cyan)] p-2">
              <Clock className="h-6 w-6 text-white" />
            </div>
          </div>
          <span className="animate-gradient bg-gradient-to-r from-[var(--primary)] via-[var(--accent-cyan)] to-[var(--success)] bg-clip-text text-2xl text-transparent">
            SmartAttendance
          </span>
        </Link>

        <motion.div
          initial={{ x: 100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="flex items-center space-x-3"
        >
          <Button
            type="button"
            onClick={toggleTheme}
            variant="ghost"
            size="icon"
            className="text-[var(--text-main)] hover:bg-[var(--surface)]"
          >
            <Sun className="h-5 w-5 rotate-0 scale-100 text-[var(--warning)] transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 text-[var(--accent-cyan)] transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>
          <Button
            type="button"
            onClick={() => navigate("/login")}
            variant="outline"
            className="border-[var(--border)] text-[var(--text-main)] transition-all duration-300 hover:border-[var(--accent-cyan)] hover:bg-[var(--surface)]"
          >
            Đăng nhập
          </Button>
        </motion.div>
      </div>
    </motion.header>
  );
}

function PublicSiteFooter() {
  return (
    <footer className="border-t border-[var(--border)] bg-[var(--surface)]/50 backdrop-blur-sm">
      <div className="container mx-auto px-6 py-16">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--accent-cyan)] p-2">
                <Clock className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl text-[var(--text-main)]">Attendance Smart</span>
            </div>
            <p className="text-sm leading-relaxed text-[var(--text-sub)]">
              Giải pháp chấm công thông minh hàng đầu Việt Nam, giúp doanh nghiệp quản lý nhân sự hiệu quả và chính xác.
            </p>
            <div className="flex items-center space-x-3">
              <a
                href="#"
                className="rounded-lg bg-[var(--shell)] p-2 text-[var(--text-sub)] transition-all duration-300 hover:bg-[var(--primary)] hover:text-white"
              >
                <Facebook className="h-5 w-5" />
              </a>
              <a
                href="#"
                className="rounded-lg bg-[var(--shell)] p-2 text-[var(--text-sub)] transition-all duration-300 hover:bg-[var(--accent-cyan)] hover:text-white"
              >
                <Twitter className="h-5 w-5" />
              </a>
              <a
                href="#"
                className="rounded-lg bg-[var(--shell)] p-2 text-[var(--text-sub)] transition-all duration-300 hover:bg-[var(--primary)] hover:text-white"
              >
                <Linkedin className="h-5 w-5" />
              </a>
              <a
                href="#"
                className="rounded-lg bg-[var(--shell)] p-2 text-[var(--text-sub)] transition-all duration-300 hover:bg-gradient-to-r hover:from-purple-500 hover:to-pink-500 hover:text-white"
              >
                <Instagram className="h-5 w-5" />
              </a>
            </div>
          </div>

          <div>
            <h3 className="mb-4 flex items-center space-x-2 text-[var(--text-main)]">
              <Zap className="h-5 w-5 text-[var(--accent-cyan)]" />
              <span>Liên kết nhanh</span>
            </h3>
            <ul className="space-y-3">
              {QUICK_LINKS.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="group flex items-center space-x-2 text-sm text-[var(--text-sub)] transition-colors duration-300 hover:text-[var(--accent-cyan)]"
                  >
                    <ArrowRight className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
                    <span>{link.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-4 flex items-center space-x-2 text-[var(--text-main)]">
              <BookOpen className="h-5 w-5 text-[var(--success)]" />
              <span>Tài nguyên</span>
            </h3>
            <ul className="space-y-3">
              {RESOURCE_LINKS.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="group flex items-center space-x-2 text-sm text-[var(--text-sub)] transition-colors duration-300 hover:text-[var(--success)]"
                  >
                    <link.icon className="h-4 w-4 opacity-60 group-hover:opacity-100" />
                    <span>{link.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-4 flex items-center space-x-2 text-[var(--text-main)]">
              <Phone className="h-5 w-5 text-[var(--warning)]" />
              <span>Liên hệ</span>
            </h3>
            <ul className="space-y-4">
              <li className="flex items-start space-x-3">
                <Building2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-[var(--text-sub)]" />
                <p className="text-sm text-[var(--text-sub)]">Tầng 12, Tòa nhà Smart city, Hà Nội</p>
              </li>
              <li className="flex items-center space-x-3">
                <Phone className="h-5 w-5 flex-shrink-0 text-[var(--success)]" />
                <a
                  href="tel:1900123456"
                  className="text-sm text-[var(--text-sub)] transition-colors hover:text-[var(--success)]"
                >
                  1900123456
                </a>
              </li>
              <li className="flex items-center space-x-3">
                <Mail className="h-5 w-5 flex-shrink-0 text-[var(--accent-cyan)]" />
                <a
                  href="mailto:hieunguyenn1501@gmail.com"
                  className="text-sm text-[var(--text-sub)] transition-colors hover:text-[var(--accent-cyan)]"
                >
                  hieunguyenn1501@gmail.com
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default function PublicSiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative min-h-screen overflow-hidden bg-background"
      style={{ backgroundColor: "var(--background)" }}
    >
      <PublicSiteBackground />
      <PublicSiteHeader />
      {children}
      <PublicSiteFooter />
    </div>
  );
}
