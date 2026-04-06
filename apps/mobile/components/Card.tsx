import { View, ViewStyle } from 'react-native';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  className?: string;
}

export function Card({ children, className = '' }: CardProps) {
  return (
    <View
      className={`bg-white rounded-xl border border-gray-100 shadow-sm ${className}`}
      style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 2,
      }}
    >
      {children}
    </View>
  );
}
