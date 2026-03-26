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
    { href: "/patients", label: "🐾 Pacientes" },
    { href: "/medications", label: "💊 Medicamentos" },
    { href: "/group", label: "👥 Grupo" },
  ];

  function handleLogout() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    router.replace("/login");
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-indigo-600 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <span className="font-bold text-lg">🐾 DailyMed</span>
        <button onClick={handleLogout} className="text-sm text-indigo-200 hover:text-white">Sair</button>
      </header>
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-6">{children}</main>
      <nav className="bg-white border-t border-gray-200 flex justify-around sticky bottom-0">
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
