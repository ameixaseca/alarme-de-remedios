import { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  RefreshControl, TextInput, Modal, Pressable,
  Alert, ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { usePatients } from '../../hooks/usePatients';
import { useGroup } from '../../contexts/GroupContext';
import { apiRequest } from '@dailymed/shared/api-client';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { IconPlus, IconChevronRight, IconUsers, IconPerson } from '../../components/icons';
import { Patient } from '@dailymed/shared/types';

function PatientCard({ patient, onPress }: { patient: Patient; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <Card className="mx-4 mb-3 px-4 py-3.5">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-3 flex-1">
            <View className="w-10 h-10 rounded-full bg-indigo-100 items-center justify-center">
              <IconPerson width={20} height={20} color="#4f46e5" />
            </View>
            <View className="flex-1">
              <Text className="text-base font-semibold text-gray-800">{patient.name}</Text>
              <Text className="text-sm text-gray-500">
                {patient.species}{patient.breed ? ` · ${patient.breed}` : ''}
              </Text>
            </View>
          </View>
          <IconChevronRight width={18} height={18} color="#9ca3af" />
        </View>
      </Card>
    </TouchableOpacity>
  );
}

function AddPatientModal({ visible, onClose, onSuccess }: {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { activeGroup } = useGroup();
  const [name, setName] = useState('');
  const [species, setSpecies] = useState('');
  const [breed, setBreed] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    if (!name.trim() || !species.trim()) {
      Alert.alert('Atenção', 'Nome e espécie são obrigatórios.');
      return;
    }
    setLoading(true);
    try {
      await apiRequest('/api/v1/patients', {
        method: 'POST',
        body: JSON.stringify({
          groupId: activeGroup!.id,
          name: name.trim(),
          species: species.trim(),
          ...(breed.trim() ? { breed: breed.trim() } : {}),
        }),
      });
      setName(''); setSpecies(''); setBreed('');
      onSuccess();
      onClose();
    } catch (e: any) {
      Alert.alert('Erro', e.message ?? 'Falha ao cadastrar paciente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/40 justify-end" onPress={onClose}>
        <Pressable className="bg-white rounded-t-2xl pb-8">
          <View className="items-center pt-3">
            <View className="w-10 h-1 rounded-full bg-gray-300" />
          </View>
          <Text className="text-lg font-semibold text-gray-800 px-4 py-3">Novo Paciente</Text>
          <ScrollView className="px-4">
            <View className="mb-3">
              <Text className="text-sm font-medium text-gray-700 mb-1">Nome *</Text>
              <TextInput
                className="border border-gray-300 rounded-lg px-3 py-2.5 text-gray-800"
                placeholder="Ex: Rex"
                value={name}
                onChangeText={setName}
              />
            </View>
            <View className="mb-3">
              <Text className="text-sm font-medium text-gray-700 mb-1">Espécie *</Text>
              <TextInput
                className="border border-gray-300 rounded-lg px-3 py-2.5 text-gray-800"
                placeholder="Ex: Cão, Gato"
                value={species}
                onChangeText={setSpecies}
              />
            </View>
            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-700 mb-1">Raça (opcional)</Text>
              <TextInput
                className="border border-gray-300 rounded-lg px-3 py-2.5 text-gray-800"
                placeholder="Ex: Labrador"
                value={breed}
                onChangeText={setBreed}
              />
            </View>
            <Button label="Salvar Paciente" onPress={handleSave} loading={loading} className="mb-4" />
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default function PatientsScreen() {
  const { patients, isLoading, error, refresh } = usePatients();
  const [refreshing, setRefreshing] = useState(false);
  const [addVisible, setAddVisible] = useState(false);

  async function onRefresh() {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }

  if (isLoading && !refreshing) return <LoadingSpinner fullScreen />;

  return (
    <View className="flex-1 bg-gray-50">
      <FlatList
        data={patients}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={() => (
          <View className="px-4 pt-4 pb-2 flex-row items-center justify-between">
            <Text className="text-xl font-bold text-gray-800">Pacientes ({patients.length})</Text>
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
          <PatientCard
            patient={item}
            onPress={() => router.push(`/(app)/patient/${item.id}`)}
          />
        )}
        ListEmptyComponent={() => (
          <EmptyState
            title="Nenhum paciente cadastrado"
            description="Cadastre o primeiro paciente do grupo."
            icon={<IconUsers width={32} height={32} color="#9ca3af" />}
          />
        )}
        contentContainerStyle={{ paddingBottom: 20 }}
      />
      <AddPatientModal
        visible={addVisible}
        onClose={() => setAddVisible(false)}
        onSuccess={refresh}
      />
    </View>
  );
}
