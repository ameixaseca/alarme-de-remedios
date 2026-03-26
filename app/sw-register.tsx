"use client";
import { useEffect } from "react";

const SYNC_TAG = "sync-applications";

export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js").catch(console.error);

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

    // Ask SW for current queue count so the banner can initialise correctly
    navigator.serviceWorker.ready.then((reg) => {
      reg.active?.postMessage({ type: "GET_QUEUE_COUNT" });
    });

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
