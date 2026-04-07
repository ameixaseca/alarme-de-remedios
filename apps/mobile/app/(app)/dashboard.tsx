import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, RefreshControl } from 'react-native';
import { useGroup } from '../../contexts/GroupContext';
import { apiRequest } from '@dailymed/shared/api-client';
import { Card } from '../../components/Card';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { EmptyState } from '../../components/EmptyState';
import { IconAlertTriangle, IconPill, IconCheck } from '../../components/icons';
import { StockItem } from '@dailymed/shared/types';

export default function DashboardScreen() {
  const { activeGroup } = useGroup();
  const [items, setItems] = useState<StockItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetch = useCallback(async () => {
    if (!activeGroup) { setIsLoading(false); return; }
    try {
      const data = await apiRequest<StockItem[]>(`/api/v1/dashboard/stock?group_id=${activeGroup.id}`);
      setItems(data);
    } catch { /* ignore */ }
    finally { setIsLoading(false); }
  }, [activeGroup]);

  useEffect(() => { fetch(); }, [fetch]);
  async function onRefresh() { setRefreshing(true); await fetch(); setRefreshing(false); }

  const alerts = items.filter((i) => i.isLowStock);
  const ok = items.filter((i) => !i.isLowStock);

  if (isLoading) return <LoadingSpinner fullScreen />;

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View className="px-4 pt-4 pb-2">
        <Text className="text-xl font-bold text-gray-800">Estoque</Text>
      </View>

      {alerts.length > 0 && (
        <View className="mx-4 mb-4">
          <View className="flex-row items-center gap-2 mb-2">
            <IconAlertTriangle width={16} height={16} color="#dc2626" />
            <Text className="text-sm font-semibold text-red-700">Estoque baixo ({alerts.length})</Text>
          </View>
          {alerts.map((item) => (
            <Card key={item.medicationId} className="mb-2 px-4 py-3" style={{ borderLeftWidth: 3, borderLeftColor: '#ef4444' }}>
              <Text className="text-base font-semibold text-gray-800">{item.medicationName}</Text>
              <View className="flex-row items-center justify-between mt-1">
                <Text className="text-sm text-gray-500">
                  Restante: <Text className="font-medium text-red-600">{item.stockQuantity ?? '—'}</Text>
                </Text>
                {item.daysRemaining != null && (
                  <Text className="text-sm text-red-600 font-medium">~{item.daysRemaining} dias</Text>
                )}
              </View>
              {item.dailyConsumption != null && (
                <Text className="text-xs text-gray-400 mt-0.5">
                  Consumo: {item.dailyConsumption.toFixed(1)}/dia
                </Text>
              )}
            </Card>
          ))}
        </View>
      )}

      {ok.length > 0 && (
        <View className="mx-4">
          <View className="flex-row items-center gap-2 mb-2">
            <IconCheck width={16} height={16} color="#16a34a" />
            <Text className="text-sm font-semibold text-gray-600">Em estoque ({ok.length})</Text>
          </View>
          {ok.map((item) => (
            <Card key={item.medicationId} className="mb-2 px-4 py-3">
              <Text className="text-base font-semibold text-gray-800">{item.medicationName}</Text>
              <View className="flex-row items-center justify-between mt-1">
                <Text className="text-sm text-gray-500">
                  Restante: <Text className="font-medium text-gray-700">{item.stockQuantity ?? '—'}</Text>
                </Text>
                {item.daysRemaining != null && (
                  <Text className="text-sm text-green-700">~{item.daysRemaining} dias</Text>
                )}
              </View>
            </Card>
          ))}
        </View>
      )}

      {items.length === 0 && (
        <EmptyState
          title="Nenhum medicamento com estoque"
          description="Adicione estoque aos medicamentos para ver as projeções."
          icon={<IconPill width={32} height={32} color="#9ca3af" />}
        />
      )}
      <View className="h-8" />
    </ScrollView>
  );
}
