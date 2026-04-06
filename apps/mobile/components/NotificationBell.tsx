import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { IconBell, IconCheck } from './icons';
import { Notification } from '@dailymed/shared/types';
import { apiRequest } from '@dailymed/shared/api-client';
import { useAuth } from '../hooks/useAuth';

export function NotificationBell() {
  const { isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const data = await apiRequest<Notification[]>('/api/v1/notifications');
      setNotifications(data);
      setUnreadCount(data.filter((n) => !n.read).length);
    } catch {
      // ignore
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  async function markRead(id: string) {
    try {
      await apiRequest(`/api/v1/notifications/${id}`, { method: 'PATCH' });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      // ignore
    }
  }

  async function markAllRead() {
    try {
      await apiRequest('/api/v1/notifications', { method: 'PATCH' });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {
      // ignore
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  }

  function formatTime(iso: string) {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 60) return `${diffMin}min atrás`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `${diffH}h atrás`;
    return d.toLocaleDateString('pt-BR');
  }

  return (
    <>
      <TouchableOpacity
        className="relative p-2"
        onPress={() => {
          setModalVisible(true);
          fetchNotifications();
        }}
      >
        <IconBell width={24} height={24} color="#374151" />
        {unreadCount > 0 && (
          <View className="absolute top-1 right-1 min-w-[18px] h-[18px] rounded-full bg-red-500 items-center justify-center px-1">
            <Text className="text-xs text-white font-bold">
              {unreadCount > 99 ? '99+' : unreadCount}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable
          className="flex-1 bg-black/30 justify-end"
          onPress={() => setModalVisible(false)}
        >
          <Pressable className="bg-white rounded-t-2xl" style={{ maxHeight: '80%' }}>
            <View className="items-center pt-3">
              <View className="w-10 h-1 rounded-full bg-gray-300" />
            </View>

            <View className="flex-row items-center justify-between px-4 py-3">
              <Text className="text-lg font-semibold text-gray-800">Notificações</Text>
              {unreadCount > 0 && (
                <TouchableOpacity onPress={markAllRead}>
                  <Text className="text-sm text-indigo-600 font-medium">Marcar todas como lidas</Text>
                </TouchableOpacity>
              )}
            </View>

            <ScrollView
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
              }
            >
              {notifications.length === 0 ? (
                <View className="items-center py-12">
                  <IconBell width={40} height={40} color="#d1d5db" />
                  <Text className="mt-3 text-gray-400">Nenhuma notificação</Text>
                </View>
              ) : (
                notifications.map((n) => (
                  <TouchableOpacity
                    key={n.id}
                    className={`px-4 py-3.5 border-b border-gray-100 ${!n.read ? 'bg-indigo-50' : ''}`}
                    onPress={() => !n.read && markRead(n.id)}
                  >
                    <View className="flex-row items-start justify-between gap-2">
                      <View className="flex-1">
                        <Text className="text-sm font-semibold text-gray-800">{n.title}</Text>
                        <Text className="mt-0.5 text-sm text-gray-600">{n.body}</Text>
                      </View>
                      {!n.read && (
                        <View className="w-2 h-2 rounded-full bg-indigo-500 mt-1.5" />
                      )}
                    </View>
                    <Text className="mt-1 text-xs text-gray-400">{formatTime(n.createdAt)}</Text>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
