import { View, Text, ReactNode } from 'react-native';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
}

export function EmptyState({ title, description, icon }: EmptyStateProps) {
  return (
    <View className="flex-1 items-center justify-center px-8 py-16">
      {icon && <View className="mb-4 opacity-60">{icon}</View>}
      <Text className="text-base font-semibold text-gray-700 text-center">{title}</Text>
      {description && (
        <Text className="mt-1.5 text-sm text-gray-500 text-center">{description}</Text>
      )}
    </View>
  );
}
