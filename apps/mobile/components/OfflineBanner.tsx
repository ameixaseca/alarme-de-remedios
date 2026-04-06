import { View, Text } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { useState, useEffect } from 'react';
import { IconAlertTriangle } from './icons';

interface OfflineBannerProps {
  queueCount?: number;
}

export function OfflineBanner({ queueCount = 0 }: OfflineBannerProps) {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOffline(!state.isConnected);
    });
    return unsubscribe;
  }, []);

  if (!isOffline) return null;

  return (
    <View className="bg-yellow-50 border-b border-yellow-200 px-4 py-2 flex-row items-center gap-2">
      <IconAlertTriangle width={16} height={16} color="#ca8a04" />
      <Text className="text-sm text-yellow-800 flex-1">
        Sem conexão{queueCount > 0 ? ` · ${queueCount} aplicação(ões) na fila` : ''}
      </Text>
    </View>
  );
}
