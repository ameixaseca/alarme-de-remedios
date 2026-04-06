import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  Alert, RefreshControl, Share, ActivityIndicator,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useAuth } from '../../hooks/useAuth';
import { useGroup } from '../../contexts/GroupContext';
import { apiRequest } from '@dailymed/shared/api-client';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import {
  IconCopy, IconRefresh, IconTrash, IconGroup,
} from '../../components/icons';
import { Group, GroupMember } from '@dailymed/shared/types';

// ── Onboarding (sem grupo) ──────────────────────────────

function OnboardingView({ onJoined }: { onJoined: () => void }) {
  const [mode, setMode] = useState<'menu' | 'create' | 'join'>('menu');
  const [groupName, setGroupName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    if (!groupName.trim()) {
      Alert.alert('Atenção', 'Informe um nome para o grupo.');
      return;
    }
    setLoading(true);
    try {
      await apiRequest('/api/v1/groups', {
        method: 'POST',
        body: JSON.stringify({ name: groupName.trim() }),
      });
      onJoined();
    } catch (e: any) {
      Alert.alert('Erro', e.message ?? 'Falha ao criar grupo.');
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin() {
    if (!inviteCode.trim()) {
      Alert.alert('Atenção', 'Informe o código de convite.');
      return;
    }
    setLoading(true);
    try {
      await apiRequest('/api/v1/groups/join', {
        method: 'POST',
        body: JSON.stringify({ inviteCode: inviteCode.trim().toUpperCase() }),
      });
      onJoined();
    } catch (e: any) {
      Alert.alert('Erro', e.message ?? 'Código inválido ou expirado.');
    } finally {
      setLoading(false);
    }
  }

  if (mode === 'create') {
    return (
      <View className="flex-1 bg-gray-50 px-6 justify-center">
        <Text className="text-2xl font-bold text-gray-800 mb-2">Criar grupo</Text>
        <Text className="text-gray-500 mb-6">
          Crie um grupo para gerenciar medicamentos com sua equipe.
        </Text>
        <Text className="text-sm font-medium text-gray-700 mb-1">Nome do grupo</Text>
        <TextInput
          className="border border-gray-300 rounded-lg px-4 py-3 text-gray-800 bg-white mb-4"
          placeholder="Ex: Clínica Veterinária São Bento"
          value={groupName}
          onChangeText={setGroupName}
        />
        <Button label="Criar Grupo" onPress={handleCreate} loading={loading} />
        <TouchableOpacity className="mt-3 items-center" onPress={() => setMode('menu')}>
          <Text className="text-indigo-600">Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (mode === 'join') {
    return (
      <View className="flex-1 bg-gray-50 px-6 justify-center">
        <Text className="text-2xl font-bold text-gray-800 mb-2">Entrar em grupo</Text>
        <Text className="text-gray-500 mb-6">
          Insira o código de convite compartilhado pelo administrador.
        </Text>
        <Text className="text-sm font-medium text-gray-700 mb-1">Código de convite</Text>
        <TextInput
          className="border border-gray-300 rounded-lg px-4 py-3 text-gray-800 bg-white mb-4 tracking-widest text-center text-lg font-bold uppercase"
          placeholder="XXXXXXXX"
          value={inviteCode}
          onChangeText={setInviteCode}
          autoCapitalize="characters"
          maxLength={8}
        />
        <Button label="Entrar no Grupo" onPress={handleJoin} loading={loading} />
        <TouchableOpacity className="mt-3 items-center" onPress={() => setMode('menu')}>
          <Text className="text-indigo-600">Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50 px-6 justify-center">
      <View className="items-center mb-8">
        <View className="w-20 h-20 rounded-full bg-indigo-100 items-center justify-center mb-4">
          <IconGroup width={40} height={40} color="#4f46e5" />
        </View>
        <Text className="text-2xl font-bold text-gray-800 text-center">
          Você não está em nenhum grupo
        </Text>
        <Text className="mt-2 text-gray-500 text-center">
          Crie um novo grupo ou entre em um existente.
        </Text>
      </View>
      <Button label="Criar novo grupo" onPress={() => setMode('create')} className="mb-3" />
      <Button
        label="Entrar com código de convite"
        onPress={() => setMode('join')}
        variant="secondary"
      />
    </View>
  );
}

// ── Linha de membro ─────────────────────────────────────

interface MemberRowProps {
  member: GroupMember;
  isAdmin: boolean;
  currentUserId: string;
  onRemove: (userId: string) => void;
}

function MemberRow({ member, isAdmin, currentUserId, onRemove }: MemberRowProps) {
  const isCurrentUser = member.user.id === currentUserId;

  function confirmRemove() {
    Alert.alert(
      'Remover membro',
      `Remover ${member.user.name}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Remover', style: 'destructive', onPress: () => onRemove(member.user.id) },
      ],
    );
  }

  return (
    <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-100">
      <View className="flex-row items-center gap-3">
        <View className="w-9 h-9 rounded-full bg-indigo-100 items-center justify-center">
          <Text className="text-indigo-700 font-bold text-sm">
            {member.user.name[0]?.toUpperCase()}
          </Text>
        </View>
        <View>
          <Text className="text-sm font-medium text-gray-800">
            {member.user.name}{isCurrentUser ? ' (você)' : ''}
          </Text>
          <Text className="text-xs text-gray-500">{member.user.email}</Text>
        </View>
      </View>
      <View className="flex-row items-center gap-2">
        <View
          className={`rounded-full px-2 py-0.5 ${member.role === 'admin' ? 'bg-indigo-100' : 'bg-gray-100'}`}
        >
          <Text
            className={`text-xs font-medium ${member.role === 'admin' ? 'text-indigo-700' : 'text-gray-600'}`}
          >
            {member.role === 'admin' ? 'Admin' : 'Membro'}
          </Text>
        </View>
        {isAdmin && !isCurrentUser && (
          <TouchableOpacity className="p-1" onPress={confirmRemove}>
            <IconTrash width={16} height={16} color="#ef4444" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ── Gerenciamento do grupo ──────────────────────────────

function GroupManagementView({ group }: { group: Group }) {
  const { user } = useAuth();
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [currentGroup, setCurrentGroup] = useState(group);

  const fetchMembers = useCallback(async () => {
    try {
      const data = await apiRequest<GroupMember[]>(`/api/v1/groups/${group.id}/members`);
      setMembers(data);
    } catch {
      // silently ignore — list stays stale until next pull-to-refresh
    } finally {
      setLoadingMembers(false);
    }
  }, [group.id]);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  async function onRefresh() {
    setRefreshing(true);
    await fetchMembers();
    setRefreshing(false);
  }

  const currentMember = members.find((m) => m.user.id === user?.id);
  const isAdmin = currentMember?.role === 'admin';

  async function copyInviteCode() {
    await Clipboard.setStringAsync(currentGroup.inviteCode);
    Alert.alert('Copiado!', 'Código copiado para a área de transferência.');
  }

  async function shareInviteCode() {
    await Share.share({
      message: `Entre no grupo "${currentGroup.name}" no DailyMed com o código: ${currentGroup.inviteCode}`,
    });
  }

  function confirmRegenerateCode() {
    Alert.alert(
      'Regenerar código',
      'O código atual deixará de funcionar. Continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Regenerar', style: 'destructive', onPress: doRegenerateCode },
      ],
    );
  }

  async function doRegenerateCode() {
    setRegenerating(true);
    try {
      const updated = await apiRequest<Group>(
        `/api/v1/groups/${group.id}/invite/regenerate`,
        { method: 'POST' },
      );
      setCurrentGroup(updated);
    } catch (e: any) {
      Alert.alert('Erro', e.message ?? 'Falha ao regenerar código.');
    } finally {
      setRegenerating(false);
    }
  }

  async function removeMember(userId: string) {
    try {
      await apiRequest(`/api/v1/groups/${group.id}/members/${userId}`, { method: 'DELETE' });
      fetchMembers();
    } catch (e: any) {
      Alert.alert('Erro', e.message ?? 'Falha ao remover membro.');
    }
  }

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View className="px-4 pt-4 pb-2">
        <Text className="text-xl font-bold text-gray-800">{currentGroup.name}</Text>
      </View>

      {/* Código de convite */}
      <Card className="mx-4 mb-4 px-4 py-4">
        <Text className="text-sm font-medium text-gray-500 mb-2">Código de convite</Text>
        <View className="flex-row items-center gap-3 mb-3">
          <Text className="text-2xl font-bold tracking-widest text-indigo-600 flex-1">
            {currentGroup.inviteCode}
          </Text>
          {isAdmin && (
            <TouchableOpacity onPress={confirmRegenerateCode} disabled={regenerating}>
              {regenerating ? (
                <ActivityIndicator size="small" color="#4f46e5" />
              ) : (
                <IconRefresh width={20} height={20} color="#6b7280" />
              )}
            </TouchableOpacity>
          )}
        </View>
        <View className="flex-row gap-2">
          <TouchableOpacity
            className="flex-1 border border-gray-300 rounded-lg py-2.5 flex-row items-center justify-center gap-1.5"
            onPress={copyInviteCode}
          >
            <IconCopy width={16} height={16} color="#374151" />
            <Text className="text-sm font-medium text-gray-700">Copiar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-1 bg-indigo-600 rounded-lg py-2.5 flex-row items-center justify-center gap-1.5"
            onPress={shareInviteCode}
          >
            <Text className="text-sm font-semibold text-white">Compartilhar</Text>
          </TouchableOpacity>
        </View>
      </Card>

      {/* Membros */}
      <Text className="px-4 text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
        Membros ({members.length})
      </Text>
      <Card className="mx-4 mb-4">
        {loadingMembers ? (
          <View className="py-6"><LoadingSpinner /></View>
        ) : (
          members.map((m) => (
            <MemberRow
              key={m.userId}
              member={m}
              isAdmin={isAdmin ?? false}
              currentUserId={user?.id ?? ''}
              onRemove={removeMember}
            />
          ))
        )}
      </Card>
    </ScrollView>
  );
}

// ── Screen ──────────────────────────────────────────────

export default function GroupScreen() {
  const { activeGroup, isLoading, refresh } = useGroup();

  if (isLoading) return <LoadingSpinner fullScreen />;
  if (!activeGroup) return <OnboardingView onJoined={refresh} />;
  return <GroupManagementView group={activeGroup} />;
}
