import { TouchableOpacity, Text, ActivityIndicator, TouchableOpacityProps } from 'react-native';

type ButtonVariant = 'primary' | 'secondary' | 'danger';

interface ButtonProps extends TouchableOpacityProps {
  label: string;
  variant?: ButtonVariant;
  loading?: boolean;
  className?: string;
}

const variantStyles: Record<ButtonVariant, { container: string; text: string }> = {
  primary: { container: 'bg-indigo-600', text: 'text-white' },
  secondary: { container: 'bg-gray-100 border border-gray-300', text: 'text-gray-700' },
  danger: { container: 'bg-red-600', text: 'text-white' },
};

export function Button({
  label,
  variant = 'primary',
  loading = false,
  disabled,
  className = '',
  ...rest
}: ButtonProps) {
  const styles = variantStyles[variant];
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      className={`rounded-lg px-4 py-3 items-center justify-center flex-row gap-2 ${styles.container} ${isDisabled ? 'opacity-60' : ''} ${className}`}
      disabled={isDisabled}
      activeOpacity={0.75}
      {...rest}
    >
      {loading && <ActivityIndicator size="small" color={variant === 'secondary' ? '#374151' : '#ffffff'} />}
      <Text className={`text-base font-semibold ${styles.text}`}>{label}</Text>
    </TouchableOpacity>
  );
}
