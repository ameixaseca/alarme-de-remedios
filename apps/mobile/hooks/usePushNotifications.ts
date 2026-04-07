import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { apiRequest } from '@dailymed/shared/api-client';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export function usePushNotifications() {
  const notificationListener = useRef<Notifications.EventSubscription>();
  const responseListener = useRef<Notifications.EventSubscription>();

  useEffect(() => {
    registerForPushNotifications();

    notificationListener.current = Notifications.addNotificationReceivedListener(() => {
      // Notification received in foreground — handled by notification handler above
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      // User tapped notification — navigate to home
      const data = response.notification.request.content.data as Record<string, unknown>;
      if (data?.screen === 'home') {
        router.replace('/(app)');
      }
    });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);
}

async function registerForPushNotifications() {
  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return;

  const tokenData = await Notifications.getExpoPushTokenAsync().catch(() => null);
  if (!tokenData) return;

  try {
    await apiRequest('/api/v1/notifications/push-subscription', {
      method: 'POST',
      body: JSON.stringify({ type: 'expo', token: tokenData.data }),
    });
  } catch { /* ignore — not critical */ }
}
