import { View, ActivityIndicator } from 'react-native';

interface LoadingSpinnerProps {
  fullScreen?: boolean;
  size?: 'small' | 'large';
  color?: string;
}

export function LoadingSpinner({
  fullScreen = false,
  size = 'large',
  color = '#4f46e5',
}: LoadingSpinnerProps) {
  if (fullScreen) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size={size} color={color} />
      </View>
    );
  }
  return <ActivityIndicator size={size} color={color} />;
}
