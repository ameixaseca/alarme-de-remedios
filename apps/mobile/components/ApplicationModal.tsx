import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import * as Haptics from 'expo-haptics';
import { PendingMedication } from '@dailymed/shared/types';
import { apiRequest } from '@dailymed/shared/api-client';
import { useOfflineQueue } from '../hooks/useOfflineQueue';
import { IconX, IconCheck } from './icons';

interface ApplicationModalProps {
  item: PendingMedication | null;
  onClose: () => void;
  onSuccess: () => void;
}

function formatDose(med: PendingMedication): string {
  if (med.doseFraction) return `${med.doseFraction} ${med.doseUnit}`;
  return `${med.doseQuantity} ${med.doseUnit}`;
}

export function ApplicationModal({ item, onClose, onSuccess }: ApplicationModalProps) {
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const { enqueue } = useOfflineQueue();

  async function handleConfirm() {
    if (!item) return;
    setLoading(true);
    const payload = {
      prescriptionId: item.prescriptionId,
      patientId: item.patientId,
      medicationId: item.medicationId,
      scheduledAt: item.scheduledAt,
      appliedAt: new Date().toISOString(),
      doseApplied: item.doseQuantity,
      notes: notes.trim() || undefined,
    };
    try {
      const netState = await NetInfo.fetch();
      if (!netState.isConnected) {
        await enqueue(payload);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        Alert.alert('Salvo offline', 'A aplicação será sincronizada quando a conexão for restaurada.');
        setNotes('');
        onSuccess();
        onClose();
        return;
      }
      await apiRequest('/api/v1/applications', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setNotes('');
      onSuccess();
      onClose();
    } catch (err: any) {
      Alert.alert('Erro', err.message ?? 'Falha ao registrar aplicação.');
    } finally {
      setLoading(false);
    }
  }

  if (!item) return null;

  return (
    <Modal visible={!!item} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/40 justify-end" onPress={onClose}>
        <Pressable className="bg-white rounded-t-2xl pb-8">
          <View className="items-center pt-3 mb-1">
            <View className="w-10 h-1 rounded-full bg-gray-300" />
          </View>

          <View className="flex-row items-center justify-between px-4 py-3">
            <Text className="text-lg font-semibold text-gray-800">Confirmar Aplicação</Text>
            <TouchableOpacity onPress={onClose} className="p-1">
              <IconX width={22} height={22} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <ScrollView className="px-4">
            <View className="bg-gray-50 rounded-xl p-4 mb-4">
              <Text className="text-xs text-gray-500 uppercase tracking-wide mb-1">Paciente</Text>
              <Text className="text-base font-semibold text-gray-800">{item.patientName}</Text>
              <Text className="mt-2 text-xs text-gray-500 uppercase tracking-wide mb-1">Medicamento</Text>
              <Text className="text-base font-semibold text-gray-800">{item.medicationName}</Text>
              <Text className="mt-2 text-xs text-gray-500 uppercase tracking-wide mb-1">Dose</Text>
              <Text className="text-base text-gray-800">{formatDose(item)}</Text>
              <Text className="mt-2 text-xs text-gray-500 uppercase tracking-wide mb-1">Horário previsto</Text>
              <Text className="text-base text-gray-800">
                {new Date(item.scheduledAt).toLocaleTimeString('pt-BR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>

            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-700 mb-1">Observações (opcional)</Text>
              <TextInput
                className="border border-gray-300 rounded-lg px-3 py-2.5 text-gray-800 text-sm"
                placeholder="Ex: paciente recusou metade da dose"
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            <TouchableOpacity
              className="bg-indigo-600 rounded-lg py-3.5 items-center flex-row justify-center gap-2 mb-4"
              onPress={handleConfirm}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <>
                  <IconCheck width={18} height={18} color="white" />
                  <Text className="text-white font-semibold text-base">Confirmar Aplicação</Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
