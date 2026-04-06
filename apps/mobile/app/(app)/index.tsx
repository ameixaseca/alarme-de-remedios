import { View, Text } from 'react-native';

export default function HomeScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-gray-50">
      <Text className="text-xl font-semibold text-gray-800">Medicações Pendentes</Text>
      <Text className="mt-2 text-gray-500">Em breve...</Text>
    </View>
  );
}
