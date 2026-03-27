"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  IconHome, IconPackage, IconUsers, IconPill,
  IconGroup, IconClipboard, IconLogOut, IconChevronDown,
} from "@/app/components/icons";
import { GroupProvider, useGroupContext, type Group } from "@/app/contexts/group-context";

const navItems = [
  { href: "/home",        label: "Início",     Icon: IconHome },
  { href: "/dashboard",   label: "Estoque",    Icon: IconPackage },
  { href: "/patients",    label: "Pacientes",  Icon: IconUsers },
  { href: "/medications", label: "Remédios",   Icon: IconPill },
  { href: "/group",       label: "Grupo",      Icon: IconGroup },
  { href: "/log",         label: "Log",        Icon: IconClipboard },
];

type MobileNavChild = { href: string; label: string; Icon: React.FC<{ className?: string }> };
type MobileNavLink  = { key: string; label: string; Icon: React.FC<{ className?: string }>; href: string };
type MobileNavGroup = { key: string; label: string; Icon: React.FC<{ className?: string }>; children: MobileNavChild[] };
type MobileNavItem  = MobileNavLink | MobileNavGroup;

const mobileNavItems: MobileNavItem[] = [
  { key: "inicio",        label: "Início",       Icon: IconHome,      href: "/home" },
  { key: "pessoas",       label: "Pessoas",      Icon: IconUsers,     children: [
      { href: "/patients", label: "Pacientes", Icon: IconUsers },
      { href: "/group",    label: "Grupo",     Icon: IconGroup },
  ]},
  { key: "medicamentos",  label: "Medicamentos", Icon: IconPill,      children: [
      { href: "/medications", label: "Remédios", Icon: IconPill },
      { href: "/dashboard",   label: "Estoque",  Icon: IconPackage },
      { href: "/log",         label: "Log",      Icon: IconClipboard },
  ]},
];

/* ─── Group switcher ────────────────────────────────────── */
function GroupSwitcher({ compact }: { compact?: boolean }) {
  const { groups, activeGroup, setActiveGroup } = useGroupContext();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  if (!activeGroup) return null;

  const hasMany = groups.length > 1;

  function GroupInitial({ name }: { name: string }) {
    return (
      <span className="w-6 h-6 rounded-md bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center shrink-0">
        {name.charAt(0).toUpperCase()}
      </span>
    );
  }

  if (compact) {
    // Mobile header version — tighter
    return (
      <div ref={ref} className="relative">
        <button
          onClick={() => hasMany && setOpen((o) => !o)}
          className={`flex items-center gap-1.5 max-w-[130px] ${hasMany ? "cursor-pointer" : "cursor-default"}`}
        >
          <GroupInitial name={activeGroup.name} />
          <span className="text-xs font-semibold text-gray-700 truncate">{activeGroup.name}</span>
          {hasMany && <IconChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0" />}
        </button>
        {open && (
          <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-50">
            {groups.map((g) => (
              <button
                key={g.id}
                onClick={() => { setActiveGroup(g); setOpen(false); }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors ${
                  g.id === activeGroup.id ? "bg-indigo-50 text-indigo-700 font-medium" : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                <GroupInitial name={g.name} />
                <span className="truncate">{g.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Desktop sidebar version
  return (
    <div ref={ref} className="relative px-3 pb-3">
      <button
        onClick={() => hasMany && setOpen((o) => !o)}
        className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-left transition-colors ${
          hasMany ? "hover:bg-gray-100 cursor-pointer" : "cursor-default"
        }`}
      >
        <GroupInitial name={activeGroup.name} />
        <span className="flex-1 text-sm font-medium text-gray-800 truncate">{activeGroup.name}</span>
        {hasMany && <IconChevronDown className="w-4 h-4 text-gray-400 shrink-0" />}
      </button>
      {open && (
        <div className="absolute top-full left-3 right-3 mt-1 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-50">
          {groups.map((g) => (
            <button
              key={g.id}
              onClick={() => { setActiveGroup(g); setOpen(false); }}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-left transition-colors ${
                g.id === activeGroup.id ? "bg-indigo-50 text-indigo-700 font-medium" : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              <GroupInitial name={g.name} />
              <span className="truncate">{g.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

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

/* ─── Inner layout (uses context) ───────────────────────── */
function AppLayoutInner({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const isLanding   = pathname === "/";
  const isFullScreen = pathname === "/" || pathname === "/onboarding";

  useEffect(() => {
    if (isLanding) return;
    const token = localStorage.getItem("access_token");
    if (!token) router.replace("/login");
  }, [router, isLanding]);

  function handleLogout() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("activeGroupId");
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

        {/* Group switcher */}
        <div className="pt-3">
          <p className="px-5 text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Grupo ativo</p>
          <GroupSwitcher />
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
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
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-indigo-600 rounded-md flex items-center justify-center shrink-0">
            <IconPill className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-gray-900 text-sm">DailyMed</span>
          <span className="text-gray-300">|</span>
          <GroupSwitcher compact />
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

/* ─── Root export ───────────────────────────────────────── */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <GroupProvider>
      <AppLayoutInner>{children}</AppLayoutInner>
    </GroupProvider>
  );
}
