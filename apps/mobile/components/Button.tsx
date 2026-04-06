import { TouchableOpacity, Text, ActivityIndicator, ViewStyle } from 'react-native';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
}

const variantStyles: Record<Variant, string> = {
  primary: 'bg-indigo-600 active:bg-indigo-700',
  secondary: 'bg-white border border-gray-300 active:bg-gray-50',
  danger: 'bg-red-600 active:bg-red-700',
  ghost: 'active:bg-gray-100',
};

const labelStyles: Record<Variant, string> = {
  primary: 'text-white font-semibold',
  secondary: 'text-gray-700 font-semibold',
  danger: 'text-white font-semibold',
  ghost: 'text-gray-600 font-medium',
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  className = '',
}: ButtonProps) {
  return (
    <TouchableOpacity
      className={`rounded-lg px-4 py-3 items-center justify-center flex-row gap-2 ${variantStyles[variant]} ${disabled ? 'opacity-50' : ''} ${className}`}
      onPress={onPress}
      disabled={loading || disabled}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'secondary' || variant === 'ghost' ? '#4f46e5' : 'white'} size="small" />
      ) : (
        <Text className={`text-base ${labelStyles[variant]}`}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}
