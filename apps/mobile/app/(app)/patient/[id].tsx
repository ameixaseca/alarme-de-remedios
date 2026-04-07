import { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  Modal, Pressable, TextInput, Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { usePrescriptions } from '../../../hooks/usePrescriptions';
import { useMedications } from '../../../hooks/useMedications';
import { apiRequest } from '@dailymed/shared/api-client';
import { Card } from '../../../components/Card';
import { Button } from '../../../components/Button';
import { Badge } from '../../../components/Badge';
import { LoadingSpinner } from '../../../components/LoadingSpinner';
import { EmptyState } from '../../../components/EmptyState';
import { IconPlus, IconChevronRight, IconTrash, IconPill } from '../../../components/icons';
import { Prescription, Medication, PrescriptionStatus } from '@dailymed/shared/types';

const statusLabel: Record<PrescriptionStatus, string> = {
  active: 'Ativa',
  paused: 'Pausada',
  finished: 'Encerrada',
};

const statusVariant: Record<PrescriptionStatus, 'applied' | 'upcoming' | 'overdue' | 'default'> = {
  active: 'applied',
  paused: 'upcoming',
  finished: 'default',
};

function PrescriptionCard({ prescription, onDelete }: {
  prescription: Prescription;
  onDelete: (id: string) => void;
}) {
  const med = prescription.medication;
  const dose = prescription.doseFraction
    ? `${prescription.doseFraction} ${prescription.doseUnit}`
    : `${prescription.doseQuantity} ${prescription.doseUnit}`;

  return (
    <Card className="mx-4 mb-3 px-4 py-3.5">
      <View className="flex-row items-start justify-between">
        <View className="flex-1">
          <Text className="text-base font-semibold text-gray-800">
            {med?.name ?? 'Medicamento'}
          </Text>
          <Text className="text-sm text-gray-500 mt-0.5">
            {dose} · a cada {prescription.frequencyHours}h
          </Text>
          {prescription.durationDays && (
            <Text className="text-xs text-gray-400 mt-1">{prescription.durationDays} dias</Text>
          )}
        </View>
        <View className="flex-row items-center gap-2">
          <Badge
            label={statusLabel[prescription.status]}
            variant={statusVariant[prescription.status]}
          />
          <TouchableOpacity
            className="p-1"
            onPress={() => Alert.alert('Excluir', 'Deseja excluir esta prescrição?', [
              { text: 'Cancelar', style: 'cancel' },
              { text: 'Excluir', style: 'destructive', onPress: () => onDelete(prescription.id) },
            ])}
          >
            <IconTrash width={16} height={16} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>
    </Card>
  );
}

function AddPrescriptionModal({ visible, onClose, onSuccess, patientId }: {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  patientId: string;
}) {
  const { medications } = useMedications();
  const [selectedMed, setSelectedMed] = useState<Medication | null>(null);
  const [doseQty, setDoseQty] = useState('');
  const [doseFraction, setDoseFraction] = useState('');
  const [freqHours, setFreqHours] = useState('');
  const [durationDays, setDurationDays] = useState('');
  const [loading, setLoading] = useState(false);
  const [showMedPicker, setShowMedPicker] = useState(false);

  async function handleSave() {
    if (!selectedMed || !freqHours || !doseQty) {
      Alert.alert('Atenção', 'Selecione o medicamento, dose e frequência.');
      return;
    }
    setLoading(true);
    try {
      await apiRequest('/api/v1/prescriptions', {
        method: 'POST',
        body: JSON.stringify({
          patientId,
          medicationId: selectedMed.id,
          doseQuantity: parseFloat(doseQty),
          ...(doseFraction.trim() ? { doseFraction: doseFraction.trim() } : {}),
          doseUnit: selectedMed.doseUnit,
          frequencyHours: parseFloat(freqHours),
          startDate: new Date().toISOString(),
          ...(durationDays.trim() ? { durationDays: parseInt(durationDays, 10) } : {}),
        }),
      });
      setSelectedMed(null); setDoseQty(''); setDoseFraction('');
      setFreqHours(''); setDurationDays('');
      onSuccess();
      onClose();
    } catch (e: any) {
      Alert.alert('Erro', e.message ?? 'Falha ao criar prescrição.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/40 justify-end" onPress={onClose}>
        <Pressable className="bg-white rounded-t-2xl pb-8" style={{ maxHeight: '85%' }}>
          <View className="items-center pt-3">
            <View className="w-10 h-1 rounded-full bg-gray-300" />
          </View>
          <Text className="text-lg font-semibold text-gray-800 px-4 py-3">Nova Prescrição</Text>
          <ScrollView className="px-4">
            <View className="mb-3">
              <Text className="text-sm font-medium text-gray-700 mb-1">Medicamento *</Text>
              <TouchableOpacity
                className="border border-gray-300 rounded-lg px-3 py-2.5 flex-row items-center justify-between"
                onPress={() => setShowMedPicker(true)}
              >
                <Text className={selectedMed ? 'text-gray-800' : 'text-gray-400'}>
                  {selectedMed?.name ?? 'Selecionar medicamento'}
                </Text>
                <IconChevronRight width={16} height={16} color="#9ca3af" />
              </TouchableOpacity>
            </View>

            <View className="flex-row gap-3 mb-3">
              <View className="flex-1">
                <Text className="text-sm font-medium text-gray-700 mb-1">Dose *</Text>
                <TextInput
                  className="border border-gray-300 rounded-lg px-3 py-2.5 text-gray-800"
                  placeholder="Ex: 1"
                  value={doseQty}
                  onChangeText={setDoseQty}
                  keyboardType="numeric"
                />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-medium text-gray-700 mb-1">Fração (opcional)</Text>
                <TextInput
                  className="border border-gray-300 rounded-lg px-3 py-2.5 text-gray-800"
                  placeholder="Ex: 1/2"
                  value={doseFraction}
                  onChangeText={setDoseFraction}
                />
              </View>
            </View>

            <View className="flex-row gap-3 mb-4">
              <View className="flex-1">
                <Text className="text-sm font-medium text-gray-700 mb-1">Frequência (horas) *</Text>
                <TextInput
                  className="border border-gray-300 rounded-lg px-3 py-2.5 text-gray-800"
                  placeholder="Ex: 8"
                  value={freqHours}
                  onChangeText={setFreqHours}
                  keyboardType="numeric"
                />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-medium text-gray-700 mb-1">Duração (dias)</Text>
                <TextInput
                  className="border border-gray-300 rounded-lg px-3 py-2.5 text-gray-800"
                  placeholder="Indefinido"
                  value={durationDays}
                  onChangeText={setDurationDays}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <Button label="Criar Prescrição" onPress={handleSave} loading={loading} className="mb-4" />
          </ScrollView>
        </Pressable>
      </Pressable>

      {/* Medication picker sheet */}
      <Modal visible={showMedPicker} transparent animationType="slide">
        <Pressable className="flex-1 bg-black/40 justify-end" onPress={() => setShowMedPicker(false)}>
          <Pressable className="bg-white rounded-t-2xl pb-8" style={{ maxHeight: '60%' }}>
            <View className="items-center pt-3">
              <View className="w-10 h-1 rounded-full bg-gray-300" />
            </View>
            <Text className="text-base font-semibold text-gray-800 px-4 py-3">
              Selecionar Medicamento
            </Text>
            <ScrollView>
              {medications.map((med) => (
                <TouchableOpacity
                  key={med.id}
                  className="px-4 py-3 border-b border-gray-100 flex-row items-center gap-3"
                  onPress={() => { setSelectedMed(med); setShowMedPicker(false); }}
                >
                  <IconPill width={18} height={18} color="#4f46e5" />
                  <View>
                    <Text className="text-base text-gray-800">{med.name}</Text>
                    <Text className="text-xs text-gray-500">{med.doseUnit}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </Modal>
  );
}

export default function PatientDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { prescriptions, isLoading, refresh } = usePrescriptions(id ?? null);
  const [addVisible, setAddVisible] = useState(false);

  async function handleDeletePrescription(prescriptionId: string) {
    try {
      await apiRequest(`/api/v1/prescriptions/${prescriptionId}`, { method: 'DELETE' });
      refresh();
    } catch (e: any) {
      Alert.alert('Erro', e.message ?? 'Falha ao excluir prescrição.');
    }
  }

  if (isLoading) return <LoadingSpinner fullScreen />;

  return (
    <View className="flex-1 bg-gray-50">
      <View className="bg-white border-b border-gray-200 px-4 py-3 flex-row items-center justify-between">
        <TouchableOpacity onPress={() => router.back()} className="p-1">
          <Text className="text-indigo-600 font-medium">‹ Voltar</Text>
        </TouchableOpacity>
        <Text className="text-base font-semibold text-gray-800">Prescrições</Text>
        <TouchableOpacity
          className="bg-indigo-600 rounded-lg px-3 py-1.5 flex-row items-center gap-1"
          onPress={() => setAddVisible(true)}
        >
          <IconPlus width={14} height={14} color="white" />
          <Text className="text-sm font-semibold text-white">Nova</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingTop: 16, paddingBottom: 32 }}>
        {prescriptions.length === 0 ? (
          <EmptyState
            title="Nenhuma prescrição"
            description="Crie a primeira prescrição para este paciente."
            icon={<IconPill width={32} height={32} color="#9ca3af" />}
          />
        ) : (
          prescriptions.map((p) => (
            <PrescriptionCard
              key={p.id}
              prescription={p}
              onDelete={handleDeletePrescription}
            />
          ))
        )}
      </ScrollView>

      <AddPrescriptionModal
        visible={addVisible}
        onClose={() => setAddVisible(false)}
        onSuccess={refresh}
        patientId={id!}
      />
    </View>
  );
}
