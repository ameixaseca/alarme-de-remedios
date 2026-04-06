"use client";
import { useEffect } from "react";
import { api } from "@/lib/client/api";

const SYNC_TAG = "sync-applications";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

async function registerPushSubscription(reg: ServiceWorkerRegistration) {
  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidKey) return;

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return;

    const existing = await reg.pushManager.getSubscription();
    const sub = existing ?? await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    });

    await api.post("/notifications/push-subscription", {
      endpoint: sub.endpoint,
      p256dh:   btoa(String.fromCharCode(...new Uint8Array(sub.getKey("p256dh")!))),
      auth:     btoa(String.fromCharCode(...new Uint8Array(sub.getKey("auth")!))),
    });
  } catch {
    // Push not supported or user denied — silently ignore
  }
}

/**
 * Call this after the user is authenticated to ensure the push subscription
 * is saved to the server. Safe to call multiple times (server uses upsert).
 */
export async function ensurePushSubscription() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    await registerPushSubscription(reg);
  } catch {
    // silently ignore
  }
}

export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js").then((reg) => {
      navigator.serviceWorker.ready.then((activeReg) => {
        activeReg.active?.postMessage({ type: "GET_QUEUE_COUNT" });
      });
      return reg;
    }).catch(console.error);

    // Relay SW messages as window CustomEvents so any component can listen
    const handleMessage = (event: MessageEvent) => {
      const { type, count, synced } = event.data ?? {};
      if (type === "QUEUE_CHANGED") {
        window.dispatchEvent(new CustomEvent("sw-queue-changed", { detail: { count } }));
      }
      if (type === "SYNC_DONE") {
        window.dispatchEvent(new CustomEvent("sw-sync-done", { detail: { synced } }));
      }
    };

    navigator.serviceWorker.addEventListener("message", handleMessage);

    // When connectivity is restored, trigger a background sync
    const handleOnline = () => {
      navigator.serviceWorker.ready.then((reg) => {
        if ("sync" in reg) {
          (reg as ServiceWorkerRegistration & { sync: { register: (tag: string) => Promise<void> } })
            .sync.register(SYNC_TAG)
            .catch(() => reg.active?.postMessage({ type: "SYNC_NOW" }));
        } else {
          reg.active?.postMessage({ type: "SYNC_NOW" });
        }
      });
    };

    window.addEventListener("online", handleOnline);

    return () => {
      navigator.serviceWorker.removeEventListener("message", handleMessage);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  return null;
}
