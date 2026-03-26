/* ═══════════════════════════════════════════════════════════
   DailyMed Service Worker
   • App-shell cache (install)
   • Network-first for API GETs (with cache fallback)
   • Offline queue for POST /api/v1/applications (IndexedDB)
   • Background Sync + manual SYNC_NOW message to flush queue
   ═══════════════════════════════════════════════════════════ */

const APP_CACHE  = "dailymed-app-v3";
const API_CACHE  = "dailymed-api-v3";
const DB_NAME    = "dailymed-queue";
const DB_VERSION = 1;
const STORE_NAME = "applications";
const SYNC_TAG   = "sync-applications";

const APP_SHELL = [
  "/",
  "/home",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png",
];

// ── Install ───────────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(APP_CACHE)
      .then((cache) => cache.addAll(APP_SHELL).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

// ── Activate ──────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== APP_CACHE && k !== API_CACHE)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

// ── Fetch ─────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (url.origin !== self.location.origin) return;

  // Offline queue: POST /api/v1/applications
  if (request.method === "POST" && url.pathname === "/api/v1/applications") {
    event.respondWith(handleApplicationPost(request));
    return;
  }

  // Network-first for all other API GETs
  if (request.method === "GET" && url.pathname.startsWith("/api/")) {
    event.respondWith(networkFirstAPI(request));
    return;
  }

  // Cache-first for static assets / navigation
  if (request.method === "GET") {
    event.respondWith(cacheFirstAsset(request));
    return;
  }
});

async function handleApplicationPost(request) {
  // Read body + auth before touching the network so we can queue if needed
  const body = await request.json();
  const auth = request.headers.get("Authorization");

  try {
    const response = await fetch("/api/v1/applications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(auth ? { Authorization: auth } : {}),
      },
      body: JSON.stringify(body),
    });
    return response;
  } catch {
    // Network unavailable — persist to IndexedDB
    await enqueue({ payload: body, auth });
    await notifyQueueChange();
    return new Response(JSON.stringify({ queued: true }), {
      status: 202,
      headers: { "Content-Type": "application/json" },
    });
  }
}

async function networkFirstAPI(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(API_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response(JSON.stringify({ error: "Offline" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }
}

async function cacheFirstAsset(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(APP_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Return cached root for navigation failures (SPA fallback)
    if (request.mode === "navigate") {
      const root = await caches.match("/");
      if (root) return root;
    }
    return new Response("Offline", { status: 503 });
  }
}

// ── IndexedDB helpers ─────────────────────────────────────
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME, { keyPath: "id", autoIncrement: true });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror  = () => reject(req.error);
  });
}

async function enqueue(item) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).add({ ...item, queuedAt: Date.now() });
    tx.oncomplete = () => resolve();
    tx.onerror    = () => reject(tx.error);
  });
}

async function getAllQueued() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

async function dequeue(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror    = () => reject(tx.error);
  });
}

async function countQueued() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).count();
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

// ── Queue flusher ─────────────────────────────────────────
async function flushQueue() {
  const items = await getAllQueued();
  let synced = 0;

  for (const item of items) {
    try {
      await fetch("/api/v1/applications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(item.auth ? { Authorization: item.auth } : {}),
        },
        body: JSON.stringify(item.payload),
      });
      // Any HTTP response (including 4xx) means network worked — dequeue
      await dequeue(item.id);
      synced++;
    } catch {
      // Network still down — stop processing
      break;
    }
  }

  if (synced > 0) {
    await notifyClients({ type: "SYNC_DONE", synced });
  }
  await notifyQueueChange();
}

async function notifyQueueChange() {
  const count = await countQueued();
  await notifyClients({ type: "QUEUE_CHANGED", count });
}

async function notifyClients(message) {
  const all = await self.clients.matchAll({ includeUncontrolled: true, type: "window" });
  all.forEach((c) => c.postMessage(message));
}

// ── Background Sync ───────────────────────────────────────
self.addEventListener("sync", (event) => {
  if (event.tag === SYNC_TAG) {
    event.waitUntil(flushQueue());
  }
});

// ── Message handler ───────────────────────────────────────
self.addEventListener("message", async (event) => {
  if (event.data?.type === "SYNC_NOW") {
    await flushQueue();
  }
  if (event.data?.type === "GET_QUEUE_COUNT") {
    await notifyQueueChange();
  }
});
