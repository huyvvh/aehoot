import Link from "next/link";
import {
  BookOpen,
  BarChart3,
  Zap,
  Users,
  ArrowRight,
  Play,
  Gamepad2,
} from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Navbar */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-sm shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between h-16 px-4 sm:px-6">
          <Link href="/" className="flex items-center">
            <span className="text-2xl font-black italic text-[#8b5dc8]">AEHoot</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/play"
              className="px-4 py-2 text-[#3a3a5c] font-bold text-sm hover:bg-gray-50 rounded-lg transition-colors"
            >
              Join Game
            </Link>
            <Link
              href="/login"
              className="px-5 py-2.5 bg-[#4ecdc4] hover:bg-[#45b7af] text-white font-extrabold text-sm rounded-xl transition-colors shadow-[0_3px_0_#38a89d]"
            >
              Đăng nhập
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="flex-1 flex items-center bg-[#89d4e0] relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M18 0h4v18h18v4H22v18h-4V22H0v-4h18V0z' fill='%23ffffff' fill-opacity='1'/%3E%3C/svg%3E")`,
            backgroundSize: "40px 40px",
          }}
        />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-20 text-center relative z-10">
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-[#3a3a5c] leading-tight">
            Học mà chơi,{" "}
            <span className="text-[#8b5dc8]">chơi mà học</span>
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-[#3a3a5c]/70 max-w-2xl mx-auto font-semibold">
            Tạo bộ câu hỏi, tổ chức game quiz real-time cho lớp học,
            workshop hoặc bất kỳ nhóm nào. Miễn phí & vui nhộn!
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-[#4ecdc4] hover:bg-[#45b7af] text-white font-extrabold text-lg rounded-xl transition-colors shadow-[0_5px_0_#38a89d]"
            >
              Bắt đầu ngay
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              href="/play"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-[#8b5dc8] hover:bg-[#7a4db5] text-white font-extrabold text-lg rounded-xl transition-colors shadow-[0_5px_0_#6b3da8]"
            >
              <Play className="h-5 w-5 fill-white" />
              Join Game
            </Link>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl font-black text-[#3a3a5c] text-center mb-12">Cách hoạt động</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: BookOpen, title: "1. Tạo bộ câu hỏi", desc: "Tạo bộ câu hỏi của riêng bạn hoặc khám phá thư viện có sẵn", color: "bg-[#4bc8eb]" },
              { icon: Zap, title: "2. Chọn chế độ chơi", desc: "Classic, Race, Battle Royale hoặc giao bài tập Homework", color: "bg-[#ffa726]" },
              { icon: BarChart3, title: "3. Chơi & Phân tích", desc: "Chơi real-time với tối đa 150 người và xem báo cáo chi tiết", color: "bg-[#4ecdc4]" },
            ].map((item, i) => (
              <div key={i} className="text-center p-6">
                <div className={`w-16 h-16 ${item.color} rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg`}>
                  <item.icon className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-lg font-extrabold text-[#3a3a5c] mb-2">{item.title}</h3>
                <p className="text-[#3a3a5c]/60 font-medium">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-[#f0f0ff]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl font-black text-[#3a3a5c] text-center mb-12">Tính năng nổi bật</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: Gamepad2, title: "4 chế độ chơi", desc: "Classic, Race, Battle Royale và Homework", color: "bg-[#8b5dc8]" },
              { icon: Users, title: "150 người chơi", desc: "Hỗ trợ tối đa 150 người chơi cùng lúc", color: "bg-[#4bc8eb]" },
              { icon: Zap, title: "Real-time", desc: "Gameplay mượt mà với WebSocket", color: "bg-[#ffa726]" },
              { icon: BookOpen, title: "Thư viện câu hỏi", desc: "Khám phá và copy bộ câu hỏi từ cộng đồng", color: "bg-[#4ecdc4]" },
              { icon: BarChart3, title: "Báo cáo chi tiết", desc: "Phân tích từng câu hỏi, từng người chơi", color: "bg-[#ef5350]" },
              { icon: ArrowRight, title: "Dễ tham gia", desc: "Nhập Game ID 6 số, không cần tài khoản", color: "bg-[#a855f7]" },
            ].map((feature, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className={`w-10 h-10 ${feature.color} rounded-xl flex items-center justify-center mb-3`}>
                  <feature.icon className="h-5 w-5 text-white" />
                </div>
                <h3 className="font-extrabold text-[#3a3a5c] mb-1">{feature.title}</h3>
                <p className="text-sm text-[#3a3a5c]/60 font-medium">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20" style={{ background: "linear-gradient(135deg, #8b5dc8, #a855f7)" }}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-3xl font-black text-white mb-4">
            Sẵn sàng bắt đầu?
          </h2>
          <p className="text-white/70 mb-8 text-lg font-semibold">
            Tạo tài khoản miễn phí và host game đầu tiên ngay hôm nay.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 px-8 py-4 bg-[#4ecdc4] hover:bg-[#45b7af] text-white font-extrabold text-lg rounded-xl transition-colors shadow-[0_5px_0_#38a89d]"
          >
            Đăng ký miễn phí
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#3a3a5c] text-white/60 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-xl font-black italic text-white">AEHoot</span>
          <p className="text-sm font-medium">&copy; 2025 AEHoot. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
