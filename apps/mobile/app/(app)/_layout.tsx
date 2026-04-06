import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { IconHome, IconPill, IconUsers, IconGroup } from '../../components/icons';

export default function AppLayout() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return null;
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
        headerShown: false,
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
        name="patients"
        options={{
          title: 'Pacientes',
          tabBarIcon: ({ color, size }) => <IconUsers width={size} height={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="group"
        options={{
          title: 'Grupo',
          tabBarIcon: ({ color, size }) => <IconGroup width={size} height={size} color={color} />,
        }}
      />
      {/* Patient detail — hidden from tab bar */}
      <Tabs.Screen
        name="patient/[id]"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
