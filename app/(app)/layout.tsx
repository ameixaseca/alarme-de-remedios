"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  IconHome, IconPackage, IconUsers, IconPill,
  IconGroup, IconClipboard, IconLogOut, IconChevronDown, IconBell,
} from "@/app/components/icons";
import { GroupProvider, useGroupContext, type Group } from "@/app/contexts/group-context";
import { api } from "@/lib/client/api";
import { ensurePushSubscription } from "@/app/sw-register";

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
          className={`flex items-center gap-1 min-w-0 ${hasMany ? "cursor-pointer" : "cursor-default"}`}
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

/* ─── Notification bell ─────────────────────────────────── */
interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}

function NotificationBell({ align = "right" }: { align?: "right" | "left" }) {
  const [open, setOpen]               = useState(false);
  const [items, setItems]             = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading]         = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<{ items: NotificationItem[]; unreadCount: number }>(
        "/notifications"
      );
      setItems(data.items);
      setUnreadCount(data.unreadCount);
    } catch {
      // silently ignore
    } finally {
      setLoading(false);
    }
  }, []);

  // Poll unread count every 60 s
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60_000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  async function handleOpen() {
    setOpen((o) => !o);
    if (!open) await fetchNotifications();
  }

  async function markAllRead() {
    await api.patch("/notifications", {});
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  }

  async function markRead(id: string) {
    await api.patch(`/notifications/${id}`, {});
    setItems((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
    setUnreadCount((c) => Math.max(0, c - 1));
  }

  const badgeLabel = unreadCount > 9 ? "9+" : String(unreadCount);

  const typeIcon: Record<string, string> = {
    LATE_APPLICATION:     "⏰",
    LOW_STOCK:            "📦",
    PRESCRIPTION_REMOVED: "🗑",
    OFFLINE_APPLICATION:  "📶",
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={handleOpen}
        className="relative p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
        aria-label="Notificações"
      >
        <IconBell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5 leading-none">
            {badgeLabel}
          </span>
        )}
      </button>

      {open && (
        <div className={`absolute w-80 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden ${
          align === "right" ? "right-0 top-full mt-2" : "left-0 bottom-full mb-2"
        }`}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900 text-sm">Notificações</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
              >
                Marcar todas como lidas
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto divide-y divide-gray-50">
            {loading && items.length === 0 && (
              <div className="py-8 text-center text-sm text-gray-400">Carregando…</div>
            )}
            {!loading && items.length === 0 && (
              <div className="py-10 text-center">
                <IconBell className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400">Nenhuma notificação</p>
              </div>
            )}
            {items.map((n) => (
              <button
                key={n.id}
                onClick={() => !n.read && markRead(n.id)}
                className={`w-full text-left flex gap-3 px-4 py-3 transition-colors hover:bg-gray-50 ${
                  n.read ? "opacity-60" : "bg-indigo-50/40"
                }`}
              >
                <span className="text-lg shrink-0 mt-0.5">{typeIcon[n.type] ?? "🔔"}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-800 truncate">{n.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.body}</p>
                  <p className="text-[10px] text-gray-400 mt-1">
                    {new Date(n.createdAt).toLocaleString("pt-BR", {
                      day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
                    })}
                  </p>
                </div>
                {!n.read && (
                  <span className="w-2 h-2 bg-indigo-500 rounded-full shrink-0 mt-1.5" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Inner layout (uses context) ───────────────────────── */
function AppLayoutInner({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const isLanding    = pathname === "/";
  const isFullScreen = pathname === "/" || pathname === "/onboarding";
  const [openMobileGroup, setOpenMobileGroup] = useState<string | null>(null);

  // Close sub-menu whenever the route changes
  useEffect(() => { setOpenMobileGroup(null); }, [pathname]);

  useEffect(() => {
    if (isLanding) return;
    const token = localStorage.getItem("access_token");
    if (!token) { router.replace("/login"); return; }
    ensurePushSubscription();
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
        {/* Logo + Group switcher */}
        <div className="flex items-center gap-3 px-4 h-16 border-b border-gray-200 shrink-0">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shrink-0">
            <IconPill className="w-4.5 h-4.5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-gray-900 text-sm tracking-tight leading-none mb-1">DailyMed</p>
            <GroupSwitcher compact />
          </div>
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

        {/* Notifications + Logout */}
        <div className="px-3 pb-5 shrink-0 space-y-1">
          <div className="flex items-center gap-3 px-3 py-2.5">
            <NotificationBell align="left" />
            <span className="text-sm font-medium text-gray-600">Notificações</span>
          </div>
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
        <div className="flex items-center gap-1">
          <NotificationBell />
          <button
            onClick={handleLogout}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Sair"
          >
            <IconLogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* ── Main content ────────────────────────────────────── */}
      <main className="lg:ml-60 pt-14 lg:pt-0 pb-20 lg:pb-0">
        <OfflineBanner />
        <div className="max-w-3xl mx-auto px-4 py-6 lg:px-8 lg:py-8 lg:max-w-4xl">
          {children}
        </div>
      </main>

      {/* ── Mobile bottom navigation ────────────────────────── */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40">
        {/* Sub-menu sheet */}
        {openMobileGroup && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setOpenMobileGroup(null)} />
            <div className="absolute bottom-full inset-x-0 bg-white border-t border-gray-200 shadow-lg z-40">
              {(mobileNavItems.find((i) => "children" in i && i.key === openMobileGroup) as MobileNavGroup | undefined)
                ?.children.map(({ href, label, Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    className={`flex items-center gap-3 px-5 py-3.5 text-sm font-medium transition-colors ${
                      pathname === href ? "text-indigo-600 bg-indigo-50" : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <Icon className="w-5 h-5 shrink-0" />
                    {label}
                  </Link>
                ))}
            </div>
          </>
        )}

        <div className="flex bg-white border-t border-gray-200 pb-safe">
          {mobileNavItems.map((item) => {
            if ("href" in item) {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  className={`flex-1 flex flex-col items-center gap-0.5 pt-2 pb-2.5 transition-colors ${
                    active ? "text-indigo-600" : "text-gray-400 hover:text-gray-600"
                  }`}
                >
                  <item.Icon className="w-5 h-5" />
                  <span className="text-[10px] font-medium leading-tight">{item.label}</span>
                </Link>
              );
            }
            const isChildActive = item.children.some((c) => pathname === c.href);
            const isOpen = openMobileGroup === item.key;
            return (
              <button
                key={item.key}
                onClick={() => setOpenMobileGroup(isOpen ? null : item.key)}
                className={`flex-1 flex flex-col items-center gap-0.5 pt-2 pb-2.5 transition-colors ${
                  isChildActive || isOpen ? "text-indigo-600" : "text-gray-400 hover:text-gray-600"
                }`}
              >
                <item.Icon className="w-5 h-5" />
                <span className="text-[10px] font-medium leading-tight">{item.label}</span>
              </button>
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
