import { View, Text } from 'react-native';

type BadgeVariant = 'applied' | 'upcoming' | 'overdue' | 'default';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
}

const variantStyles: Record<BadgeVariant, { container: string; text: string }> = {
  applied: { container: 'bg-green-100', text: 'text-green-700' },
  upcoming: { container: 'bg-yellow-100', text: 'text-yellow-700' },
  overdue: { container: 'bg-red-100', text: 'text-red-700' },
  default: { container: 'bg-gray-100', text: 'text-gray-600' },
};

export function Badge({ label, variant = 'default' }: BadgeProps) {
  const styles = variantStyles[variant];
  return (
    <View className={`rounded-full px-2.5 py-1 ${styles.container}`}>
      <Text className={`text-xs font-medium ${styles.text}`}>{label}</Text>
    </View>
  );
}
