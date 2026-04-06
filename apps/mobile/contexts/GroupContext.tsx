import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import * as SecureStore from 'expo-secure-store';
import { Group } from '@dailymed/shared/types';
import { useAuth } from '../hooks/useAuth';

const ACTIVE_GROUP_KEY = 'dailymed_active_group';

interface GroupContextValue {
  activeGroup: Group | null;
  groups: Group[];
  isLoading: boolean;
  setActiveGroup: (group: Group) => Promise<void>;
  refreshGroups: () => Promise<void>;
}

const GroupContext = createContext<GroupContextValue | null>(null);

export function GroupProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [activeGroup, setActiveGroupState] = useState<Group | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchGroups = useCallback(async () => {
    if (!isAuthenticated) {
      setGroups([]);
      setActiveGroupState(null);
      setIsLoading(false);
      return;
    }

    try {
      const { apiRequest } = await import('@dailymed/shared/api-client');
      const data = await apiRequest<Group[]>('/api/v1/groups');
      setGroups(data);

      // Restore saved active group or default to first
      const savedGroupId = await SecureStore.getItemAsync(ACTIVE_GROUP_KEY);
      const saved = savedGroupId ? data.find((g) => g.id === savedGroupId) : null;
      setActiveGroupState(saved ?? data[0] ?? null);
    } catch {
      // ignore errors silently — user might not be in a group yet
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const setActiveGroup = useCallback(async (group: Group) => {
    await SecureStore.setItemAsync(ACTIVE_GROUP_KEY, group.id);
    setActiveGroupState(group);
  }, []);

  return (
    <GroupContext.Provider
      value={{
        activeGroup,
        groups,
        isLoading,
        setActiveGroup,
        refreshGroups: fetchGroups,
      }}
    >
      {children}
    </GroupContext.Provider>
  );
}

export function useGroup() {
  const ctx = useContext(GroupContext);
  if (!ctx) throw new Error('useGroup must be used within GroupProvider');
  return ctx;
}
