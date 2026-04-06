import { View, ActivityIndicator } from 'react-native';

interface LoadingSpinnerProps {
  fullScreen?: boolean;
  color?: string;
}

export function LoadingSpinner({ fullScreen = false, color = '#4f46e5' }: LoadingSpinnerProps) {
  if (fullScreen) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color={color} />
      </View>
    );
  }

  return <ActivityIndicator size="small" color={color} />;
}
