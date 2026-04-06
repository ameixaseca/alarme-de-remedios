"use client";
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { api } from "@/lib/client/api";

export interface Group {
  id: string;
  name: string;
  photoUrl?: string | null;
}

interface GroupContextValue {
  groups: Group[];
  activeGroup: Group | null;
  setActiveGroup: (g: Group) => void;
  refreshGroups: () => Promise<void>;
  loading: boolean;
}

const GroupContext = createContext<GroupContextValue>({
  groups: [],
  activeGroup: null,
  setActiveGroup: () => {},
  refreshGroups: async () => {},
  loading: true,
});

export function GroupProvider({ children }: { children: ReactNode }) {
  const [groups, setGroups]           = useState<Group[]>([]);
  const [activeGroup, setActiveGroupState] = useState<Group | null>(null);
  const [loading, setLoading]         = useState(true);

  const loadGroups = useCallback(async () => {
    try {
      const { groups: g } = await api.get<{ groups: Group[] }>("/groups");
      setGroups(g);
      if (g.length === 0) {
        setActiveGroupState(null);
        return;
      }
      const savedId = typeof window !== "undefined"
        ? localStorage.getItem("activeGroupId")
        : null;
      const saved = g.find((gr) => gr.id === savedId);
      setActiveGroupState((prev) => {
        // Keep active if it still exists, otherwise fall back
        const still = g.find((gr) => gr.id === prev?.id);
        return still ?? saved ?? g[0];
      });
    } catch {
      // silently ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadGroups(); }, [loadGroups]);

  const setActiveGroup = useCallback((g: Group) => {
    setActiveGroupState(g);
    localStorage.setItem("activeGroupId", g.id);
  }, []);

  return (
    <GroupContext.Provider value={{ groups, activeGroup, setActiveGroup, refreshGroups: loadGroups, loading }}>
      {children}
    </GroupContext.Provider>
  );
}

export function useGroupContext() {
  return useContext(GroupContext);
}
