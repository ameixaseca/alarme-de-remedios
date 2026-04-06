import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  Pressable,
} from 'react-native';
import { useGroup } from '../contexts/GroupContext';
import { IconChevronDown, IconCheck } from './icons';
import { Group } from '@dailymed/shared/types';

export function GroupSwitcher() {
  const { activeGroup, groups, setActiveGroup } = useGroup();
  const [modalVisible, setModalVisible] = useState(false);

  if (!activeGroup) return null;

  async function handleSelect(group: Group) {
    await setActiveGroup(group);
    setModalVisible(false);
  }

  return (
    <>
      <TouchableOpacity
        className="flex-row items-center gap-1 px-2 py-1 rounded-lg active:bg-gray-100"
        onPress={() => groups.length > 1 && setModalVisible(true)}
        activeOpacity={0.7}
      >
        <Text className="text-base font-semibold text-gray-800" numberOfLines={1}>
          {activeGroup.name}
        </Text>
        {groups.length > 1 && <IconChevronDown width={16} height={16} color="#6b7280" />}
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable
          className="flex-1 bg-black/30 justify-end"
          onPress={() => setModalVisible(false)}
        >
          <Pressable className="bg-white rounded-t-2xl pb-8">
            <View className="items-center pt-3 pb-2">
              <View className="w-10 h-1 rounded-full bg-gray-300" />
            </View>
            <Text className="text-base font-semibold text-gray-800 px-4 pb-3">
              Selecionar grupo
            </Text>
            <FlatList
              data={groups}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  className="flex-row items-center justify-between px-4 py-3.5 active:bg-gray-50"
                  onPress={() => handleSelect(item)}
                >
                  <Text className="text-base text-gray-800">{item.name}</Text>
                  {activeGroup.id === item.id && (
                    <IconCheck width={20} height={20} color="#4f46e5" />
                  )}
                </TouchableOpacity>
              )}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
