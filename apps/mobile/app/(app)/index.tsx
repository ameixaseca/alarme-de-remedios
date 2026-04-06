import { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
} from 'react-native';
import { usePendingMedications } from '../../hooks/usePendingMedications';
import { MedicationCard } from '../../components/MedicationCard';
import { ApplicationModal } from '../../components/ApplicationModal';
import { EmptyState } from '../../components/EmptyState';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { IconCheck } from '../../components/icons';
import { PendingMedication } from '@dailymed/shared/types';

function formatDate(date: Date): string {
  return date.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

export default function HomeScreen() {
  const { medications, isLoading, error, refresh } = usePendingMedications();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedItem, setSelectedItem] = useState<PendingMedication | null>(null);

  async function onRefresh() {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }

  const pending = medications.filter((m) => m.status !== 'applied');
  const applied = medications.filter((m) => m.status === 'applied');

  if (isLoading && !refreshing) return <LoadingSpinner fullScreen />;

  return (
    <View className="flex-1 bg-gray-50">
      <FlatList
        data={medications}
        keyExtractor={(item) => `${item.prescriptionId}-${item.scheduledAt}`}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListHeaderComponent={() => (
          <View className="px-4 pt-4 pb-3">
            <Text className="text-sm text-gray-500 capitalize">{formatDate(new Date())}</Text>
            <View className="flex-row items-center gap-4 mt-2">
              <View className="flex-row items-center gap-1.5">
                <View className="w-2 h-2 rounded-full bg-red-500" />
                <Text className="text-sm text-gray-600">
                  {pending.filter((m) => m.status === 'overdue').length} atrasados
                </Text>
              </View>
              <View className="flex-row items-center gap-1.5">
                <View className="w-2 h-2 rounded-full bg-yellow-500" />
                <Text className="text-sm text-gray-600">
                  {pending.filter((m) => m.status === 'upcoming').length} próximos
                </Text>
              </View>
              <View className="flex-row items-center gap-1.5">
                <View className="w-2 h-2 rounded-full bg-green-500" />
                <Text className="text-sm text-gray-600">{applied.length} aplicados</Text>
              </View>
            </View>
            {error && (
              <View className="mt-3 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                <Text className="text-sm text-red-600">{error}</Text>
              </View>
            )}
          </View>
        )}
        renderItem={({ item }) => (
          <MedicationCard
            item={item}
            onRegister={(med) => setSelectedItem(med)}
          />
        )}
        ListEmptyComponent={() => (
          <EmptyState
            title="Sem medicações pendentes"
            description="Todas as medicações do dia foram aplicadas ou não há prescrições ativas."
            icon={<IconCheck width={32} height={32} color="#9ca3af" />}
          />
        )}
        contentContainerStyle={{ paddingBottom: 20 }}
      />

      <ApplicationModal
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
        onSuccess={refresh}
      />
    </View>
  );
}
