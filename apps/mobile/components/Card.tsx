import { View, ViewProps } from 'react-native';

interface CardProps extends ViewProps {
  className?: string;
}

export function Card({ children, className = '', style, ...rest }: CardProps) {
  return (
    <View
      className={`bg-white rounded-xl shadow-sm border border-gray-100 ${className}`}
      style={style}
      {...rest}
    >
      {children}
    </View>
  );
}
