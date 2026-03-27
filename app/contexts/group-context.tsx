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
  loading: boolean;
}

const GroupContext = createContext<GroupContextValue>({
  groups: [],
  activeGroup: null,
  setActiveGroup: () => {},
  loading: true,
});

export function GroupProvider({ children }: { children: ReactNode }) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [activeGroup, setActiveGroupState] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<{ groups: Group[] }>("/groups")
      .then(({ groups: g }) => {
        setGroups(g);
        if (g.length === 0) return;
        const savedId = typeof window !== "undefined"
          ? localStorage.getItem("activeGroupId")
          : null;
        const saved = g.find((gr) => gr.id === savedId);
        setActiveGroupState(saved ?? g[0]);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const setActiveGroup = useCallback((g: Group) => {
    setActiveGroupState(g);
    localStorage.setItem("activeGroupId", g.id);
  }, []);

  return (
    <GroupContext.Provider value={{ groups, activeGroup, setActiveGroup, loading }}>
      {children}
    </GroupContext.Provider>
  );
}

export function useGroupContext() {
  return useContext(GroupContext);
}
