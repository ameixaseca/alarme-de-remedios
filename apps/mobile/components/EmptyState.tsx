import { View, Text } from 'react-native';
import { IconCheck } from './icons';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
}

export function EmptyState({ title, description, icon }: EmptyStateProps) {
  return (
    <View className="flex-1 items-center justify-center px-6 py-12">
      <View className="mb-4 w-16 h-16 rounded-full bg-gray-100 items-center justify-center">
        {icon ?? <IconCheck width={32} height={32} color="#9ca3af" />}
      </View>
      <Text className="text-lg font-semibold text-gray-700 text-center">{title}</Text>
      {description && (
        <Text className="mt-2 text-sm text-gray-500 text-center">{description}</Text>
      )}
    </View>
  );
}
