import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { className?: string };

const base = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.75, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

export function IconHome(p: IconProps) {
  return <svg {...base} {...p}><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>;
}

export function IconPackage(p: IconProps) {
  return <svg {...base} {...p}><path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>;
}

export function IconUsers(p: IconProps) {
  return <svg {...base} {...p}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" /></svg>;
}

export function IconPill(p: IconProps) {
  return <svg {...base} {...p}><path d="M10.5 20.5L3.5 13.5a4.95 4.95 0 117-7l7 7a4.95 4.95 0 11-7 7z" /><line x1="8.5" y1="8.5" x2="15.5" y2="15.5" /></svg>;
}

export function IconGroup(p: IconProps) {
  return <svg {...base} {...p}><path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>;
}

export function IconClipboard(p: IconProps) {
  return <svg {...base} {...p}><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>;
}

export function IconLogOut(p: IconProps) {
  return <svg {...base} {...p}><path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>;
}

export function IconChevronRight(p: IconProps) {
  return <svg {...base} strokeWidth={2} {...p}><path d="M9 18l6-6-6-6" /></svg>;
}

export function IconChevronLeft(p: IconProps) {
  return <svg {...base} strokeWidth={2} {...p}><path d="M15 18l-6-6 6-6" /></svg>;
}

export function IconPaw({ className, ...p }: IconProps) {
  return <svg className={className} viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M4.5 10.5c.828 0 1.5-1.343 1.5-3s-.672-3-1.5-3S3 5.843 3 7.5s.672 3 1.5 3zm5.5-1c0-1.657.672-3 1.5-3S13 7.843 13 9.5 12.328 12.5 11.5 12.5 10 11.157 10 9.5zm5-.5c.828 0 1.5-1.343 1.5-3s-.672-3-1.5-3S13 4.843 13 6.5s.672 3 1.5 3zm5 1c.828 0 1.5-1.343 1.5-3s-.672-3-1.5-3S19 5.843 19 7.5s.672 3 1.5 3zM17.34 13.77c-.28-.6-1.27-1.9-2.34-2.27h-4c-1.07.37-2.06 1.67-2.34 2.27-.3.64-.59 2.27-.59 2.27.03 1.77 1.43 3.2 3.18 3.2h3.5c1.75 0 3.15-1.43 3.18-3.2 0 0-.29-1.63-.59-2.27z" /></svg>;
}

export function IconPerson(p: IconProps) {
  return <svg {...base} {...p}><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>;
}

export function IconAlertTriangle(p: IconProps) {
  return <svg {...base} {...p}><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>;
}

export function IconCheck(p: IconProps) {
  return <svg {...base} strokeWidth={2} {...p}><polyline points="20 6 9 17 4 12" /></svg>;
}

export function IconCopy(p: IconProps) {
  return <svg {...base} {...p}><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></svg>;
}

export function IconRefresh(p: IconProps) {
  return <svg {...base} {...p}><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" /></svg>;
}

export function IconTrash(p: IconProps) {
  return <svg {...base} {...p}><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2" /></svg>;
}

export function IconPlus(p: IconProps) {
  return <svg {...base} strokeWidth={2} {...p}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>;
}

export function IconX(p: IconProps) {
  return <svg {...base} strokeWidth={2} {...p}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>;
}

export function IconClock(p: IconProps) {
  return <svg {...base} {...p}><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>;
}

export function IconArchive(p: IconProps) {
  return <svg {...base} {...p}><polyline points="21 8 21 21 3 21 3 8" /><rect x="1" y="3" width="22" height="5" /><line x1="10" y1="12" x2="14" y2="12" /></svg>;
}

export function IconCamera(p: IconProps) {
  return <svg {...base} {...p}><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" /><circle cx="12" cy="13" r="4" /></svg>;
}
