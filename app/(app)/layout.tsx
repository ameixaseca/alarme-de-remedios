"use client";
import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) router.replace("/login");
  }, [router]);

  const navItems = [
    { href: "/", label: "🏠 Início" },
    { href: "/dashboard", label: "📦 Estoque" },
    { href: "/patients", label: "👤 Pacientes" },
    { href: "/medications", label: "💊 Medicamentos" },
    { href: "/group", label: "👥 Grupo" },
    { href: "/log", label: "📋 Log" },
  ];

  function handleLogout() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    router.replace("/login");
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-indigo-600 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-10 shadow">
        <span className="font-bold text-lg">💊 DailyMed</span>
        <button onClick={handleLogout} className="lg:hidden text-sm text-indigo-200 hover:text-white">Sair</button>
      </header>

      <div className="flex flex-1">
        {/* Sidebar — visible on desktop, left side */}
        <aside className="hidden lg:flex flex-col w-52 shrink-0 sticky top-14 self-start h-[calc(100vh-3.5rem)] border-r border-indigo-100 bg-white/70 backdrop-blur px-3 py-5">
          <nav className="flex flex-col gap-1 flex-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  pathname === item.href
                    ? "bg-indigo-600 text-white"
                    : "text-gray-600 hover:bg-indigo-50 hover:text-indigo-700"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            ↩ Sair
          </button>
        </aside>

        <main className="flex-1 px-4 py-6 max-w-2xl mx-auto w-full lg:max-w-none lg:mx-0 lg:pl-6">
          {children}
        </main>
      </div>

      {/* Bottom nav — mobile only */}
      <nav className="lg:hidden bg-white/80 backdrop-blur border-t border-gray-200 flex justify-around sticky bottom-0 z-10">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center py-2 px-3 text-xs ${
              pathname === item.href ? "text-indigo-600 font-semibold" : "text-gray-500"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
