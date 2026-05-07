import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { UserDropdown } from "@/components/layout/user-dropdown";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#89d4e0]">
      {/* Background pattern */}
      <div className="fixed inset-0 opacity-[0.08] pointer-events-none z-0"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M18 0h4v18h18v4H22v18h-4V22H0v-4h18V0z' fill='%23ffffff' fill-opacity='1'/%3E%3C/svg%3E")`,
          backgroundSize: "40px 40px",
        }}
      />
      <Sidebar />
      <MobileNav />
      {/* User dropdown - top right */}
      <div className="fixed top-4 right-4 z-40 hidden md:block">
        <UserDropdown />
      </div>
      <main className="relative z-10 md:pl-[200px]">
        <div className="p-5 pt-4">
          {children}
        </div>
      </main>
    </div>
  );
}
