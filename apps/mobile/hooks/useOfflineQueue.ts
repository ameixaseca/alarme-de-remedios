import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { apiRequest } from '@dailymed/shared/api-client';

const QUEUE_KEY = 'dailymed_offline_queue';

interface QueuedApplication {
  id: string;
  prescriptionId?: string;
  patientId?: string;
  medicationId?: string;
  scheduledAt?: string;
  appliedAt: string;
  doseApplied: number;
  notes?: string;
  queuedAt: string;
}

export function useOfflineQueue() {
  const [queue, setQueue] = useState<QueuedApplication[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  async function loadQueue(): Promise<QueuedApplication[]> {
    try {
      const raw = await AsyncStorage.getItem(QUEUE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  async function saveQueue(items: QueuedApplication[]) {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(items));
    setQueue(items);
  }

  useEffect(() => {
    loadQueue().then(setQueue);
  }, []);

  const enqueue = useCallback(async (application: Omit<QueuedApplication, 'id' | 'queuedAt'>) => {
    const item: QueuedApplication = {
      ...application,
      id: `offline_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      queuedAt: new Date().toISOString(),
    };
    const current = await loadQueue();
    await saveQueue([...current, item]);
  }, []);

  const processQueue = useCallback(async () => {
    const current = await loadQueue();
    if (current.length === 0) return;

    setIsSyncing(true);
    const remaining: QueuedApplication[] = [];

    for (const item of current) {
      try {
        await apiRequest('/api/v1/applications', {
          method: 'POST',
          body: JSON.stringify({
            prescriptionId: item.prescriptionId,
            patientId: item.patientId,
            medicationId: item.medicationId,
            scheduledAt: item.scheduledAt,
            appliedAt: item.appliedAt,
            doseApplied: item.doseApplied,
            notes: item.notes,
          }),
        });
      } catch {
        remaining.push(item);
      }
    }

    await saveQueue(remaining);
    setIsSyncing(false);
  }, []);

  // Processa fila ao reconectar
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected) {
        processQueue();
      }
    });
    return unsubscribe;
  }, [processQueue]);

  return { queue, queueCount: queue.length, enqueue, processQueue, isSyncing };
}
