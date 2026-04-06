import { View, Text, TouchableOpacity } from 'react-native';
import { PendingMedication } from '@dailymed/shared/types';
import { Card } from './Card';
import { Badge } from './Badge';
import { IconClock, IconAlertTriangle, IconCheck } from './icons';

interface MedicationCardProps {
  item: PendingMedication;
  onRegister: (item: PendingMedication) => void;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDose(item: PendingMedication): string {
  if (item.doseFraction) return `${item.doseFraction} ${item.doseUnit}`;
  return `${item.doseQuantity} ${item.doseUnit}`;
}

function formatDelay(minutes?: number): string {
  if (!minutes) return '';
  if (minutes < 60) return `${minutes}min de atraso`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}min de atraso` : `${h}h de atraso`;
}

function StatusIcon({ status }: { status: PendingMedication['status'] }) {
  if (status === 'overdue') return <IconAlertTriangle width={18} height={18} color="#dc2626" />;
  if (status === 'applied') return <IconCheck width={18} height={18} color="#16a34a" />;
  return <IconClock width={18} height={18} color="#ca8a04" />;
}

const borderColors: Record<PendingMedication['status'], string> = {
  overdue: '#fca5a5',
  upcoming: '#fde68a',
  applied: '#86efac',
};

const statusLabels: Record<PendingMedication['status'], string> = {
  overdue: 'Atrasado',
  upcoming: 'Próximo',
  applied: 'Aplicado',
};

export function MedicationCard({ item, onRegister }: MedicationCardProps) {
  return (
    <Card
      className="mx-4 mb-3"
      style={{ borderLeftWidth: 4, borderLeftColor: borderColors[item.status] }}
    >
      <View className="p-4">
        <View className="flex-row items-start justify-between gap-2">
          <View className="flex-1">
            <View className="flex-row items-center gap-1.5 mb-1">
              <StatusIcon status={item.status} />
              <Text className="text-xs font-medium text-gray-500">{item.patientName}</Text>
            </View>
            <Text className="text-base font-semibold text-gray-900" numberOfLines={2}>
              {item.medicationName}
            </Text>
            <Text className="mt-0.5 text-sm text-gray-600">{formatDose(item)}</Text>
          </View>
          <Badge
            label={statusLabels[item.status]}
            variant={item.status}
          />
        </View>

        <View className="flex-row items-center justify-between mt-3">
          <View className="flex-row items-center gap-1">
            <IconClock width={14} height={14} color="#6b7280" />
            <Text className="text-sm text-gray-500">
              {item.status === 'applied' && item.appliedAt
                ? `Aplicado às ${formatTime(item.appliedAt)}`
                : `Previsto: ${formatTime(item.scheduledAt)}`}
            </Text>
          </View>
          {item.status === 'overdue' && item.minutesLate && (
            <Text className="text-xs text-red-600 font-medium">
              {formatDelay(item.minutesLate)}
            </Text>
          )}
        </View>

        {item.status !== 'applied' && (
          <TouchableOpacity
            className="mt-3 bg-indigo-600 rounded-lg py-2.5 items-center active:bg-indigo-700"
            onPress={() => onRegister(item)}
            activeOpacity={0.8}
          >
            <Text className="text-white text-sm font-semibold">Registrar Aplicação</Text>
          </TouchableOpacity>
        )}
      </View>
    </Card>
  );
}
