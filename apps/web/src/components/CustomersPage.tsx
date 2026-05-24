import { Link } from 'react-router-dom';
import { ArrowLeft, Clock, Store, Building2, Factory, Gift, Headset, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

export default function CustomersPage() {
  const targetAudiences = [
    {
      icon: Store,
      title: "Chuỗi F&B & Bán lẻ",
      description: "Quản lý nhân viên làm ca, xoay ca liên tục tại nhiều chi nhánh khác nhau. Ngăn chặn triệt để tình trạng đi trễ về sớm hay chấm công hộ.",
      color: "text-orange-500",
      bg: "bg-orange-500/10"
    },
    {
      icon: Building2,
      title: "Văn phòng & Hành chính",
      description: "Chấm dứt cảnh xếp hàng quẹt thẻ mỗi sáng. Tự động hóa hoàn toàn việc tính toán ngày công, phép năm, và tích hợp trực tiếp với bảng lương.",
      color: "text-blue-500",
      bg: "bg-blue-500/10"
    },
    {
      icon: Factory,
      title: "Sản xuất & Nhà máy",
      description: "Nhận diện khuôn mặt siêu tốc, chính xác ngay cả trong môi trường thiếu sáng hoặc khi nhân viên đội mũ, đeo khẩu trang.",
      color: "text-emerald-500",
      bg: "bg-emerald-500/10"
    }
  ];

  const pioneerPerks = [
    {
      icon: Gift,
      title: "Miễn phí thiết lập & Đào tạo",
      description: "Đội ngũ của chúng tôi sẽ trực tiếp hỗ trợ bạn cấu hình hệ thống, nhập liệu nhân viên và đào tạo sử dụng hoàn toàn miễn phí."
    },
    {
      icon: Sparkles,
      title: "Ưu đãi trọn đời",
      description: "Giảm ngay 50% chi phí đăng ký gói phần mềm cho 100 khách hàng đầu tiên, và mức giá này sẽ được giữ nguyên vĩnh viễn."
    },
    {
      icon: Headset,
      title: "Hỗ trợ ưu tiên 24/7",
      description: "Yêu cầu tính năng mới hoặc hỗ trợ kỹ thuật sẽ được đội ngũ phát triển (Dev) của chúng tôi xử lý trực tiếp với độ ưu tiên cao nhất."
    }
  ];

  const techStack = [
    "React", "TypeScript", "Tailwind CSS", "Node.js", "PostgreSQL", 
    "AWS", "Redis", "Docker", "Framer Motion", "OpenAI"
  ];

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--shell)]/80 backdrop-blur-xl">
        <div className="container mx-auto flex h-16 items-center justify-between px-6">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-[var(--text-sub)] transition-colors hover:text-[var(--accent-cyan)]"
          >
            <ArrowLeft className="h-4 w-4" />
            Trang chủ
          </Link>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-[var(--accent-cyan)]" />
            <span className="text-lg font-semibold text-[var(--text-main)]">SmartAttendance</span>
          </div>
          <Link
            to="/login"
            className="text-sm font-medium text-[var(--accent-cyan)] hover:underline"
          >
            Đăng nhập
          </Link>
        </div>
      </header>

      <main className="pb-20 overflow-hidden">
        {/* Hero */}
        <section className="py-20 text-center container mx-auto px-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] text-sm font-semibold mb-6">
            <Sparkles className="h-4 w-4" /> Chương trình Đối tác Tiên phong
          </div>
          <motion.h1 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-4xl md:text-6xl font-bold text-[var(--text-main)] mb-6"
          >
            Cùng chúng tôi <span className="bg-gradient-to-r from-[var(--primary)] to-[var(--accent-cyan)] bg-clip-text text-transparent">Định hình</span> tương lai
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="text-xl text-[var(--text-sub)] max-w-2xl mx-auto"
          >
            Sản phẩm của chúng tôi đã hoàn thiện và sẵn sàng phục vụ. Hãy trở thành những khách hàng đầu tiên trải nghiệm SmartAttendance với những đặc quyền chưa từng có.
          </motion.p>
        </section>

        {/* Tech Stack Marquee */}
        <section className="py-10 border-y border-[var(--border)] bg-[var(--surface)]/30">
          <div className="container mx-auto px-6 mb-6 text-center">
            <h3 className="text-sm font-bold text-[var(--text-sub)] uppercase tracking-widest">
              Được xây dựng trên nền tảng công nghệ hàng đầu
            </h3>
          </div>
          <div className="container mx-auto px-6 overflow-hidden relative">
            <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-[var(--background)] to-transparent z-10" />
            <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-[var(--background)] to-transparent z-10" />
            
            <motion.div 
              animate={{ x: [0, -1035] }}
              transition={{ repeat: Infinity, ease: "linear", duration: 20 }}
              className="flex items-center gap-16 w-max"
            >
              {/* Doubled for seamless looping */}
              {[...techStack, ...techStack].map((tech, i) => (
                <div key={i} className="text-2xl font-bold text-[var(--text-sub)]/40 hover:text-[var(--primary)] transition-all duration-300">
                  {tech}
                </div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* Target Audience */}
        <section className="py-20 container mx-auto px-6 border-t border-[var(--border)]">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-[var(--text-main)] mb-4">Hệ thống này dành cho ai?</h2>
            <p className="text-[var(--text-sub)]">SmartAttendance được thiết kế linh hoạt để giải quyết nỗi đau của mọi mô hình kinh doanh.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {targetAudiences.map((item, idx) => {
              const Icon = item.icon;
              return (
                <motion.div 
                  key={idx}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.2 }}
                  className="bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-8 hover:shadow-xl transition-all duration-300"
                >
                  <div className={`h-14 w-14 rounded-2xl flex items-center justify-center mb-6 ${item.bg}`}>
                    <Icon className={`h-7 w-7 ${item.color}`} />
                  </div>
                  <h3 className="text-xl font-bold text-[var(--text-main)] mb-3">{item.title}</h3>
                  <p className="text-[var(--text-sub)] leading-relaxed">
                    {item.description}
                  </p>
                </motion.div>
              )
            })}
          </div>
        </section>

        {/* Pioneer Perks */}
        <section className="py-20 bg-[var(--surface)]/50 border-y border-[var(--border)]">
          <div className="container mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-[var(--text-main)] mb-4">Đặc quyền Đối tác Tiên phong</h2>
              <p className="text-[var(--text-sub)]">Chỉ áp dụng cho 100 doanh nghiệp đầu tiên đăng ký sử dụng hệ thống.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {pioneerPerks.map((perk, idx) => (
                <motion.div 
                  key={idx}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.15 }}
                  className="bg-[var(--bg)] border border-[var(--border)] p-8 rounded-2xl text-center relative overflow-hidden group"
                >
                  <div className="absolute inset-0 bg-gradient-to-b from-[var(--primary)]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative z-10">
                    <perk.icon className="h-10 w-10 mx-auto text-[var(--primary)] mb-4" />
                    <h3 className="text-lg font-bold text-[var(--text-main)] mb-2">{perk.title}</h3>
                    <p className="text-sm text-[var(--text-sub)]">{perk.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Call to Action */}
        <section className="container mx-auto px-6 py-20">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-gradient-to-r from-[var(--primary)] to-[var(--accent-cyan)] rounded-3xl p-12 text-center text-white relative overflow-hidden shadow-2xl"
          >
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10" />
            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Bạn đã sẵn sàng để trở thành người đầu tiên?</h2>
              <p className="text-lg text-white/90 mb-8 max-w-2xl mx-auto">
                Để lại thông tin và chúng tôi sẽ liên hệ để thiết lập toàn bộ hệ thống cho doanh nghiệp của bạn ngay hôm nay.
              </p>
              <Link 
                to="/pricing"
                className="inline-flex items-center gap-2 bg-white text-[var(--primary)] font-bold text-lg px-8 py-4 rounded-xl shadow-lg hover:scale-105 transition-transform"
              >
                Nhận ưu đãi ngay <ArrowLeft className="h-5 w-5 rotate-180" />
              </Link>
            </div>
          </motion.div>
        </section>
      </main>
    </div>
  );
}
