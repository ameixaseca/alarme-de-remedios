import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  RefreshControl, Modal, Pressable, ScrollView,
} from 'react-native';
import { useGroup } from '../../contexts/GroupContext';
import { apiRequest } from '@dailymed/shared/api-client';
import { Card } from '../../components/Card';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { EmptyState } from '../../components/EmptyState';
import { Badge } from '../../components/Badge';
import { IconClock, IconPill, IconCheck } from '../../components/icons';

interface ApplicationLog {
  id: string;
  prescriptionId?: string;
  medicationId?: string;
  patientId?: string;
  isAdHoc: boolean;
  appliedBy: string;
  appliedAt: string;
  scheduledAt?: string;
  doseApplied: number;
  notes?: string;
  applier?: { name: string };
  prescription?: {
    patient?: { name: string };
    medication?: { name: string; doseUnit: string };
  };
  medication?: { name: string; doseUnit: string };
  patient?: { name: string };
}

type FilterPeriod = 'today' | 'week' | 'month';

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

function LogItem({ item }: { item: ApplicationLog }) {
  const patientName = item.prescription?.patient?.name ?? item.patient?.name ?? '—';
  const medName = item.prescription?.medication?.name ?? item.medication?.name ?? '—';
  const doseUnit = item.prescription?.medication?.doseUnit ?? item.medication?.doseUnit ?? '';

  return (
    <Card className="mx-4 mb-3 px-4 py-3.5">
      <View className="flex-row items-start justify-between gap-2">
        <View className="flex-1">
          <View className="flex-row items-center gap-1.5 mb-1">
            <Text className="text-xs text-gray-500">{patientName}</Text>
            {item.isAdHoc && (
              <View className="bg-gray-100 rounded px-1.5 py-0.5">
                <Text className="text-xs text-gray-500">Avulso</Text>
              </View>
            )}
          </View>
          <Text className="text-base font-semibold text-gray-800">{medName}</Text>
          <Text className="text-sm text-gray-500 mt-0.5">
            {item.doseApplied} {doseUnit}
          </Text>
          {item.notes && (
            <Text className="text-xs text-gray-400 mt-1 italic">{item.notes}</Text>
          )}
        </View>
        <View className="items-end gap-1">
          <View className="flex-row items-center gap-1">
            <IconClock width={12} height={12} color="#9ca3af" />
            <Text className="text-xs text-gray-400">{formatDateTime(item.appliedAt)}</Text>
          </View>
          {item.applier && (
            <Text className="text-xs text-gray-400">{item.applier.name}</Text>
          )}
        </View>
      </View>
    </Card>
  );
}

const PERIOD_LABELS: Record<FilterPeriod, string> = {
  today: 'Hoje',
  week: 'Semana',
  month: 'Mês',
};

export default function LogScreen() {
  const { activeGroup } = useGroup();
  const [logs, setLogs] = useState<ApplicationLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState<FilterPeriod>('today');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  function buildQuery(p: number) {
    const now = new Date();
    const from = new Date();
    if (period === 'today') from.setHours(0, 0, 0, 0);
    else if (period === 'week') from.setDate(now.getDate() - 7);
    else from.setMonth(now.getMonth() - 1);

    const params = new URLSearchParams({
      page: String(p),
      limit: '20',
      from: from.toISOString(),
      ...(activeGroup ? { group_id: activeGroup.id } : {}),
    });
    return `/api/v1/applications/log?${params}`;
  }

  const loadLogs = useCallback(async (reset = false) => {
    const p = reset ? 1 : page;
    if (reset) { setIsLoading(true); setPage(1); setHasMore(true); }
    try {
      const data = await apiRequest<ApplicationLog[]>(buildQuery(p));
      if (reset) {
        setLogs(data);
      } else {
        setLogs((prev) => [...prev, ...data]);
      }
      setHasMore(data.length === 20);
      if (!reset) setPage((prev) => prev + 1);
    } catch { /* ignore */ }
    finally { setIsLoading(false); setLoadingMore(false); }
  }, [activeGroup, period, page]);

  useEffect(() => { loadLogs(true); }, [activeGroup, period]);

  async function onRefresh() { setRefreshing(true); await loadLogs(true); setRefreshing(false); }

  function onEndReached() {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    setPage((p) => { loadLogs(false); return p; });
  }

  if (isLoading) return <LoadingSpinner fullScreen />;

  return (
    <View className="flex-1 bg-gray-50">
      {/* Filtro de período */}
      <View className="flex-row px-4 pt-4 pb-2 gap-2">
        {(Object.keys(PERIOD_LABELS) as FilterPeriod[]).map((p) => (
          <TouchableOpacity
            key={p}
            className={`px-4 py-1.5 rounded-full border ${period === p ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300 bg-white'}`}
            onPress={() => setPeriod(p)}
          >
            <Text className={`text-sm font-medium ${period === p ? 'text-white' : 'text-gray-700'}`}>
              {PERIOD_LABELS[p]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={logs}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderItem={({ item }) => <LogItem item={item} />}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.3}
        ListFooterComponent={loadingMore ? <LoadingSpinner size="small" /> : null}
        ListEmptyComponent={() => (
          <EmptyState
            title="Nenhuma aplicação registrada"
            description="As aplicações do período selecionado aparecerão aqui."
            icon={<IconCheck width={32} height={32} color="#9ca3af" />}
          />
        )}
        contentContainerStyle={{ paddingBottom: 20 }}
      />
    </View>
  );
}
