import { prisma } from "@/lib/prisma";

export type NotificationType =
  | "LATE_APPLICATION"
  | "LOW_STOCK"
  | "PRESCRIPTION_REMOVED"
  | "OFFLINE_APPLICATION";

const VAPID_SUBJECT = process.env.VAPID_SUBJECT ?? "mailto:admin@dailymed.app";
const DEDUP_WINDOW_MS = 60 * 60 * 1000; // 1 hour

// ── Core create ───────────────────────────────────────────

export async function createNotificationsForUsers(
  userIds: string[],
  type: NotificationType,
  title: string,
  body: string,
  opts: { data?: Record<string, unknown>; dedupKey?: string } = {}
) {
  if (userIds.length === 0) return;

  let toNotify = userIds;

  if (opts.dedupKey) {
    const existing = await prisma.notification.findMany({
      where: {
        dedupKey: opts.dedupKey,
        userId: { in: userIds },
        createdAt: { gte: new Date(Date.now() - DEDUP_WINDOW_MS) },
      },
      select: { userId: true },
    });
    const already = new Set(existing.map((n) => n.userId));
    toNotify = userIds.filter((id) => !already.has(id));
  }

  if (toNotify.length === 0) return;

  await prisma.notification.createMany({
    data: toNotify.map((userId) => ({
      userId,
      type,
      title,
      body,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: (opts.data ?? {}) as any,
      dedupKey: opts.dedupKey ?? null,
    })),
  });

  // Fire push notifications without blocking the caller
  sendPushToUsers(toNotify, { title, body }).catch(() => {});
}

export async function notifyGroupMembers(
  groupId: string,
  type: NotificationType,
  title: string,
  body: string,
  opts: { data?: Record<string, unknown>; dedupKey?: string } = {}
) {
  const members = await prisma.groupMember.findMany({
    where: { groupId },
    select: { userId: true },
  });
  const userIds = members.map((m) => m.userId);
  await createNotificationsForUsers(userIds, type, title, body, opts);
}

// ── Push ──────────────────────────────────────────────────

async function sendPushToUsers(
  userIds: string[],
  payload: { title: string; body: string }
) {
  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId: { in: userIds } },
  });
  if (subscriptions.length === 0) return;

  const webSubs  = subscriptions.filter((s) => s.type === "web"  && s.endpoint && s.p256dh && s.auth);
  const expoSubs = subscriptions.filter((s) => s.type === "expo" && s.expoToken);

  // Send Web Push notifications
  if (webSubs.length > 0) {
    const vapidPublicKey  = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

    if (vapidPublicKey && vapidPrivateKey) {
      // Dynamic import avoids issues with edge runtime
      const webpush = (await import("web-push")).default;
      webpush.setVapidDetails(VAPID_SUBJECT, vapidPublicKey, vapidPrivateKey);

      const pushPayload = JSON.stringify({ title: payload.title, body: payload.body });

      await Promise.allSettled(
        webSubs.map(async (sub) => {
          try {
            await webpush.sendNotification(
              { endpoint: sub.endpoint!, keys: { p256dh: sub.p256dh!, auth: sub.auth! } },
              pushPayload
            );
          } catch (err: any) {
            if (err?.statusCode === 410) {
              await prisma.pushSubscription
                .delete({ where: { endpoint: sub.endpoint! } })
                .catch(() => {});
            }
          }
        })
      );
    }
  }

  // Send Expo Push notifications
  if (expoSubs.length > 0) {
    await sendExpoPushNotifications(expoSubs.map((s) => s.expoToken!), payload);
  }
}

async function sendExpoPushNotifications(
  tokens: string[],
  payload: { title: string; body: string }
) {
  const messages = tokens.map((token) => ({
    to: token,
    sound: "default" as const,
    title: payload.title,
    body: payload.body,
  }));

  try {
    const res = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
      },
      body: JSON.stringify(messages),
    });

    if (!res.ok) return;

    const data = await res.json();
    const results: Array<{ status: string; details?: { error?: string } }> = data?.data ?? [];

    // Remove invalid/unregistered tokens
    await Promise.allSettled(
      results.map(async (result, i) => {
        if (
          result.status === "error" &&
          (result.details?.error === "DeviceNotRegistered" ||
            result.details?.error === "InvalidCredentials")
        ) {
          await prisma.pushSubscription
            .deleteMany({ where: { expoToken: tokens[i] } })
            .catch(() => {});
        }
      })
    );
  } catch {
    // Ignore Expo push errors — non-blocking
  }
}

// ── Read / list ───────────────────────────────────────────

export async function getNotifications(userId: string, limit = 50) {
  const [items, unreadCount] = await prisma.$transaction([
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
    prisma.notification.count({ where: { userId, read: false } }),
  ]);
  return { items, unreadCount };
}

export async function getUnreadCount(userId: string) {
  return prisma.notification.count({ where: { userId, read: false } });
}

export async function markNotificationRead(userId: string, notificationId: string) {
  await prisma.notification.updateMany({
    where: { id: notificationId, userId },
    data:  { read: true },
  });
}

export async function markAllNotificationsRead(userId: string) {
  await prisma.notification.updateMany({
    where: { userId, read: false },
    data:  { read: true },
  });
}

// ── Push subscriptions ────────────────────────────────────

export async function savePushSubscription(
  userId: string,
  sub: { endpoint: string; p256dh: string; auth: string }
) {
  await prisma.pushSubscription.upsert({
    where:  { endpoint: sub.endpoint },
    create: { userId, endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth, type: "web" },
    update: { userId, p256dh: sub.p256dh, auth: sub.auth },
  });
}

export async function saveExpoPushToken(userId: string, token: string) {
  const existing = await prisma.pushSubscription.findFirst({
    where: { userId, expoToken: token },
  });
  if (!existing) {
    await prisma.pushSubscription.create({
      data: { userId, type: "expo", expoToken: token },
    });
  }
}

export async function removePushSubscription(endpoint?: string, expoToken?: string) {
  if (expoToken) {
    await prisma.pushSubscription.deleteMany({ where: { expoToken } });
  } else if (endpoint) {
    await prisma.pushSubscription.deleteMany({ where: { endpoint } });
  }
}
