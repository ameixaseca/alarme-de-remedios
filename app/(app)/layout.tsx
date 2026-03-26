"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  IconHome, IconPackage, IconUsers, IconPill,
  IconGroup, IconClipboard, IconLogOut,
} from "@/app/components/icons";

/* ─── Offline banner ────────────────────────────────────── */
function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(true);
  const [queueCount, setQueueCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    setIsOnline(navigator.onLine);

    const onOnline  = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    const onQueue   = (e: Event) => {
      setQueueCount((e as CustomEvent<{ count: number }>).detail.count);
    };
    const onSynced  = () => setSyncing(false);

    window.addEventListener("online",           onOnline);
    window.addEventListener("offline",          onOffline);
    window.addEventListener("sw-queue-changed", onQueue);
    window.addEventListener("sw-sync-done",     onSynced);

    return () => {
      window.removeEventListener("online",           onOnline);
      window.removeEventListener("offline",          onOffline);
      window.removeEventListener("sw-queue-changed", onQueue);
      window.removeEventListener("sw-sync-done",     onSynced);
    };
  }, []);

  function triggerSync() {
    setSyncing(true);
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.ready.then((reg) => {
      if ("sync" in reg) {
        (reg as ServiceWorkerRegistration & { sync: { register: (t: string) => Promise<void> } })
          .sync.register("sync-applications")
          .catch(() => reg.active?.postMessage({ type: "SYNC_NOW" }));
      } else {
        reg.active?.postMessage({ type: "SYNC_NOW" });
      }
    });
  }

  if (isOnline && queueCount === 0) return null;

  if (!isOnline) {
    return (
      <div className="bg-amber-500 text-white text-xs font-medium px-4 py-2 flex items-center justify-between gap-2">
        <span>Sem conexão — exibindo dados do cache</span>
        {queueCount > 0 && (
          <span className="bg-amber-700/60 px-2 py-0.5 rounded-full whitespace-nowrap">
            {queueCount} aplicaç{queueCount !== 1 ? "ões" : "ão"} na fila
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="bg-indigo-600 text-white text-xs font-medium px-4 py-2 flex items-center justify-between gap-2">
      <span>
        {queueCount} aplicaç{queueCount !== 1 ? "ões" : "ão"} offline aguardando sincronização
      </span>
      <button
        onClick={triggerSync}
        disabled={syncing}
        className="bg-white text-indigo-700 px-3 py-1 rounded-full font-semibold disabled:opacity-60 whitespace-nowrap"
      >
        {syncing ? "Sincronizando…" : "Sincronizar agora"}
      </button>
    </div>
  );
}

const navItems = [
  { href: "/home",        label: "Início",     Icon: IconHome },
  { href: "/dashboard",   label: "Estoque",    Icon: IconPackage },
  { href: "/patients",    label: "Pacientes",  Icon: IconUsers },
  { href: "/medications", label: "Remédios",   Icon: IconPill },
  { href: "/group",       label: "Grupo",      Icon: IconGroup },
  { href: "/log",         label: "Log",        Icon: IconClipboard },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const isLanding = pathname === "/";
  const isFullScreen = pathname === "/" || pathname === "/onboarding";

  useEffect(() => {
    if (isLanding) return;
    const token = localStorage.getItem("access_token");
    if (!token) router.replace("/login");
  }, [router, isLanding]);

  function handleLogout() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    router.replace("/login");
  }

  if (isFullScreen) return <>{children}</>;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Desktop sidebar ─────────────────────────────────── */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 z-40 w-60 flex-col bg-white border-r border-gray-200">
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-5 h-16 border-b border-gray-200 shrink-0">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shrink-0">
            <IconPill className="w-4.5 h-4.5 text-white" />
          </div>
          <span className="font-bold text-gray-900 text-base tracking-tight">DailyMed</span>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map(({ href, label, Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                }`}
              >
                <Icon className={`w-5 h-5 shrink-0 ${active ? "text-indigo-600" : "text-gray-400"}`} />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="px-3 pb-5 shrink-0">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <IconLogOut className="w-5 h-5 shrink-0 text-gray-400" />
            Sair da conta
          </button>
        </div>
      </aside>

      {/* ── Mobile top header ───────────────────────────────── */}
      <header className="lg:hidden fixed top-0 inset-x-0 z-40 h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-indigo-600 rounded-md flex items-center justify-center">
            <IconPill className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-gray-900">DailyMed</span>
        </div>
        <button
          onClick={handleLogout}
          className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          aria-label="Sair"
        >
          <IconLogOut className="w-5 h-5" />
        </button>
      </header>

      {/* ── Main content ────────────────────────────────────── */}
      {/*
        Mobile:  pt-14 (header height) + pb-20 (bottom nav height)
        Desktop: ml-60 (sidebar width), no extra padding
      */}
      <main className="lg:ml-60 pt-14 lg:pt-0 pb-20 lg:pb-0">
        <OfflineBanner />
        <div className="max-w-3xl mx-auto px-4 py-6 lg:px-8 lg:py-8 lg:max-w-4xl">
          {children}
        </div>
      </main>

      {/* ── Mobile bottom navigation ────────────────────────── */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-gray-200 pb-safe">
        <div className="flex">
          {navItems.map(({ href, label, Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex-1 flex flex-col items-center gap-0.5 pt-2 pb-2.5 transition-colors ${
                  active ? "text-indigo-600" : "text-gray-400 hover:text-gray-600"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-medium leading-tight">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
