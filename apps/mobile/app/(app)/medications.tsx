import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  RefreshControl, Modal, Pressable, TextInput,
  ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useGroup } from '../../contexts/GroupContext';
import { apiRequest } from '@dailymed/shared/api-client';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { IconPill, IconPlus, IconCamera, IconAlertTriangle } from '../../components/icons';
import { Medication } from '@dailymed/shared/types';

function useMedicationsList() {
  const { activeGroup } = useGroup();
  const [medications, setMedications] = useState<Medication[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!activeGroup) { setIsLoading(false); return; }
    setIsLoading(true);
    try {
      const data = await apiRequest<Medication[]>(`/api/v1/medications?group_id=${activeGroup.id}`);
      setMedications(data);
    } catch { /* ignore */ }
    finally { setIsLoading(false); }
  }, [activeGroup]);

  useEffect(() => { refresh(); }, [refresh]);
  return { medications, isLoading, refresh };
}

const APPLICATION_METHODS = [
  { value: 'oral', label: 'Oral' },
  { value: 'injectable', label: 'Injetável' },
  { value: 'topical', label: 'Tópico' },
  { value: 'ophthalmic', label: 'Oftálmico' },
  { value: 'otic', label: 'Otológico' },
  { value: 'inhalation', label: 'Inalação' },
  { value: 'other', label: 'Outro' },
];

interface MedForm {
  name: string;
  manufacturer: string;
  activeIngredient: string;
  applicationMethod: string;
  doseUnit: string;
  stockQuantity: string;
}

function MedicationFormModal({
  visible, onClose, onSuccess, initial, groupId,
}: {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initial?: Partial<MedForm> & { id?: string };
  groupId: string;
}) {
  const isEdit = !!initial?.id;
  const [form, setForm] = useState<MedForm>({
    name: initial?.name ?? '',
    manufacturer: initial?.manufacturer ?? '',
    activeIngredient: initial?.activeIngredient ?? '',
    applicationMethod: initial?.applicationMethod ?? 'oral',
    doseUnit: initial?.doseUnit ?? '',
    stockQuantity: initial?.stockQuantity ?? '',
  });
  const [loading, setLoading] = useState(false);
  const [identifying, setIdentifying] = useState(false);

  function setField(key: keyof MedForm, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function identifyByPhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      base64: true,
      quality: 0.7,
    });
    if (result.canceled || !result.assets[0].base64) return;
    setIdentifying(true);
    try {
      const data = await apiRequest<Partial<MedForm>>('/api/v1/medications/identify', {
        method: 'POST',
        body: JSON.stringify({ imageBase64: result.assets[0].base64 }),
      });
      setForm((f) => ({ ...f, ...(data as Partial<MedForm>) }));
    } catch {
      Alert.alert('Erro', 'Não foi possível identificar o medicamento.');
    } finally {
      setIdentifying(false);
    }
  }

  async function handleSave() {
    if (!form.name.trim() || !form.doseUnit.trim() || !form.applicationMethod) {
      Alert.alert('Atenção', 'Nome, unidade de dose e via de administração são obrigatórios.');
      return;
    }
    setLoading(true);
    try {
      const body: Record<string, unknown> = {
        groupId,
        name: form.name.trim(),
        applicationMethod: form.applicationMethod,
        doseUnit: form.doseUnit.trim(),
        ...(form.manufacturer.trim() ? { manufacturer: form.manufacturer.trim() } : {}),
        ...(form.activeIngredient.trim() ? { activeIngredient: form.activeIngredient.trim() } : {}),
        ...(form.stockQuantity ? { stockQuantity: parseFloat(form.stockQuantity) } : {}),
      };
      if (isEdit) {
        await apiRequest(`/api/v1/medications/${initial!.id}`, { method: 'PATCH', body: JSON.stringify(body) });
      } else {
        await apiRequest('/api/v1/medications', { method: 'POST', body: JSON.stringify(body) });
      }
      onSuccess();
      onClose();
    } catch (e: any) {
      Alert.alert('Erro', e.message ?? 'Falha ao salvar medicamento.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/40 justify-end" onPress={onClose}>
        <Pressable className="bg-white rounded-t-2xl pb-8" style={{ maxHeight: '90%' }}>
          <View className="items-center pt-3"><View className="w-10 h-1 rounded-full bg-gray-300" /></View>
          <View className="flex-row items-center justify-between px-4 py-3">
            <Text className="text-lg font-semibold text-gray-800">{isEdit ? 'Editar' : 'Novo'} Medicamento</Text>
            <TouchableOpacity
              className="flex-row items-center gap-1.5 bg-indigo-50 px-3 py-1.5 rounded-lg"
              onPress={identifyByPhoto}
              disabled={identifying}
            >
              {identifying
                ? <ActivityIndicator size="small" color="#4f46e5" />
                : <IconCamera width={16} height={16} color="#4f46e5" />}
              <Text className="text-sm text-indigo-600 font-medium">Identificar por foto</Text>
            </TouchableOpacity>
          </View>
          <ScrollView className="px-4">
            {([
              { key: 'name' as const, label: 'Nome *', placeholder: 'Ex: Amoxicilina' },
              { key: 'manufacturer' as const, label: 'Fabricante', placeholder: 'Ex: Vitalis' },
              { key: 'activeIngredient' as const, label: 'Princípio ativo', placeholder: 'Ex: Amoxicilina tri-hidratada' },
              { key: 'doseUnit' as const, label: 'Unidade de dose *', placeholder: 'Ex: mg, comprimido, mL' },
              { key: 'stockQuantity' as const, label: 'Estoque atual', placeholder: 'Ex: 30', keyboard: 'numeric' },
            ]).map(({ key, label, placeholder, keyboard }) => (
              <View key={key} className="mb-3">
                <Text className="text-sm font-medium text-gray-700 mb-1">{label}</Text>
                <TextInput
                  className="border border-gray-300 rounded-lg px-3 py-2.5 text-gray-800"
                  placeholder={placeholder}
                  value={form[key]}
                  onChangeText={(v) => setField(key, v)}
                  keyboardType={keyboard === 'numeric' ? 'numeric' : 'default'}
                />
              </View>
            ))}

            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-700 mb-1">Via de administração *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View className="flex-row gap-2 py-1">
                  {APPLICATION_METHODS.map((m) => (
                    <TouchableOpacity
                      key={m.value}
                      className={`px-3 py-1.5 rounded-full border ${form.applicationMethod === m.value ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300 bg-white'}`}
                      onPress={() => setField('applicationMethod', m.value)}
                    >
                      <Text className={`text-sm font-medium ${form.applicationMethod === m.value ? 'text-white' : 'text-gray-700'}`}>
                        {m.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            <Button
              label={isEdit ? 'Salvar Alterações' : 'Cadastrar Medicamento'}
              onPress={handleSave}
              loading={loading}
              className="mb-4"
            />
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function MedicationItem({ med, onEdit }: { med: Medication; onEdit: () => void }) {
  const hasLowStock = med.stockQuantity != null && med.stockQuantity < 10;
  return (
    <TouchableOpacity onPress={onEdit} activeOpacity={0.7}>
      <Card className="mx-4 mb-3 px-4 py-3.5">
        <View className="flex-row items-center gap-3">
          <View className="w-10 h-10 rounded-full bg-indigo-100 items-center justify-center">
            <IconPill width={20} height={20} color="#4f46e5" />
          </View>
          <View className="flex-1">
            <View className="flex-row items-center gap-2">
              <Text className="text-base font-semibold text-gray-800">{med.name}</Text>
              {hasLowStock && <IconAlertTriangle width={14} height={14} color="#dc2626" />}
            </View>
            <Text className="text-sm text-gray-500">{med.doseUnit} · {med.applicationMethod}</Text>
            {med.stockQuantity != null && (
              <Text className={`text-xs mt-0.5 ${hasLowStock ? 'text-red-600 font-medium' : 'text-gray-400'}`}>
                Estoque: {med.stockQuantity}
              </Text>
            )}
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );
}

export default function MedicationsScreen() {
  const { activeGroup } = useGroup();
  const { medications, isLoading, refresh } = useMedicationsList();
  const [refreshing, setRefreshing] = useState(false);
  const [addVisible, setAddVisible] = useState(false);
  const [editMed, setEditMed] = useState<Medication | null>(null);

  async function onRefresh() { setRefreshing(true); await refresh(); setRefreshing(false); }

  if (isLoading && !refreshing) return <LoadingSpinner fullScreen />;

  return (
    <View className="flex-1 bg-gray-50">
      <FlatList
        data={medications}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={() => (
          <View className="px-4 pt-4 pb-2 flex-row items-center justify-between">
            <Text className="text-xl font-bold text-gray-800">Medicamentos ({medications.length})</Text>
            <TouchableOpacity
              className="bg-indigo-600 rounded-lg px-3 py-2 flex-row items-center gap-1"
              onPress={() => setAddVisible(true)}
            >
              <IconPlus width={16} height={16} color="white" />
              <Text className="text-sm font-semibold text-white">Novo</Text>
            </TouchableOpacity>
          </View>
        )}
        renderItem={({ item }) => (
          <MedicationItem med={item} onEdit={() => setEditMed(item)} />
        )}
        ListEmptyComponent={() => (
          <EmptyState
            title="Nenhum medicamento cadastrado"
            description="Cadastre o primeiro medicamento do grupo."
            icon={<IconPill width={32} height={32} color="#9ca3af" />}
          />
        )}
        contentContainerStyle={{ paddingBottom: 20 }}
      />

      <MedicationFormModal
        visible={addVisible}
        onClose={() => setAddVisible(false)}
        onSuccess={refresh}
        groupId={activeGroup?.id ?? ''}
      />

      {editMed && (
        <MedicationFormModal
          visible
          onClose={() => setEditMed(null)}
          onSuccess={() => { refresh(); setEditMed(null); }}
          initial={{
            id: editMed.id,
            name: editMed.name,
            manufacturer: editMed.manufacturer ?? '',
            activeIngredient: editMed.activeIngredient ?? '',
            applicationMethod: editMed.applicationMethod,
            doseUnit: editMed.doseUnit,
            stockQuantity: editMed.stockQuantity?.toString() ?? '',
          }}
          groupId={activeGroup?.id ?? ''}
        />
      )}
    </View>
  );
}
