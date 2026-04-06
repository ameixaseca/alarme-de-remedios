import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GroupProvider } from '../contexts/GroupContext';
import '../global.css';

export default function RootLayout() {
  return (
    <GroupProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(app)" options={{ headerShown: false }} />
      </Stack>
    </GroupProvider>
  );
}
