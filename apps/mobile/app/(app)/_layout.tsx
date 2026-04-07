import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router';
import { View } from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { usePushNotifications } from '../../hooks/usePushNotifications';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { GroupSwitcher } from '../../components/GroupSwitcher';
import { NotificationBell } from '../../components/NotificationBell';
import { OfflineBanner } from '../../components/OfflineBanner';
import { IconHome, IconPill, IconUsers, IconGroup, IconClipboard, IconPackage } from '../../components/icons';

function AppHeader() {
  return (
    <View className="bg-white border-b border-gray-200">
      <OfflineBanner />
      <View className="flex-row items-center justify-between px-4 py-2 pt-12">
        <GroupSwitcher />
        <NotificationBell />
      </View>
    </View>
  );
}

export default function AppLayout() {
  const { isAuthenticated, isLoading } = useAuth();
  usePushNotifications();

  if (isLoading) return <LoadingSpinner fullScreen />;
  if (!isAuthenticated) return <Redirect href="/(auth)/login" />;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#4f46e5',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: {
          borderTopColor: '#e5e7eb',
          backgroundColor: '#ffffff',
        },
        header: () => <AppHeader />,
        headerShown: true,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Início',
          tabBarIcon: ({ color, size }) => <IconHome width={size} height={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="medications"
        options={{
          title: 'Remédios',
          tabBarIcon: ({ color, size }) => <IconPill width={size} height={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Estoque',
          tabBarIcon: ({ color, size }) => <IconPackage width={size} height={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="patients"
        options={{
          title: 'Pacientes',
          tabBarIcon: ({ color, size }) => <IconUsers width={size} height={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="log"
        options={{
          title: 'Log',
          tabBarIcon: ({ color, size }) => <IconClipboard width={size} height={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="group"
        options={{
          title: 'Grupo',
          tabBarIcon: ({ color, size }) => <IconGroup width={size} height={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
