import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import { Group } from '@dailymed/shared/types';
import { apiRequest } from '@dailymed/shared/api-client';

const ACTIVE_GROUP_KEY = 'dailymed_active_group';

interface GroupContextValue {
  activeGroup: Group | null;
  groups: Group[];
  isLoading: boolean;
  setActiveGroup: (group: Group) => void;
  refresh: () => Promise<void>;
}

const GroupContext = createContext<GroupContextValue | null>(null);

export function GroupProvider({ children }: { children: ReactNode }) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [activeGroup, setActiveGroupState] = useState<Group | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadGroups = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await apiRequest<Group[]>('/api/v1/groups');
      setGroups(data);

      const storedGroupStr = await SecureStore.getItemAsync(ACTIVE_GROUP_KEY);
      if (storedGroupStr) {
        const stored: Group = JSON.parse(storedGroupStr);
        const still = data.find((g) => g.id === stored.id);
        if (still) {
          setActiveGroupState(still);
          return;
        }
      }

      if (data.length > 0) {
        setActiveGroupState(data[0]);
        await SecureStore.setItemAsync(ACTIVE_GROUP_KEY, JSON.stringify(data[0]));
      }
    } catch {
      // ignore — user may not be authenticated yet
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  const setActiveGroup = useCallback(async (group: Group) => {
    setActiveGroupState(group);
    await SecureStore.setItemAsync(ACTIVE_GROUP_KEY, JSON.stringify(group));
  }, []);

  return (
    <GroupContext.Provider value={{ activeGroup, groups, isLoading, setActiveGroup, refresh: loadGroups }}>
      {children}
    </GroupContext.Provider>
  );
}

export function useGroup(): GroupContextValue {
  const ctx = useContext(GroupContext);
  if (!ctx) throw new Error('useGroup must be used inside GroupProvider');
  return ctx;
}
